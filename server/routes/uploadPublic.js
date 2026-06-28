/**
 * Public Upload Routes — phone upload via QR session + PIN
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/png',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPG, and PNG are allowed.'));
    }
  }
});

const hashPin = (sessionId, pin) =>
  crypto.createHash('sha256').update(`${sessionId}:${pin}`).digest('hex');

const getSession = (db, sessionId) =>
  db.prepare('SELECT * FROM upload_sessions WHERE session_id = ?').get(sessionId);

const getPublicBaseUrl = (req) => {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const forwardedHost = req.headers['x-forwarded-host'];
  const proto = forwardedProto || req.protocol || 'http';
  const host = forwardedHost || req.get('host');
  return `${proto}://${host}`;
};

const isSessionExpired = (session) => {
  if (!session || !session.expires_at) return true;
  return new Date(session.expires_at).getTime() < Date.now();
};

router.post('/:sessionId/verify-pin', (req, res) => {
  const { sessionId } = req.params;
  const { pin } = req.body || {};
  const db = req.app.locals.db;

  if (!pin) {
    return res.status(400).json({ success: false, error: 'PIN is required.' });
  }

  const session = getSession(db, sessionId);
  if (!session) {
    return res.status(404).json({ success: false, error: 'Session expired or invalid.' });
  }

  if (session.status !== 'active') {
    return res.status(410).json({ success: false, error: 'Session already used.' });
  }

  const pinHash = hashPin(sessionId, pin);
  if (pinHash !== session.pin_hash) {
    return res.status(401).json({ success: false, error: 'Invalid PIN.' });
  }

  if (isSessionExpired(session) && session.status !== 'complete') {
    return res.status(404).json({ success: false, error: 'Session expired or invalid.' });
  }

  return res.json({ success: true });
});

router.post('/:sessionId/files', upload.array('files', 5), (req, res) => {
  const { sessionId } = req.params;
  const pin = req.body?.pin;
  const db = req.app.locals.db;

  if (!pin) {
    return res.status(400).json({ success: false, error: 'PIN is required.' });
  }

  const session = getSession(db, sessionId);
  if (!session || isSessionExpired(session)) {
    return res.status(404).json({ success: false, error: 'Session expired or invalid.' });
  }

  if (session.status !== 'active') {
    return res.status(410).json({ success: false, error: 'Session already used.' });
  }

  const pinHash = hashPin(sessionId, pin);
  if (pinHash !== session.pin_hash) {
    return res.status(401).json({ success: false, error: 'Invalid PIN.' });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, error: 'No files uploaded.' });
  }

  const publicBaseUrl = getPublicBaseUrl(req);
  const files = req.files.map((f) => {
    db.prepare(`
      INSERT INTO uploads (session_id, filename, original_name, mime_type, size)
      VALUES (?, ?, ?, ?, ?)
    `).run(sessionId, f.filename, f.originalname, f.mimetype, f.size);

    const encodedFilename = encodeURIComponent(f.filename);
    const relativeUrl = `/uploads/${encodedFilename}`;
    return {
      name: f.originalname,
      size: formatSize(f.size),
      type: f.mimetype,
      url: relativeUrl,
      publicUrl: `${publicBaseUrl}${relativeUrl}`,
    };
  });

  db.prepare(
    'UPDATE upload_sessions SET status = ?, expires_at = datetime(\'now\'), updated_at = datetime(\'now\') WHERE session_id = ?'
  ).run('complete', sessionId);

  console.log(`[UPLOAD_PUBLIC] session=${sessionId} status=complete files=${files.length}`);

  return res.json({ success: true, files });
});

router.get('/:sessionId/status', (req, res) => {
  const { sessionId } = req.params;
  const pin = req.query?.pin;
  const db = req.app.locals.db;
  const publicBaseUrl = getPublicBaseUrl(req);

  if (!pin) {
    return res.status(400).json({ success: false, error: 'PIN is required.' });
  }

  const session = getSession(db, sessionId);
  if (!session) {
    return res.status(404).json({ success: false, error: 'Session expired or invalid.' });
  }

  const pinHash = hashPin(sessionId, pin);
  if (pinHash !== session.pin_hash) {
    return res.status(401).json({ success: false, error: 'Invalid PIN.' });
  }

  if (isSessionExpired(session) && session.status !== 'complete') {
    return res.status(404).json({ success: false, error: 'Session expired or invalid.' });
  }

  const files = db.prepare('SELECT * FROM uploads WHERE session_id = ?').all(sessionId);

  if (files.length === 0) {
    console.log(`[UPLOAD_PUBLIC] session=${sessionId} status=${session.status} files=0`);
    return res.json({
      success: true,
      status: session.status === 'complete' ? 'complete' : 'waiting',
      uploaded: false,
      files: [],
    });
  }

  console.log(`[UPLOAD_PUBLIC] session=${sessionId} status=complete files=${files.length}`);

  return res.json({
    success: true,
    status: 'complete',
    uploaded: true,
    filename: files[0]?.original_name || null,
    files: files.map((f) => ({
      name: f.original_name,
      size: formatSize(f.size),
      type: f.mime_type,
      url: `/uploads/${encodeURIComponent(f.filename)}`,
      publicUrl: `${publicBaseUrl}/uploads/${encodeURIComponent(f.filename)}`,
    })),
  });
});

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default router;
