/**
 * ChitraVithika — Reactive State Store
 * localStorage-backed state with subscribe/notify pattern.
 * Slices: auth, collection, bids, cart, catalog (cache).
 */

const STORAGE_KEY = 'cv_state';
const listeners = new Map(); // key → Set<callback>

// ─── Default State ────────────────────────────────────────
const defaultState = {
    auth: {
        user: null,       // { id, email, name, role: 'buyer'|'photographer' }
        token: null,
        loggedIn: false,
    },
    collection: [],     // [{ itemId, title, artist, price, acquiredAt, license }]
    bids: {
        active: [],       // [{ itemId, amount, placedAt, type: 'open'|'silent' }]
        won: [],          // [{ itemId, title, artist, amount, wonAt }]
    },
    cart: null,         // { itemId, license, price } — single-item checkout
    catalog: [],        // cached catalog from API
};

// ─── State Initialization ────────────────────────────────
let _state;

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            // Merge with defaults to handle schema upgrades
            return { ...defaultState, ...parsed, auth: { ...defaultState.auth, ...parsed.auth }, bids: { ...defaultState.bids, ...parsed.bids } };
        }
    } catch (e) {
        console.warn('[state] Failed to load from localStorage:', e);
    }
    return { ...defaultState };
}

function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
    } catch (e) {
        console.warn('[state] Failed to save to localStorage:', e);
    }
}

_state = loadState();

function clearUserScopedState() {
    _state.collection = [];
    _state.bids = { ...defaultState.bids };
    _state.cart = null;
}

function replaceState(nextState, { persist = true } = {}) {
    _state = {
        ...defaultState,
        ...nextState,
        auth: { ...defaultState.auth, ...(nextState?.auth || {}) },
        bids: { ...defaultState.bids, ...(nextState?.bids || {}) },
    };
    if (persist) saveState();
}

// ─── Reactive API ─────────────────────────────────────────

/**
 * Get a state slice by key path, e.g. 'auth', 'auth.user', 'bids.active'
 */
export function getState(keyPath) {
    if (!keyPath) return _state;
    return keyPath.split('.').reduce((obj, key) => obj?.[key], _state);
}

/**
 * Set a state slice and notify subscribers.
 */
export function setState(keyPath, value) {
    const keys = keyPath.split('.');
    let target = _state;
    for (let i = 0; i < keys.length - 1; i++) {
        if (!target[keys[i]] || typeof target[keys[i]] !== 'object') {
            target[keys[i]] = {};
        }
        target = target[keys[i]];
    }
    target[keys[keys.length - 1]] = value;
    saveState();
    notify(keyPath);
}

/**
 * Subscribe to changes on a key path.
 * Returns an unsubscribe function.
 */
export function subscribe(keyPath, callback) {
    if (!listeners.has(keyPath)) listeners.set(keyPath, new Set());
    listeners.get(keyPath).add(callback);
    return () => listeners.get(keyPath)?.delete(callback);
}

function notify(keyPath) {
    // Notify exact match and parent paths
    listeners.forEach((cbs, key) => {
        if (keyPath.startsWith(key) || key.startsWith(keyPath)) {
            const val = getState(key);
            cbs.forEach(cb => {
                try { cb(val); } catch (e) { console.warn('[state] Subscriber error:', e); }
            });
        }
    });
}

window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY || event.newValue == null) return;
    try {
        replaceState(JSON.parse(event.newValue), { persist: false });
        ['auth', 'collection', 'bids', 'cart', 'catalog'].forEach((key) => notify(key));
    } catch (e) {
        console.warn('[state] Failed to sync from another tab:', e);
    }
});

// ─── Auth Actions ─────────────────────────────────────────

