# SUVIDHA Kiosk — Codebase Evaluation Report
**Date:** 2026-05-21 | **Evaluator:** Claude Sonnet 4.6

---

## Overall Score: **73 / 100** —  Good (Partial → Good)

Strong AI/voice/accessibility stack. Critical routing bugs break 3 major flows in demo. Fix those first.

---

## Module Scores

| # | Module | Score | Status |
|---|--------|-------|--------|
| 1 | Home / Language & Org Selection | 85 |  Good |
| 2 | Electricity: Login & Auth | 72 |  Good |
| 3 | Electricity: New Connection & Load Extension | 58 |  Partial |
| 4 | Electricity: Meter Replacement & Shifting | 55 |  Partial |
| 5 | Electricity: Complaint Registration | 82 |  Good |
| 6 | Electricity: Credential Management | **0 (BROKEN ROUTE)** |  |
| 7 | Electricity: Track Requests | 74 |  Good |
| 8 | Electricity: Receipt Generation | 72 |  Good |
| 9 | Gas: Login & Auth | 50 |  Partial |
| 10 | Gas: Main Menu & Navigation | 95 |  Excellent |
| 11 | Gas: New Connection / Change Request | 60 |  Partial |
| 12 | Gas: Register Complaint | **0 (BROKEN ROUTE)** |  |
| 13 | Gas: Track Complaint/Request | 80 |  Good |
| 14 | Gas: Edit Credentials | **0 (BROKEN ROUTE)** |  |
| 15 | Gas: Receipt Generation | 72 |  Good |
| 16 | Municipality: Login & Auth | 62 |  Partial |
| 17 | Municipality: New Water Connection | 62 |  Partial |
| 18 | Municipality: Register Grievances | 90 |  Excellent |
| 19 | Municipality: Track Request/Complaint | 74 |  Good |
| 20 | Municipality: Receipt Generation | 72 |  Good |
| 21 | Municipality: Credential Management | **0 (BROKEN ROUTE)** |  |
| 22 | Cross-Cutting & Non-Functional | 80 |  Good |

---

##  CRITICAL BUGS — Fix Before Demo

### BUG 1: `/consumer-profile` route does not exist (breaks ALL departments)
**Files:** `ElectricityMenu.jsx:48`, `GasMenu.jsx:66`, `MunicipalMenu.jsx:66`, `Municipal.jsx:94`, etc.
**Problem:** Every "Update Profile / Credentials" button navigates to `/consumer-profile?org=X`.
App.jsx only has `/electricity/consumer` — no `/consumer-profile` route at all.
Clicking profile from any menu → caught by `*` → redirects to `/` → session appears broken.

**Fix:** Add route in `App.jsx`:
```jsx
<Route path="/consumer-profile" element={<ConsumerProfile />} />
```

### BUG 2: Gas Complaint route mismatch
**File:** `GasMenu.jsx:45`
**Problem:** `path: '/gas-complaint'` but App.jsx has `<Route path="/gas/complaint" ...>`
Gas "Register Complaint" button → 404 redirect to `/`.

**Fix (choose one):**
```jsx
// Option A — fix GasMenu.jsx:45
path: '/gas/complaint',

// Option B — add alias in App.jsx
<Route path="/gas-complaint" element={<GasComplaint />} />
```

### BUG 3: Property Tax route mismatch
**File:** `MunicipalMenu.jsx:36`
**Problem:** `path: '/property-tax'` but App.jsx has `<Route path="/municipal/property-tax" ...>`

**Fix in `MunicipalMenu.jsx:36`:**
```jsx
path: '/municipal/property-tax',
```

### BUG 4: Landing page buttons non-functional
**File:** `Landing.jsx:218-224`
**Problem:** "A+ Larger" and first "Voice mode" buttons have no `onClick` handlers.
These are visible to judges on the entry screen.

**Fix:** Wire them to `AccessibilityProvider` methods:
```jsx
// "A+ Larger" button
onClick={() => setFontSize(fontSize === 'normal' ? 'large' : 'normal')}

// "Voice mode" button (first one)
onClick={() => setUserMode(userMode === 'blind' ? 'normal' : 'blind')}
```

### BUG 5: Download button no-op on TrackStatus
**File:** `TrackStatus.jsx:213`
**Problem:** Download `<button>` has no `onClick`. Judge presses it — nothing happens.

**Fix:**
```jsx
<button onClick={() => window.print()} className="p-2 bg-white/10 rounded-full hover:bg-white/20">
  <Download className="w-5 h-5" />
</button>
```

### BUG 6: Receipt Download calls Print (misleading)
**File:** `Receipt.jsx:338`
**Problem:** "Download" button calls `handlePrint` (= `window.print()`). Not a download. Confusing UX.

**Fix (quick):** Rename button label to "Print / Save as PDF" to match actual behavior. Or implement `html2canvas` + `jsPDF` for real PDF download.

### BUG 7: ConsumerProfile audit API endpoint wrong
**File:** `ConsumerProfile.jsx:57`
**Problem:** Fetches `/api/admin/audit-trail/${uid}` — this is an admin route, not citizen route. Will get 401/403 in production.

