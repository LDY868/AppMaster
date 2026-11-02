/**
 * Shared avatar / image generation for the generate_avatar Agent tool.
 * Mirrors desktop/electron/avatar-gen.mjs (stub default; optional Images API).
 */

export type AspectPreset = {
  id: string;
  label: string;
  width: number;
  height: number;
  openaiSize: string;
};

export const ASPECT_PRESETS: AspectPreset[] = [
  { id: "1:1", label: "1:1 square", width: 1024, height: 1024, openaiSize: "1024x1024" },
  { id: "3:4", label: "3:4 portrait", width: 768, height: 1024, openaiSize: "1024x1792" },
  { id: "4:3", label: "4:3 landscape", width: 1024, height: 768, openaiSize: "1792x1024" },
  { id: "9:16", label: "9:16 phone", width: 576, height: 1024, openaiSize: "1024x1792" },
  { id: "16:9", label: "16:9 wide", width: 1024, height: 576, openaiSize: "1792x1024" },
];

export const DEFAULT_COUNT = 4;
export const MAX_COUNT = 8;

export type AvatarImage = {
  id: string;
  url: string;
  mime: string;
  width: number;
  height: number;
  mode: "stub" | "api";
};

export type GenerateResult = {
  ok: boolean;
  images: AvatarImage[];
  mode: "stub" | "api" | "none";
  aspect?: string;
  count?: number;
  apiSource?: string;
  model?: string;
  error?: string;
  warning?: string;
  hint?: string;
};

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

function palette(prompt: string, index: number) {
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

function stubSvgDataUrl(
  prompt: string,
  preset: AspectPreset,
  index: number,
  total: number,
) {
  const { a, b, accent } = palette(prompt, index);
  const safe = prompt
    .slice(0, 48)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const lines = [
    safe || "avatar stub",
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
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

function generateStub(
  prompt: string,
  preset: AspectPreset,
  count: number,
): AvatarImage[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `stub-${Date.now()}-${i}`,
    url: stubSvgDataUrl(prompt, preset, i, count),
    mime: "image/svg+xml",
    width: preset.width,
    height: preset.height,
    mode: "stub" as const,
  }));
}

async function generateViaApi(
  prompt: string,
  preset: AspectPreset,
  count: number,
  cfg: { key: string; baseUrl: string; model: string },
): Promise<AvatarImage[]> {
  const images: AvatarImage[] = [];
  for (let i = 0; i < count; i++) {
    const res = await fetch(`${cfg.baseUrl}/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: cfg.model,
        prompt: `Personal avatar / 个性头像. ${prompt}`,
        n: 1,
        size: preset.openaiSize,
        response_format: "b64_json",
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Image API HTTP ${res.status}: ${text.slice(0, 240) || res.statusText}`,
      );
    }
    const json = (await res.json()) as {
      data?: Array<{ b64_json?: string; url?: string }>;
    };
    const item = json?.data?.[0];
    if (!item) throw new Error("Image API returned no data");
    const url = item.b64_json
      ? `data:image/png;base64,${item.b64_json}`
      : String(item.url || "");
    if (!url) throw new Error("Image API item missing b64_json/url");
    images.push({
      id: `api-${Date.now()}-${i}`,
      url,
      mime: "image/png",
      width: preset.width,
      height: preset.height,
      mode: "api",
    });
  }
  return images;
}

export async function generateAvatars(input: {
  prompt: string;
  aspect?: string;
  count?: number;
  forceStub?: boolean;
}): Promise<GenerateResult> {
  const prompt = String(input.prompt || "").trim();
  if (!prompt) {
    return {
      ok: false,
      error: "prompt is required",
      images: [],
      mode: "none",
      hint: "Provide a short avatar description.",
    };
  }

  const preset =
    ASPECT_PRESETS.find((p) => p.id === (input.aspect || "1:1")) ||
    ASPECT_PRESETS[0];
  let count = Number(input.count);
  if (!Number.isFinite(count) || count < 1) count = DEFAULT_COUNT;
  count = Math.min(MAX_COUNT, Math.floor(count));

  const cfg = resolveImageApiConfig();
  const wantLive = !input.forceStub && Boolean(cfg.key);

  if (wantLive && cfg.key) {
    try {
      const images = await generateViaApi(prompt, preset, count, {
        key: cfg.key,
        baseUrl: cfg.baseUrl,
        model: cfg.model,
      });
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
      const images = generateStub(prompt, preset, count);
      return {
        ok: true,
        images,
        mode: "stub",
        aspect: preset.id,
        count: images.length,
        apiSource: cfg.source,
        warning: `Live API failed (${err instanceof Error ? err.message : String(err)}); showing stub images.`,
        hint: "Check APPMASTER_IMAGE_API_KEY / APPMASTER_IMAGE_API_BASE / model support.",
      };
    }
  }

  const images = generateStub(prompt, preset, count);
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
