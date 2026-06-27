import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ArrowLeft, Droplets, Search, FileText, UserCog } from 'lucide-react';
import {
  Button,
  Input,
  Select,
  TextArea,
  Modal,
  DepartmentHeader,
  SectionTitle,
  ServiceCard,
  UtilityCard,
  ResponsiveGrid,
  ActionButton,
  ApplicantBanner
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
 * Water Supply Services page
 */
const Water = () => {
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
    connectionId: '',
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

  const categories = serviceCategories.water;

  const theme = {
    gradient: 'from-sky-500 via-blue-500 to-cyan-500',
    softGradient: 'from-sky-50 via-sky-100 to-blue-100',
    accentClass: 'text-sky-600',
  };

  const utilityServices = [
    {
      id: 'profile',
      title: 'Edit Credentials / Profile',
      description: 'Update your consumer information',
      path: '/consumer-profile?org=water',
      Icon: UserCog,
    },
    {
      id: 'track',
      title: 'Track Request / Complaint',
      description: 'Check real-time status of your requests',
      path: '/track-status',
      Icon: Search,
    },
    {
      id: 'receipt',
      title: 'View Receipts',
      description: 'View and print transaction receipts',
      path: '/receipt?org=water',
      Icon: FileText,
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
          serviceType: 'water',
          serviceCategory: selectedCategory,
          citizenName: formData.name,
          mobile: formData.mobile,
          email: formData.email,
          connectionId: formData.connectionId,
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
        serviceType: 'water',
        serviceCategory: t(`water.${selectedCategory}`),
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
      <main className="max-w-6xl mx-auto px-4 py-8">
        <DepartmentHeader
          title={t('water.title')}
          subtitle={t('water.subtitle')}
          icon={Droplets}
          iconProps={{ className: 'w-8 h-8 text-white' }}
          gradient="from-sky-500 to-blue-600"
        />

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
          <>
            <SectionTitle title={t('form.selectCategory')} className="mb-4" />
            <ResponsiveGrid variant="services" className="mb-8">
              {categories.map((category) => (
                <ServiceCard
                  key={category.id}
                  title={t(category.key)}
                  icon={Droplets}
                  iconProps={{ className: 'w-7 h-7 text-white' }}
                  gradient={theme.gradient}
                  selected={selectedCategory === category.id}
                  badge={selectedCategory === category.id ? t('app.selected', 'Selected') : undefined}
                  onClick={() => setSelectedCategory(category.id)}
                  accessibilityLabel={t(category.key)}
                />
              ))}
            </ResponsiveGrid>

            <SectionTitle
              title={t('home.utilitiesHistory', 'Utilities & History')}
              icon={UserCog}
              accentClass={theme.accentClass}
              className="mb-4"
            />
            <ResponsiveGrid variant="utilities" className="mb-8">
              {utilityServices.map((service) => (
                <UtilityCard
                  key={service.id}
                  title={service.title}
                  description={service.description}
                  icon={service.Icon}
                  iconProps={{ className: 'w-6 h-6 text-sky-700' }}
                  gradient={theme.softGradient}
                  onClick={() => navigate(service.path)}
                  accessibilityLabel={service.title}
                />
              ))}
            </ResponsiveGrid>

            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <ActionButton
                variant="outline"
                onClick={() => navigate('/home')}
                icon={ArrowLeft}
              >
                {t('home.backToOrgs', 'Back to Home')}
              </ActionButton>
              <ActionButton
                onClick={() => setStep(2)}
                disabled={!selectedCategory}
                icon={ArrowRight}
                iconPosition="right"
                variant="primary"
              >
                {t('app.next')}
              </ActionButton>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-kiosk-lg shadow-kiosk p-6 md:p-8">
            <ApplicantBanner />
            <div className="mb-6 p-4 bg-blue-50 rounded-kiosk border border-blue-200">
              <p className="text-kiosk-base font-semibold text-blue-800">
                Selected: {t(`water.${selectedCategory}`)}
              </p>
            </div>

            <div className="space-y-6">
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
                  label={t('water.connectionId')}
                  value={formData.connectionId}
                  onChange={(e) => handleInputChange('connectionId', e.target.value)}
                  placeholder={t('water.enterConnectionId')}
                />
              </div>

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

              <div className="flex flex-col sm:flex-row gap-4 justify-between pt-6 border-t">
                <Button
                  variant="secondary"
                  onClick={() => setStep(1)}
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
      </main>

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

export default Water;
