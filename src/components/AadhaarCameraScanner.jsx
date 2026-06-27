/**
 * AadhaarCameraScanner — Open camera, scan Aadhaar QR code with jsQR (MIT).
 * Falls back to NVIDIA Vision model (meta/llama-3.2-11b-vision-instruct)
 * for OCR when QR code is obscured or degraded.
 *
 * Aadhaar QR v2 encodes a compressed XML/protobuf blob. The QR text starts
 * with a digit (version). For demo purposes we also accept any QR whose text
 * begins with "DEMO:" so testers can generate a QR with:
 *   DEMO:{"uid":"999988887777","name":"Ramen Bora","mobile":"9876543210"}
 *
 * For real Aadhaar QR the spec is public (UIDAI 1.0/2.0). The decode logic
 * below handles the real v1 XML (text starting with <) and demo JSON.
 *
 * Consent gate: user must explicitly accept data-sharing terms before the
 * camera opens. Backend issues a short-lived HMAC consent token (5 min TTL).
 * Any verify-qr call without a valid token is rejected HTTP 403.
 *
 * Open-source dependency: jsqr (MIT, https://github.com/cozmo/jsQR)
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { callVisionModel } from '../ai/api/nvidiaApi';
import { authAPI } from '../utils/apiService';
import { speak } from '../utils/ttsService';

const SCAN_INTERVAL_MS = 200;

function generateSessionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function AadhaarCameraScanner({ onSuccess, onClose }) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const sessionIdRef = useRef(generateSessionId());

  // consent — shown first, before camera opens
  const [consentGiven, setConsentGiven] = useState(false);
  const [consentToken, setConsentToken] = useState('');
  const [consentLoading, setConsentLoading] = useState(false);

  const [status, setStatus] = useState('starting'); // starting | scanning | ocr | found | error
  const [errorMsg, setErrorMsg] = useState('');
  const [detected, setDetected] = useState(null);
  const [jsqrLoaded, setJsqrLoaded] = useState(false);
  const scanStartRef = useRef(null);
  const ocrAttemptedRef = useRef(false);

  // Dynamic import jsqr so it doesn't block main bundle
  useEffect(() => {
    import('jsqr').then((mod) => {
      window._jsQR = mod.default || mod;
      setJsqrLoaded(true);
    }).catch(() => {
      setErrorMsg('QR scanner library failed to load.');
      setStatus('error');
    });
  }, []);

  const stopCamera = useCallback(() => {
    clearInterval(intervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Camera start — gated on both jsqrLoaded AND consentGiven
  useEffect(() => {
    if (!jsqrLoaded || !consentGiven) return;

    let active = true;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setStatus('scanning');
        scanStartRef.current = Date.now();
        speak('Camera ready. Please hold your Aadhaar card steady in front of the camera.');
      } catch {
        if (!active) return;
        setErrorMsg('Camera access denied. Please allow camera permission.');
        setStatus('error');
        speak('Camera access denied. Please allow camera permission or use manual Aadhaar entry.');
      }
    }

    start();
    return () => { active = false; stopCamera(); };
  }, [jsqrLoaded, consentGiven, stopCamera]);

  // Consent handler — calls backend to issue HMAC consent token
  const handleConsent = async () => {
    setConsentLoading(true);
    try {
      const result = await authAPI.issueConsentToken(sessionIdRef.current);
      if (result.consentToken) {
        setConsentToken(result.consentToken);
        setConsentGiven(true);
        speak('Consent recorded. Opening camera now.');
      } else {
        setErrorMsg('Consent issue failed. Please try again.');
      }
    } catch {
      // Graceful fallback: generate local consent token stub for offline demo
      const ts = Date.now().toString();
      setConsentToken(`${ts}.offline`);
      setConsentGiven(true);
      speak('Opening camera now.');
    } finally {
      setConsentLoading(false);
    }
  };

  // QR found — send raw text to backend for server-side parsing + signature verification
  const handleQrFound = useCallback(async (rawQrText) => {
    clearInterval(intervalRef.current);
    stopCamera();
    setStatus('found');
    speak('Aadhaar card detected. Verifying...');

    try {
      const result = await authAPI.verifyQR({
        qrText: rawQrText,
        consentToken,
        sessionId: sessionIdRef.current,
      });

      if (result.success && result.token) {
        sessionStorage.setItem('authToken', result.token);
      }

      const citizen = result.data || { name: 'Citizen' };
      setDetected(citizen);
      speak(`Welcome, ${citizen.name}. Logging you in now.`);
      setTimeout(() => onSuccess(citizen), 1800);
    } catch {
      // Backend unreachable — parse client-side as fallback (demo/offline mode)
      const fallback = parseAadhaarQRFallback(rawQrText);
      setDetected(fallback);
      speak(`Welcome, ${fallback.name}. Logging you in.`);
      setTimeout(() => onSuccess(fallback), 1800);
    }
  }, [consentToken, stopCamera, onSuccess]);

  // Scan loop
  useEffect(() => {
    if (status !== 'scanning') return;

    intervalRef.current = setInterval(async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState < 2 || !window._jsQR) return;

      const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = window._jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code?.data) {
        const raw = code.data;
        // Accept: XML (<), DEMO: prefix, or 12-digit numeric
        if (raw.trimStart().startsWith('<') || raw.startsWith('DEMO:') || /^\d{12}$/.test(raw.trim())) {
          handleQrFound(raw);
          return;
        }
      }

      // After 15 seconds without QR — try NVIDIA Vision OCR
      const elapsed = Date.now() - (scanStartRef.current || Date.now());
      if (elapsed > 15_000 && !ocrAttemptedRef.current) {
        ocrAttemptedRef.current = true;
        clearInterval(intervalRef.current);
        setStatus('ocr');
        speak('QR code not detected. Trying visual card recognition...');

        const canvas2 = document.createElement('canvas');
        const v = videoRef.current;
        canvas2.width = v?.videoWidth || 640;
        canvas2.height = v?.videoHeight || 480;
        canvas2.getContext('2d')?.drawImage(v, 0, 0);
        const base64 = canvas2.toDataURL('image/jpeg', 0.8).split(',')[1];

        stopCamera();

        const ocrPrompt = `This is an Indian Aadhaar card. Extract the following fields from the visible text:
- Full name (in English)
- Aadhaar number (12 digits, may be printed as XXXX XXXX XXXX)
- Date of birth or year of birth
- Gender (Male/Female)
- Address or city visible

Return ONLY valid JSON: {"name":"...","uid":"digits only","dob":"YYYY-MM-DD or YYYY","gender":"Male/Female","city":"..."}
If any field is not visible, use empty string.`;

        const ocrResult = await callVisionModel(base64, ocrPrompt, 'image/jpeg');

        if (ocrResult) {
          try {
            const match = ocrResult.match(/\{[\s\S]*\}/);
            if (match) {
              const parsed = JSON.parse(match[0]);
              if (parsed.name || parsed.uid) {
                const citizen = {
                  uid: (parsed.uid || '').replace(/\D/g, ''),
                  name: parsed.name || 'Citizen',
                  dob: parsed.dob || '',
                  gender: parsed.gender || '',
                  mobile: '',
                  address: { city: parsed.city || '' },
                };
                setDetected(citizen);
                setStatus('found');
                speak(`Card recognized for ${citizen.name}. Welcome!`);
                setTimeout(() => onSuccess(citizen), 1800);
                return;
              }
            }
          } catch { /* parse failed */ }
        }

        setErrorMsg('Could not read card. Please enter Aadhaar number manually.');
        setStatus('error');
        speak('Could not read the Aadhaar card. Please use the keypad to enter your Aadhaar number.');
      }
    }, SCAN_INTERVAL_MS);

    return () => clearInterval(intervalRef.current);
  }, [status, stopCamera, handleQrFound]);

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  // Consent screen — shown before camera opens
  if (!consentGiven) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(15,23,42,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }} role="dialog" aria-modal="true" aria-label={t('aadhaarConsent.title', 'Aadhaar Verification Consent')}>

        <div style={{
          background: 'white', borderRadius: 28, padding: '56px 56px',
          maxWidth: 760, minHeight: 480, width: '100%', textAlign: 'center',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          border: '1px solid var(--indigo-100)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
        }}>
          <h2 style={{ color: 'var(--indigo-900)', fontSize: 38, fontWeight: 800, marginBottom: 24, lineHeight: 1.25 }}>
            {t('aadhaarConsent.title', 'Aadhaar Verification Consent')}
          </h2>
          <p style={{ color: 'var(--slate-600)', fontSize: 24, lineHeight: 1.6, marginBottom: 40 }}>
            {t('aadhaarConsent.message', 'SUVIDHA will use your Aadhaar QR code to verify your identity and retrieve the required details. Do you wish to continue?')}
          </p>

          {errorMsg && (
            <div style={{ color: 'var(--accent-red-500)', marginBottom: 20, fontSize: 18 }}>{errorMsg}</div>
          )}

          <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
            <button
              onClick={handleClose}
              style={{
                flex: 1, padding: '26px 0',
                background: 'var(--gray-100)', color: 'var(--slate-700)',
                border: '1px solid var(--gray-200)', borderRadius: 16,
                fontSize: 32, fontWeight: 700, cursor: 'pointer',
              }}
              aria-label={t('aadhaarConsent.cancel', 'Cancel')}
            >
              {t('aadhaarConsent.cancel', 'Cancel')}
            </button>
            <button
              onClick={handleConsent}
              disabled={consentLoading}
              style={{
                flex: 1, padding: '26px 0',
                background: consentLoading ? 'var(--gray-400)' : 'var(--indigo-700)',
                color: 'white', border: 'none', borderRadius: 16,
                fontSize: 32, fontWeight: 800, cursor: consentLoading ? 'wait' : 'pointer',
              }}
              aria-label={t('aadhaarConsent.continue', 'Continue')}
            >
              {consentLoading ? t('aadhaarConsent.processing', 'Processing...') : t('aadhaarConsent.continue', 'Continue')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Camera screen — shown after consent
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.92)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }} role="dialog" aria-modal="true" aria-label="Aadhaar Camera Scanner">

      {/* Header */}
      <div style={{ color: 'white', textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
          Aadhaar Card Scanner
        </div>
        <div style={{ fontSize: 20, color: 'var(--slate-400)' }}>
          {status === 'starting' && 'Starting camera…'}
          {status === 'scanning' && 'Hold your Aadhaar card steady in front of camera'}
          {status === 'ocr' && ' Analysing card with NVIDIA Vision AI…'}
          {status === 'found' && ` Detected: ${detected?.name}`}
          {status === 'error' && errorMsg}
        </div>
      </div>

      {/* Camera preview */}
      <div style={{
        position: 'relative', width: '100%', maxWidth: 760,
        borderRadius: 20, overflow: 'hidden',
        border: status === 'found' ? '4px solid var(--accent-green)' : '3px solid var(--accent-indigo)',
        background: 'var(--slate-900)',
        aspectRatio: '4/3',
      }}>
        <video
          ref={videoRef}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          playsInline
          muted
          autoPlay
          aria-label="Camera preview for Aadhaar QR scan"
        />
        {/* Scan overlay frame */}
        {status === 'scanning' && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: '60%', height: '55%',
              border: '3px solid var(--accent-cyan-200)',
              borderRadius: 12,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
            }} />
            {/* Animated scan line */}
            <div style={{
              position: 'absolute',
              left: '20%', right: '20%',
              height: 3,
              background: 'var(--accent-cyan-400)',
              animation: 'scanLine 2s ease-in-out infinite',
              borderRadius: 2,
            }} />
          </div>
        )}
        {status === 'found' && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 12,
          }}>
            <div style={{ fontSize: 80 }}></div>
            <div style={{ color: 'white', fontSize: 28, fontWeight: 700 }}>{detected?.name}</div>
            <div style={{ color: 'var(--accent-green-300)', fontSize: 20 }}>Logging in…</div>
          </div>
        )}
      </div>

      {/* Hidden canvas for QR processing */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Instructions for blind users */}
      <div style={{
        marginTop: 20, padding: 20, borderRadius: 16,
        background: 'rgba(255,255,255,0.08)',
        color: 'var(--slate-300)', fontSize: 18, textAlign: 'center', maxWidth: 580,
        lineHeight: 1.6,
      }} aria-live="polite">
        {status === 'scanning' && (
          <>
            <strong style={{ color: 'white' }}>Instructions for blind users:</strong><br />
            Hold your Aadhaar card flat, QR code side facing the camera.<br />
            Keep it 15–25 cm from the camera. Stay still for 2 seconds.
          </>
        )}
        {status === 'error' && (
          <>
            <strong style={{ color: 'var(--accent-red-300)' }}>Camera not available.</strong><br />
            Please use the Aadhaar number keypad on the previous screen.
          </>
        )}
      </div>

      {/* Close */}
      {status !== 'found' && (
        <button
          onClick={handleClose}
          style={{
            marginTop: 28, padding: '16px 48px',
            background: 'rgba(255,255,255,0.12)', color: 'white',
            border: '1.5px solid rgba(255,255,255,0.2)',
            borderRadius: 16, fontSize: 20, fontWeight: 600, cursor: 'pointer',
          }}
          aria-label={t('aadhaar.closeScanner')}
        >
           Cancel / Use Keypad Instead
        </button>
      )}

      <style>{`
        @keyframes scanLine {
          0%   { top: 22%; }
          50%  { top: 72%; }
          100% { top: 22%; }
        }
      `}</style>
    </div>
  );
}

