# SUVIDHA Kiosk — Complete Tech Stack Inventory

Everything used in this web app, inch by inch. Grouped by layer.

---

## 1. Frontend framework & build

| Tech | Version | Purpose |
|---|---|---|
| React | 19.2.0 | UI framework |
| React DOM | 19.2.0 | DOM renderer |
| Vite | 6.4.2 | Build tool, dev server |
| @vitejs/plugin-react | 4.7.0 | Vite ↔ React integration |
| React Router DOM | 7.15.1 | Client-side routing |
| Tailwind CSS | 3.4.19 | Utility-first CSS |
| PostCSS | 8.5.14 | CSS processing |
| Autoprefixer | 10.5.0 | CSS vendor prefixing |

## 2. Internationalization

| Tech | Version | Purpose |
|---|---|---|
| i18next | 26.2.0 | Translation framework |
| react-i18next | 17.0.8 | React bindings for i18next |
| i18next-browser-languagedetector | 8.2.1 | Auto-detect browser language |

22 Indian languages + English supported via `src/i18n/locales/`.

## 3. Voice — Speech-to-Text (STT)

| Tech | Where | Purpose |
|---|---|---|
| Browser Web Speech API | native browser | Tier 1 STT — fast, interim results |
| Sarvam Saaras v3 | `sarvamai` npm pkg v1.1.7 (server), REST (client) | Tier 2 STT — 12 Indian languages, cloud |
| `@huggingface/transformers` | 4.2.0 | Runs Whisper-small ONNX in-browser (Tier 3, offline) |
| `Xenova/whisper-small` | HuggingFace model | Offline STT model, 67MB int8 |
| `onnxruntime-web` | 1.27.0 | WASM runtime executing the ONNX models in-browser |

## 4. Voice — Voice Activity Detection (VAD)

| Tech | Version | Purpose |
|---|---|---|
| `@ricky0123/vad-web` | 0.0.30 | Silero VAD wrapper — neural speech/silence detection |
| Silero VAD v5 | ONNX model (self-hosted in `/public`) | Replaces old RMS-energy noise loop; gates STT chunking + enables barge-in |

## 5. Voice — Text-to-Speech (TTS)

| Tech | Where | Purpose |
|---|---|---|
| Static pre-recorded MP3 | `public/audio/{en,as}/` | Tier 0 — ~80 real human-recorded phrases per language, zero-latency |
| Sarvam Bulbul v3 | via `sarvamai` SDK / REST | Tier 3-4 — cloud TTS, 12 Indian languages (Assamese bridges to Hindi voice — Sarvam beta limitation) |
| Browser SpeechSynthesis API | native browser | Tier 5 — always-available fallback |
| IndexedDB | browser native | Tier 2 — caches synthesized audio blobs (`offlineAudioCache.js`) |

## 6. AI Chatbot

