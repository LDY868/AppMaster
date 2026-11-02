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

## Phase 4 invariants

- Orchestrator does not write `01`–`07` specialist artifacts.
- Intake is multiple-choice via `present_choices` → `save_config`.
- Third-party calls go through `guard_third_party` (default deny).
- `route_stage` names the sole Owner before delegation.
- Wired Owners: `requirements`, `ui-design`, `api-design`, `implement`, `qa`, `packaging`, `docs`.
- Implement respects `config.stack` (Flutter default/recommended); no Electron in this phase.
- QA owns `05-test-plan.md` only; defects return to Implement.
- Packaging owns `06-release-checklist.md` only; secrets never in model context — env/CI names and scripts/checklists only; no store upload APIs.
- Sample industry skills: `industry-coffee-ordering`, `implement-flutter`, `qa-coffee-ordering`, `packaging-flutter-coffee`.

## Layout

- `bot/instructions.md` — always-on orchestrator prompt
- `bot/tools/<name>.ts` — one tool per file
- `bot/lib/` — shared code (not discovered)
- `bot/subagents/<id>/` — specialists (`description` required)
- `evals/` — filesystem evals (`evals/evals.config.ts` required)

## Do not

- Add App Store / Play Console upload APIs or automate marketplace publish.
- Build Electron or deploy from this phase unless explicitly asked (Phase 5).
- Put keystore passwords, tokens, or PEM material into prompts, tools, or `06-release-checklist.md`.
- Add npm deps on a first cut beyond what `@grok/agent-sdk` ships.
- Point `serve` at a parent folder during bring-up.
