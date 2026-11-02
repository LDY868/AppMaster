import { app, BrowserWindow, ipcMain } from "electron";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AgentClient, waitForAgent } from "./agent-client.mjs";
import {
  clearPersistedApiKey,
  encryptionAvailable,
  persistApiKey,
  redact,
  resolveApiKey,
} from "./secure-store.mjs";
import {
  DESKTOP_ROOT,
  hasPermission,
  listExtensions,
  resolveEntryPath,
} from "./extensions.mjs";
import { generateAvatars, imageApiStatus } from "./avatar-gen.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENT_ROOT = path.resolve(DESKTOP_ROOT, "..");
const DEFAULT_PORT = Number(process.env.APPMASTER_AGENT_PORT || 3210);
const DEFAULT_BASE = `http://127.0.0.1:${DEFAULT_PORT}`;
const EXT_STATE_PATH = () =>
  path.join(app.getPath("userData"), "extensions-state.json");

/** @type {BrowserWindow | null} */
let mainWindow = null;
/** @type {import('node:child_process').ChildProcess | null} */
let agentChild = null;
/** @type {AgentClient | null} */
let client = null;
let agentManagedByUs = false;
/** @type {string | null} */
let activeExtensionId = null;
/** @type {string | null} */
let currentProjectId = null;
/** @type {string[]} */
const recentNotices = [];

function readEnabledMap() {
  try {
    const raw = JSON.parse(fs.readFileSync(EXT_STATE_PATH(), "utf8"));
    return raw?.enabled && typeof raw.enabled === "object" ? raw.enabled : {};
  } catch {
    return {};
  }
}

function writeEnabledMap(enabled) {
  fs.mkdirSync(path.dirname(EXT_STATE_PATH()), { recursive: true });
  fs.writeFileSync(
    EXT_STATE_PATH(),
    JSON.stringify({ enabled }, null, 2),
    "utf8",
  );
}

