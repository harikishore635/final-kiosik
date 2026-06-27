import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import { VK, I, ic } from '../kiosk';
import { RadiantLoader } from '../loading';
import { createPaymentSession, verifyPayment, UPI_APPS } from '../../utils/paymentService';

// Kiosk UPI payment screen (simulated). Shows the payable amount, a large QR,
// UPI app icons and a UPI-ID entry. Verification is auto-detected on mount
// (no manual refresh); the pay action is disabled while verifying to prevent
// duplicate payments. Distinct verifying / failed states; success hands back
// to the caller, which mints the ticket and prints the receipt.
export default function UpiPaymentScreen({ amount, note, title, onSuccess, onCancel }) {
  const { t } = useTranslation();
  const [session] = useState(() => createPaymentSession({ amount, note }));
  const [phase, setPhase] = useState('verifying'); // 'verifying' | 'failed'
  const [vpa, setVpa] = useState('');
  const abortRef = useRef(null);

  const startVerify = () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase('verifying');
    verifyPayment(session.orderId, { delayMs: 5000, signal: controller.signal })
      .then((result) => onSuccess?.(result))
      .catch(() => { /* aborted — user cancelled or navigated */ });
  };

  // Auto-detect: begin polling for confirmation as soon as the screen mounts.
  useEffect(() => {
    startVerify();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancel = () => { abortRef.current?.abort(); onCancel?.(); };

  return (
    <VK bg="color-mix(in oklab, var(--dept-trans) 5%, var(--surface-0))">
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 className="h2">{title || t('payment.title', 'Secure UPI Payment')}</h1>
          <p className="body-l" style={{ color: 'var(--ink-500)', marginTop: 10 }}>
            {t('payment.subtitle', 'Scan the QR with any UPI app, or enter your UPI ID')}
          </p>
        </div>

        {/* Payable amount — large and unmissable */}
        <div className="card" style={{ textAlign: 'center', marginBottom: 28, background: 'color-mix(in oklab, var(--ok) 8%, white)' }}>
          <div className="meta" style={{ color: 'var(--ink-500)', fontWeight: 700 }}>
            {t('payment.amountDue', 'Amount Payable')}
          </div>
          <div style={{ fontSize: 88, fontWeight: 800, color: 'var(--ok)', lineHeight: 1.1 }}>₹{amount}</div>
        </div>

        {phase === 'failed' ? (
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ width: 128, height: 128, borderRadius: '50%', margin: '0 auto 24px', background: 'color-mix(in oklab, var(--err) 14%, white)', display: 'grid', placeItems: 'center' }}>
              <I d={ic.x} size={68} style={{ color: 'var(--err)' }} />
            </div>
            <h2 className="h3" style={{ color: 'var(--err)' }}>{t('payment.failedTitle', 'Payment Failed')}</h2>
            <p className="body-l" style={{ color: 'var(--ink-500)', margin: '12px 0 28px' }}>
              {t('payment.failedMsg', 'No money was deducted and no ticket was issued. Please try again.')}
            </p>
            <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-pri" onClick={startVerify}>{t('payment.retry', 'Try Again')}</button>
              <button className="btn btn-ghost" onClick={onCancel}>{t('payment.back', 'Back to Booking')}</button>
            </div>
          </div>
        ) : (
          <div className="card">
            <div style={{ display: 'flex', gap: 44, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
              <div style={{ background: 'white', padding: 22, borderRadius: 24, border: '2px solid var(--line)' }}>
                <QRCodeSVG value={session.upiUri} size={320} includeMargin={false} />
              </div>
              <div style={{ flex: 1, minWidth: 300 }}>
                <div className="meta" style={{ fontWeight: 700, marginBottom: 16 }}>{t('payment.payUsing', 'Pay using any UPI app')}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
                  {UPI_APPS.map((app) => (
                    <div key={app.id} className="chip" style={{ justifyContent: 'center', pointerEvents: 'none' }}>
                      <I d={ic.card} size={28} /> {app.name}
                    </div>
                  ))}
                </div>
                <label className="flab">{t('payment.enterVpa', 'Or enter your UPI ID')}</label>
                <input className="field" value={vpa} onChange={(e) => setVpa(e.target.value)} placeholder="name@bank" />
                <div className="meta" style={{ marginTop: 10 }}>
                  {t('payment.payeeLine', 'Payee')}: {session.payeeName} · {session.payeeVpa}
                </div>
              </div>
            </div>

            {/* Status — verification is automatic; pay action disabled while it runs */}
            <div style={{ marginTop: 32, paddingTop: 28, borderTop: '1.5px solid var(--line)', textAlign: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
                <RadiantLoader variant="sweep" size={104} />
                <div className="body-l" style={{ fontWeight: 700 }}>
                  {t('payment.verifying', 'Waiting for payment confirmation…')}
                </div>
                <div className="meta">{t('payment.doNotClose', 'Please do not close this screen')}</div>
                <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                  <button className="btn btn-ghost" onClick={cancel}>{t('payment.cancel', 'Cancel Payment')}</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </VK>
  );
}
