import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Timeline } from '../components';
import { VK, I, ic } from '../components/kiosk';
import { RadiantLoader, SkeletonRow } from '../components/loading';
import { mockTrackingData } from '../utils/constants';
import { formatDate } from '../utils/helpers';
import { trackAPI } from '../utils/apiService';
import { mockDelayRange } from '../utils/mockDelay';
import { useToast } from '../hooks/useToast';

// Parse SLA string like "15 working days" → number of working days
function parseSLADays(slaStr) {
  if (!slaStr) return null;
  const match = slaStr.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

// Calculate working days remaining from submission date
function calcSLACountdown(submittedAt, slaDays) {
  if (!submittedAt || !slaDays) return null;
  const submitted = new Date(submittedAt);
  let workingDaysAdded = 0;
  const due = new Date(submitted);
  while (workingDaysAdded < slaDays) {
    due.setDate(due.getDate() + 1);
    const day = due.getDay();
    if (day !== 0 && day !== 6) workingDaysAdded++;
  }
  const now = new Date();
  const msLeft = due - now;
  if (msLeft <= 0) return { overdue: true, daysLeft: 0, dueDate: due };
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
  return { overdue: false, daysLeft, dueDate: due };
}

const TrackStatus = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('requestId'); // 'requestId' | 'ticketId' | 'mobile'
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
    const [slaCountdown, setSlaCountdown] = useState(null);
  const [escalated, setEscalated] = useState(false);

  // Recalculate SLA countdown every minute once result is loaded
  useEffect(() => {
    if (!result?.submittedAt || !result?.sla) { setSlaCountdown(null); return; }
    const slaDays = parseSLADays(result.sla);
    const update = () => setSlaCountdown(calcSLACountdown(result.submittedAt, slaDays));
    update();
    const interval = setInterval(update, 60 * 1000);
    return () => clearInterval(interval);
  }, [result]);

  // Escalated state persists across navigation/refresh, keyed by request ID
  useEffect(() => {
    if (!result?.requestId) { setEscalated(false); return; }
    try {
      setEscalated(localStorage.getItem(`suvidha:escalated:${result.requestId}`) === 'true');
    } catch {
      setEscalated(false);
    }
  }, [result]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError(t('tracking.enterSearchTerm', 'Please enter a search term'));
      return;
    }
    setError('');
    setLoading(true);
    setSearched(true);

    try {
      let foundResult = null;
      const lookup = async () => {
        try {
          if (searchType === 'requestId' || searchType === 'ticketId') {
            const data = await trackAPI.byRequestId(searchQuery.toUpperCase());
            if (data?.requestId) foundResult = data;
          } else {
            const data = await trackAPI.byMobile(searchQuery);
            if (data?.requestId) foundResult = data;
          }
        } catch {
          // Fallback to mock data — ticket ID maps to same mock set
          if (searchType === 'requestId' || searchType === 'ticketId') {
            foundResult = mockTrackingData[searchQuery.toUpperCase()] || null;
          } else {
            foundResult = Object.values(mockTrackingData).find(
              item => item.mobile === searchQuery
            ) || null;
          }
        }
      };
      await Promise.all([lookup(), mockDelayRange(2200, 2800)]);
      setResult(foundResult || null);
    } catch {
      setError(t('errors.networkError', 'Network error. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const getStatusBadge = (status) => {
    const classMap = {
      submitted: 'b-info',
      'in-progress': '',
      resolved: 'b-ok',
      overdue: 'b-err',
    };
    return (
      <span className={`badge ${classMap[status] || 'b-warn'}`}>
        {t(`tracking.${status}`, status)}
      </span>
    );
  };

  const searchTabs = [
    { key: 'requestId', label: t('tracking.requestId', 'Request ID'), glyph: ic.doc, placeholder: 'e.g. SVD-TEST-001' },
    { key: 'ticketId',  label: t('tracking.ticketId', 'Ticket ID'),   glyph: ic.receipt, placeholder: 'e.g. TKT-2026-001' },
    { key: 'mobile',    label: t('form.mobile', 'Mobile'),            glyph: ic.phone, placeholder: t('auth.enterMobile', '10-digit mobile') },
  ];

  return (
    <VK bg="var(--surface-1)">
      <div>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 className="h2">{t('tracking.title', 'Track Your Request')}</h1>
          <p className="body-l" style={{ marginTop: 14, color: 'var(--ink-500)' }}>
            {t('tracking.subtitle', 'Enter your Request ID, Ticket ID, or mobile number')}
          </p>
        </div>

        <div className="card" style={{ marginBottom: 36 }}>
          {/* Search Type Toggle — 3 tabs */}
          <div style={{ display: 'flex', gap: 20, marginBottom: 36 }}>
            {searchTabs.map((tab) => (
              <button
                key={tab.key}
                className={`chip${searchType === tab.key ? ' act' : ''}`}
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => { setSearchType(tab.key); setSearchQuery(''); setResult(null); setSearched(false); }}
              >
                <I d={tab.glyph} size={28} /> {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div style={{ display: 'flex', gap: 28 }}>
            <input
              className="field"
              style={{ flex: 1 }}
              value={searchQuery}
              onChange={(e) => {
                const raw = e.target.value;
                const value = searchType === 'mobile'
                  ? raw.replace(/\D/g, '').slice(0, 10)
                  : raw.toUpperCase();
                setSearchQuery(value);
                setError('');
              }}
              onKeyPress={handleKeyPress}
              placeholder={searchTabs.find(tab => tab.key === searchType)?.placeholder}
            />
            <button className="btn btn-pri" style={{ minWidth: 280 }} onClick={handleSearch} disabled={loading || !searchQuery.trim()}>
              {t('tracking.search', 'Search')}
            </button>
          </div>
          {error && <div className="meta" style={{ color: 'var(--err)', marginTop: 12 }}>{error}</div>}

          <div className="meta" style={{ marginTop: 24, color: 'var(--indigo-700)' }}>
            <strong>Demo:</strong> Request IDs - SVD-TEST-001, SVD-TEST-002, SVD-TEST-003 | Ticket IDs - TKT-2026-001, TKT-2026-002, TKT-2026-003 | Mobile - 9876543210
          </div>

          <div style={{ marginTop: 24 }}>
            <button className="btn btn-ghost" onClick={() => navigate('/home')}>
              <I d={ic.back} size={32} /> {t('home.backToOrgs', 'Back to Home')}
            </button>
          </div>
        </div>

        {loading && (
          <div style={{ padding: '24px 0 0' }}>
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, marginBottom: 28 }}
            >
              <RadiantLoader variant="sweep" size={80} />
              <h3 className="h3">{t('loading.lookingUpRequest', 'Looking up your request')}</h3>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--ink-500)', letterSpacing: '0.06em' }}>
                {searchQuery}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <SkeletonRow />
              <SkeletonRow delayMs={150} />
              <SkeletonRow delayMs={300} />
            </div>
          </div>
        )}

        {!loading && searched && (
          result ? (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Status Header */}
              <div style={{ background: 'var(--indigo-700)', color: 'var(--cream)', padding: '40px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
                <div>
                  <div className="label-tag" style={{ color: 'rgba(255,255,255,.65)' }}>
                    {t('tracking.requestId', 'Request ID')}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 56, fontWeight: 700, marginTop: 10 }}>
                    {result.requestId}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {getStatusBadge(result.status)}
                  <button aria-label={t('tracking.printStatus')} className="btn btn-ghost" style={{ color: 'var(--cream)' }} onClick={() => window.print()}>
                    <I d={ic.print} size={32} />
                  </button>
                </div>
              </div>

              {/* SLA Countdown Banner */}
              {slaCountdown && result.status !== 'resolved' && result.status !== 'closed' && (
                <div style={{
                  background: slaCountdown.overdue ? 'color-mix(in oklab, var(--err) 10%, white)' : 'color-mix(in oklab, var(--warn) 12%, white)',
                  padding: '28px 48px', display: 'flex', gap: 24, alignItems: 'center', borderBottom: '1.5px solid var(--line)', flexWrap: 'wrap',
                }}>
                  <I d={ic.clock} size={48} style={{ color: slaCountdown.overdue ? 'var(--err)' : 'var(--warn)' }} />
                  <div>
                    <div className="body" style={{ fontWeight: 600, color: slaCountdown.overdue ? 'var(--err)' : 'var(--warn)' }}>
                      {slaCountdown.overdue
                        ? t('tracking.slaBreached')
                        : t('tracking.slaDeadline', { count: slaCountdown.daysLeft })}
                    </div>
                    <div className="meta" style={{ marginTop: 4 }}>{t('tracking.committedSla')}: {result.sla}</div>
                  </div>
                  {slaCountdown.overdue && !escalated && (
                    <button className="btn btn-err" style={{ marginLeft: 'auto' }} onClick={() => {
                      setEscalated(true);
                      try { localStorage.setItem(`suvidha:escalated:${result.requestId}`, 'true'); } catch {}
                      toast.success(t('tracking.escalationRaised', { requestId: result.requestId }));
                    }}>
                      <I d={ic.sos} size={36} /> {t('tracking.escalate')}
                    </button>
                  )}
                  {escalated && (
                    <span className="badge b-err" style={{ marginLeft: 'auto' }}>Escalated</span>
                  )}
                </div>
              )}
              {result.status === 'resolved' && (
                <div style={{ padding: '24px 48px', background: 'color-mix(in oklab, var(--ok) 10%, white)', borderBottom: '1.5px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <I d={ic.clock} size={24} style={{ color: 'var(--ok)' }} />
                  <span className="meta" style={{ color: 'var(--ok)', fontWeight: 600 }}>Resolved within SLA: {result.sla}</span>
                </div>
              )}

              {/* Details */}
              <div style={{ padding: 48, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 36, borderBottom: '1.5px solid var(--line)' }}>
                <div>
                  <div className="meta">{t('receipt.citizenName', 'Name')}</div>
                  <div className="body" style={{ fontWeight: 600, marginTop: 8 }}>{result.citizenName}</div>
                </div>
                <div>
                  <div className="meta">{t('form.mobile', 'Mobile')}</div>
                  <div className="body" style={{ fontWeight: 600, marginTop: 8 }}>+91 {result.mobile}</div>
                </div>
                <div>
                  <div className="meta">{t('receipt.serviceCategory', 'Service')}</div>
                  <div className="body" style={{ fontWeight: 600, marginTop: 8 }}>{result.serviceCategory}</div>
                </div>
                <div>
                  <div className="meta">{t('tracking.lastUpdated', 'Last Updated')}</div>
                  <div className="body" style={{ fontWeight: 600, marginTop: 8 }}>
                    {formatDate(result.lastUpdated, i18n.language === 'hi' ? 'hi-IN' : i18n.language === 'as' ? 'as-IN' : 'en-IN')}
                  </div>
                </div>
              </div>

              {/* Officer + Timeline */}
              <div style={{ padding: 48 }}>
                {result.assignedOfficer && (
                  <div style={{ background: 'var(--indigo-100)', borderRadius: 20, padding: '32px 36px', marginBottom: 48 }}>
                    <div className="label-tag" style={{ color: 'var(--indigo-700)', marginBottom: 12 }}>
                      Assigned officer &amp; department
                    </div>
                    <div className="body" style={{ fontWeight: 700, color: 'var(--indigo-900)' }}>
                      {result.assignedOfficer.name} · {result.assignedOfficer.designation}
                    </div>
                    {result.department && (
                      <div className="meta" style={{ marginTop: 6 }}>{result.department}</div>
                    )}
                    {result.assignedOfficer.contact && <div className="meta" style={{ marginTop: 4 }}>{result.assignedOfficer.contact}</div>}
                  </div>
                )}
                <h3 className="h3" style={{ marginBottom: 36 }}>{t('tracking.timeline', 'Timeline')}</h3>
                <Timeline events={result.timeline} currentStatus={result.status} />
              </div>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: 64 }}>
              <h3 className="h3" style={{ color: 'var(--ink-500)', marginBottom: 8 }}>{t('tracking.noResults', 'No results found')}</h3>
              <p className="body-l" style={{ color: 'var(--ink-500)' }}>
                Please check the {searchTabs.find(tab => tab.key === searchType)?.label} and try again.
              </p>
            </div>
          )
        )}
      </div>
    </VK>
  );
};

export default TrackStatus;
