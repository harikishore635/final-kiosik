import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { VoiceAssistantProvider } from './ai/provider/VoiceAssistantProvider';
import { SessionProvider } from './context/SessionContext';
import AccessibilityProvider, { useAccessibility } from './components/AccessibilityProvider';
import EmergencyAlertBanner from './components/EmergencyAlertBanner';
import EmergencyQuickAccess from './components/EmergencyQuickAccess';
import ScreenReaderOverlay from './components/ScreenReaderOverlay';
import VoiceNavigation from './components/VoiceNavigation';
import AIChatbot from './components/AIChatbot';

// Eagerly loaded pages
import { Landing, Login, Home, ModeSelection, OfficeLocator } from './pages';
import LanguageSelection from './pages/LanguageSelection';
import VoiceModeSelection from './pages/VoiceModeSelection';

// Lazily loaded kiosk pages
const Electricity       = lazy(() => import('./pages/Electricity'));
const Gas               = lazy(() => import('./pages/Gas'));
const Water             = lazy(() => import('./pages/Water'));
const Sanitation        = lazy(() => import('./pages/Sanitation'));
const Municipal         = lazy(() => import('./pages/Municipal'));
const Transport         = lazy(() => import('./pages/Transport'));
const Healthcare        = lazy(() => import('./pages/Healthcare'));
const Complaints        = lazy(() => import('./pages/Complaints'));
const TrackStatus       = lazy(() => import('./pages/TrackStatus'));
const Receipt           = lazy(() => import('./pages/Receipt'));
const SchemeDiscovery   = lazy(() => import('./pages/SchemeDiscovery'));
const Dashboard         = lazy(() => import('./pages/Dashboard'));
const FamilyProfile     = lazy(() => import('./pages/FamilyProfile'));
const ElectricityMenu   = lazy(() => import('./pages/ElectricityMenu'));
const GasMenu           = lazy(() => import('./pages/GasMenu'));
const MunicipalMenu     = lazy(() => import('./pages/MunicipalMenu'));
const ElectricityComplaint = lazy(() => import('./pages/ElectricityComplaint'));
const GasComplaint      = lazy(() => import('./pages/GasComplaint'));
const GasBills          = lazy(() => import('./pages/GasBills'));
const MunicipalGrievance = lazy(() => import('./pages/MunicipalGrievance'));
const ConsumerProfile   = lazy(() => import('./pages/ConsumerProfile'));
const PropertyTaxPayment = lazy(() => import('./pages/PropertyTaxPayment'));
const MobileUpload      = lazy(() => import('./pages/MobileUpload'));

// Admin pages
const AdminLogin               = lazy(() => import('./pages/admin/AdminLogin'));
const SuperAdminDashboard      = lazy(() => import('./pages/admin/SuperAdminDashboard'));
const KioskOpsDashboard        = lazy(() => import('./pages/admin/KioskOpsDashboard'));
const DepartmentDashboard      = lazy(() => import('./pages/admin/DepartmentDashboard'));
const OfficerWorkspace         = lazy(() => import('./pages/admin/OfficerWorkspace'));
const SecurityDashboard        = lazy(() => import('./pages/admin/SecurityDashboard'));
const AuditDashboard           = lazy(() => import('./pages/admin/AuditDashboard'));

// Enterprise portals
const KioskOperationsDashboard    = lazy(() => import('./pages/kiosk-admin/KioskOperationsDashboard'));
const SuperAdminPortal            = lazy(() => import('./pages/super-admin/SuperAdminPortal'));
const SecurityOperationsCenter    = lazy(() => import('./pages/security/SecurityOperationsCenter'));
const SecurityAuditTrail          = lazy(() => import('./pages/security/SecurityAuditTrail'));
const ElectricityPortalDashboard  = lazy(() => import('./pages/organization/electricity/ElectricityPortalDashboard'));
const WaterPortalDashboard        = lazy(() => import('./pages/organization/water/WaterPortalDashboard'));
const HealthcarePortalDashboard   = lazy(() => import('./pages/organization/healthcare/HealthcarePortalDashboard'));
const MunicipalPortalDashboard    = lazy(() => import('./pages/organization/municipal/MunicipalPortalDashboard'));
const TransportPortalDashboard    = lazy(() => import('./pages/organization/transport/TransportPortalDashboard'));
const RevenuePortalDashboard      = lazy(() => import('./pages/organization/revenue/RevenuePortalDashboard'));

// Pages where AI overlay should NOT appear (admin, auth, onboarding)
const AI_EXCLUDED_PATHS = new Set([
  '/', '/login', '/admin-login', '/admin', '/admin/login',
  '/language-select', '/voice-select',
]);

function LoadingScreen() {
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0f172a', color: '#94a3b8', fontSize: 40,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 96, height: 96, border: '6px solid #6366f1',
          borderTopColor: 'transparent', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite', margin: '0 auto 12px',
        }} />
        <div>Loading SUVIDHA…</div>
      </div>
    </div>
  );
}

