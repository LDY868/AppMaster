import { defineAgent } from "@grok/agent-sdk";

export default defineAgent({
  description:
    "UI Design Owner: produce information architecture, screen flows, components, and design tokens into 02-ui-spec.md from industry/platform standards (HIG/Material). Use after G1. Do not write APIs, app code, or call Figma/SaaS unless allowlisted.",
});
