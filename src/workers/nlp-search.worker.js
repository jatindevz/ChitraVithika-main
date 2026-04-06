/**
 * ChitraVithika — NLP Search Web Worker
 *
 * Builds a TF-IDF vector space model from the photo catalog and responds to
 * natural-language queries using cosine similarity.
 *
 * Protocol:
 *   → postMessage({ type: 'INDEX', catalog: PhotoItem[] })
 *   → postMessage({ type: 'QUERY', query: string, queryId: string })
 *   ← postMessage({ type: 'READY' })
 *   ← postMessage({ type: 'RESULTS', queryId: string, results: ScoredResult[] })
 *
 * ScoredResult: { itemId: number, score: number, rank: number }
 */

'use strict';

// ─────────────────────────────────────────────────────────────
// STOPWORDS
// ─────────────────────────────────────────────────────────────
const STOPWORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'that', 'this', 'it', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall', 'should',
    'may', 'might', 'can', 'could', 'i', 'we', 'you', 'he', 'she', 'they',
    'my', 'our', 'your', 'his', 'her', 'its', 'their', 'me', 'him', 'us', 'them',
    'very', 'just', 'so', 'as', 'if', 'by', 'from', 'up', 'down', 'out', 'into',
    'more', 'most', 'also', 'over', 'through', 'between', 'about', 'which',
]);

// ─────────────────────────────────────────────────────────────
// TOKENIZER & NORMALIZER
// ─────────────────────────────────────────────────────────────

/**
 * Normalize and tokenize a string to a clean array of stems.
 * Applies:  lowercase → punctuation strip → stop-word removal → naive stemming
 */
function tokenize(text) {
    if (!text) return [];
    return text
        .toLowerCase()
        // Replace non-alphanumeric (except spaces) with space
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length > 2 && !STOPWORDS.has(t))
        .map(naiveStem);
}

/**
 * Naive suffix-stripping stemmer (Porter-lite for speed).
 * Handles the most common English suffixes.
 */
function naiveStem(word) {
    if (word.length <= 4) return word;
    // Order matters: longer suffixes first
    const rules = [
        [/ational$/, 'ate'],
        [/tional$/, 'tion'],
        [/enci$/, 'ence'],
        [/anci$/, 'ance'],
        [/izing$/, 'ize'],
        [/ising$/, 'ise'],
        [/izing$/, 'ize'],
        [/sses$/, 'ss'],
        [/ies$/, 'i'],
        [/ness$/, ''],
        [/ment$/, ''],
        [/ings$/, ''],
        [/ing$/, ''],
        [/tion$/, 'te'],
        [/ated$/, 'ate'],
        [/ers$/, 'er'],
        [/ies$/, 'ie'],
        [/ous$/, ''],
        [/ive$/, ''],
        [/ful$/, ''],
        [/al$/, ''],
        [/ed$/, ''],
        [/ly$/, ''],
        [/er$/, ''],
        [/es$/, ''],
        [/s$/, ''],
    ];
    for (const [pattern, replacement] of rules) {
        if (pattern.test(word)) {
            const stemmed = word.replace(pattern, replacement);
            if (stemmed.length >= 3) return stemmed;
        }
    }
    return word;
}

// ─────────────────────────────────────────────────────────────
// TF-IDF ENGINE
// ─────────────────────────────────────────────────────────────

/** State for the indexed corpus */
let corpus = [];            // array of { id, tokens, tfVec }
let idfMap = new Map();     // term → idf value
let vocabulary = [];        // sorted unique terms
let tfidfMatrix = [];       // array of Float32Array (one per doc)
let indexed = false;

/**
 * Build TF-IDF index from a catalog array.
 * @param {Object[]} catalog - array of photo metadata objects
 */
