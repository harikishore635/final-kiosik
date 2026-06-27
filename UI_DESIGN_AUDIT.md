# UI/Design Consistency Audit — kiosk-hackathon-2026

Generated 2026-06-27. Root cause across most categories: `src/design/tokens.css` / `primitives.css` define one sizing/color system, but React components (`Button.jsx`, `Card.jsx`, `Input.jsx`, `Select.jsx`) independently reimplement the same concepts in raw Tailwind at a different scale.

**Update 2026-06-27 — remediation pass applied.** Each section below is tagged  Fixed / ◐ Partial /  Deferred. See the resolution log at the end.

## 1. Hardcoded Text / Missing i18n (High) —  Fixed

- `alert()` calls bypassed i18n entirely — **now routed through the in-app `Modal`** with `t()` keys:
  - `src/pages/Complaints.jsx` — photo limit, geolocation failure, geolocation unsupported → `complaints.maxPhotos` / `complaints.locationFailed` / `complaints.geoUnsupported`, rendered via a `<Modal type="warning">`.
  - `src/pages/ConsumerProfile.jsx` — OTP-required notice → `profile.verifyOtpFirst`, rendered via `<Modal>`.
- `src/pages/admin/AdminLogin.jsx` — **was entirely hardcoded English; now uses `useTranslation` + `admin.*` keys** (title, header hint, identifier/password labels, MFA buttons, dev-code label, back links, error fallbacks).
- aria-label wording for the "close" action is **now standardized via i18n keys** (`app.close` for generic close buttons; descriptive keys where context matters):
  - `app.close` — `VK.jsx`, `AIChatbot.jsx`, `Modal.jsx`
  - `filePreview.close` — `FilePreviewModal.jsx`
  - `ai.closeAssistant` / `ai.dismissMicWarning` — `AIOverlay.jsx` (close button is at **L195**, not L89 as first reported; L89 is the mic-warning dismiss)
  - `aadhaar.closeScanner` — `AadhaarCameraScanner.jsx`
- Keypad aria-labels (`src/components/kiosk/Keypad.jsx`) — **now `app.delete` / `app.submit` / `keypad.digit`** (interpolated).
- All new keys were added to **all 23 locale files** with native-script translations.

## 2. Dropdowns —  No change needed

- Only real custom select is `src/components/Select.jsx` (`border-2 border-gray-300`, lucide `ChevronDown`). Scale was aligned to `.field` (see §4).
- `src/components/kiosk/DD.jsx` is not actually a dropdown — it's a department dot/badge. Naming collision only; not a true duplicate. Left as-is.

## 3. Modals / Popups — no shared base component —  Deferred

| File | Backdrop | Width | Radius | Close button |
|---|---|---|---|---|
| `Modal.jsx` | `bg-black bg-opacity-50` | `max-w-lg w-full` | `rounded-kiosk-lg` | `p-2 rounded-full` |
| `FilePreviewModal.jsx` | `bg-black/70` | `max-w-5xl max-h-[92vh]` | **`rounded-2xl`** (first reported as `rounded-kiosk`) | `w-9 h-9 rounded-full` |
| `ai/AIOverlay.jsx` | `bg-black/40 backdrop-blur-sm` | fixed `w-[900px]` | `sm:rounded-3xl rounded-t-3xl` | `p-1.5 rounded-lg` |

Extracting a shared `BaseModal` (backdrop/radius/close-button/animation) is **deferred** — higher risk, touches several flows. Close-button aria-labels were standardized (§1).

## 4. Size / Spacing Inconsistencies (tokens defined but ignored) —  Fixed (component scale aligned)

The React components were brought up to the primitive kiosk scale (touch-target sizing) and a single radius system:

- **Buttons**: `Button.jsx` base radius → `calc(32px * var(--ui-scale))` (matches `.btn`); size scale bumped — `large` = `min-h 120px*scale` + `text-kiosk-3xl`, `xlarge` = `min-h 160px*scale` + `text-kiosk-4xl` (matches `.btn` / `.btn-xl`). (Note: the size scale already used `--ui-scale`; it was the *magnitude* that diverged, not the scaling.)
- **Form fields**: `Input.jsx` and `Select.jsx` → radius `calc(28px*var(--ui-scale))`, `text-kiosk-3xl`, `min-h calc(120px*var(--ui-scale))` (matches `.field`). Select dropdown list + option rows scaled to match.
- **Cards**: `Card.jsx` → radius `calc(28px*var(--ui-scale))` (matches `--r-lg`/`.card`); padding scaled toward `.card` (64px*scale at the default size); min-heights now scale with `--ui-scale`.
- **Border radius** is now expressed one way in the shared components — `calc(_px * var(--ui-scale))` aligned to the primitives. (`AadhaarCameraScanner.jsx` inline px radii are intentionally left: it is a fixed-pixel, canvas-anchored overlay where scaling radii via `--ui-scale` would distort it.)

