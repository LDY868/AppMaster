import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import { sessionKey, type GateId } from "../lib/pipeline.js";

const GATES = ["G0", "G1", "G2", "G3", "G4", "G5"] as const;

export default defineTool({
  description: prompt`
    Open a human gate (G0–G5) and wait for explicit approval before continuing.
    Summarize what must be confirmed; do not invent approval.
    Record the pending gate in session state.
  `,
  execution: "server",
  effect: "idempotent",
  inputSchema: z.object({
    projectId: z.string().min(1),
    gate: z.enum(GATES),
    summary: z
      .string()
      .min(1)
      .describe("What the human must confirm before the next stage."),
  }),
  async execute({ projectId, gate, summary }, ctx) {
    const record = {
      projectId,
      gate: gate as GateId,
      summary,
      status: "pending" as const,
      requestedAt: new Date().toISOString(),
    };

    await ctx.host.kv.put(sessionKey(ctx.session.id, `gate:${gate}`), record);

    return {
      ...record,
      instruction:
        "Present the summary to the user and stop the pipeline until they approve. Do not advance stages without approval.",
    };
  },
});
