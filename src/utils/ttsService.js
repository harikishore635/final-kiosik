
import { VOICE_PROFILE } from '../config/voiceProfile';
import { getStaticAudioUrl } from './staticAudioMap';

const PRIORITY_ORDER = { error: 3, warning: 2, normal: 1 };

const LANGUAGE_MAP = {
  en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN',
  kn: 'kn-IN', ml: 'ml-IN', mr: 'mr-IN', gu: 'gu-IN',
  bn: 'bn-IN', or: 'or-IN', pa: 'pa-IN', as: 'as-IN',
};

// Languages Sarvam bridges through Hindi (TTS quality acceptable, STT uses local Whisper)
const HINDI_BRIDGE_LANGS = new Set([
  'ur', 'ks', 'sd', 'mai', 'kok', 'doi', 'ne', 'sa', 'mni', 'sat',
]);

const CACHE_LIMIT = 60;

// ── Single source of voice config (driven by SessionContext) ────────────────
// Call sites may NOT override speaker/language/pace. configureTTS is the only
// way these change, and SessionContext is the only caller.
const _session = {
  language: 'en-IN',
  speaker: VOICE_PROFILE.speakers['en-IN'] || VOICE_PROFILE.defaultSpeaker,
  voiceEnabled: false,
};

export function configureTTS(cfg = {}) {
  if (typeof cfg.language === 'string') _session.language = cfg.language;
  if (typeof cfg.speaker === 'string') _session.speaker = cfg.speaker;
  if (typeof cfg.voiceEnabled === 'boolean') _session.voiceEnabled = cfg.voiceEnabled;
}

export function isVoiceEnabled() {
  return _session.voiceEnabled;
}

// Short AudioContext tones for accessibility earcons
function playEarcon(type) {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const configs = {
      listen:    { freq: 880, duration: 0.08, gain: 0.15, type: 'sine' },
      stop:      { freq: 440, duration: 0.08, gain: 0.15, type: 'sine' },
      error:     { freq: 220, duration: 0.15, gain: 0.2,  type: 'sawtooth' },
      success:   { freq: 1047, duration: 0.12, gain: 0.15, type: 'sine' },
      interrupt: { freq: 660, duration: 0.06, gain: 0.12, type: 'triangle' },
    };
    const c = configs[type] || configs.listen;
    osc.type = c.type;
    osc.frequency.setValueAtTime(c.freq, ctx.currentTime);
    gain.gain.setValueAtTime(c.gain, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + c.duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + c.duration);
    osc.onended = () => ctx.close();
  } catch { /* AudioContext unavailable — ignore */ }
}

class TTSService {
  constructor() {
    this.queue = [];
    this.isPlaying = false;
    this.currentAudio = null;
    this.currentObjectUrl = null;
    this.pausedByVoiceCommand = false;
    this.sequence = 0;
    this.audioCache = new Map();
    this.cacheOrder = [];
    this.currentAbort = null;

  }

  getLanguageInfo(language) {
    if (!language || typeof language !== 'string') {
      return { code: 'en-IN', needsBridge: false, originalLang: 'en' };
    }
    const baseLang = language.toLowerCase().split('-')[0];
    if (HINDI_BRIDGE_LANGS.has(baseLang)) {
      return { code: 'hi-IN', needsBridge: true, originalLang: baseLang };
    }
    return { code: LANGUAGE_MAP[baseLang] || 'en-IN', needsBridge: false, originalLang: baseLang };
  }

  getLanguageCode(language) {
    return this.getLanguageInfo(language).code;
  }

  getCacheKey(text, langCode, options) {
    const speaker = options?.speaker || VOICE_PROFILE.speakers[langCode] || VOICE_PROFILE.defaultSpeaker;
    return `${langCode}::${speaker}::${text.trim().slice(0, 80)}`;
  }

