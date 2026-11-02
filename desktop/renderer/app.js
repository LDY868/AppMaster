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

const state = {
  questions: [],
  projectId: "coffee-demo",
  activeStage: null,
  pendingGate: null,
  connected: false,
};

const el = {
  projectId: document.getElementById("projectId"),
  brief: document.getElementById("brief"),
  questions: document.getElementById("questions"),
  stages: document.getElementById("stages"),
  artifacts: document.getElementById("artifacts"),
  preview: document.getElementById("preview"),
  gateBox: document.getElementById("gateBox"),
  gateId: document.getElementById("gateId"),
  gateSummary: document.getElementById("gateSummary"),
  connStatus: document.getElementById("connStatus"),
  connLabel: document.getElementById("connLabel"),
  keyStatus: document.getElementById("keyStatus"),
  apiKey: document.getElementById("apiKey"),
  log: document.getElementById("log"),
  btnLoad: document.getElementById("btnLoad"),
  btnSaveRun: document.getElementById("btnSaveRun"),
  btnApprove: document.getElementById("btnApprove"),
  btnSaveKey: document.getElementById("btnSaveKey"),
  btnClearKey: document.getElementById("btnClearKey"),
  btnConnect: document.getElementById("btnConnect"),
};

function appendLog(line) {
  const stamp = new Date().toLocaleTimeString();
  el.log.textContent += `[${stamp}] ${line}\n`;
  el.log.scrollTop = el.log.scrollHeight;
}

function setConn(stateName, label) {
  el.connStatus.dataset.state = stateName;
  el.connLabel.textContent = label;
}

function renderStages() {
  el.stages.innerHTML = "";
  const activeIdx = STAGE_ORDER.indexOf(state.activeStage);
  for (const [i, stage] of STAGE_ORDER.entries()) {
    const li = document.createElement("li");
    if (stage === state.activeStage) li.classList.add("active");
    else if (activeIdx >= 0 && i < activeIdx) li.classList.add("done");
    li.innerHTML = `<span class="mark"></span><span>${stage}</span><span>${i + 1}</span>`;
    el.stages.appendChild(li);
  }
}

