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
 * Municipal Corporation Services page
 * Covers property tax, birth/death certificates, building permits, trade licenses, etc.
 */
const Municipal = () => {
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
      const validCategory = serviceCategories.municipal.find(c => c.id === urlCategory);
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
    propertyId: '',
    aadhaarLast4: '',
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

  const categories = serviceCategories.municipal;

  const utilityServices = [
    {
      id: 'track',
      title: t('home.muniTrack', 'Track Request / Complaint'),
      description: t('home.muniTrackDesc', 'Monitor status of submitted applications'),
      path: '/track-status',
      glyph: ic.track,
    },
    {
      id: 'profile',
      title: t('home.muniProfile', 'Update Profile / Credentials'),
      description: t('home.muniProfileDesc', 'Update consumer details and contact info'),
      path: '/consumer-profile?org=municipal',
      glyph: ic.user,
    },
    {
      id: 'receipt',
      title: t('home.muniReceipt', 'Receipt Generation'),
      description: t('home.muniReceiptDesc', 'View and print transaction receipts'),
      path: '/receipt?org=municipal',
      glyph: ic.receipt,
    },
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
      navigate('/municipal-menu');
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
          serviceType: 'municipal',
          serviceCategory: selectedCategory,
          citizenName: formData.name,
          mobile: formData.mobile,
          email: formData.email,
          propertyId: formData.propertyId,
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
        serviceType: 'municipal',
        serviceCategory: t(`municipal.${selectedCategory}`),
        timestamp: getCurrentTimestamp(),
        status: 'submitted',
        sla: '14 working days',
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
          <DD color="var(--dept-water)" glyph={ic.drop} size={168} isz={92} />
          <div>
            <div className="label-tag" style={{ color: 'var(--dept-water)', marginBottom: 14 }}>
              Guwahati Municipal
            </div>
            <h1 className="h2">{t('municipal.title')}</h1>
            <p className="body-l" style={{ marginTop: 14, color: 'var(--ink-500)' }}>
              {t('municipal.subtitle')}
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
          <>
            <div className="label-tag" style={{ marginBottom: 24 }}>{t('form.selectCategory')}</div>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 44 }}>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={`chip${selectedCategory === category.id ? ' act' : ''}`}
                  onClick={() => setSelectedCategory(category.id)}
                  aria-label={t(category.key)}
                >
                  {t(category.key)}
                </button>
              ))}
            </div>

            <div className="label-tag" style={{ marginBottom: 24 }}>{t('home.utilitiesHistory', 'Utilities & History')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 36 }}>
              {utilityServices.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => navigate(service.path)}
                  className="tile"
                  style={{
                    minHeight: 220, padding: 28, alignItems: 'flex-start', textAlign: 'left',
                    gap: 18, borderTop: '8px solid var(--dept-water)', touchAction: 'manipulation',
                  }}
                  aria-label={service.title}
                >
                  <DD color="var(--dept-water)" glyph={service.glyph} size={96} isz={52} />
                  <div className="nm" style={{ fontSize: 22 }}>{service.title}</div>
                  <div className="sub" style={{ fontSize: 18 }}>{service.description}</div>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 32 }}>
              <button className="btn btn-ghost" onClick={() => navigate('/home')}>
                <I d={ic.back} size={40} /> {t('home.backToOrgs', 'Back to Home')}
              </button>
              <button className="btn btn-pri btn-xl" disabled={!selectedCategory} onClick={() => setStep(2)}>
                {t('app.next')}
              </button>
            </div>
          </>
        ) : (
          <div className="card">
            <ApplicantBanner />
            <span className="badge b-info" style={{ marginBottom: 44 }}>
              Selected · {t(`municipal.${selectedCategory}`)}
            </span>

            {selectedCategory === 'waterConnection' && (
              <div style={{ marginBottom: 36 }}>
                <div className="label-tag" style={{ marginBottom: 20 }}>Water Connection Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
                  <div>
                    <label className="flab">{t('municipal.connectionType')} *</label>
                    <Select
                      value={formData.waterConnectionType || ''}
                      onChange={e => handleInputChange('waterConnectionType', e.target.value)}
                      placeholder={t('municipal.selectConnectionType')}
                      options={[
                        { value: 'domestic', label: 'Domestic (Household)' },
                        { value: 'commercial', label: 'Commercial' },
                        { value: 'industrial', label: 'Industrial' },
                        { value: 'institutional', label: 'Institutional/Govt' },
                        { value: 'upgrade', label: 'Upgrade Existing' },
                      ]}
                      required
                    />
                  </div>
                  <div>
                    <label className="flab">{t('municipal.pipeSize')}</label>
                    <Select
                      value={formData.pipeSize || ''}
                      onChange={e => handleInputChange('pipeSize', e.target.value)}
                      placeholder={t('municipal.selectPipeSize')}
                      options={[
                        { value: '0.5inch', label: '½ inch (Standard domestic)' },
                        { value: '1inch', label: '1 inch (Small commercial)' },
                        { value: '2inch', label: '2 inch (Large commercial)' },
                        { value: '3inch', label: '3 inch+ (Industrial)' },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="flab">{t('municipal.plotArea')}</label>
                    <input className="field" type="number" value={formData.plotArea || ''} onChange={e => handleInputChange('plotArea', e.target.value)} placeholder="e.g. 1500" />
                  </div>
                  <div>
                    <label className="flab">{t('municipal.numberOfFloors')}</label>
                    <input className="field" type="number" value={formData.floorCount || ''} onChange={e => handleInputChange('floorCount', e.target.value)} placeholder="e.g. 3" />
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
                <label className="flab">{t('municipal.propertyId')}</label>
                <input className="field" value={formData.propertyId} onChange={(e) => handleInputChange('propertyId', e.target.value)} placeholder={t('municipal.enterPropertyId')} />
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

export default Municipal;
