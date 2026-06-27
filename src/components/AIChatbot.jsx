import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { naturalSpeak, startBargeInListener, stopBargeInListener } from '../utils/naturalVoice';
import { stopTTS } from '../utils/ttsService';
import { startSTT, stopSTT } from '../ai/voice/speechRecognition';
import SYSTEM_PROMPT from '../ai/prompts/systemPrompt';
import { I, ic } from './kiosk';
import { AiTypingBubble } from './loading';
import { mockDelayRange } from '../utils/mockDelay';

const extractContext = (pathname) => {
  if (pathname.includes('electric')) return 'electricity';
  if (pathname.includes('gas')) return 'gas';
  if (pathname.includes('municipal') || pathname.includes('water') || pathname.includes('sanitation')) return 'municipal';
  if (pathname.includes('healthcare')) return 'healthcare';
  if (pathname.includes('transport')) return 'transport';
  return '';
};

const getSuggestionsByContext = (context, t) => {
  const suggestions = {
    '':          [
      t('chatbot.sugg1', 'What services are available?'),
      t('chatbot.sugg2', 'How do I track my request?'),
      t('chatbot.sugg3', 'Which schemes am I eligible for?'),
    ],
    electricity: [
      t('chatbot.elec1', 'How to apply for new connection?'),
      t('chatbot.elec2', 'My meter is broken or damaged'),
      t('chatbot.elec3', 'I got a wrong electricity bill'),
    ],
    gas: [
      t('chatbot.gas1', 'Apply for new gas connection'),
      t('chatbot.gas2', 'How to view my gas bills?'),
      t('chatbot.gas3', 'Report gas meter damage'),
    ],
    municipal: [
      t('chatbot.muni1', 'Apply for new water connection'),
      t('chatbot.muni2', 'Report road damage or potholes'),
      t('chatbot.muni3', 'Garbage not collected in my area'),
    ],
    healthcare: [
      t('chatbot.hlth1', 'Book a hospital appointment'),
      t('chatbot.hlth2', 'Vaccination schedule near me'),
      t('chatbot.hlth3', 'Ayushman Bharat eligibility'),
    ],
    transport: [
      t('chatbot.trans1', 'Bus timings and routes'),
      t('chatbot.trans2', 'Book a transport ticket'),
      t('chatbot.trans3', 'Report road or traffic issue'),
    ],
  };
  return suggestions[context] || suggestions[''];
};

// Full STT language map — matches ttsService
const STT_LANG_MAP = {
  en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN',
  kn: 'kn-IN', ml: 'ml-IN', mr: 'mr-IN', gu: 'gu-IN',
  bn: 'bn-IN', or: 'or-IN', pa: 'pa-IN', as: 'as-IN',
  ur: 'hi-IN', ks: 'hi-IN', sd: 'hi-IN', mai: 'hi-IN',
  kok: 'hi-IN', doi: 'hi-IN', ne: 'hi-IN', sa: 'hi-IN',
  mni: 'hi-IN', sat: 'hi-IN',
};

const PROVIDER_LABELS = {
  'suvidha-ai': ' SUVIDHA AI',
  'sarvam-105b': ' SUVIDHA AI',
  'sarvam-nim': ' SUVIDHA AI',
  'llama-nim': ' SUVIDHA AI',
  'NVIDIA NIM · Nemotron': ' SUVIDHA AI',
  'offline_mode': ' SUVIDHA AI',
  'huggingface': ' SUVIDHA AI',
  'none': ' SUVIDHA AI',
};

// Conversation history for context window
const conversationHistory = [];

