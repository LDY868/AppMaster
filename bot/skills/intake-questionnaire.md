---
description: Use when running or explaining the multiple-choice intake questionnaire before save_config.
---

# Intake questionnaire procedure

1. Call `present_choices` with a stable `projectId` slug.
2. Present every returned question. Keep the `(recommended)` labels.
3. Accept multi-select only where the tool options imply it (third-party allowlist). Otherwise one option per question.
4. Map answers into `save_config` fields. For third-party:
   - `none` → `{ mode: "none", allow: [] }`
   - any allow option → `{ mode: "allowlist", allow: [<chosen ids>] }`
5. Include the user's free-text product brief in `answers.brief`.
6. After save, write a short `00-intake.md` summarizing choices, then open gate G0.
