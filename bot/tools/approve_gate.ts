import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import { sessionKey, type GateId } from "../lib/pipeline.js";

const GATES = ["G0", "G1", "G2", "G3", "G4", "G5"] as const;

export default defineTool({
  description: prompt`
    Record explicit human approval for a pending gate (G0–G5).
    Call only after the user confirms in the desktop shell or chat.
    Do not invent approval.
  `,
  execution: "server",
  effect: "write",
  inputSchema: z.object({
    projectId: z.string().min(1),
    gate: z.enum(GATES),
    note: z
      .string()
      .optional()
      .describe("Optional short note from the human approver."),
  }),
  async execute({ projectId, gate, note }, ctx) {
    const key = sessionKey(ctx.session.id, `gate:${gate}`);
    const previous = (await ctx.host.kv.get(key)) as
      | {
          projectId?: string;
          gate?: GateId;
          summary?: string;
          status?: string;
          requestedAt?: string;
        }
      | undefined;

    const record = {
      projectId,
      gate: gate as GateId,
      summary: previous?.summary ?? "",
      status: "approved" as const,
      requestedAt: previous?.requestedAt ?? null,
      approvedAt: new Date().toISOString(),
      note: note ?? null,
    };

    await ctx.host.kv.put(key, record);

    return {
      ...record,
      instruction:
        "Gate approved. Continue the pipeline from the next stage. Do not re-open this gate unless the user revises the decision.",
    };
  },
});
