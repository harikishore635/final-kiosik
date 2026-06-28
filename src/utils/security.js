/**
 * Security Utilities
 * Input sanitization, XSS prevention, CSRF token management,
 * session security, and Content Security Policy helpers.
 * Security is integrated by-design into all form handling.
 */

// HTML entity encoding to prevent XSS
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  const map = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#x27;', '/': '&#x2F;',
  };
  return input.replace(/[&<>"'/]/g, (char) => map[char]);
};

// Strip HTML tags completely
export const stripHtml = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/<[^>]*>/g, '');
};

// Sanitize an entire form data object
export const sanitizeFormData = (formData) => {
  const sanitized = {};
  for (const [key, value] of Object.entries(formData)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(stripHtml(value));
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

// CSRF Token management
export const csrf = {
  getToken: () => {
    let token = sessionStorage.getItem('csrf-token');
    if (!token) {
      token = generateSecureToken();
      sessionStorage.setItem('csrf-token', token);
    }
    return token;
  },
  setToken: (token) => {
    sessionStorage.setItem('csrf-token', token);
  },
  validateToken: (token) => {
    return token === sessionStorage.getItem('csrf-token');
  },
  getHeader: () => ({
    'X-CSRF-Token': sessionStorage.getItem('csrf-token') || '',
  }),
};

// Generate a cryptographically secure token
const generateSecureToken = () => {
  const array = new Uint8Array(32);
  if (window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Session security
export const sessionSecurity = {
  // Set session with expiry
  setSecureSession: (key, value, expiryMinutes = 30) => {
    const item = {
      value,
      expiry: Date.now() + expiryMinutes * 60 * 1000,
      fingerprint: getSessionFingerprint(),
    };
    sessionStorage.setItem(key, JSON.stringify(item));
  },

  // Get session with expiry check
  getSecureSession: (key) => {
    const itemStr = sessionStorage.getItem(key);
    if (!itemStr) return null;
    try {
      const item = JSON.parse(itemStr);
      if (Date.now() > item.expiry) {
        sessionStorage.removeItem(key);
        return null;
      }
      if (item.fingerprint && item.fingerprint !== getSessionFingerprint()) {
        sessionStorage.removeItem(key);
        return null;
      }
      return item.value;
    } catch {
      return null;
    }
  },

  // Clear all secure sessions
  clearAll: () => {
    sessionStorage.clear();
  },
};

// Browser fingerprint for session binding (lightweight)
const getSessionFingerprint = () => {
  const canvas = document.createElement('canvas');
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 'unknown',
  ];
  return simpleHash(components.join('|'));
};

// Simple hash function for fingerprinting
const simpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
};

// Rate limiting for API calls (client-side)
const rateLimitStore = new Map();

export const rateLimit = (key, maxCalls = 5, windowMs = 60000) => {
  const now = Date.now();
  const calls = rateLimitStore.get(key) || [];
  const recentCalls = calls.filter(t => now - t < windowMs);
  
  if (recentCalls.length >= maxCalls) {
    return false; // Rate limited
  }
  
  recentCalls.push(now);
  rateLimitStore.set(key, recentCalls);
  return true; // Allowed
};

// File upload security validation
export const validateUploadSecurity = (file) => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
  ];
  const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.js', '.vbs', '.ps1'];

  const errors = [];

  if (file.size > maxSize) {
    errors.push('File exceeds 5MB limit');
  }

  if (!allowedTypes.includes(file.type)) {
    errors.push('Invalid file type. Allowed: PDF, JPG, PNG only');
  }
  
  const fileName = file.name.toLowerCase();
  if (dangerousExtensions.some(ext => fileName.endsWith(ext))) {
    errors.push('Potentially dangerous file type');
  }

  // Check for double extensions (e.g., file.pdf.exe)
  const parts = fileName.split('.');
  if (parts.length > 2) {
    const lastExt = '.' + parts[parts.length - 1];
    if (dangerousExtensions.includes(lastExt)) {
      errors.push('Suspicious file extension detected');
    }
  }
  
  return { isValid: errors.length === 0, errors };
};

// Content Security Policy meta tag helper
export const getCSPMeta = () => {
  return "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' http://localhost:8080; frame-ancestors 'none'; form-action 'self';";
};

export default {
  sanitizeInput,
  stripHtml,
  sanitizeFormData,
  csrf,
  sessionSecurity,
  rateLimit,
  validateUploadSecurity,
  getCSPMeta,
};
