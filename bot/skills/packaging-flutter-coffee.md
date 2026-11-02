---
description: Use for Packaging on Flutter + 咖啡点单 / coffee-ordering jobs — release checklist and local/CI script notes without store APIs, Electron, or secrets in model context.
---

# Skill: Packaging (Flutter + 咖啡点单)

Use with the Packaging Owner when `config.stack` is `flutter` (or Flutter is the delivery stack) and preferably when `design.industry` is `coffee-ordering`.

## Ownership

- Write **only** content destined for `06-release-checklist.md`.
- Secrets stay in env / CI / keychain — **never** paste values into this artifact or chat.

## Depth from config

| `packaging` | Include |
| --- | --- |
| `scripts+checklist` | Full checklist + named local/CI scripts |
| `docs-only` | Human checklist only (still no store APIs) |

## Flutter release spine (no store APIs)

1. **Version** — bump `pubspec.yaml` `version:` (`x.y.z+build`); record in checklist.
2. **QA gate** — confirm coffee smoke/core cases from `05-test-plan.md` pass on the release candidate.
3. **Android** (if platform includes android) — `flutter build appbundle` / `apk`; signing via `$ANDROID_KEYSTORE_PATH`, `$ANDROID_KEY_ALIAS`, passwords from CI secrets — names only.
4. **iOS** (if platform includes ios) — `flutter build ipa` (or archive); signing via Xcode/CI profiles referenced by path/env — never embed profiles.
5. **Artifact handoff** — where humans pick up AAB/IPA; checksum note optional.
6. **G4 human gate** — version string + certificate/signing process confirmed; no automated upload.

## Coffee release smoke (map to QA ids)

Before marking release-ready, require (when testing depth ≥ smoke+core):

- Menu browse + sold-out badge visible
- Customize → cart → checkout → `placed` status
- Store-closed / cancel-window edge if listed in `05`

## Explicit non-goals

- No App Store Connect / Google Play Developer API / Fastlane `upload_*` automation.
- No Electron desktop packaging (Phase 5).
- No third-party crash/analytics SDKs unless allowlisted.
