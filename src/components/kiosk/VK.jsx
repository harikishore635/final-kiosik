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
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { I, ic } from './icons';
import Logo from './Logo';
import StatusRow from './StatusRow';
import { useAccessibility } from '../AccessibilityProvider';
import useKioskScale from '../../hooks/useKioskScale';
import { useAuth } from '../../hooks/useAuth';
import { INDIAN_LANGUAGES } from '../../i18n/languageCodes';

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
  const location = useLocation();
  const auth = (() => { try { return useAuth(); } catch { return null; } })();

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
    navigate('/language-select', { state: { returnTo: location.pathname } });
  };

  const handleHelpClick = () => {
    if (onHelp) { onHelp(); return; }
    openChat();
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
              style={{ color: 'var(--err, #b91c1c)', borderColor: 'var(--err, #b91c1c)' }}
            >
              <I d={ic.logout} size={20} /> {t('app.logout')}
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
    </div>
  );
}
