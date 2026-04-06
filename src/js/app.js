/**
 * ChitraVithika — Main Application Orchestrator (SPA Mode)
 *
 * Responsibilities:
 * 1. Boot: fetch catalog → state store
 * 2. Register all page routes with the SPA router
 * 3. Initialize the router (intercept clicks, handle popstate)
 * 4. Wire persistent header interactions (search, auth button, browse)
 * 5. Toast notifications for global events
 */

import { setCatalog, isLoggedIn, currentUser, subscribe, logout, deleteCurrentAccount, getDefaultRouteForUser, syncCurrentUserFromApi } from '/src/js/state.js';
import { addRoute, initRouter, navigate, setRouteGuard } from '/src/js/router.js';
import { requiresAuth, loginUrlFor } from '/src/js/auth-routes.js';

// ─── Route Registration ──────────────────────────────────────
addRoute('/', () => import('/src/pages/home.js'));
addRoute('/gallery', () => import('/src/pages/gallery.js'));
addRoute('/gallery/:id', () => import('/src/pages/gallery-detail.js'));
addRoute('/auctions', () => import('/src/pages/auctions.js'));
addRoute('/auctions/open/:id', () => import('/src/pages/auction-open.js'));
addRoute('/auctions/silent/:id', () => import('/src/pages/auction-silent.js'));
addRoute('/artists', () => import('/src/pages/artists.js'));
addRoute('/artists/:id', () => import('/src/pages/artist-detail.js'));
addRoute('/login', () => import('/src/pages/login.js'));
addRoute('/register', () => import('/src/pages/register.js'));
addRoute('/complete-profile', () => import('/src/pages/complete-profile.js'));
addRoute('/dashboard/buyer', () => import('/src/pages/dashboard-buyer.js'));
addRoute('/dashboard/photographer', () => import('/src/pages/dashboard-photographer.js'));
addRoute('/dashboard/admin', () => import('/src/pages/dashboard-admin.js'));
addRoute('/submit', () => import('/src/pages/submit.js'));
addRoute('/my-work', () => import('/src/pages/my-work.js'));
addRoute('/checkout/:id', () => import('/src/pages/checkout.js'));
addRoute('/about', () => import('/src/pages/about.js'));
addRoute('/legal/licensing', () => import('/src/pages/licensing.js'));

// ─── Main Boot ────────────────────────────────────────────────
(async function bootstrap() {

    // 1. Optional crypto warmup — not required for core functionality
    try {
        const { warmupCrypto } = await import('/src/js/crypto.js');
        warmupCrypto().catch(() => { });
    } catch { /* crypto module not available — that's fine */ }

    // 2. Optional IndexedDB
    try {
        const { db } = await import('/src/js/db.js');
        await db.open();
    } catch { /* IDB unavailable — that's fine */ }

    // 3. Fetch catalog before first route
    try {
        const catRes = await fetch('/api/catalog');
        if (catRes.ok) {
            const catalog = await catRes.json();
            setCatalog(catalog);
            seedNLPWorker(catalog);
        } else {
            console.error('[app] Catalog request failed:', catRes.status);
        }
    } catch (err) {
        console.error('[app] Failed to load catalog:', err);
    }

    if (isLoggedIn()) {
        try {
            await syncCurrentUserFromApi();
        } catch (err) {
            console.warn('[app] Auth sync failed:', err);
        }
    }

    // 4. Wire persistent header interactions
    syncAuthNavClass();
    wireSearchPanel();
    wireHeaderAuth();
    wireBrowseButton();
    try {
        const { wireThemeToggle } = await import('/src/js/color-mode.js');
        wireThemeToggle();
    } catch (e) {
        console.warn('[app] Theme toggle:', e);
    }
    wireGlobalEvents();

    // 5. Route guard: guests cannot open gallery, auctions, artists (redirect to login)
    setRouteGuard((pathname) => {
        if (isLoggedIn()) return null;
        if (pathname === '/login' || pathname === '/register') return null;
        if (!requiresAuth(pathname)) return null;
        return loginUrlFor(pathname);
    });

    let _wasLogged = isLoggedIn();
    subscribe('auth', () => {
        const now = isLoggedIn();
        if (_wasLogged && !now && requiresAuth(window.location.pathname)) {
            navigate('/', { replace: true });
        }
        _wasLogged = now;
    });

    subscribe('catalog', (catalog) => {
        syncNLPWorker(catalog || []);
        if (shouldRefreshCurrentRoute(window.location.pathname)) {
            navigate(window.location.pathname + window.location.search, { replace: true, skipScroll: true });
        }
    });

    // 6. Mark app as loaded, then initialize router
    const root = document.getElementById('cv-app-root');
    if (root) root.classList.remove('loading');

    initRouter();

    console.log('[app] ChitraVithika SPA ready 🌐');
})();

