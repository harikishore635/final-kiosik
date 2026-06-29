/**
 * localSTT.js — Offline Whisper STT via transformers.js (offline fallback only)
 *
 * Models (quantized int8, cached in browser IndexedDB):
 *   whisper-small.en  ~40 MB  — English
 *   whisper-small     ~67 MB  — All Indic langs (navigation keywords only)
 *
 * Sarvam STT is primary (online). Whisper fires only when Sarvam is unreachable.
 * Aadhaar QR fills form fields; Whisper only needs to recognise nav commands.
 */

import { pipeline, env } from '@huggingface/transformers';

// Use browser IndexedDB cache — persists across sessions
env.allowLocalModels = false;
env.useBrowserCache = true;

// ── Model IDs ────────────────────────────────────────────────────────────────
// Aadhaar QR scan fills all form fields → Whisper only needs to handle
// navigation commands ("electricity", "water", "back") + chatbot queries.
// Sarvam STT is primary (online). Whisper is offline fallback only.
// Navigation words are short/known vocab → small model is sufficient for all langs.
const MODEL_EN_ONLY = 'Xenova/whisper-small.en'; // English — 40MB, fastest
const MODEL_SMALL   = 'Xenova/whisper-small';    // All Indic langs — 67MB

// ── Language → model assignment ───────────────────────────────────────────────
// Single-tier: small model for everyone.
// Rationale: Sarvam handles complex sentences online. Whisper offline fallback
// only needs to recognise ~20 navigation keywords per language — small is enough.
// Saves 200-450MB browser RAM vs previous medium/large-turbo assignments.
const LANG_MODEL_MAP = {
  en:  MODEL_EN_ONLY, // English-only model slightly better for EN commands
  // All other languages: small multilingual (67MB, cached once)
  as:  MODEL_SMALL, hi:  MODEL_SMALL, bn:  MODEL_SMALL,
  ta:  MODEL_SMALL, te:  MODEL_SMALL, kn:  MODEL_SMALL,
  ml:  MODEL_SMALL, mr:  MODEL_SMALL, gu:  MODEL_SMALL,
  pa:  MODEL_SMALL, or:  MODEL_SMALL, ur:  MODEL_SMALL,
  ne:  MODEL_SMALL, sd:  MODEL_SMALL, mai: MODEL_SMALL,
  kok: MODEL_SMALL, doi: MODEL_SMALL, sa:  MODEL_SMALL,
  brx: MODEL_SMALL, ks:  MODEL_SMALL, mni: MODEL_SMALL,
  sat: MODEL_SMALL,
};

// Whisper uses full English language names, not ISO codes
const WHISPER_LANG_MAP = {
  hi: 'hindi',
  en: 'english',
  as: 'assamese',
  bn: 'bengali',
  ta: 'tamil',
  te: 'telugu',
  kn: 'kannada',
  ml: 'malayalam',
  mr: 'marathi',
  gu: 'gujarati',
  pa: 'punjabi',
  or: 'odia',
  ur: 'urdu',
  ne: 'nepali',
  sd: 'sindhi',
  // Bridge langs: map to closest Whisper language
  mai: 'hindi',
  kok: 'hindi',
  doi: 'hindi',
  sa:  'hindi',
  brx: 'hindi',
  ks:  'urdu',
  mni: 'bengali',
  sat: 'bengali',
};

function getModelId(baseLang) {
  return LANG_MODEL_MAP[baseLang] || MODEL_SMALL;
}

// ── Pipeline cache — one per model ID ────────────────────────────────────────
const _pipes = {};
const _loadPromises = {};
let _loadProgress = 0;

async function loadWhisperModel(modelId, onProgress) {
  if (_pipes[modelId]) return _pipes[modelId];
  if (_loadPromises[modelId]) return _loadPromises[modelId];

  _loadPromises[modelId] = (async () => {
    try {
      window.dispatchEvent(new CustomEvent('suvidha:whisper-loading', {
        detail: { progress: 0, model: modelId },
      }));
      _pipes[modelId] = await pipeline(
        'automatic-speech-recognition',
        modelId,
        {
          quantized: true,
          progress_callback: (info) => {
            if (info.status === 'downloading') {
              const pct = info.total > 0 ? Math.round((info.loaded / info.total) * 100) : 0;
              _loadProgress = pct;
              onProgress?.(pct, info.file);
              window.dispatchEvent(new CustomEvent('suvidha:whisper-loading', {
                detail: { progress: pct, file: info.file, model: modelId },
              }));
            } else if (info.status === 'ready') {
              _loadProgress = 100;
              window.dispatchEvent(new CustomEvent('suvidha:whisper-ready', {
                detail: { model: modelId },
              }));
            }
          },
        }
      );
      window.dispatchEvent(new CustomEvent('suvidha:whisper-ready', {
        detail: { model: modelId },
      }));
      return _pipes[modelId];
    } catch (err) {
      delete _loadPromises[modelId];
      throw err;
    }
  })();

  return _loadPromises[modelId];
}

/**
 * Preload the Whisper model for a specific language.
 * Called when the user selects a language so the model is warm before first use.
 */
export async function loadWhisperForLang(lang, onProgress) {
  const baseLang = (lang || 'hi').toLowerCase().split('-')[0];
  const modelId = getModelId(baseLang);
  return loadWhisperModel(modelId, onProgress);
}

/** Backward-compat: preload the default small model. */
export async function loadWhisper(onProgress) {
  return loadWhisperModel(MODEL_SMALL, onProgress);
}

