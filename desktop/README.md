# AppMaster desktop — 日常办公工作台

Electron **office workbench shell**: Home + Workspaces + Tools + Projects + Settings.  
Business UIs load from `extensions/*/manifest.json`. The Agent SDK project under `bot/` stays the orchestration backend.

## Run

```bash
npm install          # repo root
npm run desktop:install
npm run desktop:check
npm run desktop:start
```

Default agent URL: `http://127.0.0.1:3210` (`APPMASTER_AGENT_PORT` to override).

## Layout

```
desktop/
  electron/          # main, preload whitelist, extension scanner, secure store
  shell/             # sidebar IA + status bar + Home/Projects/Settings
  extensions/
    mobile-outsource-studio/   # Phase 1–5 pipeline UI (workspace)
    json-formatter/            # sample local tool
```

## Add a workspace or tool

See [Adding extensions](./extensions/README.md).

## Permissions (preload whitelist)

Renderer only sees `window.appmaster.*`. Main process re-checks extension `permissions`:

| permission | APIs |
| --- | --- |
| `agent.http` | ensureServe, tool calls, startRun, gates |
| `fs.projects` | projects.list |
| `secure.secrets` | set/clear API key (from an extension context) |

Shell routes (Home / Settings / Projects) may call agent/projects/secrets with no active extension.
