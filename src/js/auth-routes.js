/**
 * Auth-gated routes: gallery (browse), auctions, artists, search, and browse CTA
 * require a signed-in user. Others redirect to /login?next=...
 */

export function requiresAuth(pathname) {
    if (pathname === '/gallery' || pathname.startsWith('/gallery/')) return true;
    if (pathname === '/auctions' || pathname.startsWith('/auctions/')) return true;
    if (pathname === '/artists' || pathname.startsWith('/artists/')) return true;
    return false;
}

/** Safe redirect target after login/register (same-origin path only). */
export function loginUrlFor(nextPath) {
    const next = nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')
        ? nextPath
        : '/';
    return `/login?next=${encodeURIComponent(next)}`;
}

export function registerUrlFor(nextPath) {
    const next = nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')
        ? nextPath
        : '/';
    return `/register?next=${encodeURIComponent(next)}`;
}

export function getNextPathAfterAuth() {
    const p = new URLSearchParams(window.location.search);
    const n = p.get('next');
    if (n && n.startsWith('/') && !n.startsWith('//')) return n;
    return null;
}
