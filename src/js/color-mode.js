/**
 * Light / dark appearance (html[data-theme="light|dark"]).
 * Preference: localStorage key cv-theme
 */

import { resetTheme } from './themes.js';

const STORAGE_KEY = 'cv-theme';

export function getTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

export function setTheme(mode) {
    const m = mode === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', m);
    try {
        localStorage.setItem(STORAGE_KEY, m);
    } catch (_) { /* private mode */ }

    const meta = document.getElementById('meta-theme-color');
    if (meta) {
        meta.setAttribute('content', m === 'light' ? '#f8f9fa' : '#080808');
    }

    const btn = document.getElementById('btn-theme-toggle');
    if (btn) {
        btn.setAttribute('aria-label', m === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
        btn.setAttribute('title', m === 'dark' ? 'Light mode' : 'Dark mode');
    }

    /* Clear inline accent/ambient overrides so light palette reads correctly; pages re-sync on cv-theme-change */
    if (m === 'light') {
        resetTheme();
    }

    document.dispatchEvent(new CustomEvent('cv-theme-change', { detail: { theme: m } }));
}

export function toggleTheme() {
    setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

export function wireThemeToggle() {
    const btn = document.getElementById('btn-theme-toggle');
    if (!btn) return;
    setTheme(getTheme());
    btn.addEventListener('click', () => toggleTheme());
}
