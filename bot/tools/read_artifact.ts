import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import {
  ARTIFACT_OWNER,
  isKnownArtifact,
  projectArtifactPath,
} from "../lib/pipeline.js";

const ARTIFACT_NAMES = [
  "config.json",
  "status.json",
  "00-intake.md",
  "01-requirements.md",
  "02-ui-spec.md",
  "03-api-spec.md",
  "04-architecture.md",
  "05-test-plan.md",
  "06-release-checklist.md",
  "07-delivery-manual.md",
] as const;

export default defineTool({
  description: prompt`
    Read one project artifact for preview (desktop shell or human review).
    Read-only — does not modify files. Never print secrets; packaging checklists must keep env/CI names only.
  `,
  execution: "server",
  effect: "read",
  inputSchema: z.object({
    projectId: z.string().min(1),
    artifact: z.enum(ARTIFACT_NAMES),
  }),
  async execute({ projectId, artifact }, ctx) {
    if (!isKnownArtifact(artifact)) {
      return {
        ok: false as const,
        error: "unknown_artifact",
        message: `Unknown artifact ${artifact}.`,
      };
    }

    const path = projectArtifactPath(projectId, artifact);
    const raw = await ctx.host.files.read(path, { scope: "deployment" });
    if (raw === undefined) {
      return {
        ok: false as const,
        error: "not_found",
        projectId,
        artifact,
        path,
        owner: ARTIFACT_OWNER[artifact],
        message: `Artifact ${artifact} is not written yet.`,
      };
    }
    const content = typeof raw === "string" ? raw : String(raw);
    return {
      ok: true as const,
      projectId,
      artifact,
      path,
      owner: ARTIFACT_OWNER[artifact],
      content,
      bytes: content.length,
    };
  },
});
