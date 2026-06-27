import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { VK, DD, I, ic } from '../components/kiosk';

const MunicipalMenu = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const services = [
    {
      id: 'waterConnection',
      glyph: ic.drop,
      title: t('home.muniWater', 'New Water Connection / Upgrade'),
      description: t('home.muniWaterDesc', 'Apply for water connection or upgrade existing'),
      path: '/municipal?category=waterConnection',
    },
    {
      id: 'grievance',
      glyph: ic.chat,
      title: t('home.muniGrievance', 'Register Municipal Grievances'),
      description: t('home.muniGrievanceDesc', 'Water, sewage, garbage, streetlight, roads & more'),
      path: '/municipal/grievance',
    },
    {
      id: 'propertyTax',
      glyph: ic.building,
      title: t('municipal.propertyTax', 'Property Tax Payment'),
      description: t('home.muniPropertyTaxDesc', 'Look up and pay your property tax online'),
      path: '/municipal/property-tax',
    },
    {
      id: 'track',
      glyph: ic.track,
      title: t('home.muniTrack', 'Track Request / Complaint'),
      description: t('home.muniTrackDesc', 'Monitor status of submitted applications'),
      path: '/track-status',
    },
    {
      id: 'receipt',
      glyph: ic.receipt,
      title: t('home.muniReceipt', 'Receipt Generation'),
      description: t('home.muniReceiptDesc', 'View and print transaction receipts'),
      path: '/receipt?org=municipal',
    },
    {
      id: 'profile',
      glyph: ic.user,
      title: t('home.muniProfile', 'Update Profile / Credentials'),
      description: t('home.muniProfileDesc', 'Update consumer details and contact info'),
      path: '/consumer-profile?org=municipal',
    },
  ];

  return (
    <VK bg="color-mix(in oklab, var(--dept-water) 5%, var(--surface-0))">
      {/* Dept header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 40, marginBottom: 48 }}>
        <DD color="var(--dept-water)" glyph={ic.drop} size={168} isz={92} />
        <div>
          <div className="label-tag" style={{ color: 'var(--dept-water)', marginBottom: 14 }}>
            Guwahati Municipal
          </div>
          <h1 className="h1">{t('home.municipalDept', 'Municipal')}</h1>
          <p className="body-l" style={{ marginTop: 14, color: 'var(--ink-500)' }}>
            {t('home.municipalDeptDesc', 'Water connections · Grievances · Property tax')}
          </p>
        </div>
      </div>

      {/* Service grid — 3 cols */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 32 }}>
        {services.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => navigate(s.path)}
            className="tile"
            style={{
              minHeight: 260,
              padding: 32,
              alignItems: 'flex-start',
              textAlign: 'left',
              gap: 20,
              borderTop: '8px solid var(--dept-water)',
              touchAction: 'manipulation',
            }}
            aria-label={s.title}
          >
            <DD color="var(--dept-water)" glyph={s.glyph} size={120} isz={64} />
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
    </VK>
  );
};

export default MunicipalMenu;
