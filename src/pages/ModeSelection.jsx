// ──────────────────────────────────────────────────────────────────
// ModeSelection — Vertical Kiosk (1080×1920)
// Design source: docs/kiosk-design/designs/vertical-pages-v1.jsx:271-310 (VMode)
// Keeps existing wiring: useAccessibility, sessionStorage userMode,
// voiceNavAlwaysOn flag, TTS announcements, language change.
// ──────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAccessibility } from '../components/AccessibilityProvider';
import { ALL_LANGUAGES } from '../utils/languageConfig';
import { changeLanguageSafe } from '../i18n';
import { speak } from '../utils/ttsService';
import { startSTT, stopSTT } from '../ai/voice/speechRecognition';
import { VK, I, ic, DD } from '../components/kiosk';

const RTL_LANGS = ['ur', 'ks', 'sd'];

const MODE_LIST = [
  {
    id: 'normal',
    name: 'Normal Citizen',
    desc: 'Standard interface with all features and touch navigation',
    color: 'var(--saffron-700)',
    glyph: ic.user,
  },
  {
    id: 'elderly',
    name: 'Elderly / Senior',
    desc: 'Extra-large text · High contrast · Simplified layout',
    color: 'var(--dept-gas)',
    glyph: ic.heart,
  },
  {
    id: 'blind',
    name: 'Blind / Visually Impaired',
    desc: 'Voice-first navigation · Screen reader · Wake word · Camera Aadhaar scan',
    color: 'var(--indigo-700)',
    glyph: ic.voice,
  },
  {
    id: 'admin',
    name: 'Department Officer / Admin',
    desc: 'Access department dashboards · Ticket management · Reports',
    color: 'var(--ink-700)',
    glyph: ic.shield,
  },
];

const MODE_TTS = {
  en: {
    blind: 'Blind mode activated. Voice instructions enabled. Hold your Aadhaar card to the camera to login hands-free.',
    normal: 'Normal mode activated.',
    elderly: 'Elderly mode activated. Text size increased.',
    admin: 'Admin mode. Redirecting to officer login.',
  },
  hi: {
    blind: 'अंधा मोड सक्रिय। आवाज निर्देश चालू हैं।',
    normal: 'सामान्य मोड सक्रिय।',
    elderly: 'वरिष्ठ मोड सक्रिय।',
    admin: 'प्रशासक मोड।',
  },
  as: {
    blind: 'দৃষ্টিহীন মোড সক্ৰিয় হৈছে। কণ্ঠস্বৰ নিৰ্দেশনা চলিছে।',
    normal: 'সাধাৰণ মোড সক্ৰিয় হৈছে।',
    elderly: 'জ্যেষ্ঠ মোড সক্ৰিয় হৈছে।',
    admin: 'প্ৰশাসক মোড।',
  },
  ta: {
    blind: 'பார்வைக்குறைபாடு முறை செயல்படுத்தப்பட்டது.',
    normal: 'சாதாரண முறை செயல்படுத்தப்பட்டது.',
    elderly: 'முதியோர் முறை செயல்படுத்தப்பட்டது.',
    admin: 'நிர்வாக முறை.',
  },
};