export async function login(email, password) {
    const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Login failed' }));
        throw new Error(err.error || 'Login failed');
    }

    const data = await res.json();
    setState('auth', {
        user: data.user,
        token: data.token,
        loggedIn: true,
    });

    // Claim any unclaimed photos for this user and refresh catalog
    try {
        await fetch('/api/claim-photos', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${data.token}` 
            },
            body: JSON.stringify({ userId: data.user.id, userName: data.user.name }),
        });
        await refreshCatalogFromApi();
        await syncBuyerDashboardFromApi();
    } catch (e) {
        console.warn('[login] Failed to claim photos:', e);
    }

    return data.user;
}

export async function register(userData) {
    const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Registration failed' }));
        throw new Error(err.error || 'Registration failed');
    }

    const data = await res.json();
    clearUserScopedState();
    setState('auth', {
        user: data.user,
        token: data.token,
        loggedIn: true,
    });
    try {
        await syncBuyerDashboardFromApi();
    } catch (e) {
        console.warn('[register] Failed to sync buyer state:', e);
    }
    return data.user;
}

export async function loginWithGoogle() {
    // Dynamically import Firebase module
    const { signInWithGoogle, signOut: firebaseSignOut } = await import('./firebase.js');
    
    try {
        const googleUser = await signInWithGoogle();
        
        // Send to our backend to create/link user
        const res = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                uid: googleUser.uid,
                email: googleUser.email,
                name: googleUser.name,
                photoURL: googleUser.photoURL,
            }),
        });

        if (!res.ok) {
            await firebaseSignOut();
            const err = await res.json().catch(() => ({ error: 'Google login failed' }));
            throw new Error(err.error || 'Google login failed');
        }

        const data = await res.json();
        clearUserScopedState();
        setState('auth', {
            user: data.user,
            token: data.token,
            loggedIn: true,
        });

        // Claim any unclaimed photos for this user and refresh catalog
        try {
            await fetch('/api/claim-photos', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${data.token}` 
                },
                body: JSON.stringify({ userId: data.user.id, userName: data.user.name }),
            });
            await refreshCatalogFromApi();
            await syncBuyerDashboardFromApi();
        } catch (e) {
            console.warn('[loginWithGoogle] Failed to claim photos:', e);
        }

        return data.user;
    } catch (error) {
        console.error('[state] Google login error:', error);
        throw error;
    }
}

export function logout() {
    // Also sign out from Firebase if applicable
    import('./firebase.js').then(({ signOut }) => signOut()).catch(() => {});
    clearUserScopedState();
    setState('auth', { user: null, token: null, loggedIn: false });
}

export async function deleteCurrentAccount() {
    const token = _state.auth.token;
    if (!token) throw new Error('You need to sign in again before deleting your account.');

    const res = await fetch('/api/auth/account', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unable to delete account' }));
        throw new Error(err.error || 'Unable to delete account');
    }

    logout();
    return true;
}

export async function updateCurrentProfile(profile) {
    const token = _state.auth.token;
    if (!token) throw new Error('Sign in again to update your profile.');

    const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profile),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unable to update profile' }));
        if (res.status === 401) {
            logout();
            throw new Error('Your session expired. Please sign in again.');
        }
        throw new Error(err.error || 'Unable to update profile');
    }

    const data = await res.json();
    setState('auth', {
        user: data.user,
        token,
        loggedIn: true,
    });
    return data.user;
}

export async function updateCurrentProfilePhoto(photoURL) {
    const token = _state.auth.token;
    if (!token) throw new Error('Sign in again to update your profile photo.');

    const res = await fetch('/api/auth/profile-photo', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ photoURL }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unable to update profile photo' }));
        if (res.status === 401) {
            logout();
            throw new Error('Your session expired. Please sign in again.');
        }
        throw new Error(err.error || 'Unable to update profile photo');
    }

    const data = await res.json();
    setState('auth', {
        user: data.user,
        token,
        loggedIn: true,
    });
    return data.user;
}

export async function syncCurrentUserFromApi() {
    const token = _state.auth.token;
    if (!token) return null;

    const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
        if (res.status === 401) {
            logout();
            return null;
        }
        throw new Error(`Auth sync failed: ${res.status}`);
    }

    const data = await res.json();
    setState('auth', {
        user: data.user,
        token,
        loggedIn: true,
    });
    return data.user;
}

export function isLoggedIn() {
    return _state.auth.loggedIn && _state.auth.user !== null;
}

export function currentUser() {
    return _state.auth.user;
}

export function needsProfileCompletion(user = _state.auth.user) {
    if (!user) return false;
    return user.authProvider === 'google' && !user.profileCompleted;
}

export function canAccessArtistTools(user = _state.auth.user) {
    if (!user || user.role !== 'photographer') return false;
    if (user.authProvider !== 'google') return true;
    return Boolean(user.artistProfileCompleted);
}

export function getDefaultRouteForUser(user = _state.auth.user) {
    if (!user) return '/';
    if (user.role === 'admin') return '/dashboard/admin';
    if (needsProfileCompletion(user)) return '/complete-profile';
    return canAccessArtistTools(user) ? '/dashboard/photographer' : '/dashboard/buyer';
}

export function getAuthToken() {
    return _state.auth.token;
}

export function requireAuth(role = null) {
    if (!isLoggedIn()) return false;
    if (role && _state.auth.user?.role !== role) return false;
    return true;
}

// ─── Collection Actions ──────────────────────────────────

export function addToCollection(item) {
    const existing = _state.collection.find(c => c.itemId === item.itemId);
    if (existing) return; // already in collection
    const entry = {
        itemId: item.itemId,
        title: item.title,
        artist: item.artist,
        price: item.price,
        license: item.license || 'personal',
        acquiredAt: Date.now(),
        color: item.color || '#888',
    };
    setState('collection', [..._state.collection, entry]);
}

