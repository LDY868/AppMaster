import { defineAgent } from "@grok/agent-sdk";

export default defineAgent({
  description:
    "API Design Owner: produce domain model and API contracts into 03-api-spec.md (OpenAPI/Markdown) aligned with UI screen inventory. Use after G1; may run in parallel with UI. Do not design visuals or write client code.",
});
