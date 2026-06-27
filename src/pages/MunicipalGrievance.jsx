import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { startSTT, stopSTT } from '../ai/voice/speechRecognition';
import { useVoiceFormSubmit } from '../hooks/useVoiceFormSubmit';
import { Modal, Select } from '../components';
import { VK, DD, I, ic } from '../components/kiosk';
import { LoadingScreen, SubmissionSteps } from '../components/loading';
import QRUpload from '../components/QRUpload';
import { states, cities, wards } from '../utils/constants';
import { generateComplaintId, getCurrentTimestamp } from '../utils/helpers';
import { serviceAPI } from '../utils/apiService';
import { addReceipt } from '../utils/receipts';
import { sleep } from '../utils/mockDelay';

/**
 * Municipal Grievance Registration — 8 SRS-defined categories
 */
const MunicipalGrievance = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [formData, setFormData] = useState({
    name: sessionStorage.getItem('userName') || '',
    mobile: sessionStorage.getItem('userMobile') || '',
    email: '',
    state: '',
    city: '',
    ward: '',
    specificLocation: '',
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

  useVoiceFormSubmit('municipal_grievance', () => { if (step === 2) handleSubmit(); });

  const toggleVoiceInput = useCallback(() => {
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
  }, [isRecording, sttLangCode]);

  const grievanceCategories = [
    { id: 'waterDisruption', label: t('muniGrievance.waterDisruption', 'Water Supply Disruption'), glyph: ic.drop },
    { id: 'sewageOverflow', label: t('muniGrievance.sewageOverflow', 'Sewage Overflow or Blockage'), glyph: ic.bell },
    { id: 'garbageIssue', label: t('muniGrievance.garbageIssue', 'Garbage Collection Irregularity'), glyph: ic.trash },
    { id: 'streetlightFailure', label: t('muniGrievance.streetlightFailure', 'Streetlight Failure'), glyph: ic.bolt },
    { id: 'roadDamage', label: t('muniGrievance.roadDamage', 'Road Damage and Potholes'), glyph: ic.sos },
    { id: 'waterQuality', label: t('muniGrievance.waterQuality', 'Water Quality Complaints'), glyph: ic.drop },
    { id: 'propertyTaxError', label: t('muniGrievance.propertyTaxError', 'Property Tax Errors'), glyph: ic.rupee },
    { id: 'otherMunicipal', label: t('muniGrievance.otherMunicipal', 'Other Municipal Issues'), glyph: ic.help },
  ];

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
          serviceType: 'municipal',
          serviceCategory: `grievance_${selectedCategory}`,
          citizenName: formData.name,
          mobile: formData.mobile,
          email: formData.email,
          state: formData.state,
          city: formData.city,
          ward: formData.ward,
          address: formData.specificLocation,
          description: formData.description,
          aadhaarUid: sessionStorage.getItem('aadhaarUid'),
        });
        ticketId = result.requestId;
      } catch {
        ticketId = generateComplaintId();
      }

      await sleep(700);
      setSubmissionStep(3);

      const catLabel = grievanceCategories.find(c => c.id === selectedCategory)?.label || selectedCategory;
      const receiptData = {
        requestId: ticketId,
        citizenName: formData.name,
        mobile: formData.mobile,
        serviceType: 'municipal',
        serviceCategory: `Grievance: ${catLabel}`,
        timestamp: getCurrentTimestamp(),
        status: 'submitted',
        sla: '10 working days',
      };

      addReceipt(receiptData);
      navigate(`/receipt?org=${encodeURIComponent(receiptData.serviceType)}&id=${encodeURIComponent(receiptData.requestId)}`);
    } catch (error) {
      console.error('Municipal grievance error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <VK bg="color-mix(in oklab, var(--dept-water) 5%, var(--surface-0))">
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
    <VK bg="color-mix(in oklab, var(--dept-water) 5%, var(--surface-0))">
      <div>
        {/* Dept header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 40, marginBottom: 48 }}>
          <DD color="var(--dept-water)" glyph={ic.chat} size={168} isz={92} />
          <div>
            <div className="label-tag" style={{ color: 'var(--dept-water)', marginBottom: 14 }}>
              Guwahati Municipal
            </div>
            <h1 className="h2">{t('muniGrievance.title', 'Municipal Grievance Registration')}</h1>
            <p className="body-l" style={{ marginTop: 14, color: 'var(--ink-500)' }}>
              {t('muniGrievance.subtitle', 'Report municipal service issues')}
            </p>
          </div>
        </div>

        {/* Step Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 36 }}>
          <span className={`badge ${step >= 1 ? 'b-info' : ''}`} style={{ width: 48, height: 48, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 800 }}>1</span>
          <div style={{ width: 80, height: 4, background: step >= 2 ? 'var(--dept-water)' : 'var(--line)' }} />
          <span className={`badge ${step >= 2 ? 'b-info' : ''}`} style={{ width: 48, height: 48, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 800 }}>2</span>
        </div>

        {step === 1 ? (
          <div className="card">
            <h2 className="h3" style={{ textAlign: 'center', marginBottom: 36 }}>
              {t('muniGrievance.selectCategory', 'Select Grievance Category')}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {grievanceCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className="tile"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 20, padding: 24, textAlign: 'left',
                    borderTop: '8px solid var(--dept-water)', touchAction: 'manipulation',
                  }}
                  aria-label={cat.label}
                >
                  <DD color="var(--dept-water)" glyph={cat.glyph} size={72} isz={36} />
                  <h3 className="nm" style={{ fontSize: 22 }}>{cat.label}</h3>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 32, marginTop: 48, paddingTop: 40, borderTop: '1.5px solid var(--line)' }}>
              <button className="btn btn-ghost" onClick={() => navigate('/home')}>
                <I d={ic.back} size={40} /> {t('home.backToOrgs', 'Back to Home')}
              </button>
              <button className="btn btn-pri btn-xl" disabled={!selectedCategory} onClick={() => setStep(2)}>
                {t('app.next')}
              </button>
            </div>
          </div>
        ) : (
          <div className="card">
            <span className="badge b-info" style={{ marginBottom: 44 }}>
              Category · {grievanceCategories.find(c => c.id === selectedCategory)?.label}
            </span>

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
              <label className="flab">{t('muniGrievance.specificLocation', 'Specific Location / Landmark')}</label>
              <input className="field" value={formData.specificLocation} onChange={(e) => handleInputChange('specificLocation', e.target.value)} placeholder={t('muniGrievance.enterLocation', 'e.g., Near ABC Junction, Main Road')} />
            </div>

            <div style={{ marginTop: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <label className="flab" style={{ margin: 0 }}>{t('form.description')} *</label>
                <button
                  onClick={toggleVoiceInput}
                  className={`chip${isRecording ? ' act' : ''}`}
                  aria-label={isRecording ? 'Stop voice recording' : 'Start voice input'}
                >
                  <I d={isRecording ? ic.x : ic.voice} size={28} />
                  {isRecording ? t('gasComplaint.stopRecording', 'Stop Recording') : t('gasComplaint.voiceInput', 'Voice Input')}
                </button>
              </div>
              {isRecording && (
                <div className="meta" style={{ marginBottom: 12, color: 'var(--dept-water)' }}>
                  {t('gasComplaint.recording', 'Listening… Speak now')}
                </div>
              )}
              <textarea className="field" data-voice-field="description" style={{ minHeight: 200 }} value={formData.description} onChange={(e) => handleInputChange('description', e.target.value)} placeholder={t('form.enterDescription')} maxLength={1000} />
              {errors.description && <div className="meta" style={{ color: 'var(--err)' }}>{errors.description}</div>}
            </div>

            <div style={{ marginTop: 36 }}>
              <label className="flab">{t('form.uploadDocuments')}</label>
              <QRUpload label={t('form.uploadDocuments')} onUploadComplete={(uploadedFiles) => setFiles(uploadedFiles)} maxFiles={5} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 32, marginTop: 52, paddingTop: 44, borderTop: '1.5px solid var(--line)' }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)}>
                <I d={ic.back} size={40} /> {t('app.back')}
              </button>
              <button className="btn btn-pri" onClick={handleSubmit}>
                {t('app.submit')}
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} type="confirm" title={t('modal.confirmTitle')} message={t('modal.confirmMessage')} confirmText={t('app.confirm')} cancelText={t('app.cancel')} onConfirm={handleConfirmSubmit} onCancel={() => setShowConfirmModal(false)} />
    </VK>
  );
};

export default MunicipalGrievance;
