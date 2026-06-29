/**
 * conversationManager.js - Conversation Turn Manager
 *
 * AI calls route through /api/chat (server-side proxy) — NVIDIA key stays
 * server-only, never in the browser bundle. callNvidiaAI removed from this
 * file; the server's 4-tier cascade (Sarvam 105B → Sarvam NIM → Llama 70B
 * → Gemma) handles model selection transparently.
 */

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
import SERVICE_KNOWLEDGE from '../prompts/serviceKnowledge.js';

// ── Offline knowledge lookup ──────────────────────────────────────────────────
// When server is unreachable: match query against static knowledge base keywords.
// Not a vector search — keyword scan of service names + descriptions.
// Covers the most common "what documents / fee / timeframe" questions offline.
const KEYWORD_TO_CATEGORY = {
  electricity: 'electricity', 'electric': 'electricity', 'bijli': 'electricity',
  'বিজুলী': 'electricity', 'apdcl': 'electricity', 'meter': 'electricity',
  gas: 'gas', 'lpg': 'gas', 'agcl': 'gas', 'cylinder': 'gas', 'গেছ': 'gas',
  water: 'water', 'পানী': 'water', 'jal': 'water', 'pipe': 'water',
  municipal: 'municipal', 'property tax': 'municipal', 'birth certificate': 'municipal',
  healthcare: 'healthcare', 'hospital': 'healthcare', 'ayushman': 'healthcare',
  'স্বাস্থ্য': 'healthcare', 'vaccination': 'healthcare', 'ambulance': 'healthcare',
  transport: 'transport', 'bus': 'transport', 'licence': 'transport', 'license': 'transport',
  'vehicle': 'transport', 'astc': 'transport', 'পৰিবহন': 'transport',
  scheme: 'schemes', 'orunodoi': 'schemes', 'pm-kisan': 'schemes', 'kisan': 'schemes',
  'pension': 'schemes', 'scholarship': 'schemes', 'অৰুণোদয়': 'schemes',
  sanitation: 'municipal', 'toilet': 'municipal', 'swachh': 'municipal',
  aadhaar: 'aadhaar', 'আধাৰ': 'aadhaar', 'uid': 'aadhaar',
  income: 'revenue', 'caste': 'revenue', 'land record': 'revenue',
};

function offlineKnowledgeReply(userMessage, language) {
  const lower = userMessage.toLowerCase();
  let matchedCat = null;
  for (const [kw, cat] of Object.entries(KEYWORD_TO_CATEGORY)) {
    if (lower.includes(kw) || userMessage.includes(kw)) { matchedCat = cat; break; }
  }

  if (!matchedCat) return null;
  const cat = SERVICE_KNOWLEDGE[matchedCat];
  if (!cat) return null;

  const services = cat.services || cat.list || [];
  if (!services.length) return null;

  const lines = services.map(s => {
    const docs = s.documents?.join(', ') || '';
    const fee = s.fee ? ` | Fee: ${s.fee}` : '';
    const time = s.timeframe ? ` | Time: ${s.timeframe}` : '';
    return `${s.name}${docs ? ` — Docs: ${docs}` : ''}${fee}${time}`;
  });

  const helpline = cat.helpline ? ` Helpline: ${cat.helpline}.` : '';
  const reply = `${cat.department} — ${lines[0]}.${helpline} Tap ${matchedCat} in the menu to apply.`;
  return reply;
}

// Pre-warm MiniLLM in background — first real use will be instant
prewarmSemanticMatcher();

/**
 * POST user message to the server /api/chat proxy.
 * Returns the plain-text reply string, or null on failure.
 */
async function callServerChatProxy(userMessage, language, currentPath) {
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
  const contextKey = (currentPath || '/').split('/').filter(Boolean)[0] || '';

  const resp = await fetch(`${apiBase}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: userMessage, language, context: contextKey }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!resp.ok) {
    throw new Error(`Chat server error: ${resp.status}`);
  }
  const data = await resp.json();
  return data.reply || null;
}

export async function processConversationTurn(userMessage, options = {}) {
  const { currentPath = '/', language: inputLang } = options;

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
      speechSummary: buildNavigationResponse(intent, language),
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

  let aiResponse;
  try {
    if (needsPivot(language)) {
      // Assamese: translate AS→EN, call server in EN, translate EN→AS
      aiResponse = await processWithEnglishPivot(userMessage, language, currentPath, callServerChatProxy);
      if (!aiResponse) aiResponse = buildOfflineResponse(language, userMessage);
    } else {
      const reply = await callServerChatProxy(userMessage, language, currentPath);
      aiResponse = reply
        ? { response: reply, language }
        : buildOfflineResponse(language, userMessage);
    }
    console.log('[ConversationManager] Server chat ok, lang:', language);
  } catch (err) {
    console.error('[ConversationManager] AI call failed:', err.message);
    aiResponse = buildOfflineResponse(language, userMessage);
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

  const response = raw.response || 'I am here to help. How can I assist you?';
  return {
    intent: raw.intent || 'general_response',
    response,
    speechSummary: raw.speechSummary || response,
    language: raw.language || fallbackLanguage,
    confidence: typeof raw.confidence === 'number' ? raw.confidence : 0.7,
    action: raw.action || null,
    followUp: raw.followUp || null,
    suggestions: Array.isArray(raw.suggestions) ? raw.suggestions : [],
    offline: raw.offline || false,
    pivoted: raw.pivoted || false,
  };
}

function buildErrorResponse(reason = '', language = 'en') {
  const text = 'I am having trouble processing your request. Please try again or use the navigation menu.';
  return {
    intent: 'error',
    response: text,
    speechSummary: text,
    language,
    confidence: 0,
    action: null,
    followUp: null,
    suggestions: [],
    error: reason,
  };
}

function buildOfflineResponse(language = 'en', userMessage = '') {
  // Try static knowledge base first — answers "what docs / fee" questions offline
  const knowledgeReply = userMessage ? offlineKnowledgeReply(userMessage, language) : null;
  if (knowledgeReply) {
    return {
      intent: 'service_info',
      response: knowledgeReply,
      speechSummary: knowledgeReply,
      language,
      confidence: 0.6,
      action: null,
      followUp: null,
      suggestions: [],
      offline: true,
      source: 'knowledge-base',
    };
  }

  const msgs = {
    hi: 'सेवा अभी उपलब्ध नहीं। कृपया मेनू का उपयोग करें।',
    as: 'সেৱা এতিয়া উপলব্ধ নহয়। মেনু ব্যৱহাৰ কৰক।',
  };
  const text = msgs[language] || 'AI service is temporarily unavailable. Please use the menu to navigate services.';
  return {
    intent: 'service_degraded',
    response: text,
    speechSummary: text,
    language,
    confidence: 1,
    action: null,
    followUp: null,
    suggestions: [],
    offline: false,
  };
}

export function generateGreeting(language = 'en') {
  return "Hello! I'm SUVIDHA, your assistant for government services. How can I help you today?";
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
