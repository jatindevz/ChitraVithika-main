/**
 * ChitraVithika — Artists Directory Page
 * Route: /artists
 */
import { currentUser, getCatalog } from '../js/state.js';

let allArtists = [];

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function render() {
    return `
    <div class="cv-page-container cv-page-container--wide">
      <div class="cv-page-header">
        <p class="cv-page-header__eyebrow">Creative Ecosystem</p>
        <h1 class="cv-page-header__title">Our Artists</h1>
        <p class="cv-page-header__subtitle">
          The voices behind the light. Every photographer on ChitraVithika has been selected for 
          their singular vision and commitment to the art of image-making.
        </p>
      </div>

      <div id="artists-grid" class="cv-cards-grid cv-cards-grid--3">
        <p style="color:var(--color-text-tertiary);font-size:var(--text-sm);">Loading artists...</p>
      </div>
    </div>
  `;
}

function renderArtistsGrid(artists) {
    const user = currentUser();
    const catalog = getCatalog();
    
    const filtered = artists.filter(a => {
        if (user && a.id === user.id) return false;
        if (a.role === 'admin') return false;
        return true;
    });

    if (filtered.length === 0) {
        return `
          <div class="cv-empty-state" style="grid-column:1/-1;">
            <div class="cv-empty-state__icon">📷</div>
            <h3 class="cv-empty-state__title">No artists yet</h3>
            <p class="cv-empty-state__text">Be the first to join our creative ecosystem.</p>
            <a href="/register" class="cv-btn cv-btn--primary">Become an Artist</a>
          </div>
        `;
    }

    return filtered.map(artist => {
        const works = catalog.filter(item => item.artistId === artist.id || item.artist === artist.name);
        const categories = [...new Set(works.map(w => w.category))].filter(Boolean);
        const color = works[0]?.color || '#8c7248';
        const slug = slugify(artist.name);

        return `
          <a href="/artists/${slug}" class="cv-artist-card" style="text-decoration:none;color:inherit;">
            <div class="cv-artist-card__avatar" style="background:linear-gradient(135deg, ${color}, var(--color-avatar-gradient-end))">
              ${escapeHtml(artist.name.charAt(0).toUpperCase())}
            </div>
            <h3 class="cv-artist-card__name">${escapeHtml(artist.name)}</h3>
            <p class="cv-artist-card__works">${works.length} work${works.length !== 1 ? 's' : ''} listed</p>
            <p style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-top:var(--space-2);line-height:1.6;">
              ${categories.join(' · ') || 'No works yet'}
            </p>
          </a>
        `;
    }).join('');
}

export async function mount() {
    const grid = document.getElementById('artists-grid');
    if (!grid) return;

    try {
        const res = await fetch('/api/users');
        if (res.ok) {
            const users = await res.json();
            allArtists = users.filter(u => u.role === 'photographer');
            grid.innerHTML = renderArtistsGrid(allArtists);
        } else {
            grid.innerHTML = '<p style="color:var(--color-text-tertiary);">Failed to load artists.</p>';
        }
    } catch (err) {
        console.error('[artists] Failed to fetch users:', err);
        grid.innerHTML = '<p style="color:var(--color-text-tertiary);">Failed to load artists.</p>';
    }
}
