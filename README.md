# AppMaster — Mobile Outsource Studio

Cursor Agent SDK project: an **Orchestrator** plus specialist subagents for mobile app outsourcing.

Phase 5 adds an **Electron desktop shell** that wraps local `agent-sdk serve` for interactive PC use. The desktop is a client only — it does not rewrite orchestration. Pipeline scope still covers intake through packaging and delivery docs. Sample industry fixture: **咖啡点单 (coffee ordering)**. Default client stack in intake: **Flutter** (still driven by `config.json`).

## Principles

- Multiple-choice intake → `config.json`
- Default **no third-party** unless allowlisted in intake
- Design from industry / platform standards (no Figma required)
- Orchestrator only routes, gates, and summarizes; each stage has one Owner
- Implement respects chosen stack; QA files defects back to Implement (no product-code edits)
- Packaging owns release checklists/scripts; **secrets never enter model context** (env/CI names only); no store upload APIs
- Desktop shell talks to the agent over loopback HTTP/IPC; `CURSOR_API_KEY` stays in env or OS secure storage — never in renderer logs

## Layout

```
bot/
  agent.ts                 # Orchestrator
  instructions.md
  tools/                   # present_choices, save_config, route_stage, write_artifact,
                           # approve_gate, get_project_state, read_artifact, …
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
desktop/                   # Electron main + renderer (Agent SDK client)
evals/
  smoke.eval.ts            # Phase 1 intake smoke
  phase2-ui-api.eval.ts    # Phase 2 UI/API routing smoke
  phase3-implement-qa.eval.ts  # Phase 3 implement/QA routing smoke
  phase4-packaging.eval.ts # Phase 4 packaging routing smoke
```

## Local commands (agent)

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

## Desktop shell + agent together

The Electron app either connects to an already-running local serve on port **3210**, or spawns:

`npx --yes @grok/agent-sdk@0.5.0 serve --dir <repo> --mode single --port 3210 --host 127.0.0.1 --dev --allow-anonymous --no-playground`

```bash
# 1) Install agent deps (repo root) and desktop deps
npm install
npm run desktop:install

# 2) Credential for model turns (pick one)
export CURSOR_API_KEY=…          # preferred for CI / shells
# or: npx --yes "@grok/agent-sdk@0.5.0" login
# or: paste the key in the desktop footer (OS safeStorage; never logged)

# 3) Optional: start the agent yourself (otherwise the desktop will spawn it)
npx --yes "@grok/agent-sdk@0.5.0" serve --dir . --mode single --port 3210 --dev --allow-anonymous --no-playground

# 4) Launch the desktop UI
npm run desktop:start
# syntax check without GUI:
npm run desktop:check
```

In the UI: **加载题库** → fill choices → **保存并启动** → watch stage progress → approve gates → preview artifacts.

Renderer traffic is IPC-only. The main process owns HTTP to `127.0.0.1` and never forwards the raw API key into renderer logs.

Do **not** deploy this agent or the desktop shell to app stores from this phase.
