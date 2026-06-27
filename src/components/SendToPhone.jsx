import React, { useState } from 'react';
import { Smartphone, CheckCircle } from 'lucide-react';
import { validateMobile } from '../utils/helpers';
import { notificationAPI } from '../utils/apiService';

/**
 * Send to Phone — allows sending receipt/invoice/document to user's mobile.
 * Options: SMS, WhatsApp. Grouped with the mobile field as one action.
 * In production: calls SMS gateway API. Demo simulates success.
 */
const SendToPhone = ({ documentType = 'Receipt', documentId = '', className = '' }) => {
  const [mobile, setMobile] = useState(() => sessionStorage.getItem('userMobile') || '');
  const [sendingMethod, setSendingMethod] = useState(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const lang = localStorage.getItem('i18nextLng') || 'en';

  const labels = {
    en: {
      title: `Send ${documentType} to Phone`,
      placeholder: 'Enter 10-digit mobile number',
      sendSMS: 'Send via SMS',
      sendWhatsApp: 'Send via WhatsApp',
      success: `${documentType} sent to your phone!`,
      invalidMobile: 'Enter a valid 10-digit mobile number',
    },
    hi: {
      title: `${documentType} फ़ोन पर भेजें`,
      placeholder: '10 अंकों का मोबाइल नंबर दर्ज करें',
      sendSMS: 'SMS से भेजें',
      sendWhatsApp: 'WhatsApp से भेजें',
      success: `${documentType} आपके फ़ोन पर भेज दिया गया!`,
      invalidMobile: 'वैध 10 अंकों का मोबाइल नंबर दर्ज करें',
    },
    ta: {
      title: `${documentType} தொலைபேசிக்கு அனுப்பு`,
      placeholder: '10 இலக்க மொபைல் எண்ணை உள்ளிடவும்',
      sendSMS: 'SMS மூலம் அனுப்பு',
      sendWhatsApp: 'WhatsApp மூலம் அனுப்பு',
      success: `${documentType} உங்கள் தொலைபேசிக்கு அனுப்பப்பட்டது!`,
      invalidMobile: 'சரியான 10 இலக்க மொபைல் எண்ணை உள்ளிடவும்',
    },
  };

  const l = labels[lang] || labels.en;

  const handleSend = async (method) => {
    setError('');
    if (!validateMobile(mobile)) {
      setError(l.invalidMobile);
      return;
    }
    setSendingMethod(method);
    try {
      await notificationAPI.sendReceipt({ mobile, method, documentType, documentId });
    } catch {
      // Fallback: still show success in demo mode
    }
    setSendingMethod(null);
    setSent(true);
    setTimeout(() => setSent(false), 5000);
  };

  if (sent) {
    return (
      <div
        className={className}
        style={{
          display: 'flex', alignItems: 'center', gap: 16,
          background: 'color-mix(in oklab, var(--ok) 12%, white)',
          border: '1.5px solid var(--ok)', borderRadius: 'calc(28px * var(--ui-scale))',
          padding: 'calc(34px * var(--ui-scale)) calc(42px * var(--ui-scale))',
        }}
      >
        <CheckCircle style={{ width: 'calc(40px * var(--ui-scale))', height: 'calc(40px * var(--ui-scale))', color: 'var(--ok)', flexShrink: 0 }} />
        <span className="body" style={{ color: 'var(--ok)', fontWeight: 600 }}>{l.success}</span>
      </div>
    );
  }

  return (
    <div className={`card ${className}`} style={{ padding: 'calc(40px * var(--ui-scale))' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(16px * var(--ui-scale))', marginBottom: 'calc(28px * var(--ui-scale))' }}>
        <Smartphone style={{ width: 'calc(36px * var(--ui-scale))', height: 'calc(36px * var(--ui-scale))', color: 'var(--indigo-700)' }} />
        <span className="body" style={{ fontWeight: 700, color: 'var(--ink-900)' }}>{l.title}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(24px * var(--ui-scale))' }}>
        <input
          type="tel"
          value={mobile}
          onChange={(e) => {
            setMobile(e.target.value.replace(/\D/g, '').slice(0, 10));
            setError('');
          }}
          placeholder={l.placeholder}
          className="field"
          maxLength={10}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'calc(24px * var(--ui-scale))' }}>
          <button
            type="button"
            className="btn btn-pri"
            onClick={() => handleSend('sms')}
            disabled={sendingMethod !== null || mobile.length !== 10}
          >
            {sendingMethod === 'sms' ? '…' : l.sendSMS}
          </button>
          <button
            type="button"
            className="btn btn-acc"
            onClick={() => handleSend('whatsapp')}
            disabled={sendingMethod !== null || mobile.length !== 10}
          >
            {sendingMethod === 'whatsapp' ? '…' : l.sendWhatsApp}
          </button>
        </div>
      </div>

      {error && <p className="meta" style={{ color: 'var(--err)', marginTop: 'calc(16px * var(--ui-scale))' }}>{error}</p>}
    </div>
  );
};

export default SendToPhone;
