/**
 * Build sidebar IA from static shell routes + extension manifests.
 */

const SHELL_TOP = [
  { id: "home", label: "工作台 Home", route: "home" },
];

const SHELL_BOTTOM = [
  { id: "projects", label: "项目库 Projects", route: "projects" },
  { id: "settings", label: "设置 Settings", route: "settings" },
];

/**
 * @param {HTMLElement} navEl
 * @param {{
 *   extensions: Array<{ id: string, name: string, kind: string, enabled: boolean, nav?: { group?: string, order?: number } }>,
 *   activeId: string,
 *   onSelect: (route: { type: string, id: string }) => void,
 * }} opts
 */
export function renderNav(navEl, { extensions, activeId, onSelect }) {
  navEl.innerHTML = "";

  const addItem = (label, routeKey, opts = {}) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "nav-item" + (activeId === routeKey ? " active" : "");
    btn.textContent = label;
    if (opts.badge) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = opts.badge;
      btn.appendChild(badge);
    }
    btn.addEventListener("click", () => onSelect(opts.route));
    navEl.appendChild(btn);
  };

  const addGroup = (label) => {
    const wrap = document.createElement("div");
    wrap.className = "nav-group";
    const title = document.createElement("p");
    title.className = "nav-group-label";
    title.textContent = label;
    wrap.appendChild(title);
    navEl.appendChild(wrap);
    return wrap;
  };

  for (const item of SHELL_TOP) {
    addItem(item.label, item.id, { route: { type: "shell", id: item.id } });
  }

  const workspaces = extensions.filter(
    (e) => e.enabled && (e.kind === "workspace" || e.nav?.group === "workspaces"),
  );
  const tools = extensions.filter(
    (e) => e.enabled && (e.kind === "tool" || e.nav?.group === "tools"),
  );
  const agentLite = extensions.filter(
    (e) => e.enabled && e.kind === "agent-lite",
  );

  const wsGroup = addGroup("工作区 Workspaces");
  if (!workspaces.length) {
    const empty = document.createElement("p");
    empty.className = "nav-group-label";
    empty.textContent = "（暂无）";
    wsGroup.appendChild(empty);
  }
  for (const ext of workspaces) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "nav-item" + (activeId === `ext:${ext.id}` ? " active" : "");
    btn.textContent = ext.name;
    btn.addEventListener("click", () =>
      onSelect({ type: "extension", id: ext.id }),
    );
    wsGroup.appendChild(btn);
  }

  const toolsGroup = addGroup("小工具 Tools");
  for (const ext of [...tools, ...agentLite]) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "nav-item" + (activeId === `ext:${ext.id}` ? " active" : "");
    btn.textContent = ext.name;
    btn.addEventListener("click", () =>
      onSelect({ type: "extension", id: ext.id }),
    );
    toolsGroup.appendChild(btn);
  }

  for (const item of SHELL_BOTTOM) {
    addItem(item.label, item.id, { route: { type: "shell", id: item.id } });
  }
}
