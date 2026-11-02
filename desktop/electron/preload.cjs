const { contextBridge, ipcRenderer } = require("electron");

/**
 * Whitelisted renderer API. Secrets never cross as loggable dumps —
 * setApiKey accepts a string once; getApiKeyStatus returns only booleans.
 * Extension permissions are enforced again in the main process.
 */
contextBridge.exposeInMainWorld("appmaster", {
  // Shell / status
  getState: () => ipcRenderer.invoke("desktop:getState"),
  getApiKeyStatus: () => ipcRenderer.invoke("desktop:getApiKeyStatus"),

  // Extensions
  listExtensions: () => ipcRenderer.invoke("extensions:list"),
  setExtensionEnabled: (id, enabled) =>
    ipcRenderer.invoke("extensions:setEnabled", { id, enabled }),
  setActiveExtension: (id) => ipcRenderer.invoke("extensions:setActive", id),

  // Secrets (whitelist)
  setApiKey: (key) => ipcRenderer.invoke("desktop:setApiKey", key),
  clearApiKey: () => ipcRenderer.invoke("desktop:clearApiKey"),
  secrets: {
    set: (key) => ipcRenderer.invoke("secrets:set", key),
    clear: () => ipcRenderer.invoke("secrets:clear"),
  },

  // Agent serve / HTTP tools
  ensureAgent: () => ipcRenderer.invoke("desktop:ensureAgent"),
  ensureServe: () => ipcRenderer.invoke("agent:ensureServe"),
  agentFetch: (toolName, input) =>
    ipcRenderer.invoke("agent:fetch", { toolName, input }),
  presentChoices: (projectId) =>
    ipcRenderer.invoke("desktop:presentChoices", projectId),
  saveConfig: (payload) => ipcRenderer.invoke("desktop:saveConfig", payload),
  getProjectState: (projectId) =>
    ipcRenderer.invoke("desktop:getProjectState", projectId),
  readArtifact: (projectId, artifact) =>
    ipcRenderer.invoke("desktop:readArtifact", { projectId, artifact }),
  approveGate: (payload) => ipcRenderer.invoke("desktop:approveGate", payload),
  startRun: (payload) => ipcRenderer.invoke("desktop:startRun", payload),
  followUp: (message) => ipcRenderer.invoke("desktop:followUp", message),
  stopRun: () => ipcRenderer.invoke("desktop:stopRun"),

  // Projects
  listProjects: () => ipcRenderer.invoke("projects:list"),
  setCurrentProject: (projectId) =>
    ipcRenderer.invoke("projects:setCurrent", projectId),

  // Local tool hook
  runTool: (id, input) => ipcRenderer.invoke("tools:run", { id, input }),

  // Events
  onStreamEvent: (handler) => {
    const listener = (_event, data) => handler(data);
    ipcRenderer.on("desktop:streamEvent", listener);
    return () => ipcRenderer.removeListener("desktop:streamEvent", listener);
  },
  onAgentLog: (handler) => {
    const listener = (_event, data) => handler(data);
    ipcRenderer.on("desktop:agentLog", listener);
    return () => ipcRenderer.removeListener("desktop:agentLog", listener);
  },
  onNotice: (handler) => {
    const listener = (_event, data) => handler(data);
    ipcRenderer.on("desktop:notice", listener);
    return () => ipcRenderer.removeListener("desktop:notice", listener);
  },
});
