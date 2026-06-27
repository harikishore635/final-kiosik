// ──────────────────────────────────────────────────────────────────
// SUVIDHA Vertical Kiosk · Icon set
// Verbatim port of the `ic` map from `docs/kiosk-design/designs/kiosk-shell.jsx:25`.
// We use inline SVG (not lucide-react) because the project pins lucide-react
// at ^1.16.0 — a divergent old line where icon coverage isn't guaranteed.
// All icons render at 24×24 viewBox; size scales via the `size` prop on <I>.
// ──────────────────────────────────────────────────────────────────

import React from 'react';

export function I({ d, size = 28, sw = 2, className = '', style }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{
        width: `calc(${size}px * var(--ui-scale))`,
        height: `calc(${size}px * var(--ui-scale))`,
        flexShrink: 0,
        ...style,
      }}
      aria-hidden="true"
    >
      {d}
    </svg>
  );
}

export const ic = {
  bolt:     <path d="M13 3 L5 13 H11 L10 21 L18 11 H12 Z" />,
  flame:    <path d="M12 3 C 14 7 18 9 18 14 A6 6 0 1 1 6 14 C 6 11 8 9 9 7 C 10 9 11 11 12 12 C 12 9 12 6 12 3 Z" />,
  drop:     <path d="M12 3 C 8 9 5 13 5 16 A7 7 0 0 0 19 16 C 19 13 16 9 12 3 Z" />,
  trash:    <g><path d="M5 7 H19" /><path d="M9 7 V5 H15 V7" /><path d="M7 7 L8 21 H16 L17 7" /></g>,
  globe:    <g><circle cx="12" cy="12" r="9" /><path d="M3 12 H21" /><path d="M12 3 C 9 7 9 17 12 21" /><path d="M12 3 C 15 7 15 17 12 21" /></g>,
  help:     <g><circle cx="12" cy="12" r="9" /><path d="M9.5 9 A2.5 2.5 0 1 1 12 13 V14" /><circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="none" /></g>,
  user:     <g><circle cx="12" cy="8" r="4" /><path d="M4 20 C 4 16 8 14 12 14 C 16 14 20 16 20 20" /></g>,
  shield:   <g><path d="M12 3 L20 6 V12 C20 16 16 19 12 21 C8 19 4 16 4 12 V6 Z" /><path d="M9 12 L11 14 L15 10" /></g>,
  arrow:    <g><path d="M5 12 H19" /><path d="M14 7 L19 12 L14 17" /></g>,
  back:     <g><path d="M19 12 H5" /><path d="M10 7 L5 12 L10 17" /></g>,
  check:    <path d="M5 12 L10 17 L19 7" />,
  x:        <g><path d="M6 6 L18 18" /><path d="M18 6 L6 18" /></g>,
  sos:      <g><circle cx="12" cy="12" r="9" /><path d="M12 7 V13" /><circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="none" /></g>,
  bell:     <g><path d="M6 16 V11 A6 6 0 0 1 18 11 V16 L20 18 H4 Z" /><path d="M10 21 A2 2 0 0 0 14 21" /></g>,
  receipt:  <g><path d="M6 3 H18 V21 L15 19 L12 21 L9 19 L6 21 Z" /><path d="M9 8 H15" /><path d="M9 12 H15" /><path d="M9 16 H13" /></g>,
  track:    <g><circle cx="12" cy="12" r="9" /><path d="M12 7 V12 L15 14" /></g>,
  pin:      <g><path d="M12 2 C 8 2 5 5 5 9 C 5 14 12 22 12 22 C 12 22 19 14 19 9 C 19 5 16 2 12 2 Z" /><circle cx="12" cy="9" r="2.5" /></g>,
  qr:       <g><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><path d="M14 14 H17 M20 14 V17 M14 17 H17 V20 H14 Z M20 20 H21" /></g>,
  finger:   <g><path d="M8 21 C 6 18 6 14 6 11 A6 6 0 0 1 18 11 C 18 13 17 15 16 17" /><path d="M9 21 C 9 18 9 14 12 14 C 14 14 14 17 14 19" /></g>,
  voice:    <g><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11 A7 7 0 0 0 19 11" /><path d="M12 18 V21" /></g>,
  plus:     <g><path d="M12 5 V19" /><path d="M5 12 H19" /></g>,
  print:    <g><path d="M7 9 V4 H17 V9" /><rect x="4" y="9" width="16" height="8" rx="2" /><path d="M7 14 H17 V21 H7 Z" /></g>,
  phone:    <path d="M5 4 H9 L11 9 L8.5 11 C 10 14 11 15 13 16.5 L15 14 L20 16 V20 C 12 20 4 12 4 5 Z" />,
  type:     <g><path d="M5 7 V5 H19 V7" /><path d="M12 5 V20" /><path d="M9 20 H15" /></g>,
  family:   <g><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2" /><path d="M3 20 C 3 16 6 14 9 14 C 12 14 15 16 15 20" /><path d="M14 20 C 14 17 16 16 17 16 C 18 16 21 17 21 20" /></g>,
  heart:    <path d="M12 21 C 4 14 4 7 8 6 C 10 5 12 7 12 9 C 12 7 14 5 16 6 C 20 7 20 14 12 21 Z" />,
  bus:      <g><rect x="4" y="6" width="16" height="11" rx="2" /><circle cx="8" cy="19" r="1.5" /><circle cx="16" cy="19" r="1.5" /><path d="M4 12 H20" /></g>,
  building: <g><rect x="4" y="6" width="16" height="15" /><path d="M8 11 H10 M14 11 H16 M8 15 H10 M14 15 H16" /><path d="M8 6 V3 H16 V6" /></g>,
  search:   <g><circle cx="11" cy="11" r="6" /><path d="M16 16 L20 20" /></g>,
  cog:      <g><circle cx="12" cy="12" r="3" /><path d="M12 3 V6 M12 18 V21 M3 12 H6 M18 12 H21 M5.6 5.6 L7.7 7.7 M16.3 16.3 L18.4 18.4 M5.6 18.4 L7.7 16.3 M16.3 7.7 L18.4 5.6" /></g>,
  sun:      <g><circle cx="12" cy="12" r="4" /><path d="M12 3 V5 M12 19 V21 M3 12 H5 M19 12 H21 M5.6 5.6 L7 7 M17 17 L18.4 18.4 M5.6 18.4 L7 17 M17 7 L18.4 5.6" /></g>,
  cloud:    <path d="M7 18 A5 5 0 0 1 7 8 A5 5 0 0 1 16 8 A4 4 0 0 1 17 18 Z" />,
  cloudsun: <g><circle cx="8" cy="8" r="3" /><path d="M8 2 V4 M2 8 H4 M3.5 3.5 L4.7 4.7" /><path d="M10 19 A4 4 0 0 1 10 11 A4 4 0 0 1 18 11 A3 3 0 0 1 19 19 Z" /></g>,
  wifi:     <g><path d="M3 9 C 8 5 16 5 21 9" /><path d="M6 13 C 9 10 15 10 18 13" /><path d="M9 17 C 11 15 13 15 15 17" /><circle cx="12" cy="20" r="0.5" fill="currentColor" stroke="none" /></g>,
  clock:    <g><circle cx="12" cy="12" r="9" /><path d="M12 7 V12 L15 14" /></g>,
  leaf:     <g><path d="M5 19 C 5 12 10 5 19 5 C 19 14 14 19 7 19" /><path d="M5 19 L13 11" /></g>,
  card:     <g><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10 H21" /><path d="M7 15 H11" /></g>,
  upload:   <g><path d="M12 4 V16" /><path d="M7 9 L12 4 L17 9" /><path d="M4 20 H20" /></g>,
  download: <g><path d="M12 4 V16" /><path d="M7 11 L12 16 L17 11" /><path d="M4 20 H20" /></g>,
  pill:     <g><rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-30 12 12)" /><path d="M9 7 L15 13" transform="rotate(-30 12 12)" /></g>,
  doc:      <g><path d="M6 3 H14 L18 7 V21 H6 Z" /><path d="M14 3 V7 H18" /><path d="M9 13 H15 M9 17 H13" /></g>,
  rupee:    <g><path d="M7 5 H17" /><path d="M7 9 H17" /><path d="M7 5 C 13 5 13 13 7 13 H10 L16 20" /></g>,
  calendar: <g><rect x="4" y="6" width="16" height="15" rx="2" /><path d="M4 11 H20" /><path d="M9 4 V8 M15 4 V8" /></g>,
  star:     <path d="M12 3 L14.5 9 L21 9.8 L16 14 L17.5 20.5 L12 17 L6.5 20.5 L8 14 L3 9.8 L9.5 9 Z" />,
  edit:     <g><path d="M16 4 L20 8 L8 20 H4 V16 Z" /><path d="M13 7 L17 11" /></g>,
  link:     <g><path d="M10 14 L14 10" /><path d="M11 6 L15 2 A4 4 0 0 1 22 9 L18 13" /><path d="M13 18 L9 22 A4 4 0 0 1 2 15 L6 11" /></g>,
  dot:      <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />,
  chat:     <g><path d="M4 5 H20 V16 H9 L5 20 V16 H4 Z" /><path d="M8 9 H16 M8 12.5 H13" /></g>,
  logout:   <g><path d="M9 4 H6 A2 2 0 0 0 4 6 V18 A2 2 0 0 0 6 20 H9" /><path d="M16 16 L20 12 L16 8" /><path d="M20 12 H10" /></g>,
};

// Pick the right weather icon glyph from an iconKey string ('sun'|'cloud'|'cloudsun')
export function weatherIcon(iconKey) {
  return ic[iconKey] || ic.cloudsun;
}
