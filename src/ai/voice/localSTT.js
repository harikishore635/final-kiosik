/**
 * localSTT.js — Offline Whisper STT via transformers.js
 *
 * Model tiers (all quantized int8, cached in browser IndexedDB forever):
 *   whisper-small.en      ~40 MB  — English-only, fastest + most accurate for EN
 *   whisper-large-v3-turbo ~500 MB — Best for low-resource langs (Assamese)
 *   whisper-medium        ~240 MB  — All major Indian languages
 *   whisper-small         ~67 MB   — Bridge/Devanagari-fallback languages
 *
 * First load downloads model; subsequent loads serve from IndexedDB cache.
 */

import { pipeline, env } from '@huggingface/transformers';

// Use browser IndexedDB cache — persists across sessions
env.allowLocalModels = false;
env.useBrowserCache = true;

// ── Model IDs ────────────────────────────────────────────────────────────────
const MODEL_EN_ONLY     = 'Xenova/whisper-small.en';       // English-only, ~40MB
const MODEL_LARGE_TURBO = 'Xenova/whisper-large-v3-turbo'; // Best for low-resource (as), ~500MB
const MODEL_MEDIUM      = 'Xenova/whisper-medium';          // Major Indic langs, ~240MB
const MODEL_SMALL       = 'Xenova/whisper-small';           // Bridge/fallback langs, ~67MB

// ── Language → model assignment ───────────────────────────────────────────────
// Priority order: as > hi > en > major Indic > bridge
const LANG_MODEL_MAP = {
  // High-priority: best models for top 3 languages
  en:  MODEL_EN_ONLY,       // English-only model — fastest, most accurate for English
  as:  MODEL_LARGE_TURBO,   // Assamese is low-resource — needs large model for accuracy
  hi:  MODEL_MEDIUM,        // Hindi — well covered by medium

  // Major Indian languages — all get medium model
  bn:  MODEL_MEDIUM,        // Bengali
  ta:  MODEL_MEDIUM,        // Tamil
  te:  MODEL_MEDIUM,        // Telugu
  kn:  MODEL_MEDIUM,        // Kannada
  ml:  MODEL_MEDIUM,        // Malayalam
  mr:  MODEL_MEDIUM,        // Marathi
  gu:  MODEL_MEDIUM,        // Gujarati
  pa:  MODEL_MEDIUM,        // Punjabi
  or:  MODEL_MEDIUM,        // Odia

  // Bridge langs (not in Whisper's 100-language set — transcribed via closest script)
  ur:  MODEL_SMALL,         // Urdu → Arabic script, close to Urdu Whisper token
  ne:  MODEL_SMALL,         // Nepali → Devanagari
  sd:  MODEL_SMALL,         // Sindhi
  mai: MODEL_SMALL,         // Maithili → Devanagari, Hindi bridge
  kok: MODEL_SMALL,         // Konkani → Devanagari
  doi: MODEL_SMALL,         // Dogri → Devanagari
  sa:  MODEL_SMALL,         // Sanskrit → Devanagari
  brx: MODEL_SMALL,         // Bodo → Devanagari
  ks:  MODEL_SMALL,         // Kashmiri → Perso-Arabic (Urdu bridge)
  mni: MODEL_SMALL,         // Manipuri → Bengali script bridge
  sat: MODEL_SMALL,         // Santali → Bengali script bridge
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

// ── Transcription ─────────────────────────────────────────────────────────────

/**
 * Transcribe an audio Blob using local Whisper.
 *
 * @param {Blob}   audioBlob - WebM or WAV from MediaRecorder / VAD
 * @param {string} language  - ISO 639-1 code (hi, as, ta, etc.)
 * @returns {Promise<{ transcript: string, provider: string, language: string }>}
 */
export async function whisperTranscribe(audioBlob, language = 'hi') {
  const baseLang = (language || 'hi').toLowerCase().split('-')[0];
  const modelId = getModelId(baseLang);
  const pipe = await loadWhisperModel(modelId);
  const whisperLang = WHISPER_LANG_MAP[baseLang] || 'hindi';

  const audioData = await blobToFloat32(audioBlob);

  const result = await pipe(audioData, {
    language: whisperLang,
    task: 'transcribe',
    return_timestamps: false,
    chunk_length_s: 30,
    stride_length_s: 5,
  });

  const transcript = (result?.text || '').trim();
  return { transcript, provider: 'whisper-local', language: baseLang };
}
