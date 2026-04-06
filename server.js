/**
 * ChitraVithika — Backend Server (Production)
 * All data backed by MongoDB via Mongoose.
 *
 * Routes:
 *   GET  /                        → SPA shell (index.html)
 *   GET  /src/**                  → static JS/CSS source files
 *   GET  /public/**               → static assets
 *   GET  /api/catalog             → live photograph catalog from DB
 *   GET  /api/auction/stream      → SSE Dutch Auction state (DB-backed)
 *   GET  /api/image-preview/:id   → unencrypted image preview
 *   GET  /api/image/:id           → AES-256-GCM encrypted image stream
 *   POST /api/upload              → multipart upload + EXIF parse + DB insert
 *   POST /api/auth/login          → authenticate from DB
 *   POST /api/auth/register       → create user in DB
 *   GET  /api/auth/me             → current user info
 *   POST /api/bids/:id            → place bid, persist to DB
 *   GET  /*                       → SPA catch-all → index.html
 */

'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const http = require('http');
const fs = require('fs');
const crypto = require('crypto');
const events = require('events');
const store = require('./db/database.js');

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3000', 10);
const PUBLIC_ORIGIN = (process.env.PUBLIC_ORIGIN || `http://localhost:${PORT}`).replace(/\/$/, '');
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const ROOT = __dirname;
const DIST_DIR = path.join(ROOT, 'dist');
const HAS_DIST = fs.existsSync(DIST_DIR);

/** 
 * Load photo file for an item - tries GridFS first, then falls back to filesystem.
 * This allows backward compatibility with existing filesystem-stored images.
 */
async function loadPhotoFileForItem(item) {
    if (!item) return null;
    
    // Try GridFS first (new storage method)
    if (item.gridfs_id) {
        try {
            const buffer = await store.downloadImageFromGridFS(item.gridfs_id);
            return { 
                buffer, 
                filename: item.filename || item.saved_as,
                mimeType: item.mimeType || 'image/jpeg'
            };
        } catch (err) {
            console.error(`[image] GridFS download failed for ${item.gridfs_id}:`, err.message);
        }
    }
    
    // Fallback to filesystem (legacy support)
    const names = [...new Set([item.saved_as, item.filename].filter((n) => n && String(n).trim()))];
    const subdirs = ['uploads', 'images'];
    for (const name of names) {
        for (const sub of subdirs) {
            const p = path.join(ROOT, 'public', sub, name);
            if (fs.existsSync(p)) {
                return { buffer: fs.readFileSync(p), filename: name };
            }
        }
    }
    return null;
}

function mimeFromFilename(filename) {
    const ext = path.extname(filename || '').toLowerCase();
    if (ext === '.png') return 'image/png';
    if (ext === '.webp') return 'image/webp';
    if (ext === '.gif') return 'image/gif';
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
    return 'image/jpeg';
}

// AES-256-GCM encryption shared secret
const MASTER_KEY = crypto.scryptSync('chitraVithika-secret-2026', 'cv-salt', 32);

// ─────────────────────────────────────────────────────────────
// SESSION TOKENS
// ─────────────────────────────────────────────────────────────
const tokens = new Map(); // legacy in-memory token → email
const AUTH_TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET || 'chitravithika-auth-2026';
const AUTH_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function signTokenPayload(payload) {
    return crypto.createHmac('sha256', AUTH_TOKEN_SECRET).update(payload).digest('base64url');
}

function safeCompare(a, b) {
    const left = Buffer.from(String(a || ''), 'utf8');
    const right = Buffer.from(String(b || ''), 'utf8');
    if (left.length !== right.length) return false;
    return crypto.timingSafeEqual(left, right);
}

function generateToken(email) {
    const payload = Buffer.from(JSON.stringify({
        email: String(email || '').toLowerCase(),
        exp: Date.now() + AUTH_TOKEN_TTL_MS,
    }), 'utf8').toString('base64url');
    const signature = signTokenPayload(payload);
    return `cv1.${payload}.${signature}`;
}

function getEmailFromSignedToken(token) {
    if (!token || typeof token !== 'string' || !token.startsWith('cv1.')) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [, payload, signature] = parts;
    const expectedSignature = signTokenPayload(payload);
    if (!safeCompare(signature, expectedSignature)) return null;
    try {
        const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        if (!decoded?.email || !decoded?.exp || Date.now() > decoded.exp) return null;
        return String(decoded.email).toLowerCase();
    } catch {
        return null;
    }
}

function revokeTokensForEmail(email) {
    if (!email) return;
    for (const [token, tokenEmail] of tokens.entries()) {
        if (tokenEmail === email) {
            tokens.delete(token);
        }
    }
}

function readJSON(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try { resolve(JSON.parse(body)); }
            catch (e) { reject(new Error('Invalid JSON')); }
        });
        req.on('error', reject);
    });
}

async function getUserFromRequest(req) {
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) return null;
    const token = auth.slice(7);
    const email = tokens.get(token) || getEmailFromSignedToken(token);
    if (!email) return null;
    const user = await store.getUserByEmail(email);
    if (!user) return null;
    return serializeUser(user);
}

function serializeUser(user) {
    if (!user) return null;
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        photoURL: user.photo_url || user.photoURL || null,
        authProvider: user.auth_provider || user.authProvider || 'email',
        phone: user.phone || null,
        location: user.location || null,
        bio: user.bio || null,
        artistStatement: user.artist_statement || user.artistStatement || null,
        website: user.website || null,
        instagram: user.instagram || null,
        profileCompleted: Boolean(user.profile_completed ?? user.profileCompleted),
        artistProfileCompleted: Boolean(user.artist_profile_completed ?? user.artistProfileCompleted),
    };
}

// ─────────────────────────────────────────────────────────────
// MIME TYPE MAP
// ─────────────────────────────────────────────────────────────
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
    '.ttf': 'font/ttf', '.mp4': 'video/mp4',
};

// ─────────────────────────────────────────────────────────────
// ENSURE REQUIRED DIRECTORIES EXIST
// Note: public/uploads kept for backward compatibility with legacy filesystem images
// try/catch: Vercel has a read-only filesystem — ignore mkdir errors there
// ─────────────────────────────────────────────────────────────
[
    path.join(ROOT, 'public'),
    path.join(ROOT, 'public', 'data'),
    path.join(ROOT, 'public', 'uploads'),
    path.join(ROOT, 'src'), path.join(ROOT, 'src', 'css'),
    path.join(ROOT, 'src', 'js'), path.join(ROOT, 'src', 'components'),
    path.join(ROOT, 'src', 'pages'), path.join(ROOT, 'src', 'workers'),
].forEach(d => { try { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); } catch (e) { /* read-only FS on Vercel */ } });

// ─────────────────────────────────────────────────────────────
// ENCRYPTION UTILITIES
// ─────────────────────────────────────────────────────────────
function encryptBuffer(plainBuffer) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_KEY, iv);
    const ciphertext = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
    return { iv, authTag: cipher.getAuthTag(), ciphertext };
}

// ─────────────────────────────────────────────────────────────
// DUTCH AUCTION ENGINE (DB-BACKED)
// ─────────────────────────────────────────────────────────────

const auctionBus = new events.EventEmitter();
auctionBus.setMaxListeners(1000);

/** In-memory auction states — synced FROM DB on boot, written TO DB on mutations */
const auctionStates = {};

