/**
 * SUVIDHA Kiosk Backend — Main Server
 * Express + SQLite (better-sqlite3) for a self-contained, zero-config backend.
 *
 * Security layers:
 *  - Helmet.js: sets 14 HTTP security headers (CSP, HSTS, X-Frame-Options, etc.)
 *  - JWT auth: token-based session management, verified on protected routes
 *  - Rate limiting: global (100/15min) + auth (10/15min) + chat (20/15min)
 *  - CORS: strict in production
 *  - Input sanitization middleware: strips HTML tags + control chars from all req.body strings
 *  - Audit logging: all auth events and sensitive operations logged with IP + timestamp
 *  - Security headers: nosniff, noopen, XSS protection on static files
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { initDB } from './db.js';
import { verifyToken, requireAdmin } from './middleware/authMiddleware.js';
import { securityHeaders, requestLogger } from './middleware/enterprise/observability.js';
import { verifyJWT, requireActorType, rateLimiter as enterpriseRateLimiter } from './middleware/enterprise/authz.js';
import { csrfProtection } from './middleware/enterprise/csrfProtection.js';
import authRoutes from './routes/auth.js';
import adminAuthRoutes from './routes/adminAuth.js';
import otpRoutes from './routes/otp.js';
import serviceRoutes from './routes/services.js';
import complaintRoutes from './routes/complaints.js';
import transportRoutes from './routes/transport.js';
import trackRoutes from './routes/track.js';
import schemeRoutes from './routes/schemes.js';
import officeRoutes from './routes/offices.js';
import adminRoutes from './routes/admin.js';
import kioskAdminSystemRoutes from './routes/kioskAdminSystem.js';
import organizationPortalRoutes from './routes/organizationPortals.js';
import superAdminPortalRoutes from './routes/superAdminPortal.js';
import securityCenterRoutes from './routes/securityCenter.js';
import alertRoutes from './routes/alerts.js';
import uploadRoutes from './routes/upload.js';
import uploadPublicRoutes from './routes/uploadPublic.js';
import notificationRoutes from './routes/notifications.js';
import referenceRoutes from './routes/reference.js';
import syncRoutes from './routes/sync.js';
import sarvamRoutes from './routes/sarvam.js';
import chatRoutes from './routes/chat.js';
import envRoutes from './routes/env.js';
import { createRealtimeServer } from './socket/realtime.js';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 8080;
const isProd = process.env.NODE_ENV === 'production';
const trustProxyRaw = process.env.TRUST_PROXY;
if (typeof trustProxyRaw === 'string' && trustProxyRaw.length > 0) {
  if (trustProxyRaw.toLowerCase() === 'true') {
    app.set('trust proxy', 1);
  } else if (trustProxyRaw.toLowerCase() === 'false') {
    app.set('trust proxy', false);
  } else {
    const numeric = Number(trustProxyRaw);
    app.set('trust proxy', Number.isFinite(numeric) ? numeric : trustProxyRaw);
  }
} else {
  app.set('trust proxy', isProd ? 1 : false);
}

// ─── Helmet — 14 Security Headers ────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],     // needed for React inline scripts
      styleSrc: ["'self'", "'unsafe-inline'"],       // needed for Tailwind
      imgSrc: ["'self'", 'data:', 'blob:', 'https://api.maptiler.com'],          // allow base64 images
      mediaSrc: ["'self'", 'blob:'],                 // audio blobs for TTS
      workerSrc: ["'self'", 'blob:'],
      connectSrc: [
        "'self'",
        'https://api.maptiler.com',
        'https://router.project-osrm.org',
        'https://api.sarvam.ai',
        'https://integrate.api.nvidia.com',
        'https://router.huggingface.co',
      ],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,   // needed for audio blobs to work in kiosk browser
  hsts: process.env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true }
    : false,
}));

// ─── Rate Limiting ─────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please try again later.' },
  skip: (req) => req.path.startsWith('/api/upload') || req.path.startsWith('/api/upload-public'),
});

// Auth endpoints: strict 10/15min to block OTP brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 10 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many login attempts. Please wait 15 minutes.' },
});

// Chat AI: 20/15min — generous for kiosk use but prevents API key abuse
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Chat rate limit reached. Please wait a moment.' },
});

// ─── CORS ──────────────────────────────────────────────────────────────────
const defaultAllowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];
const configuredOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = configuredOrigins.length > 0 ? configuredOrigins : defaultAllowedOrigins;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (!isProd) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  exposedHeaders: ['X-CSRF-Token'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(globalLimiter);
app.use(securityHeaders);
app.use(requestLogger);

// ─── Input Sanitization Middleware ────────────────────────────────────────
// Strips HTML tags and dangerous control characters from all string fields in req.body.
// This is a defence-in-depth layer — each route also validates its own inputs.
app.use((req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
});

function sanitizeObject(obj, depth = 0) {
  if (depth > 5) return obj; // prevent deep recursion on malicious payloads
  if (typeof obj === 'string') {
    return obj
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')  // script tags
      .replace(/<[^>]+>/g, '')                               // all HTML tags
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')    // control chars
      .trim();
  }
  if (Array.isArray(obj)) return obj.map(item => sanitizeObject(item, depth + 1));
  if (obj !== null && typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip binary/buffer fields
      if (Buffer.isBuffer(value)) { sanitized[key] = value; continue; }
      sanitized[key] = sanitizeObject(value, depth + 1);
    }
    return sanitized;
  }
  return obj;
}

// ─── Audit Logging Middleware ─────────────────────────────────────────────
// Logs all auth, service, and complaint operations with IP and timestamp.
// In production this should write to a persistent log file or SIEM.
const AUDIT_ROUTES = [
  '/api/auth',
  '/api/admin-auth',
  '/api/service-requests',
  '/api/complaints',
  '/api/admin',
  '/api/upload',
  '/api/kiosk-admin',
  '/api/org-portals',
  '/api/super-admin',
  '/api/security-center',
];

app.use((req, _res, next) => {
  const shouldAudit = AUDIT_ROUTES.some(r => req.path.startsWith(r));
  if (shouldAudit && req.method !== 'GET') {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const userId = req.user?.aadhaar ? `***${req.user.aadhaar.slice(-4)}` : 'unauthenticated';
    // Never log actual Aadhaar numbers, tokens, or passwords
    console.log(`[AUDIT] ${new Date().toISOString()} | ${req.method} ${req.path} | IP: ${ip} | User: ${userId}`);
  }
  next();
});

// ─── Static Files (uploaded documents) ────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Prevent browsers from executing uploaded content as scripts
    res.setHeader('Content-Security-Policy', "default-src 'none'");
  },
}));

// ─── CSRF Token ────────────────────────────────────────────────────────────
app.get('/api/csrf-token', async (req, res) => {
  const crypto = await import('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  res.json({ csrfToken: token });
});

// ─── PUBLIC ROUTES (no auth required) ────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/admin-auth', authLimiter, adminAuthRoutes);
app.use('/api/otp', authLimiter, otpRoutes);
app.use('/api/track', trackRoutes);
app.use('/api/reference', referenceRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/upload-public', uploadPublicRoutes);
app.use('/api/schemes', schemeRoutes);
app.use('/api/offices', officeRoutes);
app.use('/api/env', envRoutes);

// ─── SARVAM AI ROUTES (public for voice features) ────────────────────────
app.use('/api/sarvam', sarvamRoutes);

// ─── CHATBOT ROUTE (public — Sarvam via NVIDIA NIM + fallbacks) ───────────
app.use('/api/chat', chatLimiter, chatRoutes);

// ─── PROTECTED ROUTES (JWT auth required) ────────────────────────────────
app.use('/api/service-requests', verifyToken, serviceRoutes);
app.use('/api/complaints', verifyToken, complaintRoutes);
app.use('/api/transport', verifyToken, transportRoutes);
app.use('/api/upload', verifyToken, uploadRoutes);
app.use('/api/notifications', verifyToken, notificationRoutes);
app.use('/api/sync', verifyToken, syncRoutes);

// ─── ADMIN ROUTES (JWT + admin role required) ─────────────────────────────
app.use('/api/admin', verifyToken, requireAdmin, adminRoutes);
app.use('/api/kiosk-admin', enterpriseRateLimiter, verifyJWT, requireActorType('admin'), csrfProtection, kioskAdminSystemRoutes);
app.use('/api/org-portals', enterpriseRateLimiter, verifyJWT, requireActorType('admin'), csrfProtection, organizationPortalRoutes);
app.use('/api/super-admin', enterpriseRateLimiter, verifyJWT, requireActorType('admin'), csrfProtection, superAdminPortalRoutes);
app.use('/api/security-center', enterpriseRateLimiter, verifyJWT, requireActorType('admin'), csrfProtection, securityCenterRoutes);

// ─── Health Check ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    security: 'helmet+jwt+ratelimit+sanitization',
  });
});

// ─── 404 handler ───────────────────────────────────────────────────────────
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: 'API endpoint not found.' });
});

// ─── Global Error Handler ──────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  // Never expose internal error details to clients unless explicitly
  // opted into via DEBUG_ERRORS — defaulting on "not production" leaked
  // stack/message text to every kiosk user whenever NODE_ENV was unset.
  console.error('[ERROR]', err.message, err.stack);
  const debugErrors = process.env.DEBUG_ERRORS === 'true';
  res.status(err.status || 500).json({
    success: false,
    error: debugErrors ? err.message : 'Internal server error',
  });
});

// ─── Start Server ──────────────────────────────────────────────────────────
const db = initDB();
app.locals.db = db;
createRealtimeServer(httpServer, app);

// ─── API Key Checks ─────────────────────────────────────────────────────────
const sarvamKey = process.env.SARVAM_API_KEY;
const nvidiaKey = process.env.NVIDIA_API_KEY;
const hfToken   = process.env.HF_TOKEN;
const fast2smsKey = process.env.FAST2SMS_API_KEY;

if (!sarvamKey || sarvamKey === 'test-key' || sarvamKey.length < 10) {
  console.warn('\n  ⚠️  SARVAM_API_KEY not configured. Voice features (TTS, STT, translation) will be limited.\n');
}
if (!nvidiaKey) {
  console.warn('  ⚠️  NVIDIA_API_KEY not set. Sarvam-1 + Llama chat will be disabled. Set for best AI quality.\n');
}
if (!hfToken) {
  console.warn('  ℹ️  HF_TOKEN not set. HuggingFace fallback chat disabled.\n');
}
if (!fast2smsKey) {
  console.warn('  ⚠️  FAST2SMS_API_KEY not set. Real SMS OTP delivery will fail.\n');
}

httpServer.listen(PORT, () => {
  console.log(`\n  ✅  SUVIDHA Backend v2.0 running on http://localhost:${PORT}`);
  console.log(`  🔒  Security: Helmet CSP + JWT + Rate limiting + Input sanitization + Audit logging`);
  console.log(`  🤖  AI Chat: Sarvam-1 (NVIDIA NIM) → Llama-3.1-8b → Gemma-2 fallback`);
  console.log(`  🎙️  Voice: Sarvam AI TTS/STT (12 Indian languages) + Barge-in detection`);
  console.log(`  📡  Sarvam AI: ${sarvamKey && sarvamKey !== 'test-key' ? '✅ CONFIGURED' : '❌ NOT CONFIGURED'}`);
  console.log(`  🟢  NVIDIA NIM: ${nvidiaKey ? '✅ CONFIGURED' : '❌ NOT SET'}`);
  console.log(`  📨  Fast2SMS OTP: ${fast2smsKey ? '✅ CONFIGURED' : '❌ NOT SET'}\n`);
});

export default app;
