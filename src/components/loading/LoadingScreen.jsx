import React from 'react';
import { useTranslation } from 'react-i18next';
import RadiantLoader from './RadiantLoader';
import { useLoadingState } from '../../hooks/useLoadingState';

// Full-screen blocking loader — heading, body, RadiantLoader, optional
// `extra` slot (chip / scanner / step-list), aria-live status region.
// Past 8s swaps copy to "still working", past 20s shows a Retry button —
// these branches don't fire for the app's ~2.4-2.8s mocked waits, but exist
// so the component is ready the moment real backend latency replaces them.
export default function LoadingScreen({
  heading,
  body,
  variant = 'signal',
  size = 76,
  dark = false,
  bg,
  extra,
  onRetry,
}) {
  const { t } = useTranslation();
  const elapsed = useLoadingState(true);

  const stillWorking = elapsed >= 8 && elapsed < 20;
  const timedOut = elapsed >= 20;

  const bodyText = timedOut
    ? t('loading.timeout', 'This is taking longer than expected.')
    : stillWorking
      ? t('loading.stillWorking', 'Still working — thanks for your patience.')
      : body;

  return (
    <div
      style={{
        display: 'flex',
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'calc(36px * var(--ui-scale))',
        padding: 'calc(40px * var(--ui-scale))',
        textAlign: 'center',
        background: bg,
        minHeight: '60vh',
      }}
    >
      <RadiantLoader variant={variant} size={Math.round(size * 1.7)} dark={dark} />
      {heading && (
        <h2 style={{ fontSize: 'calc(40px * var(--ui-scale))', fontWeight: 800, color: dark ? 'var(--cream)' : 'var(--ink-900)', margin: 0 }}>
          {heading}
        </h2>
      )}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{ fontSize: 'calc(24px * var(--ui-scale))', color: dark ? 'color-mix(in oklab, var(--cream) 72%, transparent)' : 'var(--ink-500)', lineHeight: 1.45, maxWidth: 'calc(640px * var(--ui-scale))' }}
      >
        {bodyText}
      </div>
      {extra}
      {timedOut && onRetry && (
        <button type="button" className="btn btn-pri btn-xl" onClick={onRetry}>
          {t('app.retry', 'Try again')}
        </button>
      )}
    </div>
  );
}
