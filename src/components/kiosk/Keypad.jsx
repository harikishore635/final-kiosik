// Numeric keypad — 1-9, ⌫, 0, ✓
// Layout from docs/kiosk-design/designs/vertical-pages-v1.jsx:198 + primitives.css `.keypad`

import React from 'react';
import { useTranslation } from 'react-i18next';

const KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, '⌫', 0, '✓'];

// Speak digit via browser speechSynthesis — works offline, no import needed
function speakDigit(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.1;
  u.volume = 0.9;
  window.speechSynthesis.speak(u);
}

export default function Keypad({
  onKey,
  onBackspace,
  onSubmit,
  maxWidth = 560,
  disabled = false,
  speakDigits = true,   // read each digit aloud for blind users
}) {
  const { t } = useTranslation();
  const press = (k) => {
    if (disabled) return;
    if (k === '⌫') { speakDigits && speakDigit('delete'); return onBackspace?.(); }
    if (k === '✓') { speakDigits && speakDigit('submit'); return onSubmit?.(); }
    speakDigits && speakDigit(String(k));
    onKey?.(String(k));
  };

  return (
    <div className="keypad" style={{ maxWidth, margin: '0 auto', width: '100%' }}>
      {KEYS.map((k, i) => (
        <button
          key={i}
          type="button"
          aria-label={
            k === '⌫' ? t('app.delete') : k === '✓' ? t('app.submit') : t('keypad.digit', { n: k })
          }
          disabled={disabled}
          onClick={() => press(k)}
          style={{
            background: k === '✓' ? 'var(--ok)' : (k === '⌫' ? 'var(--surface-2)' : 'white'),
            color: k === '✓' ? 'white' : 'var(--indigo-900)',
            border: k === '✓' ? 'none' : '2px solid var(--line)',
          }}
        >
          {k}
        </button>
      ))}
    </div>
  );
}
