# SUVIDHA 2026 - Hackathon PPT Summary

Folder reviewed: `kiosk-hackathon-2026-feature`  
Evaluation source: provided PDF text extracted in `../../removable/pdf_text.txt`

## 1. UI/UX

SUVIDHA 2026 is a vertical touch-kiosk public service application designed for a 55-inch display. The interface uses large touch targets, kiosk-scale typography, simple service tiles, high contrast modes, and minimal typing through OTP keypad, QR upload, voice navigation, and guided forms.

Key UI/UX points for slides:

- Multilingual landing screen with English, Hindi, Assamese, Tamil, and wider Indian language support.
- Assamese is promoted in the primary language row through `POPULAR_LANGS`.
- Citizen can enter as guest or Aadhaar-verified user.
- Department/service tiles are clearly separated for Electricity, Gas, Municipal, Water, Sanitation, Transport, Healthcare, Complaints, Schemes, Track Status, Office Locator, and Family Profile.
- Accessibility modes for normal, elderly, and blind users.
- Screen reader overlay, high-contrast mode, font scaling, reduced-motion support, and voice-first navigation.
- Track Status screen now supports Request ID, Ticket ID, and Mobile Number tabs, matching the PDF requirement.
- Receipts include print/download actions, thermal print mode, and send-to-phone workflow.
- Emergency access layer stays available without login.

Recommended live UI demo:

1. Start at landing page and switch language to Assamese.
2. Login with a demo Aadhaar profile for elderly or visually impaired mode.
3. Open Track Status and search with `TKT-2026-001`.
4. Show SLA countdown, officer assignment, status timeline, print/download controls.
5. Trigger the voice feature and demonstrate barge-in: while TTS is speaking, speak a command and show TTS stopping immediately.

## 2. Architecture

The project uses a React + Vite frontend, Express backend, SQLite database, service worker, and offline-first browser storage. It is structured around an application shell with route protection, global kiosk overlays, and department-specific service flows.

Architecture highlights:

- Frontend: React 18, React Router, Tailwind CSS, i18next, Lucide icons.
- Backend: Express routes for auth, services, complaints, tracking, schemes, offices, alerts, notifications, uploads, admin, sync, and Sarvam AI proxy.
- Data: SQLite seed data for Aadhaar citizens, service requests, complaints, offices, schemes, OTPs, admin users, and timeline events.
- Offline: service worker caching plus IndexedDB queue for offline form submissions.
- Voice/AI: Sarvam/Web Speech integration for STT, TTS, translation, wake word, and barge-in.
- Route guards: public, protected citizen, and admin-only routes.
- Public kiosk safety: inactivity timeout, session cleanup, emergency overlay, and no-login emergency access.

Suggested architecture slide flow:

```text
55-inch Kiosk UI
  -> React App Shell
  -> Route Guards + Accessibility Provider
  -> Department Modules / Track / Receipt / Admin
  -> API Service Layer
  -> Express Backend
  -> SQLite + Upload Store + Offline Sync
  -> Sarvam AI / Web Speech / Service Worker
```

## 3. Feature List

Features implemented or represented in the folder:

- Language selection and session persistence.
- Aadhaar login with OTP, QR, and biometric-style verification paths.
- Guest mode and citizen mode.
- Auto accessibility detection from Aadhaar profile.
- Electricity service request flow.
- Gas service request flow.
- Municipal and water-related service flows.
- General complaint registration with category, description, photo/document support, and location support.
- Track request/complaint by Request ID, Ticket ID, or Mobile Number.
- SLA visibility with countdown and breached-state messaging.
- Assigned officer and department display in tracking details.
- Receipt generation with print/download/send-to-phone and thermal print mode.
- Office locator with service/location filtering.
- Scheme discovery with profile-aware eligibility matching.
- Family profile and dependent management.
- Emergency SOS and public alert banner.
- Admin dashboard and backend admin APIs.
- Offline queue and sync for unreliable connectivity.
- AI chatbot component and backend chat route.
- Voice navigation, wake word, TTS, STT, and barge-in interaction.

PDF requirement coverage:

- Home language selection: implemented, with Assamese visible in the primary row.
- Three organization selection: implemented as part of a broader service grid.
- Electricity module: partially implemented through generic electricity request, complaint, tracking, receipt, and auth flows.
- Gas module: partially implemented through generic gas request, complaint, tracking, receipt, and auth flows.
- Municipal module: partially implemented through municipal/water/grievance/receipt/tracking flows.
- Track using application/request ID, ticket ID, or mobile: implemented in UI and mock demo data.
- Accessibility for blind and elderly: implemented strongly.
- Admin dashboard: implemented.
- Secure data handling: implemented as demonstrable controls, not a certified compliance claim.

## 4. Security Features

Security features present in the repo:

- Aadhaar-based authentication demo flow.
- OTP verification path.
- JWT authentication on protected backend routes.
- Admin route protection with `requireAdmin`.
- Bcrypt-hashed admin password storage.
- Express rate limiting, including stricter auth rate limits.
- Helmet security headers and CSP configuration.
- Input sanitization helpers for XSS prevention.
- CSRF token generation helper.
- File upload validation for type, size, dangerous extension, and double extension checks.
- Session timeout with 30-second warning and automatic logout.
- Session-scoped sensitive data storage and cleanup.
- Route guards for guest, citizen, and admin access.
- Audit-style timeline events for status changes.
- STRIDE threat model documented in `docs/reports/THREAT_MODEL.md`.
- Compliance report documented in `docs/reports/COMPLIANCE_REPORT.txt`.

Slide positioning:

This should be presented as "security-by-design demo controls" rather than full government certification. The strongest points are kiosk session protection, upload validation, OTP/JWT auth, role-based admin access, and the documented threat model.

## 5. Extra Innovation Beyond Scope

Strongest innovation points:

- Aadhaar-driven accessibility auto-detection: the kiosk adapts to elderly, visually impaired, child, or normal user profiles immediately after login.
- Voice-first kiosk operation with wake word and page-level TTS.
- Barge-in interaction: user can interrupt TTS by speaking, making the system feel responsive and human-friendly.
- QR-based phone-to-kiosk document upload, solving a real public-kiosk limitation.
- Offline-first form queue with automatic sync for rural/low-connectivity deployment.
- Emergency layer available before login.
- Scheme discovery using citizen/family profile data.
- Family/dependent profile for welfare eligibility.
- SLA countdown and officer assignment for grievance transparency.
- Thermal receipt mode and send-to-phone option.

Best live novelty demo:

1. Open the app in blind/voice mode.
2. Let the kiosk start speaking page guidance.
3. Speak a command while TTS is still playing.
4. Show that the speech stops and the command is handled.

This is the clearest "judge reaction" moment because it demonstrates accessibility, AI/voice, and kiosk usability in one short action.