export function getWhisperLoadProgress() {
  return _loadProgress;
}

/** Returns true if ANY Whisper model is loaded and ready. */
export function isWhisperLoaded() {
  return Object.keys(_pipes).length > 0;
}

// ── Audio utilities ───────────────────────────────────────────────────────────

function resampleTo16k(audioData, sourceRate) {
  if (sourceRate === 16000) return audioData;
  const ratio = sourceRate / 16000;
  const newLength = Math.round(audioData.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const srcIdx = i * ratio;
    const lo = Math.floor(srcIdx);
    const hi = Math.min(lo + 1, audioData.length - 1);
    const frac = srcIdx - lo;
    result[i] = audioData[lo] * (1 - frac) + audioData[hi] * frac;
  }
  return result;
}

async function blobToFloat32(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
  try {
    let audioBuffer;
    try {
      audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } catch {
      const offlineCtx = new OfflineAudioContext(1, 16000, 16000);
      audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer.slice(0));
    }
    const channelData = audioBuffer.getChannelData(0);
    return resampleTo16k(channelData, audioBuffer.sampleRate);
  } finally {
    await audioCtx.close();
  }
}

// ── Navigation domain prompts ─────────────────────────────────────────────────
// Whisper initial_prompt biases the model toward expected vocabulary.
// Significant WER reduction for domain-specific command recognition.
const NAV_PROMPTS = {
  en: 'electricity water gas health municipal transport complaint grievance back submit next help aadhaar',
  hi: 'बिजली पानी गैस स्वास्थ्य नगरपालिका परिवहन शिकायत वापस जमा करें आगे आधार',
  as: 'বিদ্যুৎ পানী গেছ স্বাস্থ্য পৌৰসভা পৰিবহন অভিযোগ উভতি যাওক দাখিল কৰক আধাৰ',
  bn: 'বিদ্যুৎ জল গ্যাস স্বাস্থ্য পৌরসভা পরিবহন অভিযোগ ফিরে জমা দিন আধার',
  ta: 'மின்சாரம் தண்ணீர் எரிவாயு சுகாதாரம் நகராட்சி போக்குவரத்து புகார் திரும்பு சமர்பிக்க ஆதார்',
  te: 'విద్యుత్ నీరు గ్యాస్ ఆరోగ్యం పురపాలక రవాణా ఫిర్యాదు వెనుక సమర్పించు ఆధార్',
  kn: 'ವಿದ್ಯುತ್ ನೀರು ಗ್ಯಾಸ್ ಆರೋಗ್ಯ ನಗರಪಾಲಿಕೆ ಸಾರಿಗೆ ದೂರು ಹಿಂದೆ ಸಲ್ಲಿಸು ಆಧಾರ್',
  ml: 'വൈദ്യുതി വെള്ളം ഗ്യാസ് ആരോഗ്യം നഗരസഭ ഗതാഗതം പരാതി മടങ്ങുക സമർപ്പിക്കുക ആധാർ',
  mr: 'वीज पाणी गॅस आरोग्य नगरपालिका वाहतूक तक्रार परत सबमिट आधार',
  gu: 'વીજળી પાણી ગેસ આરોગ્ય નગરપાલિકા પરિવહન ફરિયાદ પાછળ સબમિટ આધાર',
  pa: 'ਬਿਜਲੀ ਪਾਣੀ ਗੈਸ ਸਿਹਤ ਨਗਰਪਾਲਿਕਾ ਟ੍ਰਾਂਸਪੋਰਟ ਸ਼ਿਕਾਇਤ ਵਾਪਸ ਜਮ੍ਹਾਂ ਆਧਾਰ',
  or: 'ବିଦ୍ୟୁତ ଜଳ ଗ୍ୟାସ ସ୍ୱାସ୍ଥ୍ୟ ନଗରପାଳିକା ପରିବହନ ଅଭିଯୋଗ ଫେରନ୍ତୁ ଦାଖଲ ଆଧାର',
};

// ── Transcription ─────────────────────────────────────────────────────────────

/**
 * Transcribe an audio Blob using local Whisper.
 *
 * @param {Blob}    audioBlob    - WebM or WAV from MediaRecorder / VAD
 * @param {string}  language     - ISO 639-1 code (hi, as, ta, etc.)
 * @param {object}  [opts]
 * @param {boolean} [opts.navMode=false] - inject navigation domain prompt for lower WER on commands
 * @returns {Promise<{ transcript: string, provider: string, language: string }>}
 */
export async function whisperTranscribe(audioBlob, language = 'hi', opts = {}) {
  const baseLang = (language || 'hi').toLowerCase().split('-')[0];
  const modelId = getModelId(baseLang);
  const pipe = await loadWhisperModel(modelId);
  const whisperLang = WHISPER_LANG_MAP[baseLang] || 'hindi';

  const audioData = await blobToFloat32(audioBlob);

  const generateKwargs = {};
  // inject domain prompt when available — biases toward kiosk navigation vocabulary
  const navPrompt = NAV_PROMPTS[baseLang];
  if (navPrompt) generateKwargs.initial_prompt = navPrompt;

  const result = await pipe(audioData, {
    language: whisperLang,
    task: 'transcribe',
    return_timestamps: false,
    chunk_length_s: 30,
    stride_length_s: 5,
    ...( Object.keys(generateKwargs).length ? { generate_kwargs: generateKwargs } : {} ),
  });

  const transcript = (result?.text || '').trim();
  return { transcript, provider: 'whisper-local', language: baseLang };
}