| Tech | Model | Purpose |
|---|---|---|
| NVIDIA NIM | `meta/llama-3.3-70b-instruct` | Primary chat model |
| NVIDIA NIM | `nvidia/llama-3.1-nemotron-ultra-253b-v1` | Complex reasoning fallback |
| NVIDIA NIM | `meta/llama-3.2-11b-vision-instruct` | Aadhaar card OCR fallback |
| NVIDIA NIM | `mistralai/mixtral-8x7b-instruct-v0.1` | Regional translation fallback |
| NVIDIA NIM | `meta/llama-3.1-8b-instruct` | Lightweight fallback |
| Sarvam | `sarvam-105b` / `sarvam-m` | Server-side chat cascade (chat.js), best Indian-language quality |
| HuggingFace | `google/gemma-2-2b-it` | Last-resort chat fallback |
| `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (`Xenova` ONNX build) | via `@huggingface/transformers` | Semantic intent matching — fast-path navigation, all 22 langs natively, runs offline in-browser |

## 7. Translation

| Tech | Purpose |
|---|---|
| Sarvam Mayura v1 | `sarvamTranslate()` — bridges Tier-2 languages, powers the Assamese English-pivot for AI chat |

## 8. Identity / Aadhaar

| Tech | Version | Purpose |
|---|---|---|
| jsQR | 1.4.0 | QR code decoding (WASM, MIT licensed) — parses Aadhaar QR offline |
| NVIDIA Vision (`llama-3.2-11b-vision-instruct`) | — | OCR fallback when QR scan fails |

## 9. Maps & Location

| Tech | Version | Purpose |
|---|---|---|
| MapLibre GL | 5.24.0 | Vector map rendering |
| react-map-gl | 8.1.1 | React bindings for MapLibre |
| Leaflet | 1.9.4 | Alternate map rendering (legacy/fallback) |
| MapTiler API | — | Map tile provider (key-based) |
| OpenStreetMap Overpass API | — | Office/metro/bus/railway lookups, free, no key |

## 10. QR / Document Upload

| Tech | Version | Purpose |
|---|---|---|
| qrcode.react | 4.2.0 | Generates QR codes (kiosk → phone upload flow) |
| Supabase Storage | — | Stores uploaded citizen documents |

## 11. Database & Backend Sync

| Tech | Version | Purpose |
|---|---|---|
| Supabase JS client | 2.108.2 | Direct browser-to-DB writes (`submissions`, `documents`, `upload_tokens` tables) |
| Supabase Postgres | — | Cloud DB, RLS policies gate anon read/write |
| better-sqlite3 | 11.7.0 (server) | Local SQLite — kiosk admin, schemes, enterprise data |
| IndexedDB | browser native | Offline submission queue (`offline.js`), audio cache |

## 12. Backend (Express server)

| Tech | Version | Purpose |
|---|---|---|
| Express | 4.21.0 | HTTP server framework |
| Helmet | 8.1.0 | 14 security headers (CSP, HSTS, etc.) |
| express-rate-limit | 8.2.1 | Global/auth/chat rate limiting |
| cors | 2.8.5 | CORS policy |
| jsonwebtoken | 9.0.2 | JWT auth tokens |
| bcryptjs | 2.4.3 | Password hashing (admin accounts) |
| multer | 1.4.5-lts.1 | Multipart file upload handling |
| socket.io | 4.8.1 | Realtime features (kiosk admin dashboard) |
| dotenv | 16.4.5 | Env var loading |
| node-forge | 1.4.0 | Crypto operations (consent tokens, HMAC) |
| nodemailer | 8.0.7 | Email sending (receipts) |
| fast-xml-parser | 5.8.0 | Aadhaar QR v1 XML parsing |
| csv-parse | 5.6.0 | Scheme data import |
| uuid | 10.0.0 | Unique ID generation |
| get-port / default-gateway | — | Local network/port utilities |

## 13. External APIs (need keys)

| API | Used for |
|---|---|
| Sarvam AI (`api.sarvam.ai`) | STT, TTS, translate |
| NVIDIA NIM (`integrate.api.nvidia.com`) | AI chatbot, vision OCR — **currently called insecurely from browser, needs server-proxy fix** |
| Fast2SMS | OTP delivery via SMS |
| Supabase | DB + storage |
| MapTiler | Map tiles |

## 14. External APIs (free, no key)

| API | Used for |
|---|---|
| OpenStreetMap Overpass | Metro/bus/railway/office lookups |
| Nominatim | Address ↔ coordinates (referenced, not confirmed wired) |

## 15. Testing

| Tech | Version | Purpose |
|---|---|---|
| Playwright | 1.60.0 | Browser automation — used this session for live verification (landing page, language flow, error detection) |
| @playwright/test | 1.60.0 | Test runner |

## 16. Deployment

| Platform | Hosts | Config file |
|---|---|---|
| Vercel | Frontend (Vite build) + isolated Sarvam serverless function | `vercel.json`, `api/sarvam.js` |
| Render | Full backend — Express, SQLite, sockets | `render.yaml` |

## 17. Fine-tuning (prepared, not yet run)

| Tech | Purpose |
|---|---|
| `transformers` (Python) | Whisper fine-tuning |
| `peft` | LoRA adapter training — fits free Colab/Kaggle T4 |
| `ai4bharat/IndicVoices` | Assamese training dataset |
| `openai/whisper-large-v3-turbo` | Fine-tune base model |
| Notebook: `whisper_assamese_lora_finetune.ipynb` | Ready to run on Colab/Kaggle |

## 18. Icons / UI primitives

| Tech | Version | Purpose |
|---|---|---|
| lucide-react | 1.16.0 | Icon set |

---

## What's real vs aspirational — quick filter

**Confirmed working live this session:** landing page, language selection (24 langs), Assamese UI render, backend `/api/health`, Sarvam `/api/sarvam/status`, Vercel serverless function boot test.

**Built + build-verified, not live-tested:** voice wizard, VAD barge-in, static audio Tier 0, Supabase sync, portal dashboard, translate-pivot.

**Documented gap, not yet fixed:** NVIDIA key exposed client-side, blind-mode QR scanning has no solution, only 1/9 forms has voice wizard, Assamese TTS bridges to Hindi voice for anything outside the 80 static phrases.
