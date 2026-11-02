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
```

Run the CLI under Node, never Bun.

## Phase 2 invariants

- Orchestrator does not write `01`–`07` specialist artifacts.
- Intake is multiple-choice via `present_choices` → `save_config`.
- Third-party calls go through `guard_third_party` (default deny).
- `route_stage` names the sole Owner before delegation.
- Wired Owners: `requirements`, `ui-design`, `api-design`, `docs`.
- Sample industry skill: `industry-coffee-ordering` (includes UI + API guidance).

## Layout

- `bot/instructions.md` — always-on orchestrator prompt
- `bot/tools/<name>.ts` — one tool per file
- `bot/lib/` — shared code (not discovered)
- `bot/subagents/<id>/` — specialists (`description` required)
- `evals/` — filesystem evals (`evals/evals.config.ts` required)

## Do not

- Expand Implement / QA / Packaging Owners beyond reserved stubs in Phase 2.
- Build Electron or deploy from this phase unless explicitly asked.
- Add npm deps on a first cut beyond what `@grok/agent-sdk` ships.
- Point `serve` at a parent folder during bring-up.
