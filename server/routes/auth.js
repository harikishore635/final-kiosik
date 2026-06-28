import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { createHmac, timingSafeEqual } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { XMLParser } from 'fast-xml-parser';
import forge from 'node-forge';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── UIDAI public cert — optional, enables RSA signature verification ──
const CERT_PATH = path.join(__dirname, '../certs/uidai_offline_public.cer');
let UIDAI_CERT_PEM = null;
if (existsSync(CERT_PATH)) {
  UIDAI_CERT_PEM = readFileSync(CERT_PATH, 'utf8');
  console.log('[AUTH] UIDAI offline cert loaded — RSA signature verification enabled');
} else {
  console.warn('[AUTH] UIDAI cert missing at server/certs/uidai_offline_public.cer — see certs/README.md');
}

const CONSENT_SECRET = process.env.CONSENT_HMAC_SECRET || 'suvidha-consent-dev-secret-2026';
const CONSENT_TTL_MS = 5 * 60 * 1000; // 5 minutes

const router = Router();

// ── Auth helpers ──────────────────────────────────────────────────────────────
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production.');
  }
  return secret || 'suvidha-kiosk-dev-secret-2026-NOT-FOR-PRODUCTION';
}

function maskUid(uid) {
  const clean = (uid || '').replace(/\s/g, '');
  if (clean.length !== 12) return 'INVALID-UID';
  return `XXXX-XXXX-${clean.slice(-4)}`;
}

function maskMobile(mobile) {
  if (!mobile) return '**-****-****';
  const normalized = mobile.replace(/\D/g, '');
  return `**-****-${normalized.slice(-4)}`;
}

function normalizeMobile(mobile) {
  return (mobile || '').replace(/\D/g, '');
}

function isValidAadhaar(uid) {
  const clean = (uid || '').replace(/\s/g, '');
  if (!/^\d{12}$/.test(clean)) return false;
  if (/^(\d)\1{11}$/.test(clean)) return false;
  return true;
}

function formatCitizen(row, { maskContact = false } = {}) {
  return {
    uid: row.uid,
    name: row.name,
    nameHi: row.name_hi,
    nameAs: row.name_as || row.name_hi,
    dob: row.dob,
    gender: row.gender,
    mobile: maskContact ? maskMobile(row.mobile) : row.mobile,
    email: maskContact ? '****@****.***' : row.email,
    address: {
      house: row.house,
      street: row.street,
      landmark: row.landmark,
      city: row.city,
      cityId: row.city_id,
      district: row.district,
      state: row.state,
      stateId: row.state_id,
      pincode: row.pincode,
      ward: row.ward,
      wardId: row.ward_id,
    },
    photo: row.photo,
    disability: row.disability,
    bloodGroup: row.blood_group,
    language: row.language,
    category: row.category,
    occupation: row.occupation,
    annualIncome: row.annual_income,
    isAdmin: !!row.is_admin,
  };
}

// ── Consent token helpers ─────────────────────────────────────────────────────
function issueConsentToken(sessionId) {
  const ts = Date.now().toString();
  const mac = createHmac('sha256', CONSENT_SECRET)
    .update(`${sessionId}:${ts}`)
    .digest('hex');
  return `${ts}.${mac}`;
}

