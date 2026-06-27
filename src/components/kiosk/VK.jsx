// ──────────────────────────────────────────────────────────────────
// SUVIDHA Vertical Kiosk · Shell
// Source: docs/kiosk-design/designs/kiosk-shell.jsx:122-153
//
// Wraps every citizen-facing page on the portrait kiosk.
//
// Reach zones (1080×1920):
//   0–200    tricolor strip + brand bar
//   200–290  StatusRow (weather/AQI/clock/wifi)
//   ~700–1500 content (eye-line)
//   1820–1920 BottomBar (A+ / Voice / EMERGENCY)
//
// Bottom-bar wiring:
//   A+ Larger text → useAccessibility().setFontSize(toggle large↔normal)
//   Voice mode     → dispatches window 'suvidha:activate-ai' event
//                    (already listened to by VoiceAssistantProvider:415)
//   EMERGENCY      → dispatches window 'suvidha:open-emergency' event
//                    (EmergencyQuickAccess listens; reconciled in Phase 1 task 11)
// ──────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { I, ic } from './icons';
import Logo from './Logo';
import StatusRow from './StatusRow';
import { useAccessibility } from '../AccessibilityProvider';
import useKioskScale from '../../hooks/useKioskScale';
import { useAuth } from '../../hooks/useAuth';
import { INDIAN_LANGUAGES } from '../../i18n/languageCodes';
import { ALL_LANGUAGES } from '../../utils/languageConfig';
import { changeLanguageSafe } from '../../i18n';

function getCitizenName() {
  if (typeof window === 'undefined') return null;
  const n = sessionStorage.getItem('userName');
  if (!n || n === 'Guest') return null;
  // Show first name only
  return n.split(' ')[0];
}

function getLanguageLabel(code) {
  const base = (code || 'en').toLowerCase().split('-')[0];
  return INDIAN_LANGUAGES.find((l) => l.code === base)?.native || 'English';
}

