/**
 * Sarvam AI Proxy Routes
 * Uses the official sarvamai SDK + direct REST for streaming TTS.
 * API key stays server-side — never exposed to client.
 */

import { Router } from 'express';
import axios from 'axios';
import multer from 'multer';
import FormData from 'form-data';
import { SarvamAIClient } from 'sarvamai';

const router = Router();
const upload = multer(); // For handling audio file uploads in STT

// Sarvam config - reads env at request time (not module load time for ESM compatibility)
const getSarvamConfig = () => ({
    baseURL: 'https://api.sarvam.ai',
    headers: {
        'api-subscription-key': process.env.SARVAM_API_KEY || 'test-key',
    },
});

// POST /api/sarvam/speech-to-text (Saaras v3) — using sarvamai SDK
router.post('/speech-to-text', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Audio file is required' });
        }

        const languageCode = req.body.language_code || 'unknown';

        // Use sarvamai SDK for proper integration
        const client = new SarvamAIClient({ apiSubscriptionKey: process.env.SARVAM_API_KEY });

        // Convert buffer to Blob for SDK
        const audioBlob = new Blob([req.file.buffer], { type: req.file.mimetype || 'audio/webm' });
        const audioFile = new File([audioBlob], req.file.originalname || 'recording.webm', {
            type: req.file.mimetype || 'audio/webm',
        });

        const result = await client.speechToText.transcribe({
            file: audioFile,
            model: 'saaras:v3',
            languageCode: languageCode === 'unknown' ? undefined : languageCode,
        });

        res.json({ transcript: result.transcript, language_code: result.language_code, provider: 'sarvam-sdk' });
    } catch (err) {
        console.error('[Sarvam STT Error]', err.message);
        // Fallback to direct REST API if SDK fails
        try {
            if (!req.file) throw new Error('No file');
            const formData = new FormData();
            formData.append('file', req.file.buffer, {
                filename: req.file.originalname || 'recording.webm',
                contentType: req.file.mimetype || 'audio/webm',
            });
            formData.append('model', 'saaras:v3');
            if (req.body.language_code) formData.append('language_code', req.body.language_code);

            const config = getSarvamConfig();
            const sarvamRes = await axios.post(`${config.baseURL}/speech-to-text`, formData, {
                headers: { ...config.headers, ...formData.getHeaders() },
                timeout: 15000,
            });
            res.json({ ...sarvamRes.data, provider: 'sarvam-rest' });
        } catch (fallbackErr) {
            res.status(500).json({ error: 'STT failed', detail: fallbackErr.message });
        }
    }
});

// POST /api/sarvam/text-to-speech (Bulbul v3)
router.post('/text-to-speech', async (req, res) => {
    try {
        const { inputs, target_language_code, expected_gender = 'male', model = 'bulbul:v3' } = req.body;

        if (!inputs || !target_language_code) {
            return res.status(400).json({ success: false, error: 'inputs and target_language_code are required' });
        }

        const payload = {
            inputs,
            target_language_code,
            speaker_gender: expected_gender, // Adjusted param name based on standard usage
            model,
        };

        const config = getSarvamConfig();
        const sarvamRes = await axios.post(`${config.baseURL}/text-to-speech`, payload, {
            headers: { ...config.headers, 'Content-Type': 'application/json' },
        });

        // Sarvam TTS returns JSON with base64 audio: { audios: ["base64..."] }
        // Convert to binary WAV so frontend can play it directly
        const data = sarvamRes.data;
        if (data.audios && data.audios.length > 0) {
            const audioBase64 = data.audios[0];
            const audioBuffer = Buffer.from(audioBase64, 'base64');
            res.set('Content-Type', 'audio/wav');
            res.send(audioBuffer);
        } else {
            // Fallback: forward raw response
            res.json(data);
        }
    } catch (err) {
        console.error('[Sarvam TTS Error]', err.response?.data || err.message);
        res.status(err.response?.status || 500).json({ error: 'TTS failed' });
    }
});

