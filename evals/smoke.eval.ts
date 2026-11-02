import { defineEval } from "@grok/agent-sdk/evals";

export default defineEval({
  tags: ["smoke", "phase1"],
  description:
    "Coffee-ordering intake: orchestrator presents choices and does not invent specialist docs.",
  async test(t) {
    await t.send(
      [
        "新单：咖啡点单（coffee ordering）移动端外包。",
        "请按选择题开始 intake，不要直接写需求文档或代码。",
        "项目 id 用 coffee-demo。",
      ].join(" "),
    );
    t.succeeded();
    t.calledTool("present_choices");
    t.notCalledTool("write_artifact");
  },
});
