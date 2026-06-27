import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { VK, I, ic } from '../components/kiosk';
import { Select } from '../components';
import SendToPhone from '../components/SendToPhone';
import { formatDate, formatDateShort, printReceipt } from '../utils/helpers';
import { getReceipts } from '../utils/receipts';

const normalizeValue = (value) => (value || '').toString().trim().toLowerCase();

const isOwnedByCurrentUser = (receipt, userContext) => {
  if (!receipt) return false;

  const receiptOwnerAadhaar = receipt.ownerAadhaar || receipt.aadhaarUid || '';
  const receiptOwnerMobile = receipt.ownerMobile || receipt.mobile || '';
  const receiptOwnerName = receipt.ownerName || receipt.citizenName || '';

  if (userContext.aadhaarUid && receiptOwnerAadhaar) {
    return receiptOwnerAadhaar === userContext.aadhaarUid;
  }

  if (userContext.mobile && receiptOwnerMobile) {
    return receiptOwnerMobile === userContext.mobile;
  }

  if (userContext.name && receiptOwnerName) {
    return receiptOwnerName === userContext.name;
  }

  return false;
};

/**
 * Receipt page - Shows submission confirmation with printable receipt
 */
const Receipt = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [receiptList, setReceiptList] = useState([]);
  const [activeReceiptIndex, setActiveReceiptIndex] = useState(0);
  const [thermalMode, setThermalMode] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const requestedOrg = normalizeValue(searchParams.get('org'));
  const requestedReceiptId = (searchParams.get('id') || '').trim();

  const receiptData = receiptList[activeReceiptIndex] || null;

  useEffect(() => {
    const userContext = {
      aadhaarUid: sessionStorage.getItem('aadhaarUid') || '',
      mobile: sessionStorage.getItem('userMobile') || '',
      name: sessionStorage.getItem('userName') || '',
    };

    const allUserReceipts = getReceipts()
      .filter((receipt) => isOwnedByCurrentUser(receipt, userContext))
      .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

    let scopedReceipts = requestedOrg
      ? allUserReceipts.filter((receipt) => normalizeValue(receipt.serviceType) === requestedOrg)
      : allUserReceipts;

    let selectedReceipt = null;

    if (requestedReceiptId) {
      selectedReceipt = scopedReceipts.find((receipt) => receipt.requestId === requestedReceiptId) || null;
    }

    if (!selectedReceipt) {
      const storedReceipt = sessionStorage.getItem('lastReceipt');
      if (storedReceipt) {
        try {
          const parsedReceipt = JSON.parse(storedReceipt);
          const isOwnerMatch = isOwnedByCurrentUser(parsedReceipt, userContext);
          const isOrgMatch = !requestedOrg || normalizeValue(parsedReceipt.serviceType) === requestedOrg;
          if (isOwnerMatch && isOrgMatch) {
            selectedReceipt = parsedReceipt;
          }
        } catch {
          selectedReceipt = null;
        }
      }
    }

    if (!selectedReceipt && scopedReceipts.length > 0) {
      selectedReceipt = scopedReceipts[0];
    }

    if (!selectedReceipt) {
      setReceiptList([]);
      setActiveReceiptIndex(0);
      return;
    }

    if (!scopedReceipts.some((receipt) => receipt.requestId === selectedReceipt.requestId)) {
      scopedReceipts = [selectedReceipt, ...scopedReceipts];
    }

    const selectedIndex = scopedReceipts.findIndex((receipt) => receipt.requestId === selectedReceipt.requestId);

    setReceiptList(scopedReceipts);
    setActiveReceiptIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [requestedOrg, requestedReceiptId]);

  // Auto-print once when arriving with ?autoprint=1 (e.g. straight after a
  // confirmed Transport payment) — the ticket prints without a manual tap.
  const autoPrint = (searchParams.get('autoprint') || '') === '1';
  const autoPrintedRef = useRef(false);
  useEffect(() => {
    if (autoPrint && receiptData && !autoPrintedRef.current) {
      autoPrintedRef.current = true;
      const tid = setTimeout(() => printReceipt(), 700);
      return () => clearTimeout(tid);
    }
  }, [autoPrint, receiptData]);

  if (!receiptData) {
    return (
      <VK bg="var(--surface-1)">
        <div>
          <div className="card" style={{ textAlign: 'center' }}>
            <h1 className="h2" style={{ marginBottom: 12 }}>No Receipts Found</h1>
            <p className="body-l" style={{ color: 'var(--ink-500)', marginBottom: 28 }}>
              {requestedOrg
                ? `No receipts found for ${requestedOrg} for this user.`
                : 'No receipts found for this user yet.'}
            </p>
            <button className="btn btn-ghost" onClick={() => navigate('/home')}>
              <I d={ic.back} size={32} /> {t('receipt.goHome')}
            </button>
          </div>
        </div>
      </VK>
    );
  }

  const handlePrint = () => {
    printReceipt();
  };

  const handleNewRequest = () => {
    sessionStorage.removeItem('lastReceipt');
    navigate('/home');
  };

  const handleGoHome = () => {
    sessionStorage.removeItem('lastReceipt');
    navigate('/home');
  };

  const handleSelectReceipt = (event) => {
    const selectedIndex = Number(event.target.value);
    if (!Number.isNaN(selectedIndex)) {
      setActiveReceiptIndex(selectedIndex);
    }
  };

  const handlePreviousReceipt = () => {
    setActiveReceiptIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNextReceipt = () => {
    setActiveReceiptIndex((prev) => Math.min(receiptList.length - 1, prev + 1));
  };

  const handleSendEmail = () => {
    setEmailSent(true);
    setTimeout(() => setEmailSent(false), 3000);
  };

  return (
    <VK bg="var(--surface-1)">
      <div style={{ maxWidth: 1480, width: '100%', margin: '0 auto' }}>
        {/* Success Animation */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            width: 176, height: 176, borderRadius: '50%', margin: '0 auto 36px',
            background: 'color-mix(in oklab, var(--ok) 16%, white)',
            color: 'var(--ok)', display: 'grid', placeItems: 'center',
          }}>
            <I d={ic.check} size={100} sw={2.4} />
          </div>
          <h1 className="h2" style={{ color: 'var(--ok)' }}>{t('modal.successTitle')}</h1>
          <p className="body-l" style={{ marginTop: 14, color: 'var(--ink-500)' }}>
            {t('receipt.subtitle')}
          </p>
        </div>

        {receiptList.length > 1 && (
          <div className="card print:hidden" style={{ marginBottom: 24, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <span className="meta">
                Showing receipt {activeReceiptIndex + 1} of {receiptList.length}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button type="button" className="chip" onClick={handlePreviousReceipt} disabled={activeReceiptIndex === 0}>
                  Previous
                </button>
                <div style={{ width: 'calc(380px * var(--ui-scale))', maxWidth: '100%' }}>
                  <Select
                    value={activeReceiptIndex}
                    onChange={handleSelectReceipt}
                    options={receiptList.map((receipt, index) => ({
                      value: index,
                      label: `${receipt.requestId} - ${formatDateShort(receipt.timestamp, i18n.language === 'hi' ? 'hi-IN' : i18n.language === 'ta' ? 'ta-IN' : 'en-IN')}`,
                    }))}
                  />
                </div>
                <button type="button" className="chip" onClick={handleNextReceipt} disabled={activeReceiptIndex === receiptList.length - 1}>
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Receipt Card - Printable Area */}
        <div id="receipt-content" className="card print:shadow-none" style={{ padding: 0, overflow: 'hidden', maxWidth: thermalMode ? 300 : undefined, margin: thermalMode ? '0 auto' : undefined }}>
          {/* Receipt Header */}
          <div className="rcpt-head" style={{ background: 'var(--indigo-700)', color: 'var(--cream)', textAlign: 'center', padding: '48px 56px' }}>
            <div className="label-tag" style={{ color: 'rgba(255,255,255,.65)' }}>
              SUVIDHA · Government of Assam
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 30, letterSpacing: '.1em', marginTop: 24, opacity: .85 }}>
              {t('receipt.requestId')}
            </div>
            <div className="rcpt-id" style={{ fontFamily: 'var(--font-mono)', fontSize: 80, fontWeight: 700, letterSpacing: '.04em', marginTop: 8 }}>
              {receiptData.requestId}
            </div>
          </div>

          {/* Receipt Body */}
          <div className="rcpt-body" style={{ padding: '48px 56px' }}>
            <div className="receipt-row">
              <span className="k">{t('receipt.citizenName')}</span>
              <span className="v">{receiptData.citizenName}</span>
            </div>
            <div className="receipt-row">
              <span className="k">{t('form.mobile')}</span>
              <span className="v">+91 {receiptData.mobile}</span>
            </div>
            <div className="receipt-row">
              <span className="k">{t('receipt.serviceCategory')}</span>
              <span className="v">{receiptData.serviceCategory}</span>
            </div>
            <div className="receipt-row">
              <span className="k">{t('receipt.submissionTime')}</span>
              <span className="v">
                {formatDate(receiptData.timestamp, i18n.language === 'hi' ? 'hi-IN' : i18n.language === 'ta' ? 'ta-IN' : 'en-IN')}
              </span>
            </div>
            <div className="receipt-row">
              <span className="k">{t('receipt.status')}</span>
              <span className="badge b-ok">{t('tracking.submitted')}</span>
            </div>

            {/* Track Message */}
            <div style={{ background: 'var(--indigo-100)', borderRadius: 20, padding: '32px 36px', marginTop: 40 }}>
              <div className="body" style={{ color: 'var(--indigo-900)' }}>
                {t('receipt.trackMessage')}
              </div>
            </div>

            {/* SLA Info */}
            {receiptData.sla && (
              <div style={{ background: 'var(--indigo-100)', borderRadius: 20, padding: '32px 36px', marginTop: 24 }}>
                <div className="body" style={{ color: 'var(--indigo-900)' }}>
                  Expected Resolution: <strong>{receiptData.sla}</strong>
                </div>
              </div>
            )}

            {/* Thank You */}
            <div style={{ marginTop: 36, textAlign: 'center' }}>
              <p className="body-l" style={{ color: 'var(--ink-500)' }}>{t('receipt.thankYou')}</p>
            </div>
          </div>

          {/* Receipt Footer - Print Only */}
          <div className="hidden print:block" style={{ borderTop: '1.5px solid var(--line)', padding: 24, textAlign: 'center' }}>
            <p className="meta">
              Generated on {formatDate(new Date())} · SUVIDHA 2026 Kiosk System
            </p>
            <p className="meta" style={{ marginTop: 4 }}>
              This is a computer-generated receipt and does not require a signature.
            </p>
          </div>
        </div>

        {/* Action Buttons - Hide on Print */}
        <div className="print:hidden" style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Primary navigation - kept above the fold, no scrolling needed */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            <button className="btn btn-pri" onClick={handleNewRequest}>
              <I d={ic.plus} size={32} /> {t('receipt.newRequest')}
            </button>
            <button className="btn btn-quiet" onClick={handleGoHome}>
              <I d={ic.back} size={32} /> {t('receipt.goHome')}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32 }}>
            <button className="btn btn-ghost" onClick={handlePrint}>
              <I d={ic.print} size={44} /> {t('receipt.print')}
            </button>
            <button className={`btn btn-ghost${thermalMode ? ' act' : ''}`} onClick={() => setThermalMode(!thermalMode)}>
              <I d={ic.receipt} size={44} /> {thermalMode ? t('receipt.normalLayout', 'Normal Layout') : t('receipt.thermalLayout', 'Thermal Layout')}
            </button>
            <button className="btn btn-ghost" onClick={handleSendEmail} disabled={emailSent}>
              <I d={ic.doc} size={44} /> {emailSent ? ` ${t('receipt.emailSent', 'Email Sent!')}` : t('receipt.email', 'Email')}
            </button>
          </div>

          {/* Send to Phone - single grouped mobile + SMS/WhatsApp action */}
          <SendToPhone documentType="Receipt" documentId={receiptData.requestId} />
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 4mm; }
          html, body { background: #fff !important; }
          body * { visibility: hidden !important; }
          #receipt-content, #receipt-content * { visibility: visible !important; }
          #receipt-content {
            position: absolute !important; left: 0 !important; top: 0 !important;
            width: 280px !important; max-width: 280px !important;
            margin: 0 !important; box-shadow: none !important; border-radius: 0 !important;
            background: #fff !important; color: #000 !important;
            font-family: var(--font-mono), monospace !important;
          }
          /* Header collapses to a tight black-on-white block */
          #receipt-content .rcpt-head {
            background: #fff !important; color: #000 !important;
            padding: 0 0 6px !important; border-bottom: 1px solid #000 !important;
          }
          #receipt-content .rcpt-head * { color: #000 !important; }
          #receipt-content .rcpt-id { font-size: 18px !important; margin: 2px 0 0 !important; letter-spacing: .02em !important; }
          #receipt-content .rcpt-body { padding: 8px 0 0 !important; }
          /* Tighten the info / track / SLA boxes to single-column rows */
          #receipt-content .rcpt-body > div {
            background: #fff !important; padding: 4px 0 !important; margin: 0 !important; border-radius: 0 !important;
          }
          #receipt-content .receipt-row {
            display: flex !important; justify-content: space-between !important; gap: 10px !important;
            padding: 3px 0 !important; font-size: 11px !important; border: none !important;
          }
          #receipt-content .receipt-row .k { color: #000 !important; font-weight: 600 !important; }
          #receipt-content .receipt-row .v,
          #receipt-content .receipt-row .badge {
            color: #000 !important; background: transparent !important; text-align: right !important;
            overflow-wrap: anywhere !important; word-break: break-word !important;
          }
        }
      `}</style>
    </VK>
  );
};

export default Receipt;