// POST /api/sarvam/translate 
router.post('/translate', async (req, res) => {
    try {
        const { input, source_language_code, target_language_code, speaker_gender, model, enable_preprocessing } = req.body;

        if (!input || !source_language_code || !target_language_code) {
            return res.status(400).json({ success: false, error: 'input, source and target languages required' });
        }

        const payload = {
            input,
            source_language_code,
            target_language_code,
            speaker_gender: speaker_gender || 'Male',
            model: model || 'mayura:v1',
            mode: 'formal',
            enable_preprocessing: enable_preprocessing || false
        };

        const config = getSarvamConfig();
        const sarvamRes = await axios.post(`${config.baseURL}/translate`, payload, {
            headers: {
                ...config.headers,
                'Content-Type': 'application/json'
            }
        });

        res.json(sarvamRes.data);
    } catch (err) {
        console.error('[Sarvam Translate Error]', err.response?.data || err.message);
        res.status(err.response?.status || 500).json(err.response?.data || { error: 'Translation failed' });
    }
});

// POST /api/sarvam/batch-translate — Translate an array of strings in one request
// Used by the dynamic i18n translation service for all 22 languages
router.post('/batch-translate', async (req, res) => {
    try {
        const { texts, source_language_code, target_language_code, speaker_gender, model, mode } = req.body;

        if (!texts || !Array.isArray(texts) || texts.length === 0) {
            return res.status(400).json({ success: false, error: 'texts array is required' });
        }
        if (!source_language_code || !target_language_code) {
            return res.status(400).json({ success: false, error: 'source and target language codes required' });
        }

        // If source == target, return as-is
        if (source_language_code === target_language_code) {
            return res.json({ translations: texts });
        }

        const config = getSarvamConfig();
        const translations = [];

        // Sarvam translate endpoint handles one string at a time
        // Process in parallel with concurrency limit of 5
        const CONCURRENCY = 5;
        for (let i = 0; i < texts.length; i += CONCURRENCY) {
            const batch = texts.slice(i, i + CONCURRENCY);
            const promises = batch.map(async (text) => {
                // Skip empty strings
                if (!text || text.trim() === '') return text;

                try {
                    const payload = {
                        input: text,
                        source_language_code,
                        target_language_code,
                        speaker_gender: speaker_gender || 'Male',
                        model: model || 'mayura:v1',
                        mode: mode || 'formal',
                        enable_preprocessing: false
                    };

                    const sarvamRes = await axios.post(`${config.baseURL}/translate`, payload, {
                        headers: { ...config.headers, 'Content-Type': 'application/json' },
                    });

                    return sarvamRes.data?.translated_text || text;
                } catch (err) {
                    console.warn(`[Batch Translate] Failed for: "${text.substring(0, 30)}..."`, err.response?.status);
                    return text; // Return original on failure
                }
            });

            const results = await Promise.all(promises);
            translations.push(...results);
        }

        res.json({ translations, count: translations.length });
    } catch (err) {
        console.error('[Sarvam Batch Translate Error]', err.message);
        res.status(500).json({ error: 'Batch translation failed' });
    }
});

// ═══════════════════════════════════════════════════════════════
// ← NEW: Universal endpoints for 22-language support via languageRouter
// ═══════════════════════════════════════════════════════════════

import { routeSTT, routeTranslate, routeTTS } from '../services/languageRouter.js';

// POST /api/sarvam/universal-stt
// Body: multipart/form-data with audio file + langCode field
router.post('/universal-stt', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'Audio file is required.' });
        }
        const langCode = req.body.langCode || 'en';
        const result = await routeSTT(req.file.buffer, langCode);

        if (result.error) {
            return res.status(500).json({ success: false, error: result.message });
        }
        res.json({ success: true, text: result.text, provider: result.provider });
    } catch (err) {
        console.error('[Universal STT Error]', err.message);
        res.status(500).json({ success: false, error: 'Universal STT failed.' });
    }
});

// POST /api/sarvam/universal-translate
// Body: { text, sourceLang, targetLang }
router.post('/universal-translate', async (req, res) => {
    try {
        const { text, sourceLang, targetLang } = req.body;
        if (!text || !sourceLang || !targetLang) {
            return res.status(400).json({ success: false, error: 'text, sourceLang, targetLang required.' });
        }
        const result = await routeTranslate(text, sourceLang, targetLang);

        if (result.error) {
            return res.status(500).json({ success: false, error: result.message });
        }
        res.json({ success: true, translatedText: result.text, provider: result.provider });
    } catch (err) {
        console.error('[Universal Translate Error]', err.message);
        res.status(500).json({ success: false, error: 'Universal translation failed.' });
    }
});

