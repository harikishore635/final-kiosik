// ──────────────────────────────────────────────────────────────────
// Login — Aadhaar entry (VAadhaar) → Mobile OTP (VAuth)
// Design source: docs/kiosk-design/designs/vertical-pages-v1.jsx:179-265
// Keeps all existing wiring: lookupAadhaar, validateAadhaarMobile, sendOtp,
// verifyOtp, QR/biometric fallbacks, toast, TTS.
// ──────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { lookupAadhaar, detectAccessibilityProfile, calculateAge } from '../utils/aadhaarDatabase';
import { authAPI } from '../utils/apiService';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { isValidIndianMobile, maskMobile, normalizeIndianMobile } from '../utils/phoneAuth';
import { speak } from '../utils/ttsService';
import { useSession } from '../context/SessionContext';
import { VK, I, ic, Keypad, OTPInput, AadhaarCells } from '../components/kiosk';
import { LoadingScreen, BiometricScanner, AadhaarChip, ButtonSpinner } from '../components/loading';
import { mockDelayRange } from '../utils/mockDelay';
import { toCitizenMessage } from '../utils/safeError';

// Mock CA/Consumer lookup DB
const ALT_AUTH_DB = {
  // Gas CA Numbers
  'CA-001234': { uid: '999988887777', name: 'Rajesh Kumar', mobile: '9876543210', type: 'gas', dept: 'Gas' },
  'CA-GHY-2024': { uid: '444455556666', name: 'Arun Patil', mobile: '9988776655', type: 'gas', dept: 'Gas' },
  'LN-45678': { uid: '111122223333', name: 'Kamala Devi', mobile: '9123456780', type: 'gas', dept: 'Gas (Legacy)' },
  // Municipal Consumer IDs
  'MC-001': { uid: '222233334444', name: 'Meera Shah', mobile: '9111222333', type: 'municipal', dept: 'Municipal' },
  'WC-GHY-2025': { uid: '999988887777', name: 'Rajesh Kumar', mobile: '9876543210', type: 'municipal', dept: 'Municipal' },
  'PT-009876': { uid: '111122223333', name: 'Kamala Devi', mobile: '9123456780', type: 'municipal', dept: 'Municipal' },
  // ── DEMO numbers — real phones for hackathon ─────────────────────────────
  'DEMO-AS-01': { uid: '866769213800', name: 'Priya Baruah', mobile: '8667692138', type: 'electricity', dept: 'Electricity', language: 'as' },
  'DEMO-HI-02': { uid: '739731161300', name: 'Rahul Das',    mobile: '7397311613', type: 'gas',         dept: 'Gas',         language: 'hi' },
  'DEMO-BN-03': { uid: '790480284900', name: 'Meena Gogoi',  mobile: '7904802849', type: 'municipal',    dept: 'Municipal',   language: 'bn' },
  'DEMO-EN-04': { uid: '730503711700', name: 'Arun Barua',   mobile: '7305037117', type: 'electricity', dept: 'Electricity', language: 'en' },
};

