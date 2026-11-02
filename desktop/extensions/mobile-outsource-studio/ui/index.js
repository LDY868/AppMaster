/**
 * Mobile Outsource Studio workspace — migrated Phase 5 pipeline UI.
 * Orchestration stays in bot/; this extension is a client view only.
 */

const STAGE_ORDER = [
  "intake",
  "requirements",
  "ui-design",
  "api-design",
  "implement",
  "qa",
  "packaging",
  "docs",
];

/** @type {null | { root: HTMLElement, api: any, shell: any, cleanups: Function[] }} */
let ctx = null;

const local = {
  questions: [],
  projectId: "coffee-demo",
  activeStage: null,
  pendingGate: null,
  connected: false,
};

function ensureStyles(root) {
  const id = "mos-styles";
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = new URL("./styles.css", import.meta.url).href;
  document.head.appendChild(link);
}

function unwrapTool(res) {
  return res?.result ?? res?.output ?? res?.data ?? res;
}

function appendLog(line) {
  const log = ctx?.root.querySelector("#mosLog");
  if (!log) return;
  const stamp = new Date().toLocaleTimeString();
  log.textContent += `[${stamp}] ${line}\n`;
  log.scrollTop = log.scrollHeight;
}

function renderStages() {
  const stages = ctx.root.querySelector("#mosStages");
  stages.innerHTML = "";
  const activeIdx = STAGE_ORDER.indexOf(local.activeStage);
  for (const [i, stage] of STAGE_ORDER.entries()) {
    const li = document.createElement("li");
    if (stage === local.activeStage) li.classList.add("active");
    else if (activeIdx >= 0 && i < activeIdx) li.classList.add("done");
    li.innerHTML = `<span class="mark"></span><span>${stage}</span><span>${i + 1}</span>`;
    stages.appendChild(li);
  }
}

function renderQuestions(questions) {
  local.questions = questions;
  const host = ctx.root.querySelector("#mosQuestions");
  host.innerHTML = "";
  for (const q of questions) {
    const fs = document.createElement("fieldset");
    fs.className = "mos-q";
    fs.dataset.qid = q.id;
    const legend = document.createElement("legend");
    legend.textContent = q.prompt;
    fs.appendChild(legend);
    const opts = document.createElement("div");
    opts.className = "mos-opts";
    const multi = q.id === "thirdParty";
    for (const opt of q.options) {
      const label = document.createElement("label");
      label.className = "mos-opt";
      const input = document.createElement("input");
      input.type = multi ? "checkbox" : "radio";
      input.name = multi ? `q-${q.id}-${opt.id}` : `q-${q.id}`;
      input.value = opt.id;
      if (opt.recommended && !multi) input.checked = true;
      if (opt.recommended && multi && opt.id === "none") input.checked = true;
      input.addEventListener("change", () => {
        if (multi && opt.id === "none" && input.checked) {
          for (const other of opts.querySelectorAll('input[type="checkbox"]')) {
            if (other !== input) other.checked = false;
          }
        } else if (multi && opt.id !== "none" && input.checked) {
          const none = opts.querySelector('input[value="none"]');
          if (none) none.checked = false;
        }
      });
      const span = document.createElement("span");
      span.textContent = opt.label.replace(/\s*\(recommended\)\s*$/i, "");
      if (opt.recommended) {
        const rec = document.createElement("span");
        rec.className = "rec";
        rec.textContent = "recommended";
        span.appendChild(rec);
      }
      label.appendChild(input);
      label.appendChild(span);
      opts.appendChild(label);
    }
    fs.appendChild(opts);
    host.appendChild(fs);
  }
}

function collectAnswers() {
  const brief = ctx.root.querySelector("#mosBrief").value.trim();
  const answers = { brief: brief || undefined };
  const host = ctx.root.querySelector("#mosQuestions");
  for (const q of local.questions) {
    const fs = host.querySelector(`fieldset[data-qid="${q.id}"]`);
    if (!fs) continue;
    if (q.id === "thirdParty") {
      const selected = [...fs.querySelectorAll('input[type="checkbox"]:checked')].map(
        (i) => i.value,
      );
      if (selected.includes("none") || selected.length === 0) {
        answers.thirdParty = { mode: "none", allow: [] };
      } else {
        answers.thirdParty = {
          mode: "allowlist",
          allow: selected.filter((id) => id !== "custom"),
        };
      }
      continue;
    }
    const picked = fs.querySelector('input[type="radio"]:checked');
    if (!picked) continue;
    if (q.id === "design") answers.designSource = picked.value;
    else if (q.id === "industry") answers.industry = picked.value;
    else answers[q.id] = picked.value;
  }
  return answers;
}

