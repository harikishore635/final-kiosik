// ──────────────────────────────────────────────────────────────────
// Landing — Vertical Kiosk (1080×1920)
// Design source: docs/kiosk-design/designs/vertical-pages-v1.jsx:103-174 (VLanding)
// Keeps existing wiring: useAuth, changeLanguageSafe, speak, navigation.
// ──────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { INDIAN_LANGUAGES, POPULAR_LANGS, RTL_LANGS } from '../i18n/languageCodes';
import { changeLanguageSafe } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { useAccessibility } from '../components/AccessibilityProvider';
import { useSession } from '../context/SessionContext';
import useKioskScale from '../hooks/useKioskScale';

import { I, ic, Logo } from '../components/kiosk';
import AadhaarCameraScanner from '../components/AadhaarCameraScanner';
import { BootSplash } from '../components/loading';

export default function Landing() {
  useKioskScale();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { logout, activateGuestSession } = useAuth();
  const { fontSize, setFontSize, userMode, setUserMode } = useAccessibility();
  const { setUserType } = useSession();
  const [showCamera, setShowCamera] = useState(false);

  // NOTE: voice is opt-in and is enabled only during onboarding (after login,
  // on the Voice Mode step). The landing screen never auto-starts TTS or STT.

  const handleGuest = async () => {
    await logout();
    activateGuestSession();
    setUserType('guest');
    navigate('/language-select');
  };

  const handleCitizen = () => {
    navigate('/login');
  };

  const changeLanguage = async (code) => {
    try {
      await changeLanguageSafe(code);
      sessionStorage.setItem('userLanguage', code);
      document.documentElement.lang = code;
      document.documentElement.dir = RTL_LANGS.includes(code) ? 'rtl' : 'ltr';
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Language change failed:', e);
    }
  };

  const popular = INDIAN_LANGUAGES.filter((l) => POPULAR_LANGS.includes(l.code));
  const extrasCount = INDIAN_LANGUAGES.length - popular.length;
  const [showAllLangs, setShowAllLangs] = useState(false);
  const langList = showAllLangs ? INDIAN_LANGUAGES : popular;

  // Current time chip
  const now = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const stamp = `${now.getDate()} ${months[now.getMonth()]} · ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <div className="vk kiosk-bg">
      <BootSplash />
      <div className="vk-strip" />
      <div className="vk-top">
        <div className="vk-brand">
          <div className="mk"><Logo size={84} /></div>
          <div>
            <div className="nm">SUVIDHA</div>
            <div className="sub">{t('app.brandSubtitle')}</div>
          </div>
        </div>
        <span className="chip" style={{ fontFamily: 'var(--font-mono)' }}>{stamp}</span>
      </div>

      <div className="vk-body" style={{ paddingTop: 60, gap: 0 }}>
        {/* Hero — eye line */}
        <div style={{ marginTop: 100 }}>
          <div className="label-tag" style={{ color: 'var(--saffron-700)' }}>
            {t('landing.welcomeTag', 'WELCOME · স্বাগতম · स्वागत है')}
          </div>
          <div className="h1" style={{ marginTop: 22, fontSize: 96 }}>
            {t('landing.heroLine', 'How may we\nhelp you\ntoday?')
              .split('\n')
              .map((line, i, arr) => (
                <React.Fragment key={i}>
                  {line}
                  {i < arr.length - 1 && <br />}
                </React.Fragment>
              ))}
          </div>
          <div style={{
            fontFamily: 'var(--font-multi)',
            fontWeight: 600,
            fontSize: 36,
            color: 'var(--ink-700)',
            marginTop: 28,
          }}>
            आज हम आपकी क्या<br />सहायता कर सकते हैं?
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 60 }} />

        {/* Two action cards — reach zone */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 32 }}>
          <button
            type="button"
            onClick={handleCitizen}
            className="card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 28,
              padding: 36,
              cursor: 'pointer',
              borderColor: 'var(--saffron-500)',
              borderWidth: 2,
              background: 'color-mix(in oklab, var(--saffron-500) 7%, white)',
              boxShadow: 'var(--shadow-2)',
              textAlign: 'left',
              font: 'inherit',
              color: 'inherit',
            }}
          >
            <div style={{
              width: 96, height: 96, borderRadius: 26,
              background: 'var(--saffron-500)', color: 'var(--indigo-900)',
              display: 'grid', placeItems: 'center', flexShrink: 0,
            }}>
              <I d={ic.shield} size={48} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontWeight: 800,
                fontSize: 50,
                color: 'var(--indigo-900)',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}>
                {t('landing.citizenLogin', 'Citizen Login')}{' '}
                <span className="badge b-ok" style={{ fontSize: 18 }}>AADHAAR</span>
              </div>
              <div className="body" style={{ marginTop: 8 }}>
                {t('landing.citizenDesc', 'Full access · Personal dashboard · Schemes')}
              </div>
            </div>
            <I d={ic.arrow} size={44} />
          </button>

          <button
            type="button"
            onClick={handleGuest}
            className="card"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 28,
              padding: 36,
              cursor: 'pointer',
              textAlign: 'left',
              font: 'inherit',
              color: 'inherit',
            }}
          >
            <div style={{
              width: 96, height: 96, borderRadius: 26,
              background: 'var(--surface-2)', color: 'var(--ink-700)',
              display: 'grid', placeItems: 'center', flexShrink: 0,
            }}>
              <I d={ic.user} size={48} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 50, color: 'var(--indigo-900)' }}>
                {t('landing.guest', 'Continue as Guest')}
              </div>
              <div className="body" style={{ marginTop: 8 }}>
                {t('landing.guestDesc', 'Browse services · Track by reference number')}
              </div>
            </div>
            <I d={ic.arrow} size={44} />
          </button>
        </div>

        {/* Blind user — Aadhaar camera scan */}
        <div style={{ marginBottom: 28, marginTop: 8 }}>
          <button
            type="button"
            className="btn btn-quiet"
            style={{
              width: '100%',
              minHeight: 80,
              borderRadius: 18,
              border: '2px dashed var(--indigo-300)',
              background: 'color-mix(in oklab, var(--indigo-700) 5%, white)',
              fontSize: 36,
              minHeight: 110,
              gap: 16,
              justifyContent: 'center',
            }}
            aria-label="Blind user: hold Aadhaar card to camera for hands-free login"
            onClick={() => setShowCamera(true)}
          >
            <I d={ic.qr} size={32} />
            {t('landing.blindCameraScan', 'Blind / Hands-free — Hold Aadhaar to Camera')}
          </button>
        </div>

        {showCamera && (
          <AadhaarCameraScanner
            onSuccess={(citizen) => {
              setShowCamera(false);
              const { useAuth: _u, ...rest } = {};
              sessionStorage.setItem('isLoggedIn', 'true');
              sessionStorage.setItem('actorType', 'citizen');
              sessionStorage.setItem('userName', citizen.name || 'Citizen');
              sessionStorage.setItem('userMobile', citizen.mobile || '');
              sessionStorage.setItem('aadhaarUid', citizen.uid || '');
              sessionStorage.setItem('govId', `XXXX-XXXX-${(citizen.uid || '').slice(-4)}`);
              sessionStorage.setItem('govIdType', 'aadhaar');
              sessionStorage.setItem('citizenData', JSON.stringify(citizen));
              sessionStorage.setItem('autoDetectedMode', 'blind');
              sessionStorage.setItem('userMode', 'blind');
              sessionStorage.setItem('voiceNavAlwaysOn', 'true');
              setUserType('citizen');
              navigate('/language-select');
            }}
            onClose={() => setShowCamera(false)}
          />
        )}

        {/* Language strip */}
        <div>
          <div className="label-tag" style={{ marginBottom: 14 }}>
            {t('landing.langStrip', 'AVAILABLE IN 24 LANGUAGES · TAP TO CHANGE')}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {langList.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => changeLanguage(l.code)}
                className={`chip ${i18n.language === l.code ? 'act' : ''}`}
                style={{
                  fontFamily: l.code === 'en' ? 'var(--font-ui)' : 'var(--font-multi)',
                  direction: l.rtl ? 'rtl' : 'ltr',
                }}
                title={l.name}
              >
                {l.native}
              </button>
            ))}
            <button
              type="button"
              className="chip"
              onClick={() => setShowAllLangs((v) => !v)}
              style={{ background: 'var(--surface-2)', borderColor: 'transparent' }}
            >
              {showAllLangs ? 'Show fewer' : `+${extrasCount} more`}
            </button>
          </div>
        </div>
      </div>

      <div className="vk-bottom">
        <button
          type="button"
          className="btn btn-quiet"
          aria-label="Increase text size"
          onClick={() => {
            const next = fontSize === 'xlarge' ? 'normal' : fontSize === 'large' ? 'xlarge' : 'large';
            setFontSize(next);
          }}
        >
          <I d={ic.type} size={22} /> {t('vk.largerText').replace(/^A\+\s*/, '')}
        </button>
        <button
          type="button"
          className="btn btn-quiet"
          aria-label="Toggle voice-first blind mode"
          onClick={() => {
            const next = userMode === 'blind' ? 'normal' : 'blind';
            setUserMode(next);
            sessionStorage.setItem('userMode', next);
          }}
        >
          <I d={ic.voice} size={22} /> {userMode === 'blind' ? t('vk.voiceOn') : t('vk.voiceMode')}
        </button>
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => {
            const stored = localStorage.getItem('voiceInstructionsEnabled');
            const cur = stored === null ? true : stored === 'true';
            const next = !cur;
            localStorage.setItem('voiceInstructionsEnabled', String(next));
            window.dispatchEvent(
              new CustomEvent('suvidha:toggle-voice-instructions', { detail: { enabled: next } }),
            );
          }}
          aria-label="Toggle voice instructions"
        >
          <I d={ic.voice} size={22} />{' '}
          {(localStorage.getItem('voiceInstructionsEnabled') ?? 'true') === 'true'
            ? t('vk.voiceOn')
            : t('vk.voiceOff')}
        </button>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          className="btn btn-err"
          onClick={() => window.dispatchEvent(new CustomEvent('suvidha:open-emergency'))}
        >
          <I d={ic.sos} size={24} /> {t('vk.emergency')}
        </button>
      </div>
    </div>
  );
}
