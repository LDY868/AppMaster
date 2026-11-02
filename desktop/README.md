# AppMaster desktop

Minimal Electron shell over local `agent-sdk serve`. See the root README section **Desktop shell + agent together** for the full runbook.

```bash
npm install          # from repo root (agent)
npm run desktop:install
npm run desktop:check
npm run desktop:start
```

Default agent URL: `http://127.0.0.1:3210` (`APPMASTER_AGENT_PORT` to override).
