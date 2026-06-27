import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Modal, Select, ApplicantBanner } from '../components';
import { VK, DD, I, ic } from '../components/kiosk';
import { LoadingScreen, SubmissionSteps } from '../components/loading';
import QRUpload from '../components/QRUpload';
import { states, cities, wards } from '../utils/constants';
import { generateRequestId, getCurrentTimestamp } from '../utils/helpers';
import { addReceipt } from '../utils/receipts';
import { serviceAPI } from '../utils/apiService';
import { sleep } from '../utils/mockDelay';
import { getActiveApplicant, buildFormPrefill, clearActiveApplicant } from '../utils/citizenProfile';

const Sanitation = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('');
  const applicant = getActiveApplicant();
  const prefill = buildFormPrefill(applicant);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    state: '',
    city: '',
    ward: '',
    address: '',
    ...prefill,
    description: '',
    preferredDate: '',
    preferredTime: '',
  });
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submissionStep, setSubmissionStep] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const mainServices = [
    {
      id: 'wastePickup',
      glyph: ic.trash,
      title: t('sanitation.wastePickup', 'Waste Pickup Request'),
      description: t('home.sanitationWasteDesc', 'Schedule household or commercial waste collection'),
    },
    {
      id: 'drainageCleaning',
      glyph: ic.drop,
      title: t('sanitation.drainageCleaning', 'Drainage Cleaning'),
      description: t('home.sanitationDrainageDesc', 'Report blocked or overflowing drainage lines'),
    },
    {
      id: 'sewageIssue',
      glyph: ic.help,
      title: t('sanitation.sewageIssue', 'Sewage Issue'),
      description: t('home.sanitationSewageDesc', 'Report sewage overflow or pipeline damage'),
    },
    {
      id: '_profile',
      glyph: ic.user,
      title: t('home.sanitationProfile', 'Update Profile'),
      description: t('home.sanitationProfileDesc', 'Update credentials and sanitation details'),
      path: '/consumer-profile?org=sanitation',
    },
    {
      id: '_track',
      glyph: ic.track,
      title: t('home.sanitationTrack', 'Track Request'),
      description: t('home.sanitationTrackDesc', 'Check real-time status of your requests'),
      path: '/track-status',
    },
    {
      id: '_receipt',
      glyph: ic.receipt,
      title: t('home.sanitationReceipt', 'View Receipts'),
      description: t('home.sanitationReceiptDesc', 'View and print transaction receipts'),
      path: '/receipt?org=sanitation',
    },
  ];

  const getLocalizedName = (item) => {
    if (i18n.language === 'hi' && item.nameHi) return item.nameHi;
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
    if (!formData.ward) newErrors.ward = t('errors.required');
    if (!formData.address.trim()) newErrors.address = t('errors.required');
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

      let requestId;
      try {
        const result = await serviceAPI.submit({
          serviceType: 'sanitation',
          serviceCategory: selectedCategory,
          citizenName: formData.name,
          mobile: formData.mobile,
          email: formData.email,
          state: formData.state,
          city: formData.city,
          ward: formData.ward,
          address: formData.address,
          description: formData.description,
          preferredDate: formData.preferredDate,
          preferredTime: formData.preferredTime,
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
        serviceType: 'sanitation',
        serviceCategory: t(`sanitation.${selectedCategory}`),
        timestamp: getCurrentTimestamp(),
        status: 'submitted',
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
      <VK bg="color-mix(in oklab, var(--dept-waste) 5%, var(--surface-0))">
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
    <VK bg="color-mix(in oklab, var(--dept-waste) 5%, var(--surface-0))">
      {step === 1 ? (
        <>
          {/* Dept header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 40, marginBottom: 48 }}>
            <DD color="var(--dept-waste)" glyph={ic.trash} size={168} isz={92} />
            <div>
              <div className="label-tag" style={{ color: 'var(--dept-waste)', marginBottom: 14 }}>
                Sanitation Department
              </div>
              <h1 className="h2">{t('sanitation.title', 'Sanitation Department')}</h1>
              <p className="body-l" style={{ marginTop: 14, color: 'var(--ink-500)' }}>
                {t('sanitation.subtitle', 'Waste Pickup · Drainage · Sewage · Street Cleaning')}
              </p>
            </div>
          </div>

          {/* Service grid — 3 cols for kiosk */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 32 }}>
            {mainServices.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (s.path) {
                    navigate(s.path);
                  } else {
                    setSelectedCategory(s.id);
                    setStep(2);
                  }
                }}
                className="tile"
                style={{
                  minHeight: 260,
                  padding: 32,
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  gap: 20,
                  borderTop: '8px solid var(--dept-waste)',
                  touchAction: 'manipulation',
                }}
                aria-label={s.title}
              >
                <DD color="var(--dept-waste)" glyph={s.glyph} size={120} isz={64} />
                <div className="nm" style={{ fontSize: 26, lineHeight: 1.3 }}>{s.title}</div>
                <div className="sub" style={{ fontSize: 20, marginTop: 'auto' }}>{s.description}</div>
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn btn-quiet"
            style={{ alignSelf: 'center' }}
            onClick={() => navigate('/home')}
          >
            <I d={ic.back} size={24} /> {t('home.backToOrgs', 'Back to Organizations')}
          </button>
        </>
      ) : (
        /* Service Request Form */
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32, marginBottom: 40 }}>
            <DD color="var(--dept-waste)" glyph={ic.trash} size={128} isz={72} />
            <div>
              <div className="label-tag" style={{ color: 'var(--dept-waste)', marginBottom: 12 }}>
                Sanitation · New request
              </div>
              <h1 className="h2">{t(`sanitation.${selectedCategory}`)}</h1>
            </div>
          </div>

          <div className="card">
            <ApplicantBanner />
            <span className="badge b-info" style={{ marginBottom: 44 }}>
              Selected · {t(`sanitation.${selectedCategory}`)}
            </span>

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

            <div style={{ marginTop: 36 }}>
              <label className="flab">{t('form.email')}</label>
              <input className="field" type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} placeholder={t('form.enterEmail')} />
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

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 32, marginTop: 52,
                          paddingTop: 44, borderTop: '1.5px solid var(--line)' }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)}>
                <I d={ic.back} size={40} /> {t('app.back')}
              </button>
              <button className="btn btn-pri" onClick={handleSubmit}>
                {t('app.submit')}
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={showConfirmModal} onClose={() => setShowConfirmModal(false)} type="confirm" title={t('modal.confirmTitle')} message={t('modal.confirmMessage')} confirmText={t('app.confirm')} cancelText={t('app.cancel')} onConfirm={handleConfirmSubmit} onCancel={() => setShowConfirmModal(false)} />
    </VK>
  );
};

export default Sanitation;