// POST /api/sarvam/universal-tts
// Body: { text, langCode }
router.post('/universal-tts', async (req, res) => {
    try {
        const { text, langCode } = req.body;
        if (!text || !langCode) {
            return res.status(400).json({ success: false, error: 'text and langCode required.' });
        }
        const result = await routeTTS(text, langCode);

        if (result.error) {
            return res.status(500).json({ success: false, error: result.message });
        }
        res.json({
            success: true,
            audioBase64: result.audioBase64,
            mimeType: 'audio/wav',
            provider: result.provider,
        });
    } catch (err) {
        console.error('[Universal TTS Error]', err.message);
        res.status(500).json({ success: false, error: 'Universal TTS failed.' });
    }
});

// GET /api/sarvam/status — Check if API key is configured (no key exposed)
router.get('/status', (_req, res) => {
    const key = process.env.SARVAM_API_KEY;
    const configured = Boolean(key && key !== 'test-key' && key.length > 10);
    res.json({ configured });
});

// POST /api/sarvam/tts-bridge
// Body: { text, sourceLangCode }
// For languages Sarvam TTS doesn't support — translates to Hindi then TTS in Hindi.
// This keeps API keys server-side and is the recommended path for bridge languages.
router.post('/tts-bridge', async (req, res) => {
    try {
        const { text, sourceLangCode } = req.body;
        if (!text || !sourceLangCode) {
            return res.status(400).json({ success: false, error: 'text and sourceLangCode required' });
        }

        const config = getSarvamConfig();

        // Step 1: Translate to Hindi
        let textToSpeak = text;
        try {
            const translatePayload = {
                input: text,
                source_language_code: sourceLangCode.includes('-') ? sourceLangCode : `${sourceLangCode}-IN`,
                target_language_code: 'hi-IN',
                model: 'mayura:v1',
                mode: 'formal',
                enable_preprocessing: false,
            };
            const translateRes = await axios.post(`${config.baseURL}/translate`, translatePayload, {
                headers: { ...config.headers, 'Content-Type': 'application/json' },
                timeout: 8000,
            });
            const translated = translateRes.data?.translated_text;
            if (translated) textToSpeak = translated;
        } catch (translateErr) {
            console.warn('[TTS Bridge] Translate step failed, using original text:', translateErr.message);
        }

        // Step 2: TTS in Hindi
        const ttsPayload = {
            inputs: [textToSpeak],
            target_language_code: 'hi-IN',
            speaker_gender: 'female',
            model: 'bulbul:v3',
        };
        const ttsRes = await axios.post(`${config.baseURL}/text-to-speech`, ttsPayload, {
            headers: { ...config.headers, 'Content-Type': 'application/json' },
            timeout: 15000,
        });

        const data = ttsRes.data;
        if (data.audios && data.audios.length > 0) {
            const audioBuffer = Buffer.from(data.audios[0], 'base64');
            res.set('Content-Type', 'audio/wav');
            return res.send(audioBuffer);
        }
        res.status(500).json({ error: 'TTS bridge returned no audio' });
    } catch (err) {
        console.error('[TTS Bridge Error]', err.response?.data || err.message);
        res.status(err.response?.status || 500).json({ error: 'TTS bridge failed' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// STREAMING TTS — POST /api/sarvam/text-to-speech-stream
// Uses Sarvam's /text-to-speech/stream endpoint.
// Audio starts playing on the client within ~200ms (vs 2-3s for batch TTS).
// Returns streaming MP3 — proxied directly to client.
// Body: { text, target_language_code, speaker, pace, enable_preprocessing }
// ═══════════════════════════════════════════════════════════════════════════

// Speaker voice map — bulbul:v3 compatible speakers only
// Available: aditya, ritu, ashutosh, priya, neha, rahul, pooja, rohan, simran,
// kavya, amit, dev, ishita, shreya, ratan, varun, manan, sumit, roopa, kabir,
// aayan, shubh, advait, anand, tanya, tarun, sunny, mani, gokul, vijay, shruti,
// suhani, mohit, kavitha, rehan, soham, rupali, niharika
const SARVAM_SPEAKERS = {
  'hi-IN': 'anand',    // Hindi male — clear, warm
  'en-IN': 'ritu',     // English female — Indian accent
  'ta-IN': 'kavitha',  // Tamil
  'te-IN': 'ratan',    // Telugu
  'kn-IN': 'mani',     // Kannada
  'ml-IN': 'roopa',    // Malayalam
  'mr-IN': 'sumit',    // Marathi
  'gu-IN': 'pooja',    // Gujarati
  'bn-IN': 'neha',     // Bengali
  'or-IN': 'priya',    // Odia
  'pa-IN': 'rahul',    // Punjabi
  'as-IN': 'anand',    // Assamese → bridge to Hindi voice (Sarvam as-IN needs beta)
};

router.post('/text-to-speech-stream', async (req, res) => {
    try {
        const {
            text,
            target_language_code = 'hi-IN',
            speaker,
            pace = 1.0,
            enable_preprocessing = true,
        } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'text is required' });
        }

        const config = getSarvamConfig();
        const resolvedSpeaker = speaker || SARVAM_SPEAKERS[target_language_code] || 'meera';

        const payload = {
            text: text.slice(0, 500), // Sarvam stream limit
            target_language_code,
            speaker: resolvedSpeaker,
            model: 'bulbul:v3',
            pace: Number(pace),
            speech_sample_rate: 22050,
            output_audio_codec: 'mp3',
            enable_preprocessing,
        };

        // Use native fetch for proper streaming support
        const sarvamRes = await fetch(`${config.baseURL}/text-to-speech/stream`, {
            method: 'POST',
            headers: {
                'api-subscription-key': process.env.SARVAM_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(20000),
        });

        if (!sarvamRes.ok) {
            const errText = await sarvamRes.text().catch(() => 'unknown');
            console.error('[TTS Stream Error]', sarvamRes.status, errText);
            return res.status(sarvamRes.status).json({ error: 'Sarvam streaming TTS failed', detail: errText });
        }

        // Pipe streaming MP3 directly to client
        res.set('Content-Type', 'audio/mpeg');
        res.set('Transfer-Encoding', 'chunked');
        res.set('X-Sarvam-Speaker', resolvedSpeaker);

        const reader = sarvamRes.body.getReader();
        const pump = async () => {
            while (true) {
                const { done, value } = await reader.read();
                if (done) { res.end(); break; }
                if (!res.write(Buffer.from(value))) {
                    // Back-pressure: wait for drain
                    await new Promise(r => res.once('drain', r));
                }
            }
        };
        await pump();

    } catch (err) {
        console.error('[TTS Stream Error]', err.message);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Streaming TTS failed' });
        } else {
            res.end();
        }
    }
});

// STREAMING TTS BRIDGE — for 10 non-Sarvam languages
// Translates to Hindi first, then streams Hindi TTS
router.post('/tts-stream-bridge', async (req, res) => {
    try {
        const { text, sourceLangCode, pace = 1.0 } = req.body;
        if (!text || !sourceLangCode) {
            return res.status(400).json({ error: 'text and sourceLangCode required' });
        }

        const config = getSarvamConfig();
        let textToSpeak = text;

        // Step 1: Translate to Hindi
        try {
            const translateRes = await axios.post(`${config.baseURL}/translate`, {
                input: text,
                source_language_code: sourceLangCode.includes('-') ? sourceLangCode : `${sourceLangCode}-IN`,
                target_language_code: 'hi-IN',
                model: 'mayura:v1',
                mode: 'formal',
                enable_preprocessing: false,
            }, { headers: { ...config.headers, 'Content-Type': 'application/json' }, timeout: 8000 });

            const translated = translateRes.data?.translated_text;
            if (translated) textToSpeak = translated;
        } catch (translateErr) {
            console.warn('[TTS Stream Bridge] Translate failed, using original:', translateErr.message);
        }

        // Step 2: Stream Hindi TTS
        const sarvamRes = await fetch(`${config.baseURL}/text-to-speech/stream`, {
            method: 'POST',
            headers: { 'api-subscription-key': process.env.SARVAM_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: textToSpeak.slice(0, 500),
                target_language_code: 'hi-IN',
                speaker: SARVAM_SPEAKERS['hi-IN'],
                model: 'bulbul:v3',
                pace: Number(pace),
                speech_sample_rate: 22050,
                output_audio_codec: 'mp3',
                enable_preprocessing: true,
            }),
            signal: AbortSignal.timeout(20000),
        });

        if (!sarvamRes.ok) {
            return res.status(500).json({ error: 'TTS stream bridge failed' });
        }

        res.set('Content-Type', 'audio/mpeg');
        res.set('Transfer-Encoding', 'chunked');

        const reader = sarvamRes.body.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) { res.end(); break; }
            if (!res.write(Buffer.from(value))) {
                await new Promise(r => res.once('drain', r));
            }
        }

    } catch (err) {
        console.error('[TTS Stream Bridge Error]', err.message);
        if (!res.headersSent) res.status(500).json({ error: 'Streaming TTS failed' });
        else res.end();
    }
});

export default router;