  setVoiceCommandActive(isActive) {
    this.pausedByVoiceCommand = Boolean(isActive);
    if (this.pausedByVoiceCommand) {
      if (this.currentAudio && !this.currentAudio.paused) this.currentAudio.pause();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      return;
    }
    if (this.currentAudio && this.currentAudio.paused) {
      this.currentAudio.play().catch(() => { this.isPlaying = false; this.processQueue(); });
      return;
    }
    this.processQueue();
  }

  stop() {
    this.queue = [];
    this.currentAbort?.abort();
    this.currentAbort = null;
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
      this.currentObjectUrl = null;
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    this.isPlaying = false;
    playEarcon('interrupt');
  }

  speak(text, options = {}) {
    // Voice is opt-in. If not enabled for the session, every speak() is a no-op.
    if (!_session.voiceEnabled) return Promise.resolve();

    const trimmed = typeof text === 'string' ? text.trim() : '';
    if (!trimmed) return Promise.resolve();

    // Force session voice — call sites cannot override speaker/language/pace/model.
    const forced = {
      ...options,
      language: _session.language,
      speaker: _session.speaker,
      pace: VOICE_PROFILE.pace,
    };

    const priority = forced.priority || 'normal';
    const queueItem = { id: ++this.sequence, text: trimmed, options: forced, priority, resolve: null, reject: null };
    const promise = new Promise((resolve, reject) => { queueItem.resolve = resolve; queueItem.reject = reject; });

    if (options.interrupt === true || priority === 'error') this.stop();
    this.queue.push(queueItem);
    this.processQueue();
    return promise;
  }

  isSpeaking() {
    return this.isPlaying;
  }

  async processQueue() {
    if (this.isPlaying || this.pausedByVoiceCommand || this.queue.length === 0) return;

    const nextIndex = this.getNextQueueItemIndex();
    const item = this.queue.splice(nextIndex, 1)[0];
    this.isPlaying = true;

    try {
      await this.playItem(item);
      item.resolve(true);
    } catch (error) {
      item.reject(error);
    } finally {
      this.isPlaying = false;
      this.currentAudio = null;
      this.currentObjectUrl = null;
      if (!this.pausedByVoiceCommand) this.processQueue();
    }
  }

  getNextQueueItemIndex() {
    let bestIndex = 0, bestPriority = -1, bestId = Number.MAX_SAFE_INTEGER;
    for (let i = 0; i < this.queue.length; i++) {
      const item = this.queue[i];
      const p = PRIORITY_ORDER[item.priority] || 1;
      if (p > bestPriority || (p === bestPriority && item.id < bestId)) {
        bestPriority = p; bestId = item.id; bestIndex = i;
      }
    }
    return bestIndex;
  }