function renderQuestions(questions) {
  state.questions = questions;
  el.questions.innerHTML = "";
  for (const q of questions) {
    const fs = document.createElement("fieldset");
    fs.className = "q";
    fs.dataset.qid = q.id;
    const legend = document.createElement("legend");
    legend.textContent = q.prompt;
    fs.appendChild(legend);
    const opts = document.createElement("div");
    opts.className = "opts";
    const multi = q.id === "thirdParty";
    for (const opt of q.options) {
      const label = document.createElement("label");
      label.className = "opt";
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
    el.questions.appendChild(fs);
  }
}

function collectAnswers() {
  const answers = { brief: el.brief.value.trim() || undefined };
  for (const q of state.questions) {
    const fs = el.questions.querySelector(`fieldset[data-qid="${q.id}"]`);
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
  state.pendingGate = gate;
  if (!gate || gate.status !== "pending") {
    el.gateBox.hidden = true;
    return;
  }
  el.gateBox.hidden = false;
  el.gateId.textContent = gate.gate || "";
  el.gateSummary.textContent = gate.summary || "确认后继续下一阶段。";
}

function renderArtifacts(artifacts) {
  el.artifacts.innerHTML = "";
  for (const a of artifacts || []) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = a.name;
    if (a.exists) btn.classList.add("exists");
    btn.addEventListener("click", async () => {
      for (const b of el.artifacts.querySelectorAll("button")) {
        b.classList.remove("selected");
      }
      btn.classList.add("selected");
      if (!a.exists) {
        el.preview.textContent = `${a.name} 尚未生成（Owner: ${a.owner}）`;
        return;
      }
      try {
        const res = await window.appmaster.readArtifact(state.projectId, a.name);
        // Tool HTTP wrappers may nest result under different shapes.
        const payload = res?.result ?? res?.output ?? res;
        if (payload?.ok === false) {
          el.preview.textContent = payload.message || payload.error || "无法读取";
        } else {
          el.preview.textContent = payload?.content ?? JSON.stringify(payload, null, 2);
        }
      } catch (err) {
        el.preview.textContent = String(err.message || err);
      }
    });
    el.artifacts.appendChild(btn);
  }
}

function unwrapTool(res) {
  return res?.result ?? res?.output ?? res?.data ?? res;
}

async function refreshKeyStatus() {
  const s = await window.appmaster.getApiKeyStatus();
  el.keyStatus.textContent = s.hasApiKey
    ? `API key: present (${s.source})`
    : "API key: missing — model turns need CURSOR_API_KEY or agent-sdk login";
}

async function connect() {
  setConn("busy", "Connecting…");
  try {
    const res = await window.appmaster.ensureAgent();
    state.connected = res.ok;
    setConn("ok", res.managed ? `Serve :${new URL(res.baseUrl).port} (managed)` : `Serve ${res.baseUrl}`);
    appendLog(`Connected to ${res.baseUrl}`);
  } catch (err) {
    state.connected = false;
    setConn("idle", "Agent offline");
    appendLog(`Connect failed: ${err.message || err}`);
    throw err;
  }
}

async function loadQuestions() {
  state.projectId = el.projectId.value.trim() || "coffee-demo";
  if (!state.connected) await connect();
  const raw = await window.appmaster.presentChoices(state.projectId);
  const data = unwrapTool(raw);
  renderQuestions(data.questions || []);
  appendLog(`Loaded ${data.questions?.length ?? 0} intake questions`);
}

async function saveAndRun() {
  state.projectId = el.projectId.value.trim() || "coffee-demo";
  if (!state.connected) await connect();
  if (!state.questions.length) await loadQuestions();
  const answers = collectAnswers();
  state.activeStage = "intake";
  renderStages();

  setConn("busy", "Starting session…");
  // Main process opens the session, then save_config (same session), then follow-up.
  const started = await window.appmaster.startRun({
    projectId: state.projectId,
    brief: answers.brief,
    answers,
  });
  appendLog(`session ${started.sessionId || "(started)"}`);
  setConn("ok", "Session running");
  await refreshProject();
}

async function refreshProject() {
  try {
    const raw = await window.appmaster.getProjectState(state.projectId);
    const snap = unwrapTool(raw);
    if (snap?.status?.stage) {
      state.activeStage = snap.status.stage;
      renderStages();
    }
    showGate(snap?.pendingGate);
    renderArtifacts(snap?.artifacts);
  } catch (err) {
    appendLog(`get_project_state: ${err.message || err}`);
  }
}

async function approve() {
  if (!state.pendingGate?.gate) return;
  el.btnApprove.disabled = true;
  try {
    const res = unwrapTool(
      await window.appmaster.approveGate({
        projectId: state.projectId,
        gate: state.pendingGate.gate,
      }),
    );
    appendLog(`approve_gate ${state.pendingGate.gate} → ${res?.status || "done"}`);
    showGate(null);
    await refreshProject();
  } catch (err) {
    appendLog(`approve failed: ${err.message || err}`);
  } finally {
    el.btnApprove.disabled = false;
  }
}

function onStreamEvent(event) {
  const type = event?.type || event?.kind || "event";
  // Surface tool activity for stage / gate awareness without dumping secrets.
  if (type.includes("tool") || event?.toolName || event?.name) {
    const name = event.toolName || event.name || event.tool || "";
    appendLog(`tool ${name || type}`);
    if (name === "route_stage" || name === "request_approval" || name === "write_artifact") {
      void refreshProject();
    }
  }
  if (event?.toolName === "request_approval" || event?.name === "request_approval") {
    void refreshProject();
  }
  if (type === "turn.completed" || type === "turn_completed") {
    void refreshProject();
    setConn("ok", "Turn complete");
  }
}

function wire() {
  if (!window.appmaster) {
    appendLog("Preload bridge missing — restart Electron (preload.cjs required).");
    setConn("idle", "Bridge missing");
    return;
  }
  renderStages();
  el.btnConnect.addEventListener("click", () => connect().catch(() => {}));
  el.btnLoad.addEventListener("click", () => loadQuestions().catch((e) => appendLog(String(e.message || e))));
  el.btnSaveRun.addEventListener("click", () => saveAndRun().catch((e) => appendLog(String(e.message || e))));
  el.btnApprove.addEventListener("click", () => approve());
  el.btnSaveKey.addEventListener("click", async () => {
    try {
      await window.appmaster.setApiKey(el.apiKey.value);
      el.apiKey.value = "";
      appendLog("API key stored via OS secure storage (not logged)");
      await refreshKeyStatus();
    } catch (err) {
      appendLog(`setApiKey: ${err.message || err}`);
    }
  });
  el.btnClearKey.addEventListener("click", async () => {
    await window.appmaster.clearApiKey();
    appendLog("Cleared persisted API key");
    await refreshKeyStatus();
  });
  window.appmaster.onStreamEvent(onStreamEvent);
  window.appmaster.onAgentLog(({ line }) => appendLog(line));
}

wire();
if (window.appmaster) {
  refreshKeyStatus().catch(() => {});
  window.appmaster.getState().then((s) => {
    appendLog(`Agent root ${s.agentRoot}`);
    appendLog(`Default serve ${s.baseUrl}`);
  });
}