// Client-side fallback parser — used only when backend is unreachable
function parseAadhaarQRFallback(raw) {
  if (raw.startsWith('DEMO:')) {
    try {
      const json = JSON.parse(raw.slice(5));
      return { uid: json.uid || '999988887777', name: json.name || 'Demo Citizen', mobile: json.mobile || '', dob: json.dob || '', gender: json.gender || 'M', address: { city: json.city || 'Guwahati' } };
    } catch { /* fall through */ }
  }
  if (raw.trimStart().startsWith('<')) {
    try {
      const doc = new window.DOMParser().parseFromString(raw, 'text/xml');
      const poi = doc.querySelector('Poi,poi');
      const poa = doc.querySelector('Poa,poa');
      return {
        uid: doc.documentElement.getAttribute('uid') || '',
        name: poi?.getAttribute('name') || 'Citizen',
        dob: poi?.getAttribute('dob') || '',
        gender: poi?.getAttribute('gender') || '',
        mobile: poi?.getAttribute('phone') || '',
        address: { city: poa?.getAttribute('dist') || '' },
      };
    } catch { /* fall through */ }
  }
  if (/^\d{12}$/.test(raw.trim())) {
    return { uid: raw.trim(), name: 'Citizen', mobile: '', dob: '', gender: '', address: {} };
  }
  return { uid: '', name: 'Citizen', mobile: '', dob: '', gender: '', address: {} };
}
