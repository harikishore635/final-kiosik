# SUVIDHA Kiosk — Full File Architecture

Complete directory tree with what each file/folder does. Root: `kiosk-hackathon-2026/`

---

## Top level

```
kiosk-hackathon-2026/
├── src/                    Frontend — React + Vite PWA
├── server/                 Backend — Express + SQLite
├── api/                    Vercel serverless functions (Sarvam only — isolated, see below)
├── portal/                 Officer dashboard — standalone HTML, reads Supabase directly
├── public/                 Static assets — audio files, ONNX/WASM models, manifest
├── vercel.json             Frontend + Sarvam function deploy config
├── render.yaml             Full backend deploy config (Render)
├── package.json            Frontend deps (Vite/React) + serverless function deps
├── whisper_assamese_lora_finetune.ipynb   Colab/Kaggle fine-tune notebook (not yet run)
├── APP_FLOW.md             Full user-flow documentation
├── TECH_STACK_INVENTORY.md Every library/API/model used
└── ARCHITECTURE.md         This file
```

---

## `src/` — Frontend

### `src/ai/` — voice + intelligence pipeline

```
ai/
├── actions/                Executes AI-decided actions against the DOM/router
│   ├── accessibilityActions.js   Blind/elderly mode toggles
│   ├── formActions.js            fillField(), validateField(), normaliseFieldValue() — voice form autofill
│   ├── kioskActions.js           Kiosk-specific actions (lock, idle reset)
│   ├── navigationActions.js      navigateToPage(), navigateBack(), office locator nav
│   └── uiActions.js              Generic UI state actions
│
├── api/                     External AI API clients
│   ├── nvidiaApi.js               NVIDIA NIM client — ⚠ calls API directly from browser, key exposed (VITE_NVIDIA_API_KEY)
│   └── sarvamApi.js               Sarvam STT/TTS/translate client, proxied via /api/sarvam/*
│
├── brain/                   Conversation orchestration
│   ├── aiEngine.js                Top-level orchestrator: STT → NLP → LLM → Action → TTS
│   ├── contextMemory.js          Session conversation history (last 20 turns), entity extraction
│   ├── conversationManager.js    processConversationTurn() — the actual per-turn logic
│   ├── intentRouter.js           INTENT_TO_PATH map, routeAction()
│   ├── multilingualProcessor.js  Language detection, code-switching, wake-word matching
│   ├── promptBuilder.js          Builds LLM message array + injects offline knowledge (RAG)
│   ├── semanticIntentMatcher.js  MiniLM embedding-based intent fast-path (offline, all 22 langs)
│   └── translatePivot.js         NEW — Assamese↔English pivot for better LLM reasoning quality
│
├── prompts/                 Static content fed to the LLM
│   ├── serviceKnowledge.js       Service procedures, fees, document requirements (offline RAG source)
│   └── systemPrompt.js           SUVIDHA persona/identity prompt
│
├── provider/
│   └── VoiceAssistantProvider.jsx  React context — wires STT/TTS/AI into the component tree
│
└── voice/                   Speech I/O
    ├── audioManager.js            AudioContext singleton, mic permission, visualizer
    ├── localSTT.js                Offline Whisper-small (transformers.js/ONNX)
    ├── speechRecognition.js       Unified STT manager — tier cascade (Browser→Sarvam→Whisper)
    ├── speechSynthesis.js         Re-exports ttsService functions
    ├── transcriptManager.js       Transcript history/state
    ├── vadDetector.js             NEW — Silero VAD wrapper, replaces RMS noise loop, enables barge-in
    └── wakeWord.js                "Hey Suvidha" detection
```

### `src/components/` — reusable UI

```
components/
├── ai/                      AI-specific UI (chat bubble, suggestions)
├── auth/                    Login-related shared components
├── kiosk/                   VK shell, DD department display, Keypad, OTPInput, Select, etc.
├── loading/                 LoadingScreen, BiometricScanner, SubmissionSteps
├── payment/                 Payment UI components
├── AadhaarCameraScanner.jsx  QR scan + NVIDIA Vision OCR fallback, consent gate
├── AccessibilityProvider.jsx Blind/elderly/normal mode context
├── QRUpload.jsx              Generates upload QR, polls for completion
├── QRUploadModal.jsx
├── RealtimeNavigationMap.jsx  MapLibre-based live navigation
├── ScreenReaderOverlay.jsx    Reads page content aloud for blind mode
├── Select.jsx                 Custom listbox — fixed this session for voice-fill support
├── VoiceInstructionEngine.jsx  Page announcements, form event TTS, mode/network TTS
└── WakeWordListener.jsx        Background "Hey Suvidha" listener
```