// Lightweight kiosk-styled overlay — sized for big touch UI, unlike the
// Tailwind Modal (max-w-lg) which is tuned for normal-density citizen pages
// and wraps kiosk-scale text into a narrow, cramped column.
function Sheet({ open, onClose, title, width = 640, children }) {
  if (!open) return null;
  return (
    <div
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(15,23,42,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'calc(24px * var(--ui-scale))',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          background: 'white', borderRadius: 'calc(28px * var(--ui-scale))',
          width: '100%', maxWidth: `calc(${width}px * var(--ui-scale))`,
          maxHeight: '80vh', overflowY: 'auto',
          padding: 'calc(32px * var(--ui-scale))', boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'calc(20px * var(--ui-scale))' }}>
          <h2 style={{ fontSize: 'calc(30px * var(--ui-scale))', fontWeight: 800, color: 'var(--indigo-900, #1e3a8a)', margin: 0 }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('app.close')}
            style={{
              width: 'calc(44px * var(--ui-scale))', height: 'calc(44px * var(--ui-scale))', borderRadius: '50%', border: 'none',
              background: 'var(--surface-2, #f1f5f9)', cursor: 'pointer',
              display: 'grid', placeItems: 'center', flexShrink: 0,
            }}
          >
            <I d={ic.x} size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function VK({
  children,
  lang,
  name,
  showBottom = true,
  showStatus = true,
  bg = 'white',
  status,
  helpBack = false,
  onHelp,
  onLanguage,
  onBack,
  className = '',
}) {
  useKioskScale();
  const { t, i18n } = useTranslation();
  const { fontSize, setFontSize } = useAccessibility();
  const navigate = useNavigate();
  const auth = (() => { try { return useAuth(); } catch { return null; } })();

  const [showLangModal, setShowLangModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [loadingLang, setLoadingLang] = useState(null);

  const [voiceOn, setVoiceOn] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('voiceInstructionsEnabled');
    return stored === null ? true : stored === 'true';
  });

  // Keep in sync with state changes made elsewhere (e.g. from inside
  // VoiceInstructionEngine before it stops rendering its own button).
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'voiceInstructionsEnabled') {
        setVoiceOn(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const langLabel = lang ?? getLanguageLabel(i18n?.language);
  const citizen = name === undefined ? getCitizenName() : name;

  const toggleLarger = () => {
    setFontSize(fontSize === 'large' || fontSize === 'xlarge' ? 'normal' : 'large');
  };

  const openVoice = () => {
    window.dispatchEvent(new CustomEvent('suvidha:activate-ai'));
  };

  const openChat = () => {
    window.dispatchEvent(new CustomEvent('suvidha:open-chat'));
  };

  const toggleVoiceInstructions = () => {
    const next = !voiceOn;
    setVoiceOn(next);
    localStorage.setItem('voiceInstructionsEnabled', String(next));
    window.dispatchEvent(
      new CustomEvent('suvidha:toggle-voice-instructions', { detail: { enabled: next } }),
    );
  };

  const openEmergency = () => {
    window.dispatchEvent(new CustomEvent('suvidha:open-emergency'));
  };

  const handleLanguageClick = () => {
    if (onLanguage) { onLanguage(); return; }
    setShowLangModal(true);
  };

  const handleSelectLanguage = async (langCode) => {
    setLoadingLang(langCode);
    try {
      await changeLanguageSafe(langCode);
    } catch {}
    setLoadingLang(null);
    setShowLangModal(false);
  };

  const handleHelpClick = () => {
    if (onHelp) { onHelp(); return; }
    setShowHelpModal(true);
  };

  const helpActions = [
    { icon: ic.type, label: t('vk.largerText').replace(/^A\+\s*/, ''), run: toggleLarger },
    { icon: ic.voice, label: t('vk.voiceMode'), run: openVoice },
    { icon: ic.chat, label: t('vk.aiChat'), run: openChat },
    { icon: ic.sos, label: t('vk.emergency'), run: openEmergency },
  ];

  const runHelpAction = (run) => {
    run();
    setShowHelpModal(false);
  };

  const handleLogout = async () => {
    try {
      await auth?.logout?.();
    } catch {}
    navigate('/', { replace: true });
  };

  useEffect(() => {
    const handleVoiceBack = () => (onBack ? onBack() : navigate(-1));
    const handleVoiceHelp = () => onHelp?.();
    const handleVoiceLogout = () => { if (auth?.isAuthenticated) handleLogout(); };
    window.addEventListener('suvidha:voice-back', handleVoiceBack);
    window.addEventListener('suvidha:voice-help', handleVoiceHelp);
    window.addEventListener('suvidha:voice-logout', handleVoiceLogout);
    return () => {
      window.removeEventListener('suvidha:voice-back', handleVoiceBack);
      window.removeEventListener('suvidha:voice-help', handleVoiceHelp);
      window.removeEventListener('suvidha:voice-logout', handleVoiceLogout);
    };
  }, [onBack, onHelp, navigate]);

  const showLogout = Boolean(auth?.isAuthenticated);

  const a11yClass = fontSize === 'large' ? 'a11y-large' : fontSize === 'xlarge' ? 'a11y-xlarge' : '';

  return (
    <div className={`vk ${a11yClass} ${className}`} style={{ background: bg }}>
      <div className="vk-strip" />
      <div className="vk-top">
        <div className="vk-brand">
          <div className="mk"><Logo size={84} /></div>
          <div>
            <div className="nm">SUVIDHA</div>
            <div className="sub">{t('app.brandSubtitle')}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
          <button
            type="button"
            className="chip"
            onClick={onBack || (() => navigate(-1))}
            aria-label={t('app.back')}
          >
            <I d={ic.back} size={20} /> {t('app.back')}
          </button>
          <button type="button" className="chip" onClick={handleLanguageClick}>
            <I d={ic.globe} size={20} /> {langLabel}
          </button>
          <button type="button" className="chip" onClick={handleHelpClick}>
            <I d={ic.help} size={20} /> {t('app.help')}
          </button>
          {citizen && (
            <span className="chip">
              <I d={ic.user} size={20} /> {citizen}
            </span>
          )}
          {showLogout && (
            <button
              type="button"
              className="chip"
              onClick={handleLogout}
              aria-label={t('app.logout')}
              style={{ background: 'var(--err, #b91c1c)', color: 'white', borderColor: 'transparent' }}
            >
              <I d={ic.x} size={20} /> {t('app.logout')}
            </button>
          )}
        </div>
      </div>

      {showStatus && <StatusRow override={status} />}

      <div className="vk-body">{children}</div>

      {showBottom && (
        <div className="vk-bottom">
          <button type="button" className="btn btn-quiet" onClick={toggleLarger}>
            <I d={ic.type} size={22} /> {t('vk.largerText').replace(/^A\+\s*/, '')}
          </button>
          <button type="button" className="btn btn-quiet" onClick={openVoice}>
            <I d={ic.voice} size={22} /> {t('vk.voiceMode')}
          </button>
          <button type="button" className="btn btn-quiet" onClick={openChat}>
            <I d={ic.chat} size={22} /> {t('vk.aiChat')}
          </button>
          <button
            type="button"
            className="btn btn-quiet"
            onClick={toggleVoiceInstructions}
            aria-pressed={voiceOn}
            aria-label={voiceOn ? t('vk.voiceOff') : t('vk.voiceOn')}
            style={voiceOn ? undefined : { opacity: 0.85 }}
          >
            <I d={ic.voice} size={22} /> {voiceOn ? t('vk.voiceOn') : t('vk.voiceOff')}
          </button>
          <div style={{ flex: 1 }} />
          <button type="button" className="btn btn-err" onClick={openEmergency}>
            <I d={ic.sos} size={24} /> {t('vk.emergency')}
          </button>
        </div>
      )}

      <Sheet open={showLangModal} onClose={() => setShowLangModal(false)} title={t('language.select')} width={760}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'calc(12px * var(--ui-scale))',
        }}>
          {ALL_LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              disabled={loadingLang !== null}
              onClick={() => handleSelectLanguage(l.code)}
              style={{
                padding: 'calc(16px * var(--ui-scale)) calc(12px * var(--ui-scale))', borderRadius: 'calc(14px * var(--ui-scale))', cursor: 'pointer',
                fontSize: 'calc(18px * var(--ui-scale))', fontWeight: 600, textAlign: 'center',
                border: i18n.language === l.code ? '2px solid var(--indigo-700, #4338ca)' : '1.5px solid var(--line, #e2e8f0)',
                background: i18n.language === l.code ? 'var(--indigo-700, #4338ca)' : 'white',
                color: i18n.language === l.code ? 'white' : 'var(--ink-700, #334155)',
                opacity: loadingLang === l.code ? 0.6 : 1,
              }}
            >
              {l.native}
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={showHelpModal} onClose={() => setShowHelpModal(false)} title={t('app.help')} width={520}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(12px * var(--ui-scale))' }}>
          {helpActions.map((a) => (
            <button
              key={a.label}
              type="button"
              onClick={() => runHelpAction(a.run)}
              style={{
                display: 'flex', alignItems: 'center', gap: 'calc(16px * var(--ui-scale))',
                padding: 'calc(18px * var(--ui-scale)) calc(20px * var(--ui-scale))', borderRadius: 'calc(16px * var(--ui-scale))',
                border: '1.5px solid var(--line, #e2e8f0)', background: 'white',
                fontSize: 'calc(20px * var(--ui-scale))', fontWeight: 600, color: 'var(--ink-700, #334155)',
                cursor: 'pointer', textAlign: 'left',
              }}
            >
              <I d={a.icon} size={24} /> {a.label}
            </button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
