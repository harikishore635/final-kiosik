import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Modal, Select, ApplicantBanner } from '../components';
import { VK, DD, I, ic } from '../components/kiosk';
import { LoadingScreen, SubmissionSteps } from '../components/loading';
import QRUpload from '../components/QRUpload';
import { states, cities, wards, serviceCategories } from '../utils/constants';
import { generateRequestId, getCurrentTimestamp } from '../utils/helpers';
import { addReceipt } from '../utils/receipts';
import { serviceAPI } from '../utils/apiService';
import { sleep } from '../utils/mockDelay';
import { getActiveApplicant, buildFormPrefill, clearActiveApplicant } from '../utils/citizenProfile';

/**
 * Gas Services page
 */
const Gas = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isDeepLinkedCategory, setIsDeepLinkedCategory] = useState(false);
  const [searchParams] = useSearchParams();

  // Auto-select category from URL params
  useEffect(() => {
    const urlCategory = searchParams.get('category');
    if (urlCategory) {
      const validCategory = serviceCategories.gas.find(c => c.id === urlCategory);
      if (validCategory) {
        setSelectedCategory(urlCategory);
        setStep(2);
        setIsDeepLinkedCategory(true);
        return;
      }
    }

    setIsDeepLinkedCategory(false);
  }, [searchParams]);
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
  });
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submissionStep, setSubmissionStep] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const categories = serviceCategories.gas;

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
    if (!formData.ward) newErrors.ward = t('errors.required');
    if (!formData.address.trim()) newErrors.address = t('errors.required');
    if (!formData.description.trim()) newErrors.description = t('errors.required');

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      setShowConfirmModal(true);
    }
  };

  const handleFormBack = () => {
    if (isDeepLinkedCategory) {
      navigate('/gas-menu');
      return;
    }

    setStep(1);
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

      let requestId;
      try {
        const result = await serviceAPI.submit({
          serviceType: 'gas',
          serviceCategory: selectedCategory,
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
        requestId = result.requestId;
      } catch {
        requestId = generateRequestId();
      }

      await sleep(700);
      setSubmissionStep(3);

      const receiptData = {
        requestId,
        citizenName: formData.name,
        mobile: formData.mobile,
        serviceType: 'gas',
        serviceCategory: t(`gas.${selectedCategory}`),
        timestamp: getCurrentTimestamp(),
        status: 'submitted',
        sla: '10 working days',
      };

      addReceipt(receiptData);
      clearActiveApplicant(); // next flow starts as self
      navigate(`/receipt?org=${encodeURIComponent(receiptData.serviceType)}&id=${encodeURIComponent(receiptData.requestId)}`);
    } catch (error) {
      console.error('Submission error:', error);
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
          <DD color="var(--dept-gas)" glyph={ic.flame} size={168} isz={92} />
          <div>
            <div className="label-tag" style={{ color: 'var(--dept-gas)', marginBottom: 14 }}>
              Assam Gas Company
            </div>
            <h1 className="h2">{t('gas.title')}</h1>
            <p className="body-l" style={{ marginTop: 14, color: 'var(--ink-500)' }}>
              {t('gas.subtitle')}
            </p>
          </div>
        </div>

        {/* Step Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 36 }}>
          <span className={`badge ${step >= 1 ? 'b-info' : ''}`} style={{ width: 48, height: 48, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 800 }}>1</span>
          <div style={{ width: 80, height: 4, background: step >= 2 ? 'var(--dept-gas)' : 'var(--line)' }} />
          <span className={`badge ${step >= 2 ? 'b-info' : ''}`} style={{ width: 48, height: 48, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 800 }}>2</span>
        </div>

        {step === 1 ? (
          <div className="card">
            <h2 className="h3" style={{ textAlign: 'center', marginBottom: 36 }}>
              {t('form.selectCategory')}
            </h2>

            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 8 }}>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={`chip${selectedCategory === category.id ? ' act' : ''}`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {t(category.key)}
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
            <ApplicantBanner />
            <span className="badge b-info" style={{ marginBottom: 44 }}>
              Selected · {t(`gas.${selectedCategory}`)}
            </span>

            {/* Meter Damage — severity + type */}
            {selectedCategory === 'meterDamage' && (
              <div style={{ marginBottom: 36 }}>
                <div className="label-tag" style={{ marginBottom: 20 }}>Meter Issue Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
                  <div>
                    <label className="flab">{t('gas.issueType')} *</label>
                    <Select
                      value={formData.meterIssueType || ''}
                      onChange={e => handleInputChange('meterIssueType', e.target.value)}
                      placeholder={t('gas.selectIssueType')}
                      options={[
                        { value: 'damaged', label: 'Physically Damaged' },
                        { value: 'malfunctioning', label: 'Showing Wrong Readings' },
                        { value: 'leaking', label: 'Gas Leaking at Meter' },
                        { value: 'installation', label: 'New Meter Installation' },
                        { value: 'replacement', label: 'Replacement Required' },
                      ]}
                      required
                    />
                  </div>
                  <div>
                    <label className="flab">{t('gas.priority')}</label>
                    <Select
                      value={formData.priority || ''}
                      onChange={e => handleInputChange('priority', e.target.value)}
                      placeholder={t('gas.selectPriority')}
                      options={[
                        { value: 'emergency', label: 'Emergency — Gas Leak (24h)' },
                        { value: 'urgent', label: 'Urgent (3 days)' },
                        { value: 'normal', label: 'Normal (10 days)' },
                      ]}
                    />
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '36px 40px' }}>
              <div>
                <label className="flab">{t('form.name')} *</label>
                <input className="field" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} placeholder={t('form.enterName')} required />
                {errors.name && <div className="meta" style={{ color: 'var(--err)' }}>{errors.name}</div>}
              </div>
              <div>
                <label className="flab">{t('form.mobile')} *</label>
                <input className="field" type="tel" value={formData.mobile} onChange={(e) => handleInputChange('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder={t('form.enterMobile')} required />
                {errors.mobile && <div className="meta" style={{ color: 'var(--err)' }}>{errors.mobile}</div>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '36px 40px', marginTop: 36 }}>
              <div>
                <label className="flab">{t('form.email')}</label>
                <input className="field" type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} placeholder={t('form.enterEmail')} />
              </div>
              <div>
                <label className="flab">{t('gas.consumerNumber', 'CA Number / Legacy Number')}</label>
                <input className="field" value={formData.consumerNumber} onChange={(e) => handleInputChange('consumerNumber', e.target.value)} placeholder={t('gas.enterConsumerNumber', 'Enter CA Number or Legacy Number')} />
                <div className="meta" style={{ marginTop: 6 }}>{t('gas.caNumberHint', 'Your Consumer Account (CA) number is printed on your gas bill')}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 40, marginTop: 36 }}>
              <div>
                <label className="flab">{t('form.state')} *</label>
                <Select
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
                <label className="flab">{t('form.ward')} *</label>
                <Select
                  value={formData.ward}
                  onChange={(e) => handleInputChange('ward', e.target.value)}
                  placeholder={t('form.selectWard')}
                  options={availableWards.map(w => ({ value: w.id, label: w.name }))}
                  disabled={!formData.city}
                  required
                />
                {errors.ward && <div className="meta" style={{ color: 'var(--err)' }}>{errors.ward}</div>}
              </div>
            </div>

            <div style={{ marginTop: 36 }}>
              <label className="flab">{t('form.address')} *</label>
              <input className="field" value={formData.address} onChange={(e) => handleInputChange('address', e.target.value)} placeholder={t('form.enterAddress')} required />
              {errors.address && <div className="meta" style={{ color: 'var(--err)' }}>{errors.address}</div>}
            </div>

            <div style={{ marginTop: 36 }}>
              <label className="flab">{t('form.description')} *</label>
              <textarea className="field" style={{ minHeight: 240 }} value={formData.description} onChange={(e) => handleInputChange('description', e.target.value)} placeholder={t('form.enterDescription')} required maxLength={500} />
              {errors.description && <div className="meta" style={{ color: 'var(--err)' }}>{errors.description}</div>}
            </div>

            <div style={{ marginTop: 36 }}>
              <label className="flab">{t('form.uploadDocuments')}</label>
              <QRUpload label={t('form.uploadDocuments')} onUploadComplete={(uploadedFiles) => setFiles(uploadedFiles)} maxFiles={5} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 32, marginTop: 52, paddingTop: 44, borderTop: '1.5px solid var(--line)' }}>
              <button className="btn btn-ghost" onClick={handleFormBack}>
                <I d={ic.back} size={40} /> {t('app.back')}
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

export default Gas;
