import {
  app,
  BrowserWindow,
  ipcMain,
  safeStorage,
} from "electron";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AgentClient, waitForAgent } from "./lib/agent-client.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AGENT_ROOT = path.resolve(__dirname, "..");
const DEFAULT_PORT = Number(process.env.APPMASTER_AGENT_PORT || 3210);
const DEFAULT_BASE = `http://127.0.0.1:${DEFAULT_PORT}`;

/** @type {BrowserWindow | null} */
let mainWindow = null;
/** @type {import('node:child_process').ChildProcess | null} */
let agentChild = null;
/** @type {AgentClient | null} */
let client = null;
let agentManagedByUs = false;

function keyStorePath() {
  return path.join(app.getPath("userData"), "cursor-api-key.bin");
}

function redact(value) {
  if (!value) return "";
  if (value.length <= 8) return "********";
  return `${value.slice(0, 4)}…${value.slice(-2)}`;
}

/**
 * Resolve Cursor API key: env first, then encrypted userData blob.
 * Never returned to the renderer in full.
 */
function resolveApiKey() {
  if (process.env.CURSOR_API_KEY?.trim()) {
    return { key: process.env.CURSOR_API_KEY.trim(), source: "env" };
  }
  if (process.env.CURSOR_API_KEY_FILE?.trim()) {
    try {
      const key = fs
        .readFileSync(process.env.CURSOR_API_KEY_FILE.trim(), "utf8")
        .trim();
      if (key) return { key, source: "file" };
    } catch {
      /* ignore */
    }
  }
  try {
    const p = keyStorePath();
    if (fs.existsSync(p) && safeStorage.isEncryptionAvailable()) {
      const buf = fs.readFileSync(p);
      const key = safeStorage.decryptString(buf).trim();
      if (key) return { key, source: "safeStorage" };
    }
  } catch {
    /* ignore */
  }
  return { key: null, source: "none" };
}

function persistApiKey(key) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error(
      "OS secure storage unavailable; set CURSOR_API_KEY in the environment instead.",
    );
  }
  const encrypted = safeStorage.encryptString(key.trim());
  fs.mkdirSync(path.dirname(keyStorePath()), { recursive: true });
  fs.writeFileSync(keyStorePath(), encrypted);
}

function clearPersistedApiKey() {
  try {
    fs.unlinkSync(keyStorePath());
  } catch {
    /* ignore */
  }
}

function sendToRenderer(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function logAgent(line) {
  // Never echo lines that look like API keys.
  const scrubbed = String(line).replace(
    /CURSOR_API_KEY[=:]\s*\S+/gi,
    "CURSOR_API_KEY=***",
  );
  sendToRenderer("desktop:agentLog", { line: scrubbed, at: Date.now() });
}

async function probeExisting() {
  const { key } = resolveApiKey();
  const result = await waitForAgent(DEFAULT_BASE, {
    timeoutMs: 1500,
    bearerToken: null,
  });
  if (result.ok) {
    client = result.client;
    if (key) {
      // Key is for the child serve process / model turns; HTTP may be anonymous on loopback.
      process.env.CURSOR_API_KEY = key;
    }
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
  });

  const waited = await waitForAgent(DEFAULT_BASE, { timeoutMs: 90_000 });
  if (!waited.ok) {
    throw new Error(`Agent serve did not become ready: ${waited.error}`);
  }
  client = waited.client;
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
  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));
}

function registerIpc() {
  ipcMain.handle("desktop:getState", async () => {
    const { source } = resolveApiKey();
    return {
      agentRoot: AGENT_ROOT,
      baseUrl: DEFAULT_BASE,
      port: DEFAULT_PORT,
      hasApiKey: source !== "none",
      apiKeySource: source,
      connected: Boolean(client),
      sessionId: client?.sessionId ?? null,
      managedAgent: agentManagedByUs,
    };
  });

  ipcMain.handle("desktop:getApiKeyStatus", async () => {
    const { source } = resolveApiKey();
    return {
      hasApiKey: source !== "none",
      source,
      encryptionAvailable: safeStorage.isEncryptionAvailable(),
    };
  });

  ipcMain.handle("desktop:setApiKey", async (_e, key) => {
    if (typeof key !== "string" || !key.trim()) {
      throw new Error("API key must be a non-empty string");
    }
    persistApiKey(key.trim());
    process.env.CURSOR_API_KEY = key.trim();
    // Do not log the key. Restart managed serve so the child picks it up.
    if (agentManagedByUs && agentChild) {
      agentChild.kill("SIGTERM");
      agentChild = null;
      client = null;
      await ensureAgent();
    }
    return { ok: true, source: "safeStorage" };
  });

  ipcMain.handle("desktop:clearApiKey", async () => {
    clearPersistedApiKey();
    delete process.env.CURSOR_API_KEY;
    return { ok: true };
  });

  ipcMain.handle("desktop:ensureAgent", async () => ensureAgent());

  ipcMain.handle("desktop:presentChoices", async (_e, projectId) => {
    const c = requireClient();
    return c.callTool("present_choices", { projectId });
  });

  ipcMain.handle("desktop:saveConfig", async (_e, payload) => {
    const c = requireClient();
    return c.callTool("save_config", payload);
  });

  ipcMain.handle("desktop:getProjectState", async (_e, projectId) => {
    const c = requireClient();
    return c.callTool("get_project_state", { projectId });
  });

  ipcMain.handle("desktop:readArtifact", async (_e, { projectId, artifact }) => {
    const c = requireClient();
    return c.callTool("read_artifact", { projectId, artifact });
  });

  ipcMain.handle("desktop:approveGate", async (_e, payload) => {
    const c = requireClient();
    const approved = await c.callTool("approve_gate", payload);
    // Nudge the orchestrator to continue after the gate.
    if (c.sessionId && c.continuationToken) {
      const gate = payload.gate;
      await c.followUp(
        `Gate ${gate} approved in the desktop shell. Continue the pipeline.`,
      );
      void pumpStream(c);
    }
    return approved;
  });

  ipcMain.handle("desktop:startRun", async (_e, payload) => {
    const c = requireClient();
    const { projectId, brief, answers } = payload;

    // Reset any prior desktop session so Save & Run is idempotent.
    c.stopStream();
    c.sessionId = null;
    c.continuationToken = null;

    // Open a session first so subsequent tool calls share the same kv/files scope.
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
    return started;
  });

  ipcMain.handle("desktop:followUp", async (_e, message) => {
    const c = requireClient();
    const result = await c.followUp(message);
    void pumpStream(c);
    return result;
  });

  ipcMain.handle("desktop:stopRun", async () => {
    const c = requireClient();
    c.stopStream();
    return c.stop();
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