async function initAuctions() {
    const auctions = await store.getAuctions();
    auctions.forEach(a => {
        const isSilent = a.type === 'silent';
        auctionStates[a.photo_id] = {
            auctionId: a.id,
            itemId: a.photo_id,
            title: a.title,
            type: a.type || 'dutch',
            currentPrice: a.current_price,
            floor: a.floor_price,
            startPrice: a.start_price,
            decrement: a.decrement || 0,
            startedAt: Date.now(),
            intervalMs: a.interval_ms || 10_000,
            sold: !!a.sold,
        };
        if (isSilent) {
            auctionStates[a.photo_id].decrement = 0;
        }
    });
    console.log(`[auction] Initialized ${auctions.length} auctions from DB`);
}

function tickAuctions() {
    const now = Date.now();
    Object.values(auctionStates).forEach(state => {
        if (state.sold || state.type === 'silent') return;
        if (state.currentPrice <= state.floor) {
            state.currentPrice = state.floor;
            state._lastTick = now;
            return;
        }
        const elapsed = now - (state._lastTick || state.startedAt);
        if (elapsed >= state.intervalMs) {
            state.currentPrice = Math.max(state.floor, state.currentPrice - state.decrement);
            state._lastTick = now;

            // Persist price to DB (fire-and-forget async)
            store.updateAuctionPrice(state.auctionId, state.currentPrice, false).catch(e => console.error('[auction] price update error:', e.message));
        }
    });

    const payload = {
        serverTimestamp: now,
        auctions: Object.values(auctionStates).map(s => ({
            itemId: s.itemId,
            title: s.title,
            currentPrice: s.currentPrice,
            floor: s.floor,
            sold: s.sold,
            intervalMs: s.intervalMs,
            nextDropIn: s.currentPrice <= s.floor ? 0 : (s._lastTick ? Math.max(0, s.intervalMs - (now - s._lastTick)) : s.intervalMs),
        })),
    };

    auctionBus.emit('tick', payload);
}

async function scheduleAuctionResetIfNeeded(photoId, auctionId) {
    const refreshedPhoto = await store.getPhotograph(photoId);
    if (!refreshedPhoto?.remaining || refreshedPhoto.remaining <= 0) return;

    setTimeout(() => {
        if (!auctionStates[photoId]) return;
        auctionStates[photoId].currentPrice = auctionStates[photoId].startPrice;
        auctionStates[photoId].sold = false;
        auctionStates[photoId].ended = false;
        auctionStates[photoId]._lastTick = Date.now();
        store.resetAuction(auctionId).catch((e) => console.error('[auction] reset error:', e.message));
    }, 30_000);
}

// Boot auctions from DB — called inside main()
// initAuctions(), setInterval, tickAuctions moved to main()

// ─────────────────────────────────────────────────────────────
// MULTIPART FORM-DATA PARSER
// ─────────────────────────────────────────────────────────────

function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

function parseMultipart(body, boundary) {
    const results = [];
    const delimiter = Buffer.from('--' + boundary);
    const parts = [];
    let start = 0;

    while (true) {
        const idx = body.indexOf(delimiter, start);
        if (idx === -1) break;
        if (start > 0) parts.push(body.slice(start, idx));
        start = idx + delimiter.length;
        // Skip \r\n after delimiter
        if (body[start] === 0x0d && body[start + 1] === 0x0a) start += 2;
        // Check for closing --
        if (body[start] === 0x2d && body[start + 1] === 0x2d) break;
    }

    for (const part of parts) {
        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd === -1) continue;

        const headerStr = part.slice(0, headerEnd).toString('utf8');
        const data = part.slice(headerEnd + 4);
        // Trim trailing \r\n
        const trimmed = (data.length >= 2 && data[data.length - 2] === 0x0d && data[data.length - 1] === 0x0a)
            ? data.slice(0, -2) : data;

        const headers = {};
        headerStr.split('\r\n').forEach(line => {
            const [key, ...vals] = line.split(':');
            if (key) headers[key.trim().toLowerCase()] = vals.join(':').trim();
        });

        const cd = headers['content-disposition'] || '';
        const nameMatch = cd.match(/name="([^"]+)"/);
        const fileMatch = cd.match(/filename="([^"]+)"/);

        results.push({
            headers,
            name: nameMatch ? nameMatch[1] : null,
            filename: fileMatch ? fileMatch[1] : null,
            data: trimmed,
        });
    }
    return results;
}

// ─────────────────────────────────────────────────────────────
// EXIF PARSER
// ─────────────────────────────────────────────────────────────

function parseExifFromBuffer(buf) {
    const exif = { camera: null, lens: null, iso: null, aperture: null, shutter: null };
    try {
        const ExifReader = require('exif-reader');
        // Find EXIF APP1 marker in JPEG
        let offset = 2; // skip SOI
        while (offset < buf.length - 4) {
            if (buf[offset] !== 0xFF) break;
            const marker = buf[offset + 1];
            const len = buf.readUInt16BE(offset + 2);
            if (marker === 0xE1) { // APP1
                const exifData = buf.slice(offset + 4, offset + 2 + len);
                if (exifData.slice(0, 4).toString('ascii') === 'Exif') {
                    const tiffOffset = 6; // skip 'Exif\0\0'
                    const parsed = ExifReader(exifData.slice(tiffOffset));
                    if (parsed.image) {
                        exif.camera = parsed.image.Make && parsed.image.Model
                            ? `${parsed.image.Make} ${parsed.image.Model}`.trim() : null;
                    }
                    if (parsed.exif) {
                        exif.iso = parsed.exif.ISO ? String(parsed.exif.ISO) : null;
                        exif.aperture = parsed.exif.FNumber ? `f/${parsed.exif.FNumber}` : null;
                        exif.shutter = parsed.exif.ExposureTime
                            ? (parsed.exif.ExposureTime < 1 ? `1/${Math.round(1 / parsed.exif.ExposureTime)}` : `${parsed.exif.ExposureTime}s`)
                            : null;
                        exif.lens = parsed.exif.LensModel || null;
                    }
                }
                break;
            }
            offset += 2 + len;
        }
    } catch (e) {
        // EXIF parsing is best-effort — not critical
        console.log('[exif] Parse attempt:', e.message || 'no EXIF data');
    }
    return exif;
}

// ─────────────────────────────────────────────────────────────
// STATIC FILE SERVER
// ─────────────────────────────────────────────────────────────

function serveStatic(res, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';

    fs.stat(filePath, (err, stat) => {
        if (err || !stat.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            return res.end('404 Not Found');
        }
        res.writeHead(200, {
            'Content-Type': mime,
            'Content-Length': stat.size,
            'Cache-Control': 'public, max-age=3600',
        });
        fs.createReadStream(filePath).pipe(res);
    });
}

// ─────────────────────────────────────────────────────────────
// REQUEST ROUTER
// ─────────────────────────────────────────────────────────────

