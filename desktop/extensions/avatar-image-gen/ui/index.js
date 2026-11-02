/**
 * 个性头像 — local tool extension.
 * Calls main-process tools:run → avatar-gen (stub by default; live if API key set).
 */

let styleEl = null;

function ensureStyles() {
  if (document.getElementById("av-styles")) return;
  styleEl = document.createElement("link");
  styleEl.id = "av-styles";
  styleEl.rel = "stylesheet";
  styleEl.href = new URL("./styles.css", import.meta.url).href;
  document.head.appendChild(styleEl);
}

/**
 * @param {HTMLElement} root
 * @param {{ api: any, manifest: any }} options
 */
export async function mount(root, options) {
  ensureStyles();

  root.innerHTML = `
    <section class="panel">
      <div class="panel-head">
        <h1>个性头像</h1>
        <p>输入描述生成头像候选。默认 stub（可离线演示）；配置图像 API 密钥后走 live 生成。</p>
      </div>
      <div class="av-layout">
        <div class="av-controls">
          <label class="field av-prompt">
            <span>提示词</span>
            <textarea id="avPrompt" spellcheck="true" placeholder="例如：温暖的水彩风圆形头像，短发，微笑，柔和侧光"></textarea>
          </label>
          <div class="av-row">
            <label class="field">
              <span>比例 / 尺寸</span>
              <select id="avAspect"></select>
            </label>
            <label class="field">
              <span>数量</span>
              <input id="avCount" type="number" min="1" max="8" value="4" />
            </label>
            <button type="button" class="btn primary" id="avGenerate">生成</button>
          </div>
          <p class="av-status" id="avStatus">加载中…</p>
        </div>
        <div id="avGallery" class="av-gallery" aria-live="polite"></div>
      </div>
    </section>
  `;

  const promptEl = /** @type {HTMLTextAreaElement} */ (root.querySelector("#avPrompt"));
  const aspectEl = /** @type {HTMLSelectElement} */ (root.querySelector("#avAspect"));
  const countEl = /** @type {HTMLInputElement} */ (root.querySelector("#avCount"));
  const statusEl = root.querySelector("#avStatus");
  const galleryEl = root.querySelector("#avGallery");
  const generateBtn = /** @type {HTMLButtonElement} */ (root.querySelector("#avGenerate"));

  function setStatus(text, kind) {
    statusEl.textContent = text;
    statusEl.className = "av-status" + (kind ? ` ${kind}` : "");
  }

  function renderGallery(images) {
    galleryEl.innerHTML = "";
    if (!images?.length) {
      galleryEl.innerHTML = `<p class="av-empty">尚未生成。填写提示词后点「生成」。</p>`;
      return;
    }
    for (const img of images) {
      const fig = document.createElement("figure");
      fig.className = "av-card";
      const image = document.createElement("img");
      image.src = img.url;
      image.alt = `avatar ${img.id}`;
      image.loading = "lazy";
      const cap = document.createElement("figcaption");
      cap.innerHTML = `<span>${img.width}×${img.height}</span><span>${img.mode}</span>`;
      fig.appendChild(image);
      fig.appendChild(cap);
      galleryEl.appendChild(fig);
    }
  }

  renderGallery([]);

  try {
    const meta = await options.api.runTool("avatar-image-gen", { action: "status" });
    const aspects = meta?.aspects || [
      { id: "1:1", label: "1:1 方形" },
      { id: "3:4", label: "3:4 竖版头像" },
      { id: "4:3", label: "4:3 横版" },
      { id: "9:16", label: "9:16 手机竖屏" },
      { id: "16:9", label: "16:9 宽屏" },
    ];
    for (const a of aspects) {
      const opt = document.createElement("option");
      opt.value = a.id;
      opt.textContent = a.label || a.id;
      aspectEl.appendChild(opt);
    }
    if (meta?.defaultCount) countEl.value = String(meta.defaultCount);
    if (meta?.maxCount) countEl.max = String(meta.maxCount);
    if (meta?.hasKey) {
      setStatus(
        `Live 可用（${meta.source} · ${meta.model}）。未设密钥时自动 stub。`,
        "ok",
      );
    } else {
      setStatus(
        "Stub 模式（离线可用）。设置 APPMASTER_IMAGE_API_KEY 或 OPENAI_API_KEY 后重启桌面可走 live。",
        "warn",
      );
    }
  } catch (err) {
    setStatus(String(err?.message || err), "error");
  }

  generateBtn.addEventListener("click", async () => {
    const prompt = promptEl.value.trim();
    if (!prompt) {
      setStatus("请输入提示词", "error");
      return;
    }
    let count = Number(countEl.value);
    if (!Number.isFinite(count) || count < 1) count = 4;
    generateBtn.disabled = true;
    setStatus("生成中…");
    try {
      const result = await options.api.runTool("avatar-image-gen", {
        action: "generate",
        prompt,
        aspect: aspectEl.value || "1:1",
        count,
      });
      if (!result?.ok) {
        setStatus(result?.error || "生成失败", "error");
        renderGallery([]);
        return;
      }
      renderGallery(result.images || []);
      const warn = result.warning ? ` ${result.warning}` : "";
      const hint = result.hint ? ` ${result.hint}` : "";
      setStatus(
        `完成：${result.count || result.images?.length || 0} 张 · mode=${result.mode}${warn}${hint}`,
        result.mode === "api" ? "ok" : "warn",
      );
    } catch (err) {
      setStatus(String(err?.message || err), "error");
    } finally {
      generateBtn.disabled = false;
    }
  });

  return () => {
    root.innerHTML = "";
  };
}

export function unmount() {
  /* mount returns disposer */
}
