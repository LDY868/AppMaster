# AppMaster — Mobile Outsource Studio

Cursor Agent SDK project: an **Orchestrator** plus specialist subagents for mobile app outsourcing.

Phase 4 scopes intake, requirements, UI, API, implement, QA, **packaging**, and delivery docs. Sample industry fixture: **咖啡点单 (coffee ordering)**. Default client stack in intake: **Flutter** (still driven by `config.json`).

## Principles

- Multiple-choice intake → `config.json`
- Default **no third-party** unless allowlisted in intake
- Design from industry / platform standards (no Figma required)
- Orchestrator only routes, gates, and summarizes; each stage has one Owner
- Implement respects chosen stack; QA files defects back to Implement (no product-code edits)
- Packaging owns release checklists/scripts; **secrets never enter model context** (env/CI names only); no store upload APIs; no Electron (Phase 5)

## Layout

```
bot/
  agent.ts                 # Orchestrator
  instructions.md
  tools/                   # present_choices, save_config, route_stage, write_artifact, …
  skills/                  # intake + coffee + flutter implement + qa + packaging
  subagents/
    requirements/          # Owner of 01-requirements.md
    ui-design/             # Owner of 02-ui-spec.md
    api-design/            # Owner of 03-api-spec.md
    implement/             # Owner of 04-architecture.md (+ code guidance)
    qa/                    # Owner of 05-test-plan.md
    packaging/             # Owner of 06-release-checklist.md
    docs/                  # Owner of 07-delivery-manual.md
  lib/pipeline.ts          # stage→owner + config helpers
evals/
  smoke.eval.ts            # Phase 1 intake smoke
  phase2-ui-api.eval.ts    # Phase 2 UI/API routing smoke
  phase3-implement-qa.eval.ts  # Phase 3 implement/QA routing smoke
  phase4-packaging.eval.ts # Phase 4 packaging routing smoke
```

## Local commands

```bash
npx --yes "@grok/agent-sdk@0.5.0" login   # once, for model turns
npx --yes "@grok/agent-sdk@0.5.0" validate --dir .
npx tsc --noEmit -p .
npx --yes "@grok/agent-sdk@0.5.0" dev .   # playground at http://127.0.0.1:3000/playground
npx --yes "@grok/agent-sdk@0.5.0" run --dir . --message "新单：咖啡点单，请开始选择题 intake"
npx --yes "@grok/agent-sdk@0.5.0" eval --dir . --tag smoke
npx --yes "@grok/agent-sdk@0.5.0" eval --dir . --tag phase2
npx --yes "@grok/agent-sdk@0.5.0" eval --dir . --tag phase3
npx --yes "@grok/agent-sdk@0.5.0" eval --dir . --tag phase4
```

Do not deploy or build Electron from this Phase 4 scaffold unless you explicitly choose to (Phase 5).
