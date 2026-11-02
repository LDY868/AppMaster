---
description: Use when config.stack is flutter — Flutter module layout, OpenAPI/mock client, and milestone implementation without third-party SaaS or Electron.
---

# Skill: Flutter implementation

Apply when `config.stack` is `flutter`. If stack is anything else, do not use this skill.

## Rules

1. Read `config.json`, `02-ui-spec.md`, `03-api-spec.md`, and coffee (or industry) Implement milestones.
2. Default third-party policy is **deny** — call `guard_third_party` before any SaaS/SDK.
3. No Electron, desktop shells, or store upload automation.
4. Ship by **module milestones**, not a single whole-app dump.

## Suggested layout

```
lib/
  app/          # MaterialApp, router, theme from UI tokens
  ui/           # screens + widgets per UI inventory
  domain/       # entities matching API resources
  data/         # OpenAPI client + mock adapters
```

## Build / verify notes (document in `04-architecture.md`)

- `flutter pub get`
- `flutter analyze` / `flutter test` for the current milestone
- Point HTTP client at mock base URL when `backend` is `openapi+mock`

## Coffee spine mapping

Map UI screens to Flutter routes one milestone at a time: Menu → Customize → Cart → Checkout → Order status.