async function handleRequest(req, res) {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const method = req.method.toUpperCase();
    const pname = url.pathname;

    console.log(`[SERVER] Incoming request: ${method} ${pname}`);

    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (method === 'OPTIONS') {
        console.log('[SERVER] Handling CORS preflight request');
        res.writeHead(204);
        return res.end();
    }

    try {
        // ── Root → index.html ──────────────────────────────────
        if (pname === '/' && method === 'GET') {
            const indexPath = HAS_DIST ? path.join(DIST_DIR, 'index.html') : path.join(ROOT, 'index.html');
            return serveStatic(res, indexPath);
        }

        // ── Static source files (dev mode) ─────────────────────
        if (pname.startsWith('/src/') && method === 'GET') {
            const safe = path.normalize(pname).replace(/^(\.\.(\/|\\|$))+/, '');
            return serveStatic(res, path.join(ROOT, safe));
        }

        // ── Vite build assets (production) ─────────────────────
        if (pname.startsWith('/assets/') && method === 'GET' && HAS_DIST) {
            const safe = path.normalize(pname).replace(/^(\.\.(\/|\\|$))+/, '');
            return serveStatic(res, path.join(DIST_DIR, safe));
        }

        // ── Public assets ──────────────────────────────────────
        if (pname.startsWith('/public/') && method === 'GET') {
            const safe = path.normalize(pname).replace(/^(\.\.(\/|\\|$))+/, '');
            // Try dist first, then root
            const distPath = path.join(DIST_DIR, safe);
            if (HAS_DIST && fs.existsSync(distPath)) {
                return serveStatic(res, distPath);
            }
            return serveStatic(res, path.join(ROOT, safe));
        }

        // ── GET /api/catalog — LIVE FROM DB ────────────────────
        if (pname === '/api/catalog' && method === 'GET') {
            const photos = await store.getPhotographs();
            const data = JSON.stringify(photos);
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
                'Cache-Control': 'no-cache',
            });
            return res.end(data);
        }

        // ── GET /api/auction/stream — SSE ──────────────────────
        if (pname === '/api/auction/stream' && method === 'GET') {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no',
            });

            res.write(': connected\n\n');

            const sendTick = (data) => {
                if (res.writableEnded) return;
                res.write(`data: ${JSON.stringify(data)}\n\n`);
            };

            // Immediately emit current state
            const now = Date.now();
            sendTick({
                serverTimestamp: now,
                auctions: Object.values(auctionStates).map(s => ({
                    itemId: s.itemId,
                    title: s.title,
                    currentPrice: s.currentPrice,
                    floor: s.floor,
                    sold: s.sold,
                    intervalMs: s.intervalMs,
                    nextDropIn: s.currentPrice <= s.floor ? 0 : (s._lastTick ? Math.max(0, s.intervalMs - (now - s._lastTick)) : s.intervalMs),
                })),
            });

            auctionBus.on('tick', sendTick);

            const heartbeat = setInterval(() => {
                if (!res.writableEnded) res.write(': heartbeat\n\n');
            }, 25_000);

            req.on('close', () => {
                auctionBus.off('tick', sendTick);
                clearInterval(heartbeat);
            });

            return;
        }

        // ── GET /api/image-preview/:id — Unencrypted Preview ───
        const previewMatch = pname.match(/^\/api\/image-preview\/(\d+)$/);
        if (previewMatch && method === 'GET') {
            const itemId = parseInt(previewMatch[1], 10);
            const item = await store.getPhotograph(itemId);

            if (!item || item.deletedByAdmin) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Item not found' }));
            }

            const loaded = await loadPhotoFileForItem(item);
            let imageBuffer;
            let contentType;
            if (loaded) {
                imageBuffer = loaded.buffer;
                contentType = loaded.mimeType || mimeFromFilename(loaded.filename);
            } else {
                imageBuffer = generatePlaceholderJPEG(item.color || '#888888', item.title);
                contentType = 'image/bmp';
            }

            res.writeHead(200, {
                'Content-Type': contentType,
                'Content-Length': imageBuffer.length,
                'Cache-Control': 'public, max-age=3600',
            });
            return res.end(imageBuffer);
        }

        // ── GET /api/image/:id — Encrypted Image Stream ────────
        const imageMatch = pname.match(/^\/api\/image\/(\d+)$/);
        if (imageMatch && method === 'GET') {
            const itemId = parseInt(imageMatch[1], 10);
            const item = await store.getPhotograph(itemId);

            if (!item || item.deletedByAdmin) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Item not found' }));
            }

            const loaded = await loadPhotoFileForItem(item);
            let imageBuffer;
            if (loaded) {
                imageBuffer = loaded.buffer;
            } else {
                imageBuffer = generatePlaceholderJPEG(item.color || '#888888', item.title);
            }

            const { iv, authTag, ciphertext } = encryptBuffer(imageBuffer);

            res.writeHead(200, {
                'Content-Type': 'application/octet-stream',
                'Content-Length': ciphertext.length,
                'Cache-Control': 'private, no-store',
                'X-IV': iv.toString('hex'),
                'X-Auth-Tag': authTag.toString('hex'),
                'Access-Control-Expose-Headers': 'X-IV, X-Auth-Tag',
            });

            return res.end(ciphertext);
        }

        // ── POST /api/upload — Multipart Upload + GridFS Storage ────
        if (pname === '/api/upload' && method === 'POST') {
            const contentType = req.headers['content-type'] || '';
            const boundaryMatch = contentType.match(/boundary=([^\s;]+)/);

            if (!boundaryMatch) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Missing boundary in Content-Type' }));
            }

            const uploadUser = await getUserFromRequest(req);
            if (!uploadUser) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Sign in as an artist to upload work' }));
            }
            const canUpload = uploadUser.role === 'photographer' &&
                (uploadUser.authProvider !== 'google' || uploadUser.artistProfileCompleted);
            if (!canUpload) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Complete your artist profile before uploading work' }));
            }
            const boundary = boundaryMatch[1];
            const body = await readBody(req);
            const parts = parseMultipart(body, boundary);

            // Extract form fields
            const fields = {};
            const files = [];
            for (const part of parts) {
                if (part.filename) {
                    files.push(part);
                } else if (part.name) {
                    fields[part.name] = part.data.toString('utf8');
                }
            }

            const saved = [];
            for (const filePart of files) {
                const ext = path.extname(filePart.filename).toLowerCase();
                const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
                if (!allowed.includes(ext)) continue;

                // Determine MIME type
                const mimeType = mimeFromFilename(filePart.filename);
                
                // Generate a unique filename for GridFS
                const gridfsFilename = `${crypto.randomBytes(16).toString('hex')}${ext}`;
                
                // Upload to GridFS (MongoDB) instead of filesystem
                const gridfsId = await store.uploadImageToGridFS(
                    filePart.data, 
                    gridfsFilename, 
                    mimeType
                );

                // Parse EXIF
                const exif = parseExifFromBuffer(filePart.data);

                // Insert into DB with GridFS reference
                const photoId = await store.insertPhotograph({
                    title: fields.title || filePart.filename.replace(ext, ''),
                    description: fields.description || null,
                    artist: uploadUser?.name || fields.artist || 'Unknown',
                    artist_id: uploadUser?.id || null,
                    category: fields.category || 'other',
                    tags: fields.tags ? fields.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
                    price: parseFloat(fields.price) || 1500,
                    auction_floor: parseFloat(fields.floor) || 500,
                    editions: parseInt(fields.editions) || 5,
                    remaining: parseInt(fields.editions) || 5,
                    color: fields.color || '#888888',
                    filename: filePart.filename,
                    saved_as: gridfsFilename,
                    gridfs_id: gridfsId,
                    file_size: filePart.data.length,
                    mime_type: mimeType,
                    exif_camera: exif.camera,
                    exif_lens: exif.lens,
                    exif_iso: exif.iso,
                    exif_aperture: exif.aperture,
                    exif_shutter: exif.shutter,
                });

                const price = parseFloat(fields.price) || 1500;
                const floor = parseFloat(fields.floor) || 500;
                const auctionType = (fields.auction_type === 'silent' ? 'silent' : 'dutch');

                // Create auction for this photograph
                const auctionId = await store.createAuction({
                    photo_id: photoId,
                    type: auctionType,
                    start_price: price,
                    floor_price: floor,
                });

                // Add to in-memory auction engine (Dutch ticks; silent is static until seller acts)
                auctionStates[photoId] = {
                    auctionId,
                    itemId: photoId,
                    title: fields.title || filePart.filename,
                    type: auctionType,
                    currentPrice: price,
                    floor: floor,
                    startPrice: price,
                    decrement: auctionType === 'silent' ? 0 : Math.round((price - floor) / 20),
                    startedAt: Date.now(),
                    intervalMs: 10_000,
                    sold: false,
                };

                saved.push({
                    id: photoId,
                    filename: filePart.filename,
                    savedAs: gridfsFilename,
                    gridfsId: gridfsId.toString(),
                    size: filePart.data.length,
                    artist: uploadUser?.name || 'Unknown',
                    artistId: uploadUser?.id || null,
                    exif,
                });

                console.log(`[upload] ${filePart.filename} → GridFS:${gridfsId} (${filePart.data.length}b) → photo#${photoId} auction#${auctionId}`);
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ uploaded: saved }));
        }

        // ── POST /api/auth/google — Firebase Google Sign-In ───────────────────
        if (pname === '/api/auth/google' && method === 'POST') {
            console.log('[AUTH] Processing Google authentication request');
            try {
                const body = await readJSON(req);
                const { uid, email, name, photoURL } = body;

                console.log('[AUTH] Google auth attempt for email:', email, 'uid:', uid);

                if (!uid || !email) {
                    console.error('[AUTH] Google auth failed: Missing uid or email');
                    console.error('[AUTH] Received data:', { uid: !!uid, email: !!email, name: !!name });
                    console.error('[AUTH] To fix: Ensure Firebase provides uid and email');
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Invalid Firebase user data' }));
                }

                console.log('[AUTH] Checking if Google user exists in database');
                // Check if user exists by email
                let user = await store.getUserByEmail(email.toLowerCase());

                if (!user) {
                    console.log('[AUTH] Creating new Google user');
                    // Create new user from Google sign-in
                    const userId = `usr_${crypto.randomBytes(8).toString('hex')}`;
                    await store.createUser({
                        id: userId,
                        email: email.toLowerCase(),
                        name: name || email.split('@')[0],
                        role: 'buyer', // Default role for Google sign-in
                        password_hash: null, // No password for Google users
                        firebase_uid: uid,
                        photo_url: photoURL,
                        auth_provider: 'google',
                    });
                    user = await store.getUserByEmail(email.toLowerCase());
                    console.log(`[AUTH] New Google user registered: ${email}`);
                } else {
                    console.log('[AUTH] Existing user found, updating Firebase UID if needed');
                    // Update existing user with Firebase UID if not set
                    if (!user.firebase_uid) {
                        await store.updateUserFirebaseUID(user.id, uid, photoURL);
                        console.log('[AUTH] Updated existing user with Firebase UID');
                    }
                }

                console.log('[AUTH] Generating authentication token for Google user');
                const token = generateToken(user.email);
                tokens.set(token, user.email);

                console.log('[AUTH] Updating user last access time');
                await store.touchUser(user.id);

                console.log('[AUTH] Google authentication successful for:', user.email);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    user: serializeUser({ ...user, photo_url: user.photo_url || photoURL }),
                    token,
                }));
            } catch (error) {
                console.error('[AUTH] Unexpected error during Google authentication:', error.message);
                console.error('[AUTH] Stack trace:', error.stack);
                console.error('[AUTH] To fix: Check Firebase config, database connection, or contact developer');
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Internal server error' }));
            }
        }

        // ── POST /api/auth/login — DB-BACKED ───────────────────
        if (pname === '/api/auth/login' && method === 'POST') {
            console.log('[AUTH] Processing login request');
            try {
                const body = await readJSON(req);
                const { email, password } = body;

                console.log('[AUTH] Login attempt for email:', email);

                if (!email || !password) {
                    console.error('[AUTH] Login failed: Missing email or password');
                    console.error('[AUTH] To fix: Ensure both email and password are provided in request body');
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Email and password are required' }));
                }

                console.log('[AUTH] Looking up user in database');
                const user = await store.getUserByEmail(email.toLowerCase());

                if (!user) {
                    console.error('[AUTH] Login failed: User not found for email:', email);
                    console.error('[AUTH] To fix: User may not be registered, or email case sensitivity issue');
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Invalid email or password' }));
                }

                console.log('[AUTH] Verifying password');
                const hash = crypto.createHash('sha256').update(password).digest('hex');

                if (!user.password_hash) {
                    console.error('[AUTH] Login failed: User has no password hash (likely Google-only account)');
                    console.error('[AUTH] To fix: User should login with Google instead');
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Invalid email or password' }));
                }

                if (user.password_hash !== hash) {
                    console.error('[AUTH] Login failed: Password hash mismatch');
                    console.error('[AUTH] To fix: Check password is correct');
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Invalid email or password' }));
                }

                console.log('[AUTH] Generating authentication token');
                const token = generateToken(user.email);
                tokens.set(token, user.email);

                console.log('[AUTH] Updating user last access time');
                await store.touchUser(user.id);

                console.log('[AUTH] Login successful for user:', user.email);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    user: serializeUser(user),
                    token,
                }));
            } catch (error) {
                console.error('[AUTH] Unexpected error during login:', error.message);
                console.error('[AUTH] Stack trace:', error.stack);
                console.error('[AUTH] To fix: Check database connection, request parsing, or contact developer');
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Internal server error' }));
            }
        }

        // ── POST /api/auth/register — DB-BACKED ────────────────
        if (pname === '/api/auth/register' && method === 'POST') {
            console.log('[AUTH] Processing registration request');
            try {
                const body = await readJSON(req);
                const { email, password, name, role } = body;

                console.log('[AUTH] Registration attempt for email:', email, 'role:', role);

                if (!email || !password || !name) {
                    console.error('[AUTH] Registration failed: Missing required fields');
                    console.error('[AUTH] Required: email, password, name. Received:', { email: !!email, password: !!password, name: !!name });
                    console.error('[AUTH] To fix: Ensure all required fields are provided in request body');
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Email, password, and name are required' }));
                }

                console.log('[AUTH] Checking if user already exists');
                const existing = await store.getUserByEmail(email.toLowerCase());
                if (existing) {
                    console.error('[AUTH] Registration failed: Email already exists:', email);
                    console.error('[AUTH] To fix: User should login instead of register, or use different email');
                    const msg = 'An account with this email already exists';
                    res.writeHead(409, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: msg }));
                }

                const userRole = (role === 'photographer') ? 'photographer' : 'buyer';
                console.log('[AUTH] Creating user with role:', userRole);

                const hash = crypto.createHash('sha256').update(password).digest('hex');
                const id = `usr_${crypto.randomBytes(8).toString('hex')}`;

                console.log('[AUTH] Saving user to database');
                await store.createUser({ id, email, name, role: userRole, password_hash: hash });

                console.log('[AUTH] Generating authentication token');
                const token = generateToken(email);
                tokens.set(token, email.toLowerCase());

                console.log(`[AUTH] Registration successful: ${email} as ${userRole}`);
                const createdUser = await store.getUserById(id);
                res.writeHead(201, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    user: serializeUser(createdUser),
                    token,
                }));
            } catch (error) {
                console.error('[AUTH] Unexpected error during registration:', error.message);
                console.error('[AUTH] Stack trace:', error.stack);
                console.error('[AUTH] To fix: Check database connection, request parsing, or contact developer');
                res.writeHead(500, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Internal server error' }));
            }
        }

        // ── GET /api/auth/me ───────────────────────────────────
        if (pname === '/api/auth/me' && method === 'GET') {
            const user = await getUserFromRequest(req);
            if (!user) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Not authenticated' }));
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ user: serializeUser(user) }));
        }

        // ── PUT /api/auth/profile ──────────────────────────────
        if (pname === '/api/auth/profile' && method === 'PUT') {
            const user = await getUserFromRequest(req);
            if (!user) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Not authenticated' }));
            }

            const body = await readJSON(req);
            const name = String(body.name || '').trim();
            const phone = String(body.phone || '').trim();
            const location = String(body.location || '').trim();
            const bio = String(body.bio || '').trim();
            const artistStatement = String(body.artistStatement || '').trim();
            const wantsArtistRole = Boolean(body.upgradeToArtist);

            if (!name || !phone || !location) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Name, phone, and location are required' }));
            }

            if (wantsArtistRole && (!bio || !artistStatement)) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Bio and artist statement are required to become an artist' }));
            }

            const updatedUser = await store.updateUserProfile(user.id, {
                name,
                phone,
                location,
                bio,
                artist_statement: artistStatement,
                website: body.website,
                instagram: body.instagram,
                upgrade_to_artist: wantsArtistRole,
            });

            if (!updatedUser) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'User not found' }));
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ user: serializeUser(updatedUser) }));
        }

        // —— PUT /api/auth/profile-photo —— Update the authenticated profile photo
        if (pname === '/api/auth/profile-photo' && method === 'PUT') {
            const user = await getUserFromRequest(req);
            if (!user) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Not authenticated' }));
            }

            const body = await readJSON(req);
            const photoURL = String(body.photoURL || '').trim();
            if (!photoURL) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Profile photo is required' }));
            }
            if (photoURL.length > 2_500_000) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Profile photo is too large' }));
            }

            const updatedUser = await store.updateUserPhoto(user.id, photoURL);
            if (!updatedUser) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'User not found' }));
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ user: serializeUser(updatedUser) }));
        }

        // —— DELETE /api/auth/account —— Delete the authenticated account
        if (pname === '/api/auth/account' && method === 'DELETE') {
            const user = await getUserFromRequest(req);
            if (!user) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Not authenticated' }));
            }

            const result = await store.deleteUser(user.id);
            if (!result.success) {
                const status = result.error === 'Cannot delete admin users' ? 403 : 400;
                res.writeHead(status, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: result.error }));
            }

            for (const photoId of result.deletedPhotoIds || []) {
                if (auctionStates[photoId]) {
                    delete auctionStates[photoId];
                }
            }
            revokeTokensForEmail(user.email);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: true }));
        }

        // ── POST /api/bids/:id — DB-BACKED ─────────────────────
        const bidMatch = pname.match(/^\/api\/bids\/(\d+)$/);
        if (bidMatch && method === 'POST') {
            const itemId = parseInt(bidMatch[1], 10);
            const dbAuc = await store.getAuctionByPhotoId(itemId);
            if (!dbAuc) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Auction not found' }));
            }
            if (dbAuc.sold || dbAuc.ended_at) {
                res.writeHead(410, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Auction has already ended' }));
            }

            const body = await readJSON(req);
            const amount = parseFloat(body.amount);
            if (isNaN(amount) || amount <= 0) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Invalid bid amount' }));
            }

            const bidUser = await getUserFromRequest(req);
            
            // Prevent bidding on own content
            const photo = await store.getPhotograph(itemId);
            if (photo?.deletedByAdmin) {
                res.writeHead(410, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'This item was removed by the admin' }));
            }
            if (bidUser) {
                if (photo && (photo.artistId === bidUser.id || photo.artist === bidUser.name)) {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'You cannot bid on your own content' }));
                }
            }
            
            const auction = auctionStates[itemId];

            // ── Sealed (silent): pending until seller grants or declines ──
            if (dbAuc.type === 'silent') {
                if (!bidUser) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Sign in to place a sealed bid' }));
                }
                if (amount < (dbAuc.floor_price || 0)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: `Minimum bid is $${dbAuc.floor_price}` }));
                }
                await store.placeBid({
                    auction_id: dbAuc.id,
                    user_id: bidUser.id,
                    user_name: bidUser.name,
                    amount,
                    accepted: false,
                    bid_status: 'pending',
                });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({
                    ok: true,
                    pending: true,
                    accepted: false,
                    message: 'Sealed bid recorded. The seller may accept or decline.',
                }));
            }

            // ── Dutch / open: instant win at or above current price ──
            if (!auction) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Auction not found' }));
            }
            if (!bidUser) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Sign in to buy in a Dutch auction' }));
            }
            if (auction.sold) {
                res.writeHead(410, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Auction has already ended' }));
            }

            const accepted = amount >= auction.currentPrice;
            let purchase = null;
            if (accepted) {
                purchase = await store.purchaseEdition(itemId, bidUser.id, {
                    license: 'commercial',
                    amount,
                    payment_method: 'auction-dutch',
                    payment_reference: `DUTCH-${auction.auctionId}-${Date.now()}`,
                    source: 'auction',
                    auction_id: auction.auctionId,
                });
                if (!purchase.success) {
                    const status = purchase.error === 'Already purchased' ? 409 :
                        purchase.error === 'Authentication required' ? 401 : 400;
                    res.writeHead(status, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: purchase.error, currentPrice: auction.currentPrice }));
                }
            }
            await store.placeBid({
                auction_id: auction.auctionId,
                user_id: bidUser.id,
                user_name: bidUser.name,
                amount,
                accepted,
                bid_status: accepted ? 'accepted' : 'active',
            });

            if (accepted) {
                auction.sold = true;
                auction.soldPrice = amount;
                await store.sellAuction(auction.auctionId, amount, bidUser.id);
                console.log(`[bid] Item ${itemId} SOLD for $${amount} → DB`);

                const refreshedPhoto = await store.getPhotograph(itemId);
                if (refreshedPhoto?.remaining > 0) {
                    setTimeout(() => {
                        auction.currentPrice = auction.startPrice;
                        auction.sold = false;
                        auction._lastTick = Date.now();
                        store.resetAuction(auction.auctionId).catch(e => console.error('[bid] reset error:', e.message));
                    }, 30_000);
                }
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
                accepted,
                currentPrice: auction.currentPrice,
                sold: auction.sold,
                remaining: purchase?.remaining,
            }));
        }

        // ── GET /api/users — All users (admin) ─────────────────
        if (pname === '/api/users' && method === 'GET') {
            const users = await store.getUsers();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(users));
        }

        // ── GET /api/auctions — All auctions ───────────────────
        if (pname === '/api/auctions' && method === 'GET') {
            const auctions = await store.getAuctions();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(auctions));
        }

        // ── GET /api/bids/:id — Bids for auction (id = photograph / catalog item id, same as POST) ──
        const bidsGetMatch = pname.match(/^\/api\/bids\/(\d+)$/);
        if (bidsGetMatch && method === 'GET') {
            const photoId = parseInt(bidsGetMatch[1], 10);
            const auction = await store.getAuctionByPhotoId(photoId);
            if (!auction) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Auction not found' }));
            }
            const bids = await store.getBidsForAuction(auction.id);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(bids));
        }

        // ── GET /api/me/dashboard — Buyer collection + bids (DB) ──
        if (pname === '/api/me/dashboard' && method === 'GET') {
            const user = await getUserFromRequest(req);
            if (!user) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Not authenticated' }));
            }
            const collection = await store.getBuyerCollectionFromDb(user.id);
            const snap = await store.getBuyerBidSnapshot(user.id);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
                collection,
                activeBids: snap.active,
                wonAuctions: snap.won,
            }));
        }

        // ── GET /api/seller/incoming-bids — Bids on my listings ──
        if (pname === '/api/me/removed-works' && method === 'GET') {
            const user = await getUserFromRequest(req);
            if (!user) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Not authenticated' }));
            }
            const removedWorks = await store.getRemovedWorksForArtist(user.id);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(removedWorks));
        }

        if (pname === '/api/messages/inbox' && method === 'GET') {
            const user = await getUserFromRequest(req);
            if (!user) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Not authenticated' }));
            }
            const threads = await store.getInboxThreads(user.id);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(threads));
        }

        const messageThreadMatch = pname.match(/^\/api\/messages\/thread\/(.+)$/);
        if (messageThreadMatch && method === 'GET') {
            const user = await getUserFromRequest(req);
            if (!user) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Not authenticated' }));
            }
            const otherUserId = decodeURIComponent(messageThreadMatch[1]);
            if (!otherUserId || otherUserId === user.id) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Choose another user to message' }));
            }
            const otherUser = await store.getUserById(otherUserId);
            if (!otherUser) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Recipient not found' }));
            }
            const conversation = await store.getConversation(user.id, otherUserId);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ recipient: serializeUser(otherUser), messages: conversation }));
        }

        if (messageThreadMatch && method === 'POST') {
            const user = await getUserFromRequest(req);
            if (!user) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Not authenticated' }));
            }
            const otherUserId = decodeURIComponent(messageThreadMatch[1]);
            if (!otherUserId || otherUserId === user.id) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Choose another user to message' }));
            }
            const otherUser = await store.getUserById(otherUserId);
            if (!otherUser) {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Recipient not found' }));
            }
            const body = await readJSON(req);
            const content = String(body.content || '').trim();
            if (!content) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Message cannot be empty' }));
            }
            if (content.length > 2000) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Message is too long' }));
            }
            const message = await store.sendMessage(user.id, user.name, otherUser.id, otherUser.name, content);
            res.writeHead(201, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ message }));
        }

        if (pname === '/api/seller/incoming-bids' && method === 'GET') {
            const user = await getUserFromRequest(req);
            if (!user) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Not authenticated' }));
            }
            const bids = await store.getIncomingBidsForSeller(user.id);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(bids));
        }

        // ── POST /api/seller/bids/:bidId/accept ─────────────────────
        const sellerAcceptMatch = pname.match(/^\/api\/seller\/bids\/(\d+)\/accept$/);
        if (sellerAcceptMatch && method === 'POST') {
            const user = await getUserFromRequest(req);
            if (!user) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Not authenticated' }));
            }
            const bidId = parseInt(sellerAcceptMatch[1], 10);
            const result = await store.sellerAcceptBid(user.id, bidId);
            if (!result.success) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: result.error }));
            }
            if (result.photo_id != null && auctionStates[result.photo_id]) {
                auctionStates[result.photo_id].sold = false;
                auctionStates[result.photo_id].ended = true;
                auctionStates[result.photo_id].currentPrice = result.amount || auctionStates[result.photo_id].currentPrice;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: true, paymentPending: true, bidId: result.bid_id }));
        }

        // ── POST /api/seller/bids/:bidId/decline ───────────────────
        const sellerDeclineMatch = pname.match(/^\/api\/seller\/bids\/(\d+)\/decline$/);
        if (sellerDeclineMatch && method === 'POST') {
            const user = await getUserFromRequest(req);
            if (!user) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Not authenticated' }));
            }
            const bidId = parseInt(sellerDeclineMatch[1], 10);
            const result = await store.sellerDeclineBid(user.id, bidId);
            if (!result.success) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: result.error }));
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: true }));
        }

        // ── POST /api/seller/auctions/:photoId/end — End without sale
        const sellerEndMatch = pname.match(/^\/api\/seller\/auctions\/(\d+)\/end$/);
        if (sellerEndMatch && method === 'POST') {
            const user = await getUserFromRequest(req);
            if (!user) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Not authenticated' }));
            }
            const photoId = parseInt(sellerEndMatch[1], 10);
            const result = await store.sellerEndAuction(user.id, photoId);
            if (!result.success) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: result.error }));
            }
            if (auctionStates[photoId]) {
                auctionStates[photoId].ended = true;
            }
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: true }));
        }

        // ── POST /api/purchase/:id — Purchase an edition ─────────
        const purchaseMatch = pname.match(/^\/api\/purchase\/(\d+)$/);
        if (purchaseMatch && method === 'POST') {
            const photoId = parseInt(purchaseMatch[1], 10);
            const buyer = await getUserFromRequest(req);
            const body = await readJSON(req);

            if (!buyer) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Authentication required' }));
            }

            // Prevent purchasing own content
            const photo = await store.getPhotograph(photoId);
            if (photo?.deletedByAdmin) {
                res.writeHead(410, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'This item was removed by the admin' }));
            }
            if (photo && (photo.artistId === buyer.id || photo.artist === buyer.name)) {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'You cannot purchase your own content' }));
            }

            const purchaseMode = String(body.purchaseMode || 'direct');
            let result;

            if (purchaseMode === 'dutch') {
                const dbAuc = await store.getAuctionByPhotoId(photoId);
                const auction = auctionStates[photoId];
                if (!dbAuc || dbAuc.type === 'silent') {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Dutch auction not found' }));
                }
                if (!auction || auction.sold || dbAuc.ended_at) {
                    res.writeHead(410, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Auction has already ended' }));
                }

                const offeredAmount = Number.isFinite(parseFloat(body.amount))
                    ? parseFloat(body.amount)
                    : Number(auction.currentPrice || dbAuc.current_price || photo?.price || 0);
                const livePrice = Number(auction.currentPrice || dbAuc.current_price || offeredAmount);

                if (offeredAmount < livePrice) {
                    res.writeHead(409, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'The live auction price changed before payment completed', currentPrice: livePrice }));
                }

                result = await store.purchaseEdition(photoId, buyer.id, {
                    license: 'commercial',
                    amount: offeredAmount,
                    payment_method: body.paymentMethod || 'auction-dutch-upi',
                    payment_reference: body.paymentReference || null,
                    payment_app: body.paymentApp || null,
                    upi_id: body.upiId || null,
                    payee_vpa: body.payeeVpa || null,
                    source: 'auction',
                    auction_id: dbAuc.id,
                });

                if (result.success) {
                    await store.placeBid({
                        auction_id: dbAuc.id,
                        user_id: buyer.id,
                        user_name: buyer.name,
                        amount: offeredAmount,
                        accepted: true,
                        bid_status: 'accepted',
                    });
                    await store.sellAuction(dbAuc.id, offeredAmount, buyer.id);
                    if (auctionStates[photoId]) {
                        auctionStates[photoId].sold = true;
                        auctionStates[photoId].currentPrice = offeredAmount;
                    }
                    await scheduleAuctionResetIfNeeded(photoId, dbAuc.id);
                }
            } else if (purchaseMode === 'silent-award') {
                const bidId = parseInt(body.bidId, 10);
                if (!Number.isFinite(bidId)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Winning bid reference is missing' }));
                }

                result = await store.finalizeAcceptedBidPurchase(photoId, buyer.id, bidId, {
                    amount: Number.isFinite(parseFloat(body.amount)) ? parseFloat(body.amount) : undefined,
                    payment_method: body.paymentMethod || 'auction-silent-upi',
                    payment_reference: body.paymentReference || null,
                    payment_app: body.paymentApp || null,
                    upi_id: body.upiId || null,
                    payee_vpa: body.payeeVpa || null,
                });

                if (result.success && auctionStates[photoId]) {
                    auctionStates[photoId].sold = true;
                    auctionStates[photoId].ended = true;
                    auctionStates[photoId].currentPrice = result.amount || auctionStates[photoId].currentPrice;
                }
            } else {
                result = await store.purchaseEdition(photoId, buyer.id, {
                    license: ['personal', 'editorial', 'commercial'].includes(body.license) ? body.license : 'personal',
                    amount: Number.isFinite(parseFloat(body.amount)) ? parseFloat(body.amount) : (photo?.price || 0),
                    payment_method: body.paymentMethod || 'upi-simulated',
                    payment_reference: body.paymentReference || null,
                    payment_app: body.paymentApp || null,
                    upi_id: body.upiId || null,
                    payee_vpa: body.payeeVpa || null,
                    source: 'direct',
                });
            }

            if (!result.success) {
                const status = result.error === 'Already purchased' ? 409 :
                    result.error === 'Authentication required' ? 401 : 400;
                res.writeHead(status, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: result.error }));
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
                success: true,
                remaining: result.remaining,
                soldOut: result.soldOut,
                purchaseMode,
            }));
        }

        // ── POST /api/claim-photos — Claim all unclaimed photos for current user ─────────
        if (pname === '/api/claim-photos' && method === 'POST') {
            const user = await getUserFromRequest(req);
            
            // Try to get user info from request body if not authenticated
            let userId = user?.id;
            let userName = user?.name;
            
            if (!userId) {
                try {
                    const body = await readBody(req);
                    const data = JSON.parse(body.toString());
                    userId = data.userId;
                    userName = data.userName;
                } catch (e) {
                    // Ignore parse errors
                }
            }
            
            if (!userId || !userName) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'User info required' }));
            }
            
            const result = await store.claimUnclaimedPhotos(userId, userName);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
                success: true,
                claimed: result.modified,
            }));
        }

        // ── POST /api/likes/:id — Toggle like on a photo ─────────
        const likeMatch = pname.match(/^\/api\/likes\/(\d+)$/);
        if (likeMatch && method === 'POST') {
            const photoId = parseInt(likeMatch[1], 10);
            const user = await getUserFromRequest(req);
            
            if (!user) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Authentication required' }));
            }
            
            const result = await store.toggleLike(photoId, user.id);
            const likeCount = await store.getLikesForPhoto(photoId);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ ...result, likeCount }));
        }

        // ── GET /api/likes/:id — Get like count and user's like status ─────────
        if (likeMatch && method === 'GET') {
            const photoId = parseInt(likeMatch[1], 10);
            const user = await getUserFromRequest(req);
            
            const likeCount = await store.getLikesForPhoto(photoId);
            const hasLiked = user ? await store.hasUserLiked(photoId, user.id) : false;
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ likeCount, hasLiked }));
        }

        // ── GET /api/comments/:id — Get comments for a photo ─────────
        const commentsMatch = pname.match(/^\/api\/comments\/(\d+)$/);
        if (commentsMatch && method === 'GET') {
            const photoId = parseInt(commentsMatch[1], 10);
            const comments = await store.getCommentsForPhoto(photoId);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(comments));
        }

        // ── POST /api/comments/:id — Add a comment to a photo ─────────
        if (commentsMatch && method === 'POST') {
            const photoId = parseInt(commentsMatch[1], 10);
            const user = await getUserFromRequest(req);
            
            if (!user) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Authentication required' }));
            }
            
            const body = await readJSON(req);
            const { content } = body;
            
            if (!content || content.trim().length === 0) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Comment content is required' }));
            }
            
            if (content.length > 1000) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Comment too long (max 1000 characters)' }));
            }
            
            const comment = await store.addComment(photoId, user.id, user.name, content);
            
            res.writeHead(201, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(comment));
        }

        // ── DELETE /api/comments/:photoId/:commentId — Delete a comment ─────────
        const deleteCommentMatch = pname.match(/^\/api\/comments\/(\d+)\/(\d+)$/);
        if (deleteCommentMatch && method === 'DELETE') {
            const commentId = parseInt(deleteCommentMatch[2], 10);
            const user = await getUserFromRequest(req);
            
            if (!user) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Authentication required' }));
            }
            
            const result = await store.deleteComment(commentId, user.id);
            
            if (!result.success) {
                const status = result.error === 'Comment not found' ? 404 : 403;
                res.writeHead(status, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: result.error }));
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: true }));
        }

        // ── GET /api/admin/stats — Admin dashboard stats ─────────
        if (pname === '/api/admin/stats' && method === 'GET') {
            const user = await getUserFromRequest(req);
            
            if (!user || user.role !== 'admin') {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Admin access required' }));
            }
            
            const stats = await store.getAdminStats();
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(stats));
        }

        // ── GET /api/admin/users — All users with stats (admin) ─────────
        if (pname === '/api/admin/users' && method === 'GET') {
            const user = await getUserFromRequest(req);
            
            if (!user || user.role !== 'admin') {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Admin access required' }));
            }
            
            const users = await store.getAllUsersWithStats();
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(users));
        }

        // ── GET /api/admin/engagement — Photo engagement stats (admin) ─────────
        if (pname === '/api/admin/engagement' && method === 'GET') {
            const user = await getUserFromRequest(req);
            
            if (!user || user.role !== 'admin') {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Admin access required' }));
            }
            
            const engagement = await store.getPhotoEngagementStats();
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(engagement));
        }

        // ── DELETE /api/admin/users/:id — Delete a user (admin) ─────────
        const deleteUserMatch = pname.match(/^\/api\/admin\/users\/(.+)$/);
        if (deleteUserMatch && method === 'DELETE') {
            const user = await getUserFromRequest(req);
            
            if (!user || user.role !== 'admin') {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Admin access required' }));
            }
            
            const userId = deleteUserMatch[1];
            const result = await store.deleteUser(userId);
            
            if (!result.success) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: result.error }));
            }

            for (const photoId of result.deletedPhotoIds || []) {
                if (auctionStates[photoId]) {
                    delete auctionStates[photoId];
                }
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: true }));
        }

        // —— POST /api/resale/:id —— Relist an owned work back into the marketplace
        const resaleMatch = pname.match(/^\/api\/resale\/(\d+)$/);
        if (resaleMatch && method === 'POST') {
            const photoId = parseInt(resaleMatch[1], 10);
            const user = await getUserFromRequest(req);
            if (!user) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Authentication required' }));
            }

            const body = await readJSON(req);
            const result = await store.relistOwnedPurchase(user.id, photoId, {
                start_price: body.startPrice,
                floor_price: body.floorPrice,
                type: body.auctionType,
            });
            if (!result.success) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: result.error }));
            }

            const photo = await store.getPhotograph(photoId);
            auctionStates[photoId] = {
                auctionId: result.auction_id,
                itemId: photoId,
                title: photo?.title || `Work #${photoId}`,
                type: result.type,
                currentPrice: result.current_price,
                floor: result.floor_price,
                startPrice: result.start_price,
                decrement: result.decrement,
                startedAt: Date.now(),
                intervalMs: result.interval_ms || 10_000,
                sold: false,
                ended: false,
            };

            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({
                success: true,
                remaining: result.remaining,
                auctionType: result.type,
                startPrice: result.start_price,
                floorPrice: result.floor_price,
            }));
        }

        // ── DELETE /api/admin/photos/:id — Delete a photo (admin) ─────────
        const deletePhotoMatch = pname.match(/^\/api\/admin\/photos\/(\d+)$/);
        if (deletePhotoMatch && method === 'DELETE') {
            const user = await getUserFromRequest(req);
            
            if (!user || user.role !== 'admin') {
                res.writeHead(403, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: 'Admin access required' }));
            }
            
            const photoId = parseInt(deletePhotoMatch[1], 10);
            
            // Also remove from in-memory auction states
            if (auctionStates[photoId]) {
                delete auctionStates[photoId];
            }
            
            const result = await store.deletePhoto(photoId);
            
            if (!result.success) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                return res.end(JSON.stringify({ error: result.error }));
            }
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ success: true }));
        }

        // ── SPA Catch-All ──────────────────────────────────────
        if (method === 'GET' && !pname.startsWith('/api/')) {
            const indexPath = HAS_DIST ? path.join(DIST_DIR, 'index.html') : path.join(ROOT, 'index.html');
            return serveStatic(res, indexPath);
        }

        // ── 404 ────────────────────────────────────────────────
        console.error(`[SERVER] 404 Not Found: ${method} ${pname}`);
        console.error('[SERVER] No route matched this request');
        console.error('[SERVER] To fix: Check URL spelling, ensure API endpoint exists, verify HTTP method');
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `No route matched: ${method} ${pname}` }));

    } catch (err) {
        console.error('[SERVER] Unexpected error in request handler:', err.message);
        console.error('[SERVER] Stack trace:', err.stack);
        console.error('[SERVER] Request details:', { method, url: pname });
        console.error('[SERVER] To fix: Check request parsing, database operations, or add error handling');
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal server error', message: err.message }));
        }
    }
}

