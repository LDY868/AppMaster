/**
 * Stage → owner routing and artifact ownership for the mobile-outsource studio.
 * Orchestrator tools enforce this table; specialists own product files.
 */

export const STAGES = [
  "intake",
  "requirements",
  "ui-design",
  "api-design",
  "implement",
  "qa",
  "packaging",
  "docs",
] as const;

export type Stage = (typeof STAGES)[number];

/** Pipeline roles. Phase 2 wires requirements + ui-design + api-design + docs. */
export type Owner =
  | "orchestrator"
  | "requirements"
  | "ui-design"
  | "api-design"
  | "implement"
  | "qa"
  | "packaging"
  | "docs";

export const STAGE_OWNER: Record<Stage, Owner> = {
  intake: "orchestrator",
  requirements: "requirements",
  "ui-design": "ui-design",
  "api-design": "api-design",
  implement: "implement",
  qa: "qa",
  packaging: "packaging",
  docs: "docs",
};

/** Artifact basename → sole writer. Orchestrator may write config/status/intake only. */
export const ARTIFACT_OWNER: Record<string, Owner> = {
  "config.json": "orchestrator",
  "status.json": "orchestrator",
  "00-intake.md": "orchestrator",
  "01-requirements.md": "requirements",
  "02-ui-spec.md": "ui-design",
  "03-api-spec.md": "api-design",
  "04-architecture.md": "implement",
  "05-test-plan.md": "qa",
  "06-release-checklist.md": "packaging",
  "07-delivery-manual.md": "docs",
};

export type ThirdPartyMode = "none" | "allowlist";

export type ProjectConfig = {
  platform: "ios+android" | "ios" | "android";
  stack: "flutter" | "rn" | "native" | "defer";
  backend: "openapi+mock" | "none" | "runnable" | "customer-api";
  thirdParty: { mode: ThirdPartyMode; allow: string[] };
  design: {
    source: "industry-standard" | "customer-mockups" | "competitor-refs";
    industry: string;
  };
  testing: "smoke+core" | "smoke" | "smoke+automation";
  packaging: "scripts+checklist" | "docs-only";
  entry: "playground" | "slack" | "webhook";
  /** Free-text product brief from the user (not a stack decision). */
  brief?: string;
};

export const DEFAULT_CONFIG: ProjectConfig = {
  platform: "ios+android",
  stack: "flutter",
  backend: "openapi+mock",
  thirdParty: { mode: "none", allow: [] },
  design: { source: "industry-standard", industry: "coffee-ordering" },
  testing: "smoke+core",
  packaging: "scripts+checklist",
  entry: "playground",
};

export type ChoiceOption = {
  id: string;
  label: string;
  recommended?: boolean;
};

export type IntakeQuestion = {
  id: keyof ProjectConfig | "industry";
  prompt: string;
  options: ChoiceOption[];
};

/** Multiple-choice intake. Recommended options marked; answers drive config.json. */
export const INTAKE_QUESTIONS: IntakeQuestion[] = [
  {
    id: "platform",
    prompt: "目标平台 / Target platform",
    options: [
      { id: "ios+android", label: "双端 iOS + Android", recommended: true },
      { id: "ios", label: "仅 iOS" },
      { id: "android", label: "仅 Android" },
    ],
  },
  {
    id: "stack",
    prompt: "客户端技术栈 / Client stack",
    options: [
      { id: "flutter", label: "Flutter", recommended: true },
      { id: "rn", label: "React Native" },
      { id: "native", label: "原生双端" },
      { id: "defer", label: "由需求智能体建议后再选" },
    ],
  },
  {
    id: "backend",
    prompt: "后端范围 / Backend scope",
    options: [
      { id: "openapi+mock", label: "仅 OpenAPI + Mock", recommended: true },
      { id: "none", label: "不生成后端" },
      { id: "runnable", label: "生成可运行后端" },
      { id: "customer-api", label: "对接客户已有 API" },
    ],
  },
  {
    id: "thirdParty",
    prompt: "第三方服务 / Third-party services",
    options: [
      { id: "none", label: "全部不用", recommended: true },
      { id: "push", label: "允许推送" },
      { id: "maps", label: "允许地图" },
      { id: "auth-sdk", label: "允许登录 SDK" },
      { id: "custom", label: "自定义白名单（后续补充）" },
    ],
  },
  {
    id: "design",
    prompt: "设计来源 / Design source",
    options: [
      {
        id: "industry-standard",
        label: "按行业标准自研规范",
        recommended: true,
      },
      { id: "customer-mockups", label: "客户提供稿" },
      { id: "competitor-refs", label: "参考竞品截图" },
    ],
  },
  {
    id: "industry",
    prompt: "行业模板 / Industry template",
    options: [
      { id: "coffee-ordering", label: "咖啡点单", recommended: true },
      { id: "ecommerce", label: "电商" },
      { id: "booking", label: "预约到店" },
      { id: "community", label: "内容社区" },
      { id: "utility", label: "工具效率" },
      { id: "enterprise", label: "企业内部" },
      { id: "other", label: "其他" },
    ],
  },
  {
    id: "testing",
    prompt: "测试深度 / Testing depth",
    options: [
      { id: "smoke+core", label: "核心路径 + 冒烟", recommended: true },
      { id: "smoke", label: "仅冒烟" },
      { id: "smoke+automation", label: "含基础自动化" },
    ],
  },
  {
    id: "packaging",
    prompt: "打包目标 / Packaging target",
    options: [
      {
        id: "scripts+checklist",
        label: "说明 + 本地/CI 脚本",
        recommended: true,
      },
      { id: "docs-only", label: "仅说明文档" },
    ],
  },
  {
    id: "entry",
    prompt: "接单入口 / Intake channel",
    options: [
      { id: "playground", label: "Playground", recommended: true },
      { id: "slack", label: "Slack" },
      { id: "webhook", label: "表单 webhook" },
    ],
  },
];

export type GateId = "G0" | "G1" | "G2" | "G3" | "G4" | "G5";

export const GATE_AFTER_STAGE: Partial<Record<Stage, GateId>> = {
  intake: "G0",
  requirements: "G1",
  "ui-design": "G2",
  implement: "G3",
  packaging: "G4",
  docs: "G5",
};

export function sessionKey(sessionId: string, suffix: string): string {
  return `session:${sessionId}:${suffix}`;
}

export function projectArtifactPath(projectId: string, artifact: string): string {
  return `projects/${projectId}/${artifact}`;
}

export function isKnownArtifact(name: string): name is keyof typeof ARTIFACT_OWNER {
  return Object.prototype.hasOwnProperty.call(ARTIFACT_OWNER, name);
}

export function isThirdPartyAllowed(
  config: ProjectConfig | undefined,
  service: string,
): boolean {
  if (!config) return false;
  if (config.thirdParty.mode === "none") return false;
  const normalized = service.trim().toLowerCase();
  return config.thirdParty.allow.map((s) => s.toLowerCase()).includes(normalized);
}
