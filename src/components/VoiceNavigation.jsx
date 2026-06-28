import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { speechToText } from '../utils/sarvamAPI';
import { getSarvamLangCode, isSTTSupported, isTTSSupported } from '../utils/languageConfig';
import {
  announceNavigation,
  announceGoBack,
  announceLogout,
  announceNotUnderstood,
  announceListening,
  announceConfirm,
  speakPageIntro,
  startBargeInListener,
  stopBargeInListener,
} from '../utils/naturalVoice';
import { stopTTS } from '../utils/ttsService';
import { useAuth } from '../hooks/useAuth';

const getBaseLang = (language) => (language || 'en').toLowerCase().split('-')[0];

// Convert Float32Array (16kHz, mono) → WAV Blob for Whisper input
function float32ToWavBlob(samples, sampleRate = 16000) {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buf);
  const writeStr = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);    // PCM
  view.setUint16(22, 1, true);    // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  const pcm = new Int16Array(buf, 44);
  for (let i = 0; i < samples.length; i++) {
    pcm[i] = Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767)));
  }
  return new Blob([buf], { type: 'audio/wav' });
}
const normalizeVoiceText = (text) => (text || '')
  .toLowerCase()
  .replace(/[.,!?;:'"`~@#$%^&*()_+=[\]{}\\/|<>-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

/**
 * Sarvam AI powered Voice Navigation — with barge-in (interrupt) support.
 *
 * Key improvements over original:
 * - Barge-in: user can speak WHILE the kiosk is talking. Speech stops immediately.
 * - Natural phrases: "Sure! Taking you to electricity" instead of "Navigating to electricity"
 * - Page intros: brief, friendly description when entering a new section
 * - Short confirmation before action: "Got it!" then navigate
 */
const VoiceNavigation = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isSupported, setIsSupported] = useState(true);
  const feedbackTimeoutRef = useRef(null);
  const prevPathnameRef = useRef(location.pathname);

  // Media capture refs for Sarvam STT fallback
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const vadRef = useRef(null); // Silero VAD instance

  // ── Voice command mappings ─────────────────────────────────────────────
  const commands = {
    en: {
      'home': '/home', 'go home': '/home', 'main menu': '/home', 'menu': '/home',
      'electricity': '/electricity-menu', 'power': '/electricity-menu', 'light': '/electricity-menu', 'electric': '/electricity-menu',
      'gas': '/gas-menu', 'lpg': '/gas-menu', 'cylinder': '/gas-menu', 'assam gas': '/gas-menu',
      'water': '/water', 'water supply': '/water', 'jal': '/water',
      'sanitation': '/sanitation', 'waste': '/sanitation', 'garbage': '/sanitation', 'clean': '/sanitation',
      'municipal': '/municipal-menu', 'corporation': '/municipal-menu', 'nagar': '/municipal-menu', 'property': '/municipal-menu',
      'transport': '/transport', 'bus': '/transport', 'traffic': '/transport', 'road': '/transport',
      'healthcare': '/healthcare', 'health': '/healthcare', 'hospital': '/healthcare', 'doctor': '/healthcare',
      'complaint': '/complaints', 'complain': '/complaints', 'report': '/complaints', 'register complaint': '/complaints',
      'track': '/track-status', 'status': '/track-status', 'tracking': '/track-status', 'track status': '/track-status',
      'schemes': '/schemes', 'scheme': '/schemes', 'yojana': '/schemes', 'welfare': '/schemes',
      'login': '/login', 'sign in': '/login',
      'back': 'BACK', 'go back': 'BACK', 'previous': 'BACK',
      'logout': 'LOGOUT', 'sign out': 'LOGOUT', 'exit': 'LOGOUT',
      'help': 'HELP', 'what can you do': 'HELP', 'services': 'HELP',
    },
    hi: {
      'घर': '/home', 'होम': '/home', 'मुख्य मेनू': '/home', 'मेनू': '/home',
      'बिजली': '/electricity-menu', 'विद्युत': '/electricity-menu', 'लाइट': '/electricity-menu',
      'गैस': '/gas-menu', 'रसोई गैस': '/gas-menu', 'सिलिंडर': '/gas-menu',
      'पानी': '/water', 'जल': '/water', 'पानी की आपूर्ति': '/water',
      'सफाई': '/sanitation', 'कचरा': '/sanitation', 'स्वच्छता': '/sanitation',
      'नगर': '/municipal-menu', 'निगम': '/municipal-menu', 'नगर पालिका': '/municipal-menu',
      'परिवहन': '/transport', 'बस': '/transport',
      'स्वास्थ्य': '/healthcare', 'अस्पताल': '/healthcare', 'डॉक्टर': '/healthcare',
      'शिकायत': '/complaints', 'समस्या': '/complaints',
      'स्थिति': '/track-status', 'ट्रैक': '/track-status', 'अनुरोध': '/track-status',
      'योजना': '/schemes', 'सरकारी योजना': '/schemes',
      'पीछे': 'BACK', 'वापस': 'BACK',
      'बाहर': 'LOGOUT', 'लॉग आउट': 'LOGOUT',
      'मदद': 'HELP', 'सहायता': 'HELP',
    },
    as: {
      'ঘৰ': '/home', 'হোম': '/home', 'মূল মেনু': '/home',
      'বিদ্যুৎ': '/electricity-menu', 'পাৱাৰ': '/electricity-menu',
      'গেছ': '/gas-menu', 'অসম গেছ': '/gas-menu',
      'পানী': '/water', 'জল': '/water',
      'স্বচ্ছতা': '/sanitation', 'পৰিষ্কাৰ': '/sanitation',
      'নগৰ': '/municipal-menu', 'পৌৰসভা': '/municipal-menu',
      'পৰিবহন': '/transport', 'বাছ': '/transport',
      'স্বাস্থ্য': '/healthcare', 'হাসপাতাল': '/healthcare',
      'অভিযোগ': '/complaints', 'সমস্যা': '/complaints',
      'স্থিতি': '/track-status', 'ট্ৰেক': '/track-status',
      'যোজনা': '/schemes', 'আঁচনি': '/schemes',
      'পিছলৈ': 'BACK', 'উভতি': 'BACK',
      'বাহিৰ': 'LOGOUT', 'লগ আউট': 'LOGOUT',
      'সহায়': 'HELP',
    },
    ta: {
      'வீடு': '/home', 'முகப்பு': '/home',
      'மின்சாரம்': '/electricity-menu',
      'எரிவாயு': '/gas-menu', 'காஸ்': '/gas-menu',
      'தண்ணீர்': '/water', 'நீர்': '/water',
      'தூய்மை': '/sanitation',
      'மாநகராட்சி': '/municipal-menu', 'நகராட்சி': '/municipal-menu',
      'போக்குவரத்து': '/transport',
      'சுகாதாரம்': '/healthcare', 'மருத்துவமனை': '/healthcare',
      'புகார்': '/complaints',
      'நிலை': '/track-status',
      'திட்டம்': '/schemes',
      'பின்': 'BACK',
      'வெளியேறு': 'LOGOUT',
    },
    bn: {
      'বাড়ি': '/home', 'হোম': '/home',
      'বিদ্যুৎ': '/electricity-menu',
      'গ্যাস': '/gas-menu',
      'জল': '/water', 'পানি': '/water',
      'পরিচ্ছন্নতা': '/sanitation',
      'পৌরসভা': '/municipal-menu',
      'পরিবহন': '/transport',
      'স্বাস্থ্য': '/healthcare',
      'অভিযোগ': '/complaints',
      'অবস্থা': '/track-status',
      'প্রকল্প': '/schemes',
      'পেছনে': 'BACK',
      'বাহির': 'LOGOUT',
    },
    te: {
      'ఇల్లు': '/home', 'హోమ్': '/home',
      'విద్యుత్': '/electricity-menu',
      'గ్యాస్': '/gas-menu',
      'నీరు': '/water',
      'పారిశుధ్యం': '/sanitation',
      'మున్సిపల్': '/municipal-menu',
      'రవాణా': '/transport',
      'ఆరోగ్యం': '/healthcare',
      'ఫిర్యాదు': '/complaints',
      'స్థితి': '/track-status',
      'పథకం': '/schemes',
      'వెనుక': 'BACK',
      'నిష్క్రమణ': 'LOGOUT',
    },
    mr: {
      'घर': '/home',
      'वीज': '/electricity-menu',
      'गॅस': '/gas-menu',
      'पाणी': '/water',
      'स्वच्छता': '/sanitation',
      'महानगरपालिका': '/municipal-menu',
      'वाहतूक': '/transport',
      'आरोग्य': '/healthcare',
      'तक्रार': '/complaints',
      'स्थिती': '/track-status',
      'योजना': '/schemes',
      'मागे': 'BACK',
      'बाहेर': 'LOGOUT',
    },
    gu: {
      'ઘર': '/home',
      'વીજળી': '/electricity-menu',
      'ગેસ': '/gas-menu',
      'પાણી': '/water',
      'સ્વચ્છતા': '/sanitation',
      'મ્યુનિસિપલ': '/municipal-menu',
      'પરિવહન': '/transport',
      'આરોગ્ય': '/healthcare',
      'ફરિયાદ': '/complaints',
      'સ્થિતિ': '/track-status',
      'યોજના': '/schemes',
      'પાછળ': 'BACK',
      'બહાર': 'LOGOUT',
    },
    kn: {
      'ಮನೆ': '/home',
      'ವಿದ್ಯುತ್': '/electricity-menu',
      'ಗ್ಯಾಸ್': '/gas-menu',
      'ನೀರು': '/water',
      'ನೈರ್ಮಲ್ಯ': '/sanitation',
      'ಮುನ್ಸಿಪಲ್': '/municipal-menu',
      'ಸಾರಿಗೆ': '/transport',
      'ಆರೋಗ್ಯ': '/healthcare',
      'ದೂರು': '/complaints',
      'ಸ್ಥಿತಿ': '/track-status',
      'ಯೋಜನೆ': '/schemes',
      'ಹಿಂದೆ': 'BACK',
      'ನಿರ್ಗಮನ': 'LOGOUT',
    },
    ml: {
      'വീട്': '/home',
      'വൈദ്യുതി': '/electricity-menu',
      'ഗ്യാസ്': '/gas-menu',
      'വെള്ളം': '/water',
      'ശുചിത്വം': '/sanitation',
      'മുനിസിപ്പൽ': '/municipal-menu',
      'ഗതാഗതം': '/transport',
      'ആരോഗ്യം': '/healthcare',
      'പരാതി': '/complaints',
      'നില': '/track-status',
      'പദ്ധതി': '/schemes',
      'പുറകോട്ട്': 'BACK',
      'പുറത്ത്': 'LOGOUT',
    },
    pa: {
      'ਘਰ': '/home',
      'ਬਿਜਲੀ': '/electricity-menu',
      'ਗੈਸ': '/gas-menu',
      'ਪਾਣੀ': '/water',
      'ਸਫ਼ਾਈ': '/sanitation',
      'ਮਿਊਂਸਿਪਲ': '/municipal-menu',
      'ਆਵਾਜਾਈ': '/transport',
      'ਸਿਹਤ': '/healthcare',
      'ਸ਼ਿਕਾਇਤ': '/complaints',
      'ਸਥਿਤੀ': '/track-status',
      'ਯੋਜਨਾ': '/schemes',
      'ਪਿੱਛੇ': 'BACK',
      'ਬਾਹਰ': 'LOGOUT',
    },
  };

  // Page name lookup using i18n
  const getPageName = (path) => {
    const pageKeyMap = {
      '/home': 'app.home', '/login': 'auth.login', '/electricity': 'electricity.title',
      '/electricity-menu': 'electricity.title', '/gas': 'gas.title', '/gas-menu': 'gas.title',
      '/water': 'water.title', '/sanitation': 'sanitation.title',
      '/municipal': 'municipal.title', '/municipal-menu': 'municipal.title',
      '/transport': 'transport.title', '/healthcare': 'healthcare.title',
      '/complaints': 'complaints.title', '/track-status': 'tracking.title',
      '/schemes': 'schemes.title', '/dashboard': 'dashboard.title',
    };
    return t(pageKeyMap[path] || 'app.home');
  };

  const helpMessages = {
    en: "I can help you navigate. Say: electricity, gas, water, municipal, complaints, track status, schemes, or back.",
    hi: "मैं नेविगेट करने में मदद कर सकता हूँ। बोलें: बिजली, गैस, पानी, नगर, शिकायत, स्थिति, योजना, या वापस।",
    as: "মই নেভিগেট কৰাত সহায় কৰিম। কওক: বিদ্যুৎ, গেছ, পানী, নগৰ, অভিযোগ, স্থিতি, যোজনা বা পিছলৈ।",
    ta: "நான் உங்களுக்கு உதவ முடியும். சொல்லுங்கள்: மின்சாரம், எரிவாயு, தண்ணீர், நகராட்சி, புகார், நிலை, திட்டம், அல்லது பின்.",
  };

  const ensureAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  const showFeedback = useCallback((msg) => {
    setFeedback(msg);
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => setFeedback(''), 3500);
  }, []);

  // ── Command processor — with natural voice responses ────────────────────
  const processCommand = useCallback(async (text) => {
    if (!text) return;
    const normalizedText = normalizeVoiceText(text);
    const lang = getBaseLang(i18n.language);
    const langCommands = commands[lang] || commands.en;
    const allCommands = { ...commands.en, ...langCommands };

    // 1. Fast keyword match for navigation shortcuts
    for (const [keyword, action] of Object.entries(allCommands)) {
      if (normalizedText.includes(normalizeVoiceText(keyword))) {
        stopTTS();
        stopBargeInListener();
        if (action === 'BACK') {
          navigate(-1);
          announceGoBack(lang);
          showFeedback('← Going back');
        } else if (action === 'LOGOUT') {
          logout().finally(() => navigate('/'));
          announceLogout(lang);
          showFeedback('Session ended');
        } else if (action === 'HELP') {
          const helpMsg = helpMessages[lang] || helpMessages.en;
          import('../utils/naturalVoice').then(m => m.naturalSpeak(helpMsg, { language: lang }));
          showFeedback('Here to help!');
        } else {
          navigate(action);
          const pageName = getPageName(action);
          announceNavigation(pageName, lang);
          showFeedback(`→ ${pageName}`);
        }
        return;
      }
    }

    // 2. No keyword match → send to SUVIDHA AI chatbot
    showFeedback('Thinking...');
    try {
      const pageCtx = window.location.pathname.includes('electricity') ? 'electricity'
        : window.location.pathname.includes('gas') ? 'gas'
        : window.location.pathname.includes('municipal') ? 'municipal'
        : '';

      const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
      const resp = await fetch(`${apiBase}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, language: lang, context: pageCtx }),
        signal: AbortSignal.timeout(15000),
      });

      if (!resp.ok) throw new Error('chat api failed');
      const data = await resp.json();
      const reply = data.reply || '';

      // Speak the response
      stopTTS();
      import('../utils/naturalVoice').then(m => m.naturalSpeak(reply, { language: lang, interrupt: true }));
      showFeedback(reply.slice(0, 60) + (reply.length > 60 ? '…' : ''));

      // Execute action if returned
      if (data.action) {
        const { type, path, fieldName, value } = data.action;
        if (type === 'NAVIGATE_PAGE' && path) {
          setTimeout(() => navigate(path), 800);
        } else if (type === 'FILL_FORM' && fieldName) {
          window.dispatchEvent(new CustomEvent('suvidha:voice-fill', { detail: { fieldName, value } }));
        }
      }
    } catch {
      announceNotUnderstood(lang);
      showFeedback("Didn't catch that — try again");
    }
  }, [i18n.language, navigate, showFeedback, t]);

  // ── STT stop + process ─────────────────────────────────────────────────
  const handleStopRecording = async () => {
    setIsListening(false);
    if (audioChunksRef.current.length === 0) return;

    try {
      showFeedback('Processing...');
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      audioChunksRef.current = [];

      const selectedLang = getBaseLang(i18n.language);
      const langCode = getSarvamLangCode(selectedLang);
      const hasSTT = isSTTSupported(selectedLang);

      let transcriptText = '';
      if (hasSTT) {
        const result = await speechToText(audioBlob, langCode);
        transcriptText = result?.transcript || result?.text || '';
      } else {
        try {
          const result = await speechToText(audioBlob, langCode);
          transcriptText = result?.transcript || result?.text || '';
        } catch {
          const result = await speechToText(audioBlob, 'en-IN');
          transcriptText = result?.transcript || result?.text || '';
        }
      }

      if (transcriptText) {
        setTranscript(transcriptText);
        processCommand(transcriptText);
      } else {
        showFeedback('No speech detected. Try again.');
        announceNotUnderstood(getBaseLang(i18n.language));
      }
    } catch (err) {
      console.error('STT Error:', err);
      showFeedback('Could not process speech');
    }
  };

  // ── Browser STT (primary — instant, no upload) ─────────────────────────
  const startBrowserRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return false;

    const selectedLang = getBaseLang(i18n.language);
    const langMap = {
      en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN',
      kn: 'kn-IN', ml: 'ml-IN', mr: 'mr-IN', gu: 'gu-IN',
      bn: 'bn-IN', or: 'or-IN', pa: 'pa-IN', as: 'as-IN',
      ur: 'hi-IN', ks: 'hi-IN', sd: 'hi-IN', mai: 'hi-IN',
      kok: 'hi-IN', doi: 'hi-IN', ne: 'hi-IN', sa: 'hi-IN',
      mni: 'hi-IN', sat: 'hi-IN',
    };

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = langMap[selectedLang] || 'hi-IN';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 5;

    recognition.onresult = (event) => {
      const text = event?.results?.[0]?.[0]?.transcript || '';
      if (text) {
        setTranscript(text);
        processCommand(text);
      } else {
        showFeedback('No speech detected.');
        announceNotUnderstood(selectedLang);
      }
    };

    recognition.onerror = () => {
      showFeedback('Could not process speech');
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.start();
    setIsListening(true);

    // Stop TTS so user can speak cleanly (barge-in at start of listening)
    stopTTS();
    stopBargeInListener();
    announceListening(selectedLang);

    setTimeout(() => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* ok */ }
      }
    }, 9000);

    return true;
  }, [i18n.language, processCommand, showFeedback]);

  const toggleListening = async () => {
    ensureAudioContext();

    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch { /* ok */ }
      }
      if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
      return;
    }

    try {
      const selectedLang = getBaseLang(i18n.language);
      // hi/en/as use local Whisper (better accuracy) — skip browser STT for these
      // All Indian languages use local Whisper — browser SpeechRecognition
      // has poor Indic support and requires internet. Local is better for all.
      const LOCAL_STT_LANGS = new Set([
        'hi', 'en', 'as',                              // high priority
        'ta', 'te', 'kn', 'bn', 'ml', 'mr', 'gu', 'pa', 'or', // major Indic
        'ur', 'ne', 'sd', 'mai', 'kok', 'doi', 'sa', 'brx', 'ks', 'mni', 'sat', // bridge
      ]);
      if (!LOCAL_STT_LANGS.has(selectedLang) && !!(window.SpeechRecognition || window.webkitSpeechRecognition) && startBrowserRecognition()) {
        return;
      }

      // Silero VAD → Whisper: auto-detects speech boundaries, removes noise
      try {
        const { MicVAD } = await import('@ricky0123/vad-web');
        const { whisperTranscribe, loadWhisperForLang } = await import('../ai/voice/localSTT.js');
        // Warm the correct model for this language in the background
        loadWhisperForLang(selectedLang).catch(() => {});

        if (vadRef.current) { try { vadRef.current.destroy(); } catch { /* ok */ } }

        const vad = await MicVAD.new({
          onSpeechStart: () => {
            setIsListening(true);
            showFeedback('🎙 Listening…');
          },
          onSpeechEnd: async (audioFloat32) => {
            setIsListening(false);
            showFeedback('Processing…');
            vad.pause();

            const wavBlob = float32ToWavBlob(audioFloat32, 16000);

            // Strategy: Sarvam STT first (10-15% WER, trained on Indian languages).
            // Local Whisper as offline fallback (25-50% WER but works without internet).
            let transcript = '';
            let usedProvider = '';

            // 1. Try Sarvam STT (online, much better accuracy for Indic languages)
            try {
              const { speechToText } = await import('../utils/sarvamAPI');
              const r = await speechToText(wavBlob, selectedLang);
              transcript = r?.transcript || r?.text || '';
              if (transcript) usedProvider = 'sarvam';
            } catch { /* offline or quota — fall to local Whisper */ }

            // 2. Local Whisper fallback (offline capable)
            if (!transcript) {
              try {
                const result = await whisperTranscribe(wavBlob, selectedLang);
                transcript = result?.transcript || '';
                if (transcript) usedProvider = 'whisper';
              } catch { /* both failed */ }
            }

            if (transcript) {
              setTranscript(transcript);
              processCommand(transcript);
            } else {
              showFeedback("Didn't catch that — try again");
              announceNotUnderstood(selectedLang);
            }
          },
        });
        vadRef.current = vad;
        vad.start();
        stopTTS();
        announceListening(selectedLang);
        return;
      } catch { /* VAD unavailable — fall through to MediaRecorder */ }

      // Last-resort: MediaRecorder → Sarvam STT
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        handleStopRecording();
      };

      audioChunksRef.current = [];
      mediaRecorder.start();
      setIsListening(true);
      stopTTS();
      announceListening(getBaseLang(i18n.language));

      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 9000);
    } catch {
      setIsSupported(false);
    }
  };

  // ── Page change: announce page + start barge-in listener ─────────────
  useEffect(() => {
    if (location.pathname === prevPathnameRef.current) return;
    prevPathnameRef.current = location.pathname;

    const isBlindMode = sessionStorage.getItem('voiceNavAlwaysOn') === 'true';
    const lang = getBaseLang(i18n.language);

    // Announce page name to screen reader
    const announcer = document.querySelector('[role="status"][aria-live="polite"]');
    if (announcer) {
      announcer.textContent = '';
      setTimeout(() => { announcer.textContent = getPageName(location.pathname); }, 100);
    }

    if (isBlindMode) {
      // Slight delay to let page mount before TTS
      setTimeout(() => {
        speakPageIntro(location.pathname, lang).then(() => {
          // After intro, start barge-in so user can interrupt at any time
          startBargeInListener((spokenText) => {
            processCommand(spokenText);
          }, lang);
        });
      }, 600);
    }
  }, [location.pathname, i18n.language, processCommand]);

  // Triggered from the kiosk shell's bottom-bar "Voice mode" button (VK.jsx)
  const toggleListeningRef = useRef(toggleListening);
  toggleListeningRef.current = toggleListening;

  useEffect(() => {
    const handleActivateVoice = () => toggleListeningRef.current();
    window.addEventListener('suvidha:activate-ai', handleActivateVoice);
    return () => window.removeEventListener('suvidha:activate-ai', handleActivateVoice);
  }, []);

  // Barge-in while TTS plays globally (for blind mode always-on)
  useEffect(() => {
    const isBlindMode = sessionStorage.getItem('voiceNavAlwaysOn') === 'true';
    if (!isBlindMode) return;

    const handleTTSStart = () => {
      const lang = getBaseLang(i18n.language);
      startBargeInListener((spokenText) => {
        processCommand(spokenText);
      }, lang);
    };

    // Listen for any TTS-started events from the ttsService
    window.addEventListener('suvidha:tts-started', handleTTSStart);
    return () => {
      window.removeEventListener('suvidha:tts-started', handleTTSStart);
      stopBargeInListener();
    };
  }, [i18n.language, processCommand]);

  useEffect(() => {
    const eventName = isListening
      ? 'voice-navigation:listening-started'
      : 'voice-navigation:listening-stopped';
    window.dispatchEvent(new CustomEvent(eventName));
  }, [isListening]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* ok */ }
      }
      if (vadRef.current) {
        try { vadRef.current.destroy(); } catch { /* ok */ }
      }
      stopBargeInListener();
    };
  }, []);

  if (!isSupported) {
    return (
      <div className="fixed bottom-[260px] left-8 z-50 no-print bg-amber-50 border border-amber-300 text-amber-800 px-8 py-6 rounded-xl shadow-lg flex items-center space-x-4 max-w-[760px] animate-fade-in">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <p className="text-sm font-medium">Microphone access required for voice navigation</p>
      </div>
    );
  }

  const isBlindMode = sessionStorage.getItem('voiceNavAlwaysOn') === 'true';

  // No floating button — listening is started via VK's bottom-bar "Voice mode"
  // button (suvidha:activate-ai event, wired above). Only transient feedback
  // renders here, anchored bottom-left while active.
  if (!isBlindMode && !feedback && !(transcript && !isListening)) return null;

  return (
    <div className="fixed bottom-[260px] left-8 z-50 no-print" role="region" aria-label="Voice navigation">
      {isBlindMode && (
        <div className="bg-purple-700 text-white px-3 py-2 rounded-xl shadow-xl text-xs font-bold animate-pulse">
           {t('voice.modeActive', 'Voice Mode Active')}
        </div>
      )}

      {feedback && (
        <div className="mt-2 bg-government-blue text-white px-4 py-3 rounded-xl shadow-xl animate-fade-in text-sm font-semibold max-w-[220px]">
          {feedback}
        </div>
      )}

      {transcript && !isListening && (
        <div className="mt-2 bg-white text-gray-800 px-4 py-3 rounded-xl shadow-xl border-2 border-government-blue text-sm max-w-[250px]">
          <p className="font-semibold text-government-blue">{t('voice.heard', 'Heard')}:</p>
          <p>"{transcript}"</p>
        </div>
      )}
    </div>
  );
};

export default VoiceNavigation;
