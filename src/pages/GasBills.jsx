import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { VK, DD, I, ic } from '../components/kiosk';
import { formatDateShort } from '../utils/helpers';

/**
 * Gas Bills Page — View past and current gas bills
 */
const GasBills = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const userName = sessionStorage.getItem('userName') || 'Consumer';
  const [expandedBill, setExpandedBill] = useState(null);

  // Mock bill data
  const bills = [
    { id: 'GB-2026-03', month: 'March 2026', amount: 1850, units: 42, dueDate: '2026-04-15', status: 'unpaid', readingDate: '2026-03-28', previousReading: 4520, currentReading: 4562 },
    { id: 'GB-2026-02', month: 'February 2026', amount: 1620, units: 37, dueDate: '2026-03-15', status: 'paid', readingDate: '2026-02-28', previousReading: 4483, currentReading: 4520 },
    { id: 'GB-2026-01', month: 'January 2026', amount: 2100, units: 48, dueDate: '2026-02-15', status: 'paid', readingDate: '2026-01-30', previousReading: 4435, currentReading: 4483 },
    { id: 'GB-2025-12', month: 'December 2025', amount: 1980, units: 45, dueDate: '2026-01-15', status: 'paid', readingDate: '2025-12-29', previousReading: 4390, currentReading: 4435 },
    { id: 'GB-2025-11', month: 'November 2025', amount: 1450, units: 33, dueDate: '2025-12-15', status: 'paid', readingDate: '2025-11-28', previousReading: 4357, currentReading: 4390 },
    { id: 'GB-2025-10', month: 'October 2025', amount: 1720, units: 39, dueDate: '2025-11-15', status: 'paid', readingDate: '2025-10-30', previousReading: 4318, currentReading: 4357 },
  ];

  const totalDue = bills.filter(b => b.status === 'unpaid').reduce((sum, b) => sum + b.amount, 0);
  const totalPaid = bills.filter(b => b.status === 'paid').length;
  const latestUnits = bills[0]?.units || 0;

  const locale = i18n.language === 'hi' ? 'hi-IN' : i18n.language === 'as' ? 'as-IN' : 'en-IN';

  return (
    <VK bg="color-mix(in oklab, var(--dept-gas) 5%, var(--surface-0))">
      <div>
        {/* Dept header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 40, marginBottom: 48 }}>
          <DD color="var(--dept-gas)" glyph={ic.receipt} size={128} isz={72} />
          <div>
            <h1 className="h2">{t('gasBills.title', 'Gas Bills')}</h1>
            <p className="body-l" style={{ marginTop: 14, color: 'var(--ink-500)' }}>{userName}</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 36 }}>
          <div className="card" style={{ borderTop: '8px solid var(--err)' }}>
            <div className="meta">{t('gasBills.currentDue', 'Current Due')}</div>
            <div className="h3" style={{ marginTop: 8, color: 'var(--err)' }}>₹{totalDue.toLocaleString()}</div>
          </div>
          <div className="card" style={{ borderTop: '8px solid var(--ok)' }}>
            <div className="meta">{t('gasBills.billsPaid', 'Bills Paid')}</div>
            <div className="h3" style={{ marginTop: 8, color: 'var(--ok)' }}>{totalPaid}</div>
          </div>
          <div className="card" style={{ borderTop: '8px solid var(--dept-gas)' }}>
            <div className="meta">{t('gasBills.latestUnits', 'Latest Units')}</div>
            <div className="h3" style={{ marginTop: 8, color: 'var(--dept-gas)' }}>{latestUnits} SCM</div>
          </div>
        </div>

        {/* Bill List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {bills.map((bill) => (
            <div key={bill.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <button
                onClick={() => setExpandedBill(expandedBill === bill.id ? null : bill.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 28, textAlign: 'left', touchAction: 'manipulation', background: 'none', border: 'none', cursor: 'pointer' }}
                aria-label={`${bill.month} - ₹${bill.amount}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  <span className={`badge ${bill.status === 'paid' ? 'b-ok' : 'b-err'}`} style={{ width: 16, height: 16, borderRadius: '50%', padding: 0 }} />
                  <div>
                    <div className="body" style={{ fontWeight: 700 }}>{bill.month}</div>
                    <div className="meta" style={{ marginTop: 4 }}>{bill.units} SCM · Due: {formatDateShort(bill.dueDate, locale)}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="body" style={{ fontWeight: 700 }}>₹{bill.amount.toLocaleString()}</div>
                  <span className={`badge ${bill.status === 'paid' ? 'b-ok' : 'b-err'}`} style={{ marginTop: 6 }}>
                    {bill.status === 'paid' ? 'Paid' : 'Unpaid'}
                  </span>
                </div>
              </button>

              {/* Expanded Details */}
              {expandedBill === bill.id && (
                <div style={{ padding: '0 28px 28px', borderTop: '1.5px solid var(--line)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, padding: '24px 0' }}>
                    <div>
                      <div className="meta">Bill ID</div>
                      <div className="body" style={{ fontWeight: 700 }}>{bill.id}</div>
                    </div>
                    <div>
                      <div className="meta">Reading Date</div>
                      <div className="body" style={{ fontWeight: 700 }}>{formatDateShort(bill.readingDate, locale)}</div>
                    </div>
                    <div>
                      <div className="meta">Previous Reading</div>
                      <div className="body" style={{ fontWeight: 700 }}>{bill.previousReading}</div>
                    </div>
                    <div>
                      <div className="meta">Current Reading</div>
                      <div className="body" style={{ fontWeight: 700 }}>{bill.currentReading}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <button className="btn btn-ghost" onClick={() => window.print()}>
                      <I d={ic.print} size={32} /> Print
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Back Button */}
        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <button className="btn btn-quiet" onClick={() => navigate('/home')}>
            <I d={ic.back} size={24} /> {t('home.backToOrgs', 'Back to Home')}
          </button>
        </div>
      </div>
    </VK>
  );
};

export default GasBills;
