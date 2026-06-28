/**
 * translatePivot.js — Assamese → English → reason → English → Assamese
 *
 * Open LLMs (Llama, Gemma) reason far better in English than Assamese —
 * training data is overwhelmingly English. conversationManager.js currently
 * asks the model to think AND respond directly in Assamese (chat.js system
 * prompt: "reply in the SAME language"). This pivots through English for
 * the reasoning step, using the same sarvamTranslate() already wired for
 * Tier-2 bridge languages.
 *
 * Only engages for Assamese — other languages already get acceptable
 * direct-response quality and don't need the extra two network round-trips.
 */
import { sarvamTranslate } from '../api/sarvamApi.js';
import { callNvidiaAI } from '../api/nvidiaApi.js';

const PIVOT_LANGS = new Set(['as']);

export function needsPivot(language) {
  const base = (language || '').toLowerCase().split('-')[0];
  return PIVOT_LANGS.has(base);
}

/**
 * Run one conversation turn through the English pivot.
 *
 * callNvidiaAI with jsonMode:true returns the structured envelope
 * { intent, response, speechSummary, language, confidence, action,
 * followUp, suggestions } (see conversationManager.js normaliseAIResponse).
 * `.response`, `.speechSummary`, and `.followUp` are natural-language text
 * needing translation — `.intent` and `.action.path` are keywords/routes,
 * translating those would break routing.
 *
 * @param {string} userMessage    - original-language transcript (Assamese)
 * @param {Array}  messages       - full message array as built by promptBuilder.js,
 *                                  with the latest user turn already in original language
 * @param {string} sourceLangCode - BCP-47, e.g. 'as-IN'
 * @returns {Promise<Object>} same envelope shape as callNvidiaAI, with
 *          .response/.followUp translated back to sourceLangCode
 */
export async function processWithEnglishPivot(userMessage, messages, sourceLangCode = 'as-IN') {
  const englishUserMessage = await sarvamTranslate(userMessage, sourceLangCode, 'en-IN');

  const englishMessages = messages.map((m, i) => {
    if (i === messages.length - 1 && m.role === 'user') {
      return { ...m, content: englishUserMessage };
    }
    return m;
  });

  const aiResponse = await callNvidiaAI(englishMessages, { stream: false, jsonMode: true });

  if (!aiResponse?.response) return aiResponse;

  const [translatedResponse, translatedSummary, translatedFollowUp] = await Promise.all([
    sarvamTranslate(aiResponse.response, 'en-IN', sourceLangCode),
    aiResponse.speechSummary
      ? sarvamTranslate(aiResponse.speechSummary, 'en-IN', sourceLangCode)
      : Promise.resolve(null),
    aiResponse.followUp ? sarvamTranslate(aiResponse.followUp, 'en-IN', sourceLangCode) : Promise.resolve(null),
  ]);

  return {
    ...aiResponse,
    response: translatedResponse,
    speechSummary: translatedSummary || translatedResponse,
    followUp: translatedFollowUp,
    language: sourceLangCode.split('-')[0],
    pivoted: true,
  };
}