// ─────────────────────────────────────────────────────────────
// NAV VISIBILITY (guest vs member)
// ─────────────────────────────────────────────────────────────

function syncAuthNavClass() {
    if (isLoggedIn()) document.documentElement.classList.add('cv-logged-in');
    else document.documentElement.classList.remove('cv-logged-in');
}

// ─────────────────────────────────────────────────────────────
// PERSISTENT HEADER: AUTH BUTTON
// ─────────────────────────────────────────────────────────────

function wireHeaderAuth() {
    const authBtn = document.getElementById('btn-auth');
    const userMenu = document.getElementById('cv-user-menu');
    const menuTrigger = document.getElementById('cv-user-menu-trigger');
    const menuDropdown = document.getElementById('cv-user-menu-dropdown');
    const menuName = document.getElementById('cv-user-menu-name');
    const dashboardItem = document.getElementById('cv-user-menu-dashboard');
    const deleteAccountBtn = document.getElementById('btn-header-delete-account');
    const logoutBtn = document.getElementById('btn-header-logout');
    if (!authBtn) return;

    function closeUserMenu() {
        if (!menuDropdown || !menuTrigger) return;
        menuDropdown.hidden = true;
        menuTrigger.setAttribute('aria-expanded', 'false');
        userMenu?.classList.remove('cv-user-menu--open');
    }

    function openUserMenu() {
        if (!menuDropdown || !menuTrigger) return;
        menuDropdown.hidden = false;
        menuTrigger.setAttribute('aria-expanded', 'true');
        userMenu?.classList.add('cv-user-menu--open');
    }

    function toggleUserMenu() {
        const open = menuTrigger?.getAttribute('aria-expanded') === 'true';
        if (open) closeUserMenu();
        else openUserMenu();
    }

    updateAuthButton(authBtn, userMenu, menuName, deleteAccountBtn);
    subscribe('auth', () => {
        updateAuthButton(authBtn, userMenu, menuName, deleteAccountBtn);
        closeUserMenu();
        syncAuthNavClass();
    });

    authBtn.addEventListener('click', () => {
        navigate('/login');
    });

    menuTrigger?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleUserMenu();
    });

    document.addEventListener('click', (e) => {
        if (userMenu && !userMenu.contains(e.target)) closeUserMenu();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeUserMenu();
    });

    document.addEventListener('cv:route-change', () => closeUserMenu());

    dashboardItem?.addEventListener('click', () => {
        closeUserMenu();
        const user = currentUser();
        if (!user) return;
        navigate(getDefaultRouteForUser(user));
    });

    deleteAccountBtn?.addEventListener('click', async () => {
        closeUserMenu();
        const user = currentUser();
        if (!user || user.role === 'admin') return;
        const confirmed = confirm('Delete your account permanently? Your listings, bids, likes, and comments will be removed.');
        if (!confirmed) return;
        try {
            await deleteCurrentAccount();
            showToast('Your account has been deleted.');
            navigate('/', { replace: true });
        } catch (err) {
            alert(err.message || 'Unable to delete account');
        }
    });

    logoutBtn?.addEventListener('click', () => {
        closeUserMenu();
        logout();
        updateAuthButton(authBtn, userMenu, menuName);
        navigate('/');
    });
}

function updateAuthButton(btn, userMenu, menuName, deleteAccountBtn) {
    if (isLoggedIn()) {
        const user = currentUser();
        btn.hidden = true;
        btn.setAttribute('aria-hidden', 'true');
        if (userMenu) {
            userMenu.hidden = false;
            userMenu.removeAttribute('aria-hidden');
        }
        if (menuName) menuName.textContent = user.name;
        if (deleteAccountBtn) deleteAccountBtn.hidden = user.role === 'admin';
    } else {
        btn.hidden = false;
        btn.removeAttribute('aria-hidden');
        if (userMenu) {
            userMenu.hidden = true;
            userMenu.setAttribute('aria-hidden', 'true');
        }
        if (deleteAccountBtn) deleteAccountBtn.hidden = true;
        btn.textContent = 'Sign in';
    }
}