  async playItem(item) {
    window.dispatchEvent(new CustomEvent('suvidha:tts-started', { detail: { text: item.text } }));
    item.options?.onStart?.();

    const langInfo = this.getLanguageInfo(item.options?.language);
    const cacheKey = this.getCacheKey(item.text, langInfo.code, item.options);

    try {
      // 0. Static pre-recorded file — fastest, truly offline, no API
      const staticKey = item.options?.staticKey;
      if (staticKey) {
        const staticUrl = getStaticAudioUrl(langInfo.originalLang, staticKey);
        if (staticUrl) {
          try { await this.playAudioFromObjectUrl(staticUrl, item.options?.volume); return; } catch { /* fall through to dynamic tiers */ }
        }
      }

      // 1. In-memory cache
      if (this.audioCache.has(cacheKey)) {
        try { await this.playAudioFromObjectUrl(this.audioCache.get(cacheKey), item.options?.volume); return; } catch { /* fall through */ }
      }

      // 2. Sarvam TTS — only for chatbot AI responses (not navigation).
      // Navigation uses static MP3s (Tier 0) or Web Speech. Chatbot responses
      // are dynamic text that benefits from the higher-quality Sarvam voice.
      if (item.options?.chatbot === true) {
        try {
          const resp = await fetch('/api/sarvam/text-to-speech', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              inputs: [item.text],
              target_language_code: langInfo.code,
              speaker: item.options?.speaker || VOICE_PROFILE.speakers[langInfo.code] || VOICE_PROFILE.defaultSpeaker,
              model: VOICE_PROFILE.model,
            }),
            signal: AbortSignal.timeout(10000),
          });
          if (resp.ok) {
            const blob = await resp.blob();
            if (blob.size > 0) {
              const url = URL.createObjectURL(blob);
              await this.playAudioFromObjectUrl(url, item.options?.volume);
              URL.revokeObjectURL(url);
              return;
            }
          }
        } catch { /* Sarvam unavailable — fall through to Web Speech */ }
      }

      // 3. Offline MMS-TTS model (currently Hindi only — see offlineTTS.js).
      // Covers the gap Browser SpeechSynthesis leaves: that tier depends on
      // the device having a Hindi voice installed, which isn't guaranteed.
      try {
        const { isOfflineTTSSupported, synthesizeOffline } = await import('../ai/voice/offlineTTS.js');
        if (isOfflineTTSSupported(langInfo.originalLang)) {
          const url = await synthesizeOffline(item.text, langInfo.originalLang);
          await this.playAudioFromObjectUrl(url, item.options?.volume);
          URL.revokeObjectURL(url);
          return;
        }
      } catch (offlineErr) {
        console.warn('[TTS] Offline model failed, using Web Speech:', offlineErr.message);
      }

      // 5. Browser Web Speech (always available, lower quality)
      await this.playFallback(item.text, langInfo.code);
    } finally {
      window.dispatchEvent(new CustomEvent('suvidha:tts-ended', { detail: { text: item.text } }));
      item.options?.onEnd?.();
    }
  }

  _addToMemCache(key, url) {
    this.audioCache.set(key, url);
    this.cacheOrder.push(key);
    while (this.cacheOrder.length > CACHE_LIMIT) {
      const old = this.cacheOrder.shift();
      const oldUrl = this.audioCache.get(old);
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      this.audioCache.delete(old);
    }
  }

  playAudioFromObjectUrl(objectUrl, volume = 1) {
    return new Promise((resolve, reject) => {
      const audio = new Audio(objectUrl);
      audio.preload = 'auto';
      audio.volume = Math.max(0, Math.min(1, Number(volume)));
      this.currentAudio = audio;
      this.currentObjectUrl = objectUrl;

      const cleanup = () => { audio.onended = null; audio.onerror = null; };
      audio.onended = () => { cleanup(); resolve(true); };
      audio.onerror = () => { cleanup(); reject(new Error('Audio playback failed')); };
      audio.play().catch(err => { cleanup(); reject(err); });
    });
  }

  playFallback(text, languageCode) {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) { resolve(true); return; }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = languageCode;
      utterance.rate = 0.9;
      utterance.volume = 1;

      const voices = window.speechSynthesis.getVoices();
      const langBase = languageCode.split('-')[0];
      const match = voices.find(v => v.lang.startsWith(languageCode))
        || voices.find(v => v.lang.startsWith(langBase))
        || voices.find(v => v.lang.startsWith('hi'));
      if (match) utterance.voice = match;

      utterance.onend = () => resolve(true);
      utterance.onerror = () => resolve(true);
      window.speechSynthesis.speak(utterance);
    });
  }
}

const ttsService = new TTSService();

export const speak = (text, options) => ttsService.speak(text, options);
export const stopTTS = () => ttsService.stop();
export const isSpeaking = () => ttsService.isSpeaking();
export const setVoiceCommandActive = (isActive) => ttsService.setVoiceCommandActive(isActive);
export const mapLanguageCode = (language) => ttsService.getLanguageCode(language);
export const getLanguageInfo = (language) => ttsService.getLanguageInfo(language);
export const earcon = playEarcon;

export default ttsService;