export default function ModeSelection() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { setFontSize, setHighContrast, setReducedMotion, setUserMode, screenReaderAnnounce } = useAccessibility();

  const autoDetected = sessionStorage.getItem('autoDetectedMode');
  const [selectedMode, setSelectedMode] = useState(autoDetected || 'normal');
  const [step, setStep] = useState('mode');           // 'mode' | 'language'
  const [loadingLang, setLoadingLang] = useState(null);
  const activeLanguage = (i18n.resolvedLanguage || i18n.language || 'en').toLowerCase().split('-')[0];
  const headingDirection = RTL_LANGS.includes(activeLanguage) ? 'rtl' : 'ltr';

  const handleSelect = (id) => {
    setSelectedMode(id);
    screenReaderAnnounce?.(`Selected ${id} mode`);
  };

  // Voice commands — always active on this page (user may arrive in blind mode)
  useEffect(() => {
    const mode = sessionStorage.getItem('userMode') || autoDetected || 'normal';
    if (mode !== 'blind') return;
    startSTT({
      language: i18n.language || 'en',
      continuous: false,
      autoRestart: true,
      onResult: (text) => {
        const t = text.toLowerCase();
        if (t.includes('normal') || t.includes('standard')) handleSelect('normal');
        else if (t.includes('elderly') || t.includes('senior')) handleSelect('elderly');
        else if (t.includes('blind') || t.includes('voice') || t.includes('visually')) handleSelect('blind');
        else if (t.includes('confirm') || t.includes('continue') || t.includes('next')) handleConfirmMode();
      },
      onInterim: () => {},
      onError: () => {},
    });
    return () => stopSTT();
  }, [i18n.language, step]);

  const handleConfirmMode = () => {
    sessionStorage.setItem('userMode', selectedMode);
    setUserMode?.(selectedMode);

    const base = (i18n.language || 'en').toLowerCase().split('-')[0];
    const ttsMsg = MODE_TTS[base]?.[selectedMode] || MODE_TTS.en[selectedMode];
    speak(ttsMsg, { language: i18n.language, priority: 'normal' }).catch(() => {});

    if (selectedMode === 'admin') {
      navigate('/admin-login');
      return;
    }

    if (selectedMode === 'blind') {
      setHighContrast(true);
      setFontSize('large');
      setReducedMotion(true);
      sessionStorage.setItem('voiceNavAlwaysOn', 'true');
    } else if (selectedMode === 'elderly') {
      setHighContrast(true);
      setFontSize('xlarge');
      setReducedMotion(true);
      sessionStorage.removeItem('voiceNavAlwaysOn');
    } else {
      setHighContrast(false);
      setFontSize('normal');
      setReducedMotion(false);
      sessionStorage.removeItem('voiceNavAlwaysOn');
    }

    setStep('language');
  };

  const handleLanguagePick = async (code) => {
    setLoadingLang(code);
    try {
      await changeLanguageSafe(code);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Language change failed:', e);
    }
    setLoadingLang(null);
    const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/home';
    sessionStorage.removeItem('redirectAfterLogin');
    navigate(redirectPath);
  };

  const handleSkipLanguage = () => {
    const redirectPath = sessionStorage.getItem('redirectAfterLogin') || '/home';
    sessionStorage.removeItem('redirectAfterLogin');
    navigate(redirectPath);
  };

  if (step === 'language') {
    return (
      <VK helpBack onBack={() => setStep('mode')}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 className="h2" style={{ direction: headingDirection, fontFamily: 'var(--font-multi)' }}>
            {t('language.selectionTitle')}
          </h1>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
          {ALL_LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              className="tile"
              style={{ minHeight: 140, alignItems: 'center', justifyContent: 'center', gap: 6, opacity: loadingLang === l.code ? 0.5 : 1, direction: RTL_LANGS.includes(l.code) ? 'rtl' : 'ltr' }}
              disabled={loadingLang !== null}
              onClick={() => handleLanguagePick(l.code)}
            >
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--indigo-900)', fontFamily: 'var(--font-multi)' }}>
                {l.native}
              </div>
              <div className="meta">{l.label}</div>
            </button>
          ))}
        </div>

        <button type="button" className="btn btn-quiet" style={{ width: '100%' }} onClick={handleSkipLanguage}>
          Keep current language
        </button>
      </VK>
    );
  }

  return (
    <VK>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 className="h2">Choose Your Experience</h1>
        <p className="body-l" style={{ marginTop: 12 }}>
          Select a mode that works best for you
        </p>
        {autoDetected && (
          <span className="badge b-info" style={{ marginTop: 16, fontSize: 14, padding: '10px 18px' }}>
             AUTO-DETECTED FROM AADHAAR: {autoDetected.toUpperCase()}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 32 }}>
        {MODE_LIST.map((m) => {
          const sel = m.id === selectedMode;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => handleSelect(m.id)}
              className="card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 28,
                padding: 32,
                cursor: 'pointer',
                border: sel ? `3px solid ${m.color}` : '1.5px solid var(--line)',
                background: sel ? `color-mix(in oklab, ${m.color} 8%, white)` : 'white',
                boxShadow: sel ? 'var(--shadow-2)' : 'var(--shadow-1)',
                textAlign: 'left',
                font: 'inherit',
                color: 'inherit',
              }}
            >
              <DD color={m.color} glyph={m.glyph} size={104} isz={56} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--indigo-900)' }}>{m.name}</div>
                <div className="body" style={{ marginTop: 6 }}>{m.desc}</div>
              </div>
              {sel && (
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'var(--ok)', color: 'white',
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                }}>
                  <I d={ic.check} size={32} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="btn btn-pri btn-xl"
        style={{ width: '100%' }}
        onClick={handleConfirmMode}
      >
        Continue with {MODE_LIST.find((m) => m.id === selectedMode)?.name}
        <I d={ic.arrow} size={28} />
      </button>
    </VK>
  );
}