## 5. Icons —  Deferred

- All `viewBox="0 0 48 48"`. `strokeWidth` still varies per icon (1.2–2.5); fill/stroke still mixed. Standardizing the icon set is **deferred** (low severity, no behavioural impact).

## 6. Colors — `tokens.css` exists but bypassed —  Fixed

- A neutral **slate scale** + **accent/status** tokens were added to `src/design/tokens.css` (hex values preserved so appearance is unchanged).
- `src/components/AadhaarCameraScanner.jsx` — all raw hex replaced with `var(--slate-*)` / `var(--accent-*)` tokens.
- `src/components/ai/WaveformVisualizer.jsx` — colors moved to `--wave-*` tokens, resolved via `getComputedStyle` (kept as hex because the canvas appends an alpha suffix that only works with hex).
- `src/pages/OfficeLocator.jsx` — 36 inline hex occurrences replaced with tokens (only `#fff` left).
- `src/components/RealtimeNavigationMap.jsx` — map marker/route hex **left as-is** (map-semantic colours, not a token concern).
- Opacity: `rgba(255,255,255,…)` inside inline `style={{}}` is the correct tool there (Tailwind slash syntax does not apply to inline styles); left intentionally.

## 7. Duplicate Components — ◐ Partial

- **Spinners**: `src/components/LoadingSpinner.jsx` was orphaned-ish (1 use) and inconsistent. **Removed**; its single use in `PhoneOtpRequestCard.jsx` now uses `RadiantLoader` (sweep variant, `dark`). Barrel export dropped.
- **Keypads**: `Keypad.jsx` vs `NumericKeypad.jsx` — different look/API, used in different flows. Merge **deferred** (touches login/OTP flows).

## Summary

| Category | Status |
|---|---|
| Hardcoded text / missing i18n |  Fixed (incl. AdminLogin, alerts→Modal, aria-labels, 23 locales) |
| Dropdown naming/API confusion |  No change needed |
| Modal/popup inconsistency | ◐ Close labels fixed; BaseModal deferred |
| Size/spacing (tokens vs components) |  Fixed (Button/Card/Input/Select aligned) |
| Icon stroke-width/fill variance |  Deferred |
| Hardcoded hex colors |  Fixed (Aadhaar, Waveform, OfficeLocator; tokens added) |
| Duplicate components (spinner) |  Spinner removed;  keypad merge deferred |

## Resolution log (2026-06-27)

Files changed:
- `src/design/tokens.css` — added slate/accent/status/wave token groups.
- `src/components/Button.jsx`, `Card.jsx`, `Input.jsx`, `Select.jsx` — scale + radius aligned to primitives.
- `src/components/Modal.jsx`, `kiosk/VK.jsx`, `AIChatbot.jsx`, `FilePreviewModal.jsx`, `ai/AIOverlay.jsx`, `AadhaarCameraScanner.jsx`, `kiosk/Keypad.jsx` — i18n'd aria-labels (added `useTranslation` where missing).
- `src/components/ai/WaveformVisualizer.jsx`, `src/pages/OfficeLocator.jsx`, `src/components/AadhaarCameraScanner.jsx` — hex → tokens.
- `src/pages/admin/AdminLogin.jsx` — full i18n.
- `src/pages/Complaints.jsx`, `src/pages/ConsumerProfile.jsx` — `alert()` → `Modal`.
- `src/components/auth/PhoneOtpRequestCard.jsx` + `src/components/index.js` — `LoadingSpinner` → `RadiantLoader`; orphan deleted.
- `src/i18n/locales/*.json` (23 files) — new `admin.*`, `app.close/delete`, `complaints.*`, `profile.verifyOtpFirst`, `keypad.digit`, `aadhaar.*`, `ai.*`, `filePreview.*` keys.

Deferred (out of scope this pass): shared `BaseModal`, `Keypad`/`NumericKeypad` merge, icon `strokeWidth` standardization, `RealtimeNavigationMap` colours.
