import { defineEval } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["smoke", "phase4"],
  description:
    "After QA, orchestrator routes packaging Owner for 06-release-checklist and does not write it itself.",
  async test(t) {
    await t.send(
      [
        "项目 coffee-demo：config 与 01–05 已就绪（咖啡点单，stack=flutter，packaging=scripts+checklist，thirdParty none）。",
        "QA 已完成。请 route_stage 到 packaging，委派打包子智能体产出 06-release-checklist.md。",
        "不要自己写 06-release-checklist.md，不要调用商店上传 API，不要引入 Electron，不要在对话里写入任何密钥明文。",
      ].join(" "),
    );
    t.succeeded();
    t.calledTool("route_stage");
    t.notCalledTool("write_artifact");
  },
});
