/**
 * conversationManager.js - Conversation Turn Manager
 */

import { callNvidiaAI } from '../api/nvidiaApi.js';
import { buildMessages } from './promptBuilder.js';
import {
  addMessage,
  extractAndStoreEntities,
  updateContext,
} from './contextMemory.js';
import { detectLanguage, setLanguagePreference } from './multilingualProcessor.js';
import { semanticMatch, prewarmSemanticMatcher } from './semanticIntentMatcher.js';
import { INTENT_TO_PATH } from './intentRouter.js';
import { needsPivot, processWithEnglishPivot } from './translatePivot.js';

// Pre-warm MiniLLM in background — first real use will be instant
prewarmSemanticMatcher();

export async function processConversationTurn(userMessage, options = {}) {
  const { currentPath = '/', language: inputLang, onChunk } = options;

  if (!userMessage?.trim()) {
    return buildErrorResponse('Empty message received.');
  }

  const langInfo = detectLanguage(userMessage);
  const language = inputLang || langInfo.primary;
  setLanguagePreference(language);

  addMessage('user', userMessage, { language, detectedMixed: langInfo.isMixed });
  updateContext({ language, detectedLanguage: langInfo.primary });

  // ── Semantic fast-path: try MiniLLM intent classification before LLM call ──
  // For simple navigation queries, this avoids a full cloud LLM round-trip.
  // Threshold 0.55 = high confidence only; ambiguous queries fall through to LLM.
  const semanticResult = await semanticMatch(userMessage, 0.55);
  if (semanticResult) {
    const { intent, confidence } = semanticResult;
    const path = INTENT_TO_PATH[intent];
    console.debug(`[ConversationManager] Semantic fast-path: ${intent} (${confidence.toFixed(3)})`);
    const fastResponse = {
      intent,
      response: buildNavigationResponse(intent, language),
      language,
      confidence,
      action: path ? { type: 'NAVIGATE_PAGE', path } : null,
      followUp: null,
      suggestions: [],
      offline: false,
      source: 'semantic',
    };
    addMessage('assistant', fastResponse.response, { intent, language });
    return fastResponse;
  }

  const messages = buildMessages(userMessage, {
    currentPath,
    language,
    includeKnowledge: true,
  });

  let aiResponse;
  try {
    if (needsPivot(language)) {
      // Open LLMs reason better in English than Assamese — pivot through
      // English instead of asking the model to think in Assamese directly.
      aiResponse = await processWithEnglishPivot(userMessage, messages, langInfo.sarvamCode || 'as-IN');
    } else {
      // Always non-streaming: voice speaks after full reply; streaming prevents
      // response_format:json_object which causes JSON parse failures
      aiResponse = await callNvidiaAI(messages, {
        stream: false,
        jsonMode: true,
      });
    }
    console.log('[ConversationManager] NVIDIA ok, intent:', aiResponse?.intent);
  } catch (err) {
    console.error('[ConversationManager] AI call failed:', err);
    aiResponse = buildOfflineResponse(language);
  }

  aiResponse = normaliseAIResponse(aiResponse, language);

  addMessage('assistant', aiResponse.response, {
    intent: aiResponse.intent,
    action: aiResponse.action,
    language: aiResponse.language,
  });

  extractAndStoreEntities(aiResponse);
  return aiResponse;
}

function normaliseAIResponse(raw, fallbackLanguage = 'en') {
  if (!raw || typeof raw !== 'object') {
    return buildErrorResponse('Invalid AI response format.', fallbackLanguage);
  }

  return {
    intent: raw.intent || 'general_response',
    response: raw.response || 'I am here to help. How can I assist you?',
    language: raw.language || fallbackLanguage,
    confidence: typeof raw.confidence === 'number' ? raw.confidence : 0.7,
    action: raw.action || null,
    followUp: raw.followUp || null,
    suggestions: Array.isArray(raw.suggestions) ? raw.suggestions : [],
    offline: raw.offline || false,
  };
}

function buildErrorResponse(reason = '', language = 'en') {
  const text = 'I am having trouble processing your request. Please try again or use the navigation menu.';
  return {
    intent: 'error',
    response: text,
    language,
    confidence: 0,
    action: null,
    followUp: null,
    suggestions: [],
    error: reason,
  };
}

function buildOfflineResponse(language = 'en') {
  return {
    intent: 'service_degraded',
    response: 'AI response generation is temporarily unavailable. Please try again or use the navigation menu.',
    language,
    confidence: 1,
    action: null,
    followUp: null,
    suggestions: [],
    offline: false,
  };
}

export function generateGreeting(language = 'en', currentPath = '/') {
  return "Hello! I'm SUVIDHA, your AI assistant for government services. How can I help you today?";
}

// Short response for semantic fast-path navigations (no LLM needed)
const NAV_RESPONSES = {
  navigate_electricity:    'Taking you to Electricity services.',
  navigate_gas:            'Taking you to Gas services.',
  navigate_water:          'Taking you to Water services.',
  navigate_municipal:      'Taking you to Municipal services.',
  navigate_complaints:     'Opening Complaint Registration.',
  navigate_track:          'Opening Request Tracking.',
  navigate_home:           'Returning to Home.',
  navigate_schemes:        'Opening Government Schemes.',
  navigate_login:          'Taking you to Login.',
  navigate_office_locator: 'Opening Office Locator.',
};

function buildNavigationResponse(intent) {
  return NAV_RESPONSES[intent] || 'Navigating...';
}

export default {
  processConversationTurn,
  generateGreeting,
};
