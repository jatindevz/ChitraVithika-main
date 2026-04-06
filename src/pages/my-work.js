/**
 * ChitraVithika — My Work (Portfolio) Page
 * Route: /my-work
 *
 * Shows the logged-in photographer's uploaded listings with
 * statistics (views, favorites, sales, revenue).
 */
import { isLoggedIn, currentUser, getCatalog } from '../js/state.js';
import { navigate } from '../js/router.js';

export function render() {
    if (!isLoggedIn()) {
        return `<div class="cv-page-message"><p class="cv-page-message__text">Redirecting…</p></div>`;
    }

    const user = currentUser();
    const catalog = getCatalog();
    const portfolio = catalog.filter(w => w.artistId === user.id);

    const totalRevenue = portfolio.reduce((s, w) => s + (w.revenue || 0), 0);
    const totalSales = portfolio.reduce((s, w) => s + (w.sales || 0), 0);
    const totalViews = portfolio.reduce((s, w) => s + (w.views || 0), 0);

    return `
    <div class="cv-mywork-page">
      <div class="cv-mywork-header">
        <div class="cv-mywork-header__top">
          <div>
            <p class="cv-page-header__eyebrow">Portfolio</p>
            <h1 class="cv-mywork-header__title">My Work</h1>
            <p class="cv-mywork-header__sub">Manage your listed photographs and track their performance.</p>
          </div>
          <a href="/submit" class="cv-btn cv-btn--primary">
            <span class="cv-btn__icon">+</span> New Listing
          </a>
        </div>

        <div class="cv-mywork-stats">
          <div class="cv-mywork-stat">
            <span class="cv-mywork-stat__value">${portfolio.length}</span>
            <span class="cv-mywork-stat__label">Listings</span>
          </div>
          <div class="cv-mywork-stat">
            <span class="cv-mywork-stat__value">${totalViews.toLocaleString()}</span>
            <span class="cv-mywork-stat__label">Views</span>
          </div>
          <div class="cv-mywork-stat">
            <span class="cv-mywork-stat__value">${totalSales}</span>
            <span class="cv-mywork-stat__label">Sales</span>
          </div>
          <div class="cv-mywork-stat">
            <span class="cv-mywork-stat__value">$${totalRevenue.toLocaleString()}</span>
            <span class="cv-mywork-stat__label">Revenue</span>
          </div>
        </div>
      </div>

      ${portfolio.length === 0 ? `
        <div class="cv-mywork-empty">
          <div class="cv-mywork-empty__icon">📷</div>
          <h2 class="cv-mywork-empty__title">No Listings Yet</h2>
          <p class="cv-mywork-empty__text">Start your journey — list your first photograph and reach collectors worldwide.</p>
          <a href="/submit" class="cv-btn cv-btn--primary cv-btn--large">Create Your First Listing</a>
        </div>
      ` : `
        <div class="cv-mywork-grid">
          ${portfolio.map(work => `
            <a href="/gallery/${work.id}" class="cv-mywork-card" data-work-id="${work.id}" style="text-decoration:none;color:inherit;">
              <div class="cv-mywork-card__image" style="background:linear-gradient(135deg, rgba(200,169,110,0.15), rgba(200,169,110,0.02));position:relative;overflow:hidden;">
                <img src="/api/image-preview/${work.id}" alt="${work.title}" loading="lazy"
                  style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;"
                  onerror="this.style.display='none'" />
                <div class="cv-mywork-card__category">${work.category}</div>
                ${work.remaining < work.editions ?
            `<div class="cv-mywork-card__sold-badge">${work.editions - work.remaining} sold</div>` : ''}
              </div>
              <div class="cv-mywork-card__body">
                <h3 class="cv-mywork-card__title">${work.title}</h3>
                <p class="cv-mywork-card__meta">${work.category} · ${work.remaining}/${work.editions} editions</p>
                <div class="cv-mywork-card__stats">
                  <span class="cv-mywork-card__stat">👁 ${(work.views || 0).toLocaleString()}</span>
                  <span class="cv-mywork-card__stat">♡ ${work.favorites || 0}</span>
                  <span class="cv-mywork-card__stat">💰 ${work.sales || 0}</span>
                </div>
                <div class="cv-mywork-card__price-row">
                  <span class="cv-mywork-card__price">$${work.price.toLocaleString()}</span>
                  <span class="cv-mywork-card__date">Listed ${work.createdAt ? new Date(work.createdAt).toLocaleDateString() : 'recently'}</span>
                </div>
              </div>
            </a>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

export function mount() {
    if (!isLoggedIn()) {
        setTimeout(() => navigate('/login', { replace: true }), 50);
    }
}
