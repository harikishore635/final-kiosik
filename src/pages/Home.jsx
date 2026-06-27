// ──────────────────────────────────────────────────────────────────
// Home — Vertical Kiosk service hub (1080×1920)
// Design source: docs/kiosk-design/designs/vertical-pages-v1.jsx:316-365 (VHome)
// Keeps existing routing to dept menus + auth/access guards.
// ──────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useAccessibility } from '../components/AccessibilityProvider';
import { useSession } from '../context/SessionContext';
import { speak } from '../utils/ttsService';
import { startSTT, stopSTT } from '../ai/voice/speechRecognition';
import { VK, I, ic, DD } from '../components/kiosk';
import { SkeletonTile } from '../components/loading';
import { mockDelayRange } from '../utils/mockDelay';

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userMode } = useAccessibility();
  const { isAuthenticated, isAdminSession } = useAuth();
  const { voiceEnabled } = useSession();
  const hasSpokenRef = useRef(false);
  const [tilesReady, setTilesReady] = React.useState(false);

  useEffect(() => {
    let cancelled = false;
    mockDelayRange(2200, 2800).then(() => { if (!cancelled) setTilesReady(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/', { replace: true });
    } else if (isAdminSession) {
      const dashboardPath = sessionStorage.getItem('adminDashboardPath') || '/admin/super';
      navigate(dashboardPath, { replace: true });
    }
  }, [isAdminSession, isAuthenticated, navigate]);

  // Dashboard voice: speak ONE welcome prompt (guarded against StrictMode
  // double-invoke), then start the STT command loop. Only when voice is enabled.
  useEffect(() => {
    if (!voiceEnabled || hasSpokenRef.current) return;
    if (!isAuthenticated || isAdminSession) return;
    hasSpokenRef.current = true;

    speak(t('home.voiceWelcome',
      'Welcome. You can select a service, or say help. Available services: electricity, gas, water, municipal, healthcare, transport.'),
    ).catch(() => {});

    const NAV_COMMANDS = {
      electricity: '/electricity-menu', power: '/electricity-menu',
      gas: '/gas-menu', cylinder: '/gas-menu',
      municipal: '/municipal-menu', water: '/municipal-menu',
      health: '/healthcare', healthcare: '/healthcare',
      transport: '/transport', bus: '/transport',
      sanitation: '/sanitation', scheme: '/schemes',
      track: '/track-status', status: '/track-status',
      family: '/family-profile',
    };

    startSTT({
      continuous: true,
      autoRestart: true,
      onResult: (text) => {
        const said = (text || '').toLowerCase();
        if (said.includes('help')) {
          speak(t('home.voiceHelp',
            'Say a service name like electricity, gas, water, healthcare, transport, or track status.')).catch(() => {});
          return;
        }
        const hit = Object.keys(NAV_COMMANDS).find((k) => said.includes(k));
        if (hit) navigate(NAV_COMMANDS[hit]);
      },
      onInterim: () => {},
      onError: () => {},
    });

    return () => stopSTT();
  }, [voiceEnabled, isAuthenticated, isAdminSession, navigate, t]);

  const orgs = [
    {
      id: 'elec',
      name: t('home.electricityDept', 'Electricity'),
      sub: t('home.electricitySubtitle', 'Connection · Bills · Complaints'),
      color: 'var(--dept-elec)',
      glyph: ic.bolt,
      path: '/electricity-menu',
    },
    {
      id: 'gas',
      name: t('home.gasDept', 'Assam Gas'),
      sub: t('home.gasSubtitle', 'Cylinder · Bills · Safety'),
      color: 'var(--dept-gas)',
      glyph: ic.flame,
      path: '/gas-menu',
    },
    {
      id: 'mun',
      name: t('home.municipalDept', 'Municipal'),
      sub: t('home.municipalSubtitle', 'Water · Tax · Grievances'),
      color: 'var(--dept-water)',
      glyph: ic.drop,
      path: '/municipal-menu',
    },
  ];

  const extras = [
    { name: t('home.healthcare', 'Health'),     color: 'var(--dept-health)', glyph: ic.heart,  path: '/healthcare' },
    { name: t('home.transport', 'Transport'),   color: 'var(--dept-trans)',  glyph: ic.bus,    path: '/transport' },
    { name: t('home.sanitation', 'Sanitation'), color: 'var(--dept-waste)',  glyph: ic.trash,  path: '/sanitation' },
    { name: t('home.schemes', 'Schemes'),       color: 'var(--indigo-500)',  glyph: ic.shield, path: '/schemes' },
    { name: t('home.family', 'Family'),         color: 'var(--saffron-700)', glyph: ic.family, path: '/family-profile' },
    { name: t('home.track', 'Track'),           color: 'var(--ink-700)',     glyph: ic.track,  path: '/track-status' },
  ];

  const userName = sessionStorage.getItem('userName') || '';
  const firstName = userName.split(' ')[0];
  const greetingMode = userMode === 'elderly' ? '🙏' : '👋';

  return (
    <VK bg="var(--cream)">
      {/* Welcome */}
      <div style={{ marginBottom: 32 }}>
        <div className="label-tag" style={{ color: 'var(--saffron-700)' }}>
          {t('home.welcomeTag', 'স্বাগতম · WELCOME BACK')}
        </div>
        <h1 className="h1" style={{ marginTop: 8 }}>
          {t('home.helloUser', 'Hello')}, {firstName || t('home.citizen', 'Citizen')} {greetingMode}
        </h1>
        <p className="body-l" style={{ marginTop: 6 }}>
          {t('home.howHelp', 'How may we help you today?')}
        </p>
      </div>

      {/* Org tiles */}
      <div className="label-tag" style={{ marginBottom: 14 }}>
        {t('home.selectOrg', 'SELECT AN ORGANIZATION')}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 36 }}>
        {!tilesReady && orgs.map((o, i) => <SkeletonTile key={o.id} height={180} delayMs={i * 100} />)}
        {tilesReady && orgs.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => navigate(o.path)}
            className="tile"
            style={{
              borderLeft: `8px solid ${o.color}`,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 28,
              minHeight: 180,
              padding: 32,
            }}
          >
            <DD color={o.color} glyph={o.glyph} size={120} isz={56} />
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div className="nm" style={{ fontSize: 36 }}>{o.name}</div>
              <div className="sub" style={{ fontSize: 22, marginTop: 6 }}>{o.sub}</div>
            </div>
            <I d={ic.arrow} size={48} />
          </button>
        ))}
      </div>

      {/* Extras */}
      <div className="label-tag" style={{ marginBottom: 14 }}>
        {t('home.exploreMore', 'EXPLORE OTHER SERVICES')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {!tilesReady && extras.map((e, i) => <SkeletonTile key={e.name} height={200} delayMs={i * 100} />)}
        {tilesReady && extras.map((e) => (
          <button
            key={e.name}
            type="button"
            onClick={() => navigate(e.path)}
            className="tile"
            style={{
              minHeight: 200,
              padding: 24,
              alignItems: 'center',
              textAlign: 'center',
              justifyContent: 'center',
              gap: 16,
            }}
          >
            <DD color={e.color} glyph={e.glyph} size={84} isz={42} />
            <div className="nm" style={{ fontSize: 24 }}>{e.name}</div>
          </button>
        ))}
      </div>
    </VK>
  );
}