export default function Login() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { sendOtp, verifyOtp, otpLoading, completeCitizenSession } = useAuth();
  const toast = useToast();
  const { setLoggedIn, setUserType, setAadhaarVerified } = useSession();

  const finishLogin = () => {
    setLoggedIn(true);
    setUserType('citizen');
    setAadhaarVerified(true);
    navigate('/language-select');
  };

  const tts = (text, options = {}) => {
    speak(text, { language: i18n.language, ...options }).catch(() => {});
  };

  // Auth method tabs: aadhaar | ca_number | consumer_id
  const [authTab, setAuthTab] = useState('aadhaar');

  // --- Alt auth state (CA Number / Consumer ID) ---
  const [altId, setAltId] = useState('');
  const [altRecord, setAltRecord] = useState(null);
  const [altError, setAltError] = useState('');
  const [altOtpSent, setAltOtpSent] = useState(false);
  const [altOtp, setAltOtp] = useState('');
  const [altLoading, setAltLoading] = useState(false);

  const handleAltLookup = () => {
    const key = altId.trim().toUpperCase();
    const record = ALT_AUTH_DB[key] || ALT_AUTH_DB[altId.trim()];
    if (!record) {
      setAltError('ID not found. Try: CA-001234, LN-45678, MC-001, WC-GHY-2025');
      tts('ID not found. Please check and try again.', { priority: 'error' });
      return;
    }
    setAltRecord(record);
    setAltError('');
    setAltOtpSent(true);
    toast.success(`OTP sent to ****${record.mobile.slice(-4)}`);
    tts(`OTP sent to registered mobile. Please enter the 6-digit OTP.`, { priority: 'warning' });
  };

  const handleAltVerify = () => {
    if (altOtp !== '123456' && altOtp.length !== 6) {
      setAltError('Invalid OTP. Use 123456 for demo.');
      return;
    }
    completeCitizenSession({
      citizen: {
        uid: altRecord.uid, name: altRecord.name,
        mobile: altRecord.mobile, authDept: altRecord.dept,
      },
      token: null,
      authMethod: authTab === 'ca_number' ? 'ca_number_otp' : 'consumer_id_otp',
    });
    sessionStorage.setItem('autoDetectedMode', 'normal');
    sessionStorage.setItem('userAge', '35');
    toast.success('Login successful.');
    tts('Login successful.', { priority: 'warning', interrupt: true });
    finishLogin();
  };

  const [step, setStep] = useState('aadhaar');       // 'aadhaar' | 'auth'
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [aadhaarError, setAadhaarError] = useState('');
  const [aadhaarRecord, setAadhaarRecord] = useState(null);
  const [aadhaarLoading, setAadhaarLoading] = useState(false);

  const [mobile, setMobile] = useState('');
  const [maskedMobileValue, setMaskedMobileValue] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [authMethod, setAuthMethod] = useState('otp'); // 'otp' | 'qr' | 'biometric'
  const [otpSent, setOtpSent] = useState(false);
  const [methodLoading, setMethodLoading] = useState('');
  const [otpVerifying, setOtpVerifying] = useState(false);

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) return undefined;
    const t = window.setTimeout(() => setResendTimer((p) => p - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendTimer]);

  // ── Aadhaar entry handlers ───────────────────────────────────────
  const handleAadhaarKey = (digit) => {
    if (aadhaarNumber.length >= 12) return;
    setAadhaarError('');
    setAadhaarNumber((p) => (p + digit).slice(0, 12));
  };
  const handleAadhaarBackspace = () => {
    setAadhaarError('');
    setAadhaarNumber((p) => p.slice(0, -1));
  };

  const handleAadhaarLookup = async () => {
    const cleaned = aadhaarNumber.replace(/\s/g, '');
    setAadhaarError('');

    if (!/^\d{12}$/.test(cleaned)) {
      const msg = 'Please enter a valid 12-digit Aadhaar number';
      setAadhaarError(msg);
      toast.error(msg);
      tts('Invalid Aadhaar number.', { priority: 'error', interrupt: true, cache: false });
      return;
    }

    setAadhaarLoading(true);
    const result = await lookupAadhaar(cleaned);
    setAadhaarLoading(false);

    if (!result.success || !result.data) {
      const msg = result.error || 'Aadhaar verification failed.';
      setAadhaarError(msg);
      toast.error(msg);
      tts(msg, { priority: 'error', interrupt: true, cache: false });
      return;
    }

    const record = result.data;
    setAadhaarRecord(record);
    setStep('auth');
    setAuthMethod('otp');
    setOtpSent(false);
    setOtp('');
    setOtpError('');
    setResendTimer(0);
    sessionStorage.setItem('govIdType', 'aadhaar');
    sessionStorage.setItem('govId', `XXXX-XXXX-${cleaned.slice(-4)}`);

    if (/^\d{10}$/.test(record.mobile || '')) {
      setMobile(record.mobile);
    }
    if (record.language) {
      i18n.changeLanguage(record.language).catch(() => {});
    }

    toast.success('Aadhaar verified. Continue with mobile OTP.');
    tts('Aadhaar verified successfully.', { priority: 'warning' });

    // Auto-send OTP once Aadhaar verified
    setTimeout(() => handleSendOtp(record, /^\d{10}$/.test(record.mobile || '') ? record.mobile : ''), 200);
  };

  // ── OTP handlers ─────────────────────────────────────────────────
  const handleSendOtp = async (recordOverride, mobileOverride) => {
    const rec = recordOverride || aadhaarRecord;
    const targetMobile = mobileOverride ?? mobile;

    if (!rec?.uid) {
      toast.error('Aadhaar details are missing. Please verify Aadhaar again.');
      setStep('aadhaar');
      return;
    }

    const cleanedMobile = normalizeIndianMobile(targetMobile);
    setMobile(cleanedMobile);
    setOtpError('');

    if (!isValidIndianMobile(cleanedMobile)) {
      const msg = 'Please enter a valid 10-digit Indian mobile number.';
      setOtpError(msg);
      toast.error(msg);
      return;
    }

    try {
      const validation = await authAPI.validateAadhaarMobile(rec.uid, cleanedMobile);
      if (!validation?.success) {
        const msg = validation?.error || 'Mobile number does not match Aadhaar records.';
        setOtpError(msg);
        toast.error(msg);
        return;
      }

      const otpResult = await sendOtp({
        aadhaarUid: rec.uid,
        mobile: cleanedMobile,
      });

      if (!otpResult.success) {
        const msg = otpResult.error || 'Failed to send OTP.';
        setOtpError(msg);
        if (Number(otpResult.retryAfterSeconds) > 0) {
          setResendTimer(Number(otpResult.retryAfterSeconds));
        }
        toast.error(msg);
        return;
      }

      setMaskedMobileValue(validation.maskedMobile || maskMobile(cleanedMobile));
      setOtpSent(true);
      setOtp('');
      setOtpError('');
      setResendTimer(otpResult.resendAfterSeconds || 30);
      toast.success('OTP sent successfully.');
      tts('OTP sent successfully.', { priority: 'warning' });
    } catch (error) {
      const msg = toCitizenMessage(error, 'Failed to send OTP. Please try again.');
      setOtpError(msg);
      toast.error(msg);
    }
  };

  const handleOtpKey = (digit) => {
    if (otp.length >= 6) return;
    setOtpError('');
    setOtp((p) => (p + digit).slice(0, 6));
  };
  const handleOtpBackspace = () => {
    setOtpError('');
    setOtp((p) => p.slice(0, -1));
  };

  const handleVerifyOtp = async () => {
    setOtpError('');
    if (!/^\d{6}$/.test(otp)) {
      const msg = 'Please enter a valid 6-digit OTP.';
      setOtpError(msg);
      toast.error(msg);
      return;
    }

    setOtpVerifying(true);
    const [response] = await Promise.all([
      verifyOtp({
        otp,
        aadhaarUid: aadhaarRecord?.uid,
        mobile: normalizeIndianMobile(mobile),
      }),
      mockDelayRange(2200, 2800),
    ]);
    setOtpVerifying(false);

    if (!response.success || !response.data) {
      const msg = response.error || 'OTP verification failed.';
      setOtpError(msg);
      toast.error(msg);
      tts('OTP verification failed.', { priority: 'error', interrupt: true, cache: false });
      return;
    }

    const userData = response.data;
    const profile = detectAccessibilityProfile(aadhaarRecord || userData);
    sessionStorage.setItem('autoDetectedMode', profile);
    sessionStorage.setItem('userAge', calculateAge((aadhaarRecord || userData).dob).toString());
    sessionStorage.setItem('citizenData', JSON.stringify({ ...(aadhaarRecord || {}), ...userData }));

    toast.success('Login successful.');
    tts('Login successful.', { priority: 'warning', interrupt: true });
    finishLogin();
  };

  // ── QR + Biometric fallbacks ────────────────────────────────────
  const finalizeLoginForMethod = ({ data, token, method }) => {
    if (!data) return;
    completeCitizenSession({ citizen: data, token, authMethod: method });
    const profile = detectAccessibilityProfile(aadhaarRecord || data);
    sessionStorage.setItem('autoDetectedMode', profile);
    sessionStorage.setItem('userAge', calculateAge((aadhaarRecord || data).dob).toString());
    sessionStorage.setItem('citizenData', JSON.stringify({ ...(aadhaarRecord || {}), ...data }));
    toast.success('Login successful.');
    tts('Login successful.', { priority: 'warning', interrupt: true });
    finishLogin();
  };

  const handleQrDemoLogin = async () => {
    if (!aadhaarRecord?.uid) return;
    setMethodLoading('qr');
    try {
      const response = await authAPI.verifyQR(aadhaarRecord.uid);
      if (!response?.success || !response?.data) {
        toast.error(response?.error || 'QR verification failed.');
        return;
      }
      finalizeLoginForMethod({ data: response.data, token: response.token, method: 'qr_demo' });
    } catch (e) {
      toast.error(toCitizenMessage(e, 'QR verification failed.'));
    } finally {
      setMethodLoading('');
    }
  };

  const handleBiometricLogin = async () => {
    if (!aadhaarRecord?.uid) return;
    setMethodLoading('biometric');
    try {
      const [response] = await Promise.all([
        authAPI.verifyBiometric(aadhaarRecord.uid, 'fingerprint'),
        mockDelayRange(2200, 2800),
      ]);
      if (!response?.success || !response?.data) {
        toast.error(response?.error || 'Biometric verification failed.');
        return;
      }
      finalizeLoginForMethod({
        data: response.data,
        token: response.token,
        method: 'biometric_fingerprint',
      });
    } catch (e) {
      toast.error(toCitizenMessage(e, 'Biometric verification failed.'));
    } finally {
      setMethodLoading('');
    }
  };

  // ── Render ───────────────────────────────────────────────────────
  if (step === 'aadhaar') {
    const TAB_CONFIG = [
      { id: 'aadhaar',     label: 'Aadhaar',      icon: ic.shield, color: 'var(--indigo-700)' },
      { id: 'ca_number',   label: 'CA Number / Legacy', icon: ic.flame, color: 'var(--dept-gas)' },
      { id: 'consumer_id', label: 'Consumer ID',   icon: ic.drop,  color: 'var(--dept-water)' },
    ];

    return (
      <VK helpBack onBack={() => navigate('/')}>
        {/* Auth method tabs */}
        <div style={{
          display: 'flex', gap: 'calc(16px * var(--ui-scale))',
          marginBottom: 'calc(40px * var(--ui-scale))', padding: 'calc(10px * var(--ui-scale))',
          background: 'var(--surface-2)', borderRadius: 'calc(28px * var(--ui-scale))',
          maxWidth: 'calc(1400px * var(--ui-scale))', margin: '0 auto calc(40px * var(--ui-scale))',
        }}>
          {TAB_CONFIG.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setAuthTab(tab.id); setAltId(''); setAltError(''); setAltOtpSent(false); setAltOtp(''); setAltRecord(null); }}
              style={{
                flex: 1, minHeight: 'calc(108px * var(--ui-scale))', borderRadius: 'calc(22px * var(--ui-scale))',
                border: 'none', cursor: 'pointer',
                fontSize: 'calc(30px * var(--ui-scale))', fontWeight: 800, transition: 'all 0.2s',
                background: authTab === tab.id ? tab.color : 'transparent',
                color: authTab === tab.id ? 'white' : 'var(--ink-700)',
                boxShadow: authTab === tab.id ? '0 8px 24px rgba(0,0,0,0.18)' : 'none',
                transform: authTab === tab.id ? 'scale(1.03)' : 'scale(1)',
              }}
              aria-pressed={authTab === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Aadhaar tab */}
        {authTab === 'aadhaar' && (<>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 120, height: 120, borderRadius: '50%',
            background: 'var(--indigo-700)', color: 'white',
            display: 'inline-grid', placeItems: 'center', marginBottom: 24,
          }}>
            <I d={ic.shield} size={64} />
          </div>
          <h1 className="h2">Aadhaar Verification</h1>
          <p className="body-l" style={{ marginTop: 12 }}>
            Enter your 12-digit Aadhaar number
          </p>
        </div>

        <AadhaarCells value={aadhaarNumber} />

        {aadhaarError && (
          <div style={{
            textAlign: 'center', color: 'var(--err)', marginBottom: 16,
            fontSize: 18, fontWeight: 600,
          }}>
            {aadhaarError}
          </div>
        )}

        <Keypad
          onKey={handleAadhaarKey}
          onBackspace={handleAadhaarBackspace}
          onSubmit={handleAadhaarLookup}
          disabled={aadhaarLoading}
        />

        </>)}

        {/* CA Number / Legacy Number tab (Gas) */}
        {(authTab === 'ca_number') && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'var(--dept-gas)', color: 'white', display: 'inline-grid', placeItems: 'center', marginBottom: 24 }}>
                <I d={ic.flame} size={64} />
              </div>
              <h1 className="h2">Gas Consumer Login</h1>
              <p className="body-l" style={{ marginTop: 12 }}>Enter CA Number or Legacy Number (AGCL)</p>
            </div>

            {!altOtpSent ? (<>
              <div className="card" style={{ padding: 32, marginBottom: 24 }}>
                <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>CA Number / Legacy Number</div>
                <input
                  type="text"
                  value={altId}
                  onChange={e => { setAltId(e.target.value.toUpperCase()); setAltError(''); }}
                  placeholder="e.g. CA-001234 or LN-45678"
                  style={{ width: '100%', padding: '20px 24px', fontSize: 26, fontWeight: 700, border: '2px solid var(--line)', borderRadius: 16, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', outline: 'none' }}
                  aria-label="CA Number or Legacy Number"
                />
                {altError && <div style={{ color: 'var(--err)', marginTop: 12, fontSize: 18 }}>{altError}</div>}
              </div>
              <button type="button" className="btn btn-pri btn-xl" style={{ width: '100%' }} onClick={handleAltLookup} disabled={!altId.trim()}>
                Look up & Send OTP <I d={ic.arrow} size={26} />
              </button>
              <div style={{ marginTop: 16, textAlign: 'center', color: 'var(--ink-500)', fontSize: 18 }}>
                Demo: CA-001234 · LN-45678 · CA-GHY-2024
              </div>
            </>) : (<>
              <div className="card" style={{ padding: 32, marginBottom: 24, background: 'color-mix(in oklab, var(--ok) 8%, white)', borderColor: 'var(--ok)' }}>
                <div style={{ fontWeight: 800, fontSize: 24 }}> {altRecord?.name}</div>
                <div style={{ marginTop: 8, fontSize: 20, color: 'var(--ink-500)' }}>
                  OTP sent to ****{altRecord?.mobile?.slice(-4)} · {altRecord?.dept}
                </div>
              </div>
              <div className="card" style={{ padding: 32, marginBottom: 24 }}>
                <div style={{ textAlign: 'center', marginBottom: 16, fontSize: 20, fontWeight: 600 }}>Enter 6-digit OTP</div>
                <OTPInput value={altOtp} length={6} />
                {altError && <div style={{ color: 'var(--err)', marginTop: 8, textAlign: 'center', fontSize: 18 }}>{altError}</div>}
                <div style={{ marginTop: 24 }}>
                  <Keypad onKey={d => altOtp.length < 6 && setAltOtp(p => p + d)} onBackspace={() => setAltOtp(p => p.slice(0, -1))} onSubmit={handleAltVerify} maxWidth={480} />
                </div>
              </div>
              <button type="button" className="btn btn-pri btn-xl" style={{ width: '100%' }} onClick={handleAltVerify} disabled={altOtp.length < 6}>
                Verify & Login <I d={ic.arrow} size={26} />
              </button>
            </>)}
          </div>
        )}

        {/* Consumer ID tab (Municipal) */}
        {authTab === 'consumer_id' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ width: 120, height: 120, borderRadius: '50%', background: 'var(--dept-water)', color: 'white', display: 'inline-grid', placeItems: 'center', marginBottom: 24 }}>
                <I d={ic.drop} size={64} />
              </div>
              <h1 className="h2">Municipal Consumer Login</h1>
              <p className="body-l" style={{ marginTop: 12 }}>Enter Consumer ID or Water Connection ID</p>
            </div>

            {!altOtpSent ? (<>
              <div className="card" style={{ padding: 32, marginBottom: 24 }}>
                <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>Consumer ID / Property ID</div>
                <input
                  type="text"
                  value={altId}
                  onChange={e => { setAltId(e.target.value.toUpperCase()); setAltError(''); }}
                  placeholder="e.g. MC-001 or WC-GHY-2025"
                  style={{ width: '100%', padding: '20px 24px', fontSize: 26, fontWeight: 700, border: '2px solid var(--line)', borderRadius: 16, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', outline: 'none' }}
                  aria-label="Municipal Consumer ID"
                />
                {altError && <div style={{ color: 'var(--err)', marginTop: 12, fontSize: 18 }}>{altError}</div>}
              </div>
              <button type="button" className="btn btn-pri btn-xl" style={{ width: '100%' }} onClick={handleAltLookup} disabled={!altId.trim()}>
                Look up & Send OTP <I d={ic.arrow} size={26} />
              </button>
              <div style={{ marginTop: 16, textAlign: 'center', color: 'var(--ink-500)', fontSize: 18 }}>
                Demo: MC-001 · WC-GHY-2025 · PT-009876
              </div>
            </>) : (<>
              <div className="card" style={{ padding: 32, marginBottom: 24, background: 'color-mix(in oklab, var(--ok) 8%, white)', borderColor: 'var(--ok)' }}>
                <div style={{ fontWeight: 800, fontSize: 24 }}> {altRecord?.name}</div>
                <div style={{ marginTop: 8, fontSize: 20, color: 'var(--ink-500)' }}>
                  OTP sent to ****{altRecord?.mobile?.slice(-4)} · {altRecord?.dept}
                </div>
              </div>
              <div className="card" style={{ padding: 32, marginBottom: 24 }}>
                <div style={{ textAlign: 'center', marginBottom: 16, fontSize: 20, fontWeight: 600 }}>Enter 6-digit OTP</div>
                <OTPInput value={altOtp} length={6} />
                {altError && <div style={{ color: 'var(--err)', marginTop: 8, textAlign: 'center', fontSize: 18 }}>{altError}</div>}
                <div style={{ marginTop: 24 }}>
                  <Keypad onKey={d => altOtp.length < 6 && setAltOtp(p => p + d)} onBackspace={() => setAltOtp(p => p.slice(0, -1))} onSubmit={handleAltVerify} maxWidth={480} />
                </div>
              </div>
              <button type="button" className="btn btn-pri btn-xl" style={{ width: '100%' }} onClick={handleAltVerify} disabled={altOtp.length < 6}>
                Verify & Login <I d={ic.arrow} size={26} />
              </button>
            </>)}
          </div>
        )}

      </VK>
    );
  }

  // step === 'auth'
  const fullName = aadhaarRecord?.fullName || aadhaarRecord?.name || 'Citizen';
  const ageStr = aadhaarRecord?.dob ? `Age ${calculateAge(aadhaarRecord.dob)}` : '';
  const cityStr = aadhaarRecord?.address?.city || aadhaarRecord?.city || '';
  const maskedAadhaar = `XXXX-XXXX-${(aadhaarRecord?.uid || '').slice(-4)}`;

  if (otpVerifying) {
    return (
      <VK showBottom={false}>
        <LoadingScreen
          heading={t('loading.verifyingDetails', 'Verifying your details')}
          body={t('loading.dontRemoveCard', "This will only take a few seconds. Please don't remove your card.")}
          variant="signal"
          size={76}
          extra={<AadhaarChip last4={(mobile || '').slice(-4)} />}
        />
      </VK>
    );
  }

  if (methodLoading === 'biometric') {
    return (
      <VK showBottom={false}>
        <LoadingScreen
          heading={t('loading.scanningFingerprint', 'Scanning your fingerprint')}
          body={t('loading.keepFingerOnReader', 'Keep your finger resting on the reader until it turns green.')}
          extra={<BiometricScanner />}
        />
      </VK>
    );
  }

  return (
    <VK helpBack onBack={() => setStep('aadhaar')}>
      <div className="card" style={{
        background: 'color-mix(in oklab, var(--ok) 8%, white)',
        borderColor: 'var(--ok)',
        display: 'flex', alignItems: 'center', gap: 24,
        marginBottom: 28, padding: 24,
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'var(--ok)', color: 'white',
          display: 'grid', placeItems: 'center', flexShrink: 0,
        }}>
          <I d={ic.check} size={36} />
        </div>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--ok)' }}>{fullName}</div>
          <div className="body" style={{ marginTop: 4 }}>
            {maskedAadhaar}{ageStr && ` · ${ageStr}`}{cityStr && ` · ${cityStr}`}
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h2 className="h3">Choose verification method</h2>
      </div>

      <div style={{
        display: 'flex', gap: 12, padding: 8,
        background: 'var(--surface-2)', borderRadius: 24,
        marginBottom: 28,
      }}>
        <button
          type="button"
          className={`btn ${authMethod === 'otp' ? 'btn-pri' : 'btn-quiet'}`}
          style={{ flex: 1, minHeight: 76, fontSize: 22 }}
          onClick={() => setAuthMethod('otp')}
        >
          <I d={ic.phone} size={26} /> OTP
        </button>
        <button
          type="button"
          className={`btn ${authMethod === 'qr' ? 'btn-pri' : 'btn-quiet'}`}
          style={{ flex: 1, minHeight: 76, fontSize: 22 }}
          onClick={() => setAuthMethod('qr')}
        >
          <I d={ic.qr} size={26} /> QR
        </button>
        <button
          type="button"
          className={`btn ${authMethod === 'biometric' ? 'btn-pri' : 'btn-quiet'}`}
          style={{ flex: 1, minHeight: 76, fontSize: 22 }}
          onClick={() => setAuthMethod('biometric')}
        >
          <I d={ic.finger} size={26} /> Biometric
        </button>
      </div>

      {authMethod === 'otp' && (
        <div className="card" style={{ padding: 36 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div className="body">OTP sent to</div>
            <div style={{
              fontSize: 38, fontWeight: 700,
              color: 'var(--indigo-900)',
              fontFamily: 'var(--font-mono)',
              marginTop: 4,
            }}>
              {maskedMobileValue || maskMobile(mobile || '+91 98****0000')}
            </div>
          </div>

          <OTPInput value={otp} length={6} />

          {otpError && (
            <div style={{
              textAlign: 'center', color: 'var(--err)',
              marginTop: 16, fontSize: 18, fontWeight: 600,
            }}>
              {otpError}
            </div>
          )}

          <div style={{ marginTop: 24 }}>
            <Keypad
              onKey={handleOtpKey}
              onBackspace={handleOtpBackspace}
              onSubmit={handleVerifyOtp}
              maxWidth={480}
              disabled={otpLoading}
            />
          </div>

          <div style={{
            textAlign: 'center', marginTop: 22,
            color: 'var(--ink-500)', fontSize: 18,
          }}>
            {resendTimer > 0
              ? `Resend in ${resendTimer}s`
              : (
                <button
                  type="button"
                  onClick={() => handleSendOtp()}
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--indigo-700)', fontWeight: 600,
                    fontSize: 18, cursor: 'pointer',
                  }}
                >
                  Resend OTP
                </button>
              )}
          </div>
        </div>
      )}

      {authMethod === 'qr' && (
        <div className="card" style={{ padding: 36, textAlign: 'center' }}>
          <div style={{
            width: 280, height: 280, borderRadius: 18,
            background: 'var(--surface-1)',
            border: '2px dashed var(--indigo-300)',
            margin: '0 auto 20px',
            display: 'grid', placeItems: 'center',
            color: 'var(--indigo-700)',
          }}>
            <I d={ic.qr} size={120} />
          </div>
          <h3 className="h3" style={{ marginBottom: 8 }}>Scan QR via DigiLocker</h3>
          <p className="body" style={{ marginBottom: 24 }}>
            Open DigiLocker app · scan with your phone camera
          </p>
          <button
            type="button"
            className="btn btn-pri btn-xl"
            style={{ width: '100%' }}
            disabled={methodLoading === 'qr'}
            onClick={handleQrDemoLogin}
          >
            {methodLoading === 'qr' && <ButtonSpinner variant="primary" />}
            {methodLoading === 'qr' ? 'Verifying…' : 'Demo: Skip QR'}
            <I d={ic.arrow} size={26} />
          </button>
        </div>
      )}

      {authMethod === 'biometric' && (
        <div className="card" style={{ padding: 36, textAlign: 'center' }}>
          <div style={{
            width: 200, height: 200, borderRadius: '50%',
            background: 'var(--indigo-100)',
            border: '3px solid var(--indigo-300)',
            margin: '0 auto 20px',
            display: 'grid', placeItems: 'center',
            color: 'var(--indigo-700)',
          }}>
            <I d={ic.finger} size={110} />
          </div>
          <h3 className="h3" style={{ marginBottom: 8 }}>Touch fingerprint scanner</h3>
          <p className="body" style={{ marginBottom: 24 }}>
            Place your registered finger on the device
          </p>
          <button
            type="button"
            className="btn btn-pri btn-xl"
            style={{ width: '100%' }}
            disabled={methodLoading === 'biometric'}
            onClick={handleBiometricLogin}
          >
            {methodLoading === 'biometric' && <ButtonSpinner variant="primary" />}
            {methodLoading === 'biometric' ? 'Verifying…' : 'Demo: Skip Biometric'}
            <I d={ic.arrow} size={26} />
          </button>
        </div>
      )}
    </VK>
  );
}
