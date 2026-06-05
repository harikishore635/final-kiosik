/**
 * multilingualProcessor.js — Language Detection & Code-Switching Handler
 *
 * Handles the unique challenge of Indian multilingual speech:
 * - Pure Tamil, Hindi, Bengali, etc.
 * - Tanglish (Tamil + English)
 * - Hinglish (Hindi + English)
 * - Mid-sentence code switching
 *
 * Also manages language preference across the session.
 */

import { detectLanguageFromText, getSarvamCode } from '../api/sarvamApi.js';

// ── Language metadata ─────────────────────────────────────────────────────

export const SUPPORTED_LANGUAGES = {
  // ── Tier 1: Full Sarvam STT + TTS + Translate ──────────────────────────
  en:  { name: 'English',    nativeName: 'English',      bcp47: 'en-IN', script: 'Latin'      },
  hi:  { name: 'Hindi',      nativeName: 'हिंदी',          bcp47: 'hi-IN', script: 'Devanagari' },
  ta:  { name: 'Tamil',      nativeName: 'தமிழ்',          bcp47: 'ta-IN', script: 'Tamil'      },
  te:  { name: 'Telugu',     nativeName: 'తెలుగు',         bcp47: 'te-IN', script: 'Telugu'     },
  kn:  { name: 'Kannada',    nativeName: 'ಕನ್ನಡ',          bcp47: 'kn-IN', script: 'Kannada'    },
  ml:  { name: 'Malayalam',  nativeName: 'മലയാളം',         bcp47: 'ml-IN', script: 'Malayalam'  },
  bn:  { name: 'Bengali',    nativeName: 'বাংলা',          bcp47: 'bn-IN', script: 'Bengali'    },
  as:  { name: 'Assamese',   nativeName: 'অসমীয়া',         bcp47: 'as-IN', script: 'Bengali'    },
  mr:  { name: 'Marathi',    nativeName: 'मराठी',          bcp47: 'mr-IN', script: 'Devanagari' },
  gu:  { name: 'Gujarati',   nativeName: 'ગુજરાતી',         bcp47: 'gu-IN', script: 'Gujarati'   },
  pa:  { name: 'Punjabi',    nativeName: 'ਪੰਜਾਬੀ',          bcp47: 'pa-IN', script: 'Gurmukhi'   },
  or:  { name: 'Odia',       nativeName: 'ଓଡ଼ିଆ',           bcp47: 'or-IN', script: 'Odia'       },
  // ── Tier 2: Whisper STT + Sarvam-bridged Translate ─────────────────────
  ur:  { name: 'Urdu',       nativeName: 'اردو',           bcp47: 'ur-IN', script: 'Arabic',    bridge: 'hi' },
  mai: { name: 'Maithili',   nativeName: 'मैथिली',         bcp47: 'mai-IN',script: 'Devanagari',bridge: 'hi' },
  kok: { name: 'Konkani',    nativeName: 'कोंकणी',         bcp47: 'kok-IN',script: 'Devanagari',bridge: 'hi' },
  doi: { name: 'Dogri',      nativeName: 'डोगरी',          bcp47: 'doi-IN',script: 'Devanagari',bridge: 'hi' },
  ne:  { name: 'Nepali',     nativeName: 'नेपाली',         bcp47: 'ne-IN', script: 'Devanagari',bridge: 'hi' },
  sa:  { name: 'Sanskrit',   nativeName: 'संस्कृतम्',       bcp47: 'sa-IN', script: 'Devanagari',bridge: 'hi' },
  brx: { name: 'Bodo',       nativeName: 'बड़ो',            bcp47: 'brx-IN',script: 'Devanagari',bridge: 'hi' },
  ks:  { name: 'Kashmiri',   nativeName: 'كٲشُر',          bcp47: 'ks-IN', script: 'Arabic',    bridge: 'ur' },
  mni: { name: 'Manipuri',   nativeName: 'মৈতৈলোন্',        bcp47: 'mni-IN',script: 'Bengali',   bridge: 'bn' },
  sat: { name: 'Santali',    nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ',        bcp47: 'sat-IN',script: 'OlChiki',   bridge: 'bn' },
  sd:  { name: 'Sindhi',     nativeName: 'سنڌي',           bcp47: 'sd-IN', script: 'Arabic',    bridge: 'hi' },
};

// ── Code-switching detection ──────────────────────────────────────────────

/**
 * Common Tanglish / Hinglish patterns that indicate mixed language.
 * These appear in both Indian-language characters AND Latin script.
 */
const MIXED_PATTERNS = [
  // Tamil + English markers
  /பண்ண|போக|வேண்டும்|செய்ய|கேட்க/,
  // Hindi + English markers
  /करना|जाना|chahiye|batao/i,
  // Bengali + English
  /করতে|যাবো|বলুন/,
  // Assamese + English
  /কৰিব|যাওঁ|বুলিব/,
];

/**
 * Detect if text is mixed-language (code-switching).
 * @param {string} text
 * @returns {boolean}
 */
export function isMixedLanguage(text) {
  if (!text) return false;
  const hasLatin = /[a-zA-Z]{3,}/.test(text);
  const hasNonLatin = /[^\u0000-\u007F]/.test(text);
  const hasMixedPattern = MIXED_PATTERNS.some(re => re.test(text));
  return (hasLatin && hasNonLatin) || hasMixedPattern;
}

/**
 * Detect the primary language of a transcript.
 * For mixed-language, returns the non-English base language.
 *
 * @param {string} transcript
 * @returns {{ primary: string, isMixed: boolean, sarvamCode: string }}
 */
export function detectLanguage(transcript) {
  const primary = detectLanguageFromText(transcript);
  const mixed = isMixedLanguage(transcript);

  return {
    primary,
    isMixed: mixed,
    sarvamCode: getSarvamCode(primary),
    displayName: SUPPORTED_LANGUAGES[primary]?.nativeName || 'English',
  };
}

// ── Language preference management ───────────────────────────────────────

const LANG_STORAGE_KEY = 'suvidha_language';

/**
 * Get the current language preference.
 * Priority: sessionStorage > localStorage > browser language > 'en'
 */
export function getCurrentLanguage() {
  const stored =
    sessionStorage.getItem(LANG_STORAGE_KEY) ||
    localStorage.getItem('i18nextLng') ||
    navigator.language?.split('-')[0] ||
    'en';
  const base = stored.split('-')[0].toLowerCase();
  return SUPPORTED_LANGUAGES[base] ? base : 'en';
}

/**
 * Persist the detected/selected language.
 */
export function setLanguagePreference(langCode) {
  const base = langCode.split('-')[0].toLowerCase();
  if (!SUPPORTED_LANGUAGES[base]) return;
  sessionStorage.setItem(LANG_STORAGE_KEY, base);
}

/**
 * Get STT language code for the Web Speech API.
 */
export function getSTTLangCode(langCode) {
  const base = (langCode || 'en').split('-')[0].toLowerCase();
  return SUPPORTED_LANGUAGES[base]?.bcp47 || 'hi-IN';
}

// ── Text normalisation ────────────────────────────────────────────────────

/**
 * Normalise a voice transcript for intent matching.
 * Lowercases, removes punctuation noise, collapses whitespace.
 */
export function normaliseTranscript(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[.,!?;:'"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if a transcript contains a wake word variant.
 */
export const WAKE_WORDS = [
  'hey suvidha', 'hi suvidha', 'hello suvidha',
  'suvidha', 'suvidha start', 'suwidha', 'hey suvitha', 'suvitha',
  // Hindi
  'हे सुविधा', 'हेलो सुविधा', 'सुविधा',
  // Tamil
  'சுவிதா', 'ஹே சுவிதா',
  // Bengali/Assamese
  'সুবিধা', 'হে সুবিধা', 'হেলো সুবিধা',
  // Telugu
  'సువిధా', 'హే సువిధా',
  // Malayalam
  'സുവിധ', 'ഹേ സുവിധ',
  // Kannada
  'ಸುವಿಧ', 'ಹೇ ಸುವಿಧ',
];

export function isWakeWord(transcript) {
  const normalised = normaliseTranscript(transcript);
  return WAKE_WORDS.some(w => normalised.includes(w.toLowerCase()));
}

export default {
  SUPPORTED_LANGUAGES,
  detectLanguage,
  isMixedLanguage,
  getCurrentLanguage,
  setLanguagePreference,
  getSTTLangCode,
  normaliseTranscript,
  isWakeWord,
  WAKE_WORDS,
};
