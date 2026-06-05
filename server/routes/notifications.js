/**
 * Notification Routes — Real SMS via Fast2SMS (multilingual)
 * Sends SMS in the citizen's session language.
 * Supports: en, hi, as, bn, ta, te, kn, ml, mr, gu, pa, or, ur + fallback to en.
 */

import { Router } from 'express';
import axios from 'axios';

const router = Router();
const FAST2SMS_URL = 'https://www.fast2sms.com/dev/bulkV2';

// SMS templates per language
// Keep under 160 chars (ASCII) or 70 chars (Unicode) per segment
const SMS_TEMPLATES = {
  en: (type, ref, name) => `SUVIDHA Kiosk: Dear ${name}, your ${type} is registered. Ref: ${ref}. Track at kiosk. -Assam Govt`,
  hi: (type, ref, name) => `SUVIDHA: प्रिय ${name}, आपका ${type} पंजीकृत। Ref: ${ref}। किओस्क पर ट्रैक करें। -असम सरकार`,
  as: (type, ref, name) => `SUVIDHA: প্ৰিয় ${name}, আপোনাৰ ${type} পঞ্জীয়ন হৈছে। Ref: ${ref}। কিওস্কত Track কৰক। -অসম চৰকাৰ`,
  bn: (type, ref, name) => `SUVIDHA: প্রিয় ${name}, আপনার ${type} নথিভুক্ত হয়েছে। Ref: ${ref}। কিওস্কে ট্র্যাক করুন। -আসাম সরকার`,
  ta: (type, ref, name) => `SUVIDHA: ${name}, உங்கள் ${type} பதிவு செய்யப்பட்டது. Ref: ${ref}. கியோஸ்கில் கண்காணிக்கவும். -Assam Govt`,
  te: (type, ref, name) => `SUVIDHA: ${name}, మీ ${type} నమోదైంది. Ref: ${ref}. కియోస్క్‌లో ట్రాక్ చేయండి. -Assam Govt`,
  kn: (type, ref, name) => `SUVIDHA: ${name}, ನಿಮ್ಮ ${type} ನೋಂದಣಿಯಾಗಿದೆ. Ref: ${ref}. ಕಿಯೋಸ್ಕ್‌ನಲ್ಲಿ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ. -Assam Govt`,
  ml: (type, ref, name) => `SUVIDHA: ${name}, നിങ്ങളുടെ ${type} രജിസ്റ്റർ ചെയ്തു. Ref: ${ref}. കിയോസ്കിൽ ട്രാക്ക് ചെയ്യുക. -Assam Govt`,
  mr: (type, ref, name) => `SUVIDHA: ${name}, तुमचा ${type} नोंदणी झाली. Ref: ${ref}. किओस्कवर ट्रॅक करा. -Assam Govt`,
  gu: (type, ref, name) => `SUVIDHA: ${name}, તમારી ${type} નોંધણી થઈ. Ref: ${ref}. કિઓસ્ક પર ટ્રૅક કરો. -Assam Govt`,
  pa: (type, ref, name) => `SUVIDHA: ${name}, ਤੁਹਾਡੀ ${type} ਦਰਜ ਹੋ ਗਈ। Ref: ${ref}। ਕਿਓਸਕ 'ਤੇ ਟਰੈਕ ਕਰੋ। -Assam Govt`,
  or: (type, ref, name) => `SUVIDHA: ${name}, ଆପଣଙ୍କ ${type} ପଞ୍ଜୀକୃତ। Ref: ${ref}। କିଓସ୍କରେ ଟ୍ରାକ୍ କରନ୍ତୁ। -Assam Govt`,
  ur: (type, ref, name) => `SUVIDHA: ${name}، آپ کی ${type} درج ہو گئی۔ Ref: ${ref}۔ کیوسک پر ٹریک کریں۔ -Assam Govt`,
};

// Service type labels per language
const SERVICE_LABELS = {
  en: { complaint: "complaint", newConnection: "new connection", meterIssue: "meter request", profileUpdate: "profile update", default: "request" },
  hi: { complaint: "शिकायत", newConnection: "नया कनेक्शन", meterIssue: "मीटर अनुरोध", profileUpdate: "प्रोफाइल अपडेट", default: "अनुरोध" },
  as: { complaint: "abhijog", newConnection: "notun sangajog", meterIssue: "meter onurodh", profileUpdate: "profile update", default: "onurodh" },
  bn: { complaint: "obhijog", newConnection: "notun sangajog", meterIssue: "meter onurodh", profileUpdate: "profile update", default: "onurodh" },
  ta: { complaint: "pugar", newConnection: "putiya inaippu", meterIssue: "meter korikai", profileUpdate: "profile pudhuppu", default: "korikai" },
};

