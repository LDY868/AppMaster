# 个性头像（avatar-image-gen）

Workbench **Tools** 扩展：按提示词生成个性头像候选图。

## 使用

1. `npm run desktop:start`
2. 侧栏 **小工具 Tools** → **个性头像**
3. 填写提示词，选比例，数量默认 **4**，点 **生成**
4. 结果出现在下方画廊

## 生成模式

| 模式 | 条件 | 行为 |
| --- | --- | --- |
| **stub**（默认） | 未配置图像 API 密钥 | 本地 SVG data-URL，可离线演示 |
| **api**（可选） | 设置了密钥 | 调用 OpenAI 兼容 Images API；失败则回退 stub |

### 环境变量（可选 live）

```bash
export APPMASTER_IMAGE_API_KEY=sk-…   # 优先
# 或
export OPENAI_API_KEY=sk-…

# 可选
export APPMASTER_IMAGE_API_BASE=https://api.openai.com/v1
export APPMASTER_IMAGE_MODEL=dall-e-3
```

设置后**重启** Electron 桌面进程。默认**不要求**任何第三方 SaaS。

## Agent 能力

同仓库 Agent SDK 工具：`generate_avatar`（`bot/tools/generate_avatar.ts`）。  
桌面 `tools:run` 与 Agent 工具共用同一套 stub / API 语义（实现分别在 `desktop/electron/avatar-gen.mjs` 与 `bot/lib/avatar_gen.ts`）。

## 清单

- `kind: tool`，`nav.group: tools`
- `permissions: []`（不经 Agent serve；主进程 `tools:run` 执行）
