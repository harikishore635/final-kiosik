/**
 * VoiceAssistantProvider.jsx
 *
 * The single React context that powers SUVIDHA's conversational AI.
 * Wraps the entire app and provides:
 *  - aiState: 'idle' | 'listening' | 'processing' | 'speaking' | 'executing' | 'waiting'
 *  - transcript (live)
 *  - conversation history
 *  - activate / deactivate / sendMessage functions
 *  - action dispatching (routes AI JSON → safe UI actions)
 *
 * Usage:
 *   const { aiState, transcript, activate, sendMessage } = useVoiceAssistant();
 */

import React, {
  createContext, useContext, useState, useEffect,
  useCallback, useRef,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// AI Brain
import { processUtterance, resetSession } from '../brain/aiEngine.js';
// Voice
import { startSTT, stopSTT, isWebSpeechSupported } from '../voice/speechRecognition.js';
import { speak, stopSpeaking } from '../voice/speechSynthesis.js';
import { startBargeInListener, stopBargeInListener } from '../../utils/naturalVoice.js';
import { startWakeWordDetection, stopWakeWordDetection, pauseWakeWord, resumeWakeWord } from '../voice/wakeWord.js';
import { setInterimTranscript, setFinalTranscript, addAITranscript, clearTranscript } from '../voice/transcriptManager.js';
import { unlockAudio, requestMicPermission } from '../voice/audioManager.js';
// Actions
import { routeAction } from '../brain/intentRouter.js';
import { fillField, normaliseFieldValue, detectVisibleFormFields } from '../actions/formActions.js';
import { navigateToPage, navigateToOfficeLocator } from '../actions/navigationActions.js';
import { switchLanguage, showToast } from '../actions/uiActions.js';
import { readCurrentPage, scrollPage } from '../actions/kioskActions.js';
import { announceToScreenReader, enableHandsFreeMode } from '../actions/accessibilityActions.js';
// Memory
import { getCurrentLanguage, setLanguagePreference } from '../brain/multilingualProcessor.js';
import { generateGreeting } from '../brain/conversationManager.js';

// ── Context ───────────────────────────────────────────────────────────────

const VoiceAssistantContext = createContext(null);

export function useVoiceAssistant() {
  const ctx = useContext(VoiceAssistantContext);
  if (!ctx) throw new Error('useVoiceAssistant must be used inside VoiceAssistantProvider');
  return ctx;
}

// ── AI States ─────────────────────────────────────────────────────────────
// idle → listening → processing → speaking → executing → idle

// ── Provider ──────────────────────────────────────────────────────────────

export function VoiceAssistantProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n } = useTranslation();

  const [aiState, setAIState] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterim] = useState('');
  const [aiResponse, setAiResponse] = useState(null);
  const [messages, setMessages] = useState([]);    // conversation history for UI
  const [isActivated, setIsActivated] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState(null); // action waiting for confirm
  const [micPermission, setMicPermission] = useState('unknown');

  const activeRef = useRef(false);
  const languageRef = useRef(getCurrentLanguage());
  const sttRunningRef = useRef(false);
  const canCaptureTranscriptRef = useRef(true);
  const retryCountRef = useRef(0);
  const processMessageRef = useRef(null);

  // ── Helpers ─────────────────────────────────────────────────────────────

  const currentLanguage = () => {
    const lang = i18n.language?.split('-')[0] || languageRef.current;
    return lang;
  };

  const addMessage = useCallback((role, text, meta = {}) => {
    setMessages(prev => [
      ...prev,
      { id: Date.now() + Math.random(), role, text, timestamp: new Date(), ...meta },
    ]);
    if (role === 'assistant') addAITranscript(text);
    if (role === 'user')      setFinalTranscript(text);
  }, []);

  // ── TTS ──────────────────────────────────────────────────────────────────

  const RECOVERABLE_STT_ERRORS = ['no-speech', 'network', 'audio-capture', 'aborted'];

  const startListening = useCallback(() => {
    if (!activeRef.current || sttRunningRef.current) return;
    const lang = currentLanguage();
    setAIState('listening');
    startSTT({
      language: lang,
      continuous: true,
      autoRestart: true,
      onResult: (text) => {
        retryCountRef.current = 0;
        if (canCaptureTranscriptRef.current && text?.trim()) processMessageRef.current?.(text);
      },
      onInterim: (text) => {
        if (!canCaptureTranscriptRef.current) return;
        setInterim(text);
        setInterimTranscript(text);
      },
      onError: (err) => {
        const errType = typeof err === 'object' ? (err.error || err.type || '') : String(err);
        sttRunningRef.current = false;
        if (activeRef.current && RECOVERABLE_STT_ERRORS.includes(errType) && retryCountRef.current < 3) {
          retryCountRef.current++;
          const delay = Math.pow(2, retryCountRef.current) * 400;
          setTimeout(() => { if (activeRef.current) startListening(); }, delay);
        } else {
          retryCountRef.current = 0;
          if (activeRef.current) setAIState('idle');
        }
      },
    });
    sttRunningRef.current = true;
  }, []);

  const stopListening = useCallback(() => {
    if (!sttRunningRef.current) return;
    console.debug('[VoiceAssistant] STT stop');
    stopSTT();
    sttRunningRef.current = false;
  }, []);

  const speakResponse = useCallback(async (text, lang) => {
    if (!text) return;
    announceToScreenReader(text);
    const effectiveLang = lang || currentLanguage();
    try {
      await speak(text, {
        language: effectiveLang,
        chatbot: true,
        interrupt: true,
        onStart: () => {
          stopListening();
          canCaptureTranscriptRef.current = false;
          setInterim('');
          setInterimTranscript('');
          setAIState('speaking');
          startBargeInListener((bargeText) => {
            stopBargeInListener();
            stopSpeaking();
            if (bargeText?.trim()) processMessageRef.current?.(bargeText);
          }, effectiveLang);
        },
        onEnd: () => {
          stopBargeInListener();
          canCaptureTranscriptRef.current = true;
          if (activeRef.current) {
            startListening();
          } else {
            setAIState('idle');
          }
        },
      });
    } finally {
      stopBargeInListener();
      if (!activeRef.current) setAIState('idle');
    }
  }, [startListening, stopListening]);

  // ── Action dispatcher ─────────────────────────────────────────────────

  const dispatchAction = useCallback((aiResp) => {
    const action = aiResp?.action;
    if (!action) return;

    setAIState('executing');

    const ctx = {
      navigate,
      onFormFill: (fieldName, rawValue) => {
        const normalised = normaliseFieldValue(fieldName, rawValue);
        fillField(fieldName, normalised);
      },
      onFormSubmit: (formId) => {
        window.dispatchEvent(new CustomEvent('suvidha:submit-form', { detail: { formId } }));
      },
      onMapAction: (mapAction) => {
        window.dispatchEvent(new CustomEvent('suvidha:map-action', { detail: mapAction }));
      },
      onLanguageSwitch: (lang) => {
        switchLanguage(lang);
        i18n.changeLanguage(lang);
        languageRef.current = lang;
        setLanguagePreference(lang);
      },
      onReadPage: () => {
        const lang = currentLanguage();
        readCurrentPage((text, opts) => speak(text, opts), lang);
      },
      onNearbySearch: (category) => {
        navigateToOfficeLocator(navigate, category);
      },
      onConfirmRequired: (pendingAction, message) => {
        console.debug('[VoiceAssistant] action confirmation required', pendingAction?.type);
        setPendingConfirm({ action: pendingAction, message });
        setAIState('waiting_confirmation');
      },
    };

    const result = routeAction(aiResp, ctx);
    if (result?.actionType?.endsWith('_PENDING_CONFIRM')) {
      return;
    }
    setTimeout(() => setAIState(activeRef.current ? 'listening' : 'idle'), 300);
  }, [navigate, i18n]);

  const isConfirmation = useCallback((text) => {
    const value = (text || '').trim().toLowerCase();
    const yesWords = ['yes', 'yeah', 'yep', 'confirm', 'ok', 'okay', 'sure', 'go ahead', 'haan', 'ha', 'ji', 'ஆம்', 'ஆம் சரி', 'হয়', 'হয়', 'হ্যাঁ'];
    const noWords = ['no', 'nope', 'cancel', 'stop', 'dont', "don't", 'nah', 'not now', 'mat', 'illai', 'வேண்டாம்', 'না'];
    if (yesWords.some((w) => value === w || value.includes(` ${w}`) || value.includes(`${w} `))) return 'yes';
    if (noWords.some((w) => value === w || value.includes(` ${w}`) || value.includes(`${w} `))) return 'no';
    return null;
  }, []);

  // ── Main AI processing ────────────────────────────────────────────────

  const processMessage = useCallback(async (userText) => {
    if (!userText?.trim()) return;
    stopSpeaking();

    setTranscript(userText);
    console.log('Transcript:', userText);
    addMessage('user', userText);
    setAIState('processing');
    clearTranscript();

    const lang = currentLanguage();
    const confirmation = isConfirmation(userText);

    if (pendingConfirm && confirmation) {
      if (confirmation === 'yes') {
        const actionToRun = pendingConfirm.action;
        setPendingConfirm(null);
        console.debug('[VoiceAssistant] action confirmed', actionToRun?.type);
        addMessage('assistant', 'Confirmed. Executing now.');
        await speakResponse('Confirmed. Executing now.', lang);
        dispatchAction({ action: actionToRun });
      } else {
        console.debug('[VoiceAssistant] action cancelled');
        setPendingConfirm(null);
        setAIState('idle');
        const cancelText = 'Okay, I cancelled that action. How else can I help you?';
        addMessage('assistant', cancelText);
        await speakResponse(cancelText, lang);
      }
      return;
    }

    try {
      let streamingText = '';
      console.log('Sending to NVIDIA');
      const response = await processUtterance(userText, {
        currentPath: location.pathname,
        language: lang,
        onChunk: (chunk) => {
          streamingText += chunk;
        },
      });

      setAiResponse(response);
      console.debug('[VoiceAssistant] AI response', response);

      // Full detail goes in the chat window; speechSummary (short, same
      // language) is what actually gets spoken — see systemPrompt.js.
      const replyText = response.response || '';
      if (replyText) {
        addMessage('assistant', replyText, { intent: response.intent, action: response.action });
      }

      // Add quick suggestions to last message
      if (response.suggestions?.length) {
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === 'assistant') last.suggestions = response.suggestions;
          return updated;
        });
      }

      // Dispatch action
      if (response.action) {
        dispatchAction(response);
      }

      // Speak the SHORT summary, not the full detail text — the chat window
      // already shows the full response above.
      const replyLang = response.language || lang;
      await speakResponse(response.speechSummary || replyText, replyLang);

    } catch (err) {
      console.error('[VoiceAssistant] processMessage error:', err);
      setAIState('idle');
    }
  }, [location.pathname, addMessage, dispatchAction, speakResponse, isConfirmation, pendingConfirm]);

  // Keep ref current so barge-in callbacks inside speakResponse can call processMessage
  // without creating a circular useCallback dependency
  processMessageRef.current = processMessage;

  useEffect(() => {
    let mounted = true;
    (async () => {
      const granted = await requestMicPermission();
      if (mounted) {
        setMicPermission(granted ? 'granted' : 'denied');
      }
    })();
    return () => { mounted = false; };
  }, []);

  // ── Activation ────────────────────────────────────────────────────────

  const activate = useCallback(async () => {
    if (activeRef.current) return;
    activeRef.current = true;
    setIsActivated(true);

    // Unlock audio (required for iOS/Safari)
    unlockAudio();

    // Request mic if not yet
    if (micPermission !== 'granted') {
      const granted = await requestMicPermission();
      setMicPermission(granted ? 'granted' : 'denied');
      if (!granted) {
        setAIState('idle');
        return;
      }
    }

    // Pause wake word — we're now in active mode
    pauseWakeWord();

    // Greeting
    const lang = currentLanguage();
    const greeting = generateGreeting(lang, location.pathname);
    addMessage('assistant', greeting);
    await speakResponse(greeting, lang);

    startListening();
  }, [micPermission, location.pathname, addMessage, speakResponse, startListening]);

  const deactivate = useCallback(() => {
    stopListening();
    stopSpeaking();
    setAIState('idle');
    setIsActivated(false);
    setInterim('');
    setPendingConfirm(null);
    canCaptureTranscriptRef.current = true;
    activeRef.current = false;

    // Resume background wake word
    resumeWakeWord(currentLanguage());
  }, [stopListening]);

  // ── Text input (from keyboard / chatbot) ────────────────────────────

  const sendMessage = useCallback(async (text) => {
    if (!text?.trim()) return;
    if (!isActivated) {
      setIsActivated(true);
      pauseWakeWord();
    }
    await processMessage(text);
  }, [isActivated, processMessage]);

  // ── Confirm/cancel pending action ────────────────────────────────────

  const confirmPendingAction = useCallback(() => {
    if (!pendingConfirm) return;
    console.debug('[VoiceAssistant] action confirmed from UI', pendingConfirm.action?.type);
    dispatchAction({ action: pendingConfirm.action });
    setPendingConfirm(null);
    setAIState(activeRef.current ? 'listening' : 'idle');
  }, [pendingConfirm, dispatchAction]);

  const cancelPendingAction = useCallback(() => {
    console.debug('[VoiceAssistant] action cancelled from UI');
    setPendingConfirm(null);
    setAIState(activeRef.current ? 'listening' : 'idle');
    addMessage('assistant', 'Action cancelled. How else can I help you?');
  }, [addMessage]);

  // ── Wake word setup ────────────────────────────────────────────────

  useEffect(() => {
    const lang = currentLanguage();
    startWakeWordDetection(() => {
      if (!activeRef.current) activate();
    }, lang);

    return () => {
      stopWakeWordDetection();
      stopListening();
      stopSpeaking();
    };
  }, [activate, stopListening]);  // mount once

  // ── Language change ────────────────────────────────────────────────

  useEffect(() => {
    const lang = i18n.language?.split('-')[0] || 'en';
    languageRef.current = lang;
  }, [i18n.language]);

  // ── Listen for custom UI events ────────────────────────────────────

  useEffect(() => {
    const handleScrollEvent = (e) => scrollPage(e.detail?.direction);
    const handleReadPage = () => {
      const lang = currentLanguage();
      readCurrentPage((text, opts) => speak(text, opts), lang);
    };
    const handleHandsFree = () => {
      enableHandsFreeMode();
      activate();
    };

    window.addEventListener('suvidha:scroll-page', handleScrollEvent);
    window.addEventListener('suvidha:read-page', handleReadPage);
    window.addEventListener('suvidha:activate-ai', activate);
    window.addEventListener('suvidha:hands-free-enabled', handleHandsFree);

    return () => {
      window.removeEventListener('suvidha:scroll-page', handleScrollEvent);
      window.removeEventListener('suvidha:read-page', handleReadPage);
      window.removeEventListener('suvidha:activate-ai', activate);
      window.removeEventListener('suvidha:hands-free-enabled', handleHandsFree);
    };
  }, [activate]);

  // ── Logout / session reset ─────────────────────────────────────────

  useEffect(() => {
    const handleLogout = () => {
      deactivate();
      resetSession();
      setMessages([]);
    };
    window.addEventListener('suvidha:logout', handleLogout);
    return () => window.removeEventListener('suvidha:logout', handleLogout);
  }, [deactivate]);

  // ── Context value ──────────────────────────────────────────────────

  const value = {
    // State
    aiState,
    transcript,
    interimTranscript,
    aiResponse,
    messages,
    isActivated,
    pendingConfirm,
    micPermission,
    // Actions
    activate,
    deactivate,
    sendMessage,
    confirmPendingAction,
    cancelPendingAction,
    // Utilities
    currentLanguage: currentLanguage(),
    isListening: aiState === 'listening',
    isProcessing: aiState === 'processing',
    isSpeaking: aiState === 'speaking',
    isIdle: aiState === 'idle',
  };

  return (
    <VoiceAssistantContext.Provider value={value}>
      {children}
    </VoiceAssistantContext.Provider>
  );
}

export default VoiceAssistantProvider;