function AIShell({ children }) {
  const { pathname: path } = useLocation();
  const { userMode } = useAccessibility();
  const isBlind = userMode === 'blind';
  const isAdminPath = path.startsWith('/admin') || path.startsWith('/super-admin') ||
    path.startsWith('/security') || path.startsWith('/kiosk-ops') || path.startsWith('/org/');
  const isAuthPath = AI_EXCLUDED_PATHS.has(path);
  const showChatbot = !isAdminPath && !isAuthPath;

  return (
    <div className="kiosk-stage">
      <EmergencyAlertBanner />
      <EmergencyQuickAccess />
      {/* ScreenReaderOverlay only for blind mode — avoids duplicate voice with VoiceNavigation */}
      {isBlind && <ScreenReaderOverlay />}
      <VoiceNavigation />

      {children}

      {/* AIChatbot — floating text chat widget, always visible on citizen pages */}
      {showChatbot && <AIChatbot />}
    </div>
  );
}

export default function App() {
  // Preload Whisper model in background after 5s — ready before user speaks
  useEffect(() => {
    const timer = setTimeout(() => {
      import('./ai/voice/localSTT.js')
        .then(({ loadWhisper }) => loadWhisper())
        .catch(() => { /* non-fatal — STT falls back to Sarvam */ });
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <BrowserRouter>
      <SessionProvider>
      <AccessibilityProvider>
        <VoiceAssistantProvider>
          <AIShell>
            <Suspense fallback={<LoadingScreen />}>
              <Routes>
              {/* Public / kiosk entry */}
              <Route path="/"                 element={<Landing />} />
              <Route path="/login"            element={<Login />} />
              <Route path="/language-select"  element={<LanguageSelection />} />
              <Route path="/voice-select"     element={<VoiceModeSelection />} />
              <Route path="/mode-select"      element={<ModeSelection />} />
              <Route path="/home"             element={<Home />} />

              {/* Office Locator */}
              <Route path="/office-locator" element={<OfficeLocator />} />

              {/* Kiosk service routes */}
              <Route path="/electricity"           element={<Electricity />} />
              <Route path="/electricity-menu"      element={<ElectricityMenu />} />
              <Route path="/electricity/complaint" element={<ElectricityComplaint />} />
              <Route path="/electricity/consumer"  element={<ConsumerProfile />} />
              <Route path="/consumer-profile"      element={<ConsumerProfile />} />
              <Route path="/gas"                   element={<Gas />} />
              <Route path="/gas-menu"              element={<GasMenu />} />
              <Route path="/gas/complaint"         element={<GasComplaint />} />
              <Route path="/gas/bills"             element={<GasBills />} />
              <Route path="/water"                 element={<Water />} />
              <Route path="/sanitation"            element={<Sanitation />} />
              <Route path="/municipal"             element={<Municipal />} />
              <Route path="/municipal-menu"        element={<MunicipalMenu />} />
              <Route path="/municipal/grievance"   element={<MunicipalGrievance />} />
              <Route path="/municipal/property-tax" element={<PropertyTaxPayment />} />
              <Route path="/transport"             element={<Transport />} />
              <Route path="/healthcare"            element={<Healthcare />} />
              <Route path="/complaints"            element={<Complaints />} />
              <Route path="/track-status"          element={<TrackStatus />} />
              <Route path="/receipt"               element={<Receipt />} />
              <Route path="/schemes"               element={<SchemeDiscovery />} />
              <Route path="/family-profile"        element={<FamilyProfile />} />
              <Route path="/dashboard"             element={<Dashboard />} />
              <Route path="/upload/:token"         element={<MobileUpload />} />

              {/* Admin routes */}
              <Route path="/admin-login"         element={<AdminLogin />} />
              <Route path="/admin"               element={<AdminLogin />} />
              <Route path="/admin/login"         element={<AdminLogin />} />
              <Route path="/admin/super"         element={<SuperAdminDashboard />} />
              <Route path="/admin/kiosk"         element={<KioskOpsDashboard />} />
              <Route path="/admin/department"    element={<DepartmentDashboard />} />
              <Route path="/admin/officer"       element={<OfficerWorkspace />} />
              <Route path="/admin/security"      element={<SecurityDashboard />} />
              <Route path="/admin/audit"         element={<AuditDashboard />} />

              {/* Enterprise portal routes */}
              <Route path="/kiosk-ops"           element={<KioskOperationsDashboard />} />
              <Route path="/super-admin"         element={<SuperAdminPortal />} />
              <Route path="/security/ops"        element={<SecurityOperationsCenter />} />
              <Route path="/security/audit"      element={<SecurityAuditTrail />} />
              <Route path="/org/electricity"     element={<ElectricityPortalDashboard />} />
              <Route path="/org/water"           element={<WaterPortalDashboard />} />
              <Route path="/org/healthcare"      element={<HealthcarePortalDashboard />} />
              <Route path="/org/municipal"       element={<MunicipalPortalDashboard />} />
              <Route path="/org/transport"       element={<TransportPortalDashboard />} />
              <Route path="/org/revenue"         element={<RevenuePortalDashboard />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </AIShell>
        </VoiceAssistantProvider>
      </AccessibilityProvider>
      </SessionProvider>
    </BrowserRouter>
  );
}
