import { useEffect, useRef } from 'react';

// Generic inactivity timer — attaches passive activity listeners and calls
// onIdle() once timeoutMs elapses with no activity. Skips mousemove: a touch
// kiosk doesn't have a hovering pointer, and mousemove on touch-emulated
// browsers fires constantly, defeating the timer.
export default function useIdleRearm({ timeoutMs = 75000, onIdle, enabled = true } = {}) {
  const timerRef = useRef(null);
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    if (!enabled) return undefined;

    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onIdleRef.current?.(), timeoutMs);
    };

    const events = ['pointerdown', 'touchstart', 'keydown'];
    events.forEach((evt) => window.addEventListener(evt, reset, { passive: true }));
    reset();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((evt) => window.removeEventListener(evt, reset));
    };
  }, [timeoutMs, enabled]);
}
