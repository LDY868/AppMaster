import { renderNav } from "./nav.js";
import { renderHome } from "./home.js";

/** @type {{ extensions: any[], projects: any[], route: { type: string, id: string }, unmount: null | (() => void), connected: boolean }} */
const state = {
  extensions: [],
  projects: [],
  route: { type: "shell", id: "home" },
  unmount: null,
  connected: false,
};

const el = {
  nav: document.getElementById("nav"),
  content: document.getElementById("content"),
  statusBar: document.getElementById("statusBar"),
  serveLabel: document.getElementById("serveLabel"),
  projectStatus: document.getElementById("projectStatus"),
  noticeStatus: document.getElementById("noticeStatus"),
};

function activeNavId() {
  if (state.route.type === "extension") return `ext:${state.route.id}`;
  return state.route.id;
}

function setServeStatus(kind, label) {
  el.statusBar.dataset.serve = kind;
  el.serveLabel.textContent = label;
}

function setNotice(msg) {
  el.noticeStatus.textContent = msg;
}

function setProjectLabel(id) {
  el.projectStatus.textContent = id ? `项目：${id}` : "项目：—";
}

async function refreshExtensions() {
  state.extensions = (await window.appmaster.listExtensions()) || [];
}

async function refreshProjects() {
  try {
    state.projects = (await window.appmaster.listProjects()) || [];
  } catch {
    state.projects = [];
  }
}

function paintNav() {
  renderNav(el.nav, {
    extensions: state.extensions,
    activeId: activeNavId(),
    onSelect: (route) => {
      void navigate(route);
    },
  });
}

async function navigate(route) {
  if (state.unmount) {
    try {
      state.unmount();
    } catch {
      /* ignore */
    }
    state.unmount = null;
  }

  state.route = route;
  paintNav();

  if (route.type === "shell") {
    await window.appmaster.setActiveExtension(null);
    if (route.id === "home") return renderShellHome();
    if (route.id === "projects") return renderShellProjects();
    if (route.id === "settings") return renderShellSettings();
  }

  if (route.type === "extension") {
    await window.appmaster.setActiveExtension(route.id);
    return loadExtension(route.id);
  }
}

async function renderShellHome() {
  await refreshProjects();
  renderHome(el.content, {
    extensions: state.extensions,
    projects: state.projects,
    onOpenExtension: (id) => navigate({ type: "extension", id }),
    onOpenProjects: () => navigate({ type: "shell", id: "projects" }),
  });
}

