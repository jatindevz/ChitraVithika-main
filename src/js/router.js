/**
 * ChitraVithika — SPA Router
 * History API based client-side router. Zero dependencies.
 *
 * Route table maps URL patterns (with :param segments) to page modules.
 * Each page module exports: render(params) → HTMLString, and mount(params) for event wiring.
 */

const routes = [];
let currentCleanup = null;
let outlet = null;

/** @type {null | ((pathname: string) => string | null)} */
let routeGuard = null;

/**
 * Set a function that returns a redirect URL (e.g. /login?next=...) or null to allow the route.
 */
export function setRouteGuard(fn) {
    routeGuard = fn;
}

/**
 * Register a route pattern → page module path mapping.
 * Pattern supports :param segments, e.g. '/gallery/:id'
 */
export function addRoute(pattern, loader) {
    const keys = [];
    const regexStr = pattern.replace(/:([^/]+)/g, (_m, key) => {
        keys.push(key);
        return '([^/]+)';
    });
    routes.push({
        pattern,
        regex: new RegExp(`^${regexStr}$`),
        keys,
        loader,
    });
}

/**
 * Match a pathname against registered routes.
 * Returns { loader, params } or null.
 */
function matchRoute(pathname) {
    for (const route of routes) {
        const match = pathname.match(route.regex);
        if (match) {
            const params = {};
            route.keys.forEach((key, i) => {
                params[key] = decodeURIComponent(match[i + 1]);
            });
            return { loader: route.loader, params };
        }
    }
    return null;
}

/**
 * Navigate to a new path. Pushes to history and renders.
 */
export async function navigate(path, { replace = false, skipScroll = false } = {}) {
    if (replace) {
        history.replaceState(null, '', path);
    } else {
        history.pushState(null, '', path);
    }
    await render(path);
    if (!skipScroll) window.scrollTo({ top: 0, behavior: 'instant' });
}

/**
 * Render the page for a given pathname.
 */
async function render(pathname) {
    if (!outlet) outlet = document.getElementById('cv-page');
    if (!outlet) return;

    let pathOnly = pathname.split('?')[0];

    if (routeGuard) {
        const redirect = routeGuard(pathOnly);
        if (redirect) {
            history.replaceState(null, '', redirect);
            pathOnly = '/login';
        }
    }

    const matched = matchRoute(pathOnly);

    if (!matched) {
        try {
            const notFound = await import('/src/pages/not-found.js');
            outlet.innerHTML = notFound.render();
            if (notFound.mount) notFound.mount();
        } catch {
            outlet.innerHTML = notFoundPage(pathname);
        }
        return;
    }

    // Cleanup previous page
    if (currentCleanup && typeof currentCleanup === 'function') {
        try { currentCleanup(); } catch (e) { console.warn('[router] cleanup error:', e); }
        currentCleanup = null;
    }

    // Page transition: fade out
    outlet.classList.add('cv-page-exit');

    await new Promise(r => setTimeout(r, 150));

    try {
        const mod = await matched.loader();
        outlet.innerHTML = mod.render(matched.params);
        outlet.classList.remove('cv-page-exit');
        outlet.classList.add('cv-page-enter');

        // Wire interactivity
        if (mod.mount) {
            const cleanup = mod.mount(matched.params);
            if (cleanup) currentCleanup = cleanup;
        }

        // Remove enter class after animation
        setTimeout(() => outlet.classList.remove('cv-page-enter'), 400);

    } catch (err) {
        console.error('[router] Page load error:', err);
        outlet.innerHTML = errorPage(err);
        outlet.classList.remove('cv-page-exit');
    }

    // Update active nav links
    updateNavActive(pathOnly);

    // Notify the rest of the app that the route changed
    document.dispatchEvent(new CustomEvent('cv:route-change', { detail: { pathname: pathOnly } }));
}

function notFoundPage(path) {
    return `
    <div class="cv-page-message">
      <h1 class="cv-page-message__title">404</h1>
      <p class="cv-page-message__text">The path <code>${escapeHtml(path)}</code> doesn't exist.</p>
      <a href="/" class="cv-page-message__link" data-link>Return Home</a>
    </div>
  `;
}

function errorPage(err) {
    return `
    <div class="cv-page-message">
      <h1 class="cv-page-message__title">Error</h1>
      <p class="cv-page-message__text">${escapeHtml(err.message)}</p>
      <a href="/" class="cv-page-message__link" data-link>Return Home</a>
    </div>
  `;
}

function updateNavActive(pathname) {
    document.querySelectorAll('.cv-nav__link').forEach(link => {
        const href = link.getAttribute('href');
        const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
        link.classList.toggle('active', isActive);
    });
}

function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Initialize the router. Call once on app boot.
 */
export function initRouter() {
    outlet = document.getElementById('cv-page');

    // Intercept all <a data-link> clicks and regular internal links
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href]');
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href) return;

        // Skip external links, hash links, and links with explicit targets
        if (href.startsWith('http') || href.startsWith('mailto:') || link.target === '_blank') return;
        if (href.startsWith('#')) return;

        e.preventDefault();
        navigate(href);
    });

    // Handle browser back/forward (preserve ?next= and other query params)
    window.addEventListener('popstate', () => {
        render(window.location.pathname + window.location.search);
    });

    // Initial render
    render(window.location.pathname + window.location.search);
}