// ─────────────────────────────────────────────────────────────
// PLACEHOLDER JPEG GENERATOR
// ─────────────────────────────────────────────────────────────

function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const n = parseInt(hex, 16);
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function generatePlaceholderJPEG(hexColor, label = '') {
    const [r, g, b] = hexToRgb(hexColor);
    const W = 800, H = 600;
    const pixels = Buffer.alloc(W * H * 3);
    for (let i = 0; i < W * H; i++) {
        const x = (i % W) / W;
        const y = Math.floor(i / W) / H;
        const vignette = 1 - 0.5 * (Math.pow(x - 0.5, 2) + Math.pow(y - 0.5, 2)) * 4;
        pixels[i * 3] = Math.max(0, Math.min(255, Math.round(r * vignette)));
        pixels[i * 3 + 1] = Math.max(0, Math.min(255, Math.round(g * vignette)));
        pixels[i * 3 + 2] = Math.max(0, Math.min(255, Math.round(b * vignette)));
    }
    const fileSize = 54 + pixels.length;
    const bmp = Buffer.alloc(54);
    bmp.write('BM', 0, 'ascii');
    bmp.writeUInt32LE(fileSize, 2);
    bmp.writeUInt32LE(0, 6);
    bmp.writeUInt32LE(54, 10);
    bmp.writeUInt32LE(40, 14);
    bmp.writeInt32LE(W, 18);
    bmp.writeInt32LE(-H, 22);
    bmp.writeUInt16LE(1, 26);
    bmp.writeUInt16LE(24, 28);
    bmp.writeUInt32LE(0, 30);
    bmp.writeUInt32LE(pixels.length, 34);
    bmp.writeInt32LE(2835, 38);
    bmp.writeInt32LE(2835, 42);
    bmp.writeUInt32LE(0, 46);
    bmp.writeUInt32LE(0, 50);
    return Buffer.concat([bmp, pixels]);
}

