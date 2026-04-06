/**
 * ChitraVithika — Vercel Serverless Function Adapter
 * 
 * Bridges Vercel's request/response format to the existing
 * Node.js http.IncomingMessage / http.ServerResponse interface
 * used by server.js handleRequest().
 *
 * Only API routes (/api/*) are handled here.
 * Static files and SPA routing are handled by Vercel directly from dist/.
 */
// thechanesddddddd
'use strict';

const { EventEmitter } = require('events');
const path = require('path');

// Load environment variables from project root
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const store = require('../db/database.js');

// ─── Connection caching across serverless invocations ──────────
let dbPromise = null;

function getDbConnection() {
    if (!dbPromise) {
        dbPromise = store.connect().then(() => {
            console.log('[vercel] MongoDB connected (serverless)');
        }).catch((err) => {
            console.error('[vercel] MongoDB connection failed:', err.message);
            dbPromise = null; // Reset so next invocation can retry
            throw err;
        });
    }
    return dbPromise;
}

// ─── Import the handler from server.js ────────────────────────
// server.js exports handleRequest when loaded as a module
let handleRequest = null;
let loadError = null;

try {
    const serverModule = require('../server.js');
    handleRequest = serverModule.handleRequest;
    if (!handleRequest) {
        loadError = 'server.js did not export handleRequest';
        console.error('[vercel]', loadError);
    }
} catch (err) {
    loadError = err.message;
    console.error('[vercel] Failed to load server.js:', err.message);
    console.error('[vercel] Stack:', err.stack);
}

// ─── Vercel handler ────────────────────────────────────────────
module.exports = async function vercelHandler(req, res) {
    // Fast fail if server.js couldn't be loaded
    if (loadError) {
        console.error('[vercel] Handler not available:', loadError);
        return res.status(500).json({ 
            error: 'Server initialization failed',
            detail: loadError,
        });
    }

    if (!handleRequest) {
        return res.status(500).json({ error: 'Server handler not available' });
    }

    // 1. Ensure DB connection
    try {
        await getDbConnection();
    } catch (err) {
        console.error('[vercel] DB connection failed:', err.message);
        return res.status(503).json({ 
            error: 'Database connection failed',
            detail: 'Check MONGO_URI environment variable on Vercel dashboard',
        });
    }

    // 2. Get raw body buffer
    // Vercel may provide body as parsed JSON, string, or raw buffer
    let bodyBuffer;
    if (req.rawBody) {
        bodyBuffer = Buffer.isBuffer(req.rawBody)
            ? req.rawBody
            : Buffer.from(req.rawBody, 'utf8');
    } else if (typeof req.body === 'string') {
        bodyBuffer = Buffer.from(req.body, 'utf8');
    } else if (req.body && Buffer.isBuffer(req.body)) {
        bodyBuffer = req.body;
    } else if (req.body && typeof req.body === 'object') {
        // Already parsed by Vercel (e.g., JSON body) — re-stringify for our parser
        bodyBuffer = Buffer.from(JSON.stringify(req.body), 'utf8');
    } else {
        bodyBuffer = Buffer.alloc(0);
    }

    // 3. Create Node.js IncomingMessage-like object using EventEmitter
    const incomingMessage = new EventEmitter();
    incomingMessage.method = req.method;
    incomingMessage.headers = Object.assign({}, req.headers || {});
    // Ensure the full URL path is preserved
    incomingMessage.url = req.url;

    // Schedule body events after the handler attaches its listeners
    // This simulates the streaming behavior of a real IncomingMessage
    setImmediate(() => {
        if (bodyBuffer.length > 0) {
            incomingMessage.emit('data', bodyBuffer);
        }
        incomingMessage.emit('end');
    });

    // 4. Create Node.js ServerResponse-like object
    let responseStatusCode = 200;
    const responseHeaders = {};
    let responseHeadersSent = false;
    let responseEnded = false;
    const responseChunks = [];

    const serverResponse = {
        setHeader(key, value) {
            responseHeaders[String(key).toLowerCase()] = value;
        },
        getHeader(key) {
            return responseHeaders[String(key).toLowerCase()];
        },
        removeHeader(key) {
            delete responseHeaders[String(key).toLowerCase()];
        },
        writeHead(code, headers) {
            responseStatusCode = code;
            if (headers && typeof headers === 'object') {
                if (Array.isArray(headers)) {
                    // Handle array format: [['Content-Type', 'text/html'], ...]
                    for (const [k, v] of headers) {
                        responseHeaders[String(k).toLowerCase()] = v;
                    }
                } else {
                    Object.entries(headers).forEach(([k, v]) => {
                        responseHeaders[String(k).toLowerCase()] = v;
                    });
                }
            }
            responseHeadersSent = true;
            return this;
        },
        write(data) {
            if (responseEnded) return false;
            if (typeof data === 'string') {
                responseChunks.push(Buffer.from(data, 'utf8'));
            } else if (Buffer.isBuffer(data)) {
                responseChunks.push(data);
            }
            return true;
        },
        end(data) {
            if (responseEnded) return;
            responseEnded = true;
            if (data) {
                if (typeof data === 'string') {
                    responseChunks.push(Buffer.from(data, 'utf8'));
                } else if (Buffer.isBuffer(data)) {
                    responseChunks.push(data);
                }
            }
            // Flush to Vercel response
            Object.entries(responseHeaders).forEach(([k, v]) => {
                try { res.setHeader(k, v); } catch (e) { /* ignore */ }
            });
            const body = Buffer.concat(responseChunks);
            res.status(responseStatusCode).send(body);
        },
        get writableEnded() {
            return responseEnded;
        },
        get finished() {
            return responseEnded;
        },
    };

    // 5. Call the existing handler with timeout protection
    const handlerTimeout = setTimeout(() => {
        if (!responseEnded) {
            console.error('[vercel] Handler timeout after 25s');
            responseEnded = true;
            res.status(504).json({ error: 'Request timeout' });
        }
    }, 25_000);

    try {
        await handleRequest(incomingMessage, serverResponse);
    } catch (error) {
        console.error('[vercel] Handler error:', error.message);
        console.error('[vercel] Stack:', error.stack);
        if (!responseEnded) {
            res.status(500).json({ 
                error: 'Internal server error',
                detail: error.message,
            });
        }
    } finally {
        clearTimeout(handlerTimeout);
    }
};
