# AppMaster — Mobile Outsource Studio

Cursor Agent SDK project: an **Orchestrator** plus specialist subagents for mobile app outsourcing.

Phase 1 scopes intake, requirements, and delivery docs. Sample industry fixture: **咖啡点单 (coffee ordering)**.

## Principles

- Multiple-choice intake → `config.json`
- Default **no third-party** unless allowlisted in intake
- Design from industry / platform standards (no Figma required)
- Orchestrator only routes, gates, and summarizes; each stage has one Owner

## Layout

```
bot/
  agent.ts                 # Orchestrator
  instructions.md
  tools/                   # present_choices, save_config, route_stage, …
  skills/                  # intake + industry-coffee-ordering
  subagents/
    requirements/          # Owner of 01-requirements.md
    docs/                  # Owner of 07-delivery-manual.md
  lib/pipeline.ts          # stage→owner + config helpers
evals/smoke.eval.ts
```

## Local commands

```bash
npx --yes "@grok/agent-sdk@0.5.0" login   # once, for model turns
npx --yes "@grok/agent-sdk@0.5.0" validate --dir .
npx tsc --noEmit -p .
npx --yes "@grok/agent-sdk@0.5.0" dev .   # playground at http://127.0.0.1:3000/playground
npx --yes "@grok/agent-sdk@0.5.0" run --dir . --message "新单：咖啡点单，请开始选择题 intake"
npx --yes "@grok/agent-sdk@0.5.0" eval --dir . --tag smoke
```

Do not deploy from this Phase 1 scaffold unless you explicitly choose to.
