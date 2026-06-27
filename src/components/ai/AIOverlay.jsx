/**
 * AIOverlay.jsx — Full SUVIDHA AI Assistant Overlay
 *
 * The main conversational AI interface. Opens as a full-screen or
 * floating panel with:
 *  - VoiceOrb (center)
 *  - WaveformVisualizer
 *  - LiveTranscript (conversation)
 *  - Text input (keyboard fallback)
 *  - Pending confirmation UI
 *  - Language indicator
 *
 * Modes:
 *  - Floating button (when idle / not activated)
 *  - Expanded panel (when activated)
 *  - Full-screen (for blind mode)
 */

import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useVoiceAssistant } from '../../ai/provider/VoiceAssistantProvider';
import VoiceOrb from './VoiceOrb';
import WaveformVisualizer from './WaveformVisualizer';
import LiveTranscript from './LiveTranscript';
import ListeningIndicator from './ListeningIndicator';
import { SUPPORTED_LANGUAGES } from '../../ai/brain/multilingualProcessor';

const STATE_BADGE = {
  idle:       { text: 'Ready',      color: 'bg-gray-500' },
  listening:  { text: 'Listening',  color: 'bg-emerald-500 animate-pulse' },
  processing: { text: 'Thinking',   color: 'bg-amber-500' },
  speaking:   { text: 'Speaking',   color: 'bg-blue-500 animate-pulse' },
  executing:  { text: 'Acting',     color: 'bg-violet-500' },
  waiting_confirmation: { text: 'Confirm?', color: 'bg-rose-500 animate-pulse' },
};

