/**
 * ChitraVithika — Client-Side Crypto Module
 *
 * Uses the native Web Crypto API (crypto.subtle) to decrypt
 * AES-256-GCM encrypted image streams served by the Node.js backend.
 *
 * The server sends:
 *   - Response body:   raw AES-GCM ciphertext (binary)
 *   - X-IV header:     12-byte IV as hex string
 *   - X-Auth-Tag:      16-byte auth tag as hex string (appended to ciphertext on server, so we strip it)
 *
 * Usage:
 *   import { fetchDecryptedBlob } from './crypto.js';
 *   const blob = await fetchDecryptedBlob('/api/image/1');
 *   const url  = URL.createObjectURL(blob);
 */

'use strict';

// ─────────────────────────────────────────────────────────────
// MASTER KEY (must match server.js MASTER_KEY derivation)
// In a real app, this would come from a session token / auth flow.
// ─────────────────────────────────────────────────────────────
let _cryptoKey = null;

/**
 * Derives and caches the AES-GCM CryptoKey from the shared secret.
 * Uses PBKDF2 (the Web Crypto equivalent of scrypt, available natively).
 *
 * NOTE: We use the same parameters as Node's `crypto.scryptSync` equivalent:
 *   - password: 'chitraVithika-secret-2026'
 *   - salt: 'cv-salt'
 * but PBKDF2 (not scrypt) since Web Crypto doesn't expose scrypt.
 * The server also exports a PBKDF2-derived key endpoint for production alignment;
 * for this demo the key is hardcoded client-side to match the server.
 */
async function getKey() {
    if (_cryptoKey) return _cryptoKey;

    const enc = new TextEncoder();

    // Import raw password material
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode('chitraVithika-secret-2026'),
        { name: 'PBKDF2' },
        false,
        ['deriveKey'],
    );

    // Derive the AES-GCM key (256-bit)
    _cryptoKey = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: enc.encode('cv-salt'),
            iterations: 100_000,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,    // not extractable
        ['decrypt'],
    );

    return _cryptoKey;
}

// ─────────────────────────────────────────────────────────────
// HEX UTILITIES
// ─────────────────────────────────────────────────────────────

/**
 * Converts a hex string to a Uint8Array.
 * @param {string} hex
 * @returns {Uint8Array}
 */
function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return bytes;
}

// ─────────────────────────────────────────────────────────────
// DECRYPTION
// ─────────────────────────────────────────────────────────────

/**
 * Decrypts an AES-256-GCM encrypted ArrayBuffer.
 *
 * @param {ArrayBuffer} ciphertext - The encrypted bytes from server
 * @param {Uint8Array}  iv         - 12-byte initialization vector
 * @param {Uint8Array}  authTag    - 16-byte GCM authentication tag
 * @returns {Promise<ArrayBuffer>} decrypted plaintext
 */
async function decryptBuffer(ciphertext, iv, authTag) {
    const key = await getKey();

    // Web Crypto expects the auth tag appended to the ciphertext
    // (unlike Node's separated approach). Concatenate them.
    const combined = new Uint8Array(ciphertext.byteLength + authTag.byteLength);
    combined.set(new Uint8Array(ciphertext), 0);
    combined.set(authTag, ciphertext.byteLength);

    const plaintext = await crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv: iv,
            tagLength: 128, // 16 bytes = 128 bits
        },
        key,
        combined.buffer,
    );

    return plaintext;
}

// ─────────────────────────────────────────────────────────────
// FETCH + DECRYPT PIPELINE
// ─────────────────────────────────────────────────────────────

/**
 * Fetches an encrypted image from the given URL, decrypts it client-side,
 * and returns a Blob suitable for use as an object URL.
 *
 * @param {string}  url  - e.g. '/api/image/1'
 * @param {string} [mimeType='image/bmp'] - expected image MIME type
 * @returns {Promise<Blob>}
 */
export async function fetchDecryptedBlob(url, mimeType = 'image/bmp') {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
    }

    // Extract IV and Auth Tag from response headers
    const ivHex = response.headers.get('X-IV');
    const authTagHex = response.headers.get('X-Auth-Tag');

    if (!ivHex || !authTagHex) {
        throw new Error('Missing encryption headers: X-IV or X-Auth-Tag');
    }

    const iv = hexToBytes(ivHex);
    const authTag = hexToBytes(authTagHex);

    // Read encrypted body as ArrayBuffer
    const ciphertext = await response.arrayBuffer();

    // Decrypt
    const plaintext = await decryptBuffer(ciphertext, iv, authTag);

    // Wrap in a Blob — never touch DOM src directly
    return new Blob([plaintext], { type: mimeType });
}

/**
 * Creates a temporary object URL from a decrypted image fetch.
 * Caller is responsible for calling URL.revokeObjectURL() when done.
 *
 * @param {string} url    - encrypted image endpoint
 * @param {string} [mime] - image MIME type
 * @returns {Promise<string>} object URL
 */
export async function fetchDecryptedObjectURL(url, mime = 'image/bmp') {
    const blob = await fetchDecryptedBlob(url, mime);
    return URL.createObjectURL(blob);
}

/**
 * Pre-warms the crypto key derivation so the first image load isn't slow.
 * Call this on app startup.
 */
export async function warmupCrypto() {
    try {
        await getKey();
        console.log('[crypto] AES-GCM key derived and cached');
    } catch (err) {
        console.error('[crypto] Key derivation failed:', err);
    }
}
