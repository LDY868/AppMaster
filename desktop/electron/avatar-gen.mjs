/**
 * Avatar / image generation for the avatar-image-gen tool extension.
 *
 * Default: stub SVG data-URLs (offline demo, no SaaS).
 * Live: OpenAI-compatible Images API when APPMASTER_IMAGE_API_KEY or
 * OPENAI_API_KEY is set (see desktop/extensions/avatar-image-gen/README.md).
 */

/** @typedef {{ id: string, label: string, width: number, height: number, openaiSize: string }} AspectPreset */

/** @type {AspectPreset[]} */
export const ASPECT_PRESETS = [
  { id: "1:1", label: "1:1 方形", width: 1024, height: 1024, openaiSize: "1024x1024" },
  { id: "3:4", label: "3:4 竖版头像", width: 768, height: 1024, openaiSize: "1024x1792" },
  { id: "4:3", label: "4:3 横版", width: 1024, height: 768, openaiSize: "1792x1024" },
  { id: "9:16", label: "9:16 手机竖屏", width: 576, height: 1024, openaiSize: "1024x1792" },
  { id: "16:9", label: "16:9 宽屏", width: 1024, height: 576, openaiSize: "1792x1024" },
];

const DEFAULT_COUNT = 4;
const MAX_COUNT = 8;

/**
 * Resolve image API credential from env only (never logged in full).
 * @returns {{ key: string | null, source: string, baseUrl: string, model: string }}
 */
export function resolveImageApiConfig() {
  const key =
    process.env.APPMASTER_IMAGE_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    null;
  let source = "none";
  if (process.env.APPMASTER_IMAGE_API_KEY?.trim()) source = "APPMASTER_IMAGE_API_KEY";
  else if (process.env.OPENAI_API_KEY?.trim()) source = "OPENAI_API_KEY";

  const baseUrl = (
    process.env.APPMASTER_IMAGE_API_BASE ||
    "https://api.openai.com/v1"
  ).replace(/\/$/, "");
  const model = process.env.APPMASTER_IMAGE_MODEL || "dall-e-3";

  return { key, source, baseUrl, model };
}

/**
 * @param {unknown} input
 */
function normalizeInput(input) {
  const raw = input && typeof input === "object" ? input : {};
  const prompt = String(/** @type {any} */ (raw).prompt || "").trim();
  const aspectId = String(/** @type {any} */ (raw).aspect || "1:1");
  const preset =
    ASPECT_PRESETS.find((p) => p.id === aspectId) || ASPECT_PRESETS[0];
  let count = Number(/** @type {any} */ (raw).count);
  if (!Number.isFinite(count) || count < 1) count = DEFAULT_COUNT;
  count = Math.min(MAX_COUNT, Math.floor(count));
  const forceStub = Boolean(/** @type {any} */ (raw).forceStub);
  return { prompt, preset, count, forceStub };
}

/**
 * Deterministic pastel from prompt + index.
 * @param {string} prompt
 * @param {number} index
 */
function palette(prompt, index) {
  let h = 0;
  const s = `${prompt}#${index}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  const hue2 = (hue + 42 + index * 17) % 360;
  return {
    a: `hsl(${hue} 42% 28%)`,
    b: `hsl(${hue2} 38% 18%)`,
    accent: `hsl(${(hue + 180) % 360} 55% 62%)`,
  };
}

/**
 * @param {string} prompt
 * @param {AspectPreset} preset
 * @param {number} index
 * @param {number} total
 */
function stubSvgDataUrl(prompt, preset, index, total) {
  const { a, b, accent } = palette(prompt, index);
  const safe = prompt
    .slice(0, 48)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const lines = [
    safe || "个性头像 stub",
    `${preset.id} · ${index + 1}/${total}`,
    "stub · set APPMASTER_IMAGE_API_KEY for live",
  ];
  const text = lines
    .map(
      (line, i) =>
        `<text x="50%" y="${48 + i * 7}%" text-anchor="middle" fill="rgba(231,240,230,0.92)" font-family="Georgia, serif" font-size="${i === 0 ? 42 : 22}">${line}</text>`,
    )
    .join("");
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${preset.width}" height="${preset.height}" viewBox="0 0 ${preset.width} ${preset.height}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${a}"/>
      <stop offset="100%" stop-color="${b}"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <circle cx="50%" cy="38%" r="18%" fill="${accent}" opacity="0.85"/>
  <circle cx="50%" cy="38%" r="12%" fill="rgba(12,18,16,0.35)"/>
  ${text}
</svg>`;
  const b64 = Buffer.from(svg, "utf8").toString("base64");
  return `data:image/svg+xml;base64,${b64}`;
}

