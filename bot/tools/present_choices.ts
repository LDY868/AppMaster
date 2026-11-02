import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import { INTAKE_QUESTIONS } from "../lib/pipeline.js";

export default defineTool({
  description: prompt`
    Present the structured intake questionnaire (multiple-choice only).
    Call this first for a new project before save_config.
    Do not invent free-form discovery questions.
  `,
  execution: "server",
  effect: "read",
  inputSchema: z.object({
    projectId: z
      .string()
      .min(1)
      .describe("Stable project id for this order (slug)."),
  }),
  async execute({ projectId }) {
    return {
      projectId,
      instruction:
        "Ask every question as multiple choice. Mark recommended options. Collect answers, then call save_config.",
      questions: INTAKE_QUESTIONS.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        options: q.options.map((o) => ({
          id: o.id,
          label: o.recommended ? `${o.label} (recommended)` : o.label,
          recommended: Boolean(o.recommended),
        })),
      })),
    };
  },
});
