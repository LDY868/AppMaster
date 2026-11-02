/**
 * Home: recent projects, pending gates, quick actions, enabled plugins.
 */

/**
 * @param {HTMLElement} root
 * @param {{
 *   extensions: Array<{ id: string, name: string, kind: string, enabled: boolean, description?: string }>,
 *   projects: Array<{ id: string, stage?: string | null, pendingGate?: unknown }>,
 *   onOpenExtension: (id: string) => void,
 *   onOpenProjects: () => void,
 * }} ctx
 */
export function renderHome(root, ctx) {
  const pending = (ctx.projects || []).filter((p) => p.pendingGate);
  const workspaces = (ctx.extensions || []).filter(
    (e) => e.enabled && e.kind === "workspace",
  );
  const tools = (ctx.extensions || []).filter(
    (e) => e.enabled && e.kind === "tool",
  );

  root.innerHTML = `
    <section class="panel" aria-labelledby="homeHeading">
      <div class="panel-head">
        <h1 id="homeHeading">工作台</h1>
        <p>最近项目、待办闸门与已启用扩展。流水线在「工作区」里打开。</p>
      </div>
      <div class="actions" style="margin-top:0;margin-bottom:1rem">
        <button type="button" class="btn primary" id="btnNewOutsource">新外包单</button>
        <button type="button" class="btn ghost" id="btnOpenProjects">项目库</button>
      </div>
      <div class="home-grid" id="homeGrid"></div>
    </section>
  `;

  const grid = root.querySelector("#homeGrid");

  const studio = workspaces.find((e) => e.id === "mobile-outsource-studio");
  if (studio) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "home-card";
    card.innerHTML = `<h3>${studio.name}</h3><p>${studio.description || "移动端外包流水线工作区"}</p>`;
    card.addEventListener("click", () => ctx.onOpenExtension(studio.id));
    grid.appendChild(card);
  }

  const gateCard = document.createElement("div");
  gateCard.className = "home-card";
  gateCard.style.cursor = "default";
  gateCard.innerHTML = `<h3>未完成闸门</h3><p>${
    pending.length
      ? pending.map((p) => `${p.id}`).join("、")
      : "暂无待批准闸门"
  }</p>`;
  grid.appendChild(gateCard);

  const recent = document.createElement("div");
  recent.className = "home-card";
  recent.style.cursor = "default";
  const recentIds = (ctx.projects || []).slice(0, 5).map((p) => p.id);
  recent.innerHTML = `<h3>最近项目</h3><p>${
    recentIds.length ? recentIds.join("、") : "尚无本地 projects/ 归档"
  }</p>`;
  grid.appendChild(recent);

  for (const tool of tools.slice(0, 4)) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "home-card";
    card.innerHTML = `<h3>${tool.name}</h3><p>${tool.description || "本地小工具"}</p>`;
    card.addEventListener("click", () => ctx.onOpenExtension(tool.id));
    grid.appendChild(card);
  }

  root.querySelector("#btnNewOutsource")?.addEventListener("click", () => {
    ctx.onOpenExtension(
      studio?.id || workspaces[0]?.id || "mobile-outsource-studio",
    );
  });
  root.querySelector("#btnOpenProjects")?.addEventListener("click", () => {
    ctx.onOpenProjects();
  });
}