function showGate(gate) {
  local.pendingGate = gate;
  const box = ctx.root.querySelector("#mosGate");
  if (!gate || gate.status !== "pending") {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  ctx.root.querySelector("#mosGateId").textContent = gate.gate || "";
  ctx.root.querySelector("#mosGateSummary").textContent =
    gate.summary || "确认后继续下一阶段。";
}

function renderArtifacts(artifacts) {
  const list = ctx.root.querySelector("#mosArtifacts");
  const preview = ctx.root.querySelector("#mosPreview");
  list.innerHTML = "";
  for (const a of artifacts || []) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = a.name;
    if (a.exists) btn.classList.add("exists");
    btn.addEventListener("click", async () => {
      for (const b of list.querySelectorAll("button")) b.classList.remove("selected");
      btn.classList.add("selected");
      if (!a.exists) {
        preview.textContent = `${a.name} 尚未生成（Owner: ${a.owner}）`;
        return;
      }
      try {
        const res = await ctx.api.readArtifact(local.projectId, a.name);
        const payload = unwrapTool(res);
        if (payload?.ok === false) {
          preview.textContent = payload.message || payload.error || "无法读取";
        } else {
          preview.textContent = payload?.content ?? JSON.stringify(payload, null, 2);
        }
      } catch (err) {
        preview.textContent = String(err.message || err);
      }
    });
    list.appendChild(btn);
  }
}

async function connect() {
  ctx.shell?.setServeStatus?.("busy", "Connecting…");
  try {
    const res = await ctx.api.ensureAgent();
    local.connected = res.ok;
    ctx.shell?.setServeStatus?.(
      "ok",
      res.managed
        ? `Serve :${new URL(res.baseUrl).port} (managed)`
        : `Serve ${res.baseUrl}`,
    );
    appendLog(`Connected to ${res.baseUrl}`);
  } catch (err) {
    local.connected = false;
    ctx.shell?.setServeStatus?.("idle", "Serve offline");
    appendLog(`Connect failed: ${err.message || err}`);
    throw err;
  }
}

async function loadQuestions() {
  local.projectId =
    ctx.root.querySelector("#mosProjectId").value.trim() || "coffee-demo";
  if (!local.connected) await connect();
  const raw = await ctx.api.presentChoices(local.projectId);
  const data = unwrapTool(raw);
  renderQuestions(data.questions || []);
  appendLog(`Loaded ${data.questions?.length ?? 0} intake questions`);
}

async function refreshProject() {
  try {
    const raw = await ctx.api.getProjectState(local.projectId);
    const snap = unwrapTool(raw);
    if (snap?.status?.stage) {
      local.activeStage = snap.status.stage;
      renderStages();
    }
    showGate(snap?.pendingGate);
    renderArtifacts(snap?.artifacts);
    ctx.shell?.setProjectLabel?.(local.projectId);
  } catch (err) {
    appendLog(`get_project_state: ${err.message || err}`);
  }
}

async function saveAndRun() {
  local.projectId =
    ctx.root.querySelector("#mosProjectId").value.trim() || "coffee-demo";
  if (!local.connected) await connect();
  if (!local.questions.length) await loadQuestions();
  const answers = collectAnswers();
  local.activeStage = "intake";
  renderStages();
  ctx.shell?.setServeStatus?.("busy", "Starting session…");
  const started = await ctx.api.startRun({
    projectId: local.projectId,
    brief: answers.brief,
    answers,
  });
  appendLog(`session ${started.sessionId || "(started)"}`);
  ctx.shell?.setServeStatus?.("ok", "Session running");
  ctx.shell?.setProjectLabel?.(local.projectId);
  await ctx.api.setCurrentProject?.(local.projectId);
  await refreshProject();
}

async function approve() {
  if (!local.pendingGate?.gate) return;
  const btn = ctx.root.querySelector("#mosApprove");
  btn.disabled = true;
  try {
    const res = unwrapTool(
      await ctx.api.approveGate({
        projectId: local.projectId,
        gate: local.pendingGate.gate,
      }),
    );
    appendLog(`approve_gate ${local.pendingGate.gate} → ${res?.status || "done"}`);
    showGate(null);
    await refreshProject();
  } catch (err) {
    appendLog(`approve failed: ${err.message || err}`);
  } finally {
    btn.disabled = false;
  }
}

