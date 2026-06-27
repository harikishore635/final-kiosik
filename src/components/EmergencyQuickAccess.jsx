import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Phone, X, AlertTriangle, Shield } from 'lucide-react';

// Pages that have the new VK shell with a built-in EMERGENCY button in the
// bottom bar. On these pages we hide the floating SOS button (to avoid two
// emergency UIs), but still listen for the 'suvidha:open-emergency' event
// the VK bottom bar dispatches so the modal opens correctly.
const KIOSK_SHELL_ROUTES = new Set([
  '/',
  '/login',
  '/language-select',
  '/voice-select',
  '/mode-select',
  '/home',
  '/dashboard',
  '/electricity',
  '/electricity-menu',
  '/electricity/complaint',
  '/electricity/consumer',
  '/consumer-profile',
  '/gas',
  '/gas-menu',
  '/gas/complaint',
  '/gas/bills',
  '/water',
  '/sanitation',
  '/municipal',
  '/municipal-menu',
  '/municipal/grievance',
  '/municipal/property-tax',
  '/transport',
  '/healthcare',
  '/complaints',
  '/track-status',
  '/receipt',
  '/schemes',
  '/family-profile',
]);

/**
 * Emergency Quick Access Panel
 * Always accessible — no login required.
 * Floating SOS button that expands into emergency numbers panel.
 */

const EMERGENCY_NUMBERS = [
  { id: 'ambulance', number: '108', color: 'bg-red-600', icon: '' },
  { id: 'police', number: '100', color: 'bg-blue-700', icon: '' },
  { id: 'fire', number: '101', color: 'bg-orange-600', icon: '' },
  { id: 'womenHelpline', number: '1091', color: 'bg-pink-600', icon: '' },
  { id: 'childHelpline', number: '1098', color: 'bg-green-600', icon: '' },
  { id: 'disasterMgmt', number: '1078', color: 'bg-yellow-600', icon: '' },
  { id: 'suicidePrevention', number: '9152987821', color: 'bg-purple-600', icon: '' },
  { id: 'seniorCitizen', number: '14567', color: 'bg-teal-600', icon: '' },
  { id: 'roadAccident', number: '1073', color: 'bg-gray-700', icon: '' },
];

const EmergencyQuickAccess = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const onKioskShell = KIOSK_SHELL_ROUTES.has(location.pathname);

  // Listen for the VK bottom bar's EMERGENCY button.
  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener('suvidha:open-emergency', handler);
    return () => window.removeEventListener('suvidha:open-emergency', handler);
  }, []);

  const getName = (item) => t(`emergency.contacts.${item.id}`);

  return (
    <>
      {/* Floating SOS Button — hidden on pages with the new VK shell */}
      {!onKioskShell && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed z-[9998] bg-red-600 hover:bg-red-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 animate-pulse"
          style={{ bottom: 'calc(260px * var(--ui-scale))', left: 'calc(32px * var(--ui-scale))', width: 'calc(160px * var(--ui-scale))', height: 'calc(160px * var(--ui-scale))' }}
          aria-label="Emergency SOS"
          title={t('emergency.title')}
        >
          <span className="text-[40px] font-black">SOS</span>
        </button>
      )}

      {/* Emergency Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-8" onClick={() => setIsOpen(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-[1200px] max-h-[3000px] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-red-600 text-white p-5 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Shield className="w-8 h-8" />
                <div>
                  <h2 className="text-xl font-bold">
                     {t('emergency.title')}
                  </h2>
                  <p className="text-sm opacity-90">
                    {t('emergency.noLoginRequired')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Numbers List */}
            <div className="p-4 space-y-3">
              {EMERGENCY_NUMBERS.map((item) => (
                <a
                  key={item.number}
                  href={`tel:${item.number}`}
                  className="flex items-center space-x-4 p-4 rounded-xl border-2 border-gray-200 hover:border-red-300 hover:bg-red-50 transition-all active:scale-[0.98]"
                >
                  <div className={`w-14 h-14 ${item.color} rounded-full flex items-center justify-center text-white text-2xl flex-shrink-0`}>
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-lg">{getName(item)}</p>
                    <p className="text-sm text-gray-500">
                      {t('emergency.tapToCall')}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <Phone className="w-5 h-5 text-red-500" />
                    <span className="text-xl font-black text-red-600">{item.number}</span>
                  </div>
                </a>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 bg-gray-50 rounded-b-2xl text-center">
              <p className="text-xs text-gray-500">
                {t('emergency.footerNote')}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EmergencyQuickAccess;
