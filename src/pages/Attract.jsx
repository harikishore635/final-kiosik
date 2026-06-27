// ──────────────────────────────────────────────────────────────────
// Attract / Idle Screen — plays when the kiosk is unattended.
// Design source: Kiosk waiting screen design/design_handoff_attract_screen
// Tap/touch anywhere hands off to Landing ("/") to start a session.
// ──────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAccessibility } from '../components/AccessibilityProvider';
import useKioskScale from '../hooks/useKioskScale';
import { I, ic, Logo } from '../components/kiosk';

const GREETINGS = [
  { word: 'Welcome', lang: 'English' },
  { word: 'नमस्ते', lang: 'हिन्दी' },
  { word: 'নমস্কাৰ', lang: 'অসমীয়া' },
  { word: 'வணக்கம்', lang: 'தமிழ்' },
  { word: 'నమస్కారం', lang: 'తెలుగు' },
  { word: 'নমস্কার', lang: 'বাংলা' },
];

const SCENES = [
  { key: 'scene1', color: 'var(--dept-elec)', glyph: ic.bolt },
  { key: 'scene2', color: 'var(--dept-gas)', glyph: ic.flame },
  { key: 'scene3', color: 'var(--dept-water)', glyph: ic.drop },
  { key: 'scene4', color: 'var(--dept-health)', glyph: ic.heart },
  { key: 'scene5', color: 'var(--dept-trans)', glyph: ic.bus },
  { key: 'scene6', color: 'var(--dept-waste)', glyph: ic.trash },
  { key: 'scene7', color: 'var(--saffron-700)', glyph: ic.star },
  { key: 'scene8', color: 'var(--indigo-700)', glyph: ic.track },
  { key: 'scene9', color: 'var(--indigo-700)', glyph: ic.voice },
  { key: 'scene10', color: 'var(--saffron-500)', glyph: ic.user },
];

function makeDock(t) {
  return [
    { name: t('home.electricityDept', 'Electricity'), color: 'var(--dept-elec)', glyph: ic.bolt },
    { name: t('home.gasDept', 'Assam Gas'), color: 'var(--dept-gas)', glyph: ic.flame },
    { name: t('home.municipalDept', 'Municipal'), color: 'var(--dept-water)', glyph: ic.drop },
    { name: t('home.healthcare', 'Health'), color: 'var(--dept-health)', glyph: ic.heart },
    { name: t('home.transport', 'Transport'), color: 'var(--dept-trans)', glyph: ic.bus },
    { name: t('home.sanitation', 'Sanitation'), color: 'var(--dept-waste)', glyph: ic.trash },
    { name: t('home.schemes', 'Schemes'), color: 'var(--saffron-700)', glyph: ic.star },
    { name: t('attract.dockOffices', 'Offices'), color: 'var(--indigo-700)', glyph: ic.pin },
  ];
}

