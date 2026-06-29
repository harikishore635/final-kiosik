/**
 * formActions.js — Voice-Driven Form Autofill
 *
 * Detects form fields with data-voice-field attributes and fills them
 * from AI-extracted values. Validates common Indian government form fields.
 */

// ── Field finders ─────────────────────────────────────────────────────────

/**
 * Find a form field by voice field name.
 * Checks: data-voice-field, name attr, id, placeholder.
 */
export function findField(fieldName) {
  return (
    document.querySelector(`[data-voice-field="${fieldName}"]`) ||
    document.querySelector(`input[name="${fieldName}"], textarea[name="${fieldName}"], select[name="${fieldName}"]`) ||
    document.getElementById(fieldName) ||
    document.querySelector(`[placeholder*="${fieldName}" i]`) ||
    null
  );
}

/**
 * Fill a form field with a value and trigger React's synthetic events.
 * @param {string} fieldName
 * @param {string} value
 * @returns {boolean} - true if field was found and filled
 */
export function fillField(fieldName, value) {
  const el = findField(fieldName);
  if (!el) return false;

  // Custom listbox (Select.jsx) — not a native input, no .value to set.
  // Hand the raw spoken text to its own 'voicefill' listener, which fuzzy
  // matches against its option list.
  if (el.tagName === 'BUTTON') {
    el.dispatchEvent(new CustomEvent('voicefill', { bubbles: true, detail: { value } }));
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return true;
  }

  // Use React's internal setter to trigger onChange
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
  )?.set;

  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(el, value);
  } else {
    el.value = value;
  }

  // Dispatch React-compatible events
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));

  // Visual feedback
  el.focus();
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.style.outline = '3px solid #22c55e';
  el.style.background = '#f0fdf4';
  setTimeout(() => {
    el.style.outline = '';
    el.style.background = '';
  }, 2500);

  return true;
}

/**
 * Fill multiple fields at once from extracted form data.
 * @param {Object} fields - { fieldName: value }
 * @returns {string[]} - list of filled field names
 */
export function fillMultipleFields(fields) {
  const filled = [];
  for (const [name, value] of Object.entries(fields)) {
    if (fillField(name, value)) filled.push(name);
  }
  return filled;
}

// ── Validation ────────────────────────────────────────────────────────────

const VALIDATORS = {
  aadhaar: (v) => /^\d{12}$/.test(v.replace(/\s/g, '')),
  phone:   (v) => /^[6-9]\d{9}$/.test(v.replace(/\D/g, '')),
  mobile:  (v) => /^[6-9]\d{9}$/.test(v.replace(/\D/g, '')),
  pincode: (v) => /^\d{6}$/.test(v),
  pan:     (v) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v.toUpperCase()),
  email:   (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  name:    (v) => v.trim().length >= 2,
};

/**
 * Validate a field value.
 * @param {string} fieldName
 * @param {string} value
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateField(fieldName, value) {
  const validator = VALIDATORS[fieldName];
  if (!validator) return { valid: true };

  const valid = validator(value);
  if (!valid) {
    const errors = {
      aadhaar: 'Aadhaar must be 12 digits.',
      phone:   'Phone must be 10 digits starting with 6-9.',
      mobile:  'Mobile must be 10 digits starting with 6-9.',
      pincode: 'PIN code must be 6 digits.',
      pan:     'PAN format: AAAAA9999A.',
      email:   'Invalid email address.',
      name:    'Name must be at least 2 characters.',
    };
    return { valid: false, error: errors[fieldName] || 'Invalid value.' };
  }
  return { valid: true };
}

// ── Value normalisation ───────────────────────────────────────────────────

/**
 * Normalise a voice-extracted value for a specific field type.
 * Handles common speech-to-text artifacts (e.g., "one two three" → "123").
 */
export function normaliseFieldValue(fieldName, rawValue) {
  let v = (rawValue || '').trim();

  if (fieldName === 'aadhaar' || fieldName === 'phone' || fieldName === 'mobile' || fieldName === 'pincode') {
    // Convert spoken digits to numerals
    const wordToDigit = {
      'zero':'0','one':'1','two':'2','three':'3','four':'4',
      'five':'5','six':'6','seven':'7','eight':'8','nine':'9',
    };
    v = v.toLowerCase().replace(/\b(zero|one|two|three|four|five|six|seven|eight|nine)\b/g,
      (m) => wordToDigit[m] || m);
    // Strip non-digits
    v = v.replace(/\D/g, '');
  }

  if (fieldName === 'name') {
    v = v.replace(/\b\w/g, c => c.toUpperCase()); // Title Case
  }

  if (fieldName === 'email') {
    v = v.toLowerCase().replace(/\s/g, '').replace('at', '@').replace('dot', '.');
  }

  return v;
}

/**
 * Detect which form fields are currently visible on the page.
 * Returns array of field names found via data-voice-field.
 */
export function detectVisibleFormFields() {
  const fields = [];
  document.querySelectorAll('[data-voice-field]').forEach(el => {
    const name = el.getAttribute('data-voice-field');
    if (name && !fields.includes(name)) fields.push(name);
  });
  return fields;
}

export default { findField, fillField, fillMultipleFields, validateField, normaliseFieldValue, detectVisibleFormFields };