async function renderShellProjects() {
  await refreshProjects();
  el.content.innerHTML = `
    <section class="panel">
      <div class="panel-head">
        <h1>项目库</h1>
        <p>本机 <code>projects/&lt;projectId&gt;</code> 产物与会话归档。</p>
      </div>
      <ul class="list" id="projectList"></ul>
    </section>
  `;
  const list = el.content.querySelector("#projectList");
  if (!state.projects.length) {
    list.innerHTML = `<li><span>暂无项目。在「移动端外包 Studio」完成 intake 后会出现在这里。</span></li>`;
    return;
  }
  for (const p of state.projects) {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${p.id}</strong><span class="meta">${p.stage || "—"} · ${
      (p.artifacts || []).length
    } files</span>`;
    const open = document.createElement("button");
    open.type = "button";
    open.className = "btn ghost";
    open.textContent = "打开工作区";
    open.addEventListener("click", async () => {
      await window.appmaster.setCurrentProject(p.id);
      setProjectLabel(p.id);
      navigate({ type: "extension", id: "mobile-outsource-studio" });
    });
    li.appendChild(open);
    list.appendChild(li);
  }
}

async function renderShellSettings() {
  const keyStatus = await window.appmaster.getApiKeyStatus();
  const desk = await window.appmaster.getState();
  el.content.innerHTML = `
    <section class="panel">
      <div class="panel-head">
        <h1>设置</h1>
        <p>凭证、serve 与扩展开关。第三方默认拒绝，由工作区 config 继承。</p>
      </div>
      <p id="keyStatus">API key: ${
        keyStatus.hasApiKey
          ? `present (${keyStatus.source})`
          : "missing — model turns need CURSOR_API_KEY or agent-sdk login"
      }</p>
      <label class="field inline">
        <span>CURSOR_API_KEY</span>
        <input id="apiKey" type="password" placeholder="写入 OS 安全存储" autocomplete="off" />
      </label>
      <div class="actions">
        <button type="button" class="btn ghost" id="btnSaveKey">保存密钥</button>
        <button type="button" class="btn ghost" id="btnClearKey">清除</button>
        <button type="button" class="btn primary" id="btnConnect">连接 / 拉起 serve</button>
      </div>
      <p style="margin-top:1rem;color:var(--muted);font-size:0.86rem">
        Agent root: <code>${desk.agentRoot}</code><br/>
        Default serve: <code>${desk.baseUrl}</code>
      </p>
      <div class="panel-head" style="margin-top:1.25rem">
        <h2>扩展</h2>
        <p>关闭后侧栏不再显示；清单仍留在 <code>desktop/extensions</code> 或 <code>~/.appmaster/extensions</code>。</p>
      </div>
      <ul class="list" id="extList"></ul>
      <pre class="log" id="settingsLog" aria-label="Agent log"></pre>
    </section>
  `;

  const logEl = el.content.querySelector("#settingsLog");
  const appendLog = (line) => {
    const stamp = new Date().toLocaleTimeString();
    logEl.textContent += `[${stamp}] ${line}\n`;
    logEl.scrollTop = logEl.scrollHeight;
  };

  const extList = el.content.querySelector("#extList");
  for (const ext of state.extensions) {
    const li = document.createElement("li");
    li.innerHTML = `<div><strong>${ext.name}</strong><div style="color:var(--muted);font-size:0.78rem">${ext.id} · ${ext.kind} · ${ext.source}</div></div>`;
    const label = document.createElement("label");
    label.className = "toggle meta";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = ext.enabled;
    cb.addEventListener("change", async () => {
      await window.appmaster.setExtensionEnabled(ext.id, cb.checked);
      await refreshExtensions();
      paintNav();
      appendLog(`${ext.id} → ${cb.checked ? "enabled" : "disabled"}`);
    });
    label.appendChild(cb);
    label.appendChild(document.createTextNode("启用"));
    li.appendChild(label);
    extList.appendChild(li);
  }

  el.content.querySelector("#btnSaveKey").addEventListener("click", async () => {
    const input = el.content.querySelector("#apiKey");
    try {
      await window.appmaster.setApiKey(input.value);
      input.value = "";
      appendLog("API key stored via OS secure storage (not logged)");
      const s = await window.appmaster.getApiKeyStatus();
      el.content.querySelector("#keyStatus").textContent = s.hasApiKey
        ? `API key: present (${s.source})`
        : "API key: missing";
    } catch (err) {
      appendLog(`setApiKey: ${err.message || err}`);
    }
  });
  el.content.querySelector("#btnClearKey").addEventListener("click", async () => {
    await window.appmaster.clearApiKey();
    appendLog("Cleared persisted API key");
  });
  el.content.querySelector("#btnConnect").addEventListener("click", async () => {
    setServeStatus("busy", "Connecting…");
    try {
      const res = await window.appmaster.ensureServe();
      state.connected = res.ok;
      setServeStatus(
        "ok",
        res.managed
          ? `Serve :${new URL(res.baseUrl).port} (managed)`
          : `Serve ${res.baseUrl}`,
      );
      appendLog(`Connected to ${res.baseUrl}`);
    } catch (err) {
      state.connected = false;
      setServeStatus("idle", "Serve offline");
      appendLog(`Connect failed: ${err.message || err}`);
    }
  });

  state.unmount = window.appmaster.onAgentLog(({ line }) => appendLog(line));
}

async function loadExtension(id) {
  const ext = state.extensions.find((e) => e.id === id);
  if (!ext) {
    el.content.innerHTML = `<section class="panel"><p>扩展未找到：${id}</p></section>`;
    return;
  }
  if (!ext.enabled) {
    el.content.innerHTML = `<section class="panel"><p>扩展已禁用：${ext.name}</p></section>`;
    return;
  }

  el.content.innerHTML = `<section class="panel"><p>加载 ${ext.name}…</p></section>`;

  // Prefer relative import for bundled extensions (CSP script-src 'self').
  // User extensions fall back to the absolute file URL from main.
  const bundledHref = `../extensions/${ext.id}/ui/index.js`;
  const href =
    ext.source === "bundled" ? bundledHref : ext.entryUrl || bundledHref;
  try {
    const mod = await import(/* webpackIgnore: true */ href);
    el.content.innerHTML = "";
    const host = document.createElement("div");
    host.className = "ext-host";
    host.dataset.extensionId = ext.id;
    el.content.appendChild(host);

    const api = window.appmaster;
    const result = await mod.mount(host, { api, manifest: ext, shell: { setProjectLabel, setNotice, setServeStatus } });
    if (typeof result === "function") state.unmount = result;
    else if (result && typeof result.unmount === "function") {
      state.unmount = () => result.unmount();
    } else if (typeof mod.unmount === "function") {
      state.unmount = () => mod.unmount();
    }
  } catch (err) {
    el.content.innerHTML = `
      <section class="panel">
        <div class="panel-head"><h1>${ext.name}</h1>
        <p>加载失败：${String(err.message || err)}</p></div>
      </section>`;
  }
}

async function boot() {
  if (!window.appmaster) {
    el.content.innerHTML =
      "<section class=\"panel\"><p>Preload bridge missing — restart Electron (preload.cjs required).</p></section>";
    setServeStatus("idle", "Bridge missing");
    return;
  }

  await refreshExtensions();
  paintNav();

  window.appmaster.onNotice(({ message }) => setNotice(message));
  window.appmaster.onAgentLog(({ line }) => {
    if (line.toLowerCase().includes("ready") || line.includes("listening")) {
      setServeStatus("ok", el.serveLabel.textContent);
    }
  });

  const desk = await window.appmaster.getState();
  setProjectLabel(desk.currentProjectId);
  if (desk.connected) {
    setServeStatus("ok", `Serve ${desk.baseUrl}`);
    state.connected = true;
  }

  await navigate({ type: "shell", id: "home" });
}

boot().catch((err) => {
  el.content.textContent = String(err.message || err);
});
