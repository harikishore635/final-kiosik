/**
 * semanticIntentMatcher.js — MiniLLM-powered intent classification
 *
 * Uses paraphrase-multilingual-MiniLM-L12-v2 (90MB ONNX, no API key needed)
 * to classify user utterances into navigation intents via cosine similarity.
 *
 * Works across all 22 Indian languages without translation — the model is
 * natively multilingual.
 *
 * Pipeline: embed utterance → cosine similarity vs intent label embeddings
 *           → return best intent if confidence >= threshold
 *
 * Fast path: short-circuits the full LLM call for navigation-only queries.
 */

import { pipeline, env } from '@huggingface/transformers';

// Always fetch from HuggingFace CDN — no local model files needed
env.allowLocalModels = false;
env.useBrowserCache = true;

// ── Intent definitions ────────────────────────────────────────────────────────

const INTENT_EXAMPLES = {
  navigate_electricity: [
    'electricity', 'power', 'light', 'meter', 'bijli', 'current supply',
    'new electricity connection', 'बिजली', 'மின்சாரம்', 'కరెంట్',
    'load extension', 'electricity bill', 'meter replacement',
  ],
  navigate_gas: [
    'gas', 'gas connection', 'gas bill', 'cylinder', 'piped gas',
    'gas complaint', 'গ্যাস', 'गैस', 'வாயு', 'gas meter',
  ],
  navigate_water: [
    'water', 'water supply', 'water connection', 'pipe leak', 'tap water',
    'pani', 'জল', 'पानी', 'தண்ணீர்', 'water disruption',
  ],
  navigate_municipal: [
    'municipal', 'municipality', 'panchayat', 'ward', 'nagar palika',
    'property tax', 'garbage', 'street light', 'road damage', 'sewage',
    'nagarpalika', 'நகர்மன்றம்', 'नगरपालिका',
  ],
  navigate_complaints: [
    'complaint', 'grievance', 'problem', 'issue', 'register complaint',
    'shikayat', 'शिकायत', 'புகார்', 'অভিযোগ', 'report problem',
  ],
  navigate_track: [
    'track', 'track status', 'check status', 'application status',
    'ticket status', 'request status', 'स्थिति', 'status check',
    'where is my application', 'how long', 'pending request',
  ],
  navigate_home: [
    'home', 'main menu', 'go back', 'start over', 'mukhya menu',
    'मुख्य मेनू', 'முகப்பு', 'restart', 'home page',
  ],
  navigate_schemes: [
    'scheme', 'government scheme', 'yojana', 'benefit', 'subsidy',
    'योजना', 'திட்டம்', 'সরকারি প্রকল্প', 'welfare', 'eligibility',
  ],
  navigate_login: [
    'login', 'sign in', 'enter', 'start', 'log in', 'लॉगिन',
    'consumer id', 'account number', 'authenticate', 'enter details',
  ],
  navigate_office_locator: [
    'office', 'nearby office', 'where is office', 'location', 'address',
    'karyalay', 'कार्यालय', 'அலுவலகம்', 'find office', 'direction',
  ],
};

// ── Model state ───────────────────────────────────────────────────────────────

let _embedder = null;
let _intentEmbeddings = null;
let _initPromise = null;

async function loadEmbedder() {
  if (_embedder) return _embedder;
  _embedder = await pipeline(
    'feature-extraction',
    'Xenova/paraphrase-multilingual-MiniLM-L12-v2',
    { quantized: true, revision: 'main' }
  );
  return _embedder;
}

async function embed(text) {
  const emb = await loadEmbedder();
  const output = await emb(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na  += a[i] * a[i];
    nb  += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function buildIntentEmbeddings() {
  if (_intentEmbeddings) return;
  const entries = Object.entries(INTENT_EXAMPLES);
  const result = {};
  for (const [intent, examples] of entries) {
    const vecs = await Promise.all(examples.map(embed));
    // Average all example embeddings into one representative vector
    const dim = vecs[0].length;
    const avg = new Array(dim).fill(0);
    for (const v of vecs) v.forEach((val, i) => { avg[i] += val; });
    avg.forEach((_, i) => { avg[i] /= vecs.length; });
    result[intent] = avg;
  }
  _intentEmbeddings = result;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Pre-warm the model in the background (call once on app start).
 * Does nothing if already loaded.
 */
export function prewarmSemanticMatcher() {
  if (_initPromise) return _initPromise;
  _initPromise = loadEmbedder()
    .then(buildIntentEmbeddings)
    .catch(err => {
      console.warn('[SemanticMatcher] Prewarm failed (will retry on first use):', err.message);
      _initPromise = null;
    });
  return _initPromise;
}

/**
 * Classify an utterance into a navigation intent.
 *
 * @param {string} utterance - raw user speech transcript (any language)
 * @param {number} threshold - minimum cosine similarity to accept (default 0.52)
 * @returns {Promise<{intent: string, confidence: number} | null>}
 *          Returns null if confidence below threshold or on any error.
 */
export async function semanticMatch(utterance, threshold = 0.52) {
  if (!utterance?.trim()) return null;
  try {
    await buildIntentEmbeddings();
    const uttVec = await embed(utterance);
    let bestIntent = null;
    let bestScore  = -1;
    for (const [intent, vec] of Object.entries(_intentEmbeddings)) {
      const score = cosine(uttVec, vec);
      if (score > bestScore) { bestScore = score; bestIntent = intent; }
    }
    if (bestScore >= threshold) {
      console.debug(`[SemanticMatcher] "${utterance}" → ${bestIntent} (${bestScore.toFixed(3)})`);
      return { intent: bestIntent, confidence: bestScore };
    }
    return null;
  } catch (err) {
    console.warn('[SemanticMatcher] Match failed, falling through to LLM:', err.message);
    return null;
  }
}

export default { semanticMatch, prewarmSemanticMatcher };