export default function AIOverlay() {
  const {
    aiState, isActivated, activate, deactivate,
    sendMessage, messages, pendingConfirm,
    confirmPendingAction, cancelPendingAction,
    currentLanguage, micPermission,
  } = useVoiceAssistant();
  const { t } = useTranslation();

  const [isExpanded, setIsExpanded] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isTextMode, setIsTextMode] = useState(false);
  const [micBannerDismissed, setMicBannerDismissed] = useState(false);
  const inputRef = useRef(null);

  const badge = STATE_BADGE[aiState] || STATE_BADGE.idle;
  const langInfo = SUPPORTED_LANGUAGES[currentLanguage] || SUPPORTED_LANGUAGES.en;

  const handleActivate = () => {
    setIsExpanded(true);
    activate();
  };

  const handleDeactivate = () => {
    deactivate();
    setIsExpanded(false);
    setTextInput('');
  };

  const handleTextSend = () => {
    if (!textInput.trim()) return;
    sendMessage(textInput.trim());
    setTextInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSend();
    }
  };

  // ── Floating activation button (not expanded) ────────────────────────

  if (!isExpanded && !isActivated) {
    return (
      <>
        {micPermission === 'denied' && !micBannerDismissed && (
          <div className="fixed bottom-[260px] left-8 right-8 z-[11000] max-w-[900px] mx-auto">
            <div className="bg-red-900 border border-red-500 rounded-xl px-4 py-3 flex items-center gap-3 shadow-xl">
              <span className="text-red-200 text-sm flex-1"> Microphone blocked — voice disabled. Touch input works.</span>
              <button
                onClick={() => setMicBannerDismissed(true)}
                className="text-red-300 hover:text-white text-lg font-bold leading-none flex-shrink-0"
                aria-label={t('ai.dismissMicWarning')}
              ></button>
            </div>
          </div>
        )}
        <ListeningIndicator />
        <button
          onClick={handleActivate}
          className="
            fixed bottom-[260px] right-8 z-50
            w-[160px] h-[160px] rounded-full
            bg-gradient-to-br from-indigo-500 to-purple-600
            shadow-2xl shadow-indigo-500/40
            flex items-center justify-center
            hover:scale-110 active:scale-95
            transition-all duration-200
            border-2 border-white/20
          "
          aria-label="Activate SUVIDHA AI Assistant"
          title="Click or say 'Hey Suvidha'"
        >
          {/* Star icon */}
          <svg width="76" height="76" viewBox="0 0 24 24" fill="white" stroke="none">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          {/* AI badge */}
          <span className="
            absolute -top-2 -right-2 w-16 h-16
            bg-emerald-500 text-white text-2xl font-bold
            rounded-full flex items-center justify-center
            border-4 border-white
          ">AI</span>
        </button>
      </>
    );
  }

  // ── Expanded AI panel ────────────────────────────────────────────────

  return (
    <>
      <ListeningIndicator />
      {micPermission === 'denied' && (
        <div className="fixed bottom-[220px] left-1/2 -translate-x-1/2 z-[11000] bg-red-900 border border-red-500 rounded-xl px-8 py-5 text-4xl text-red-100 flex items-center gap-4 shadow-xl">
           Microphone blocked — type your question instead.
        </div>
      )}

      {/* Backdrop (semi-transparent) */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={handleDeactivate}
        aria-hidden="true"
      />

      {/* Main panel */}
      <div
        className="
          fixed bottom-[220px] right-8 z-50
          w-[900px]
          sm:bottom-[220px] sm:right-8 sm:rounded-3xl
          rounded-t-3xl
          bg-gradient-to-br from-gray-900/95 via-indigo-950/95 to-gray-900/95
          backdrop-blur-xl border border-white/10
          shadow-2xl shadow-indigo-900/50
          flex flex-col overflow-hidden
          transition-all duration-300 ease-out
          max-h-[2600px] h-[1600px]
        "
        role="dialog"
        aria-label="SUVIDHA AI Assistant"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* State badge */}
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${badge.color}`} />
              <span className="text-white/80 text-sm font-medium">{badge.text}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language */}
            <span className="text-white/50 text-xs border border-white/20 rounded-full px-2 py-0.5">
              {langInfo.nativeName || 'EN'}
            </span>

            {/* Text mode toggle */}
            <button
              onClick={() => { setIsTextMode(t => !t); if (!isTextMode) inputRef.current?.focus(); }}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              title="Switch to text input"
              aria-label="Text input mode"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>
              </svg>
            </button>

            {/* Close */}
            <button
              onClick={handleDeactivate}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              aria-label={t('ai.closeAssistant')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── SUVIDHA title ── */}
        <div className="px-5 pt-4 pb-2 flex-shrink-0 text-center">
          <h2 className="text-white font-bold text-lg tracking-wide">
            <span className="bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">
              SUVIDHA
            </span>
            <span className="text-white/60 text-sm font-normal ml-2">AI Assistant</span>
          </h2>
          <p className="text-white/40 text-xs mt-0.5">
            Voice · Multilingual · Government Services
          </p>
        </div>

        {/* ── Orb + Waveform ── */}
        <div className="flex flex-col items-center gap-4 px-5 py-3 flex-shrink-0">
          <VoiceOrb size="md" />
          <WaveformVisualizer height={40} className="w-full max-w-[280px]" />
        </div>

        {/* ── Conversation transcript ── */}
        <div className="flex-1 overflow-y-auto px-4 pb-2 min-h-0">
          {messages.length === 0 ? (
            <EmptyState language={currentLanguage} />
          ) : (
            <LiveTranscript maxVisible={8} />
          )}
        </div>

        {/* ── Pending confirmation ── */}
        {pendingConfirm && (
          <div className="mx-4 mb-3 p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 flex-shrink-0">
            <p className="text-white text-sm mb-3 leading-relaxed">{pendingConfirm.message}</p>
            <div className="flex gap-2">
              <button
                onClick={confirmPendingAction}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded-xl transition-colors active:scale-95"
              >
                 Confirm
              </button>
              <button
                onClick={cancelPendingAction}
                className="flex-1 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-xl transition-colors active:scale-95"
              >
                 Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Text input (keyboard fallback) ── */}
        {isTextMode && (
          <div className="px-4 pb-4 flex-shrink-0 border-t border-white/10 pt-3">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Type in ${langInfo.name || 'English'}…`}
                className="
                  flex-1 bg-white/10 text-white placeholder-white/40
                  border border-white/20 rounded-xl px-4 py-2.5 text-sm
                  focus:outline-none focus:border-indigo-400 focus:bg-white/15
                  transition-all
                "
                autoComplete="off"
              />
              <button
                onClick={handleTextSend}
                disabled={!textInput.trim()}
                className="
                  px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500
                  disabled:bg-white/10 disabled:cursor-not-allowed
                  text-white rounded-xl transition-all active:scale-95
                "
                aria-label="Send"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ── Footer hint ── */}
        {!isTextMode && (
          <div className="px-5 pb-4 text-center flex-shrink-0">
            <p className="text-white/30 text-xs">
              {aiState === 'listening'
                ? 'Speak naturally in any language · Tap orb to stop'
                : 'Tap the orb to speak · Or type using the keyboard icon'}
            </p>
          </div>
        )}
      </div>
    </>
  );
}

// ── Empty state placeholder ───────────────────────────────────────────────

function EmptyState({ language }) {
  const examples = {
    en: ['"Show nearest hospital"', '"Apply for income certificate"', '"My Aadhaar is 1234 5678 9012"'],
    hi: ['"नजदीकी अस्पताल दिखाओ"', '"आय प्रमाण पत्र के लिए आवेदन"', '"योजनाएं बताओ"'],
    ta: ['"அருகிலுள்ள மருத்துவமனை காட்டு"', '"Income certificate apply பண்ண வேண்டும்"'],
    as: ['"কাষৰীয়া হাসপাতাল দেখুৱাওক"', '"আমাৰ আধাৰ নম্বৰ দিয়ক"'],
  };
  const ex = examples[language] || examples.en;

  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <p className="text-white/40 text-sm">Try saying…</p>
      <div className="flex flex-col gap-2 w-full">
        {ex.map((e, i) => (
          <div key={i} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm italic">
            {e}
          </div>
        ))}
      </div>
    </div>
  );
}
