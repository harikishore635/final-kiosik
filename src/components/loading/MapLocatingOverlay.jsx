import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAccessibility } from '../AccessibilityProvider';
import RadiantLoader from './RadiantLoader';

// Screen 08 — radar ping + bottom sheet, overlaid above the real map while
// it becomes ready underneath (map itself isn't unmounted).
export default function MapLocatingOverlay() {
  const { t } = useTranslation();
  const { reducedMotion } = useAccessibility();

  const ring = (delay) => ({
    position: 'absolute', width: 90, height: 90, margin: -45, borderRadius: '50%',
    background: 'color-mix(in oklab, var(--saffron-500) 45%, transparent)',
    animation: reducedMotion ? 'none' : `loaderPing 2.1s ease-out infinite ${delay}`,
    opacity: reducedMotion ? 0.6 : undefined,
  });

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'var(--surface-2)', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute', inset: 0,
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent 0 40px, color-mix(in oklab, var(--ink-500) 9%, transparent) 40px 42px), repeating-linear-gradient(90deg, transparent 0 52px, color-mix(in oklab, var(--ink-500) 9%, transparent) 52px 54px)',
        }}
      />
      <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: 0, height: 0 }}>
        <div style={ring('0s')} />
        <div style={ring('0.7s')} />
        <div style={ring('1.4s')} />
        <div
          style={{
            position: 'absolute', width: 20, height: 20, margin: -10, borderRadius: '50%',
            background: 'var(--saffron-500)', border: '3px solid var(--cream)',
            boxShadow: '0 4px 12px rgba(0,0,0,.3)',
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, background: 'var(--surface-0)',
          borderTop: '1px solid var(--line)', padding: '20px 22px', display: 'flex', gap: 14, alignItems: 'center',
        }}
      >
        <RadiantLoader variant="sweep" size={34} />
        <div role="status" aria-live="polite" aria-atomic="true" style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink-900)' }}>
            {t('loading.findingOffices', 'Finding offices near you')}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-500)' }}>
            {t('loading.locatingPosition', 'Locating your position…')}
          </div>
        </div>
      </div>
    </div>
  );
}
