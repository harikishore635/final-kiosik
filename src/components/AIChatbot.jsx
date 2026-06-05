import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageCircle, X, Minus, Send, Mic, MicOff, Volume2, VolumeX, Zap } from 'lucide-react';
import { naturalSpeak, startBargeInListener, stopBargeInListener } from '../utils/naturalVoice';
import { stopTTS } from '../utils/ttsService';
import { startSTT, stopSTT } from '../ai/voice/speechRecognition';
import SYSTEM_PROMPT from '../ai/prompts/systemPrompt';

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
  'suvidha-ai': '✦ SUVIDHA AI',
  'sarvam-105b': '✦ SUVIDHA AI',
  'sarvam-nim': '✦ SUVIDHA AI',
  'llama-nim': '✦ SUVIDHA AI',
  'NVIDIA NIM · Nemotron': '✦ SUVIDHA AI',
  'offline_mode': '✦ SUVIDHA AI',
  'huggingface': '✦ SUVIDHA AI',
  'none': '✦ SUVIDHA AI',
};

// Conversation history for context window
const conversationHistory = [];

const AIChatbot = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
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
      const greetings = {
        en: "Hello! I'm SUVIDHA AI — powered by NVIDIA NIM. I can help with Electricity, Gas & Municipal services in all 22 Indian languages. What do you need?",
        hi: "नमस्ते! मैं SUVIDHA AI हूँ — NVIDIA NIM द्वारा संचालित। बिजली, गैस, पानी, और नगर सेवाओं में मदद करता हूँ। क्या चाहिए?",
        as: "নমস্কাৰ! মই SUVIDHA AI — NVIDIA NIM চালিত। ভাৰতৰ ২২ টা ভাষাত বিদ্যুৎ, গেছ আৰু পৌৰ সেৱাত সহায় কৰিব পাৰো। কি লাগে?",
        bn: "নমস্কার! আমি SUVIDHA AI — NVIDIA NIM চালিত। বিদ্যুৎ, গ্যাস ও পৌর সেবায় ২২ ভারতীয় ভাষায় সাহায্য করি। কী দরকার?",
        ta: "வணக்கம்! நான் SUVIDHA AI — NVIDIA NIM மூலம். மின்சாரம், வாயு, நகர சேவைகளில் உதவுகிறேன். என்ன தேவை?",
        te: "నమస్కారం! నేను SUVIDHA AI — NVIDIA NIM ద్వారా. విద్యుత్, గ్యాస్, మున్సిపల్ సేవలలో సహాయం చేస్తాను. ఏం కావాలి?",
        kn: "ನಮಸ್ಕಾರ! ನಾನು SUVIDHA AI — NVIDIA NIM ನಿಂದ. ವಿದ್ಯುತ್, ಗ್ಯಾಸ್, ಮುನ್ಸಿಪಲ್ ಸೇವೆಗಳಲ್ಲಿ ಸಹಾಯ ಮಾಡುತ್ತೇನೆ. ಏನು ಬೇಕು?",
        ml: "നമസ്കാരം! ഞാൻ SUVIDHA AI — NVIDIA NIM ഉപയോഗിക്കുന്നു. വൈദ്യുതി, ഗ്യാസ്, മുനിസിപ്പൽ സേവനങ്ങളിൽ സഹായിക്കാം. എന്ത് വേണം?",
        gu: "નમસ્તે! હું SUVIDHA AI — NVIDIA NIM સ્ચાલિત. વીજળી, ગેસ, નગર સેવાઓ 22 ભાષામાં. શું જોઈએ?",
        mr: "नमस्कार! मी SUVIDHA AI — NVIDIA NIM द्वारे. वीज, गॅस, महापालिका सेवांमध्ये मदत करतो. काय हवंय?",
        pa: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ SUVIDHA AI ਹਾਂ — NVIDIA NIM ਚਾਲਿਤ। ਬਿਜਲੀ, ਗੈਸ, ਸ਼ਹਿਰੀ ਸੇਵਾਵਾਂ ਵਿੱਚ ਮਦਦ। ਕੀ ਚਾਹੀਦਾ?",
        ur: "آداب! میں SUVIDHA AI ہوں — NVIDIA NIM سے۔ بجلی، گیس، بلدیاتی خدمات میں مدد کرتا ہوں۔ کیا چاہیے؟",
        or: "ନମସ୍କାର! ମୁଁ SUVIDHA AI — NVIDIA NIM ଦ୍ୱାରା। ବିଦ୍ୟୁତ, ଗ୍ୟାସ, ନଗର ସେବାରେ ସାହାଯ୍ୟ। କ'ଣ ଦରକାର?",
        brx: "नमस्कार! मां SUVIDHA AI — NVIDIA NIM खालामजों। बिजुली, गेस, नगर सेवायां सिबियाय। मां खामानि लागोन?",
        mai: "प्रणाम! हम SUVIDHA AI छी — NVIDIA NIM द्वारा संचालित। बिजली, गैस, नगर सेवा में 22 भाषामे सहायता करैत छी। की चाही?",
        ne:  "नमस्कार! म SUVIDHA AI हुँ — NVIDIA NIM द्वारा संचालित। बिजुली, ग्यास, नगर सेवाहरूमा सहयोग गर्छु। के चाहिन्छ?",
        kok: "नमस्कार! हांव SUVIDHA AI — NVIDIA NIM वर्वी। विज, गॅस, नगर सेवांनी 22 भाशांनी मजत करता. किते जाय?",
        doi: "नमस्कार! मैं SUVIDHA AI हां — NVIDIA NIM राहें। बिजली, गैस, शहर सेवाएं च मदद। की चाहिए?",
        sa:  "नमस्ते! अहं SUVIDHA AI अस्मि — NVIDIA NIM शक्त्या। विद्युत्, गैस, नगर-सेवासु 22 भाषासु साहाय्यं करोमि। किं वाञ्छितम्?",
        ks:  "السلام علیکم! مے SUVIDHA AI چھُس — NVIDIA NIM سیتی۔ بجلی، گیس، شہری خدمتن مدد کرتھ۔ کیا چھُ ضرورت؟",
        mni: "ꯑꯣꯏꯅꯥ ꯍꯥꯏ! ꯑꯩ SUVIDHA AI — NVIDIA NIM ꯗꯨꯅꯥ। ꯕꯤꯖꯂꯤ, ꯒꯦꯁ, ꯅꯧꯄꯥꯂꯒꯤ ꯁꯦꯚꯥ ꯑꯁꯤꯗꯥ ꯃꯇꯦꯡ ꯄꯥꯡꯂꯒꯩ। ꯃꯁꯤ ꯇꯧꯗꯨꯅꯥ?",
        sat: "ᱡᱚᱦᱟᱨ! ᱤᱸ SUVIDHA AI — NVIDIA NIM ᱨᱮᱭᱟᱜ। ᱵᱤᱡᱽᱞᱤ, ᱜᱮᱥ, ᱱᱟᱜᱟᱨ ᱥᱮᱵᱟᱭ ᱢᱮᱫ ᱠᱟᱱᱟᱢ। ᱢᱤᱫ ᱞᱟᱦᱟᱛᱤᱭᱟ?",
        sd:  "السلام عليڪم! مان SUVIDHA AI آهيان — NVIDIA NIM سان. بجلي، گيس، شهري خدمتن ۾ مدد. ڇا گهرجي؟",
      };
      const welcomeText = greetings[userLang] || greetings.en;
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
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          language: userLang,
          context: pageContext || '',
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      const replyText = data.reply || t('chatbot.error', 'No response received.');
      conversationHistory.push({ role: 'assistant', content: replyText });
      setLastProvider(data.provider || 'sarvam-105b');

      // Simulate streaming by calling onChunk with full text
      if (onChunk) onChunk(replyText, replyText);

      return { response: replyText, language: data.language || userLang, action: null };
    } catch (err) {
      console.error('[Chatbot] API call failed:', err.message);
      return { response: t('chatbot.unavailable', 'Service temporarily unavailable. Please use the menu to access services.'), intent: 'error', action: null };
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
      || t('chatbot.error', 'No response. Please try again.');

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
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed z-50 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-100 transition-transform touch-manipulation"
          style={{ bottom: 96, right: 24, width: 64, height: 64 }}
          aria-label="Open AI Assistant"
          title="Ask SUVIDHA AI"
        >
          <MessageCircle className="w-8 h-8 text-white" />
          <span className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">AI</span>
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div
          className={`fixed right-4 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col transition-all duration-300 ${
            isMinimized ? 'bottom-24 w-72 h-14' : 'bottom-4 w-[420px] h-[580px]'
          }`}
          style={{ maxHeight: 'calc(100vh - 100px)' }}
          role="dialog"
          aria-label="SUVIDHA AI Assistant"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-t-2xl flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">SUVIDHA AI</h3>
                {!isMinimized && (
                  <p className="text-xs opacity-80">
                    {isListening ? '🔴 Listening...' : providerLabel || `${sttLangCode} · Voice enabled`}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Stop speaking */}
              {isSpeakingReply && (
                <button onClick={stopSpeaking} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors" aria-label="Stop speaking">
                  <VolumeX className="w-4 h-4" />
                </button>
              )}
              <button onClick={() => setIsMinimized(!isMinimized)} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors" aria-label={isMinimized ? 'Maximize' : 'Minimize'}>
                <Minus className="w-4 h-4" />
              </button>
              <button onClick={() => { setIsOpen(false); setIsMinimized(false); stopListening(); stopTTS(); }} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors" aria-label="Close chatbot">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3" role="log" aria-live="polite" aria-label="Chat messages">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.type === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[90%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.type === 'user'
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-800 rounded-bl-md'
                    }`}>
                      {msg.text}
                      {msg.streaming && (
                        <span className="inline-block w-1.5 h-3.5 bg-indigo-500 rounded-sm ml-0.5 animate-pulse align-middle" />
                      )}
                    </div>
                    {/* AI-suggested quick replies */}
                    {msg.type === 'bot' && !msg.streaming && msg.suggestions?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5 max-w-[90%]">
                        {msg.suggestions.map((s, i) => (
                          <button key={i} onClick={() => handleSuggestionClick(s)}
                            className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium hover:bg-indigo-100 transition-colors touch-manipulation border border-indigo-200">
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                    {/* Language + Provider badge on last bot message */}
                    {msg.type === 'bot' && !msg.streaming && (
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {msg.language && msg.language !== 'en' && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                            🇮🇳 {msg.language.toUpperCase()}
                          </span>
                        )}
                        {msg.provider && (
                          <div className="flex items-center gap-1 text-[10px] text-gray-400">
                            <Zap size={9} className="text-green-500" />
                            {PROVIDER_LABELS[msg.provider] || msg.provider}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {isTyping && !messages.some(m => m.streaming) && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md">
                      <div className="flex gap-1.5 items-center">
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        <span className="text-xs text-gray-400 ml-1">NVIDIA thinking…</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Context suggestions when idle */}
                {!isTyping && messages.length > 0 && messages[messages.length - 1]?.type === 'bot' && !messages[messages.length - 1]?.suggestions?.length && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {getSuggestionsByContext(context, t).map((s, i) => (
                      <button key={i} onClick={() => handleSuggestionClick(s)}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-100 active:bg-blue-200 transition-colors touch-manipulation border border-blue-200">
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Voice error */}
              {voiceError && (
                <div className="px-4 pb-1">
                  <p className="text-xs text-red-500 text-center">{voiceError}</p>
                </div>
              )}

              {/* Input area */}
              <div className="p-3 border-t border-gray-100 flex-shrink-0">
                <div className="flex gap-2 items-center">
                  {/* Mic button */}
                  <button
                    onClick={toggleVoice}
                    disabled={isTyping}
                    title={isListening ? 'Stop listening' : `Speak in ${sttLangCode}`}
                    className={`p-2.5 rounded-xl transition-all touch-manipulation flex-shrink-0 ${
                      isListening
                        ? 'bg-red-500 text-white animate-pulse scale-110'
                        : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200 active:scale-95'
                    } disabled:opacity-50`}
                    aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                  >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={isListening ? t('chatbot.listening', 'Listening...') : t('chatbot.placeholder', 'Ask anything about government services...')}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    disabled={isTyping || isListening}
                    maxLength={500}
                  />

                  {/* Read last reply aloud */}
                  {messages.some(m => m.type === 'bot' && m.id !== 1) && !isSpeakingReply && (
                    <button
                      onClick={readLastReply}
                      className="p-2.5 rounded-xl bg-green-100 text-green-700 hover:bg-green-200 active:scale-95 transition-colors touch-manipulation flex-shrink-0"
                      aria-label="Read reply aloud"
                      title="Read last reply aloud"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  )}

                  {/* Send */}
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isTyping || isListening}
                    className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed active:scale-95 transition-colors touch-manipulation flex-shrink-0"
                    aria-label="Send message"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-center text-xs text-gray-400 mt-1.5">
                  {isListening
                    ? `Listening in ${sttLangCode} · Tap mic to stop`
                    : 'Voice · Text · EN / हिंदी / অসমীয়া · Interrupt anytime'}
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default AIChatbot;
