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

// Intent examples are derived from the navigation registry (single source of truth).
import { INTENT_EXAMPLES } from './navigationRegistry.js';


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
    // Keep every example vector separately. Averaging mixed-language examples
    // (English + Hindi + Tamil + Telugu) into one centroid blurs the vector and
    // sinks single-language queries like "go to electricity" below threshold.
    // Match against each example and take the best (max) similarity instead.
    result[intent] = await Promise.all(examples.map(embed));
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
    for (const [intent, vecs] of Object.entries(_intentEmbeddings)) {
      // Max similarity across this intent's examples (best-match, not centroid)
      let intentScore = -1;
      for (const vec of vecs) {
        const score = cosine(uttVec, vec);
        if (score > intentScore) intentScore = score;
      }
      if (intentScore > bestScore) { bestScore = intentScore; bestIntent = intent; }
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
