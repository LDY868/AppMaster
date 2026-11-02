import { app, safeStorage } from "electron";
import fs from "node:fs";
import path from "node:path";

function keyStorePath() {
  return path.join(app.getPath("userData"), "cursor-api-key.bin");
}

/**
 * Resolve Cursor API key: env first, then encrypted userData blob.
 * Never returned to the renderer in full.
 */
export function resolveApiKey() {
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

export function persistApiKey(key) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error(
      "OS secure storage unavailable; set CURSOR_API_KEY in the environment instead.",
    );
  }
  const encrypted = safeStorage.encryptString(key.trim());
  fs.mkdirSync(path.dirname(keyStorePath()), { recursive: true });
  fs.writeFileSync(keyStorePath(), encrypted);
}

export function clearPersistedApiKey() {
  try {
    fs.unlinkSync(keyStorePath());
  } catch {
    /* ignore */
  }
}

export function encryptionAvailable() {
  return safeStorage.isEncryptionAvailable();
}

export function redact(value) {
  if (!value) return "";
  if (value.length <= 8) return "********";
  return `${value.slice(0, 4)}…${value.slice(-2)}`;
}