export function removeFromCollection(itemId) {
    setState('collection', _state.collection.filter(c => c.itemId !== itemId));
}

export function getCollectionItem(itemId) {
    return _state.collection.find(c => c.itemId === Number(itemId)) || null;
}

export function hasCollectionItem(itemId) {
    return !!getCollectionItem(itemId);
}

// ─── Bid Actions ──────────────────────────────────────────

export function placeBid(itemId, amount, type = 'open') {
    const bid = { itemId, amount, placedAt: Date.now(), type };
    setState('bids.active', [..._state.bids.active, bid]);
    return bid;
}

export function winBid(itemId, title, artist, amount) {
    // Move from active to won
    setState('bids.active', _state.bids.active.filter(b => b.itemId !== itemId));
    setState('bids.won', [..._state.bids.won, { itemId, title, artist, amount, wonAt: Date.now() }]);
}

/** Merge server dashboard into local state (buyer). */
export function applyDashboardPayload(data) {
    if (!data) return;
    const collection = (data.collection || []).map((c) => ({
        itemId: c.itemId,
        title: c.title,
        artist: c.artist,
        price: c.price,
        license: c.license || 'commercial',
        acquiredAt: c.acquiredAt || Date.now(),
        color: c.color || '#888',
        removedByAdmin: Boolean(c.removedByAdmin),
        deletedAt: c.deletedAt || null,
    }));
    setState('collection', collection);

    const active = (data.activeBids || []).map((r) => ({
        bidId: r.id,
        itemId: r.itemId,
        amount: r.amount,
        type: r.type || 'open',
        placedAt: r.placed_at ? new Date(r.placed_at).getTime() : Date.now(),
        bid_status: r.bid_status,
        title: r.title,
    }));
    setState('bids.active', active);

    const won = (data.wonAuctions || []).map((r) => ({
        bidId: r.bidId || null,
        itemId: r.itemId,
        title: r.title,
        artist: r.artist,
        amount: r.amount,
        type: r.type || 'open',
        paymentPending: Boolean(r.paymentPending),
        removedByAdmin: Boolean(r.removedByAdmin),
        wonAt: r.wonAt ? new Date(r.wonAt).getTime() : Date.now(),
    }));
    setState('bids.won', won);
}

export async function syncBuyerDashboardFromApi() {
    const token = _state.auth.token;
    if (!token) return null;
    const res = await fetch('/api/me/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    applyDashboardPayload(data);
    return data;
}

// ─── Cart Actions ─────────────────────────────────────────

export function setCart(item) {
    setState('cart', item);
}

export function clearCart() {
    setState('cart', null);
}

// ─── Catalog Cache ────────────────────────────────────────

export function setCatalog(catalog) {
    setState('catalog', catalog);
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function refreshCatalogFromApi(options = {}) {
    const {
        expectedItemId = null,
        retries = 0,
        retryDelayMs = 250,
    } = options;

    let lastCatalog = [];
    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const catalogRes = await fetch('/api/catalog', { cache: 'no-store' });
            if (!catalogRes.ok) {
                throw new Error(`Catalog refresh failed: ${catalogRes.status}`);
            }

            const freshCatalog = await catalogRes.json();
            setCatalog(freshCatalog);
            lastCatalog = freshCatalog;

            if (expectedItemId == null || freshCatalog.some((item) => Number(item.id) === Number(expectedItemId))) {
                return freshCatalog;
            }
        } catch (error) {
            lastError = error;
        }

        if (attempt < retries) {
            await delay(retryDelayMs);
        }
    }

    if (lastCatalog.length > 0) {
        return lastCatalog;
    }

    if (lastError) throw lastError;
    return [];
}

export function getCatalog() {
    return _state.catalog || [];
}

export function getCatalogItem(id) {
    return (_state.catalog || []).find(item => item.id === parseInt(id, 10));
}

// ─── Artist Helpers ────────────────────────────────────────

export function getArtists() {
    const map = new Map();
    for (const item of (_state.catalog || [])) {
        if (!map.has(item.artist)) {
            map.set(item.artist, {
                name: item.artist,
                works: [],
                color: item.color,
                id: slugify(item.artist),
                userId: item.artistId || null,
            });
        }
        const artist = map.get(item.artist);
        if (!artist.userId && item.artistId) artist.userId = item.artistId;
        artist.works.push(item);
    }
    return [...map.values()];
}

export function getArtistById(slug) {
    return getArtists().find(a => a.id === slug);
}

function slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
