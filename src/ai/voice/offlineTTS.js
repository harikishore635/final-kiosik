/**
 * offlineTTS.js — MMS-TTS (VITS) offline synthesis via transformers.js
 *
 * Closes the Hindi offline-TTS gap: en/as have real recorded MP3s (Tier 0
 * in ttsService.js), Hindi has none — offline Hindi previously fell to
 * Browser SpeechSynthesis, which only works if the device happens to have
 * a Hindi voice installed. This is a real, always-available offline model
 * instead, same `@huggingface/transformers` runtime already loaded for
 * Whisper STT — no new dependency.
 *
 * Model: Xenova/mms-tts-hin (Meta MMS, VITS architecture — single forward
 * pass, not autoregressive, so it's actually browser-viable, unlike
 * Indic-Parler-TTS discussed earlier).
 */
import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;

// One pipeline per language, lazy-loaded and cached.
const MODEL_IDS = {
  hi: 'Xenova/mms-tts-hin',
  // Add more here once verified to exist, e.g. 'as': 'Xenova/mms-tts-asm'
  // — NOT yet confirmed to exist, don't assume.
};

const _pipelines = {};
const _loadPromises = {};

export function isOfflineTTSSupported(lang) {
  return Object.prototype.hasOwnProperty.call(MODEL_IDS, lang);
}

async function loadPipeline(lang) {
  if (_pipelines[lang]) return _pipelines[lang];
  if (_loadPromises[lang]) return _loadPromises[lang];

  _loadPromises[lang] = pipeline('text-to-speech', MODEL_IDS[lang], { quantized: true })
    .then((p) => { _pipelines[lang] = p; return p; })
    .catch((err) => { _loadPromises[lang] = null; throw err; });

  return _loadPromises[lang];
}

/**
 * Encode a Float32Array PCM buffer as a playable WAV Blob.
 * MMS-TTS outputs mono Float32 @ 16kHz — Audio() can't play raw PCM directly,
 * it needs a container format.
 */
function encodeWav(float32Audio, sampleRate) {
  const numSamples = float32Audio.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);          // PCM
  view.setUint16(22, 1, true);          // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true);           // block align
  view.setUint16(34, 16, true);          // bits per sample
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, float32Audio[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Synthesize text offline. Returns an object URL playable via Audio().
 * Caller is responsible for revoking the URL when done (same pattern as
 * ttsService.js's existing object URL handling).
 *
 * @param {string} text
 * @param {string} lang - ISO code, must be a key in MODEL_IDS
 * @returns {Promise<string>} object URL
 */
export async function synthesizeOffline(text, lang) {
  if (!isOfflineTTSSupported(lang)) {
    throw new Error(`No offline TTS model configured for language: ${lang}`);
  }
  const synthesizer = await loadPipeline(lang);
  const output = await synthesizer(text);
  const wavBlob = encodeWav(output.audio, output.sampling_rate);
  return URL.createObjectURL(wavBlob);
}
