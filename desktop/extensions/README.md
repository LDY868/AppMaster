# Adding a Workspace or Tool extension

Extensions are directories with a `manifest.json`. The shell scans:

1. `desktop/extensions/*/manifest.json` (bundled)
2. `~/.appmaster/extensions/*/manifest.json` (user; overrides same `id`)

No hard-coded route table — enable/disable in **Settings**.

## Manifest

```json
{
  "id": "my-tool",
  "name": "我的小工具",
  "kind": "tool",
  "version": "0.1.0",
  "entry": "./ui/index.js",
  "description": "一句话说明",
  "permissions": [],
  "nav": { "group": "tools", "icon": "wrench", "order": 50 }
}
```

| kind | Meaning | Nav group |
| --- | --- | --- |
| `workspace` | Multi-agent pipeline UI | Workspaces |
| `tool` | Local utility (no Agent required) | Tools |
| `agent-lite` | Single-agent chat page | Tools |

Optional `agent: { "servePort": 3210, "cwd": "../.." }` documents which Agent SDK project the workspace expects. Today the shell still uses the repo-root serve on port 3210; multi-serve comes later.

### Permissions

Request only what you need:

- `agent.http` — call tools / ensure serve / sessions
- `fs.projects` — list `projects/`
- `secure.secrets` — set API key while this extension is active

Empty `permissions` is fine for pure local tools (see `json-formatter`).

## UI entry module

`entry` must be an ES module that exports `mount`:

```js
/**
 * @param {HTMLElement} root
 * @param {{ api: Window["appmaster"], manifest: object, shell?: object }} ctx
 * @returns {void | (() => void) | { unmount(): void }}
 */
export async function mount(root, ctx) {
  root.innerHTML = `<section class="panel">…</section>`;
  // use ctx.api.* (whitelist). Do not use Node APIs.
  return () => {
    root.innerHTML = "";
  };
}
```

Reuse shell CSS classes (`.panel`, `.btn`, `.field`, …). Ship extra CSS next to the entry and `<link>` it from `import.meta.url` if needed.

## Checklist

1. Create `desktop/extensions/<id>/manifest.json` + `ui/index.js`
2. `npm run desktop:check`
3. `npm run desktop:start` → confirm sidebar entry → Settings toggle

Do **not** put orchestration logic in the extension — keep Agent SDK code under `bot/`.
