// OTP cell row — renders N cells, fills from a string value.
// Layout from docs/kiosk-design/designs/vertical-pages-v1.jsx:248

import React from 'react';

export default function OTPInput({ value = '', length = 6, cellStyle = {} }) {
  const cells = Array.from({ length }, (_, i) => value[i] ?? '');
  const activeIndex = value.length; // next empty cell
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 14 }}>
      {cells.map((digit, i) => (
        <div
          key={i}
          className={`otp-cell ${i < activeIndex ? 'act' : ''}`}
          style={cellStyle}
        >
          {digit || (i === activeIndex ? '·' : '')}
        </div>
      ))}
    </div>
  );
}

// Aadhaar entry — 12-digit display row.
export function AadhaarCells({ value = '' }) {
  const cells = Array.from({ length: 12 }, (_, i) => value[i] ?? '');
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: 'calc(14px * var(--ui-scale))',
      marginBottom: 'calc(32px * var(--ui-scale))',
      flexWrap: 'wrap',
    }}>
      {cells.map((digit, i) => (
        <div
          key={i}
          className="otp-cell"
          style={{
            width: 'calc(96px * var(--ui-scale))',
            height: 'calc(124px * var(--ui-scale))',
            fontSize: 'calc(44px * var(--ui-scale))',
          }}
        >
          {digit}
        </div>
      ))}
    </div>
  );
}
