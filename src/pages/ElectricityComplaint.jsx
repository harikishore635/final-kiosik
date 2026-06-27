import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { startSTT, stopSTT } from '../ai/voice/speechRecognition';
import { useVoiceFormSubmit } from '../hooks/useVoiceFormSubmit';
import {
  Zap,
  FileWarning,
  Clock,
  Gauge,
  Ban,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Upload,
  Mic,
  MicOff,
} from 'lucide-react';
import {
  Button,
  Input,
  Select,
  TextArea,
  Modal,
  ApplicantBanner,
} from '../components';
import { VK } from '../components/kiosk';
import { LoadingScreen, SubmissionSteps } from '../components/loading';
import QRUpload from '../components/QRUpload';
import { states, cities, wards } from '../utils/constants';
import { generateComplaintId, getCurrentTimestamp } from '../utils/helpers';
import { addReceipt } from '../utils/receipts';
import { serviceAPI } from '../utils/apiService';
import { sleep } from '../utils/mockDelay';
import { getActiveApplicant, buildFormPrefill, clearActiveApplicant } from '../utils/citizenProfile';

/**
 * Electricity Complaint Registration — dedicated page with SRS-defined categories
 */
const ElectricityComplaint = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: category, 2: form
  const [selectedCategory, setSelectedCategory] = useState('');
  const applicant = getActiveApplicant();
  const prefill = buildFormPrefill(applicant);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    consumerNumber: '',
    state: '',
    city: '',
    ward: '',
    address: '',
    ...prefill,
    description: '',
    // Incorrect bill fields
    billMonth: '',
    disputedAmount: '',
    actualReading: '',
  });
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submissionStep, setSubmissionStep] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const STT_LANG_MAP = { en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN', ml: 'ml-IN', mr: 'mr-IN', gu: 'gu-IN', bn: 'bn-IN', or: 'or-IN', pa: 'pa-IN', as: 'as-IN' };
  const sttLangCode = STT_LANG_MAP[(i18n.language || 'en').split('-')[0]] || 'hi-IN';

  useVoiceFormSubmit('electricity_complaint', () => { if (step === 2) handleSubmit(); });

  const complaintCategories = [
    {
      id: 'incorrectBill',
      label: t('elecComplaint.incorrectBill', 'Incorrect Electricity Bill'),
      icon: FileWarning,
      color: 'bg-amber-100 text-amber-700 border-amber-300',
      sla: '7 working days',
    },
    {
      id: 'connectionDelay',
      label: t('elecComplaint.connectionDelay', 'Delay in New Connection Approval'),
      icon: Clock,
      color: 'bg-blue-100 text-blue-700 border-blue-300',
      sla: '15 working days',
    },
    {
      id: 'meterDelay',
      label: t('elecComplaint.meterDelay', 'Delay in Meter Replacement / Shifting'),
      icon: Gauge,
      color: 'bg-purple-100 text-purple-700 border-purple-300',
      sla: '10 working days',
    },
    {
      id: 'disconnectionNotice',
      label: t('elecComplaint.disconnectionNotice', 'Disconnection Without Prior Notice'),
      icon: Ban,
      color: 'bg-red-100 text-red-700 border-red-300',
      sla: '3 working days',
    },
    {
      id: 'other',
      label: t('elecComplaint.other', 'Other'),
      icon: HelpCircle,
      color: 'bg-gray-100 text-gray-700 border-gray-300',
      sla: '14 working days',
    },
  ];

  const selectedCategoryData = complaintCategories.find(c => c.id === selectedCategory);

  const getLocalizedName = (item) => {
    if (i18n.language === 'hi' && item.nameHi) return item.nameHi;
    if (i18n.language === 'as' && item.nameAs) return item.nameAs;
    if (i18n.language === 'ta' && item.nameTa) return item.nameTa;
    return item.name;
  };

  const availableCities = formData.state ? cities[formData.state] || [] : [];
  const availableWards = formData.city ? wards[formData.city] || wards.default : [];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    if (field === 'state') {
      setFormData(prev => ({ ...prev, city: '', ward: '' }));
    }
    if (field === 'city') {
      setFormData(prev => ({ ...prev, ward: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = t('errors.required');
    if (!formData.mobile.trim()) newErrors.mobile = t('errors.required');
    if (!formData.state) newErrors.state = t('errors.required');
    if (!formData.city) newErrors.city = t('errors.required');
    if (!formData.description.trim()) newErrors.description = t('errors.required');
    if (selectedCategory === 'incorrectBill') {
      if (!formData.billMonth) newErrors.billMonth = t('errors.required');
      if (!formData.disputedAmount) newErrors.disputedAmount = t('errors.required');
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      setShowConfirmModal(true);
    }
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    setSubmissionStep(0);

    try {
      await sleep(900);
      setSubmissionStep(1);
      await sleep(800);
      setSubmissionStep(2);

      let ticketId;
      try {
        const result = await serviceAPI.submit({
          serviceType: 'electricity',
          serviceCategory: `complaint_${selectedCategory}`,
          citizenName: formData.name,
          mobile: formData.mobile,
          email: formData.email,
          consumerNumber: formData.consumerNumber,
          state: formData.state,
          city: formData.city,
          ward: formData.ward,
          address: formData.address,
          description: formData.description,
          aadhaarUid: applicant?.uid || sessionStorage.getItem('aadhaarUid'),
        });
        ticketId = result.requestId;
      } catch {
        ticketId = generateComplaintId();
      }

      await sleep(700);
      setSubmissionStep(3);

      const receiptData = {
        requestId: ticketId,
        citizenName: formData.name,
        mobile: formData.mobile,
        serviceType: 'electricity',
        serviceCategory: `Complaint: ${selectedCategoryData?.label}`,
        timestamp: getCurrentTimestamp(),
        status: 'submitted',
        sla: selectedCategoryData?.sla || '14 working days',
      };

      addReceipt(receiptData);
      clearActiveApplicant(); // next flow starts as self
      navigate(`/receipt?org=${encodeURIComponent(receiptData.serviceType)}&id=${encodeURIComponent(receiptData.requestId)}`);
    } catch (error) {
      console.error('Complaint submission error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <VK bg="color-mix(in oklab, #d97706 4%, white)">
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
    <VK bg="color-mix(in oklab, #d97706 4%, white)">
      <div>
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-kiosk-2xl md:text-kiosk-3xl font-bold text-gray-800">
            {t('elecComplaint.title', 'Electricity Complaint Registration')}
          </h1>
          <p className="text-kiosk-lg text-gray-600 mt-2">
            {t('elecComplaint.subtitle', 'Register your electricity-related grievance')}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
          <div className={`w-20 h-1 ${step >= 2 ? 'bg-amber-500' : 'bg-gray-200'}`} />
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
        </div>

        {step === 1 ? (
          <div className="bg-white rounded-kiosk-lg shadow-kiosk p-6 md:p-8">
            <h2 className="text-kiosk-xl font-bold text-gray-800 mb-6 text-center">
              {t('elecComplaint.selectCategory', 'Select Complaint Category')}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {complaintCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`
                    flex items-start gap-4 p-5 rounded-xl border-2 text-left transition-all
                    touch-manipulation
                    ${selectedCategory === cat.id
                      ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-200'
                      : 'border-gray-200 hover:border-amber-200 hover:bg-amber-50/50'
                    }
                  `}
                  aria-label={cat.label}
                >
                  <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${cat.color} border`}>
                    <cat.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-kiosk-base font-bold text-gray-800">{cat.label}</h3>
                </button>
              ))}
            </div>

            <div className="mt-8 flex justify-between">
              <Button
                variant="outline"
                onClick={() => navigate('/home')}
                size="large"
                icon={ArrowLeft}
              >
                {t('home.backToOrgs', 'Back to Home')}
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!selectedCategory}
                size="xlarge"
                icon={ArrowRight}
                iconPosition="right"
              >
                {t('app.next')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-kiosk-lg shadow-kiosk p-6 md:p-8">
            <ApplicantBanner />
            {/* Selected Category Banner */}
            <div className="mb-6 p-4 bg-amber-50 rounded-kiosk border border-amber-200">
              <p className="text-kiosk-base font-semibold text-amber-800">
                {t('elecComplaint.complaintType', 'Complaint Type')}: {selectedCategoryData?.label}
              </p>
              <p className="text-sm text-amber-600 mt-1">
                Expected Resolution: {selectedCategoryData?.sla}
              </p>
            </div>

            <div className="space-y-6">
              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label={t('form.name')}
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder={t('form.enterName')}
                  error={errors.name}
                  required
                  voiceField="name"
                />
                <Input
                  label={t('form.mobile')}
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => handleInputChange('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder={t('form.enterMobile')}
                  error={errors.mobile}
                  required
                  voiceField="mobile"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label={t('form.email')}
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder={t('form.enterEmail')}
                />
                <Input
                  label={t('electricity.consumerNumber')}
                  value={formData.consumerNumber}
                  onChange={(e) => handleInputChange('consumerNumber', e.target.value)}
                  placeholder={t('electricity.enterConsumerNumber')}
                />
              </div>

              {/* Incorrect Bill Extra Fields */}
              {selectedCategory === 'incorrectBill' && (
                <div className="p-4 bg-yellow-50 rounded-kiosk border border-yellow-200">
                  <h3 className="text-kiosk-base font-bold text-yellow-800 mb-4">
                    {t('elecComplaint.billDetails', 'Bill Dispute Details')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label={t('elecComplaint.billMonth', 'Bill Month')}
                      type="month"
                      value={formData.billMonth}
                      onChange={(e) => handleInputChange('billMonth', e.target.value)}
                      error={errors.billMonth}
                      required
                    />
                    <Input
                      label={t('elecComplaint.disputedAmount', 'Disputed Amount (₹)')}
                      type="number"
                      value={formData.disputedAmount}
                      onChange={(e) => handleInputChange('disputedAmount', e.target.value)}
                      placeholder="e.g., 2500"
                      error={errors.disputedAmount}
                      required
                    />
                    <Input
                      label={t('elecComplaint.actualReading', 'Actual Meter Reading')}
                      value={formData.actualReading}
                      onChange={(e) => handleInputChange('actualReading', e.target.value)}
                      placeholder="e.g., 45230"
                    />
                  </div>
                </div>
              )}

              {/* Location */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Select
                  label={t('form.state')}
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  placeholder={t('form.selectState')}
                  options={states.map(s => ({ value: s.id, label: getLocalizedName(s) }))}
                  error={errors.state}
                  required
                  voiceField="state"
                />
                <Select
                  label={t('form.city')}
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder={t('form.selectCity')}
                  options={availableCities.map(c => ({ value: c.id, label: getLocalizedName(c) }))}
                  error={errors.city}
                  required
                  disabled={!formData.state}
                  voiceField="city"
                />
                <Select
                  label={t('form.ward')}
                  value={formData.ward}
                  onChange={(e) => handleInputChange('ward', e.target.value)}
                  placeholder={t('form.selectWard')}
                  options={availableWards.map(w => ({ value: w.id, label: w.name }))}
                  error={errors.ward}
                  disabled={!formData.city}
                  voiceField="ward"
                />
              </div>

              <Input
                label={t('form.address')}
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder={t('form.enterAddress')}
              />

              {/* Description with Voice Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-kiosk-base font-semibold text-gray-700">
                    {t('form.description')} <span className="text-red-500">*</span>
                  </label>
                  <button
                    onClick={() => {
                      if (isRecording) { stopSTT(); setIsRecording(false); return; }
                      setIsRecording(true);
                      startSTT({
                        language: sttLangCode,
                        continuous: false,
                        autoRestart: false,
                        onResult: (text) => {
                          setFormData(prev => ({ ...prev, description: prev.description ? `${prev.description} ${text}` : text }));
                          setIsRecording(false);
                        },
                        onInterim: () => {},
                        onError: () => setIsRecording(false),
                      });
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all touch-manipulation ${
                      isRecording
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                    }`}
                    aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
                  >
                    {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    {isRecording ? t('gasComplaint.stopRecording', 'Stop Recording') : t('gasComplaint.voiceInput', 'Voice Input')}
                  </button>
                </div>
                {isRecording && (
                  <div className="mb-2 p-3 bg-amber-50 border border-amber-200 rounded-kiosk text-sm text-amber-700 animate-pulse">
                     {t('gasComplaint.recording', 'Listening... Speak now')}
                  </div>
                )}
                <TextArea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder={t('elecComplaint.descPlaceholder', 'Describe your complaint in detail or use voice input')}
                  error={errors.description}
                  rows={5}
                  maxLength={1000}
                  voiceField="description"
                />
              </div>

              <QRUpload
                label={t('elecComplaint.uploadEvidence', 'Upload Documents / Evidence')}
                onUploadComplete={(uploadedFiles) => setFiles(uploadedFiles)}
                maxFiles={5}
              />

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between pt-6 border-t">
                <Button
                  variant="secondary"
                  onClick={() => setStep(1)}
                  size="large"
                >
                  {t('app.back')}
                </Button>
                <Button onClick={handleSubmit} size="large">
                  {t('app.submit')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        type="confirm"
        title={t('modal.confirmTitle')}
        message={t('modal.confirmMessage')}
        confirmText={t('app.confirm')}
        cancelText={t('app.cancel')}
        onConfirm={handleConfirmSubmit}
        onCancel={() => setShowConfirmModal(false)}
      />
    </VK>
  );
};

export default ElectricityComplaint;
