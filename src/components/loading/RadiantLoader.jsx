import React from 'react';
import { useAccessibility } from '../AccessibilityProvider';

// The Radiant Arch loader — reuses the exact arc geometry from
// src/components/kiosk/Logo.jsx. Three variants:
//   signal — arcs glow outward in sequence (blocking waits, light bg)
//   sweep  — spinning ring orbits a static arch (background/poll loads)
//   draw   — arcs draw themselves continuously (boot splash, dark bg)
export default function RadiantLoader({ variant = 'signal', size = 76, dark = false }) {
  const { reducedMotion, userMode } = useAccessibility();
  const loopDuration = userMode === 'elderly' ? 2.4 : 1.6;

  const strokeOuter = dark ? 'var(--cream)' : 'var(--indigo-700)';
  const strokeMid = dark ? 'var(--cream)' : 'var(--indigo-500)';
  const strokeInner = dark ? 'var(--cream)' : 'var(--indigo-300)';
  const staticOpacity = reducedMotion ? 0.6 : undefined;

  if (variant === 'sweep') {
    const ringSize = size;
    const archSize = Math.round(size * 0.52);
    return (
      <div style={{ position: 'relative', width: ringSize, height: ringSize, display: 'grid', placeItems: 'center' }}>
        <svg
          width={ringSize}
          height={ringSize}
          viewBox="0 0 100 100"
          style={{
            position: 'absolute',
            inset: 0,
            animation: reducedMotion ? 'none' : 'spin 1.05s linear infinite',
            opacity: reducedMotion ? 0.6 : 1,
          }}
        >
          <circle cx="50" cy="50" r="42" fill="none" stroke="var(--indigo-100)" strokeWidth="7" />
          <circle
            cx="50" cy="50" r="42" fill="none"
            stroke="var(--indigo-700)" strokeWidth="7" strokeLinecap="round"
            strokeDasharray="66 400"
          />
        </svg>
        <svg width={archSize} height={archSize} viewBox="0 0 120 120" fill="none">
          <path d="M30 78 A30 30 0 0 1 90 78" stroke="var(--indigo-700)" strokeWidth="6" strokeLinecap="round" />
          <path d="M40 78 A20 20 0 0 1 80 78" stroke="var(--indigo-500)" strokeWidth="5" strokeLinecap="round" opacity="0.85" />
          <rect x="28" y="80" width="64" height="4" rx="2" fill="var(--indigo-700)" opacity="0.9" />
          <circle cx="60" cy="40" r="4" fill="var(--saffron-500)" />
        </svg>
      </div>
    );
  }

  if (variant === 'draw') {
    const drawAnim = (delay) => (reducedMotion ? 'none' : `drawLoop 2.4s ease-in-out infinite ${delay}`);
    return (
      <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
        <path
          d="M30 78 A30 30 0 0 1 90 78" pathLength="100" stroke={strokeOuter} strokeWidth="6"
          strokeLinecap="round" strokeDasharray="100" style={{ animation: drawAnim(''), opacity: staticOpacity }}
        />
        <path
          d="M40 78 A20 20 0 0 1 80 78" pathLength="100" stroke={strokeMid} strokeWidth="5"
          strokeLinecap="round" strokeDasharray="100" opacity={staticOpacity ?? 0.85}
          style={{ animation: drawAnim('0.2s') }}
        />
        <path
          d="M48 78 A12 12 0 0 1 72 78" pathLength="100" stroke={strokeInner} strokeWidth="4"
          strokeLinecap="round" strokeDasharray="100" opacity={staticOpacity ?? 0.6}
          style={{ animation: drawAnim('0.4s') }}
        />
        <rect x="28" y="80" width="64" height="4" rx="2" fill={strokeOuter} opacity="0.9" />
        <circle cx="60" cy="40" r="4" fill="var(--saffron-500)" />
      </svg>
    );
  }

  // signal (default)
  const glowAnim = (delay) => (reducedMotion ? 'none' : `archGlow ${loopDuration}s ease-in-out infinite ${delay}`);
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" style={{ overflow: 'visible' }}>
      <path
        d="M30 78 A30 30 0 0 1 90 78" stroke={strokeOuter} strokeWidth="6" strokeLinecap="round"
        style={{ animation: glowAnim(''), opacity: staticOpacity }}
      />
      <path
        d="M40 78 A20 20 0 0 1 80 78" stroke={strokeMid} strokeWidth="5" strokeLinecap="round"
        style={{ animation: glowAnim('0.18s'), opacity: staticOpacity }}
      />
      <path
        d="M48 78 A12 12 0 0 1 72 78" stroke={strokeInner} strokeWidth="4" strokeLinecap="round"
        style={{ animation: glowAnim('0.36s'), opacity: staticOpacity }}
      />
      <rect x="28" y="80" width="64" height="4" rx="2" fill={strokeOuter} opacity="0.9" />
      <circle
        cx="60" cy="40" r="4" fill="var(--saffron-500)"
        style={{ animation: reducedMotion ? 'none' : `dotPulse ${loopDuration}s ease-in-out infinite`, opacity: staticOpacity }}
      />
    </svg>
  );
}
