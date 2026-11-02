---
description: Use for QA on 咖啡点单 / coffee-ordering jobs — smoke and core path cases for menu, cart, checkout, and order status; defects return to Implement.
---

# Skill: QA for 咖啡点单

Use with the QA Owner when `design.industry` is `coffee-ordering`.

## Ownership

- Write **only** content destined for `05-test-plan.md`.
- Do **not** edit product code. Every defect lists `owner=implement`.

## Depth from config

| `testing` | Include |
| --- | --- |
| `smoke` | Launch + reach menu |
| `smoke+core` | Full happy path + sold-out / closed / cancel edges |
| `smoke+automation` | Above + minimal stack unit/widget tests (Flutter default) |

## Must-cover flows

1. Browse menu (categories, sold-out badge).
2. Customize with defaults; reject invalid modifier combos.
3. Cart qty and price snapshot.
4. Checkout pickup slot; block when store closed.
5. Place order → status `placed`; cancel inside window.

## Third-party

No device-farm / test-cloud SaaS unless `guard_third_party` allows it.
