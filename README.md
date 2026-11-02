# AppMaster — 日常办公工作台 + Mobile Outsource Studio

Cursor Agent SDK project: an **Orchestrator** plus specialist subagents for mobile app outsourcing, wrapped in an **Electron office workbench** (Home / Workspaces / Tools / Projects / Settings).

The desktop shell is pluggable — 「移动端外包 Studio」is the first **Workspace** extension. Sample local tool: JSON 格式化. Pipeline scope still covers intake through packaging and delivery docs. Sample industry fixture: **咖啡点单 (coffee ordering)**. Default client stack in intake: **Flutter** (still driven by `config.json`).

## Principles

- Multiple-choice intake → `config.json`
- Default **no third-party** unless allowlisted in intake
- Design from industry / platform standards (no Figma required)
- Orchestrator only routes, gates, and summarizes; each stage has one Owner
- Implement respects chosen stack; QA files defects back to Implement (no product-code edits)
- Packaging owns release checklists/scripts; **secrets never enter model context** (env/CI names only); no store upload APIs
- Desktop is a **workbench client** over `agent-sdk serve`; extensions mount via `manifest.json` — do not move orchestration into the renderer
- `CURSOR_API_KEY` stays in env or OS secure storage — never in renderer logs

## Layout

```
bot/                       # Agent SDK orchestration (unchanged role)
  agent.ts
  tools/ …
  subagents/ …
desktop/                   # Electron office workbench
  electron/                # main + preload whitelist + extension loader
  shell/                   # sidebar IA + status bar
  extensions/
    mobile-outsource-studio/  # pipeline UI (workspace)
    json-formatter/           # sample tool
    avatar-image-gen/         # 个性头像 (stub / optional image API)
evals/
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

## Desktop workbench + agent together

The Electron app either connects to an already-running local serve on port **3210**, or spawns:

`npx --yes @grok/agent-sdk@0.5.0 serve --dir <repo> --mode single --port 3210 --host 127.0.0.1 --dev --allow-anonymous --no-playground`

```bash
# 1) Install agent deps (repo root) and desktop deps
npm install
npm run desktop:install

# 2) Credential for model turns (pick one)
export CURSOR_API_KEY=…          # preferred for CI / shells
# or: npx --yes "@grok/agent-sdk@0.5.0" login
# or: paste the key in Settings (OS safeStorage; never logged)

# 3) Optional: start the agent yourself (otherwise the desktop will spawn it)
npx --yes "@grok/agent-sdk@0.5.0" serve --dir . --mode single --port 3210 --dev --allow-anonymous --no-playground

# 4) Launch the workbench
npm run desktop:start
# syntax check without GUI:
npm run desktop:check
```

In the UI: **工作台 Home** → open **移动端外包 Studio** → **加载题库** → **保存并启动** → approve gates → preview artifacts.  
Try **JSON 格式化** or **个性头像** under Tools to verify extension loading. Add more via `desktop/extensions/` — see `desktop/extensions/README.md`.

**个性头像** defaults to offline stub images. Optional live generation:

```bash
export APPMASTER_IMAGE_API_KEY=…   # or OPENAI_API_KEY
# optional: APPMASTER_IMAGE_API_BASE / APPMASTER_IMAGE_MODEL
```

Agent SDK tool: `generate_avatar` (same stub/API semantics).

Do **not** deploy this agent or the desktop shell to app stores from this phase.
