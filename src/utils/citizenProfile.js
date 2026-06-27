/**
 * citizenProfile.js — Single source of truth for auto-filling forms.
 *
 * After Aadhaar OTP login the full citizen record is in sessionStorage.citizenData.
 * These helpers resolve "who is the form for" (self, or a dependant added in the
 * Family department) and build a flat field-map that forms spread into their
 * initial state. Guests (no citizenData) get {} so forms stay blank.
 */

// ── Raw reads ───────────────────────────────────────────────────────────────

/** Logged-in primary citizen record, or null (guest / not logged in). */
export function getCitizenProfile() {
  try {
    const raw = sessionStorage.getItem('citizenData');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Dependants added via the Family department. */
export function getDependents() {
  try {
    return JSON.parse(sessionStorage.getItem('familyDependents') || '[]');
  } catch {
    return [];
  }
}

// ── Active applicant pointer (set by the Family department) ──────────────────

export function getActiveApplicantId() {
  return sessionStorage.getItem('activeApplicant') || 'self';
}

export function setActiveApplicant(id) {
  sessionStorage.setItem('activeApplicant', id || 'self');
}

export function clearActiveApplicant() {
  sessionStorage.removeItem('activeApplicant');
}

/**
 * Resolve the active applicant into a citizen-shaped profile.
 * - 'self' → primary citizen.
 * - dependant id → primary citizen as the base (contact + address inherited),
 *   with name / gender / aadhaar / age overridden from the dependant record.
 * Returns null when there is no logged-in citizen (guest).
 */
export function getActiveApplicant() {
  const primary = getCitizenProfile();
  if (!primary) return null;

  const id = getActiveApplicantId();
  if (id === 'self') {
    return { ...primary, isDependant: false, applicantLabel: primary.name, primaryName: primary.name };
  }

  const dep = getDependents().find((d) => d.id === id);
  if (!dep) {
    // Stale pointer — fall back to self.
    return { ...primary, isDependant: false, applicantLabel: primary.name, primaryName: primary.name };
  }

  return {
    ...primary,                       // inherit mobile, email, address from primary
    name: dep.name,
    gender: dep.gender || primary.gender,
    uid: dep.aadhaar || primary.uid,  // used for aadhaarUid on submit
    aadhaar: dep.aadhaar || '',
    disability: dep.disability || null,
    age: dep.age,
    dob: dep.age != null ? dobFromAge(dep.age) : primary.dob,
    isDependant: true,
    applicantLabel: dep.name,
    primaryName: primary.name,
    relationship: dep.relationship,
  };
}

// ── Derivations ──────────────────────────────────────────────────────────────

function dobFromAge(age) {
  const year = new Date().getFullYear() - Number(age);
  return `${year}-01-01`;
}

export function ageFromDob(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const diff = Date.now() - birth.getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

function composeAddress(addr) {
  if (!addr) return '';
  return [addr.house, addr.street, addr.landmark].filter(Boolean).join(', ');
}

// ── Generic prefill (service / complaint / consumer forms) ───────────────────

/**
 * Flat field-map keyed by the names forms already use. Extra keys are harmless
 * when a form doesn't render them. Returns {} when profile is null (guest).
 */
export function buildFormPrefill(profile) {
  if (!profile) return {};
  const addr = profile.address || {};
  const age = profile.age != null ? profile.age : ageFromDob(profile.dob);
  return {
    name: profile.name || '',
    mobile: profile.mobile || '',
    email: profile.email || '',
    aadhaar: profile.aadhaar || '',
    gender: profile.gender || '',
    state: addr.stateId || '',
    city: addr.cityId || '',
    ward: addr.wardId || '',
    address: composeAddress(addr),
    pincode: addr.pincode || '',
    dob: profile.dob || '',
    age: age != null ? String(age) : '',
    category: profile.category || '',
    occupation: profile.occupation || '',
    income: profile.annualIncome != null ? String(profile.annualIncome) : '',
  };
}

// ── Scheme Discovery prefill (its selects use specific option values) ────────

function ageGroupFromAge(age) {
  if (age == null) return '';
  const a = Number(age);
  if (a < 18) return '';
  if (a <= 25) return '18-25';
  if (a <= 35) return '26-35';
  if (a <= 45) return '36-45';
  if (a <= 60) return '46-60';
  return '60+';
}

function incomeRangeFromAmount(amount) {
  if (amount == null) return '';
  const n = Number(amount);
  if (n < 100000) return 'below-1L';
  if (n < 300000) return '1L-3L';
  if (n < 600000) return '3L-6L';
  if (n < 1000000) return '6L-10L';
  return 'above-10L';
}

function categoryOptionFromCategory(category) {
  if (!category) return '';
  const map = { general: 'general', obc: 'obc', sc: 'sc', st: 'st', ews: 'ews' };
  return map[category.toLowerCase()] || '';
}

function occupationOptionFromText(occupation) {
  if (!occupation) return '';
  const o = occupation.toLowerCase();
  if (o.includes('farmer')) return 'farmer';
  if (o.includes('student')) return 'student';
  if (o.includes('retired')) return 'retired';
  if (o.includes('vendor')) return 'street-vendor';
  if (o.includes('home')) return 'homemaker';
  if (o.includes('unemploy')) return 'unemployed';
  if (o.includes('wage')) return 'daily-wage';
  if (o.includes('self')) return 'self-employed';
  return 'salaried';
}

/** Prefill map for the Scheme Discovery profile step. */
export function buildSchemePrefill(profile) {
  if (!profile) return {};
  const addr = profile.address || {};
  const age = profile.age != null ? profile.age : ageFromDob(profile.dob);
  return {
    ageGroup: ageGroupFromAge(age),
    gender: (profile.gender || '').toLowerCase(),
    state: addr.stateId || '',
    income: incomeRangeFromAmount(profile.annualIncome),
    category: categoryOptionFromCategory(profile.category),
    occupation: occupationOptionFromText(profile.occupation),
  };
}
