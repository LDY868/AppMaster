import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import {
  ARTIFACT_OWNER,
  GATE_AFTER_STAGE,
  STAGES,
  projectArtifactPath,
  sessionKey,
} from "../lib/pipeline.js";

const ARTIFACT_NAMES = Object.keys(ARTIFACT_OWNER);
const GATES = ["G0", "G1", "G2", "G3", "G4", "G5"] as const;

export default defineTool({
  description: prompt`
    Read-only snapshot of a project's config, stage status, pending gates, and artifact inventory.
    Used by the desktop client and for progress summaries. Does not change state.
  `,
  execution: "server",
  effect: "read",
  inputSchema: z.object({
    projectId: z.string().min(1),
  }),
  async execute({ projectId }, ctx) {
    const fileOpts = { scope: "deployment" as const };

    type JsonObject = { [key: string]: JsonValue };
    type JsonValue =
      | string
      | number
      | boolean
      | null
      | JsonValue[]
      | JsonObject;

    let config: JsonValue = null;
    const configRaw = await ctx.host.files.read(
      projectArtifactPath(projectId, "config.json"),
      fileOpts,
    );
    if (configRaw !== undefined) {
      try {
        config = JSON.parse(
          typeof configRaw === "string" ? configRaw : String(configRaw),
        ) as JsonValue;
      } catch {
        config = null;
      }
    }

    let status: JsonValue =
      ((await ctx.host.kv.get(sessionKey(ctx.session.id, "status"))) as
        | JsonValue
        | undefined) ?? null;
    if (!status) {
      const statusRaw = await ctx.host.files.read(
        projectArtifactPath(projectId, "status.json"),
        fileOpts,
      );
      if (statusRaw !== undefined) {
        try {
          status = JSON.parse(
            typeof statusRaw === "string" ? statusRaw : String(statusRaw),
          ) as JsonValue;
        } catch {
          status = null;
        }
      }
    }

    const gates: JsonObject = {};
    for (const gate of GATES) {
      const record = (await ctx.host.kv.get(
        sessionKey(ctx.session.id, `gate:${gate}`),
      )) as JsonValue | undefined;
      if (record) gates[gate] = record;
    }

    const artifacts: Array<{
      name: string;
      owner: string;
      path: string;
      exists: boolean;
      bytes: number | null;
    }> = [];

    for (const name of ARTIFACT_NAMES) {
      const path = projectArtifactPath(projectId, name);
      const raw = await ctx.host.files.read(path, fileOpts);
      const exists = raw !== undefined;
      const text = exists
        ? typeof raw === "string"
          ? raw
          : String(raw)
        : "";
      artifacts.push({
        name,
        owner: ARTIFACT_OWNER[name],
        path,
        exists,
        bytes: exists ? text.length : null,
      });
    }

    const pendingGate =
      GATES.map((g) => {
        const record = gates[g];
        if (
          record &&
          typeof record === "object" &&
          !Array.isArray(record) &&
          record.status === "pending"
        ) {
          return record;
        }
        return null;
      }).filter(Boolean).at(-1) ?? null;

    return {
      projectId,
      config,
      status,
      gates,
      pendingGate,
      stages: STAGES.map((stage) => ({
        stage,
        gate: GATE_AFTER_STAGE[stage] ?? null,
      })),
      artifacts,
    };
  },
});
