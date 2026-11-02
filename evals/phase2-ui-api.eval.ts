import { defineEval } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["smoke", "phase2"],
  description:
    "After requirements, orchestrator routes UI/API Owners and does not write 02/03 itself.",
  async test(t) {
    await t.send(
      [
        "项目 coffee-demo：config 与 01-requirements 已就绪（咖啡点单，industry-standard，thirdParty none）。",
        "G1 已通过。请 route_stage 到 ui-design 与 api-design，并委派专项子智能体。",
        "不要自己写 02-ui-spec.md 或 03-api-spec.md，也不要引入 Figma。",
      ].join(" "),
    );
    t.succeeded();
    t.calledTool("route_stage");
    t.notCalledTool("write_artifact");
  },
});
