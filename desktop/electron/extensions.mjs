import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DESKTOP_ROOT = path.resolve(__dirname, "..");
export const BUNDLED_EXTENSIONS_DIR = path.join(DESKTOP_ROOT, "extensions");

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   kind: "workspace" | "tool" | "agent-lite",
 *   version?: string,
 *   entry: string,
 *   agent?: { servePort?: number, cwd?: string },
 *   permissions?: string[],
 *   nav?: { group?: string, icon?: string, order?: number },
 *   description?: string,
 *   source: "bundled" | "user",
 *   rootDir: string,
 *   enabled: boolean,
 * }} ExtensionManifest
 */

/**
 * @param {string} dir
 * @param {"bundled" | "user"} source
 * @param {Record<string, boolean>} enabledMap
 * @returns {ExtensionManifest[]}
 */
function scanDir(dir, source, enabledMap) {
  if (!fs.existsSync(dir)) return [];
  /** @type {ExtensionManifest[]} */
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const rootDir = path.join(dir, name);
    let st;
    try {
      st = fs.statSync(rootDir);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;
    const manifestPath = path.join(rootDir, "manifest.json");
    if (!fs.existsSync(manifestPath)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      if (!raw?.id || !raw?.entry || !raw?.kind) continue;
      const enabled =
        enabledMap[raw.id] === undefined ? true : Boolean(enabledMap[raw.id]);
      out.push({
        id: String(raw.id),
        name: String(raw.name || raw.id),
        kind: raw.kind,
        version: raw.version ? String(raw.version) : "0.0.0",
        entry: String(raw.entry),
        agent: raw.agent || undefined,
        permissions: Array.isArray(raw.permissions)
          ? raw.permissions.map(String)
          : [],
        nav: raw.nav || { group: raw.kind === "tool" ? "tools" : "workspaces" },
        description: raw.description ? String(raw.description) : "",
        source,
        rootDir,
        enabled,
      });
    } catch {
      /* skip invalid manifests */
    }
  }
  return out;
}

export function userExtensionsDir() {
  return path.join(os.homedir(), ".appmaster", "extensions");
}

/**
 * @param {{ enabledMap?: Record<string, boolean> }} [opts]
 * @returns {ExtensionManifest[]}
 */
export function listExtensions(opts = {}) {
  const enabledMap = opts.enabledMap || {};
  const bundled = scanDir(BUNDLED_EXTENSIONS_DIR, "bundled", enabledMap);
  const user = scanDir(userExtensionsDir(), "user", enabledMap);
  const byId = new Map();
  // Bundled first; user overrides same id.
  for (const ext of bundled) byId.set(ext.id, ext);
  for (const ext of user) byId.set(ext.id, ext);
  return [...byId.values()].sort((a, b) => {
    const ao = a.nav?.order ?? 100;
    const bo = b.nav?.order ?? 100;
    if (ao !== bo) return ao - bo;
    return a.name.localeCompare(b.name);
  });
}

/**
 * @param {ExtensionManifest | null | undefined} ext
 * @param {string} permission
 */
export function hasPermission(ext, permission) {
  if (!ext) return false;
  if (!ext.enabled) return false;
  return (ext.permissions || []).includes(permission);
}

/**
 * Resolve UI entry URL for the renderer (file path).
 * @param {ExtensionManifest} ext
 */
export function resolveEntryPath(ext) {
  return path.resolve(ext.rootDir, ext.entry);
}