// ─────────────────────────────────────────────────────────────
// START SERVER (async boot for MongoDB)
// ─────────────────────────────────────────────────────────────

async function main() {
    console.log('[SERVER] Starting ChitraVithika server...');

    console.log('[SERVER] Step 1: Connecting to MongoDB');
    try {
        await store.connect();
        console.log('[SERVER] MongoDB connection successful');
    } catch (error) {
        console.error('[SERVER] Failed to connect to MongoDB:', error.message);
        console.error('[SERVER] To fix: Check MONGO_URI, ensure MongoDB is running, verify network connectivity');
        throw error;
    }

    console.log('[SERVER] Step 2: Initializing auctions from database');
    try {
        await initAuctions();
        console.log('[SERVER] Auctions initialized successfully');
    } catch (error) {
        console.error('[SERVER] Failed to initialize auctions:', error.message);
        console.error('[SERVER] To fix: Check database schema, auction data integrity');
        throw error;
    }

    console.log('[SERVER] Step 3: Starting auction ticker (every 2 seconds)');
    setInterval(tickAuctions, 2_000);
    tickAuctions(); // Initial tick

    console.log('[SERVER] Step 4: Starting HTTP server');
    const server = http.createServer(handleRequest);

    server.listen(PORT, () => {
        console.log('');
        console.log('  ██████╗██╗  ██╗██╗████████╗██████╗  █████╗ ');
        console.log('  ██╔════╝██║  ██║██║╚══██╔══╝██╔══██╗██╔══██╗');
        console.log('  ██║     ███████║██║   ██║   ██████╔╝███████║');
        console.log('  ██║     ██╔══██║██║   ██║   ██╔══██╗██╔══██║');
        console.log('  ╚██████╗██║  ██║██║   ██║   ██║  ██║██║  ██║');
        console.log('   ╚═════╝╚═╝  ╚═╝╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝');
        console.log('');
        console.log('  ██╗   ██╗██╗████████╗██╗  ██╗██╗██╗  ██╗ █████╗ ');
        console.log('  ██║   ██║██║╚══██╔══╝██║  ██║██║██║ ██╔╝██╔══██╗');
        console.log('  ██║   ██║██║   ██║   ███████║██║█████╔╝ ███████║');
        console.log('  ╚██╗ ██╔╝██║   ██║   ██╔══██║██║██╔═██╗ ██╔══██║');
        console.log('   ╚████╔╝ ██║   ██║   ██║  ██║██║██║  ██╗██║  ██║');
        console.log('    ╚═══╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚═╝  ╚═╝');
        console.log('');
        console.log(`  🌐  Server:  http://localhost:${PORT}`);
        console.log(`  📡  SSE:     http://localhost:${PORT}/api/auction/stream`);
        console.log(`  📷  Catalog: http://localhost:${PORT}/api/catalog`);
        console.log(`  🍃  Database: MongoDB (${process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/chitravithika'})`);
        console.log('');
        console.log('  Production mode. All data persisted to MongoDB.');
        console.log('');
        console.log('[SERVER] Server startup completed successfully!');
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`[SERVER] Port ${PORT} is already in use.`);
            console.error('[SERVER] To fix: Change PORT in .env or kill process using the port');
        } else {
            console.error('[SERVER] Server error:', err);
            console.error('[SERVER] To fix: Check system resources, port availability');
        }
        process.exit(1);
    });

    console.log('[SERVER] Setting up graceful shutdown handlers');
    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n[SERVER] Received SIGINT, shutting down gracefully...');
        console.log('[SERVER] Closing MongoDB connection...');
        await store.close();
        console.log('[SERVER] Shutdown complete');
        process.exit(0);
    });
    process.on('SIGTERM', async () => {
        console.log('\n[SERVER] Received SIGTERM, shutting down gracefully...');
        await store.close();
        process.exit(0);
    });
}

// Crash protection — log but don't exit (skip on Vercel serverless)
if (require.main === module) {
    console.log('[SERVER] Setting up crash protection handlers');
    process.on('uncaughtException', (err) => {
        console.error('[CRASH] Uncaught exception:', err.message);
        console.error('[CRASH] Stack trace:', err.stack);
        console.error('[CRASH] To fix: Check for null/undefined access, async errors, or unhandled promises');
    });
    process.on('unhandledRejection', (reason) => {
        console.error('[CRASH] Unhandled promise rejection:', reason);
        console.error('[CRASH] To fix: Add .catch() to promises or use try/catch in async functions');
    });
}

// ─────────────────────────────────────────────────────────────
// EXPORTS for Vercel serverless adapter (api/index.js)
// When imported as a module, main() is NOT called automatically.
// ─────────────────────────────────────────────────────────────
module.exports = { handleRequest };

// Boot server only when run directly (npm start / node server.js)
// When required by Vercel's api/index.js, skip the HTTP server startup
if (require.main === module) {
    main().catch(err => {
        console.error('[FATAL] Failed to start server:', err.message);
        process.exit(1);
    });
}
