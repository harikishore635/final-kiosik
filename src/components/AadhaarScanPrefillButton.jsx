import React, { useState, useCallback } from 'react';
import { ScanLine } from 'lucide-react';
import AadhaarCameraScanner from './AadhaarCameraScanner';
import { speak } from '../utils/ttsService';
import { states, cities } from '../utils/constants';

/**
 * Drop-in "Fill from Aadhaar Card" button for service forms.
 *
 * Opens the browser-camera Aadhaar QR scanner (AadhaarCameraScanner) — the same
 * proven flow used at Login. jsQR detects the QR in-browser, the raw text is
 * sent to the Express /aadhaar/verify-qr route, which decodes Secure QR v2 via
 * the Flask decoder (X-Decoder-Secret stays server-side). The returned citizen
 * object is mapped to form fields and handed to the parent via onFields().
 *
 * Works on any laptop/phone browser hitting the Vercel deploy — no kiosk
 * hardware or local scanner_service.py daemon required.
 *
 * Props:
 *   onFields(fields) — called once with { name, gender, dob, address,
 *                       pincode, state, city, district } on scan success.
 */

// Resolve full state name → stateId used by form dropdowns ("Assam" → "AS")
function resolveStateId(stateName) {
  if (!stateName) return '';
  const lower = stateName.toLowerCase().trim();
  const match = states.find(s =>
    s.name.toLowerCase() === lower ||
    (s.nameHi && s.nameHi === stateName) ||
    (s.nameAs && s.nameAs === stateName)
  );
  return match?.id || '';
}

// Resolve full city name → cityId within a given stateId ("Guwahati" → "GHY")
function resolveCityId(cityName, stateId) {
  if (!cityName || !stateId) return '';
  const lower = cityName.toLowerCase().trim();
  const stateCities = cities[stateId] || [];
  const match = stateCities.find(c =>
    c.name.toLowerCase() === lower ||
    (c.nameHi && c.nameHi === cityName) ||
    (c.nameAs && c.nameAs === cityName)
  );
  return match?.id || '';
}

// Map a verify-qr citizen object → flat form fields the service forms expect.
function citizenToFields(citizen) {
  const addr = citizen.address || {};
  const locality = addr.landmark || addr.locality || '';
  const stateId = resolveStateId(addr.state);
  const cityId = resolveCityId(locality || addr.district || addr.city, stateId);
  return {
    name:     citizen.name   || '',
    gender:   citizen.gender || '',
    dob:      citizen.dob    || '',
    address:  [addr.house, addr.street, locality].filter(Boolean).join(', '),
    pincode:  addr.pincode || '',
    state:    stateId,                       // dropdown-compatible ID ("AS")
    city:     cityId,                        // dropdown-compatible ID ("GHY")
    district: addr.district || '',
    // mobile / email intentionally omitted — Secure QR stores hashed values only
  };
}

export default function AadhaarScanPrefillButton({ onFields }) {
  const [scanning, setScanning] = useState(false);

  const handleSuccess = useCallback((citizen) => {
    setScanning(false);
    if (!citizen) return;
    const fields = citizenToFields(citizen);

    // Persist so subsequent form pages auto-fill via citizenProfile.buildFormPrefill()
    try {
      const existing = JSON.parse(sessionStorage.getItem('citizenData') || '{}');
      const addr = citizen.address || {};
      sessionStorage.setItem('citizenData', JSON.stringify({
        ...existing,
        name:   fields.name   || existing.name,
        gender: fields.gender || existing.gender,
        dob:    fields.dob    || existing.dob,
        address: {
          ...(existing.address || {}),
          house:    addr.house    || existing.address?.house    || '',
          street:   addr.street   || existing.address?.street   || '',
          landmark: addr.landmark || addr.locality || existing.address?.landmark || '',
          district: addr.district || existing.address?.district || '',
          state:    addr.state    || existing.address?.state    || '',
          stateId:  fields.state,
          cityId:   fields.city,
          pincode:  addr.pincode  || existing.address?.pincode  || '',
        },
      }));
    } catch { /* sessionStorage write failure is non-fatal */ }

    onFields(fields);
    speak('Aadhaar details filled. Please verify and continue.', { staticKey: 'aadhaar_form_filled' });
  }, [onFields]);

  return (
    <>
      <button type="button" onClick={() => setScanning(true)} style={btnStyle}>
        <ScanLine size={20} />
        Fill from Aadhaar Card
      </button>

      {scanning && (
        <AadhaarCameraScanner
          onSuccess={handleSuccess}
          onClose={() => setScanning(false)}
        />
      )}
    </>
  );
}

const btnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
  border: '1.5px solid #93c5fd',
  borderRadius: 16,
  padding: '14px 24px',
  color: '#1e3a8a',
  fontWeight: 700,
  fontSize: 18,
  cursor: 'pointer',
  width: '100%',
  justifyContent: 'center',
  marginBottom: 20,
  boxShadow: '0 2px 8px rgba(37,99,235,0.1)',
};
