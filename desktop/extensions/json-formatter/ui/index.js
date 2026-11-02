/**
 * Sample local tool extension — proves Tools nav + mount lifecycle
 * without Agent SDK permissions.
 */

let styleEl = null;

function ensureStyles() {
  if (document.getElementById("jf-styles")) return;
  styleEl = document.createElement("link");
  styleEl.id = "jf-styles";
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
        <h1>JSON 格式化</h1>
        <p>纯本地小工具示例 — 不调用 Agent，用于验证扩展加载链路。</p>
      </div>
      <div class="jf-grid">
        <label class="field">
          <span>输入</span>
          <textarea id="jfIn" spellcheck="false" placeholder='{"a":1}'></textarea>
        </label>
        <label class="field">
          <span>输出</span>
          <textarea id="jfOut" spellcheck="false" readonly></textarea>
        </label>
      </div>
      <div class="actions">
        <button type="button" class="btn primary" id="jfPretty">美化</button>
        <button type="button" class="btn ghost" id="jfMinify">压缩</button>
        <button type="button" class="btn ghost" id="jfCopy">复制输出</button>
      </div>
      <p class="jf-msg" id="jfMsg"></p>
    </section>
  `;

  const input = root.querySelector("#jfIn");
  const output = root.querySelector("#jfOut");
  const msg = root.querySelector("#jfMsg");

  function parse() {
    const text = input.value.trim();
    if (!text) throw new Error("请输入 JSON");
    return JSON.parse(text);
  }

  function setMsg(text, kind) {
    msg.textContent = text;
    msg.className = "jf-msg" + (kind ? ` ${kind}` : "");
  }

  root.querySelector("#jfPretty").addEventListener("click", () => {
    try {
      output.value = JSON.stringify(parse(), null, 2);
      setMsg("已美化", "ok");
      void options.api.runTool?.("json-formatter", { action: "pretty" });
    } catch (err) {
      setMsg(String(err.message || err), "error");
    }
  });

  root.querySelector("#jfMinify").addEventListener("click", () => {
    try {
      output.value = JSON.stringify(parse());
      setMsg("已压缩", "ok");
      void options.api.runTool?.("json-formatter", { action: "minify" });
    } catch (err) {
      setMsg(String(err.message || err), "error");
    }
  });

  root.querySelector("#jfCopy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(output.value || "");
      setMsg("已复制到剪贴板", "ok");
    } catch {
      setMsg("复制失败（剪贴板不可用）", "error");
    }
  });

  return () => {
    root.innerHTML = "";
  };
}

export function unmount() {
  /* mount returns disposer */
}
