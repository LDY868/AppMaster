import { defineAgent } from "@grok/agent-sdk";

export default defineAgent({
  description:
    "QA Owner: produce 05-test-plan.md (cases, defects, regression gates) from config.testing depth. Do not edit product code — file defects for Implement. Use after implement milestones.",
});
