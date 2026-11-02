import { prompt } from "@grok/agent-sdk";
import { defineTool } from "@grok/agent-sdk/tools";
import { z } from "zod";
import {
  ARTIFACT_OWNER,
  isKnownArtifact,
  projectArtifactPath,
  type Owner,
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
    Write one owned project artifact under projects/<projectId>/.
    Only the artifact's Owner may write it. Orchestrator may write config.json, status.json, and 00-intake.md only.
    Never write 01–07 specialist docs as the orchestrator.
  `,
  execution: "server",
  effect: "write",
  inputSchema: z.object({
    projectId: z.string().min(1),
    artifact: z.enum(ARTIFACT_NAMES),
    content: z.string().min(1),
    actingAs: z
      .enum([
        "orchestrator",
        "requirements",
        "ui-design",
        "api-design",
        "implement",
        "qa",
        "packaging",
        "docs",
      ])
      .describe("Role that claims ownership for this write."),
  }),
  async execute({ projectId, artifact, content, actingAs }, ctx) {
    if (!isKnownArtifact(artifact)) {
      return {
        ok: false as const,
        error: "unknown_artifact",
        message: `Unknown artifact ${artifact}.`,
      };
    }

    const owner = ARTIFACT_OWNER[artifact] as Owner;
    if (actingAs !== owner) {
      return {
        ok: false as const,
        error: "owner_mismatch",
        message: `Artifact ${artifact} is owned by ${owner}; ${actingAs} cannot write it.`,
        owner,
        actingAs,
      };
    }

    const path = projectArtifactPath(projectId, artifact);
    await ctx.host.files.write(path, content, { scope: "deployment" });

    return {
      ok: true as const,
      path,
      artifact,
      owner,
      projectId,
      bytes: content.length,
    };
  },
});