/**
 * @param {{ prompt: string, preset: AspectPreset, count: number }} opts
 * @param {{ key: string, baseUrl: string, model: string }} cfg
 */
async function generateViaApi(opts, cfg) {
  const { prompt, preset, count } = opts;
  /** @type {Array<{ id: string, url: string, mime: string, width: number, height: number, mode: string }>} */
  const images = [];

  // dall-e-3 typically returns 1 image per request; loop for count.
  for (let i = 0; i < count; i++) {
    const body = {
      model: cfg.model,
      prompt: `Personal avatar / 个性头像. ${prompt}`,
      n: 1,
      size: preset.openaiSize,
      response_format: "b64_json",
    };
    const res = await fetch(`${cfg.baseUrl}/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Image API HTTP ${res.status}: ${text.slice(0, 240) || res.statusText}`,
      );
    }
    const json = await res.json();
    const item = json?.data?.[0];
    if (!item) throw new Error("Image API returned no data");
    let url;
    let mime = "image/png";
    if (item.b64_json) {
      url = `data:image/png;base64,${item.b64_json}`;
    } else if (item.url) {
      url = String(item.url);
      mime = "image/png";
    } else {
      throw new Error("Image API item missing b64_json/url");
    }
    images.push({
      id: `api-${Date.now()}-${i}`,
      url,
      mime,
      width: preset.width,
      height: preset.height,
      mode: "api",
    });
  }
  return images;
}

/**
 * @param {{ prompt: string, preset: AspectPreset, count: number }} opts
 */
function generateStub(opts) {
  const { prompt, preset, count } = opts;
  return Array.from({ length: count }, (_, i) => ({
    id: `stub-${Date.now()}-${i}`,
    url: stubSvgDataUrl(prompt, preset, i, count),
    mime: "image/svg+xml",
    width: preset.width,
    height: preset.height,
    mode: "stub",
  }));
}

/**
 * Main entry used by tools:run and (mirrored) by the Agent SDK tool.
 * @param {unknown} input
 */
export async function generateAvatars(input) {
  const { prompt, preset, count, forceStub } = normalizeInput(input);
  if (!prompt) {
    return {
      ok: false,
      error: "prompt is required",
      images: [],
      mode: "none",
      hint: "请输入个性头像描述",
    };
  }

  const cfg = resolveImageApiConfig();
  const wantLive = !forceStub && Boolean(cfg.key);

  if (wantLive) {
    try {
      const images = await generateViaApi(
        { prompt, preset, count },
        /** @type {{ key: string, baseUrl: string, model: string }} */ ({
          key: cfg.key,
          baseUrl: cfg.baseUrl,
          model: cfg.model,
        }),
      );
      return {
        ok: true,
        images,
        mode: "api",
        aspect: preset.id,
        count: images.length,
        apiSource: cfg.source,
        model: cfg.model,
      };
    } catch (err) {
      // Fall back to stub so the UI still works when the key/API fails.
      const images = generateStub({ prompt, preset, count });
      return {
        ok: true,
        images,
        mode: "stub",
        aspect: preset.id,
        count: images.length,
        apiSource: cfg.source,
        warning: `Live API failed (${String(err?.message || err)}); showing stub images.`,
        hint: "Check APPMASTER_IMAGE_API_KEY / APPMASTER_IMAGE_API_BASE / model support.",
      };
    }
  }

  const images = generateStub({ prompt, preset, count });
  return {
    ok: true,
    images,
    mode: "stub",
    aspect: preset.id,
    count: images.length,
    apiSource: cfg.source,
    hint:
      cfg.source === "none"
        ? "Stub mode. Set APPMASTER_IMAGE_API_KEY (or OPENAI_API_KEY) for live generation."
        : undefined,
  };
}

/**
 * Status for the extension UI (no secrets returned).
 */
export function imageApiStatus() {
  const cfg = resolveImageApiConfig();
  return {
    hasKey: Boolean(cfg.key),
    source: cfg.source,
    baseUrl: cfg.baseUrl,
    model: cfg.model,
    defaultCount: DEFAULT_COUNT,
    maxCount: MAX_COUNT,
    aspects: ASPECT_PRESETS.map(({ id, label, width, height }) => ({
      id,
      label,
      width,
      height,
    })),
  };
}
