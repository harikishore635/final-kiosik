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
const SYSTEM_PROMPT = `You are SUVIDHA, a friendly voice assistant at a government kiosk in Assam, India.

SERVICES YOU HANDLE:
- Electricity (APDCL): New connection, load extension, meter replacement/shifting, complaints, track requests
- Gas (AGCL): New gas connection, meter issues, bills, reconnect/disconnect, prepaid conversion, complaints
- Municipal: Water connection, grievances (roads, sewage, garbage, streetlights), property tax, track requests

REPLY RULES — FOLLOW STRICTLY:
1. Maximum 2 sentences. Never more.
2. Reply in the SAME language the user writes in.
3. Never expose your reasoning, thinking, or internal steps. Only give the final answer.
4. Guide with simple menu path: e.g. "Tap Gas → New Connection and follow the steps."
5. For unknown or off-topic questions: "I can only help with electricity, gas, and municipal services here."
6. Be warm, calm, direct. No technical jargon.
7. Never mention AI, models, NVIDIA, Sarvam, or any technology names.`;

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
  electricity: 'User is currently in the Electricity services section. Help them with electricity-specific tasks.',
  gas: 'User is in the Assam Gas Department section. Help with gas connections, bills, meter issues.',
  municipal: 'User is in the Municipal services section. Help with water, sewage, roads, streetlights, property tax.',
  healthcare: 'User is in the Healthcare section. Help with hospital appointments, health camps, vaccination.',
  transport: 'User is in the Transport section. Help with bus routes, schedules, ticket booking.',
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
      model: 'meta/llama-3.1-8b-instruct',
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

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: sanitized },
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

    const cleanReply = stripThinkingTags(reply);
    console.log(`[Chat] Reply via ${provider} | lang=${language} | ctx=${context || 'home'}`);
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
