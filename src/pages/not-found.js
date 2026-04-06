/**
 * ChitraVithika — 404 "Lost Lens" Page
 *
 * Features:
 *   - Custom CSS camera lens illustration lost in grass
 *   - "Search for something else" bar
 *   - "Return to Gallery" button
 *   - Maintains category-aware ambient theme
 */

export function render() {
    // Generate grass blades with varying heights and angles
    const blades = [];
    for (let i = 0; i < 24; i++) {
        const height = 20 + Math.random() * 35;
        const angle = -15 + Math.random() * 30;
        blades.push(`<div class="cv-lost-lens__blade" style="height:${height}px;transform:rotate(${angle}deg);"></div>`);
    }

    return `
    <div class="cv-lost-lens">
      <!-- Camera Lens Illustration -->
      <div class="cv-lost-lens__illustration">
        <div class="cv-lost-lens__lens"></div>
        <div class="cv-lost-lens__grass">
          ${blades.join('')}
        </div>
      </div>

      <div class="cv-lost-lens__code" aria-hidden="true">404</div>

      <h1 class="cv-lost-lens__title">Lost Lens</h1>
      <p class="cv-lost-lens__text">
        It seems we've dropped the lens cap somewhere. The page you're looking for has wandered off.
      </p>

      <!-- Search Bar -->
      <form id="cv-404-search" class="cv-lost-lens__search" autocomplete="off">
        <input type="search" class="cv-lost-lens__search-input" id="cv-404-search-input"
          placeholder="Search for something else…" aria-label="Search photographs" />
        <button type="submit" class="cv-btn cv-btn--primary" style="padding:var(--space-3) var(--space-5);">
          Find
        </button>
      </form>

      <div class="cv-lost-lens__actions">
        <a href="/gallery" class="cv-btn cv-btn--primary">Return to Gallery</a>
        <a href="/" class="cv-btn cv-btn--ghost">Go Home</a>
      </div>
    </div>
  `;
}

export function mount() {
    const form = document.getElementById('cv-404-search');
    const input = document.getElementById('cv-404-search-input');

    form?.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = input?.value.trim();
        if (query) {
            // Open search panel on home page with the query
            import('../js/router.js').then(r => r.navigate('/gallery'));
        }
    });
}