const AIChatbot = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [isSpeakingReply, setIsSpeakingReply] = useState(false);
  const [lastProvider, setLastProvider] = useState('');
  const [streamingText, setStreamingText] = useState('');

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  const context = extractContext(location.pathname);
  const userLang = (i18n.language || 'en').split('-')[0];
  const sttLangCode = STT_LANG_MAP[userLang] || 'hi-IN';

  // Welcome message with natural greeting
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeText = t('chatbot.welcome');
      setMessages([{
        id: 1, type: 'bot',
        text: welcomeText,
        timestamp: new Date(),
        provider: 'local',
      }]);
      // Read welcome aloud
      setTimeout(() => naturalSpeak(welcomeText, { language: userLang }), 400);
    }
  }, [isOpen, messages.length, userLang]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Opened from the kiosk shell's bottom-bar "AI Chat" button (VK.jsx)
  useEffect(() => {
    const handleOpenChat = () => setIsOpen(true);
    window.addEventListener('suvidha:open-chat', handleOpenChat);
    return () => window.removeEventListener('suvidha:open-chat', handleOpenChat);
  }, []);

  // When chatbot opens, stop any ongoing TTS (barge-in to chat)
  useEffect(() => {
    if (isOpen) {
      stopTTS();
      stopBargeInListener();
    }
  }, [isOpen]);

  // Execute AI action returned from NVIDIA NIM
  const executeAction = useCallback((action) => {
    if (!action?.type) return;
    switch (action.type) {
      case 'NAVIGATE_PAGE':
        if (action.path) {
          setTimeout(() => { navigate(action.path); setIsOpen(false); }, 800);
        }
        break;
      case 'SWITCH_LANGUAGE':
        if (action.language) {
          i18n.changeLanguage(action.language);
          sessionStorage.setItem('userLanguage', action.language);
        }
        break;
      case 'TRACK_APPLICATION':
        navigate(`/track-status?q=${encodeURIComponent(action.query || '')}`);
        setIsOpen(false);
        break;
      case 'EMERGENCY_ALERT':
        window.dispatchEvent(new CustomEvent('suvidha:open-emergency'));
        break;
      case 'ESCALATE_HUMAN':
        window.dispatchEvent(new CustomEvent('suvidha:escalate'));
        break;
      default:
        break;
    }
  }, [navigate, i18n]);

  const callNvidiaChat = useCallback(async (userMessage, onChunk) => {
    conversationHistory.push({ role: 'user', content: userMessage });
    if (conversationHistory.length > 20) conversationHistory.splice(0, 2);

    const pageContext = extractContext(location.pathname);

    try {
      setLastProvider('sarvam-105b');
      const [resp] = await Promise.all([
        fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessage,
            language: userLang,
            context: pageContext || '',
          }),
          signal: AbortSignal.timeout(20000),
        }),
        mockDelayRange(2200, 2800),
      ]);

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      const replyText = data.reply || t('chatbot.error');
      conversationHistory.push({ role: 'assistant', content: replyText });
      setLastProvider(data.provider || 'sarvam-105b');

      // Simulate streaming by calling onChunk with full text
      if (onChunk) onChunk(replyText, replyText);

      return { response: replyText, language: data.language || userLang, action: null };
    } catch (err) {
      console.error('[Chatbot] API call failed:', err.message);
      return { response: t('chatbot.unavailable'), intent: 'error', action: null };
    }
  }, [location.pathname, userLang, t]);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isTyping) return;

    stopTTS();
    stopBargeInListener();

    const userMsg = { id: Date.now(), type: 'user', text: text.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);
    setStreamingText('');

    // Streaming bot placeholder
    const botId = Date.now() + 1;
    setMessages(prev => [...prev, { id: botId, type: 'bot', text: '', streaming: true, timestamp: new Date() }]);

    let finalResponse = null;
    let accumulated = '';

    finalResponse = await callNvidiaChat(text.trim(), (chunk, full) => {
      accumulated = full;
      setStreamingText(full);
      setMessages(prev => prev.map(m =>
        m.id === botId ? { ...m, text: full } : m
      ));
    });

    // Finalise — extract clean response text and action
    const replyText = (typeof finalResponse === 'object' ? finalResponse?.response : finalResponse)
      || accumulated
      || t('chatbot.error');

    const action = typeof finalResponse === 'object' ? finalResponse?.action : null;
    const suggestions = typeof finalResponse === 'object' ? finalResponse?.suggestions : null;
    const provider = lastProvider || 'NVIDIA NIM';
    const detectedLang = typeof finalResponse === 'object' ? finalResponse?.language : null;

    setMessages(prev => prev.map(m =>
      m.id === botId
        ? { ...m, text: replyText, streaming: false, action, suggestions, provider, language: detectedLang || userLang }
        : m
    ));
    setIsTyping(false);
    setStreamingText('');

    // Execute navigation/language actions from AI
    if (action) executeAction(action);

    // Speak reply — start barge-in BEFORE speaking so user can interrupt immediately
    startBargeInListener((spokenText) => {
      stopBargeInListener();
      if (spokenText?.trim()) sendMessage(spokenText);
    }, userLang);
    naturalSpeak(replyText, { language: finalResponse?.language || userLang, priority: 'normal' })
      .finally(() => stopBargeInListener());
  }, [isTyping, i18n.language, userLang, callNvidiaChat, executeAction, lastProvider, t]);

  const handleSend = () => sendMessage(input);
  const handleSuggestionClick = (suggestion) => sendMessage(suggestion);
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── STT Voice Input (unified — browser first, Sarvam fallback) ────────────
  const stopListening = useCallback(() => {
    setIsListening(false);
    stopSTT();
  }, []);

  const startListening = useCallback(async () => {
    setVoiceError('');
    setIsListening(true);
    stopTTS();
    stopBargeInListener();

    await startSTT({
      language: sttLangCode,
      continuous: false,
      autoRestart: false,
      onResult: (text) => {
        setIsListening(false);
        if (text.trim()) {
          setInput(text);
          setTimeout(() => sendMessage(text), 300);
        } else {
          setVoiceError(t('chatbot.noSpeech', 'No speech detected.'));
        }
      },
      onInterim: () => {},
      onError: () => {
        setIsListening(false);
        setVoiceError(t('chatbot.voiceError', 'Voice recognition failed. Please type.'));
      },
    });
  }, [sttLangCode, t, sendMessage]);

  const toggleVoice = () => {
    if (isListening) stopListening();
    else startListening();
  };

  const readLastReply = () => {
    const lastBot = [...messages].reverse().find(m => m.type === 'bot');
    if (!lastBot) return;
    setIsSpeakingReply(true);
    naturalSpeak(lastBot.text, { language: i18n.language, interrupt: true })
      .finally(() => setIsSpeakingReply(false));
  };

  const stopSpeaking = () => {
    stopTTS();
    stopBargeInListener();
    setIsSpeakingReply(false);
  };

  const hiddenPaths = ['/', '/login'];
  if (hiddenPaths.includes(location.pathname)) return null;

  const providerLabel = PROVIDER_LABELS[lastProvider] || 'Sarvam AI · NVIDIA NIM';

  return (
    <>
      {/* Chat panel — opened via VK bottom-bar "AI Chat" button (suvidha:open-chat event) */}
      {isOpen && (
        <div
          style={{
            position: 'fixed', right: 0, top: 0, bottom: 0, width: 'calc(900px * var(--ui-scale))',
            background: 'var(--surface-0)', borderLeft: '1px solid var(--line)',
            boxShadow: '-40px 0 90px rgba(20,16,31,.28)',
            display: 'flex', flexDirection: 'column', zIndex: 9000,
          }}
          role="dialog" aria-label="SUVIDHA AI Assistant"
        >
          {/* Header */}
          <div style={{
            background: 'var(--indigo-700)', color: 'var(--cream)',
            padding: 'calc(40px * var(--ui-scale)) calc(44px * var(--ui-scale))', display: 'flex', alignItems: 'center', gap: 'calc(24px * var(--ui-scale))', flexShrink: 0,
          }}>
            <div style={{ width: 'calc(96px * var(--ui-scale))', height: 'calc(96px * var(--ui-scale))', borderRadius: 'calc(26px * var(--ui-scale))', background: 'rgba(255,255,255,.16)', display: 'grid', placeItems: 'center' }}>
              <I d={ic.chat} size={52} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 'calc(46px * var(--ui-scale))', fontWeight: 800, letterSpacing: '-.01em' }}>
                {t('chatbot.title')}
              </div>
              <div style={{ fontSize: 'calc(28px * var(--ui-scale))', opacity: .85, marginTop: 'calc(8px * var(--ui-scale))', display: 'flex', alignItems: 'center', gap: 'calc(14px * var(--ui-scale))' }}>
                <span style={{ width: 'calc(18px * var(--ui-scale))', height: 'calc(18px * var(--ui-scale))', borderRadius: '50%', background: isListening ? 'var(--warn)' : 'var(--ok)', display: 'inline-block' }} />
                {isListening ? t('chatbot.listeningStatus') : providerLabel}
              </div>
            </div>
            {messages.some(m => m.type === 'bot' && m.id !== 1) && !isSpeakingReply && (
              <button
                style={{ width: 'calc(80px * var(--ui-scale))', height: 'calc(80px * var(--ui-scale))', borderRadius: 'calc(22px * var(--ui-scale))', background: 'rgba(255,255,255,.14)', border: 'none', color: 'var(--cream)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                onClick={readLastReply}
                aria-label={t('chatbot.readReplyAloud')}
              >
                <I d={ic.voice} size={44} />
              </button>
            )}
            {isSpeakingReply && (
              <button
                style={{ width: 'calc(80px * var(--ui-scale))', height: 'calc(80px * var(--ui-scale))', borderRadius: 'calc(22px * var(--ui-scale))', background: 'rgba(255,255,255,.14)', border: 'none', color: 'var(--cream)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                onClick={stopSpeaking}
                aria-label="Stop speaking"
              >
                <I d={ic.voice} size={44} />
              </button>
            )}
            <button
              style={{ width: 'calc(80px * var(--ui-scale))', height: 'calc(80px * var(--ui-scale))', borderRadius: 'calc(22px * var(--ui-scale))', background: 'rgba(255,255,255,.14)', border: 'none', color: 'var(--cream)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
              onClick={() => { setIsOpen(false); stopListening(); stopTTS(); }}
              aria-label={t('app.close')}
            >
              <I d={ic.x} size={44} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 'calc(44px * var(--ui-scale))', display: 'flex', flexDirection: 'column', gap: 'calc(32px * var(--ui-scale))', background: 'var(--surface-1)' }}
               role="log" aria-live="polite" aria-label="Chat messages">
            {messages.map((msg) => (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.type === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: 'calc(660px * var(--ui-scale))',
                  background: msg.type === 'user' ? 'var(--indigo-700)' : '#fff',
                  color: msg.type === 'user' ? 'var(--cream)' : 'var(--ink-900)',
                  border: msg.type === 'bot' ? '1px solid var(--line)' : 'none',
                  borderRadius: msg.type === 'user' ? 'calc(32px * var(--ui-scale)) calc(32px * var(--ui-scale)) calc(10px * var(--ui-scale)) calc(32px * var(--ui-scale))' : 'calc(32px * var(--ui-scale)) calc(32px * var(--ui-scale)) calc(32px * var(--ui-scale)) calc(10px * var(--ui-scale))',
                  padding: 'calc(32px * var(--ui-scale)) calc(38px * var(--ui-scale))', fontSize: 'calc(34px * var(--ui-scale))', lineHeight: 1.55,
                  boxShadow: msg.type === 'bot' ? 'var(--shadow-1)' : 'none',
                }}>
                  {msg.text}
                  {msg.streaming && (
                    <span style={{ display: 'inline-block', width: 'calc(8px * var(--ui-scale))', height: 'calc(28px * var(--ui-scale))', background: 'var(--indigo-500)', borderRadius: 3, marginLeft: 6, animation: 'dot 1s infinite' }} />
                  )}
                </div>

                {/* AI-suggested quick replies */}
                {msg.type === 'bot' && !msg.streaming && msg.suggestions?.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(16px * var(--ui-scale))', marginTop: 'calc(16px * var(--ui-scale))', maxWidth: 'calc(700px * var(--ui-scale))' }}>
                    {msg.suggestions.map((s, i) => (
                      <button key={i}
                              style={{ background: 'var(--indigo-100)', color: 'var(--indigo-700)', border: '1.5px solid color-mix(in oklab,var(--indigo-700) 22%,white)', borderRadius: 999, padding: 'calc(20px * var(--ui-scale)) calc(30px * var(--ui-scale))', fontSize: 'calc(28px * var(--ui-scale))', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                              onClick={() => handleSuggestionClick(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {/* Language + Provider badge on last bot message */}
                {msg.type === 'bot' && !msg.streaming && (msg.language && msg.language !== 'en' || msg.provider) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
                    {msg.language && msg.language !== 'en' && (
                      <span className="badge b-warn">{msg.language.toUpperCase()}</span>
                    )}
                    {msg.provider && (
                      <span className="meta">{PROVIDER_LABELS[msg.provider] || msg.provider}</span>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Context suggestions when idle */}
            {!isTyping && messages.length > 0 && messages.at(-1)?.type === 'bot' && !messages.at(-1)?.suggestions?.length && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(16px * var(--ui-scale))' }}>
                {getSuggestionsByContext(context, t).map((s, i) => (
                  <button key={i}
                          style={{ background: 'var(--indigo-100)', color: 'var(--indigo-700)', border: '1.5px solid color-mix(in oklab,var(--indigo-700) 22%,white)', borderRadius: 999, padding: 'calc(20px * var(--ui-scale)) calc(30px * var(--ui-scale))', fontSize: 'calc(28px * var(--ui-scale))', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                          onClick={() => handleSuggestionClick(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Typing bubble */}
            {isTyping && !messages.some(m => m.streaming) && (
              <div style={{ alignSelf: 'flex-start' }}>
                <AiTypingBubble />
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Voice error */}
          {voiceError && (
            <div style={{ padding: '0 calc(44px * var(--ui-scale)) calc(16px * var(--ui-scale))' }}>
              <span className="badge b-err">{voiceError}</span>
            </div>
          )}

          {/* Input row */}
          <div style={{ padding: 'calc(36px * var(--ui-scale)) calc(44px * var(--ui-scale))', borderTop: '1px solid var(--line)', background: 'var(--surface-0)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(24px * var(--ui-scale))' }}>
              {/* Mic */}
              <button
                onClick={toggleVoice}
                disabled={isTyping}
                style={{
                  width: 'calc(104px * var(--ui-scale))', height: 'calc(104px * var(--ui-scale))', borderRadius: '50%', border: 'none', cursor: 'pointer',
                  flexShrink: 0, display: 'grid', placeItems: 'center',
                  background: isListening ? 'var(--err)' : 'var(--indigo-100)',
                  color: isListening ? '#fff' : 'var(--indigo-700)',
                }}
                aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
              >
                <I d={ic.voice} size={52} />
              </button>

              {/* Text input */}
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={isListening ? t('chatbot.listening') : t('chatbot.placeholder')}
                disabled={isTyping || isListening}
                maxLength={500}
                style={{
                  flex: 1, background: '#fff', border: '2px solid var(--line)',
                  borderRadius: 999, padding: 'calc(28px * var(--ui-scale)) calc(44px * var(--ui-scale))',
                  fontSize: 'calc(34px * var(--ui-scale))', fontFamily: 'inherit', color: 'var(--ink-900)',
                  outline: 'none', minHeight: 'calc(104px * var(--ui-scale))',
                }}
              />

              {/* Send */}
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping || isListening}
                style={{
                  width: 'calc(104px * var(--ui-scale))', height: 'calc(104px * var(--ui-scale))', borderRadius: '50%', border: 'none', cursor: 'pointer',
                  flexShrink: 0, display: 'grid', placeItems: 'center',
                  background: (!input.trim() || isTyping || isListening) ? 'var(--ink-300)' : 'var(--indigo-700)',
                  color: 'var(--cream)',
                  boxShadow: (!input.trim() || isTyping || isListening) ? 'none' : 'var(--shadow-2)',
                }}
              >
                <I d={ic.arrow} size={52} />
              </button>
            </div>

            <div className="meta" style={{ textAlign: 'center', marginTop: 'calc(20px * var(--ui-scale))', fontSize: 'calc(26px * var(--ui-scale))' }}>
              {isListening
                ? t('chatbot.listeningIn', { lang: sttLangCode })
                : t('chatbot.footerHint')}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatbot;