function sendToRenderer(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function pushNotice(message) {
  const entry = { message: String(message), at: Date.now() };
  recentNotices.unshift(entry);
  if (recentNotices.length > 12) recentNotices.pop();
  sendToRenderer("desktop:notice", entry);
}

function logAgent(line) {
  const scrubbed = String(line).replace(
    /CURSOR_API_KEY[=:]\s*\S+/gi,
    "CURSOR_API_KEY=***",
  );
  sendToRenderer("desktop:agentLog", { line: scrubbed, at: Date.now() });
}

function getActiveExtension() {
  if (!activeExtensionId) return null;
  return (
    listExtensions({ enabledMap: readEnabledMap() }).find(
      (e) => e.id === activeExtensionId,
    ) || null
  );
}

function requirePermission(permission) {
  const ext = getActiveExtension();
  // Shell-owned routes (Home / Settings / Projects) may call without an extension.
  if (!activeExtensionId) {
    if (
      permission === "secure.secrets" ||
      permission === "fs.projects" ||
      permission === "agent.http"
    ) {
      return;
    }
  }
  if (!hasPermission(ext, permission)) {
    throw new Error(
      `Permission denied: ${permission} (extension=${activeExtensionId || "shell"})`,
    );
  }
}

async function probeExisting() {
  const { key } = resolveApiKey();
  const result = await waitForAgent(DEFAULT_BASE, {
    timeoutMs: 1500,
    bearerToken: null,
  });
  if (result.ok) {
    client = result.client;
    if (key) process.env.CURSOR_API_KEY = key;
    return true;
  }
  return false;
}

async function startAgentProcess() {
  const { key, source } = resolveApiKey();
  if (key) {
    process.env.CURSOR_API_KEY = key;
    logAgent(`Using Cursor credential from ${source} (${redact(key)})`);
  } else {
    logAgent(
      "No CURSOR_API_KEY yet — validate/tool calls work; model turns need login or a key.",
    );
  }

  const args = [
    "--yes",
    "@grok/agent-sdk@0.5.0",
    "serve",
    "--dir",
    AGENT_ROOT,
    "--mode",
    "single",
    "--port",
    String(DEFAULT_PORT),
    "--host",
    "127.0.0.1",
    "--dev",
    "--allow-anonymous",
    "--no-playground",
  ];

  agentChild = spawn("npx", args, {
    cwd: AGENT_ROOT,
    env: {
      ...process.env,
      ...(key ? { CURSOR_API_KEY: key } : {}),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  agentManagedByUs = true;

  agentChild.stdout?.on("data", (buf) => {
    for (const line of String(buf).split(/\r?\n/).filter(Boolean)) {
      logAgent(line);
    }
  });
  agentChild.stderr?.on("data", (buf) => {
    for (const line of String(buf).split(/\r?\n/).filter(Boolean)) {
      logAgent(line);
    }
  });
  agentChild.on("exit", (code, signal) => {
    logAgent(`agent-sdk serve exited code=${code} signal=${signal}`);
    agentChild = null;
    agentManagedByUs = false;
    pushNotice("Agent serve stopped");
  });

  const waited = await waitForAgent(DEFAULT_BASE, { timeoutMs: 90_000 });
  if (!waited.ok) {
    throw new Error(`Agent serve did not become ready: ${waited.error}`);
  }
  client = waited.client;
  pushNotice(`Agent serve ready on :${DEFAULT_PORT}`);
  return true;
}

async function ensureAgent() {
  if (client) {
    try {
      await client.health();
      return { ok: true, baseUrl: DEFAULT_BASE, managed: agentManagedByUs };
    } catch {
      client = null;
    }
  }
  if (await probeExisting()) {
    return { ok: true, baseUrl: DEFAULT_BASE, managed: false };
  }
  await startAgentProcess();
  return { ok: true, baseUrl: DEFAULT_BASE, managed: true };
}

function requireClient() {
  if (!client) throw new Error("Agent not connected — call ensureAgent first");
  return client;
}

function listProjects() {
  const root = path.join(AGENT_ROOT, "projects");
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root)
    .filter((name) => {
      try {
        return fs.statSync(path.join(root, name)).isDirectory();
      } catch {
        return false;
      }
    })
    .map((id) => {
      const dir = path.join(root, id);
      const statusPath = path.join(dir, "status.json");
      let status = null;
      try {
        status = JSON.parse(fs.readFileSync(statusPath, "utf8"));
      } catch {
        /* ignore */
      }
      const artifacts = fs
        .readdirSync(dir)
        .filter((f) => f.endsWith(".md") || f === "config.json");
      return {
        id,
        stage: status?.stage || null,
        pendingGate: status?.pendingGate || null,
        artifacts,
        mtimeMs: fs.statSync(dir).mtimeMs,
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: "AppMaster",
    backgroundColor: "#0f1412",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  mainWindow.loadFile(path.join(DESKTOP_ROOT, "shell", "index.html"));
}

function registerIpc() {
  ipcMain.handle("extensions:list", async () => {
    const enabledMap = readEnabledMap();
    return listExtensions({ enabledMap }).map((ext) => ({
      id: ext.id,
      name: ext.name,
      kind: ext.kind,
      version: ext.version,
      entry: ext.entry,
      entryPath: resolveEntryPath(ext),
      entryUrl: `file://${resolveEntryPath(ext)}`,
      permissions: ext.permissions,
      nav: ext.nav,
      description: ext.description,
      source: ext.source,
      enabled: ext.enabled,
      agent: ext.agent || null,
    }));
  });

  ipcMain.handle("extensions:setEnabled", async (_e, { id, enabled }) => {
    if (typeof id !== "string" || !id) throw new Error("id required");
    const map = readEnabledMap();
    map[id] = Boolean(enabled);
    writeEnabledMap(map);
    return { ok: true, enabled: Boolean(enabled) };
  });

  ipcMain.handle("extensions:setActive", async (_e, id) => {
    activeExtensionId = id ? String(id) : null;
    return { ok: true, activeExtensionId };
  });

  ipcMain.handle("desktop:getState", async () => {
    const { source } = resolveApiKey();
    return {
      agentRoot: AGENT_ROOT,
      desktopRoot: DESKTOP_ROOT,
      baseUrl: DEFAULT_BASE,
      port: DEFAULT_PORT,
      hasApiKey: source !== "none",
      apiKeySource: source,
      connected: Boolean(client),
      sessionId: client?.sessionId ?? null,
      managedAgent: agentManagedByUs,
      activeExtensionId,
      currentProjectId,
      notices: recentNotices.slice(0, 5),
    };
  });

  ipcMain.handle("desktop:getApiKeyStatus", async () => {
    const { source } = resolveApiKey();
    return {
      hasApiKey: source !== "none",
      source,
      encryptionAvailable: encryptionAvailable(),
    };
  });

  ipcMain.handle("secrets:set", async (_e, key) => {
    requirePermission("secure.secrets");
    if (typeof key !== "string" || !key.trim()) {
      throw new Error("API key must be a non-empty string");
    }
    persistApiKey(key.trim());
    process.env.CURSOR_API_KEY = key.trim();
    if (agentManagedByUs && agentChild) {
      agentChild.kill("SIGTERM");
      agentChild = null;
      client = null;
      await ensureAgent();
    }
    return { ok: true, source: "safeStorage" };
  });

  ipcMain.handle("secrets:clear", async () => {
    requirePermission("secure.secrets");
    clearPersistedApiKey();
    delete process.env.CURSOR_API_KEY;
    return { ok: true };
  });

  ipcMain.handle("agent:ensureServe", async () => {
    requirePermission("agent.http");
    return ensureAgent();
  });

  ipcMain.handle("desktop:ensureAgent", async () => {
    requirePermission("agent.http");
    return ensureAgent();
  });

  ipcMain.handle("desktop:setApiKey", async (_e, key) => {
    // Settings (shell) may set keys with no active extension.
    if (activeExtensionId) requirePermission("secure.secrets");
    if (typeof key !== "string" || !key.trim()) {
      throw new Error("API key must be a non-empty string");
    }
    persistApiKey(key.trim());
    process.env.CURSOR_API_KEY = key.trim();
    if (agentManagedByUs && agentChild) {
      agentChild.kill("SIGTERM");
      agentChild = null;
      client = null;
      await ensureAgent();
    }
    return { ok: true, source: "safeStorage" };
  });

  ipcMain.handle("desktop:clearApiKey", async () => {
    if (activeExtensionId) requirePermission("secure.secrets");
    clearPersistedApiKey();
    delete process.env.CURSOR_API_KEY;
    return { ok: true };
  });

  ipcMain.handle("agent:fetch", async (_e, { toolName, input }) => {
    requirePermission("agent.http");
    const c = requireClient();
    if (typeof toolName !== "string" || !toolName) {
      throw new Error("toolName required");
    }
    return c.callTool(toolName, input || {});
  });

  ipcMain.handle("desktop:presentChoices", async (_e, projectId) => {
    requirePermission("agent.http");
    return requireClient().callTool("present_choices", { projectId });
  });

  ipcMain.handle("desktop:saveConfig", async (_e, payload) => {
    requirePermission("agent.http");
    return requireClient().callTool("save_config", payload);
  });

  ipcMain.handle("desktop:getProjectState", async (_e, projectId) => {
    requirePermission("agent.http");
    currentProjectId = projectId || currentProjectId;
    return requireClient().callTool("get_project_state", { projectId });
  });

  ipcMain.handle("desktop:readArtifact", async (_e, { projectId, artifact }) => {
    requirePermission("agent.http");
    return requireClient().callTool("read_artifact", { projectId, artifact });
  });

  ipcMain.handle("desktop:approveGate", async (_e, payload) => {
    requirePermission("agent.http");
    const c = requireClient();
    const approved = await c.callTool("approve_gate", payload);
    if (c.sessionId && c.continuationToken) {
      await c.followUp(
        `Gate ${payload.gate} approved in the desktop shell. Continue the pipeline.`,
      );
      void pumpStream(c);
    }
    pushNotice(`Gate ${payload.gate} approved`);
    return approved;
  });

  ipcMain.handle("desktop:startRun", async (_e, payload) => {
    requirePermission("agent.http");
    const c = requireClient();
    const { projectId, brief, answers } = payload;
    currentProjectId = projectId;

    c.stopStream();
    c.sessionId = null;
    c.continuationToken = null;

    const started = await c.startSession(
      [
        `Desktop shell opening project \`${projectId}\`.`,
        brief ? `Brief: ${brief}` : "Brief pending from intake form.",
        "Acknowledge readiness only. Config will arrive via save_config from the desktop client next; then wait for the follow-up to continue intake artifacts and G0.",
      ]
        .filter(Boolean)
        .join("\n"),
      { title: `desktop:${projectId}` },
    );

    if (answers) {
      await c.callTool("save_config", { projectId, answers });
    }

    await c.followUp(
      [
        `Desktop intake complete for project \`${projectId}\`.`,
        "Config was saved via save_config from the desktop client.",
        "Write 00-intake.md (actingAs orchestrator), call request_approval for gate G0, and stop until I approve in the desktop UI.",
        "Do not skip gates. Do not write specialist artifacts yourself.",
      ].join("\n"),
    );

    void pumpStream(c);
    pushNotice(`Started project ${projectId}`);
    return started;
  });

  ipcMain.handle("desktop:followUp", async (_e, message) => {
    requirePermission("agent.http");
    const c = requireClient();
    const result = await c.followUp(message);
    void pumpStream(c);
    return result;
  });

  ipcMain.handle("desktop:stopRun", async () => {
    requirePermission("agent.http");
    const c = requireClient();
    c.stopStream();
    return c.stop();
  });

  ipcMain.handle("projects:list", async () => {
    requirePermission("fs.projects");
    return listProjects();
  });

  ipcMain.handle("projects:setCurrent", async (_e, projectId) => {
    currentProjectId = projectId ? String(projectId) : null;
    return { ok: true, currentProjectId };
  });

  ipcMain.handle("tools:run", async (_e, { id, input }) => {
    const ext = getActiveExtension();
    if (!ext || ext.kind !== "tool") {
      throw new Error("tools.run requires an active tool extension");
    }
    if (id && id !== ext.id) {
      throw new Error(`tools.run id mismatch: active=${ext.id} requested=${id}`);
    }
    const toolId = String(id || ext.id);

    if (toolId === "avatar-image-gen") {
      const action = input?.action || "generate";
      if (action === "status") {
        return { ok: true, id: toolId, ...imageApiStatus() };
      }
      return generateAvatars(input || {});
    }

    // Other local tools run in the renderer; main hook echoes for telemetry.
    return { ok: true, id: toolId, echo: input ?? null };
  });
}

async function pumpStream(c) {
  try {
    await c.streamEvents((event) => {
      sendToRenderer("desktop:streamEvent", event);
    });
  } catch (err) {
    if (err?.name === "AbortError") return;
    logAgent(`stream ended: ${err?.message || err}`);
  }
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  client?.stopStream();
  if (agentManagedByUs && agentChild) {
    agentChild.kill("SIGTERM");
  }
});
