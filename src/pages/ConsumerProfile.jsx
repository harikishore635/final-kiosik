import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, Eye, EyeOff, Save, ArrowLeft, Clock, CheckCircle,  } from 'lucide-react';
import {
  Button,
  Input,
  Modal,
} from '../components';
import { VK } from '../components/kiosk';
import { LoadingScreen, SubmissionSteps } from '../components/loading';
import { generateRequestId, getCurrentTimestamp } from '../utils/helpers';
import { addReceipt } from '../utils/receipts';
import { sleep } from '../utils/mockDelay';
import { getCitizenProfile, buildFormPrefill } from '../utils/citizenProfile';

/**
 * Consumer Profile / Credential Management — shared across all departments
 * Receives ?org=electricity|gas|municipal
 */
const ConsumerProfile = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const org = searchParams.get('org') || 'electricity';

  const themeColors = {
    electricity: { bg: 'from-amber-50', border: 'border-amber-200', accent: 'text-amber-700', btn: 'bg-amber-500', ring: 'ring-amber-200' },
    gas: { bg: 'from-red-50', border: 'border-red-200', accent: 'text-red-700', btn: 'bg-red-500', ring: 'ring-red-200' },
    municipal: { bg: 'from-indigo-50', border: 'border-indigo-200', accent: 'text-indigo-700', btn: 'bg-indigo-500', ring: 'ring-indigo-200' },
  };
  const theme = themeColors[org] || themeColors.electricity;

  // Profile data — prefilled from the logged-in citizen's Aadhaar record
  const citizen = getCitizenProfile();
  const citizenPrefill = buildFormPrefill(citizen);
  const [profileData, setProfileData] = useState({
    name: citizenPrefill.name || sessionStorage.getItem('userName') || 'Rajesh Kumar',
    mobile: citizenPrefill.mobile || sessionStorage.getItem('userMobile') || '9876543210',
    email: citizenPrefill.email || 'rajesh.k@email.com',
    address: citizenPrefill.address || '42, MG Road, Ward 3',
    aadhaar: citizen?.uid ? `${citizen.uid.slice(0, 4)}-${citizen.uid.slice(4, 8)}-${citizen.uid.slice(8, 12)}` : '9999-8888-7777',
    consumerNumber: 'ELEC-GHY-2024-001234',
  });

  const [showMasked, setShowMasked] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ ...profileData });
  const [mobileChanged, setMobileChanged] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submissionStep, setSubmissionStep] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [notice, setNotice] = useState('');

  // Audit trail — fetched from backend API
  const [auditTrail, setAuditTrail] = useState([]);

  useEffect(() => {
    const uid = sessionStorage.getItem('aadhaarUid') || 'demo';
    fetch(`/api/citizen/audit-trail/${uid}`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        if (data.success && data.entries) {
          setAuditTrail(data.entries.map(e => ({
            date: e.date?.split('T')[0] || e.date,
            action: e.action,
            by: e.changed_by || 'System',
          })));
        }
      })
      .catch(() => {
        // Fallback if server is unavailable
        setAuditTrail([
          { date: '2026-04-22', action: 'Mobile number updated to ****3210', by: 'Self-service (Kiosk)' },
          { date: '2026-03-15', action: 'Email address updated', by: 'Self-service (Kiosk)' },
          { date: '2026-02-01', action: 'Address updated via consumer portal', by: 'Admin - Shri R.K. Baruah' },
          { date: '2025-12-10', action: 'Consumer profile created via Aadhaar verification', by: 'System Registration' },
        ]);
      });
  }, []);

  const maskValue = (value, type) => {
    if (!showMasked) return value;
    if (type === 'mobile') return `91****${value.slice(-4)}`;
    if (type === 'email') {
      const [name, domain] = value.split('@');
      return `${name.slice(0, 2)}***@${domain}`;
    }
    if (type === 'aadhaar') return `XXXX-XXXX-${value.slice(-4)}`;
    return value;
  };

  const handleEditChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
    if (field === 'mobile' && value !== profileData.mobile) {
      setMobileChanged(true);
      setOtpVerified(false);
      setOtpSent(false);
    } else if (field === 'mobile') {
      setMobileChanged(false);
    }
  };

  const handleSendOTP = () => {
    setOtpSent(true);
    // Demo: auto-accept OTP 123456
  };

  const handleVerifyOTP = () => {
    if (otp === '123456') {
      setOtpVerified(true);
    }
  };

  const handleSave = () => {
    if (mobileChanged && !otpVerified) {
      setNotice(t('profile.verifyOtpFirst'));
      return;
    }
    setShowConfirmModal(true);
  };

  const handleConfirmSave = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    setSubmissionStep(0);

    await sleep(900);
    setSubmissionStep(1);
    await sleep(800);
    setSubmissionStep(2);

    setProfileData({ ...editData });
    setIsEditing(false);

    const receiptData = {
      requestId: generateRequestId(),
      citizenName: editData.name,
      mobile: editData.mobile,
      serviceType: org,
      serviceCategory: 'Profile Update',
      timestamp: getCurrentTimestamp(),
      status: 'submitted',
    };
    addReceipt(receiptData);

    await sleep(700);
    setSubmissionStep(3);
    setLoading(false);
    navigate(`/receipt?org=${encodeURIComponent(receiptData.serviceType)}&id=${encodeURIComponent(receiptData.requestId)}`);
  };

  const backPath =
    org === 'gas'
      ? '/gas-menu'
      : org === 'municipal'
        ? '/municipal-menu'
        : org === 'electricity'
          ? '/electricity-menu'
          : '/home';

  if (loading) {
    return (
      <VK bg="var(--surface-1)">
        <LoadingScreen
          heading={t('loading.submittingRequest', 'Submitting your request')}
          variant="signal"
          size={62}
          extra={(
            <SubmissionSteps
              step={submissionStep}
              labels={[
                t('loading.stepSaving', 'Saving your details'),
                t('loading.stepReference', 'Generating reference number'),
                t('loading.stepConfirmation', 'Sending confirmation'),
              ]}
            />
          )}
        />
      </VK>
    );
  }

  return (
    <VK bg="var(--surface-1)">
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Title */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 ${theme.btn} rounded-full mb-4`}>
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-kiosk-2xl font-bold text-gray-800">
            {t('profile.title', 'Consumer Profile')}
          </h1>
          <p className="text-kiosk-base text-gray-500 mt-1">
            {t('profile.subtitle', 'View and update your consumer information')}
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-kiosk-lg shadow-kiosk p-6 md:p-8 mb-6">
          {/* Toggle Mask + Edit */}
          <div className="flex items-center justify-between mb-6 gap-4">
            <button
              onClick={() => setShowMasked(!showMasked)}
              className="flex items-center gap-2 text-kiosk-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors touch-manipulation flex-shrink-0"
            >
              {showMasked ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              {showMasked ? 'Show Details' : 'Hide Details'}
            </button>
            {!isEditing ? (
              <button
                onClick={() => { setIsEditing(true); setEditData({ ...profileData }); }}
                className="flex items-center gap-2 text-kiosk-sm font-semibold text-government-blue hover:text-blue-800 transition-colors touch-manipulation flex-shrink-0"
              >
                <Save className="w-5 h-5" />
                Edit Profile
              </button>
            ) : (
              <button
                onClick={() => { setIsEditing(false); setMobileChanged(false); }}
                className="flex items-center gap-2 text-kiosk-sm font-semibold text-gray-500 hover:text-gray-700 transition-colors touch-manipulation flex-shrink-0"
              >
                Cancel
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Name */}
            <div className={`p-4 rounded-xl ${isEditing ? 'bg-gray-50' : ''}`}>
              <p className="text-kiosk-sm text-gray-500">{t('form.name')}</p>
              {isEditing ? (
                <input className="w-full text-kiosk-base font-semibold text-gray-800 bg-white border rounded-lg px-3 py-2 mt-1" value={editData.name} onChange={(e) => handleEditChange('name', e.target.value)} />
              ) : (
                <p className="text-kiosk-base font-semibold text-gray-800">{profileData.name}</p>
              )}
            </div>

            {/* Mobile */}
            <div className={`p-4 rounded-xl ${isEditing ? 'bg-gray-50' : ''}`}>
              <p className="text-kiosk-sm text-gray-500">{t('form.mobile')}</p>
              {isEditing ? (
                <div>
                  <input className="w-full text-kiosk-base font-semibold text-gray-800 bg-white border rounded-lg px-3 py-2 mt-1" value={editData.mobile} onChange={(e) => handleEditChange('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))} />
                  {mobileChanged && !otpVerified && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-kiosk-sm text-blue-700 mb-2">{t('profile.otpRequiredForMobile')}</p>
                      {!otpSent ? (
                        <Button size="small" onClick={handleSendOTP}>{t('auth.sendOTP')}</Button>
                      ) : (
                        <div className="flex gap-2">
                          <input className="flex-1 border rounded-lg px-3 py-2 text-kiosk-sm" placeholder={t('profile.enterOtp')} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} />
                          <Button size="small" onClick={handleVerifyOTP}>{t('profile.verify')}</Button>
                        </div>
                      )}
                    </div>
                  )}
                  {otpVerified && (
                    <p className="mt-2 text-kiosk-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> OTP Verified
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-kiosk-base font-semibold text-gray-800">{maskValue(profileData.mobile, 'mobile')}</p>
              )}
            </div>

            {/* Email */}
            <div className={`p-4 rounded-xl ${isEditing ? 'bg-gray-50' : ''}`}>
              <p className="text-kiosk-sm text-gray-500">{t('form.email')}</p>
              {isEditing ? (
                <input className="w-full text-kiosk-base font-semibold text-gray-800 bg-white border rounded-lg px-3 py-2 mt-1" value={editData.email} onChange={(e) => handleEditChange('email', e.target.value)} />
              ) : (
                <p className="text-kiosk-base font-semibold text-gray-800">{maskValue(profileData.email, 'email')}</p>
              )}
            </div>

            {/* Address */}
            <div className={`p-4 rounded-xl ${isEditing ? 'bg-gray-50' : ''}`}>
              <p className="text-kiosk-sm text-gray-500">{t('form.address')}</p>
              {isEditing ? (
                <input className="w-full text-kiosk-base font-semibold text-gray-800 bg-white border rounded-lg px-3 py-2 mt-1" value={editData.address} onChange={(e) => handleEditChange('address', e.target.value)} />
              ) : (
                <p className="text-kiosk-base font-semibold text-gray-800">{profileData.address}</p>
              )}
            </div>

            {/* Read-only: Aadhaar */}
            <div className="p-4 rounded-xl bg-gray-50">
              <p className="text-kiosk-sm text-gray-500">Aadhaar (Read Only)</p>
              <p className="text-kiosk-base font-semibold text-gray-800">{maskValue(profileData.aadhaar, 'aadhaar')}</p>
            </div>

            {/* Read-only: Consumer Number */}
            <div className="p-4 rounded-xl bg-gray-50">
              <p className="text-kiosk-sm text-gray-500">Consumer Number (Read Only)</p>
              <p className="text-kiosk-base font-semibold text-gray-800">{profileData.consumerNumber}</p>
            </div>
          </div>

          {/* Save Button */}
          {isEditing && (
            <div className="mt-8 pt-6 border-t">
              <Button onClick={handleSave} size="xlarge" fullWidth icon={Save}>
                {t('profile.saveAll', 'Save All Changes & Generate Receipt')}
              </Button>
            </div>
          )}

          {/* Ownership Transfer Section */}
          {!isEditing && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="text-kiosk-base font-bold text-gray-700 mb-3">{t('profile.ownershipTransfer')}</h3>
              <p className="text-sm text-gray-500 mb-4">
                {t('profile.ownershipTransferDesc')}
              </p>
              <div className="p-5 bg-gray-50 rounded-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-4">
                  <div className="p-4 rounded-xl bg-white">
                    <label className="text-kiosk-sm text-gray-500">{t('profile.newOwnerName')}</label>
                    <input
                      className="w-full text-kiosk-base font-semibold text-gray-800 bg-white border rounded-lg px-3 py-2 mt-1"
                      placeholder={t('profile.enterNewOwnerName')}
                    />
                  </div>
                  <div className="p-4 rounded-xl bg-white">
                    <label className="text-kiosk-sm text-gray-500">{t('profile.newOwnerAadhaar')}</label>
                    <input
                      className="w-full text-kiosk-base font-semibold text-gray-800 bg-white border rounded-lg px-3 py-2 mt-1"
                      placeholder={t('profile.enterAadhaarNumber')}
                      maxLength={12}
                    />
                  </div>
                </div>
                <div className="flex items-start gap-2 mb-4 px-1">
                  <span className="text-amber-500 mt-0.5"></span>
                  <p className="text-kiosk-sm text-gray-500">
                    {t('profile.ownershipTransferWarning')}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => {
                    const receiptData = {
                      requestId: generateRequestId(),
                      citizenName: profileData.name,
                      mobile: profileData.mobile,
                      serviceType: org,
                      serviceCategory: 'Ownership Transfer Request',
                      timestamp: getCurrentTimestamp(),
                      status: 'submitted',
                      sla: '30 working days',
                    };
                    addReceipt(receiptData);
                    navigate(`/receipt?org=${encodeURIComponent(receiptData.serviceType)}&id=${encodeURIComponent(receiptData.requestId)}`);
                  }}
                >
                  Submit Transfer Request
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Audit Trail */}
        <div className="bg-white rounded-kiosk-lg shadow-kiosk p-6 md:p-8 mb-6">
          <h2 className="text-kiosk-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-500" />
            {t('profile.auditTrail', 'Update History')}
          </h2>
          <div className="space-y-3">
            {auditTrail.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">{entry.action}</p>
                  <p className="text-xs text-gray-500">{entry.date} • {entry.by}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Back Button */}
        <div className="text-center">
          <Button variant="outline" size="large" icon={ArrowLeft} onClick={() => navigate(backPath)}>
            {t('app.back')}
          </Button>
        </div>
      </div>

      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} type="confirm" title={t('profile.confirmUpdateTitle')} message={t('profile.confirmUpdateMsg')} confirmText={t('app.confirm')} cancelText={t('app.cancel')} onConfirm={handleConfirmSave} onCancel={() => setShowConfirmModal(false)} />
      <Modal isOpen={!!notice} onClose={() => setNotice('')} type="warning" title={t('complaints.noticeTitle')} message={notice} confirmText={t('app.confirm')} onConfirm={() => setNotice('')} />
    </VK>
  );
};

export default ConsumerProfile;