### `src/pages/` — routed views (31 files)

```
pages/
├── Landing.jsx, Login.jsx, LanguageSelection.jsx, ModeSelection.jsx, VoiceModeSelection.jsx
├── Home.jsx, Dashboard.jsx
├── Electricity.jsx, ElectricityComplaint.jsx
├── Gas.jsx, GasComplaint.jsx
├── Water.jsx, Municipal.jsx, MunicipalGrievance.jsx, PropertyTaxPayment.jsx
├── Healthcare.jsx, Transport.jsx, Sanitation.jsx
├── Complaints.jsx, TrackStatus.jsx, SchemeDiscovery.jsx
├── FamilyProfile.jsx, OfficeLocator.jsx, Receipt.jsx, MobileUpload.jsx
├── admin/                   Admin-only pages
├── citizen/                 Citizen-facing index
├── kiosk-admin/             Kiosk health/ops dashboard pages
├── organization/            Per-department portal pages (electricity/healthcare/municipal/revenue/transport/water/shared)
├── security/                Security center pages
└── super-admin/             Super-admin portal pages
```

### `src/context/`, `src/hooks/`, `src/utils/`

```
context/
└── SessionContext.jsx        Single source of truth: language, speaker, voiceEnabled, login state
                               Only thing allowed to call configureTTS()/configureSTT()

hooks/
├── useAuth.js, useEnvironment.js, useIdleRearm.js, useKioskScale.js
├── useLoadingState.js, useToast.js, useDelayedLoader.js
├── useVoiceFormSubmit.js      Event-based form submit trigger
└── useVoiceFormWizard.js      NEW — sequential ask/listen/fill/confirm voice form loop

utils/
├── aadhaarDatabase.js         Mock Aadhaar lookup (demo)
├── apiService.js              All backend API call definitions — serviceAPI/complaintAPI now try Supabase first
├── constants.js, helpers.js, mockDelay.js, safeError.js, security.js
├── languageConfig.js          ALL_LANGUAGES — Tier1 (Sarvam native) / Tier2 (bridged) definitions
├── offline.js                 IndexedDB submission queue + sync
├── offlineAudioCache.js       IndexedDB TTS audio cache
├── overpassService.js         NEW (ported) — live transit data via OSM Overpass
├── phoneAuth.js                Mobile number validation
├── receipts.js                 LocalStorage receipt history
├── staticAudioMap.js           NEW — key→filepath registry for Tier 0 static audio
├── supabaseClient.js           NEW — null-safe Supabase client init
├── supabaseSync.js             NEW — direct Supabase writes + offline-queue fallback
├── translationService.js       UI string translation helper
├── ttsService.js                5-tier (now 6 with static) TTS orchestrator
├── voiceFieldPrompts.js         NEW — per-field voice wizard prompts (en/hi/as)
├── voiceMessages.js              Pre-translated message strings (en/hi/as/ta)
└── voicePhrases.js               English phrase list for legacy pre-cache
```

### `src/i18n/`, `src/config/`, `src/data/`, `src/design/`

```
i18n/
├── index.js, languageCodes.js   i18next setup, INDIA_LANGUAGES manifest
└── locales/                      Per-language JSON translation files

config/
└── voiceProfile.js               Speaker-per-language map, default pace

data/
└── officeData.js                 Static office location seed data

design/
└── (design tokens / reference)
```

---

## `server/` — Backend (Express)

