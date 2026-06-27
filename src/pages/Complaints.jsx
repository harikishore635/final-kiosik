import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Camera, Upload, MapPin, AlertTriangle, Lightbulb, Droplet, Shield, Wind, Construction, HelpCircle } from 'lucide-react';
import {
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
import { states, cities, wards, complaintTypes } from '../utils/constants';
import { generateComplaintId, getCurrentTimestamp } from '../utils/helpers';
import { complaintAPI } from '../utils/apiService';
import { addReceipt } from '../utils/receipts';
import { sleep } from '../utils/mockDelay';
import { getActiveApplicant, buildFormPrefill, clearActiveApplicant } from '../utils/citizenProfile';

/**
 * Complaints Registration page
 */
const Complaints = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState('');
  const applicant = getActiveApplicant();
  const prefill = buildFormPrefill(applicant);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    state: '',
    city: '',
    ward: '',
    ...prefill,
    location: '',
    description: '',
  });
  const [photos, setPhotos] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [submissionStep, setSubmissionStep] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [notice, setNotice] = useState('');
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);

  const complaintIcons = {
    roadDamage: Construction,
    streetLight: Lightbulb,
    waterLogging: Droplet,
    encroachment: AlertTriangle,
    pollution: Wind,
    publicSafety: Shield,
    other: HelpCircle,
  };

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

  const handlePhotoCapture = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + photos.length > 3) {
      setNotice(t('complaints.maxPhotos'));
      return;
    }

    const newPhotos = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const removePhoto = (index) => {
    const newPhotos = [...photos];
    URL.revokeObjectURL(newPhotos[index].preview);
    newPhotos.splice(index, 1);
    setPhotos(newPhotos);
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      setGeoLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setFormData(prev => ({
            ...prev,
            location: `Lat: ${latitude.toFixed(6)}, Long: ${longitude.toFixed(6)}`
          }));
          setUseCurrentLocation(true);
          setGeoLoading(false);
        },
        (error) => {
          console.error('Location error:', error);
          setGeoLoading(false);
          setNotice(t('complaints.locationFailed'));
        }
      );
    } else {
      setNotice(t('complaints.geoUnsupported'));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = t('errors.required');
    if (!formData.mobile.trim()) newErrors.mobile = t('errors.required');
    if (!formData.state) newErrors.state = t('errors.required');
    if (!formData.city) newErrors.city = t('errors.required');
    if (!formData.location.trim()) newErrors.location = t('errors.required');
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

      let complaintId;
      try {
        const result = await complaintAPI.submit({
          complaintType: selectedType,
          citizenName: formData.name,
          mobile: formData.mobile,
          email: formData.email,
          state: formData.state,
          city: formData.city,
          ward: formData.ward,
          location: formData.location,
          description: formData.description,
          aadhaarUid: applicant?.uid || sessionStorage.getItem('aadhaarUid'),
        });
        complaintId = result.complaintId;
      } catch {
        complaintId = generateComplaintId();
      }

      await sleep(700);
      setSubmissionStep(3);

      const receiptData = {
        requestId: complaintId,
        citizenName: formData.name,
        mobile: formData.mobile,
        serviceType: 'complaint',
        serviceCategory: t(`complaints.${selectedType}`),
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
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-kiosk-2xl md:text-kiosk-3xl font-bold text-government-blue">
            {t('complaints.title')}
          </h1>
          <p className="text-kiosk-lg text-gray-600 mt-2">
            {t('complaints.subtitle')}
          </p>
          {/* AI Smart Classification Badge */}
          <div className="mt-3 inline-flex items-center space-x-2 bg-purple-50 px-4 py-2 rounded-full">
            <span className="text-sm text-purple-700 font-medium">
               AI-Powered Auto-Classification & Smart Routing
            </span>
          </div>
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
          <div className="bg-white rounded-kiosk-lg shadow-kiosk p-6 md:p-8">
            <h2 className="text-kiosk-xl font-bold text-gray-800 mb-6 text-center">
              {t('complaints.selectType')}
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {complaintTypes.map((type) => {
                const IconComponent = complaintIcons[type.id] || HelpCircle;
                return (
                  <Card
                    key={type.id}
                    title={t(type.key)}
                    icon={IconComponent}
                    selected={selectedType === type.id}
                    onClick={() => setSelectedType(type.id)}
                    size="medium"
                    className="text-center"
                  />
                );
              })}
            </div>

            <div className="mt-8 flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={!selectedType}
                size="xlarge"
              >
                {t('app.next')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-kiosk-lg shadow-kiosk p-6 md:p-8">
            <ApplicantBanner />
            <div className="mb-6 p-4 bg-purple-50 rounded-kiosk border border-purple-200">
              <p className="text-kiosk-base font-semibold text-purple-800">
                Complaint Type: {t(`complaints.${selectedType}`)}
              </p>
              <p className="text-xs text-purple-600 mt-1">
                 AI will auto-route this to the relevant municipal department
              </p>
            </div>

            {/* AI Duplicate Detection Notice */}
            <div className="mb-6 p-3 bg-blue-50 rounded-kiosk border border-blue-200">
              <div className="flex items-start space-x-2">
                <span className="text-lg"></span>
                <div>
                  <p className="text-xs font-semibold text-blue-800">Smart Duplicate Detection</p>
                  <p className="text-xs text-blue-600">
                    Our AI checks for similar complaints in your area to avoid redundancy and prioritize resolution.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Personal Info */}
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

              {/* Location Selection */}
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
                  disabled={!formData.city}
                />
              </div>

              {/* Location Input */}
              <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      label={t('complaints.location')}
                      value={formData.location}
                      onChange={(e) => {
                        handleInputChange('location', e.target.value);
                        setUseCurrentLocation(false);
                      }}
                      placeholder={t('complaints.enterLocation')}
                      error={errors.location}
                      required
                      icon={MapPin}
                    />
                  </div>
                  <div className="md:pt-9">
                    <Button
                      variant="secondary"
                      onClick={handleGetLocation}
                      size="large"
                      icon={MapPin}
                      disabled={geoLoading}
                    >
                      {geoLoading ? '…' : t('complaints.currentLocation')}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Description */}
              <TextArea
                label={t('form.description')}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder={t('form.enterDescription')}
                error={errors.description}
                required
                rows={4}
                maxLength={1000}
              />

              {/* Photo Upload */}
              <div className="space-y-4">
                <label className="block text-kiosk-base font-semibold text-gray-700">
                  {t('complaints.uploadPhoto')}
                </label>

                <div className="flex flex-wrap gap-4">
                  {/* Camera Button */}
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-kiosk flex flex-col items-center justify-center text-gray-500 hover:border-government-blue hover:text-government-blue transition-colors"
                  >
                    <Camera className="w-8 h-8 mb-2" />
                    <span className="text-sm">{t('complaints.takePhoto')}</span>
                  </button>
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoCapture}
                    className="hidden"
                  />

                  {/* File Upload Button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-kiosk flex flex-col items-center justify-center text-gray-500 hover:border-government-blue hover:text-government-blue transition-colors"
                  >
                    <Upload className="w-8 h-8 mb-2" />
                    <span className="text-sm">{t('complaints.chooseFile')}</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoCapture}
                    className="hidden"
                  />

                  {/* Photo Previews */}
                  {photos.map((photo, index) => (
                    <div key={index} className="relative w-32 h-32">
                      <img
                        src={photo.preview}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover rounded-kiosk"
                      />
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-kiosk-sm text-gray-500">
                  Max 3 photos • Supported: JPG, PNG
                </p>
              </div>

              {/* Actions */}
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

      <Modal
        isOpen={!!notice}
        onClose={() => setNotice('')}
        type="warning"
        title={t('complaints.noticeTitle')}
        message={notice}
        confirmText={t('app.confirm')}
        onConfirm={() => setNotice('')}
      />
    </VK>
  );
};

export default Complaints;
