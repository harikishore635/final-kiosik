import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAccessibility } from '../AccessibilityProvider';

// Screen 04's 3-row done/active/todo step list. Elderly mode collapses to a
// single large-text line per the spec ("remove the step list... just show
// 'Your request is being submitted' in large text").
export default function SubmissionSteps({ step, labels }) {
  const { t } = useTranslation();
  const { userMode } = useAccessibility();

  if (userMode === 'elderly') {
    return (
      <div style={{ fontSize: 'calc(34px * var(--ui-scale))', fontWeight: 800, color: 'var(--ink-900)', textAlign: 'center' }}>
        {t('loading.submittingElderly', 'Your request is being submitted')}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: 'calc(580px * var(--ui-scale))', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'calc(22px * var(--ui-scale))', textAlign: 'left' }}>
      {labels.map((label, i) => {
        const isDone = i < step;
        const isActive = i === step;
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 'calc(18px * var(--ui-scale))' }}>
            {isDone && (
              <span
                style={{
                  width: 'calc(42px * var(--ui-scale))', height: 'calc(42px * var(--ui-scale))', borderRadius: '50%', background: 'var(--ok)',
                  color: 'white', display: 'grid', placeItems: 'center', fontSize: 'calc(22px * var(--ui-scale))',
                  fontWeight: 700, flexShrink: 0,
                }}
              >
                
              </span>
            )}
            {isActive && (
              <span
                style={{
                  width: 'calc(42px * var(--ui-scale))', height: 'calc(42px * var(--ui-scale))', borderRadius: '50%', flexShrink: 0,
                  border: '3px solid var(--indigo-100)', borderTopColor: 'var(--indigo-700)',
                  animation: 'spin 0.7s linear infinite',
                }}
              />
            )}
            {!isDone && !isActive && (
              <span style={{ width: 'calc(42px * var(--ui-scale))', height: 'calc(42px * var(--ui-scale))', borderRadius: '50%', border: '2px solid var(--line)', flexShrink: 0 }} />
            )}
            <span style={{ fontSize: 'calc(24px * var(--ui-scale))', color: 'var(--ink-700)' }}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
