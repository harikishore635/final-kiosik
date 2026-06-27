import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { VK, DD, I, ic } from '../components/kiosk';

const GasMenu = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const services = [
    {
      id: 'newConnection',
      glyph: ic.plus,
      title: t('home.gasNewConnection', 'New Gas Connection'),
      description: t('home.gasNewConnectionDesc', 'Apply for a new domestic or commercial gas connection'),
      path: '/gas?category=newConnection',
    },
    {
      id: 'reconnect',
      glyph: ic.flame,
      title: t('home.gasReconnect', 'Reconnection'),
      description: t('home.gasReconnectDesc', 'Restore a previously disconnected gas connection'),
      path: '/gas?category=reconnect',
    },
    {
      id: 'disconnect',
      glyph: ic.bolt,
      title: t('home.gasDisconnect', 'Disconnection'),
      description: t('home.gasDisconnectDesc', 'Request temporary or permanent disconnection'),
      path: '/gas?category=disconnect',
    },
    {
      id: 'prepaidConversion',
      glyph: ic.card,
      title: t('home.gasPrepaid', 'Postpaid → Prepaid'),
      description: t('home.gasPrepaidDesc', 'Switch your gas billing plan to prepaid'),
      path: '/gas?category=prepaidConversion',
    },
    {
      id: 'pipelineInspection',
      glyph: ic.track,
      title: t('home.gasPipeline', 'Pipeline Inspection'),
      description: t('home.gasPipelineDesc', 'Book a safety inspection of your gas pipeline'),
      path: '/gas?category=pipelineInspection',
    },
    {
      id: 'maintenance',
      glyph: ic.chat,
      title: t('home.gasMaintenance', 'Maintenance Scheduling'),
      description: t('home.gasMaintenanceDesc', 'Schedule routine gas equipment maintenance'),
      path: '/gas?category=maintenance',
    },
    {
      id: 'meterDamage',
      glyph: ic.bolt,
      title: t('home.gasMeterDamage', 'Meter Malfunction / Damage'),
      description: t('home.gasMeterDamageDesc', 'Report meter issues and request replacements'),
      path: '/gas?category=meterDamage',
    },
    {
      id: 'bills',
      glyph: ic.receipt,
      title: t('home.gasBills', 'Check / View Bills'),
      description: t('home.gasBillsDesc', 'View current and past gas bills'),
      path: '/gas/bills',
    },
    {
      id: 'complaint',
      glyph: ic.chat,
      title: t('home.gasComplaint', 'Register Complaint'),
      description: t('home.gasComplaintDesc', 'File gas-related grievances with voice input'),
      path: '/gas/complaint',
    },
    {
      id: 'track',
      glyph: ic.track,
      title: t('home.gasTrack', 'Track Complaint / Request'),
      description: t('home.gasTrackDesc', 'Check real-time status of your requests'),
      path: '/track-status',
    },
    {
      id: 'profile',
      glyph: ic.user,
      title: t('home.gasProfile', 'Edit Credentials / Profile'),
      description: t('home.gasProfileDesc', 'Update your consumer information'),
      path: '/consumer-profile?org=gas',
    },
  ];

  return (
    <VK bg="color-mix(in oklab, var(--dept-gas) 5%, var(--surface-0))">
      {/* Dept header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 40, marginBottom: 48 }}>
        <DD color="var(--dept-gas)" glyph={ic.flame} size={168} isz={92} />
        <div>
          <div className="label-tag" style={{ color: 'var(--dept-gas)', marginBottom: 14 }}>
            Assam Gas Company
          </div>
          <h1 className="h1">{t('home.gasDept', 'Assam Gas')}</h1>
          <p className="body-l" style={{ marginTop: 14, color: 'var(--ink-500)' }}>
            {t('home.gasDeptDesc', 'Gas connections · Bills · Complaints · Maintenance')}
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
              borderTop: '8px solid var(--dept-gas)',
              touchAction: 'manipulation',
            }}
            aria-label={s.title}
          >
            <DD color="var(--dept-gas)" glyph={s.glyph} size={120} isz={64} />
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

export default GasMenu;