// ─────────────────────────────────────────────────────────────
// PERSISTENT HEADER: BROWSE BUTTON
// ─────────────────────────────────────────────────────────────

function wireBrowseButton() {
    const btn = document.getElementById('btn-collect');
    if (!btn) return;
    btn.addEventListener('click', () => {
        if (!isLoggedIn()) {
            navigate(loginUrlFor('/gallery'));
            return;
        }
        navigate('/gallery');
    });
}

// ─────────────────────────────────────────────────────────────
// PERSISTENT HEADER: SEARCH PANEL
// ─────────────────────────────────────────────────────────────

let _nlpWorker = null;
let _nlpReady = false;
let _pendingQuery = null;
const _queryCallbacks = new Map();

function seedNLPWorker(catalog) {
    try {
        _nlpWorker = new Worker('/src/workers/nlp-search.worker.js');

        _nlpWorker.addEventListener('message', (e) => {
            const { type } = e.data;
            if (type === 'READY') {
                _nlpWorker.postMessage({ type: 'INDEX', catalog });
            } else if (type === 'INDEXED') {
                _nlpReady = true;
                console.log(`[app] NLP index: ${e.data.docCount} docs, ${e.data.termCount} terms`);
                if (_pendingQuery) {
                    const { query, queryId } = _pendingQuery;
                    _pendingQuery = null;
                    _nlpWorker.postMessage({ type: 'QUERY', query, queryId });
                }
            } else if (type === 'RESULTS') {
                const { queryId, results } = e.data;
                const cb = _queryCallbacks.get(queryId);
                if (cb) { cb(results); _queryCallbacks.delete(queryId); }
            }
        });

        _nlpWorker.addEventListener('error', (err) => {
            console.warn('[nlp] Worker error:', err);
            _nlpReady = false;
        });
    } catch (e) {
        console.warn('[nlp] Worker unavailable:', e);
    }
}

function syncNLPWorker(catalog) {
    if (!_nlpWorker) {
        seedNLPWorker(catalog);
        return;
    }
    _nlpReady = false;
    _pendingQuery = null;
    _nlpWorker.postMessage({ type: 'INDEX', catalog });
}

function shouldRefreshCurrentRoute(pathname) {
    return pathname === '/' ||
        pathname === '/gallery' ||
        pathname.startsWith('/gallery/') ||
        pathname === '/auctions' ||
        pathname.startsWith('/auctions/open/') ||
        pathname === '/artists' ||
        pathname === '/my-work' ||
        pathname.startsWith('/checkout/') ||
        pathname === '/dashboard/photographer';
}

function nlpSearch(query) {
    return new Promise((resolve) => {
        if (!_nlpWorker) { resolve([]); return; }
        const queryId = crypto.randomUUID();
        _queryCallbacks.set(queryId, resolve);
        if (_nlpReady) {
            _nlpWorker.postMessage({ type: 'QUERY', query, queryId });
        } else {
            _pendingQuery = { query, queryId };
        }
    });
}

