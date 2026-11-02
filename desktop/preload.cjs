const { contextBridge, ipcRenderer } = require("electron");

/**
 * Renderer-facing API. Secrets never cross this bridge as loggable dumps —
 * setApiKey accepts a string once; getApiKeyStatus returns only booleans.
 */
contextBridge.exposeInMainWorld("appmaster", {
  getState: () => ipcRenderer.invoke("desktop:getState"),
  setApiKey: (key) => ipcRenderer.invoke("desktop:setApiKey", key),
  clearApiKey: () => ipcRenderer.invoke("desktop:clearApiKey"),
  getApiKeyStatus: () => ipcRenderer.invoke("desktop:getApiKeyStatus"),
  ensureAgent: () => ipcRenderer.invoke("desktop:ensureAgent"),
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
});
