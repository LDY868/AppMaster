import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import {
  GATE_AFTER_STAGE,
  STAGE_OWNER,
  STAGES,
  sessionKey,
  type Stage,
} from "../lib/pipeline.js";

export default defineTool({
  description: prompt`
    Look up the sole Owner specialist for a pipeline stage and record the active stage.
    You must call this before delegating specialist work.
    Do not perform the Owner's work yourself — delegate via the task tool to the named subagent when available.
  `,
  execution: "server",
  effect: "idempotent",
  inputSchema: z.object({
    projectId: z.string().min(1),
    stage: z.enum(STAGES),
  }),
  async execute({ projectId, stage }, ctx) {
    const owner = STAGE_OWNER[stage as Stage];
    const gate = GATE_AFTER_STAGE[stage as Stage];
    const status = {
      projectId,
      stage,
      owner,
      gate: gate ?? null,
      updatedAt: new Date().toISOString(),
    };

    await ctx.host.kv.put(sessionKey(ctx.session.id, "status"), status);
    await ctx.host.files.write(
      `projects/${projectId}/status.json`,
      JSON.stringify(status, null, 2),
      { scope: "deployment" },
    );

    const wired =
      owner === "orchestrator" ||
      owner === "requirements" ||
      owner === "ui-design" ||
      owner === "api-design" ||
      owner === "docs";

    return {
      ...status,
      delegate: owner === "orchestrator" ? null : owner,
      wired,
      /** @deprecated Prefer `wired`; kept for Phase 1 eval / prompt compatibility. */
      phase1Wired: wired,
      note: wired
        ? owner === "orchestrator"
          ? "Orchestrator owns this stage (intake / gates / summary only)."
          : `Delegate to the ${owner} subagent. Do not write its artifact yourself.`
        : `Owner ${owner} is reserved for a later phase. Summarize the gap; do not invent that specialist's deliverable.`,
    };
  },
});
