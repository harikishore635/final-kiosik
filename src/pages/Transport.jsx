import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Modal, Select, ApplicantBanner } from '../components';
import { VK, DD, I, ic } from '../components/kiosk';
import { LoadingScreen, SubmissionSteps } from '../components/loading';
import UpiPaymentScreen from '../components/payment/UpiPaymentScreen';
import { useToast } from '../hooks/useToast';
import QRUpload from '../components/QRUpload';
import { states, cities, wards } from '../utils/constants';
import { generateRequestId, getCurrentTimestamp } from '../utils/helpers';
import { serviceAPI, transportAPI } from '../utils/apiService';
import { addReceipt } from '../utils/receipts';
import { sleep } from '../utils/mockDelay';
import { getActiveApplicant, buildFormPrefill, clearActiveApplicant } from '../utils/citizenProfile';

// Mock station/route data
const metroStations = [
  'Central Station', 'Park Street', 'City Hall', 'Tech Park', 'Airport',
  'University', 'Marina Beach', 'Fort', 'Nehru Place', 'Gandhi Nagar',
  'Hospital Junction', 'Market Square', 'Stadium', 'Bus Terminal', 'Railway Junction'
];

const busRoutes = [
  { id: 'R1', name: 'Route 1 - Central ↔ Airport', fare: 45 },
  { id: 'R2', name: 'Route 2 - University ↔ Tech Park', fare: 30 },
  { id: 'R3', name: 'Route 3 - Marina ↔ Stadium', fare: 25 },
  { id: 'R4', name: 'Route 4 - Railway Station ↔ Bus Terminal', fare: 35 },
  { id: 'R5', name: 'Route 5 - Hospital ↔ Market Square', fare: 20 },
  { id: 'R6', name: 'Route 6 - City Express - All Stops', fare: 50 },
];

const trainStations = [
  'Central Suburban', 'Dadar', 'Andheri', 'Borivali', 'Thane',
  'Kalyan', 'Panvel', 'Vashi', 'Churchgate', 'Grant Road'
];

const busPassTypes = [
  { id: 'monthly', name: 'Monthly Pass', price: 1200 },
  { id: 'quarterly', name: 'Quarterly Pass', price: 3200 },
  { id: 'student_monthly', name: 'Student Monthly', price: 600 },
  { id: 'senior_monthly', name: 'Senior Citizen Monthly', price: 800 },
];