**Fix:** Use citizen-facing endpoint `/api/citizen/audit-trail/${uid}` or remove the fetch and use the mock fallback permanently for demo.

---

##  Missing Features — Add to Max Out Score

### HIGH IMPACT (do these)

**1. Gas auth — CA Number / Legacy Number login**
Module 9 scores 50 because auth only does Aadhaar + OTP.
SRS requires CA Number or Legacy Number as auth identifier.
- Add a second input option on Login page for gas department: "Login with CA Number"
- Even a UI-only flow with mock data is enough to score +15

**2. Gas complaint — no category selection**
Electricity complaint has 5 categories with SLA labels (excellent UX).
Gas complaint has none — just a free-form form.
- Add category chips: Billing Issue, Gas Leak, Meter Damage, Disconnection, Other
- Copy pattern from `ElectricityComplaint.jsx` step 1

**3. Municipality: Consumer ID / Aadhaar auth**
Module 16 — Municipal auth. SRS wants Consumer ID + Mobile OTP + Aadhaar options.
Currently same as electricity (Aadhaar only). Add Consumer ID tab on login.

**4. New Water Connection — missing detail fields**
`Municipal.jsx?category=waterConnection` exists but form has generic fields.
Add: connection type (domestic/commercial), premises type, plot area.
These fields show domain depth to judges.

**5. Gas New Connection — missing sub-types**
SRS requires: Reconnect/Disconnect, Postpaid→Prepaid conversion, Pipeline inspection.
Check `serviceCategories.gas` in `constants.js` — if these sub-types are missing, add them as radio/chips in step 1.

### MEDIUM IMPACT

**6. WhatsApp notification (Gas module SRS req)**
Gas complaint SRS mentions SMS/Email/WhatsApp.
Currently email/SMS are UI-only (no backend send).
Add a WhatsApp chip alongside Email/SMS in receipt buttons. Visual only is fine for demo.

**7. SLA escalation indicator**
Receipt and tracking show SLA countdown but no escalation path.
Add: "Escalate to Senior Officer" button that appears when SLA is breached (slaCountdown.overdue === true).
Pure UI — no backend needed.

**8. Municipality: lifecycle status labels**
TrackStatus shows timeline but check that `statusConfig` in `constants.js` includes all 5 lifecycle states:
`submitted → in_progress → resolved → escalated → closed`
If `escalated` is missing, add it.

**9. Gas Legacy Number field**
Even if full Gas auth isn't built, add "Legacy Number" as an optional input alongside CA Number in Gas login page.

**10. Voice input in Municipal Grievance**
`GasComplaint.jsx` and `ElectricityComplaint.jsx` both have voice input.
`MunicipalGrievance.jsx` does NOT have voice input — it's missing the Mic button.
Copy the voice input pattern from ElectricityComplaint into MunicipalGrievance description field.
This is a copy-paste job — 15 minutes of work, +10 judge impression points.

---

## Strengths

-  **AI Chatbot** is excellent — multilingual suggestions by context, voice STT, Sarvam API + NVIDIA NIM fallback
-  **Vertical kiosk layout** is purpose-built (1080×1920, VK component, large touch targets, `touch-manipulation`)
-  **24-language support** on landing — Assamese locale confirmed with 278 lines of translations
-  **Accessibility stack** is solid — blind/elderly modes, ScreenReaderOverlay, reduced-motion detection
-  **Municipal grievance** covers all 8 SRS categories exactly
-  **Track status** — 3 search types (Request ID, Ticket ID, Mobile), SLA countdown, officer details
-  **Admin dashboard** — 7 admin pages (Super, KioskOps, Department, Officer, Security, Audit)
-  **Security utilities** — XSS sanitization, CSRF in security.js
-  **Receipt** — thermal mode, print/email/SMS buttons, multi-receipt navigation

---

## Fix Priority Order (for demo day)

| Priority | Fix | Time | Impact |
|----------|-----|------|--------|
|  P0 | Add `/consumer-profile` route in App.jsx | 2 min | Unbreaks 4 modules |
|  P0 | Fix GasMenu `/gas-complaint` → `/gas/complaint` | 1 min | Unbreaks Gas Complaint |
|  P0 | Fix MunicipalMenu `/property-tax` → `/municipal/property-tax` | 1 min | Unbreaks Property Tax |
|  P0 | Wire Landing "A+ Larger" and "Voice mode" buttons | 10 min | Judges see landing first |
|  P1 | Add voice input to MunicipalGrievance | 15 min | Copy from ElectricityComplaint |
|  P1 | Add category chips to GasComplaint | 30 min | Parity with Electricity |
|  P1 | Fix Download button on TrackStatus | 5 min | Dead button is bad UX |
|  P2 | Add CA Number login option for Gas | 45 min | SRS Module 9 requirement |
|  P2 | Add WhatsApp button in Receipt | 10 min | SRS Gas Module 12 |
|  P2 | Add escalation button when SLA breached | 20 min | Wow factor |

---

## Projected Score After P0 + P1 Fixes: **~84 / 100** 