function formatClock(d) {
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function formatDate(d) {
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase();
}

export default function Attract() {
  useKioskScale();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { reducedMotion, userMode } = useAccessibility();
  const elderly = userMode === 'elderly';

  const [activeIndex, setActiveIndex] = useState(0);
  const [greetIndex, setGreetIndex] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  const sceneMs = elderly ? 5880 : 4200;
  const greetMs = elderly ? 3780 : 2700;

  useEffect(() => {
    const t1 = setInterval(() => setActiveIndex((i) => (i + 1) % SCENES.length), sceneMs);
    const t2 = setInterval(() => setGreetIndex((i) => (i + 1) % GREETINGS.length), greetMs);
    const t3 = setInterval(() => setNow(new Date()), 1000);
    return () => { clearInterval(t1); clearInterval(t2); clearInterval(t3); };
  }, [sceneMs, greetMs]);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const dock = makeDock(t);
  const greet = GREETINGS[greetIndex];
  const enter = () => navigate('/');

  return (
    <div
      className="vk kiosk-bg"
      role="button"
      tabIndex={0}
      aria-label={t('attract.ctaLabel', 'Touch anywhere to begin')}
      onPointerDown={enter}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') enter(); }}
      style={{ cursor: 'pointer' }}
    >
      {/* ambient blobs */}
      {!reducedMotion && (
        <>
          <div style={{
            position: 'absolute', top: 1040, left: -320, width: 1040, height: 1040, borderRadius: '50%',
            background: 'radial-gradient(circle, color-mix(in oklab, var(--indigo-500) 22%, transparent), transparent 70%)',
            filter: 'blur(8px)', animation: 'blobFloat 14s ease-in-out infinite', pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', top: 2160, right: -360, width: 1120, height: 1120, borderRadius: '50%',
            background: 'radial-gradient(circle, color-mix(in oklab, var(--saffron-500) 20%, transparent), transparent 70%)',
            filter: 'blur(8px)', animation: 'blobFloat2 18s ease-in-out infinite', pointerEvents: 'none',
          }} />
        </>
      )}

      <div className="vk-strip" style={{ zIndex: 3 }} />

      {/* top bar */}
      <div className="vk-top" style={{ zIndex: 3 }}>
        <div className="vk-brand">
          <div className="mk"><Logo size={48} /></div>
          <div>
            <div className="nm">SUVIDHA</div>
            <div className="sub">{t('app.brandSubtitle')}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{
            background: 'white', border: '1.5px solid var(--line)', borderRadius: 28,
            padding: '20px 32px', textAlign: 'right', minWidth: 240,
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, letterSpacing: '0.16em', color: 'var(--ink-500)' }}>
              {formatDate(now)}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: 44, color: 'var(--indigo-900)', marginTop: 2 }}>
              {formatClock(now)}
            </div>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: online ? 'color-mix(in oklab, var(--ok) 14%, white)' : 'color-mix(in oklab, var(--err) 14%, white)',
            border: `1.5px solid ${online ? 'color-mix(in oklab, var(--ok) 30%, white)' : 'color-mix(in oklab, var(--err) 30%, white)'}`,
            borderRadius: 28, padding: '0 28px', height: 96,
          }}>
            <span style={{
              width: 18, height: 18, borderRadius: '50%',
              background: online ? 'var(--ok)' : 'var(--err)',
              boxShadow: `0 0 0 6px color-mix(in oklab, ${online ? 'var(--ok)' : 'var(--err)'} 22%, transparent)`,
            }} />
            <span style={{ fontWeight: 700, fontSize: 26, color: online ? 'var(--ok)' : 'var(--err)' }}>
              {online ? t('attract.online', 'ONLINE') : t('attract.offline', 'OFFLINE')}
            </span>
          </div>
        </div>
      </div>

      {/* greeting hero */}
      <div style={{ padding: '8px 112px 0', flexShrink: 0, zIndex: 3 }}>
        <div className="label-tag" style={{ color: 'var(--saffron-700)' }}>
          {t('attract.eyebrow', 'Public Service Terminal')}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 40, marginTop: 16, minHeight: 200 }}>
          <div style={{
            fontFamily: 'var(--font-multi)', fontWeight: 800, fontSize: 168, lineHeight: 1,
            letterSpacing: '-0.03em', color: 'var(--indigo-900)',
          }}>
            {greet.word}
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: 28, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'var(--ink-500)', paddingBottom: 22,
          }}>
            {greet.lang}
          </div>
        </div>
        <div className="body-l" style={{ maxWidth: 1500 }}>{t('attract.subline')}</div>
      </div>

      {/* carousel */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 112px', zIndex: 3 }}>
        <div style={{
          background: 'white', border: '1px solid var(--line)', borderRadius: 64,
          boxShadow: 'var(--shadow-3)', overflow: 'hidden', position: 'relative',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 10, background: 'var(--surface-2)', zIndex: 2 }}>
            <div
              key={activeIndex}
              style={{
                height: '100%', background: 'linear-gradient(90deg, var(--indigo-500), var(--saffron-500))',
                animation: reducedMotion ? 'none' : `attractProgress ${sceneMs}ms linear forwards`,
                width: reducedMotion ? '100%' : undefined,
              }}
            />
          </div>
          <div style={{
            display: 'flex', width: `${SCENES.length * 100}%`,
            transform: `translateX(-${(activeIndex * 100) / SCENES.length}%)`,
            transition: 'transform 680ms cubic-bezier(.7,0,.2,1)',
          }}>
            {SCENES.map((s, idx) => (
              <div
                key={s.key}
                style={{
                  width: `${100 / SCENES.length}%`, flexShrink: 0, padding: '80px 80px 72px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                }}
              >
                <div style={{
                  width: 280, height: 280, borderRadius: 70, display: 'grid', placeItems: 'center',
                  background: `color-mix(in oklab, ${s.color} 16%, white)`,
                  border: `1px solid color-mix(in oklab, ${s.color} 32%, white)`,
                }}>
                  <I d={s.glyph} size={120} sw={1.8} style={{ color: s.color }} />
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 24, letterSpacing: '0.18em', textTransform: 'uppercase',
                  fontWeight: 500, marginTop: 40, color: s.color,
                }}>
                  {t(`attract.${s.key}Tag`)}
                </div>
                <div style={{
                  fontSize: 80, fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.04,
                  color: 'var(--indigo-900)', marginTop: 18, maxWidth: 1400,
                }}>
                  {t(`attract.${s.key}Title`)}
                </div>
                <div className="body-l" style={{ marginTop: 22, maxWidth: 1240 }}>
                  {t(`attract.${s.key}Sub`)}
                </div>
                <div style={{ display: 'flex', gap: 20, marginTop: 40, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 14, padding: '18px 32px',
                        borderRadius: 999, background: 'var(--surface-1)', border: '1.5px solid var(--line)',
                        fontSize: 26, fontWeight: 600, color: 'var(--ink-700)',
                      }}
                    >
                      <span style={{ width: 12, height: 12, borderRadius: '50%', background: s.color }} />
                      {t(`attract.${s.key}Chip${n}`)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* dots */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 40 }}>
          {SCENES.map((s, idx) => (
            <div
              key={s.key}
              style={{
                height: 16, width: idx === activeIndex ? 60 : 16, borderRadius: 999,
                background: idx === activeIndex ? 'var(--indigo-700)' : 'var(--indigo-300)',
                transition: 'all .5s ease',
              }}
            />
          ))}
        </div>
      </div>

      {/* department dock */}
      <div style={{ padding: '12px 112px 8px', flexShrink: 0, zIndex: 3 }}>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 20, letterSpacing: '0.16em', textTransform: 'uppercase',
          color: 'var(--ink-500)', textAlign: 'center', marginBottom: 24,
        }}>
          {t('attract.dockCaption', 'Every civic service, one screen')}
        </div>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
          {dock.map((d, idx) => (
            <div
              key={d.name}
              style={{
                width: 200, height: 200, borderRadius: 46, background: 'white', border: '1.5px solid var(--line)',
                boxShadow: 'var(--shadow-1)', display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 14,
                animation: reducedMotion ? 'none' : `dockFloat 4s ease-in-out infinite ${idx * 0.35}s`,
              }}
            >
              <div style={{
                width: 84, height: 84, borderRadius: 22, display: 'grid', placeItems: 'center',
                background: `color-mix(in oklab, ${d.color} 16%, white)`,
              }}>
                <I d={d.glyph} size={42} style={{ color: d.color }} />
              </div>
              <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink-700)' }}>{d.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* touch to begin */}
      <div style={{ padding: '38px 112px 56px', flexShrink: 0, display: 'flex', justifyContent: 'center', zIndex: 3 }}>
        <div style={{
          position: 'relative', display: 'flex', alignItems: 'center', gap: 32,
          background: 'var(--indigo-700)', color: 'var(--cream)', borderRadius: 999, padding: '40px 80px',
          boxShadow: '0 24px 64px rgba(58,53,150,.4)',
          animation: reducedMotion ? 'none' : 'touchPulse 2.4s ease-in-out infinite',
        }}>
          {!reducedMotion && (
            <span style={{
              position: 'absolute', left: 64, width: 96, height: 96, borderRadius: '50%',
              border: '4px solid var(--saffron-500)', animation: 'ringPulse 2.4s ease-out infinite', pointerEvents: 'none',
            }} />
          )}
          <div style={{ display: 'grid', placeItems: 'center', animation: reducedMotion ? 'none' : 'handBob 2.4s ease-in-out infinite' }}>
            <I d={ic.user} size={64} style={{ color: 'var(--saffron-500)' }} />
          </div>
          <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: '-0.01em' }}>
            {t('attract.ctaLabel', 'Touch anywhere to begin')}
          </div>
        </div>
      </div>
    </div>
  );
}
