import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import {
  Header,
  Button,
  Card,
  Input,
  Select,
  TextArea,
  Modal,
  ApplicantBanner,
} from '../components';
import { VK } from '../components/kiosk';
import { LoadingScreen, SubmissionSteps } from '../components/loading';
import QRUpload from '../components/QRUpload';
import { states, cities, wards, serviceCategories } from '../utils/constants';
import { generateRequestId, getCurrentTimestamp } from '../utils/helpers';
import { addReceipt } from '../utils/receipts';
import { serviceAPI } from '../utils/apiService';
import { sleep } from '../utils/mockDelay';
import { getActiveApplicant, buildFormPrefill, clearActiveApplicant } from '../utils/citizenProfile';

/**
 * Electricity Services page
 */
const Electricity = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: category, 2: form
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isDeepLinkedCategory, setIsDeepLinkedCategory] = useState(false);
  const [searchParams] = useSearchParams();

  // Auto-select category from URL params
  useEffect(() => {
    const urlCategory = searchParams.get('category');
    if (urlCategory) {
      const validCategory = serviceCategories.electricity.find(c => c.id === urlCategory);
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
    meterNumber: '',
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

  const categories = serviceCategories.electricity;

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
    // Reset dependent fields
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
      navigate('/electricity-menu');
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

      // Submit to real backend
      let requestId;
      try {
        const result = await serviceAPI.submit({
          serviceType: 'electricity',
          serviceCategory: selectedCategory,
          citizenName: formData.name,
          mobile: formData.mobile,
          email: formData.email,
          consumerNumber: formData.consumerNumber,
          meterNumber: formData.meterNumber,
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
        serviceType: 'electricity',
        serviceCategory: t(`electricity.${selectedCategory}`),
        timestamp: getCurrentTimestamp(),
        status: 'submitted',
        sla: '15 working days',
      };

      // Store receipt data and navigate
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
      

      <div>
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-kiosk-2xl md:text-kiosk-3xl font-bold text-government-blue">
            {t('electricity.title')}
          </h1>
          <p className="text-kiosk-lg text-gray-600 mt-2">
            {t('electricity.subtitle')}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-government-blue text-white' : 'bg-gray-200 text-gray-500'}`}>
            1
          </div>
          <div className={`w-20 h-1 ${step >= 2 ? 'bg-government-blue' : 'bg-gray-200'}`} />
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-government-blue text-white' : 'bg-gray-200 text-gray-500'}`}>
            2
          </div>
        </div>

        {step === 1 ? (
          /* Step 1: Category Selection */
          <div className="bg-white rounded-kiosk-lg shadow-kiosk p-6 md:p-8">
            <h2 className="text-kiosk-xl font-bold text-gray-800 mb-6 text-center">
              {t('form.selectCategory')}
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.map((category) => (
                <Card
                  key={category.id}
                  title={t(category.key)}
                  selected={selectedCategory === category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  size="medium"
                  className="text-center"
                />
              ))}
            </div>

            <div className="mt-8 flex justify-between gap-4">
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
          /* Step 2: Request Form */
          <div className="bg-white rounded-kiosk-lg shadow-kiosk p-6 md:p-8">
            <ApplicantBanner />
            <div className="mb-6 p-4 bg-yellow-50 rounded-kiosk border border-yellow-200">
              <p className="text-kiosk-base font-semibold text-yellow-800">
                Selected: {t(`electricity.${selectedCategory}`)}
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
                />
                <Input
                  label={t('form.mobile')}
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => handleInputChange('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder={t('form.enterMobile')}
                  error={errors.mobile}
                  required
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

              {/* New Connection — additional required fields */}
              {selectedCategory === 'newConnection' && (
                <div className="p-4 bg-amber-50 rounded-kiosk border border-amber-200">
                  <h3 className="text-kiosk-base font-bold text-amber-800 mb-4">Connection & Load Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Select
                      label={t('electricity.premisesType')}
                      value={formData.premisesType || ''}
                      onChange={e => handleInputChange('premisesType', e.target.value)}
                      options={[
                        { value: 'residential', label: 'Residential' },
                        { value: 'commercial', label: 'Commercial' },
                        { value: 'industrial', label: 'Industrial' },
                        { value: 'agricultural', label: 'Agricultural' },
                      ]}
                      placeholder={t('electricity.selectPremisesType')}
                      required
                    />
                    <Select
                      label={t('electricity.connectionType')}
                      value={formData.connectionType || ''}
                      onChange={e => handleInputChange('connectionType', e.target.value)}
                      options={[
                        { value: 'single_phase', label: 'Single Phase (1φ)' },
                        { value: 'three_phase', label: 'Three Phase (3φ)' },
                        { value: 'ht', label: 'HT Connection (>100 kVA)' },
                      ]}
                      placeholder={t('electricity.selectConnectionType')}
                      required
                    />
                    <Input
                      label={t('electricity.proposedLoad')}
                      type="number"
                      value={formData.sanctionedLoad || ''}
                      onChange={e => handleInputChange('sanctionedLoad', e.target.value)}
                      placeholder="e.g. 5"
                      required
                    />
                    <Input
                      label={t('electricity.plotArea')}
                      type="number"
                      value={formData.plotArea || ''}
                      onChange={e => handleInputChange('plotArea', e.target.value)}
                      placeholder="e.g. 1200"
                    />
                  </div>
                </div>
              )}

              {/* Meter Replacement / Shifting — TAT + severity */}
              {(selectedCategory === 'meterIssue' || selectedCategory === 'meterShifting') && (
                <div className="p-4 bg-purple-50 rounded-kiosk border border-purple-200">
                  <h3 className="text-kiosk-base font-bold text-purple-800 mb-4">Meter Service Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label={t('electricity.meterNumber')}
                      value={formData.meterNumber || ''}
                      onChange={(e) => handleInputChange('meterNumber', e.target.value)}
                      placeholder={t('electricity.enterMeterNumber')}
                    />
                    <Select
                      label={t('electricity.issueType')}
                      value={formData.meterIssueType || ''}
                      onChange={e => handleInputChange('meterIssueType', e.target.value)}
                      options={[
                        { value: 'damaged', label: 'Damaged / Broken' },
                        { value: 'malfunctioning', label: 'Malfunctioning / Wrong Reads' },
                        { value: 'missing', label: 'Missing / Stolen' },
                        { value: 'burnt', label: 'Burnt / Fire Damage' },
                        { value: 'shifting', label: 'Shifting Request' },
                      ]}
                      placeholder={t('electricity.selectIssueType')}
                      required
                    />
                    <Select
                      label={t('electricity.priority')}
                      value={formData.priority || ''}
                      onChange={e => handleInputChange('priority', e.target.value)}
                      options={[
                        { value: 'emergency', label: ' Emergency (24h TAT)' },
                        { value: 'urgent', label: ' Urgent (3 days TAT)' },
                        { value: 'normal', label: ' Normal (7–10 days TAT)' },
                      ]}
                      placeholder={t('electricity.selectPriority')}
                      required
                    />
                    {selectedCategory === 'meterShifting' && (
                      <Input
                        label={t('electricity.newMeterLocation')}
                        value={formData.newMeterLocation || ''}
                        onChange={e => handleInputChange('newMeterLocation', e.target.value)}
                        placeholder="e.g. Main entrance, ground floor"
                      />
                    )}
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
                />
                <Select
                  label={t('form.ward')}
                  value={formData.ward}
                  onChange={(e) => handleInputChange('ward', e.target.value)}
                  placeholder={t('form.selectWard')}
                  options={availableWards.map(w => ({ value: w.id, label: w.name }))}
                  error={errors.ward}
                  required
                  disabled={!formData.city}
                />
              </div>

              <Input
                label={t('form.address')}
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder={t('form.enterAddress')}
                error={errors.address}
                required
              />

              <TextArea
                label={t('form.description')}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder={t('form.enterDescription')}
                error={errors.description}
                required
                rows={4}
                maxLength={500}
              />

              <QRUpload
                label={t('form.uploadDocuments')}
                onUploadComplete={(uploadedFiles) => setFiles(uploadedFiles)}
                maxFiles={5}
              />

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between pt-6 border-t">
                <Button
                  variant="secondary"
                  onClick={handleFormBack}
                  size="large"
                >
                  {t('app.back')}
                </Button>
                <Button
                  onClick={handleSubmit}
                  size="large"
                >
                  {t('app.submit')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
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

export default Electricity;
