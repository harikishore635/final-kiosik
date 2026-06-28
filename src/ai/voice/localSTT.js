/**
 * localSTT.js — Offline Whisper STT via transformers.js
 *
 * Model: Xenova/whisper-small (quantized int8) — 67MB download, ~200MB RAM
 * Runs entirely in browser via WebAssembly. No API key, no internet required.
 *
 * 22 Indian Languages support:
 *   Native (15): hi, en, as, bn, ta, te, kn, ml, mr, gu, pa, or, ur, ne, sd
 *   Fallback to Hindi (7): mai, kok, doi, sa, brx, ks, mni, sat
 *
 * First load: ~15s (67MB download, cached in browser IndexedDB forever after)
 * Subsequent loads: ~2s (from cache)
 */

import { pipeline, env } from '@huggingface/transformers';

// Use browser cache (IndexedDB) — persists across sessions
env.allowLocalModels = false;
env.useBrowserCache = true;

// NOTE: do NOT set env.backends.onnx.wasm.wasmPaths = '/' here. Vite's dev
// server refuses to import .mjs files from /public as ES modules ("should
// not be imported from source code... only referenced via HTML tags") and
// throws a 500 that blocks the whole UI. Confirmed live — breaks the app on
// every load. The ~50-80MB duplicate onnxruntime-web runtime (one bundled
// by transformers.js, one by vad-web) is accepted as known tech debt; fixing
// it requires a different approach (e.g. a Vite plugin or CDN-hosted wasm),
// not a raw /public override.

// Model selection per language:
//   medium (244MB int8 ≈ 61MB) → Assamese, Bengali, Hindi, English, Tamil — need higher accuracy
//   small  (67MB int8) → other languages — adequate for keyword navigation
const HIGH_PRIORITY_LANGS = new Set(['as', 'bn', 'hi', 'en', 'ta', 'te']);

function getModelId(lang) {
  const base = (lang || 'hi').toLowerCase().split('-')[0];
  return HIGH_PRIORITY_LANGS.has(base) ? 'Xenova/whisper-medium' : 'Xenova/whisper-small';
}

const MODEL_ID = 'Xenova/whisper-small'; // kept for loadWhisper() backward compat

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
  // Tier-2: not in Whisper's 100 languages — use Hindi as closest Devanagari match
  mai: 'hindi',
  kok: 'hindi',
  doi: 'hindi',
  sa:  'hindi',
  brx: 'hindi',
  ks:  'urdu',   // Kashmiri script is Perso-Arabic, closest is Urdu
  mni: 'bengali', // Manipuri uses Bengali script
  sat: 'bengali', // Santali uses Ol Chiki but Bengali fallback works
};

// Cache per model ID so medium + small can coexist in memory
const _pipes = {};
const _loadPromises = {};
let _loadProgress = 0;

/**
 * Load Whisper pipeline. Returns immediately if already loaded.
 * Dispatches progress events for UI feedback.
 */
async function loadWhisperModel(modelId, onProgress) {
  if (_pipes[modelId]) return _pipes[modelId];
  if (_loadPromises[modelId]) return _loadPromises[modelId];

  _loadPromises[modelId] = (async () => {
    try {
      window.dispatchEvent(new CustomEvent('suvidha:whisper-loading', { detail: { progress: 0, model: modelId } }));
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
              window.dispatchEvent(new CustomEvent('suvidha:whisper-loading', { detail: { progress: pct, file: info.file, model: modelId } }));
            } else if (info.status === 'ready') {
              _loadProgress = 100;
              window.dispatchEvent(new CustomEvent('suvidha:whisper-ready', { detail: { model: modelId } }));
            }
          },
        }
      );
      window.dispatchEvent(new CustomEvent('suvidha:whisper-ready', { detail: { model: modelId } }));
      return _pipes[modelId];
    } catch (err) {
      delete _loadPromises[modelId];
      throw err;
    }
  })();

  return _loadPromises[modelId];
}

// Backward-compat: preload default small model
export async function loadWhisper(onProgress) {
  return loadWhisperModel(MODEL_ID, onProgress);
}

export function isWhisperLoaded() {
  return _pipe !== null;
}

export function getWhisperLoadProgress() {
  return _loadProgress;
}

/**
 * Resample Float32Array from sourceRate to 16000 Hz (Whisper requirement).
 */
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

/**
 * Decode audio Blob → Float32Array at 16kHz for Whisper input.
 */
async function blobToFloat32(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
  try {
    let audioBuffer;
    try {
      audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    } catch {
      // Some WebM formats need a different approach
      const offlineCtx = new OfflineAudioContext(1, 16000, 16000);
      audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer.slice(0));
    }
    const channelData = audioBuffer.getChannelData(0);
    return resampleTo16k(channelData, audioBuffer.sampleRate);
  } finally {
    await audioCtx.close();
  }
}

/**
 * Transcribe an audio Blob using local Whisper.
 *
 * @param {Blob} audioBlob - WebM or WAV audio from MediaRecorder
 * @param {string} language - ISO 639-1 code (hi, as, mai, brx, etc.)
 * @returns {Promise<{ transcript: string, provider: string }>}
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
