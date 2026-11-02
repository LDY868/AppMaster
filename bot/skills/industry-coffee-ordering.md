---
description: Use for 咖啡点单 / coffee-ordering industry jobs — menu, customize, cart, checkout, pickup status — when design.industry is coffee-ordering.
---

# Industry: 咖啡点单 (coffee ordering)

Built-in patterns. No Figma or external design tool required.

## Product spine

1. **Browse menu** — categories (coffee, tea, bakery), item cards, availability.
2. **Customize** — size, temperature, milk, sweetness, extras; clear defaults.
3. **Cart** — line items, quantities, estimated ready time.
4. **Checkout** — pickup location/time, payment method placeholder (respect backend config).
5. **Order status** — placed → preparing → ready → completed; cancel/modify rules.

## Platform notes

- iOS: HIG navigation, large titles optional, 44pt touch targets.
- Android: Material 3 cards, navigation bar or rail by width.
- Accessibility: contrast for labels on product imagery; dynamic type for prices and modifiers.

## Requirements focus (for Requirements Owner)

- Happy path: browse → customize → cart → pay → pickup status.
- Edge cases: sold-out SKU, modifier conflicts, store closed, order cancel window.
- Non-goals unless config says otherwise: delivery fleet, loyalty SaaS, third-party maps.

## UI focus (for UI Design Owner) — `02-ui-spec.md`

Apply HIG / Material 3; do **not** pull Figma or design SaaS unless allowlisted.

### Screen inventory (minimum)

| Screen | Purpose | Key states |
| --- | --- | --- |
| Store / home | Entry, hours, pickup location | closed store banner |
| Menu | Categories + item cards | empty category, sold-out badge |
| Item customize | Modifiers with defaults | invalid combo, unavailable option |
| Cart | Lines, qty, ETA | empty cart |
| Checkout | Pickup slot + payment placeholder | validation errors |
| Order status | Status timeline + cancel/modify | late-ready, cancelled |

### Interaction standards

- Primary CTA per screen (Add to cart / Place order); destructive actions (cancel) secondary + confirm.
- Sticky cart summary when browsing; clear price total always visible before pay.
- Modifier steppers and chips: min 44×44 pt (iOS) / 48×48 dp (Material).
- Loading: skeleton on menu; inline progress on place-order; pull-to-refresh on status.
- Errors: inline field errors at checkout; full-screen retry for menu fetch failure.
- Tokens: document color roles (brand, surface, on-surface, success for “ready”), type scale for price vs body, 8pt spacing grid.

### Navigation

- iOS: tab or root stack (Menu | Orders | Account) per HIG; large title on Menu optional.
- Android: Material 3 NavigationBar for primary destinations; top app bar with store name.

## API focus (for API Design Owner) — `03-api-spec.md`

Align resources with the screen inventory. Default backend posture: OpenAPI + Mock; no Firebase/BaaS unless allowlisted.

### Core resources

| Resource | Notes |
| --- | --- |
| `Store` | id, name, hours, timezone, open/closed |
| `Category` / `MenuItem` | availability, base price, modifier groups |
| `ModifierGroup` / `ModifierOption` | required/optional, defaults, conflicts |
| `Cart` / `CartLine` | quantities, selected modifiers, price snapshot |
| `Order` | status enum, pickup slot, line snapshot, cancel window |
| `PaymentMethod` | placeholder token only unless config allows a PSP |

### Suggested operations (OpenAPI when `backend` ≠ `none`)

- `GET /stores/{id}` — hours + status
- `GET /stores/{id}/menu` — categories, items, modifiers
- `POST /carts` / `PATCH /carts/{id}` — upsert lines; reject sold-out / conflicts
- `POST /orders` — checkout; returns status `placed`
- `GET /orders/{id}` — status polling for pickup UI
- `POST /orders/{id}/cancel` — within cancel window only

### Contracts

- Error model: `code`, `message`, `field?` (e.g. `MODIFIER_CONFLICT`, `STORE_CLOSED`, `SOLD_OUT`).
- Auth: anonymous device session or simple customer id by default — no third-party auth SDK.
- Mock: deterministic fixtures for menu + one in-progress order for status UI.

## Docs focus (for Docs Owner)

- Operator steps: open store hours, mark sold-out, fulfill pickup.
- Customer steps: place and track an order.
- Build/run notes from config stack only — no extra SDKs.