function getServiceLabel(serviceCategory, lang) {
  const labels = SERVICE_LABELS[lang] || SERVICE_LABELS.en;
  const key = (serviceCategory || '').toLowerCase();
  if (key.includes('complaint')) return labels.complaint;
  if (key.includes('connection')) return labels.newConnection;
  if (key.includes('meter')) return labels.meterIssue;
  if (key.includes('profile')) return labels.profileUpdate;
  return labels.default;
}

function buildMessage(documentType, documentId, citizenName, language) {
  const lang = (language || 'en').split('-')[0].toLowerCase();
  const template = SMS_TEMPLATES[lang] || SMS_TEMPLATES.en;
  const name = citizenName || 'Citizen';
  const ref = documentId || 'N/A';
  const type = getServiceLabel(documentType, lang);
  return template(type, ref, name);
}

async function sendSMS(mobile, message, isUnicode) {
  const apiKey = (process.env.FAST2SMS_API_KEY || '').trim();
  if (!apiKey) throw new Error('FAST2SMS_API_KEY not set');

  const resp = await axios.post(
    FAST2SMS_URL,
    {
      route: 'q',
      message,
      language: isUnicode ? 'unicode' : 'english',
      numbers: String(mobile),
    },
    { headers: { authorization: apiKey, 'Content-Type': 'application/json' }, timeout: 15000 }
  );

  if (!resp.data?.return) {
    const reason = Array.isArray(resp.data?.message)
      ? resp.data.message.join(' ')
      : (resp.data?.message || 'Fast2SMS failed');
    throw new Error(reason);
  }
  return resp.data;
}

// POST /api/notifications/send-receipt
router.post('/send-receipt', async (req, res) => {
  const { mobile, method, documentType, documentId, citizenName, language } = req.body;

  if (!mobile || !method) {
    return res.status(400).json({ success: false, error: 'mobile and method required' });
  }
  if (!/^[6-9]\d{9}$/.test(String(mobile))) {
    return res.status(400).json({ success: false, error: 'Invalid Indian mobile number' });
  }
  if (!['sms', 'whatsapp'].includes(method)) {
    return res.status(400).json({ success: false, error: 'method must be sms or whatsapp' });
  }

  const db = req.app.locals.db;
  const now = new Date().toISOString();
  const lang = (language || 'en').split('-')[0];

  try {
    db.prepare(`
      INSERT INTO notifications (mobile, method, document_type, document_id, status, created_at)
      VALUES (?, ?, ?, ?, 'pending', ?)
    `).run(mobile, method, documentType || 'Receipt', documentId || null, now);
  } catch { /* schema may vary */ }

  const message = buildMessage(documentType, documentId, citizenName, lang);
  const isUnicode = lang !== 'en';

  try {
    const result = await sendSMS(mobile, message, isUnicode);

    try {
      db.prepare(`UPDATE notifications SET status='sent' WHERE mobile=? AND document_id=? ORDER BY created_at DESC LIMIT 1`)
        .run(mobile, documentId || null);
    } catch { /* ok */ }

    const masked = `+91 XXXXXX${String(mobile).slice(-4)}`;
    return res.json({
      success: true,
      provider: 'fast2sms',
      language: lang,
      requestId: result.request_id || null,
      message: `SMS sent to ${masked} in ${lang.toUpperCase()}`,
      timestamp: now,
    });
  } catch (err) {
    console.error('[SMS] Fast2SMS error:', err.message);
    try {
      db.prepare(`UPDATE notifications SET status='failed' WHERE mobile=? AND document_id=? ORDER BY created_at DESC LIMIT 1`)
        .run(mobile, documentId || null);
    } catch { /* ok */ }

    return res.json({
      success: false,
      provider: 'fast2sms',
      error: err.message,
      message: 'SMS failed — receipt shown on screen',
      timestamp: now,
    });
  }
});

export default router;
