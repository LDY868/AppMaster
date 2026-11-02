import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import {
  isThirdPartyAllowed,
  type ProjectConfig,
  sessionKey,
} from "../lib/pipeline.js";

export default defineTool({
  description: prompt`
    Check whether a third-party service, SDK, or SaaS is allowed by the project's config.json.
    Call before suggesting or adding any external dependency (Figma, Firebase, maps, auth SDKs, etc.).
    Default is deny unless the intake allowlist enables it.
  `,
  execution: "server",
  effect: "read",
  inputSchema: z.object({
    service: z
      .string()
      .min(1)
      .describe("Service or SDK name, e.g. figma, firebase, maps, auth-sdk."),
  }),
  async execute({ service }, ctx) {
    const stored = (await ctx.host.kv.get(
      sessionKey(ctx.session.id, "config"),
    )) as { config?: ProjectConfig } | undefined;

    const config = stored?.config;
    const allowed = isThirdPartyAllowed(config, service);

    return {
      service,
      allowed,
      mode: config?.thirdParty.mode ?? "none",
      allowlist: config?.thirdParty.allow ?? [],
      message: allowed
        ? `${service} is on the project allowlist.`
        : `${service} is blocked. Default is no third-party unless intake allowlisted it.`,
    };
  },
});