function onStreamEvent(event) {
  const type = event?.type || event?.kind || "event";
  if (type.includes("tool") || event?.toolName || event?.name) {
    const name = event.toolName || event.name || event.tool || "";
    appendLog(`tool ${name || type}`);
    if (
      name === "route_stage" ||
      name === "request_approval" ||
      name === "write_artifact"
    ) {
      void refreshProject();
    }
  }
  if (type === "turn.completed" || type === "turn_completed") {
    void refreshProject();
    ctx.shell?.setServeStatus?.("ok", "Turn complete");
  }
}

/**
 * @param {HTMLElement} root
 * @param {{ api: any, manifest: any, shell?: any }} options
 */
export async function mount(root, options) {
  ensureStyles(root);
  ctx = {
    root,
    api: options.api,
    shell: options.shell || {},
    cleanups: [],
  };

  root.innerHTML = `
    <div class="mos-layout">
      <section class="panel" aria-labelledby="mosIntakeHeading">
        <div class="panel-head">
          <h1 id="mosIntakeHeading">Intake</h1>
          <p>选择题配置订单；答案写入 <code>config.json</code>。</p>
        </div>
        <label class="field">
          <span>Project ID</span>
          <input id="mosProjectId" type="text" value="coffee-demo" autocomplete="off" />
        </label>
        <label class="field">
          <span>需求简述</span>
          <textarea id="mosBrief" rows="3" placeholder="例如：咖啡点单 App，客人自助下单取餐…"></textarea>
        </label>
        <div id="mosQuestions" class="mos-questions"></div>
        <div class="actions">
          <button type="button" class="btn ghost" id="mosLoad">加载题库</button>
          <button type="button" class="btn primary" id="mosSaveRun">保存并启动</button>
          <button type="button" class="btn ghost" id="mosConnect">连接 serve</button>
        </div>
      </section>
      <section class="panel" aria-label="Progress and gates">
        <div class="panel-head">
          <h2>阶段进度</h2>
          <p>Orchestrator 只编排；专项 Owner 产出。</p>
        </div>
        <ol id="mosStages" class="mos-stages"></ol>
        <div class="mos-gate" id="mosGate" hidden>
          <h3>人工闸门 <span id="mosGateId"></span></h3>
          <p id="mosGateSummary"></p>
          <button type="button" class="btn primary" id="mosApprove">批准继续</button>
        </div>
        <div class="panel-head tight">
          <h2>产物预览</h2>
        </div>
        <ul id="mosArtifacts" class="mos-artifacts"></ul>
        <pre id="mosPreview" class="mos-preview">选择产物以预览…</pre>
      </section>
    </div>
    <div class="mos-foot panel" style="margin-top:1rem">
      <pre id="mosLog" class="log" aria-label="Agent log"></pre>
    </div>
  `;

  renderStages();

  root.querySelector("#mosConnect").addEventListener("click", () =>
    connect().catch(() => {}),
  );
  root.querySelector("#mosLoad").addEventListener("click", () =>
    loadQuestions().catch((e) => appendLog(String(e.message || e))),
  );
  root.querySelector("#mosSaveRun").addEventListener("click", () =>
    saveAndRun().catch((e) => appendLog(String(e.message || e))),
  );
  root.querySelector("#mosApprove").addEventListener("click", () => approve());

  ctx.cleanups.push(options.api.onStreamEvent(onStreamEvent));
  ctx.cleanups.push(options.api.onAgentLog(({ line }) => appendLog(line)));

  try {
    const desk = await options.api.getState();
    if (desk.currentProjectId) {
      local.projectId = desk.currentProjectId;
      root.querySelector("#mosProjectId").value = desk.currentProjectId;
    }
    appendLog(`Workspace ${options.manifest.id} @ ${options.manifest.version}`);
    appendLog(`Default serve ${desk.baseUrl}`);
  } catch {
    /* ignore */
  }

  return unmount;
}

export function unmount() {
  if (!ctx) return;
  for (const fn of ctx.cleanups) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
  ctx.root.innerHTML = "";
  ctx = null;
}
