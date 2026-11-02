import { defineAgent } from "@grok/agent-sdk";

export default defineAgent({
  description:
    "Packaging Owner: produce 06-release-checklist.md (build/sign/channel checklist + local/CI script notes). Never put secrets, keystore passwords, or API keys in model context — reference env/secret-store names only. No store upload APIs or Electron.",
});
