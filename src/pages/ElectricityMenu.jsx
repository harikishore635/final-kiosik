import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { VK, DD, I, ic } from '../components/kiosk';

const ElectricityMenu = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const mainServices = [
    {
      id: 'newConnection',
      glyph: ic.plus,
      title: t('home.elecNewConnection', 'New Connection & Load Extension'),
      description: t('home.elecNewConnectionDesc', 'Apply for new electricity connection or load change'),
      path: '/electricity?category=newConnection',
    },
    {
      id: 'meterIssue',
      glyph: ic.bolt,
      title: t('home.elecMeterService', 'Meter Replacement & Shifting'),
      description: t('home.elecMeterServiceDesc', 'Report meter malfunction, damage, or shifting'),
      path: '/electricity?category=meterIssue',
    },
    {
      id: 'complaint',
      glyph: ic.chat,
      title: t('home.elecComplaint', 'Register Complaint'),
      description: t('home.elecComplaintDesc', 'File electricity-specific grievances'),
      path: '/electricity/complaint',
    },
    {
      id: 'profile',
      glyph: ic.user,
      title: t('home.elecProfile', 'Update Consumer Info'),
      description: t('home.elecProfileDesc', 'Update credentials and consumer details'),
      path: '/consumer-profile?org=electricity',
    },
    {
      id: 'track',
      glyph: ic.track,
      title: t('home.elecTrack', 'Track Request / Complaint'),
      description: t('home.elecTrackDesc', 'Check real-time status of your requests'),
      path: '/track-status',
    },
    {
      id: 'receipt',
      glyph: ic.receipt,
      title: t('home.elecReceipt', 'View Receipts'),
      description: t('home.elecReceiptDesc', 'View and print transaction receipts'),
      path: '/receipt?org=electricity',
    },
  ];

  return (
    <VK bg="color-mix(in oklab, var(--dept-elec) 5%, var(--surface-0))">
      {/* Dept header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 40, marginBottom: 48 }}>
        <DD color="var(--dept-elec)" glyph={ic.bolt} size={168} isz={92} />
        <div>
          <h1 className="h1">{t('home.electricityDept', 'Electricity')}</h1>
          <p className="body-l" style={{ marginTop: 14, color: 'var(--ink-500)' }}>
            {t('home.electricityDeptDesc', 'New connections · Meter services · Complaints · Billing')}
          </p>
        </div>
      </div>

      {/* Service grid — 3 cols for kiosk */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 32 }}>
        {mainServices.map((s) => (
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
              borderTop: '8px solid var(--dept-elec)',
              touchAction: 'manipulation',
            }}
            aria-label={s.title}
          >
            <DD color="var(--dept-elec)" glyph={s.glyph} size={120} isz={64} />
            <div className="nm" style={{ fontSize: 26, lineHeight: 1.3 }}>{s.title}</div>
            <div className="sub" style={{ fontSize: 20, marginTop: 'auto' }}>{s.description}</div>
          </button>
        ))}
      </div>

      <button
        type="button"
        className="btn btn-quiet"
        style={{ alignSelf: 'center', marginTop: 24 }}
        onClick={() => navigate('/home')}
      >
        <I d={ic.back} size={24} /> {t('home.backToOrgs', 'Back to Organizations')}
      </button>
    </VK>
  );
};

export default ElectricityMenu;