function verifyConsentToken(token, sessionId) {
  if (!token || !sessionId) return false;
  const dotIdx = token.indexOf('.');
  if (dotIdx === -1) return false;
  const ts = token.slice(0, dotIdx);
  const mac = token.slice(dotIdx + 1);
  if (Date.now() - Number(ts) > CONSENT_TTL_MS) return false;
  const expected = createHmac('sha256', CONSENT_SECRET)
    .update(`${sessionId}:${ts}`)
    .digest('hex');
  try {
    return timingSafeEqual(Buffer.from(mac, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

// ── UIDAI QR text parser ──────────────────────────────────────────────────────
// Handles v1 XML (text QR), DEMO: JSON (test), and plain 12-digit UID.
// Flask service (flask-aadhaar/app.py) decodes v2 Secure QR — a gzip+protobuf
// blob encoded as a long base10 digit string (hundreds of digits, NOT to be
// confused with Format 3 below which is exactly 12 digits — a bare typed UID).
// Most real Aadhaar cards issued since ~2018 use this v2 format; it was
// previously unhandled entirely — fell through to "Unrecognised QR format".
const AADHAAR_DECODER_URL = process.env.AADHAAR_DECODER_URL || 'http://localhost:5001';

async function decodeSecureQrV2(digitString) {
  const resp = await fetch(`${AADHAAR_DECODER_URL}/decode-secure-qr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ qrText: digitString }),
    signal: AbortSignal.timeout(8000),
  });
  if (!resp.ok) throw new Error(`Secure QR decoder returned ${resp.status}`);
  const result = await resp.json();
  if (!result.success) throw new Error(result.error || 'Secure QR decode failed');
  return result.data;
}

async function parseUidaiQrText(rawText) {
  const trimmed = rawText.trimStart();

  // Format 1: XML — v1 PrintLetterBarcodeData or v2 OfflinePaperlessKyc
  if (trimmed.startsWith('<')) {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const doc = parser.parse(trimmed);

    let uid = '', name = '', gender = '', dob = '', district = '', state = '', pincode = '';

    if (doc['PrintLetterBarcodeData']) {
      const r = doc['PrintLetterBarcodeData'];
      uid = r['@_uid'] || '';
      name = r['@_name'] || '';
      gender = r['@_gender'] || '';
      dob = r['@_dob'] || '';
      district = r['@_dist'] || '';
      state = r['@_state'] || '';
      pincode = r['@_pc'] || '';
    } else if (doc['OfflinePaperlessKyc']) {
      const r = doc['OfflinePaperlessKyc'];
      const poi = r['UidData']?.['Poi'] || {};
      const poa = r['UidData']?.['Poa'] || {};
      uid = r['@_uid'] || '';
      name = poi['@_name'] || '';
      gender = poi['@_gender'] || '';
      dob = poi['@_dob'] || '';
      district = poa['@_dist'] || '';
      state = poa['@_state'] || '';
      pincode = poa['@_pc'] || '';
    }

    return {
      uid, name, gender, dob, district, state, pincode,
      xmlStr: trimmed,
      hasSignature: trimmed.includes('<Signature'),
    };
  }

  // Format 2: DEMO JSON — for hackathon test QR codes
  if (trimmed.startsWith('DEMO:')) {
    try {
      const json = JSON.parse(trimmed.slice(5));
      return {
        uid: json.uid || '999988887777',
        name: json.name || 'Demo Citizen',
        gender: json.gender || 'M',
        dob: json.dob || '1980-01-01',
        district: json.city || 'Guwahati',
        state: 'Assam',
        pincode: '',
        xmlStr: null,
        hasSignature: false,
      };
    } catch {
      throw new Error('Invalid DEMO QR JSON');
    }
  }

  // Format 3: Plain 12-digit UID (typed/numeric QR) — check this BEFORE the
  // v2 Secure QR check below, since both are pure-digit strings but differ
  // by length (12 vs hundreds of digits).
  if (/^\d{12}$/.test(trimmed)) {
    return { uid: trimmed, name: '', gender: '', dob: '', district: '', state: '', pincode: '', xmlStr: null, hasSignature: false };
  }

  // Format 4: v2 Secure QR — long digit string (gzip+protobuf), real Aadhaar
  // cards issued since ~2018. Decoded via flask-aadhaar (pyaadhaar).
  if (/^\d{50,}$/.test(trimmed)) {
    const decoded = await decodeSecureQrV2(trimmed);
    return {
      uid: '', // v2 Secure QR doesn't embed the full UID, only last-4 elsewhere — leave blank, not guessable
      name: decoded.name || '',
      gender: decoded.gender || '',
      dob: decoded.dob || '',
      district: decoded.address?.district || '',
      state: decoded.address?.state || '',
      pincode: decoded.address?.pincode || '',
      xmlStr: null,
      hasSignature: false, // v2 Secure QR has its own embedded signature scheme, not the v1 XML <Signature> block
    };
  }

  throw new Error('Unrecognised QR format — expected UIDAI XML, DEMO:, 12-digit UID, or v2 Secure QR');
}

// ── UIDAI RSA-SHA256 signature verification ───────────────────────────────────
function verifyUidaiSignature(xmlStr) {
  if (!UIDAI_CERT_PEM) return { verified: false, reason: 'cert_not_loaded' };
  try {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const doc = parser.parse(xmlStr);

    const sigB64 =
      doc['OfflinePaperlessKyc']?.['Signature']?.['SignatureValue'] ||
      doc['PrintLetterBarcodeData']?.['Signature']?.['SignatureValue'];

    if (!sigB64) return { verified: false, reason: 'no_signature_element' };

    // Signed content is the XML with the Signature block removed
    const signedContent = xmlStr.replace(/<Signature[\s\S]*?<\/Signature>/g, '').trim();

    const cert = forge.pki.certificateFromPem(UIDAI_CERT_PEM);
    const md = forge.md.sha256.create();
    md.update(signedContent, 'utf8');
    const sigBytes = forge.util.decode64(sigB64.replace(/\s/g, ''));
    const valid = cert.publicKey.verify(md.digest().bytes(), sigBytes);

    return { verified: valid, reason: valid ? 'ok' : 'signature_mismatch' };
  } catch (err) {
    return { verified: false, reason: `verify_error: ${err.message}` };
  }
}

// ── POST /consent/issue ───────────────────────────────────────────────────────
// Frontend calls this before opening camera. Returns a short-lived HMAC token.
// Backend rejects any verify-qr call whose consent token is absent or expired.
router.post('/consent/issue', (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 128) {
    return res.status(400).json({ success: false, error: 'Valid sessionId required.' });
  }
  return res.json({ success: true, consentToken: issueConsentToken(sessionId.trim()) });
});

// ── POST /aadhaar/lookup ──────────────────────────────────────────────────────
router.post('/aadhaar/lookup', (req, res) => {
  const { uid } = req.body;
  if (!isValidAadhaar(uid)) {
    return res.status(400).json({ success: false, error: 'Invalid Aadhaar number. Must be 12 digits.' });
  }
  const cleaned = uid.replace(/\s/g, '');
  const db = req.app.locals.db;
  const row = db.prepare('SELECT * FROM citizens WHERE uid = ?').get(cleaned);
  if (!row) {
    return res.status(404).json({ success: false, error: 'Aadhaar not found. Please check the number and try again.' });
  }
  return res.json({ success: true, data: formatCitizen(row, { maskContact: true }) });
});

// ── POST /aadhaar/validate-mobile ─────────────────────────────────────────────
router.post('/aadhaar/validate-mobile', (req, res) => {
  const { uid, mobile } = req.body;
  if (!isValidAadhaar(uid)) {
    return res.status(400).json({ success: false, error: 'Invalid Aadhaar number.' });
  }
  const normalizedMobile = normalizeMobile(mobile);
  if (!/^[6-9]\d{9}$/.test(normalizedMobile)) {
    return res.status(400).json({ success: false, error: 'Invalid mobile number format.' });
  }
  const cleaned = uid.replace(/\s/g, '');
  const db = req.app.locals.db;
  const row = db.prepare('SELECT mobile FROM citizens WHERE uid = ?').get(cleaned);
  if (!row || normalizeMobile(row.mobile) !== normalizedMobile) {
    return res.status(400).json({ success: false, error: 'Mobile number does not match Aadhaar records.' });
  }
  return res.json({ success: true, maskedMobile: maskMobile(row.mobile) });
});

// ── POST /aadhaar/verify-qr ───────────────────────────────────────────────────
// Two paths:
//   A) { uid } — legacy/biometric fallback: SQLite lookup, no consent token required
//   B) { qrText, consentToken, sessionId } — QR scan: parse XML, verify signature, SQLite enrich
router.post('/aadhaar/verify-qr', async (req, res) => {
  const { uid, qrText, consentToken, sessionId } = req.body;

  // ── Path A: legacy uid-only (biometric / keypad flow) ───────────────────────
  if (uid && !qrText) {
    if (!isValidAadhaar(uid)) {
      return res.status(400).json({ success: false, error: 'Invalid Aadhaar number.' });
    }
    const cleaned = uid.replace(/\s/g, '');
    const db = req.app.locals.db;
    const citizen = db.prepare('SELECT * FROM citizens WHERE uid = ?').get(cleaned);
    if (!citizen) return res.status(404).json({ success: false, error: 'QR verification failed.' });

    const token = jwt.sign(
      { uid_suffix: cleaned.slice(-4), name: citizen.name, role: 'citizen' },
      getJwtSecret(),
      { expiresIn: '2h' }
    );
    console.log(`[AUDIT] QR login (uid): ${maskUid(cleaned)} | IP: ${req.ip}`);
    return res.json({ success: true, data: formatCitizen(citizen), token });
  }

  // ── Path B: QR text scan — requires valid consent token ─────────────────────
  if (!verifyConsentToken(consentToken, sessionId)) {
    return res.status(403).json({ success: false, error: 'Valid user consent required before scanning.' });
  }

  if (!qrText || typeof qrText !== 'string' || qrText.length > 50000) {
    return res.status(400).json({ success: false, error: 'qrText required.' });
  }

  let parsed;
  try {
    parsed = await parseUidaiQrText(qrText);
  } catch (err) {
    console.error('[AUTH] QR parse failed', err);
    return res.status(422).json({ success: false, error: 'QR code could not be read. Please try again.' });
  }

  // RSA signature check (best-effort — cert may not be present in dev)
  let sigStatus = { verified: false, reason: 'not_attempted' };
  if (parsed.hasSignature && parsed.xmlStr) {
    sigStatus = verifyUidaiSignature(parsed.xmlStr);
    if (!sigStatus.verified && UIDAI_CERT_PEM) {
      console.warn(`[AUTH] QR signature invalid: ${sigStatus.reason} | IP: ${req.ip}`);
      // Uncomment in production to reject tampered QRs:
      // return res.status(422).json({ success: false, error: 'UIDAI QR signature verification failed.' });
    }
  }

  // Enrich from local DB if UID is known
  const db = req.app.locals.db;
  let citizenData = null;
  if (parsed.uid && isValidAadhaar(parsed.uid)) {
    const dbRow = db.prepare('SELECT * FROM citizens WHERE uid = ?').get(parsed.uid);
    if (dbRow) citizenData = formatCitizen(dbRow);
  }

  // Fall back to QR-extracted fields (no DB record — real citizen with real Aadhaar)
  if (!citizenData) {
    citizenData = {
      uid_suffix: parsed.uid ? parsed.uid.slice(-4) : 'XXXX',
      name: parsed.name || 'Citizen',
      gender: parsed.gender || '',
      dob: parsed.dob || '',
      address: { district: parsed.district, state: parsed.state, pincode: parsed.pincode },
    };
  }

  const uidSuffix = parsed.uid ? parsed.uid.slice(-4) : 'XXXX';
  const token = jwt.sign(
    { uid_suffix: uidSuffix, name: citizenData.name, role: 'citizen' },
    getJwtSecret(),
    { expiresIn: '2h' }
  );

  console.log(`[AUDIT] QR login | uid_suffix: ${uidSuffix} | sig: ${sigStatus.reason} | IP: ${req.ip}`);

  return res.json({
    success: true,
    data: citizenData,
    token,
    verification: {
      signatureVerified: sigStatus.verified,
      certLoaded: !!UIDAI_CERT_PEM,
    },
  });
});

// ── POST /aadhaar/verify-biometric ───────────────────────────────────────────
router.post('/aadhaar/verify-biometric', (req, res) => {
  const { uid, method = 'fingerprint' } = req.body;
  if (!isValidAadhaar(uid)) {
    return res.status(400).json({ success: false, error: 'Invalid Aadhaar number.' });
  }
  const cleaned = uid.replace(/\s/g, '');
  const db = req.app.locals.db;
  const citizen = db.prepare('SELECT * FROM citizens WHERE uid = ?').get(cleaned);
  if (!citizen) return res.status(404).json({ success: false, error: 'Biometric verification failed.' });

  if (method === 'iris' && citizen.disability === 'visual') {
    return res.status(400).json({
      success: false,
      error: 'Iris scan not required for visually impaired citizens. Please use fingerprint verification.',
    });
  }

  const token = jwt.sign(
    { uid_suffix: cleaned.slice(-4), name: citizen.name, role: 'citizen' },
    getJwtSecret(),
    { expiresIn: '2h' }
  );
  console.log(`[AUDIT] Biometric (${method}) login: ${maskUid(cleaned)}`);
  return res.json({ success: true, data: formatCitizen(citizen), token });
});

// ── POST /admin/login — deprecated ───────────────────────────────────────────
router.post('/admin/login', (_req, res) => {
  return res.status(410).json({
    success: false,
    error: 'Legacy admin Aadhaar login is retired. Use /api/admin-auth/login with employee ID or official email.',
  });
});

export default router;