```
server/
├── index.js                  Entry point — Helmet, rate limiting, CORS, all route mounting, initDB(), createRealtimeServer()
├── db.js                      SQLite init (better-sqlite3) — DB_PATH env override added this session
├── seed.js                    Initial data seeding
│
├── routes/                    30 route files
│   ├── auth.js, adminAuth.js, otp.js              Identity/auth
│   ├── sarvam.js                                  Sarvam STT/TTS/translate proxy — isolated for Vercel too
│   ├── chat.js                                    4-tier AI chat cascade
│   ├── services.js, complaints.js, transport.js, track.js   Citizen service requests
│   ├── schemes.js, offices.js, reference.js, alerts.js       Reference/lookup data
│   ├── upload.js, uploadPublic.js                  Document upload
│   ├── notifications.js, sync.js                   Receipts, offline sync
│   ├── admin.js, adminPortal.js, kioskAdminSystem.js          Admin dashboards
│   ├── organizationPortals.js, departmentOps.js                Department-side portals
│   ├── superAdminPortal.js, securityCenter.js, securityOps.js  Top-level admin
│   ├── enterpriseAnalytics.js, enterpriseApplications.js       Enterprise reporting
│   ├── offlineSyncOps.js, kioskOps.js                          Kiosk fleet management
│   └── env.js                                                  Env/config exposure endpoint
│
├── services/
│   ├── languageRouter.js          routeSTT/routeTranslate/routeTTS — universal 22-lang router
│   ├── fast2sms.js                SMS OTP delivery
│   ├── adminAuthService.js, auditService.js, routingEngine.js
│
├── middleware/
│   ├── authMiddleware.js          verifyToken, requireAdmin
│   └── enterprise/                authz, CSRF, isolation, observability, upload validation, audit logging
│
├── enterprise/
│   ├── schema.js                  Enterprise DB tables
│   └── services/                  Enterprise-specific business logic
│
├── socket/
│   └── realtime.js                socket.io setup — kiosk admin live updates (NOT serverless-compatible)
│
├── bootstrap/                     Startup sequencing
├── certs/                         UIDAI offline cert (missing — warning on boot)
├── lib/                           Shared helper libs (schemeMatch.js)
├── scripts/                       importSchemes.js, trainRelevanceModel.js
├── sql/                           SQL migration/seed files
└── uploads/                       Uploaded document storage (local fallback)
```

---

## `api/` — Vercel serverless (isolated, deliberately minimal)

```
api/
└── sarvam.js    Standalone Express app wrapping ONLY server/routes/sarvam.js.
                 Built this session because server/index.js can't run serverless —
                 initDB() needs writable filesystem, createRealtimeServer() needs
                 persistent sockets. Sarvam's routes have neither dependency.
```

---

## `portal/` — Officer dashboard (standalone, no build step)

```
portal/
├── index.html             Single-file dashboard. Loads Supabase JS via CDN script tag,
│                          reads submissions/documents tables directly. 8 service tabs
│                          (electricity/gas/municipal/water/healthcare/sanitation/
│                          transport/complaints). Also handles the QR upload page
│                          (?tid=&tok=&org= query params switch view).
├── supabase_schema.sql    Base tables: submissions, documents, ndma_alerts + RLS
└── supabase_setup.sql     upload_tokens table, SELECT-policy fixes, org CHECK
                           constraint expansion, submissions_with_docs view
```

---

## `public/` — Static assets

```
public/
├── audio/
│   ├── en/                 ~80 English MP3s (form/nav/login/aadhaar/mode/page/error prompts)
│   └── as/                 ~80 Assamese MP3s (same structure, 3 extra Aadhaar-specific files)
├── silero_vad_v5.onnx       VAD model (2MB)
├── silero_vad_legacy.onnx   VAD fallback model
├── vad.worklet.bundle.min.js  VAD audio worklet
├── ort-wasm-simd-threaded*.wasm/.mjs   onnxruntime-web runtime (self-hosted, ~100MB total across variants)
├── favicon.svg, manifest.json, sw.js   PWA shell
```

---

## Data flow summary (cross-reference to APP_FLOW.md)

```
Browser (src/)
  ↕ /api/sarvam/*        → api/sarvam.js (Vercel) OR server/routes/sarvam.js (local/Render)
  ↕ /api/* (everything else) → server/index.js (local/Render only — not Vercel-compatible)
  ↕ Supabase JS client    → Supabase Postgres + Storage (direct, bypasses backend entirely)
  ↕ Overpass API          → OpenStreetMap (direct, no backend)
  ↕ NVIDIA NIM            → ⚠ direct from browser (security gap, should proxy via server/routes/chat.js)
```