function wireSearchPanel() {
    const toggleBtn = document.getElementById('btn-search-toggle');
    const panel = document.getElementById('cv-search-panel');
    const form = document.getElementById('cv-search-form');
    const input = document.getElementById('cv-search-input');
    const status = document.getElementById('cv-search-status');

    if (!toggleBtn || !panel) {
        console.warn('[app] Search panel elements not found');
        return;
    }

    // Create results container if not present
    let resultsContainer = document.getElementById('cv-search-results');
    if (!resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.id = 'cv-search-results';
        resultsContainer.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;margin-top:24px;max-height:60vh;overflow-y:auto;padding-right:8px;';
        const inner = panel.querySelector('.cv-search-panel__inner');
        if (inner) inner.appendChild(resultsContainer);
    }

    function closePanel() {
        panel.setAttribute('aria-hidden', 'true');
        toggleBtn.setAttribute('aria-expanded', 'false');
    }

    function openPanel() {
        panel.setAttribute('aria-hidden', 'false');
        toggleBtn.setAttribute('aria-expanded', 'true');
        setTimeout(() => input?.focus(), 100);
    }

    toggleBtn.addEventListener('click', () => {
        if (!isLoggedIn()) {
            navigate(loginUrlFor('/'));
            return;
        }
        const isHidden = panel.getAttribute('aria-hidden') !== 'false';
        if (isHidden) openPanel(); else closePanel();
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && panel.getAttribute('aria-hidden') === 'false') {
            closePanel();
        }
    });

    // Close on ANY route change
    document.addEventListener('cv:route-change', () => {
        closePanel();
    });

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!isLoggedIn()) {
            navigate(loginUrlFor('/'));
            return;
        }
        const query = input?.value.trim();
        if (!query) return;

        if (status) status.textContent = 'Searching…';
        resultsContainer.innerHTML = '';
        const results = await nlpSearch(query);

        if (results.length === 0) {
            if (status) status.textContent = `No results for "${query}". Try different terms.`;
            return;
        }

        if (status) status.textContent = `${results.length} result${results.length > 1 ? 's' : ''} for "${query}"`;

        // Render inline result cards with real thumbnails
        const { getCatalog } = await import('/src/js/state.js');
        const catalog = getCatalog();
        resultsContainer.innerHTML = results.map(r => {
            const item = catalog.find(c => c.id === r.id) || r;
            return `
              <a href="/gallery/${item.id}" style="text-decoration:none;color:inherit;display:block;border-radius:12px;overflow:hidden;background:var(--color-surface);border:1px solid var(--color-border);transition:transform 0.2s,border-color 0.2s;">
                <div style="aspect-ratio:4/3;position:relative;overflow:hidden;background:linear-gradient(135deg,${item.color || '#333'}44,var(--color-gradient-end));">
                  <img src="/api/image-preview/${item.id}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block;" onerror="this.style.display='none'" />
                </div>
                <div style="padding:12px;">
                  <div style="font-family:'Playfair Display',Georgia,serif;font-size:0.9rem;font-weight:600;color:#f0ede8;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.title}</div>
                  <div style="font-size:0.75rem;color:#6a6560;">${item.artist}</div>
                  <div style="font-family:'JetBrains Mono',monospace;font-size:0.85rem;color:#c8a96e;margin-top:6px;">$${(item.price || 0).toLocaleString()}</div>
                </div>
              </a>`;
        }).join('');
    });
}

// ─────────────────────────────────────────────────────────────
// GLOBAL EVENTS
// ─────────────────────────────────────────────────────────────

function wireGlobalEvents() {
    document.addEventListener('photo-card:acquire', (e) => {
        const { title, artist, price } = e.detail;
        showToast(`Added to collection: "${title}" by ${artist} — $${price.toLocaleString()}`);
    });

    document.addEventListener('auction-timer:buy', (e) => {
        const { price } = e.detail;
        showToast(`Purchase locked at $${price.toLocaleString()} ✓`);
    });

    document.addEventListener('upload-zone:file-selected', (e) => {
        showToast(`File staged for listing: ${e.detail.file.name}`);
    });
}

// ─────────────────────────────────────────────────────────────
// TOAST NOTIFICATION
// ─────────────────────────────────────────────────────────────

function showToast(message, duration = 4000) {
    let container = document.getElementById('cv-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'cv-toast-container';
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('aria-atomic', 'true');
        container.style.cssText = `
            position:fixed;bottom:32px;left:50%;transform:translateX(-50%);
            z-index:9999;display:flex;flex-direction:column;align-items:center;
            gap:10px;pointer-events:none;
        `;
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    toast.style.cssText = `
        background:#1a1a1a;border:1px solid rgba(200,169,110,0.3);border-radius:10px;
        padding:12px 22px;font-family:'Inter',system-ui,sans-serif;font-size:0.82rem;
        color:#f0ede8;box-shadow:0 8px 32px rgba(0,0,0,0.7);opacity:0;
        transform:translateY(12px);pointer-events:none;
        transition:opacity 0.35s ease,transform 0.35s cubic-bezier(0.34,1.56,0.64,1);
        max-width:380px;text-align:center;
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(8px)';
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, duration);
}
