import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Modal, Select } from '../components';
import { VK, DD, I, ic } from '../components/kiosk';
import { setActiveApplicant } from '../utils/citizenProfile';

const FamilyProfile = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language || 'en';
  const userName = sessionStorage.getItem('userName') || 'Citizen';

  const [view, setView] = useState('menu'); // 'menu' | 'manage'

  const [dependents, setDependents] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('familyDependents') || '[]');
    } catch {
      return [];
    }
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    relationship: 'child',
    age: '',
    gender: 'Male',
    aadhaar: '',
    disability: '',
  });
  const [formError, setFormError] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  useEffect(() => {
    sessionStorage.setItem('familyDependents', JSON.stringify(dependents));
  }, [dependents]);

  const menuCards = [
    {
      id: 'addChild',
      glyph: ic.family,
      title: t('familyProfile.addChildTitle'),
      description: t('familyProfile.addChildDesc'),
    },
    {
      id: 'addParent',
      glyph: ic.heart,
      title: t('familyProfile.addParentTitle'),
      description: t('familyProfile.addParentDesc'),
    },
    {
      id: 'viewFamily',
      glyph: ic.user,
      title: t('familyProfile.viewFamilyTitle'),
      description: t('familyProfile.viewFamilyDesc'),
    },
    {
      id: 'schemes',
      glyph: ic.shield,
      title: t('familyProfile.schemesTitle'),
      description: t('familyProfile.schemesDesc'),
      path: '/schemes',
    },
    {
      id: 'track',
      glyph: ic.track,
      title: t('familyProfile.trackTitle'),
      description: t('familyProfile.trackDesc'),
      path: '/track-status',
    },
    {
      id: 'receipt',
      glyph: ic.receipt,
      title: t('familyProfile.receiptTitle'),
      description: t('familyProfile.receiptDesc'),
      path: '/receipt',
    },
  ];

  const resetForm = () => {
    setFormData({ name: '', relationship: 'child', age: '', gender: 'Male', aadhaar: '', disability: '' });
    setEditingId(null);
    setFormError('');
    setShowForm(false);
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormError('');
  };

  const validateForm = () => {
    if (!formData.name.trim()) return t('familyProfile.nameRequired');
    if (!formData.age || isNaN(formData.age) || formData.age < 0 || formData.age > 120)
      return t('familyProfile.enterValidAge');
    if (formData.relationship === 'child' && parseInt(formData.age) > 18)
      return t('familyProfile.childAgeLimit');
    if (formData.relationship === 'elderly_parent' && parseInt(formData.age) < 55)
      return t('familyProfile.elderlyAgeLimit');
    if (formData.aadhaar && !/^\d{12}$/.test(formData.aadhaar))
      return t('familyProfile.enterValidAadhaar');
    return null;
  };

  const handleSave = () => {
    const error = validateForm();
    if (error) { setFormError(error); return; }
    const entry = { ...formData, age: parseInt(formData.age), id: editingId || `dep-${Date.now()}` };
    if (editingId) {
      setDependents((prev) => prev.map((d) => (d.id === editingId ? entry : d)));
    } else {
      setDependents((prev) => [...prev, entry]);
    }
    resetForm();
  };

  const handleEdit = (dep) => {
    setFormData({ name: dep.name, relationship: dep.relationship, age: dep.age.toString(), gender: dep.gender, aadhaar: dep.aadhaar || '', disability: dep.disability || '' });
    setEditingId(dep.id);
    setShowForm(true);
  };

  const handleRemove = (id) => { setDeleteTargetId(id); setShowDeleteModal(true); };

  // Set this dependant as the active applicant, then go to the service hub.
  // Every form will auto-fill for the dependant (contact/address inherited from primary).
  const handleApplyFor = (dep) => {
    setActiveApplicant(dep.id);
    navigate('/home');
  };

  const confirmRemove = () => {
    setDependents((prev) => prev.filter((d) => d.id !== deleteTargetId));
    setShowDeleteModal(false);
    setDeleteTargetId(null);
  };

  const children = dependents.filter((d) => d.relationship === 'child');
  const parents = dependents.filter((d) => d.relationship === 'elderly_parent');

  return (
    <VK bg="color-mix(in oklab, var(--saffron-500) 6%, var(--surface-0))">

      {/* ── MENU LANDING ── */}
      {view === 'menu' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 40, marginBottom: 48 }}>
            <DD color="var(--saffron-700)" glyph={ic.family} size={168} isz={92} />
            <div>
              <div className="label-tag" style={{ color: 'var(--saffron-700)', marginBottom: 14 }}>
                My Family
              </div>
              <h1 className="h2">{t('familyProfile.title', 'Family Profile')}</h1>
              <p className="body-l" style={{ marginTop: 14, color: 'var(--ink-500)' }}>
                {t('familyProfile.subtitle', 'Manage dependents · Children · Elderly parents · Scheme benefits')}
              </p>
            </div>
          </div>

          {/* Service grid — 3 cols for kiosk */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 32 }}>
            {menuCards.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (s.path) {
                    navigate(s.path);
                  } else if (s.id === 'addChild') {
                    setFormData(f => ({ ...f, relationship: 'child' }));
                    setShowForm(true);
                    setView('manage');
                  } else if (s.id === 'addParent') {
                    setFormData(f => ({ ...f, relationship: 'elderly_parent' }));
                    setShowForm(true);
                    setView('manage');
                  } else {
                    setView('manage');
                  }
                }}
                className="tile"
                style={{
                  minHeight: 260,
                  padding: 32,
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  gap: 20,
                  borderTop: '8px solid var(--saffron-700)',
                  touchAction: 'manipulation',
                }}
                aria-label={s.title}
              >
                <DD color="var(--saffron-700)" glyph={s.glyph} size={120} isz={64} />
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

      {/* ── MANAGE VIEW ── */}
      {view === 'manage' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32, marginBottom: 40 }}>
            <DD color="var(--saffron-700)" glyph={ic.family} size={128} isz={72} />
            <h1 className="h2">{t('familyProfile.title', 'Family Profile')}</h1>
          </div>

          {/* Primary citizen banner */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 32, padding: '40px 48px', marginBottom: 36 }}>
            <div style={{ width: 104, height: 104, borderRadius: '50%', background: 'var(--indigo-700)', color: 'var(--cream)', display: 'grid', placeItems: 'center', fontSize: 48, fontWeight: 800 }}>
              {userName[0]?.toUpperCase() || 'C'}
            </div>
            <div style={{ flex: 1 }}>
              <div className="body" style={{ fontWeight: 700, color: 'var(--indigo-900)', fontSize: 42 }}>
                {userName}
              </div>
              <div className="meta" style={{ marginTop: 6 }}>{t('familyProfile.primaryCitizen')}</div>
            </div>
            <span className="badge b-info">Primary</span>
          </div>

          {/* Add Dependent Button */}
          {!showForm && (
            <button className="btn btn-pri" style={{ width: '100%', marginBottom: 52 }} onClick={() => setShowForm(true)}>
              <I d={ic.plus} size={44} /> {t('familyProfile.addDependent', 'Add Dependent')}
            </button>
          )}

          {/* Add/Edit Form */}
          {showForm && (
            <div className="card" style={{ marginBottom: 48, border: '2px solid var(--indigo-300)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40 }}>
                <h2 className="h3">{editingId ? t('familyProfile.editDependent', 'Edit Dependent') : t('familyProfile.addNewDependent', 'Add New Dependent')}</h2>
                <button className="btn btn-quiet" onClick={resetForm}>
                  <I d={ic.x} size={36} />
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '36px 40px' }}>
                <div>
                  <label className="flab">{t('form.name')} *</label>
                  <input className="field" value={formData.name} onChange={(e) => handleFormChange('name', e.target.value)} placeholder={t('familyProfile.enterFullName')} />
                </div>
                <div>
                  <label className="flab">{t('familyProfile.relationship')} *</label>
                  <Select
                    value={formData.relationship}
                    onChange={(e) => handleFormChange('relationship', e.target.value)}
                    options={[
                      { value: 'child', label: t('familyProfile.child') },
                      { value: 'elderly_parent', label: t('familyProfile.elderlyParent') },
                    ]}
                  />
                </div>
                <div>
                  <label className="flab">{t('familyProfile.age')} *</label>
                  <input className="field" type="number" min="0" max="120" value={formData.age} onChange={(e) => handleFormChange('age', e.target.value)} placeholder={t('familyProfile.age')} />
                </div>
                <div>
                  <label className="flab">{t('schemes.gender')}</label>
                  <Select
                    value={formData.gender}
                    onChange={(e) => handleFormChange('gender', e.target.value)}
                    options={[
                      { value: 'Male', label: t('familyProfile.male') },
                      { value: 'Female', label: t('familyProfile.female') },
                      { value: 'Other', label: t('familyProfile.other') },
                    ]}
                  />
                </div>
                <div>
                  <label className="flab">{t('familyProfile.aadhaarOptional')}</label>
                  <input className="field" type="text" value={formData.aadhaar} onChange={(e) => handleFormChange('aadhaar', e.target.value.replace(/\D/g, '').slice(0, 12))} placeholder={t('familyProfile.aadhaarPlaceholder')} maxLength={12} />
                </div>
                <div>
                  <label className="flab">{t('familyProfile.disabilityOptional')}</label>
                  <Select
                    value={formData.disability}
                    onChange={(e) => handleFormChange('disability', e.target.value)}
                    options={[
                      { value: '', label: t('familyProfile.none') },
                      { value: 'visual', label: t('familyProfile.visual') },
                      { value: 'physical', label: t('familyProfile.physical') },
                      { value: 'hearing', label: t('familyProfile.hearing') },
                      { value: 'intellectual', label: t('familyProfile.intellectual') },
                    ]}
                  />
                </div>
              </div>

              {formError && (
                <div className="badge b-err" style={{ marginTop: 28, borderRadius: 18, padding: '24px 28px' }}>
                  {formError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 28, marginTop: 40 }}>
                <button className="btn btn-ghost btn-xl" style={{ flex: 1 }} onClick={resetForm}>
                  <I d={ic.x} size={40} /> {t('app.cancel')}
                </button>
                <button className="btn btn-pri btn-xl" style={{ flex: 1 }} onClick={handleSave}>
                  <I d={ic.check} size={44} /> {editingId ? t('familyProfile.updateDependent') : t('familyProfile.saveDependent')}
                </button>
              </div>
            </div>
          )}

          {/* Dependents list */}
          {dependents.length === 0 && !showForm ? (
            <div className="card" style={{ textAlign: 'center', border: '2px dashed var(--line)' }}>
              <I d={ic.family} size={48} style={{ color: 'var(--ink-500)' }} />
              <p className="body" style={{ marginTop: 12, color: 'var(--ink-500)' }}>{t('familyProfile.noDependents')}</p>
              <p className="meta" style={{ marginTop: 4 }}>{t('familyProfile.noDependentsHint')}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
              {children.length > 0 && (
                <div>
                  <div className="label-tag" style={{ marginBottom: 28 }}>{t('familyProfile.children')} ({children.length})</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                    {children.map((dep) => (
                      <div key={dep.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
                        <DD color="var(--dept-health)" glyph={ic.family} size={104} isz={56} />
                        <div style={{ flex: 1 }}>
                          <div className="body" style={{ fontWeight: 700, fontSize: 42 }}>{dep.name}</div>
                          <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
                            <span className="badge b-info">{dep.relationship}</span>
                            <span className="badge b-ok">{dep.age} yrs</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 18 }}>
                          <button className="chip" style={{ color: 'var(--indigo-700)', fontWeight: 700 }} onClick={() => handleApplyFor(dep)}>{t('familyProfile.applyForService', 'Apply for service')}</button>
                          <button className="chip" onClick={() => handleEdit(dep)}>Edit</button>
                          <button className="chip" style={{ color: 'var(--err)' }} onClick={() => handleRemove(dep.id)}>Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {parents.length > 0 && (
                <div>
                  <div className="label-tag" style={{ marginBottom: 28 }}>{t('familyProfile.elderlyParents')} ({parents.length})</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                    {parents.map((dep) => (
                      <div key={dep.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
                        <DD color="var(--dept-health)" glyph={ic.family} size={104} isz={56} />
                        <div style={{ flex: 1 }}>
                          <div className="body" style={{ fontWeight: 700, fontSize: 42 }}>{dep.name}</div>
                          <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
                            <span className="badge b-info">{dep.relationship}</span>
                            <span className="badge b-ok">{dep.age} yrs</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 18 }}>
                          <button className="chip" style={{ color: 'var(--indigo-700)', fontWeight: 700 }} onClick={() => handleApplyFor(dep)}>{t('familyProfile.applyForService', 'Apply for service')}</button>
                          <button className="chip" onClick={() => handleEdit(dep)}>Edit</button>
                          <button className="chip" style={{ color: 'var(--err)' }} onClick={() => handleRemove(dep.id)}>Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {dependents.length > 0 && (
            <div className="card" style={{ marginTop: 36, background: 'color-mix(in oklab, var(--indigo-500) 8%, white)' }}>
              <p className="meta" style={{ color: 'var(--indigo-700)' }}>{t('familyProfile.schemesHint')}</p>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => setView('menu')}
            >
              <I d={ic.back} size={24} /> {t('familyProfile.backToMenu')}
            </button>
          </div>
        </div>
      )}

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        type="warning"
        title={t('familyProfile.confirmRemovalTitle')}
        message={t('familyProfile.confirmRemovalMsg')}
        confirmText={t('familyProfile.remove')}
        cancelText={t('app.cancel')}
        onConfirm={confirmRemove}
        onCancel={() => setShowDeleteModal(false)}
      />
    </VK>
  );
};

export default FamilyProfile;
