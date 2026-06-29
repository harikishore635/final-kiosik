/**
 * Chat Route — 4-tier cascade optimised for Indian languages
 *
 * Model priority:
 *   0. sarvam-105b  — Sarvam API direct (105B params, best Indian language AI)
 *   1. sarvamai/sarvam-m  — NVIDIA NIM (24B, fast Indian language fallback)
 *   2. meta/llama-3.1-8b-instruct — NVIDIA NIM (English fallback)
 *   3. google/gemma-2-2b-it  — HuggingFace (last resort)
 */

import { Router } from 'express';

const router = Router();

// ── Assamese translate-pivot helper ──────────────────────────────────────────
// Open-source LLMs reason poorly in Assamese directly.
// Pivot: user Assamese → English for LLM → Assamese for reply.
async function sarvamTranslate(text, srcLang, tgtLang) {
  const key = process.env.SARVAM_API_KEY;
  if (!key || !text?.trim()) return null;
  try {
    const res = await fetch('https://api.sarvam.ai/translate', {
      method: 'POST',
      headers: { 'api-subscription-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: text,
        source_language_code: srcLang,
        target_language_code: tgtLang,
        model: 'mayura:v1',
        mode: 'formal',
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.translated_text?.trim() || null;
  } catch {
    return null;
  }
}

// Per-IP rate limiter — 1 request per 3 seconds, sliding window
const rateLimitMap = new Map();
const RATE_LIMIT_MS = 3000;

function isRateLimited(ip) {
  const now = Date.now();
  const lastCall = rateLimitMap.get(ip);
  if (lastCall && now - lastCall < RATE_LIMIT_MS) return true;
  rateLimitMap.set(ip, now);
  // GC: prune stale entries every 200 unique IPs
  if (rateLimitMap.size > 200) {
    for (const [key, time] of rateLimitMap) {
      if (now - time > 60000) rateLimitMap.delete(key);
    }
  }
  return false;
}

// ── System prompt ──────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are SUVIDHA, a friendly voice assistant at a government kiosk in Assam, India. You help citizens access government services quickly and easily.

SERVICES YOU HANDLE:
- Electricity (APDCL): New connection, load extension, meter replacement/shifting, complaints, bill payment, track requests. Helpline: 1912
- Gas (AGCL): New gas connection, meter issues, bills, reconnect/disconnect, prepaid conversion, complaints. Helpline: 1906
- Municipal / Water (PHE Dept): Water connection, grievances (roads, sewage, garbage, streetlights), property tax, birth/death certificates. Helpline: 1533
- Healthcare (NHM Assam): Hospital appointments, vaccination, Ayushman Bharat, CMCHI scheme. Helpline: 104. Ambulance: 108
- Transport (ASTC/RTO): Bus pass, driving licence, vehicle registration, permits. Helpline: 0361-2234000
- Sanitation: Swachh Bharat toilet subsidy, solid waste complaints, drainage issues. File via Complaints menu.
- Government Schemes: PM-KISAN, PM Awas Yojana, MGNREGS, Orunodoi, scholarships, ration card, pension. Helpline: 14555
- Complaints & Grievances: Track any submitted complaint, escalate, get status updates

KEY SERVICE FACTS (use these for specific questions — do not hallucinate alternatives):

ELECTRICITY:
- New connection: Aadhaar + address proof + ownership proof + photo | ₹500–₹2000 fee | 15–30 working days
- Meter replacement: Consumer number + Aadhaar | Free | 7–14 working days
- Load extension: Consumer number + Aadhaar | ₹200/kW | 15 working days
- Billing complaint: Consumer number + bill copy | Free | 7 working days

GAS:
- New LPG connection: Aadhaar + address proof + photo + bank account | ₹1450 security deposit | 30 working days
- Cylinder booking: Consumer ID | Market rate | 2–5 days delivery
- Emergency gas leak: Call 1906 immediately

WATER:
- New connection: Aadhaar + address proof + no-dues certificate + site plan | ₹300–₹1000 | 30 working days
- Supply complaint: Consumer ID | Free | 3–7 working days
- Scheme: Jal Jeevan Mission — Har Ghar Nal Se Jal

HEALTHCARE:
- Ayushman Bharat (PMJAY): Aadhaar + Ration card + Income certificate | Free — covers up to ₹5 lakh hospitalisation | Card in 3–5 days | For BPL families
- CMCHI scheme: Assam state scheme — similar coverage, ask at Healthcare counter
- Hospital appointment: Aadhaar | Free at government hospitals | Appointment in 1–3 days
- Vaccination (COVID/flu/routine): Aadhaar + previous vaccination record | Free | Walk-in or appointment
- Ambulance: 108 (free, 24/7)

TRANSPORT:
- Driving licence (learner): Aadhaar + address proof + age proof + medical fitness + photo | ₹200 (LL) then ₹500 (DL) | 30 working days after test
- Vehicle registration: Invoice + insurance + PUC certificate + Aadhaar + address proof | Varies by vehicle | 7 working days
- Bus pass (ASTC): Aadhaar + photo + category proof (student/senior) | ₹150–₹500 | 3–5 working days

SANITATION:
- Swachh Bharat toilet subsidy: Aadhaar + BPL card + land ownership proof | Up to ₹12,000 subsidy | Apply via Complaints → Sanitation
- Solid waste / drainage complaint: Photo of issue (optional) | Free | 15 working days

GOVERNMENT SCHEMES:
- Orunodoi (Assam): ₹1250/month direct to bank | Economically weak Assam families | Aadhaar + BPL card + bank account
- PM-KISAN: ₹6000/year in 3 instalments | Small/marginal farmers with <2 hectares land | Aadhaar + land records + bank account
- PM Awas Yojana (Gramin): Up to ₹1.2 lakh for house construction | BPL families without pucca house | Aadhaar + BPL card + land proof
- MGNREGA: 100 days guaranteed employment/year | Any adult rural household | Aadhaar + Job card (get from Gram Panchayat)
- Pre/Post Matric Scholarship: ₹1000–₹10,000/year | SC/ST/OBC students, family income below ₹2.5 lakh | Aadhaar + caste certificate + income certificate + enrollment proof
- Old Age Pension (NOAP): ₹200–₹500/month | Seniors 60+, BPL | Aadhaar + age proof + BPL card
- Widow Pension: ₹300/month | Widows 40–79, BPL | Aadhaar + spouse death certificate + BPL card

REVENUE (Certificates):
- Income certificate: ₹30 | 10 working days | Aadhaar + salary slip or self-declaration + address proof
- Caste certificate (SC/ST/OBC): ₹30 | 10–15 working days | Aadhaar + parent's caste cert + birth certificate
- Land records (Jamabandi): ₹20 | Instant | Aadhaar + plot number (Dag) + Patta number

AADHAAR:
- New enrollment: Go to nearest authorized center (use Office Locator) | Free | 90 days
- Update (address/mobile): Existing Aadhaar + new address proof | ₹50 | 30 days. Helpline: 1947

REPLY RULES — FOLLOW STRICTLY:
1. Maximum 2 sentences. Never more.
2. Reply in the SAME language the user writes in.
3. Never expose your reasoning, thinking, or internal steps. Only give the final answer.
4. Guide with simple menu path: e.g. "Tap Gas → New Connection and follow the steps."
5. For unknown or off-topic questions: "I handle government services — please ask about electricity, gas, water, healthcare, transport, sanitation, or schemes."
6. Be warm, calm, direct. No technical jargon.
7. Never mention AI, models, NVIDIA, Sarvam, or any technology names.
8. For scheme queries: always mention the key eligibility criterion and the document needed.
9. Always give the helpline number when relevant.`;

// Strip <think>...</think> reasoning chains some models leak into responses
function stripThinkingTags(text) {
  if (!text) return text;
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^[\s\S]*?<\/think>/i, '')
    .replace(/Okay,?\s+the user[\s\S]{0,300}?(?=\n|$)/i, '')
    .replace(/Let me[\s\S]{0,200}?(?=\n|$)/i, '')
    .trim();
}

const CONTEXT_MAP = {
  electricity: 'User is on the Electricity (APDCL) page. Use ELECTRICITY facts from KEY SERVICE FACTS. Guide: Tap Electricity → select service → fill form.',
  gas: 'User is on the Assam Gas (AGCL) page. Use GAS facts from KEY SERVICE FACTS. Emergency gas leak → call 1906 immediately.',
  municipal: 'User is on the Municipal services page. Use WATER and REVENUE facts. Guide: Tap Municipal → select Water/Grievance/Property Tax.',
  healthcare: 'User is on the Healthcare page. Use HEALTHCARE facts from KEY SERVICE FACTS. Ayushman Bharat: BPL families, up to ₹5L coverage, needs Aadhaar+ration card+income cert.',
  transport: 'User is on the Transport page. Use TRANSPORT facts from KEY SERVICE FACTS. Guide: Tap Transport → select Licence/Registration/Bus Pass.',
  sanitation: 'User is on the Sanitation page. Use SANITATION facts. Swachh Bharat toilet subsidy: up to ₹12,000, needs Aadhaar+BPL card+land proof.',
  schemes: 'User is on the Schemes page. Use GOVERNMENT SCHEMES facts. Always state eligibility + required documents for any scheme. Orunodoi: ₹1250/month for Assam BPL families.',
  complaints: 'User is on the Complaints page. Help track complaints by request ID at Track Status. Escalation: re-submit with previous reference number.',
  water: 'User is on the Water services page. Use WATER facts. Jal Jeevan Mission covers free piped water. New connection needs Aadhaar + no-dues cert.',
};

// ── Tier 0: Sarvam 105B — direct Sarvam API (largest, best Indian language) ─
async function callSarvam105B(messages, signal) {
  const SARVAM_KEY = process.env.SARVAM_API_KEY;
  if (!SARVAM_KEY) return null;

  const response = await fetch('https://api.sarvam.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'api-subscription-key': SARVAM_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sarvam-105b',
      messages,
      max_tokens: 300,
      temperature: 0.5,
      top_p: 1,
      stream: false,
    }),
    signal,
  });

  if (!response.ok) {
    const err = await response.text().catch(() => '');
    console.warn('[Chat] Sarvam 105B unavailable:', response.status, err.slice(0, 120));
    return null;
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() || null;
}

// ── Tier 1: Sarvam AI via NVIDIA NIM (24B, fast fallback) ────────────────
async function callSarvamNIM(messages, signal) {
  const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
  if (!NVIDIA_API_KEY) return null;

  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${NVIDIA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'sarvamai/sarvam-m',
      messages,
      max_tokens: 250,
      temperature: 0.6,
      top_p: 0.9,
      stream: false,
    }),
    signal,
  });

  if (!response.ok) {
    const err = await response.text().catch(() => '');
    console.warn('[Chat] Sarvam NIM unavailable:', response.status, err.slice(0, 120));
    return null;
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() || null;
}

// ── Llama-3.1-8b via NVIDIA NIM (secondary) ───────────────────────────────
async function callLlamaNIM(messages, signal) {
  const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
  if (!NVIDIA_API_KEY) return null;

  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${NVIDIA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'meta/llama-3.3-70b-instruct',
      messages,
      max_tokens: 200,
      temperature: 0.7,
      top_p: 0.9,
    }),
    signal,
  });

  if (!response.ok) {
    const err = await response.text().catch(() => '');
    console.error('[Chat] Llama NIM error:', response.status, err.slice(0, 120));
    return null;
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() || null;
}

// ── HuggingFace Gemma-2 (last resort) ────────────────────────────────────
async function callHuggingFace(messages, signal) {
  const HF_TOKEN = process.env.HF_TOKEN;
  if (!HF_TOKEN) return null;

  const response = await fetch(
    'https://router.huggingface.co/hf-inference/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemma-2-2b-it',
        messages,
        max_tokens: 200,
        temperature: 0.7,
        top_p: 0.9,
      }),
      signal,
    }
  );

  if (!response.ok) {
    const err = await response.text().catch(() => '');
    console.error('[Chat] HuggingFace error:', response.status, err.slice(0, 120));
    return null;
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() || null;
}

// ── POST /api/chat ────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { message, language = 'en', context = '' } = req.body;

    // Input validation
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Message is required.' });
    }
    if (message.trim().length > 500) {
      return res.status(400).json({ success: false, error: 'Message too long.' });
    }

    // Sanitize input — strip HTML tags and control characters
    const sanitized = message.trim()
      .replace(/<[^>]*>/g, '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    const clientIP = req.ip || req.socket?.remoteAddress || 'unknown';
    if (isRateLimited(clientIP)) {
      return res.status(429).json({
        reply: language === 'hi'
          ? 'कृपया एक पल रुकें और फिर कोशिश करें।'
          : language === 'as'
          ? 'অনুগ্ৰহ কৰি এটু ৰাওক, তাৰ পিছত চেষ্টা কৰক।'
          : 'Please wait a moment before sending another message.',
        language,
      });
    }

    // Build system prompt with page context
    let systemPrompt = SYSTEM_PROMPT;
    const contextInfo = CONTEXT_MAP[context];
    systemPrompt += contextInfo ? `\n\nCurrent context: ${contextInfo}` : '\n\nUser is on the home screen. Give a friendly overview of available services if asked.';

    if (language && language !== 'en') {
      const langNames = { hi: 'Hindi', as: 'Assamese', bn: 'Bengali', ta: 'Tamil', te: 'Telugu', kn: 'Kannada' };
      const langName = langNames[language] || language;
      systemPrompt += `\n\nIMPORTANT: The user prefers ${langName}. If they write in ${langName}, respond in ${langName}. If they write in English, respond in English.`;
    }

    // Assamese translate-pivot: as-IN → en-IN for LLM, translate reply back.
    // Open models reason ~30% better in English than in Assamese directly.
    let pivotActive = false;
    let queryForLLM = sanitized;
    if (language === 'as') {
      const enQuery = await sarvamTranslate(sanitized, 'as-IN', 'en-IN');
      if (enQuery) { queryForLLM = enQuery; pivotActive = true; }
    }

    // When pivoting, override system prompt language instruction to use English
    if (pivotActive) {
      systemPrompt = systemPrompt.replace(
        /IMPORTANT: The user prefers Assamese[\s\S]*?\n/,
        'IMPORTANT: Reply ONLY in English. The response will be translated to Assamese.\n'
      );
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: queryForLLM },
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    let reply = null;
    let provider = 'sarvam-105b';

    // 0. Try Sarvam 105B direct — largest, best Indian language model
    try {
      reply = await callSarvam105B(messages, controller.signal);
    } catch (e) {
      if (e.name !== 'AbortError') console.warn('[Chat] Sarvam 105B failed:', e.message);
    }

    // 1. Fallback: Sarvam-M via NVIDIA NIM (24B)
    if (!reply) {
      provider = 'sarvam-nim';
      try {
        reply = await callSarvamNIM(messages, controller.signal);
      } catch (e) {
        if (e.name !== 'AbortError') console.warn('[Chat] Sarvam NIM call failed:', e.message);
      }
    }

    // 2. Fallback: Llama-3.1-8b via NVIDIA
    if (!reply) {
      provider = 'llama-nim';
      try {
        reply = await callLlamaNIM(messages, controller.signal);
      } catch (e) {
        if (e.name !== 'AbortError') console.warn('[Chat] Llama NIM call failed:', e.message);
      }
    }

    // 3. Last resort: HuggingFace Gemma-2
    if (!reply) {
      provider = 'huggingface';
      try {
        reply = await callHuggingFace(messages, controller.signal);
      } catch (e) {
        if (e.name !== 'AbortError') console.error('[Chat] HuggingFace call failed:', e.message);
      }
    }

    clearTimeout(timeout);

    if (!reply) {
      if (!process.env.NVIDIA_API_KEY && !process.env.HF_TOKEN) {
        console.error('[Chat] No AI provider configured — set NVIDIA_API_KEY or HF_TOKEN in .env');
        return res.json({
          reply: language === 'hi'
            ? 'AI सेवा उपलब्ध नहीं है। मेनू से सेवा चुनें।'
            : 'AI service is not configured. Please use the menu to navigate services.',
          language,
          provider: 'none',
        });
      }
      return res.json({
        reply: language === 'hi'
          ? 'सेवा अभी उपलब्ध नहीं। कृपया मेनू का उपयोग करें या फिर कोशिश करें।'
          : language === 'as'
          ? 'সেৱা এতিয়া উপলব্ধ নহয়। মেনু ব্যৱহাৰ কৰক বা পুনৰ চেষ্টা কৰক।'
          : 'Service temporarily unavailable. Please use the menu or try again.',
        language,
        provider: 'none',
      });
    }

    let cleanReply = stripThinkingTags(reply);

    // Translate LLM reply back to Assamese if pivot was active
    if (pivotActive && cleanReply) {
      const asReply = await sarvamTranslate(cleanReply, 'en-IN', 'as-IN');
      if (asReply) cleanReply = asReply;
    }

    console.log(`[Chat] Reply via ${provider} | lang=${language} | pivot=${pivotActive} | ctx=${context || 'home'}`);
    return res.json({ reply: cleanReply, language, provider: 'suvidha-ai' });

  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('[Chat] Request timeout');
    } else {
      console.error('[Chat] Unhandled error:', err.message);
    }
    return res.json({
      reply: 'Service temporarily unavailable. Please use the menu or try again.',
      language: req.body?.language || 'en',
      provider: 'error',
    });
  }
});

export default router;
