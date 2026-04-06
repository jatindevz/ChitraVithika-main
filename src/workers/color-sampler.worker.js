/**
 * ChitraVithika — Color Sampler Web Worker
 *
 * Receives an ImageBitmap (from OffscreenCanvas pixel data) via postMessage,
 * runs K-Means clustering (k=5) on sampled pixels, and returns the top 4
 * dominant color hex strings to drive the ambient CSS mesh gradient.
 *
 * Protocol:
 *   → postMessage({ type: 'SAMPLE', imageData: ImageData, itemId: number })
 *   ← postMessage({ type: 'PALETTE', itemId: number, colors: string[] })
 */

'use strict';

// ─────────────────────────────────────────────────────────────
// K-MEANS CONFIGURATION
// ─────────────────────────────────────────────────────────────
const K = 5;    // number of clusters
const MAX_ITER = 25;   // max K-Means iterations
const SAMPLE_STEP = 8;    // sample every Nth pixel (performance)
const MIN_LIGHTNESS = 0.06; // skip near-black pixels (background artifacts)
const MAX_LIGHTNESS = 0.96; // skip near-white pixels (blown highlights)

// ─────────────────────────────────────────────────────────────
// MATH UTILITIES
// ─────────────────────────────────────────────────────────────

/** Squared Euclidean distance in RGB space */
function distSq(a, b) {
    const dr = a[0] - b[0];
    const dg = a[1] - b[1];
    const db = a[2] - b[2];
    return dr * dr + dg * dg + db * db;
}

/** Convert [r, g, b] (0-255) → '#rrggbb' */
function rgbToHex(r, g, b) {
    return '#' +
        Math.round(r).toString(16).padStart(2, '0') +
        Math.round(g).toString(16).padStart(2, '0') +
        Math.round(b).toString(16).padStart(2, '0');
}

/** Perceived lightness from RGB (0-255) → 0..1 */
function lightness(r, g, b) {
    // Use relative luminance (sRGB)
    const toLinear = c => {
        const s = c / 255;
        return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** Desaturate a color toward a darker ambient version for CSS mesh */
function ambientify(r, g, b) {
    // Pull 35% toward a dark neutral and reduce brightness
    const factor = 0.45;
    return [
        Math.round(r * factor),
        Math.round(g * factor),
        Math.round(b * factor),
    ];
}

// ─────────────────────────────────────────────────────────────
// K-MEANS CLUSTERING
// ─────────────────────────────────────────────────────────────

/**
 * @param {number[][]} pixels - array of [r, g, b] triplets
 * @param {number}     k      - number of clusters
 * @returns {number[][]} - array of k centroid [r, g, b] triplets
 */
function kMeans(pixels, k) {
    if (pixels.length === 0) return [];
    const n = pixels.length;

    // ── Initialise centroids: K-Means++ seeding ───────────────
    const centroids = [];

    // 1. Pick first centroid randomly
    centroids.push([...pixels[Math.floor(Math.random() * n)]]);

    // 2. Each subsequent centroid: weighted by distance² from nearest existing centroid
    for (let c = 1; c < k; c++) {
        const weights = pixels.map(p => {
            const minDist = centroids.reduce((min, cen) => Math.min(min, distSq(p, cen)), Infinity);
            return minDist;
        });
        const totalWeight = weights.reduce((s, w) => s + w, 0);
        let threshold = Math.random() * totalWeight;
        let chosen = 0;
        for (let i = 0; i < n; i++) {
            threshold -= weights[i];
            if (threshold <= 0) { chosen = i; break; }
        }
        centroids.push([...pixels[chosen]]);
    }

    // ── Iterate ───────────────────────────────────────────────
    const assignments = new Int32Array(n);
    let moved = true;

    for (let iter = 0; iter < MAX_ITER && moved; iter++) {
        moved = false;

        // Assign each pixel to nearest centroid
        for (let i = 0; i < n; i++) {
            let best = 0;
            let bestDist = Infinity;
            for (let c = 0; c < k; c++) {
                const d = distSq(pixels[i], centroids[c]);
                if (d < bestDist) { bestDist = d; best = c; }
            }
            if (assignments[i] !== best) { assignments[i] = best; moved = true; }
        }

        if (!moved) break;

        // Recompute centroids as mean of assigned pixels
        const sums = Array.from({ length: k }, () => [0, 0, 0]);
        const counts = new Int32Array(k);

        for (let i = 0; i < n; i++) {
            const c = assignments[i];
            sums[c][0] += pixels[i][0];
            sums[c][1] += pixels[i][1];
            sums[c][2] += pixels[i][2];
            counts[c]++;
        }

        for (let c = 0; c < k; c++) {
            if (counts[c] > 0) {
                centroids[c] = [
                    sums[c][0] / counts[c],
                    sums[c][1] / counts[c],
                    sums[c][2] / counts[c],
                ];
            }
        }
    }

    // ── Sort by cluster size (most dominant first) ────────────
    const sizes = new Int32Array(k);
    for (let i = 0; i < n; i++) sizes[assignments[i]]++;

    const indexed = centroids.map((c, i) => ({ c, size: sizes[i] }));
    indexed.sort((a, b) => b.size - a.size);

    return indexed.map(x => x.c);
}

// ─────────────────────────────────────────────────────────────
// MESSAGE HANDLER
// ─────────────────────────────────────────────────────────────

self.addEventListener('message', (event) => {
    const { type, imageData, itemId } = event.data;

    if (type !== 'SAMPLE') return;

    const { data, width, height } = imageData; // Uint8ClampedArray RGBA
    const pixels = [];

    // Sample pixels at SAMPLE_STEP intervals, skip edge pixels
    const margin = Math.floor(Math.min(width, height) * 0.05);

    for (let y = margin; y < height - margin; y += SAMPLE_STEP) {
        for (let x = margin; x < width - margin; x += SAMPLE_STEP) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];

            if (a < 200) continue; // skip transparent pixels
            const l = lightness(r, g, b);
            if (l < MIN_LIGHTNESS || l > MAX_LIGHTNESS) continue; // skip extremes

            pixels.push([r, g, b]);
        }
    }

    if (pixels.length < K) {
        // Fallback: not enough usable pixels — return neutral darks
        self.postMessage({
            type: 'PALETTE',
            itemId,
            colors: ['#12101a', '#0a1018', '#101810', '#180f0a'],
        });
        return;
    }

    // Run K-Means
    const centroids = kMeans(pixels, K);

    // Convert centroids to ambient-darkened hex colors
    const colors = centroids.slice(0, 4).map(([r, g, b]) => {
        const [ar, ag, ab] = ambientify(r, g, b);
        return rgbToHex(ar, ag, ab);
    });

    // Guarantee exactly 4 colors
    while (colors.length < 4) colors.push('#0a0a0a');

    self.postMessage({ type: 'PALETTE', itemId, colors });
});

self.postMessage({ type: 'READY' });