function buildIndex(catalog) {
    corpus = [];
    idfMap = new Map();
    vocabulary = [];
    tfidfMatrix = [];

    // ── Step 1: Tokenize each document ───────────────────────
    // A "document" is the concatenation of all searchable fields:
    // title, description, category, artist name, tags
    for (const item of catalog) {
        const text = [
            item.title || '',
            item.description || '',
            item.category || '',
            item.artist || '',
            (item.tags || []).join(' '),
        ].join(' ');

        const tokens = tokenize(text);
        corpus.push({ id: item.id, tokens });
    }

    // ── Step 2: Build vocabulary and DF (document frequency) ─
    const dfMap = new Map(); // term → doc count

    for (const doc of corpus) {
        const seen = new Set(doc.tokens);
        for (const term of seen) {
            dfMap.set(term, (dfMap.get(term) || 0) + 1);
        }
    }

    const N = corpus.length;
    vocabulary = [...dfMap.keys()].sort();

    // ── Step 3: Compute IDF for each term ────────────────────
    // IDF = log(N / df(t)) + 1  (smoothed)
    for (const [term, df] of dfMap) {
        idfMap.set(term, Math.log(N / df) + 1);
    }

    // ── Step 4: Build TF-IDF vectors for each document ───────
    const V = vocabulary.length;
    const termIdx = new Map(vocabulary.map((t, i) => [t, i]));

    for (const doc of corpus) {
        const tf = new Map();
        for (const token of doc.tokens) {
            tf.set(token, (tf.get(token) || 0) + 1);
        }

        const vec = new Float32Array(V);
        const maxTF = Math.max(...tf.values(), 1);

        for (const [term, count] of tf) {
            const idx = termIdx.get(term);
            if (idx === undefined) continue;
            // Normalized TF (augmented to prevent bias toward long docs)
            const tfNorm = 0.5 + 0.5 * (count / maxTF);
            vec[idx] = tfNorm * (idfMap.get(term) || 0);
        }

        // L2 normalize the vector
        const magnitude = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
        if (magnitude > 0) {
            for (let i = 0; i < V; i++) vec[i] /= magnitude;
        }

        doc.tfidfVec = vec;
        tfidfMatrix.push(vec);
    }

    indexed = true;
    console.log(`[nlp-worker] Index built: ${N} docs, ${V} terms`);
}

// ─────────────────────────────────────────────────────────────
// QUERY ENGINE
// ─────────────────────────────────────────────────────────────

/**
 * Computes cosine similarity between two L2-normalised Float32Arrays.
 * Since both vectors are already normalised, dot product = cosine similarity.
 */
function cosineSim(vecA, vecB) {
    let dot = 0;
    for (let i = 0; i < vecA.length; i++) dot += vecA[i] * vecB[i];
    return dot;
}

/**
 * Search the indexed corpus with a natural-language query.
 * Returns ranked array of { itemId, score }.
 * @param {string} query
 * @returns {{ itemId: number, score: number, rank: number }[]}
 */
function search(query) {
    if (!indexed || corpus.length === 0) return [];

    const V = vocabulary.length;
    const termIdx = new Map(vocabulary.map((t, i) => [t, i]));
    const queryTokens = tokenize(query);

    if (queryTokens.length === 0) return [];

    // Build query TF-IDF vector
    const qTF = new Map();
    for (const token of queryTokens) {
        qTF.set(token, (qTF.get(token) || 0) + 1);
    }

    const qVec = new Float32Array(V);
    const qMaxTF = Math.max(...qTF.values(), 1);

    for (const [term, count] of qTF) {
        const idx = termIdx.get(term);
        if (idx === undefined) continue; // OOV term
        const tfNorm = 0.5 + 0.5 * (count / qMaxTF);
        qVec[idx] = tfNorm * (idfMap.get(term) || 0);
    }

    // L2 normalize query vector
    const qMag = Math.sqrt(qVec.reduce((s, v) => s + v * v, 0));
    if (qMag > 0) {
        for (let i = 0; i < V; i++) qVec[i] /= qMag;
    }

    // Score each document
    const scores = corpus.map((doc, i) => ({
        itemId: doc.id,
        score: cosineSim(qVec, tfidfMatrix[i]),
    }));

    // Sort descending by score, keep non-zero results
    scores.sort((a, b) => b.score - a.score);

    const threshold = 0.01; // minimum similarity to be included
    const results = scores
        .filter(r => r.score >= threshold)
        .map((r, rank) => ({ ...r, rank }));

    return results;
}

// ─────────────────────────────────────────────────────────────
// MESSAGE HANDLER
// ─────────────────────────────────────────────────────────────

self.addEventListener('message', (event) => {
    const { type } = event.data;

    switch (type) {
        case 'INDEX': {
            const { catalog } = event.data;
            buildIndex(catalog);
            self.postMessage({ type: 'INDEXED', termCount: vocabulary.length, docCount: corpus.length });
            break;
        }

        case 'QUERY': {
            const { query, queryId } = event.data;
            if (!indexed) {
                self.postMessage({ type: 'RESULTS', queryId, results: [], error: 'Index not built' });
                return;
            }
            const results = search(query);
            self.postMessage({ type: 'RESULTS', queryId, results });
            break;
        }

        default:
            break;
    }
});

self.postMessage({ type: 'READY' });
