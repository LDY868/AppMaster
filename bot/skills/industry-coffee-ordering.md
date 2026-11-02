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

## Docs focus (for Docs Owner)

- Operator steps: open store hours, mark sold-out, fulfill pickup.
- Customer steps: place and track an order.
- Build/run notes from config stack only — no extra SDKs.
