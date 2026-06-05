import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Printer, Home, PlusCircle, Download, Mail, MessageSquare, Maximize2, Share2 } from 'lucide-react';
import { Button } from '../components';
import { VK } from '../components/kiosk';
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
  const [smsSent, setSmsSent] = useState(false);
  const [whatsappSent, setWhatsappSent] = useState(false);

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

  if (!receiptData) {
    return (
      <VK bg="var(--surface-1, #f8fafc)">
        <div>
          <div className="bg-white rounded-kiosk-lg shadow-kiosk p-8 text-center">
            <h1 className="text-kiosk-2xl font-bold text-gray-800 mb-3">No Receipts Found</h1>
            <p className="text-kiosk-base text-gray-600 mb-6">
              {requestedOrg
                ? `No receipts found for ${requestedOrg} for this user.`
                : 'No receipts found for this user yet.'}
            </p>
            <Button
              onClick={() => navigate('/home')}
              variant="outline"
              size="large"
              icon={Home}
            >
              {t('receipt.goHome')}
            </Button>
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

  const sendNotification = async (method) => {
    const mobile = receiptData?.mobile || sessionStorage.getItem('userMobile');
    if (!mobile) return false;
    try {
      const resp = await fetch('/api/notifications/send-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mobile,
          method,
          documentType: receiptData?.serviceCategory || receiptData?.serviceType || 'Request',
          documentId: receiptData?.requestId,
          citizenName: receiptData?.citizenName || sessionStorage.getItem('userName'),
          language: i18n.language || 'en',
        }),
      });
      const data = await resp.json();
      return data.success;
    } catch {
      return false;
    }
  };

  const handleSendSMS = async () => {
    setSmsSent(true);
    await sendNotification('sms');
    setTimeout(() => setSmsSent(false), 4000);
  };

  const handleSendWhatsApp = async () => {
    setWhatsappSent(true);
    await sendNotification('whatsapp');
    setTimeout(() => setWhatsappSent(false), 4000);
  };

  return (
    <VK bg="var(--surface-1, #f8fafc)">
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {/* Success Animation */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-green-500 rounded-full mb-6 animate-pulse-slow">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-kiosk-2xl md:text-kiosk-3xl font-bold text-green-600">
            {t('modal.successTitle')}
          </h1>
          <p className="text-kiosk-lg text-gray-600 mt-2">
            {t('receipt.subtitle')}
          </p>
        </div>

        {receiptList.length > 1 && (
          <div className="bg-white rounded-kiosk-lg shadow-kiosk p-4 mb-4 print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-gray-600">
                Showing receipt {activeReceiptIndex + 1} of {receiptList.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePreviousReceipt}
                  disabled={activeReceiptIndex === 0}
                  className="px-3 py-2 text-sm rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <select
                  value={activeReceiptIndex}
                  onChange={handleSelectReceipt}
                  className="px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white max-w-[280px]"
                >
                  {receiptList.map((receipt, index) => (
                    <option key={`${receipt.requestId}-${index}`} value={index}>
                      {receipt.requestId} - {formatDateShort(receipt.timestamp, i18n.language === 'hi' ? 'hi-IN' : i18n.language === 'ta' ? 'ta-IN' : 'en-IN')}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleNextReceipt}
                  disabled={activeReceiptIndex === receiptList.length - 1}
                  className="px-3 py-2 text-sm rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Receipt Card - Printable Area */}
        <div id="receipt-content" className={`bg-white rounded-kiosk-lg shadow-kiosk overflow-hidden print:shadow-none ${thermalMode ? 'max-w-[300px] mx-auto text-sm' : ''}`}>
          {/* Receipt Header */}
          <div className="bg-government-blue text-white p-6 text-center print:bg-gray-800">
            <h2 className="text-kiosk-2xl font-bold mb-1">{t('app.title')}</h2>
            <p className="text-kiosk-sm opacity-80">{t('app.subtitle')}</p>
          </div>

          {/* Receipt Body */}
          <div className="p-6 md:p-8">
            {/* Request ID - Highlighted */}
            <div className="bg-blue-50 border-2 border-government-blue rounded-kiosk p-6 mb-6 text-center">
              <p className="text-kiosk-sm text-gray-600 mb-2">{t('receipt.requestId')}</p>
              <p className="text-kiosk-3xl font-bold text-government-blue tracking-wider">
                {receiptData.requestId}
              </p>
            </div>

            {/* Details Grid */}
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-kiosk-base text-gray-600">{t('receipt.citizenName')}</span>
                <span className="text-kiosk-lg font-semibold text-gray-800">{receiptData.citizenName}</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-kiosk-base text-gray-600">{t('form.mobile')}</span>
                <span className="text-kiosk-lg font-semibold text-gray-800">+91 {receiptData.mobile}</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-kiosk-base text-gray-600">{t('receipt.serviceCategory')}</span>
                <span className="text-kiosk-lg font-semibold text-gray-800">{receiptData.serviceCategory}</span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-kiosk-base text-gray-600">{t('receipt.submissionTime')}</span>
                <span className="text-kiosk-lg font-semibold text-gray-800">
                  {formatDate(receiptData.timestamp, i18n.language === 'hi' ? 'hi-IN' : i18n.language === 'ta' ? 'ta-IN' : 'en-IN')}
                </span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-gray-200">
                <span className="text-kiosk-base text-gray-600">{t('receipt.status')}</span>
                <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-kiosk-base font-semibold">
                  {t('tracking.submitted')}
                </span>
              </div>
            </div>

            {/* Track Message */}
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-kiosk">
              <p className="text-kiosk-base text-yellow-800">
                📋 {t('receipt.trackMessage')}
              </p>
            </div>

            {/* SLA Info */}
            {receiptData.sla && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-kiosk">
                <p className="text-kiosk-base text-blue-800">
                  ⏱️ Expected Resolution: <strong>{receiptData.sla}</strong>
                </p>
              </div>
            )}

            {/* Thank You */}
            <div className="mt-6 text-center">
              <p className="text-kiosk-lg text-gray-600">{t('receipt.thankYou')}</p>
            </div>
          </div>

          {/* Receipt Footer - Print Only */}
          <div className="hidden print:block border-t border-gray-200 p-4 text-center">
            <p className="text-sm text-gray-500">
              Generated on {formatDate(new Date())} • SUVIDHA 2026 Kiosk System
            </p>
            <p className="text-xs text-gray-400 mt-1">
              This is a computer-generated receipt and does not require a signature.
            </p>
          </div>
        </div>

        {/* Action Buttons - Hide on Print */}
        <div className="mt-8 space-y-4 print:hidden">
          {/* Send to Phone */}
          <SendToPhone documentType="Receipt" documentId={receiptData.requestId} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              onClick={handlePrint}
              variant="primary"
              size="xlarge"
              fullWidth
              icon={Printer}
            >
              {t('receipt.print')}
            </Button>
            <Button
              onClick={handlePrint}
              variant="secondary"
              size="xlarge"
              fullWidth
              icon={Download}
              aria-label="Save as PDF (use browser Save as PDF in print dialog)"
            >
              Save as PDF
            </Button>
          </div>

          {/* Email / SMS / WhatsApp Delivery */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button
              onClick={handleSendEmail}
              variant={emailSent ? 'primary' : 'outline'}
              size="large"
              fullWidth
              icon={Mail}
              disabled={emailSent}
            >
              {emailSent ? '✅ Email Sent!' : 'Send via Email'}
            </Button>
            <Button
              onClick={handleSendSMS}
              variant={smsSent ? 'primary' : 'outline'}
              size="large"
              fullWidth
              icon={MessageSquare}
              disabled={smsSent}
            >
              {smsSent ? '✅ SMS Sent!' : 'Send via SMS'}
            </Button>
            <Button
              onClick={handleSendWhatsApp}
              variant={whatsappSent ? 'primary' : 'outline'}
              size="large"
              fullWidth
              icon={Share2}
              disabled={whatsappSent}
            >
              {whatsappSent ? '✅ WhatsApp Sent!' : 'Send via WhatsApp'}
            </Button>
          </div>

          {/* Thermal Print Toggle */}
          <div className="flex items-center justify-center">
            <button
              onClick={() => setThermalMode(!thermalMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${thermalMode ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
            >
              <Maximize2 className="w-4 h-4" />
              {thermalMode ? 'Normal Mode' : 'Thermal Print Mode'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              onClick={handleNewRequest}
              variant="outline"
              size="large"
              fullWidth
              icon={PlusCircle}
            >
              {t('receipt.newRequest')}
            </Button>
            <Button
              onClick={handleGoHome}
              variant="ghost"
              size="large"
              fullWidth
              icon={Home}
            >
              {t('receipt.goHome')}
            </Button>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-content, #receipt-content * { visibility: visible; }
          #receipt-content { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </VK>
  );
};

export default Receipt;
