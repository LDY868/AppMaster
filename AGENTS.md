# mobile-outsource-studio

Agent SDK project (`@grok/agent-sdk`). This file is for coding agents editing
the project. The served agent's prompt is `bot/instructions.md`.

## Loop

```bash
npx --yes "@grok/agent-sdk@0.5.0" validate --dir .
npx --yes "@grok/agent-sdk@0.5.0" info --dir . --json
npx --yes "@grok/agent-sdk@0.5.0" run --dir . --message "..."
npx --yes "@grok/agent-sdk@0.5.0" eval --dir .
npm run check
npm run desktop:install && npm run desktop:check
```

Run the CLI under Node, never Bun.

## Phase 5 invariants

- Orchestrator does not write `01`–`07` specialist artifacts.
- Intake is multiple-choice via `present_choices` → `save_config`.
- Third-party calls go through `guard_third_party` (default deny).
- `route_stage` names the sole Owner before delegation.
- Wired Owners: `requirements`, `ui-design`, `api-design`, `implement`, `qa`, `packaging`, `docs`.
- Implement respects `config.stack` (Flutter default/recommended).
- QA owns `05-test-plan.md` only; defects return to Implement.
- Packaging owns `06-release-checklist.md` only; secrets never in model context — env/CI names and scripts/checklists only; no store upload APIs.
- Desktop (`desktop/`) is an Electron **client** over `agent-sdk serve`; do not move orchestration into the renderer.
- Desktop-supporting tools: `approve_gate`, `get_project_state`, `read_artifact` (read/approve only).
- `CURSOR_API_KEY` via env / `CURSOR_API_KEY_FILE` / Electron `safeStorage` — never print full keys in renderer logs.
- Sample industry skills: `industry-coffee-ordering`, `implement-flutter`, `qa-coffee-ordering`, `packaging-flutter-coffee`.

## Layout

- `bot/instructions.md` — always-on orchestrator prompt
- `bot/tools/<name>.ts` — one tool per file
- `bot/lib/` — shared code (not discovered)
- `bot/subagents/<id>/` — specialists (`description` required)
- `desktop/` — Electron main + preload + renderer (not discovered by Agent SDK)
- `evals/` — filesystem evals (`evals/evals.config.ts` required)

## Do not

- Add App Store / Play Console upload APIs or automate marketplace publish.
- Put keystore passwords, tokens, or PEM material into prompts, tools, or `06-release-checklist.md`.
- Rewrite the pipeline inside Electron; keep `bot/` as the source of truth.
- Point `serve` at a parent folder during bring-up.
- Log `CURSOR_API_KEY` values from the renderer or main-process log scrubber.
