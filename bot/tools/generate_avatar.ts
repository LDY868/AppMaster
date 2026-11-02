import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import {
  ASPECT_PRESETS,
  DEFAULT_COUNT,
  generateAvatars,
  resolveImageApiConfig,
} from "../lib/avatar_gen.js";

const aspectIds = ASPECT_PRESETS.map((p) => p.id) as [string, ...string[]];

export default defineTool({
  description: prompt`
    Generate personal avatar / 个性头像 image candidates from a text prompt.
    Default count is 4. Default mode is offline stub (SVG data-URLs) — no third-party SaaS required.
    Live OpenAI-compatible Images API is used only when APPMASTER_IMAGE_API_KEY or OPENAI_API_KEY is set.
    Prefer forceStub=true inside outsourcing projects unless the user explicitly wants live images
    and a key is configured. Return image data-URLs or remote URLs; do not print API keys.
  `,
  execution: "server",
  effect: "write",
  inputSchema: z.object({
    prompt: z
      .string()
      .min(1)
      .describe("Avatar description, e.g. warm watercolor round portrait, short hair, soft side light."),
    aspect: z
      .enum(aspectIds)
      .optional()
      .describe("Aspect ratio preset. Default 1:1."),
    count: z
      .number()
      .int()
      .min(1)
      .max(8)
      .optional()
      .describe(`How many candidates to generate. Default ${DEFAULT_COUNT}.`),
    forceStub: z
      .boolean()
      .optional()
      .describe("If true, never call the external image API even when a key is present."),
  }),
  async execute({ prompt: userPrompt, aspect, count, forceStub }) {
    const status = resolveImageApiConfig();
    const result = await generateAvatars({
      prompt: userPrompt,
      aspect,
      count,
      forceStub,
    });

    // Truncate huge data-URLs in the tool payload summary fields only —
    // keep full urls on each image for consumers that need them.
    return {
      ...result,
      apiConfigured: status.source !== "none",
      apiSource: status.source === "none" ? undefined : status.source,
      // Avoid echoing secrets; source name only.
      images: result.images.map((img) => ({
        id: img.id,
        mime: img.mime,
        width: img.width,
        height: img.height,
        mode: img.mode,
        url: img.url,
      })),
    };
  },
});
