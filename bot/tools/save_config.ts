import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import {
  DEFAULT_CONFIG,
  type ProjectConfig,
  projectArtifactPath,
  sessionKey,
} from "../lib/pipeline.js";

const answersSchema = z.object({
  platform: z.enum(["ios+android", "ios", "android"]).optional(),
  stack: z.enum(["flutter", "rn", "native", "defer"]).optional(),
  backend: z
    .enum(["openapi+mock", "none", "runnable", "customer-api"])
    .optional(),
  thirdParty: z
    .object({
      mode: z.enum(["none", "allowlist"]),
      allow: z.array(z.string()),
    })
    .optional(),
  designSource: z
    .enum(["industry-standard", "customer-mockups", "competitor-refs"])
    .optional(),
  industry: z.string().optional(),
  testing: z.enum(["smoke+core", "smoke", "smoke+automation"]).optional(),
  packaging: z.enum(["scripts+checklist", "docs-only"]).optional(),
  entry: z.enum(["playground", "slack", "webhook"]).optional(),
  brief: z.string().optional(),
});

export default defineTool({
  description: prompt`
    Persist intake answers as config.json for the project.
    Call only after present_choices answers are collected.
    Downstream agents must read this config and must not change stack or third-party policy.
  `,
  execution: "server",
  effect: "write",
  inputSchema: z.object({
    projectId: z.string().min(1),
    answers: answersSchema,
  }),
  async execute({ projectId, answers }, ctx) {
    const thirdParty =
      answers.thirdParty ??
      (DEFAULT_CONFIG.thirdParty.mode === "none"
        ? { mode: "none" as const, allow: [] as string[] }
        : DEFAULT_CONFIG.thirdParty);

    const config: ProjectConfig = {
      platform: answers.platform ?? DEFAULT_CONFIG.platform,
      stack: answers.stack ?? DEFAULT_CONFIG.stack,
      backend: answers.backend ?? DEFAULT_CONFIG.backend,
      thirdParty,
      design: {
        source: answers.designSource ?? DEFAULT_CONFIG.design.source,
        industry: answers.industry ?? DEFAULT_CONFIG.design.industry,
      },
      testing: answers.testing ?? DEFAULT_CONFIG.testing,
      packaging: answers.packaging ?? DEFAULT_CONFIG.packaging,
      entry: answers.entry ?? DEFAULT_CONFIG.entry,
      brief: answers.brief,
    };

    const path = projectArtifactPath(projectId, "config.json");
    const fileOpts = { scope: "deployment" as const };
    await ctx.host.files.write(
      path,
      JSON.stringify(config, null, 2),
      fileOpts,
    );
    await ctx.host.kv.put(sessionKey(ctx.session.id, "config"), {
      projectId,
      config,
    });
    await ctx.host.kv.put(sessionKey(ctx.session.id, "projectId"), projectId);

    return {
      ok: true,
      projectId,
      path,
      config,
      next: "Call request_approval for gate G0, then route_stage to requirements.",
    };
  },
});
