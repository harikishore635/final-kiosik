import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { startSTT, stopSTT } from '../ai/voice/speechRecognition';
import { useVoiceFormSubmit } from '../hooks/useVoiceFormSubmit';
import { Modal, Select, ApplicantBanner } from '../components';
import { VK, DD, I, ic } from '../components/kiosk';
import { LoadingScreen, SubmissionSteps } from '../components/loading';
import QRUpload from '../components/QRUpload';
import { states, cities, wards } from '../utils/constants';
import { generateComplaintId, getCurrentTimestamp } from '../utils/helpers';
import { addReceipt } from '../utils/receipts';
import { serviceAPI } from '../utils/apiService';
import { sleep } from '../utils/mockDelay';
import { getActiveApplicant, buildFormPrefill, clearActiveApplicant } from '../utils/citizenProfile';

/**
 * Gas Complaint Registration — with voice input support (SRS requirement)
 */
const GasComplaint = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('');

  const gasComplaintCategories = [
    { id: 'billing', label: t('gasComplaint.billing', 'Incorrect Gas Bill'), glyph: ic.doc, sla: '7 working days', desc: t('gasComplaint.billingDesc', 'Wrong amount, double charge, or a meter-reading dispute on your gas bill') },
    { id: 'gasleak', label: t('gasComplaint.gasleak', 'Gas Leak / Safety Issue'), glyph: ic.flame, sla: '24 hours (Emergency)', desc: t('gasComplaint.gasleakDesc', 'Smell of gas, hissing, or a suspected leak — handled as a safety emergency') },
    { id: 'meter', label: t('gasComplaint.meterIssue', 'Meter Damage / Malfunction'), glyph: ic.cog, sla: '10 working days', desc: t('gasComplaint.meterDesc', 'Damaged, stuck, or faulty gas meter needing repair or replacement') },
    { id: 'disconnection', label: t('gasComplaint.disconnection', 'Disconnection Without Notice'), glyph: ic.x, sla: '3 working days', desc: t('gasComplaint.disconnectionDesc', 'Supply cut without prior notice or after your bill was paid') },
    { id: 'other', label: t('gasComplaint.other', 'Other Grievance'), glyph: ic.help, sla: '14 working days', desc: t('gasComplaint.otherDesc', 'Any other gas-related grievance not covered by the categories above') },
  ];

  const selectedCategoryData = gasComplaintCategories.find(c => c.id === selectedCategory);

  const applicant = getActiveApplicant();
  const prefill = buildFormPrefill(applicant);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    caNumber: '',
    state: '',
    city: '',
    ward: '',
    address: '',
    ...prefill,
    description: '',
  });
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submissionStep, setSubmissionStep] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const STT_LANG_MAP = { en: 'en-IN', hi: 'hi-IN', ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN', ml: 'ml-IN', mr: 'mr-IN', gu: 'gu-IN', bn: 'bn-IN', or: 'or-IN', pa: 'pa-IN', as: 'as-IN' };
  const sttLangCode = STT_LANG_MAP[(i18n.language || 'en').split('-')[0]] || 'hi-IN';

  useVoiceFormSubmit('gas_complaint', () => { if (step === 2) handleSubmit(); });

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
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
    if (field === 'state') setFormData(prev => ({ ...prev, city: '', ward: '' }));
    if (field === 'city') setFormData(prev => ({ ...prev, ward: '' }));
  };

  const toggleVoiceInput = useCallback(() => {
    if (isRecording) {
      stopSTT();
      setIsRecording(false);
      return;
    }
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
  }, [isRecording, sttLangCode]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = t('errors.required');
    if (!formData.mobile.trim()) newErrors.mobile = t('errors.required');
    if (!formData.state) newErrors.state = t('errors.required');
    if (!formData.city) newErrors.city = t('errors.required');
    if (!formData.description.trim()) newErrors.description = t('errors.required');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) setShowConfirmModal(true);
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
          serviceType: 'gas',
          serviceCategory: 'complaint',
          citizenName: formData.name,
          mobile: formData.mobile,
          email: formData.email,
          consumerNumber: formData.caNumber,
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
        serviceType: 'gas',
        serviceCategory: selectedCategoryData ? `Gas Complaint: ${selectedCategoryData.label}` : t('gasComplaint.title', 'Gas Complaint'),
        timestamp: getCurrentTimestamp(),
        status: 'submitted',
        sla: selectedCategoryData?.sla || '7 working days',
      };

      addReceipt(receiptData);
      clearActiveApplicant(); // next flow starts as self
      navigate(`/receipt?org=${encodeURIComponent(receiptData.serviceType)}&id=${encodeURIComponent(receiptData.requestId)}`);
    } catch (error) {
      console.error('Gas complaint error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <VK bg="color-mix(in oklab, var(--dept-gas) 5%, var(--surface-0))">
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
    <VK bg="color-mix(in oklab, var(--dept-gas) 5%, var(--surface-0))">
      <div>
        {/* Dept header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 40, marginBottom: 48 }}>
          <DD color="var(--dept-gas)" glyph={ic.chat} size={168} isz={92} />
          <div>
            <div className="label-tag" style={{ color: 'var(--dept-gas)', marginBottom: 14 }}>
              Assam Gas Company
            </div>
            <h1 className="h2">{t('gasComplaint.title', 'Gas Complaint Registration')}</h1>
            <p className="body-l" style={{ marginTop: 14, color: 'var(--ink-500)' }}>
              {t('gasComplaint.subtitle', 'Register your gas-related grievance')}
            </p>
          </div>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 36 }}>
          <span className={`badge ${step >= 1 ? 'b-info' : ''}`} style={{ width: 48, height: 48, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 800 }}>1</span>
          <div style={{ width: 80, height: 4, background: step >= 2 ? 'var(--dept-gas)' : 'var(--line)' }} />
          <span className={`badge ${step >= 2 ? 'b-info' : ''}`} style={{ width: 48, height: 48, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 800 }}>2</span>
        </div>

        {/* Step 1 — Category selection */}
        {step === 1 && (
          <div className="card">
            <h2 className="h3" style={{ textAlign: 'center', marginBottom: 36 }}>
              {t('gasComplaint.selectCategory', 'Select Complaint Category')}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {gasComplaintCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className="tile"
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 20, padding: 24, textAlign: 'left',
                    borderTop: '8px solid var(--dept-gas)', touchAction: 'manipulation',
                  }}
                  aria-label={cat.label}
                >
                  <DD color="var(--dept-gas)" glyph={cat.glyph} size={72} isz={36} />
                  <div>
                    <div className="nm" style={{ fontSize: 22 }}>{cat.label}</div>
                    <div className="meta" style={{ marginTop: 6, lineHeight: 1.4 }}>{cat.desc}</div>
                    <div className="meta" style={{ marginTop: 8, fontWeight: 700, color: 'var(--dept-gas)' }}>{t('gasComplaint.resolutionIn', 'Resolution in')}: {cat.sla}</div>
                  </div>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 32, marginTop: 48, paddingTop: 40, borderTop: '1.5px solid var(--line)' }}>
              <button className="btn btn-ghost" onClick={() => navigate('/home')}>
                <I d={ic.back} size={40} /> {t('home.backToOrgs', 'Back')}
              </button>
              <button className="btn btn-pri btn-xl" disabled={!selectedCategory} onClick={() => setStep(2)}>
                {t('app.next', 'Next')}
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Form */}
        {step === 2 && (
        <div className="card">
          <ApplicantBanner />
          {/* SLA Banner */}
          <div style={{ marginBottom: 36, padding: 24, borderRadius: 18, background: 'color-mix(in oklab, var(--err) 10%, white)', border: '1.5px solid color-mix(in oklab, var(--err) 30%, white)' }}>
            <div className="body" style={{ fontWeight: 700, color: 'var(--err)' }}>
              {selectedCategoryData?.label} — SLA: {selectedCategoryData?.sla}
            </div>
            <div className="meta" style={{ marginTop: 6, color: 'var(--err)' }}>
              {t('gasComplaint.slaNotice', 'Response time as per SLA guidelines')}
            </div>
          </div>

          {/* Personal Information */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '36px 40px' }}>
            <div>
              <label className="flab">{t('form.name')} *</label>
              <input className="field" data-voice-field="name" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} placeholder={t('form.enterName')} required />
              {errors.name && <div className="meta" style={{ color: 'var(--err)' }}>{errors.name}</div>}
            </div>
            <div>
              <label className="flab">{t('form.mobile')} *</label>
              <input className="field" data-voice-field="mobile" type="tel" value={formData.mobile} onChange={(e) => handleInputChange('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder={t('form.enterMobile')} required />
              {errors.mobile && <div className="meta" style={{ color: 'var(--err)' }}>{errors.mobile}</div>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '36px 40px', marginTop: 36 }}>
            <div>
              <label className="flab">{t('form.email')}</label>
              <input className="field" type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} placeholder={t('form.enterEmail')} />
            </div>
            <div>
              <label className="flab">{t('gasComplaint.caNumber', 'Consumer Account (CA) Number')}</label>
              <input className="field" value={formData.caNumber} onChange={(e) => handleInputChange('caNumber', e.target.value)} placeholder={t('gasComplaint.enterCA', 'Enter CA number')} />
            </div>
          </div>

          {/* Location */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 40, marginTop: 36 }}>
            <div>
              <label className="flab">{t('form.state')} *</label>
              <Select
                voiceField="state"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                placeholder={t('form.selectState')}
                options={states.map(s => ({ value: s.id, label: getLocalizedName(s) }))}
                required
              />
              {errors.state && <div className="meta" style={{ color: 'var(--err)' }}>{errors.state}</div>}
            </div>
            <div>
              <label className="flab">{t('form.city')} *</label>
              <Select
                voiceField="city"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder={t('form.selectCity')}
                options={availableCities.map(c => ({ value: c.id, label: getLocalizedName(c) }))}
                disabled={!formData.state}
                required
              />
              {errors.city && <div className="meta" style={{ color: 'var(--err)' }}>{errors.city}</div>}
            </div>
            <div>
              <label className="flab">{t('form.ward')}</label>
              <Select
                voiceField="ward"
                value={formData.ward}
                onChange={(e) => handleInputChange('ward', e.target.value)}
                placeholder={t('form.selectWard')}
                options={availableWards.map(w => ({ value: w.id, label: w.name }))}
                disabled={!formData.city}
              />
            </div>
          </div>

          <div style={{ marginTop: 36 }}>
            <label className="flab">{t('form.address')}</label>
            <input className="field" value={formData.address} onChange={(e) => handleInputChange('address', e.target.value)} placeholder={t('form.enterAddress')} />
          </div>

          {/* Description with Voice Input */}
          <div style={{ marginTop: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <label className="flab" style={{ margin: 0 }}>{t('form.description')} *</label>
              <button
                onClick={toggleVoiceInput}
                className={`chip${isRecording ? ' act' : ''}`}
                aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
              >
                <I d={isRecording ? ic.x : ic.voice} size={28} />
                {isRecording
                  ? t('gasComplaint.stopRecording', 'Stop Recording')
                  : t('gasComplaint.voiceInput', 'Voice Input')
                }
              </button>
            </div>
            {isRecording && (
              <div className="meta" style={{ marginBottom: 12, color: 'var(--dept-gas)' }}>
                {t('gasComplaint.recording', 'Listening... Speak now')}
              </div>
            )}
            <textarea
              className="field"
              data-voice-field="description"
              style={{ minHeight: 200 }}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder={t('gasComplaint.descPlaceholder', 'Describe your complaint or use voice input')}
              maxLength={1000}
            />
            {errors.description && <div className="meta" style={{ color: 'var(--err)' }}>{errors.description}</div>}
          </div>

          <div style={{ marginTop: 36 }}>
            <label className="flab">{t('form.uploadDocuments')}</label>
            <QRUpload label={t('form.uploadDocuments')} onUploadComplete={(uploadedFiles) => setFiles(uploadedFiles)} maxFiles={5} />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 32, marginTop: 52, paddingTop: 44, borderTop: '1.5px solid var(--line)' }}>
            <button className="btn btn-ghost" onClick={() => setStep(1)}>
              <I d={ic.back} size={40} /> {t('app.back', 'Back')}
            </button>
            <button className="btn btn-pri" onClick={handleSubmit}>
              {t('app.submit')}
            </button>
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

export default GasComplaint;