const Transport = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();

  const [view, setView] = useState('categories'); // 'categories' | 'booking' | 'payment' | 'complaint'
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('');

  const applicant = getActiveApplicant();
  const prefill = buildFormPrefill(applicant);

  const [bookingData, setBookingData] = useState({
    fromStation: '',
    toStation: '',
    passengers: '1',
    travelDate: new Date().toISOString().split('T')[0],
    travelTime: '',
    busRoute: '',
    trainClass: 'second',
    passType: '',
    passengerName: prefill.name || '',
    passengerMobile: prefill.mobile || '',
  });

  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    vehicleNumber: '',
    licenseNumber: '',
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
  const [bookingResult, setBookingResult] = useState(null);

  const mainServices = [
    {
      id: 'metroTicket',
      glyph: ic.bus,
      title: t('transport.metroTicket', 'Metro Ticket'),
      description: t('home.transportMetroDesc', 'Book metro rail tickets instantly'),
      booking: true,
    },
    {
      id: 'busTicket',
      glyph: ic.bus,
      title: t('transport.busTicket', 'Bus Ticket'),
      description: t('home.transportBusDesc', 'Reserve city bus tickets for your route'),
      booking: true,
    },
    {
      id: 'busPass',
      glyph: ic.card,
      title: t('transport.busPass', 'Bus Pass'),
      description: t('home.transportPassDesc', 'Purchase monthly or quarterly bus passes'),
      booking: true,
    },
    {
      id: 'vehicleComplaint',
      glyph: ic.chat,
      title: t('home.transportComplaint', 'Report an Issue'),
      description: t('home.transportComplaintDesc', 'Report road, vehicle or transport complaints'),
      booking: false,
    },
    {
      id: '_track',
      glyph: ic.track,
      title: t('home.transportTrack', 'Track Request'),
      description: t('home.transportTrackDesc', 'Check real-time status of your requests'),
      path: '/track-status',
    },
    {
      id: '_receipt',
      glyph: ic.receipt,
      title: t('home.transportReceipt', 'View Receipts'),
      description: t('home.transportReceiptDesc', 'View and print transaction receipts'),
      path: '/receipt?org=transport',
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

  const handleBookingChange = (field, value) => {
    setBookingData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const calculateFare = () => {
    const passengers = parseInt(bookingData.passengers) || 1;
    if (selectedCategory === 'metroTicket') return 30 * passengers;
    if (selectedCategory === 'busTicket') {
      const route = busRoutes.find(r => r.id === bookingData.busRoute);
      return (route?.fare || 30) * passengers;
    }
    if (selectedCategory === 'suburbanTrain') {
      const basePrice = bookingData.trainClass === 'first' ? 80 : 25;
      return basePrice * passengers;
    }
    if (selectedCategory === 'busPass') {
      const pass = busPassTypes.find(p => p.id === bookingData.passType);
      return pass?.price || 0;
    }
    return 0;
  };

  const validateBooking = () => {
    const newErrors = {};
    if (!bookingData.passengerName.trim()) newErrors.passengerName = 'Required';
    if (!bookingData.passengerMobile.trim()) newErrors.passengerMobile = 'Required';
    if (selectedCategory === 'metroTicket' || selectedCategory === 'suburbanTrain') {
      if (!bookingData.fromStation) newErrors.fromStation = 'Select station';
      if (!bookingData.toStation) newErrors.toStation = 'Select station';
      if (bookingData.fromStation && bookingData.fromStation === bookingData.toStation) {
        newErrors.toStation = 'Must be different';
      }
    }
    if (selectedCategory === 'busTicket') {
      if (!bookingData.busRoute) newErrors.busRoute = 'Select route';
    }
    if (selectedCategory === 'busPass') {
      if (!bookingData.passType) newErrors.passType = 'Select pass type';
    }
    if (!bookingData.travelDate) newErrors.travelDate = 'Select date';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateComplaintForm = () => {
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

  // Step 1: validate journey/pass details, then go to the payment screen.
  // No ticket is minted until payment is confirmed (handleBookTicket).
  const handleProceedToPayment = () => {
    if (!validateBooking()) return;
    setView('payment');
  };

  const handleBookTicket = async () => {
    if (!validateBooking()) return;
    setLoading(true);
    setSubmissionStep(0);
    try {
      await sleep(900);
      setSubmissionStep(1);
      await sleep(800);
      setSubmissionStep(2);

      const fare = calculateFare();
      let ticketId;
      try {
        const apiResult = await transportAPI.bookTicket({
          ticketType: selectedCategory,
          fromStation: bookingData.fromStation,
          toStation: bookingData.toStation,
          passengers: parseInt(bookingData.passengers) || 1,
          travelDate: bookingData.travelDate,
          travelTime: bookingData.travelTime,
          busRoute: bookingData.busRoute,
          trainClass: bookingData.trainClass,
          passType: bookingData.passType,
          passengerName: bookingData.passengerName,
          passengerMobile: bookingData.passengerMobile,
        });
        ticketId = apiResult.ticketId;
      } catch {
        ticketId = `TKT-${generateRequestId()}`;
      }

      await sleep(700);
      setSubmissionStep(3);

      const result = {
        ticketId,
        type: selectedCategory,
        from: bookingData.fromStation || '-',
        to: bookingData.toStation || '-',
        route: bookingData.busRoute ? busRoutes.find(r => r.id === bookingData.busRoute)?.name : '-',
        passType: bookingData.passType ? busPassTypes.find(p => p.id === bookingData.passType)?.name : '-',
        passengers: bookingData.passengers,
        date: bookingData.travelDate,
        fare,
        passengerName: bookingData.passengerName,
        status: 'confirmed',
        timestamp: getCurrentTimestamp(),
      };
      addReceipt({
        requestId: ticketId,
        citizenName: bookingData.passengerName,
        ownerName: bookingData.passengerName,
        mobile: bookingData.passengerMobile,
        ownerMobile: bookingData.passengerMobile,
        ownerAadhaar: applicant?.uid || sessionStorage.getItem('aadhaarUid') || '',
        serviceType: 'transport',
        serviceCategory: `Ticket Booking - ${selectedCategory}`,
        timestamp: getCurrentTimestamp(),
        status: 'confirmed',
        fare: `₹${fare}`,
      });
      clearActiveApplicant(); // next flow starts as self
      // Payment confirmed -> ticket issued -> go to receipt and auto-print it.
      navigate(`/receipt?org=transport&id=${encodeURIComponent(ticketId)}&autoprint=1`);
    } catch (error) {
      console.error('Booking error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplaintSubmit = () => {
    if (validateComplaintForm()) setShowConfirmModal(true);
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
          serviceType: 'transport',
          serviceCategory: selectedCategory,
          citizenName: formData.name,
          mobile: formData.mobile,
          email: formData.email,
          vehicleNumber: formData.vehicleNumber,
          licenseNumber: formData.licenseNumber,
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
        serviceType: 'transport',
        serviceCategory: t(`transport.${selectedCategory}`),
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
    const isBooking = selectedCategory && mainServices.find(s => s.id === selectedCategory)?.booking;
    return (
      <VK bg="color-mix(in oklab, var(--dept-trans) 5%, var(--surface-0))">
        <LoadingScreen
          heading={isBooking ? t('transport.bookingInProgress', 'Booking your ticket') : t('loading.submittingRequest', 'Submitting your request')}
          variant="signal"
          size={62}
          extra={(
            <SubmissionSteps
              step={submissionStep}
              labels={isBooking ? [
                t('loading.stepSaving', 'Saving your details'),
                t('transport.stepTicket', 'Generating ticket'),
                t('loading.stepConfirmation', 'Sending confirmation'),
              ] : [
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

  if (bookingResult) {
    return (
      <VK bg="color-mix(in oklab, var(--dept-trans) 5%, var(--surface-0))">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32, marginBottom: 40 }}>
            <DD color="var(--dept-trans)" glyph={ic.bus} size={128} isz={72} />
            <h1 className="h2">{t('transport.title', 'Transport Department')}</h1>
          </div>

          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ width: 96, height: 96, borderRadius: '50%', margin: '0 auto 24px', background: 'color-mix(in oklab, var(--ok) 16%, white)', display: 'grid', placeItems: 'center' }}>
              <I d={ic.check} size={48} style={{ color: 'var(--ok)' }} />
            </div>
            <h2 className="h3" style={{ color: 'var(--ok)', marginBottom: 8 }}>{t('transport.bookingConfirmed')}</h2>
            <p className="body-l" style={{ color: 'var(--ink-500)', marginBottom: 32 }}>{t('transport.bookingSuccessMsg')}</p>

            <div style={{ textAlign: 'left', marginBottom: 32 }}>
              <div className="receipt-row"><span className="k">{t('transport.ticketId')}</span><span className="v">{bookingResult.ticketId}</span></div>
              <div className="receipt-row"><span className="k">{t('transport.passenger')}</span><span className="v">{bookingResult.passengerName}</span></div>
              {bookingResult.from !== '-' && (
                <div className="receipt-row"><span className="k">{t('transport.fromTo')}</span><span className="v">{bookingResult.from} → {bookingResult.to}</span></div>
              )}
              {bookingResult.route !== '-' && (
                <div className="receipt-row"><span className="k">{t('transport.route')}</span><span className="v">{bookingResult.route}</span></div>
              )}
              {bookingResult.passType !== '-' && (
                <div className="receipt-row"><span className="k">{t('transport.passType')}</span><span className="v">{bookingResult.passType}</span></div>
              )}
              <div className="receipt-row"><span className="k">{t('transport.date')}</span><span className="v">{bookingResult.date}</span></div>
              <div className="receipt-row"><span className="k">{t('transport.passengers')}</span><span className="v">{bookingResult.passengers}</span></div>
              <div className="receipt-row" style={{ borderTop: '2px solid var(--line)', marginTop: 12, paddingTop: 20 }}>
                <span className="k" style={{ fontWeight: 700 }}>{t('transport.totalFare')}</span>
                <span className="v" style={{ color: 'var(--ok)', fontSize: 28 }}>₹{bookingResult.fare}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
              <button className="btn btn-pri" onClick={() => navigate(`/receipt?org=transport&id=${encodeURIComponent(bookingResult.ticketId)}`)}>
                {t('transport.viewReceipt')}
              </button>
              <button className="btn btn-ghost" onClick={() => navigate('/home')}>{t('transport.goHome')}</button>
            </div>
          </div>
        </div>
      </VK>
    );
  }

  if (view === 'payment') {
    return (
      <UpiPaymentScreen
        amount={calculateFare()}
        note={`Transport ${selectedCategory}`}
        title={selectedCategory === 'busPass' ? t('transport.purchasePass', 'Purchase Pass') : t('transport.payForTicket', 'Pay for Ticket')}
        onSuccess={handleBookTicket}
        onCancel={() => { setView('booking'); toast.info(t('payment.cancelledMsg', 'Payment cancelled — no ticket was issued')); }}
      />
    );
  }

  return (
    <VK bg="color-mix(in oklab, var(--dept-trans) 5%, var(--surface-0))">
      {/* CATEGORY SELECTION */}
      {view === 'categories' && (
        <>
          {/* Dept header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 40, marginBottom: 48 }}>
            <DD color="var(--dept-trans)" glyph={ic.bus} size={168} isz={92} />
            <div>
              <div className="label-tag" style={{ color: 'var(--dept-trans)', marginBottom: 14 }}>
                ASTC · Transport
              </div>
              <h1 className="h2">{t('transport.title', 'Transport Department')}</h1>
              <p className="body-l" style={{ marginTop: 14, color: 'var(--ink-500)' }}>
                {t('transport.subtitle', 'Bus routes · Tickets · Passes · Road issues')}
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
                  } else if (s.booking) {
                    setSelectedCategory(s.id);
                    setView('booking');
                    setStep(1);
                  } else {
                    setSelectedCategory(s.id);
                    setView('complaint');
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
                  borderTop: '8px solid var(--dept-trans)',
                  touchAction: 'manipulation',
                }}
                aria-label={s.title}
              >
                <DD color="var(--dept-trans)" glyph={s.glyph} size={120} isz={64} />
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
      )}

      {/* BOOKING FORM */}
      {view === 'booking' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32, marginBottom: 40 }}>
            <DD color="var(--dept-trans)" glyph={ic.bus} size={128} isz={72} />
            <h1 className="h2">{t('transport.title', 'Transport Department')}</h1>
          </div>

          <div className="card">
            <ApplicantBanner />
            <span className="badge b-info" style={{ marginBottom: 36 }}>
              {t('transport.bookingLabel')} · {t(`transport.${selectedCategory}`)}
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '36px 40px' }}>
              <div>
                <label className="flab">{t('transport.passengerName')} *</label>
                <input className="field" value={bookingData.passengerName} onChange={(e) => handleBookingChange('passengerName', e.target.value)} required />
                {errors.passengerName && <div className="meta" style={{ color: 'var(--err)' }}>{errors.passengerName}</div>}
              </div>
              <div>
                <label className="flab">{t('form.mobile')} *</label>
                <input className="field" value={bookingData.passengerMobile} onChange={(e) => handleBookingChange('passengerMobile', e.target.value)} required />
                {errors.passengerMobile && <div className="meta" style={{ color: 'var(--err)' }}>{errors.passengerMobile}</div>}
              </div>
            </div>

            {selectedCategory === 'metroTicket' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '36px 40px', marginTop: 36 }}>
                  <div>
                    <label className="flab">{t('transport.fromStation')} *</label>
                    <Select
                      value={bookingData.fromStation}
                      onChange={(e) => handleBookingChange('fromStation', e.target.value)}
                      placeholder={t('transport.selectDeparture')}
                      options={metroStations.map(s => ({ value: s, label: s }))}
                      required
                    />
                    {errors.fromStation && <div className="meta" style={{ color: 'var(--err)' }}>{errors.fromStation}</div>}
                  </div>
                  <div>
                    <label className="flab">{t('transport.toStation')} *</label>
                    <Select
                      value={bookingData.toStation}
                      onChange={(e) => handleBookingChange('toStation', e.target.value)}
                      placeholder={t('transport.selectArrival')}
                      options={metroStations.filter(s => s !== bookingData.fromStation).map(s => ({ value: s, label: s }))}
                      required
                    />
                    {errors.toStation && <div className="meta" style={{ color: 'var(--err)' }}>{errors.toStation}</div>}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 40, marginTop: 36 }}>
                  <div>
                    <label className="flab">{t('transport.travelDate')} *</label>
                    <input className="field" type="date" value={bookingData.travelDate} onChange={(e) => handleBookingChange('travelDate', e.target.value)} required />
                    {errors.travelDate && <div className="meta" style={{ color: 'var(--err)' }}>{errors.travelDate}</div>}
                  </div>
                  <div>
                    <label className="flab">{t('transport.numberOfPassengers')}</label>
                    <Select
                      value={bookingData.passengers}
                      onChange={(e) => handleBookingChange('passengers', e.target.value)}
                      options={[1, 2, 3, 4, 5, 6].map(n => ({ value: String(n), label: t('transport.passengerCount', { count: n }) }))}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <div className="card" style={{ width: '100%', textAlign: 'center', padding: 16, background: 'color-mix(in oklab, var(--ok) 10%, white)' }}>
                      <div className="meta" style={{ color: 'var(--ok)', fontWeight: 700 }}>{t('transport.estimatedFare')}</div>
                      <div className="h3" style={{ color: 'var(--ok)' }}>₹{calculateFare()}</div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {selectedCategory === 'busTicket' && (
              <>
                <div style={{ marginTop: 36 }}>
                  <label className="flab">{t('transport.selectBusRoute')} *</label>
                  <Select
                    value={bookingData.busRoute}
                    onChange={(e) => handleBookingChange('busRoute', e.target.value)}
                    placeholder={t('transport.chooseRoute')}
                    options={busRoutes.map(r => ({ value: r.id, label: `${r.name} — ₹${r.fare}` }))}
                    required
                  />
                  {errors.busRoute && <div className="meta" style={{ color: 'var(--err)' }}>{errors.busRoute}</div>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 40, marginTop: 36 }}>
                  <div>
                    <label className="flab">{t('transport.travelDate')} *</label>
                    <input className="field" type="date" value={bookingData.travelDate} onChange={(e) => handleBookingChange('travelDate', e.target.value)} required />
                    {errors.travelDate && <div className="meta" style={{ color: 'var(--err)' }}>{errors.travelDate}</div>}
                  </div>
                  <div>
                    <label className="flab">{t('transport.passengers')}</label>
                    <Select
                      value={bookingData.passengers}
                      onChange={(e) => handleBookingChange('passengers', e.target.value)}
                      options={[1, 2, 3, 4, 5, 6].map(n => ({ value: String(n), label: t('transport.passengerCount', { count: n }) }))}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <div className="card" style={{ width: '100%', textAlign: 'center', padding: 16, background: 'color-mix(in oklab, var(--ok) 10%, white)' }}>
                      <div className="meta" style={{ color: 'var(--ok)', fontWeight: 700 }}>{t('transport.estimatedFare')}</div>
                      <div className="h3" style={{ color: 'var(--ok)' }}>₹{calculateFare()}</div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {selectedCategory === 'busPass' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 36 }}>
                  {busPassTypes.map(pass => (
                    <button
                      key={pass.id}
                      type="button"
                      onClick={() => handleBookingChange('passType', pass.id)}
                      className={`chip${bookingData.passType === pass.id ? ' act' : ''}`}
                      style={{ flexDirection: 'column', height: 'auto', padding: 16, gap: 8 }}
                    >
                      <I d={ic.card} size={32} />
                      <div style={{ fontWeight: 700 }}>{pass.name}</div>
                      <div className="meta">₹{pass.price}</div>
                    </button>
                  ))}
                </div>
                {errors.passType && <div className="meta" style={{ color: 'var(--err)' }}>{errors.passType}</div>}
                <div style={{ marginTop: 36 }}>
                  <label className="flab">{t('transport.startDate')} *</label>
                  <input className="field" type="date" value={bookingData.travelDate} onChange={(e) => handleBookingChange('travelDate', e.target.value)} required />
                  {errors.travelDate && <div className="meta" style={{ color: 'var(--err)' }}>{errors.travelDate}</div>}
                </div>
                {bookingData.passType && (
                  <div className="card" style={{ textAlign: 'center', marginTop: 24, background: 'color-mix(in oklab, var(--ok) 10%, white)' }}>
                    <div className="meta" style={{ color: 'var(--ok)', fontWeight: 700 }}>{t('transport.passCost')}</div>
                    <div className="h3" style={{ color: 'var(--ok)' }}>₹{calculateFare()}</div>
                  </div>
                )}
              </>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 32, marginTop: 52, paddingTop: 44, borderTop: '1.5px solid var(--line)' }}>
              <button className="btn btn-ghost" onClick={() => { setView('categories'); setErrors({}); }}>{t('app.back')}</button>
              <button className="btn btn-pri btn-xl" onClick={handleProceedToPayment}>
                {t('transport.proceedToPayment', 'Proceed to Payment')} — ₹{calculateFare()}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLAINT / REQUEST FORM */}
      {view === 'complaint' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32, marginBottom: 40 }}>
            <DD color="var(--dept-trans)" glyph={ic.bus} size={128} isz={72} />
            <h1 className="h2">{t('transport.title', 'Transport Department')}</h1>
          </div>

          <div className="card">
            <ApplicantBanner />
            <span className="badge b-warn" style={{ marginBottom: 36 }}>
              {t('transport.reportingLabel')} · {t(`transport.${selectedCategory}`)}
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '36px 40px' }}>
              <div>
                <label className="flab">{t('form.name')} *</label>
                <input className="field" value={formData.name} onChange={(e) => handleInputChange('name', e.target.value)} placeholder={t('form.enterName')} required />
                {errors.name && <div className="meta" style={{ color: 'var(--err)' }}>{errors.name}</div>}
              </div>
              <div>
                <label className="flab">{t('form.mobile')} *</label>
                <input className="field" type="tel" value={formData.mobile} onChange={(e) => handleInputChange('mobile', e.target.value)} placeholder={t('form.enterMobile')} required />
                {errors.mobile && <div className="meta" style={{ color: 'var(--err)' }}>{errors.mobile}</div>}
              </div>
            </div>

            <div style={{ marginTop: 36 }}>
              <label className="flab">{t('form.email')}</label>
              <input className="field" type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} placeholder={t('form.enterEmail')} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '36px 40px', marginTop: 36 }}>
              <div>
                <label className="flab">{t('form.vehicleNumber')}</label>
                <input className="field" value={formData.vehicleNumber} onChange={(e) => handleInputChange('vehicleNumber', e.target.value)} placeholder={t('form.enterVehicleNumber')} />
              </div>
              <div>
                <label className="flab">{t('form.licenseNumber')}</label>
                <input className="field" value={formData.licenseNumber} onChange={(e) => handleInputChange('licenseNumber', e.target.value)} placeholder={t('form.enterLicenseNumber')} />
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
              <button className="btn btn-ghost" onClick={() => { setView('categories'); setErrors({}); }}>{t('app.back')}</button>
              <button className="btn btn-pri" onClick={handleComplaintSubmit}>{t('app.submit')}</button>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title={t('form.confirmSubmission')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <p className="body">{t('form.confirmMessage')}</p>
          <div className="card" style={{ padding: 24 }}>
            <div className="receipt-row"><span className="k">{t('form.name')}</span><span className="v">{formData.name}</span></div>
            <div className="receipt-row"><span className="k">{t('form.mobile')}</span><span className="v">{formData.mobile}</span></div>
            <div className="receipt-row"><span className="k">{t('transport.categoryLabel')}</span><span className="v">{t(`transport.${selectedCategory}`)}</span></div>
          </div>
          <div style={{ display: 'flex', gap: 24, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={() => setShowConfirmModal(false)}>{t('app.cancel')}</button>
            <button className="btn btn-pri" onClick={handleConfirmSubmit}>{t('app.confirm')}</button>
          </div>
        </div>
      </Modal>
    </VK>
  );
};

export default Transport;
