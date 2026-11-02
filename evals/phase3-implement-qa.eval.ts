import { defineEval } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["smoke", "phase3"],
  description:
    "After G3, orchestrator routes implement then QA Owners and does not write 04/05 itself.",
  async test(t) {
    await t.send(
      [
        "项目 coffee-demo：config 与 01–03 已就绪（咖啡点单，stack=flutter，thirdParty none）。",
        "G2/G3 已通过。请 route_stage 到 implement，委派实现子智能体产出架构；",
        "随后 route_stage 到 qa，委派测试子智能体。",
        "不要自己写 04-architecture.md 或 05-test-plan.md，不要引入 Electron 或第三方 SaaS。",
      ].join(" "),
    );
    t.succeeded();
    t.calledTool("route_stage");
    t.notCalledTool("write_artifact");
  },
});
