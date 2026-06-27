import React from 'react';
import { useTranslation } from 'react-i18next';
import { getActiveApplicant, clearActiveApplicant } from '../utils/citizenProfile';

/**
 * ApplicantBanner — read-only indicator shown on forms when the active applicant
 * is a dependant (selected in the Family department). Lets the user switch back
 * to applying as themselves. Renders nothing for the primary citizen / guests.
 *
 * @param {() => void} [onSwitchToSelf] - optional; defaults to a full reload so
 *   the form re-initialises its prefilled state for the primary citizen.
 */
const ApplicantBanner = ({ onSwitchToSelf }) => {
  const { t } = useTranslation();
  const applicant = getActiveApplicant();
  if (!applicant || !applicant.isDependant) return null;

  const handleSwitch = () => {
    clearActiveApplicant();
    if (onSwitchToSelf) onSwitchToSelf();
    else window.location.reload();
  };

  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '16px 20px',
        marginBottom: 24,
        borderRadius: 16,
        border: '2px solid #6366f1',
        background: '#eef2ff',
      }}
    >
      <div style={{ color: '#3730a3' }}>
        <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>
          {t('familyProfile.bannerApplyingFor', 'Applying for {{name}} (dependant)', { name: applicant.applicantLabel })}
        </div>
        <div style={{ fontSize: '0.9rem', opacity: 0.85 }}>
          {t('familyProfile.bannerContactOf', 'Contact & address of {{name}}', { name: applicant.primaryName })}
        </div>
      </div>
      <button
        type="button"
        onClick={handleSwitch}
        style={{
          flexShrink: 0,
          padding: '10px 18px',
          borderRadius: 12,
          border: '2px solid #6366f1',
          background: 'white',
          color: '#3730a3',
          fontWeight: 600,
          cursor: 'pointer',
          touchAction: 'manipulation',
        }}
      >
        {t('familyProfile.bannerSwitchToSelf', 'Switch to self')}
      </button>
    </div>
  );
};

export default ApplicantBanner;
