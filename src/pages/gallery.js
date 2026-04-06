/**
 * ChitraVithika — Gallery Page
 * Route: /gallery
 *
 * Features:
 *   - Real image thumbnails from /api/image-preview/:id
 *   - Category-based dynamic theming (ambient color morph)
 *   - Advanced filter panel (price range, editions, sort)
 */
import { getCatalog } from '../js/state.js';
import { applyTheme, resetTheme } from '../js/themes.js';

export function render() {
  const catalog = getCatalog();
  const categories = [...new Set(catalog.map(i => i.category))];

  return `
    <div class="cv-page-container cv-page-container--wide">
      <div class="cv-page-header">
        <p class="cv-page-header__eyebrow">Full Collection</p>
        <h1 class="cv-page-header__title">Gallery</h1>
        <p class="cv-page-header__subtitle">Browse our complete collection of limited-edition fine-art photography.</p>
      </div>

      <div class="cv-section__filters" role="group" aria-label="Filter by category" style="margin-bottom:var(--space-4)">
        <button class="cv-filter-chip active" data-filter="all" aria-pressed="true">All</button>
        ${categories.map(c => `<button class="cv-filter-chip" data-filter="${c}" aria-pressed="false">${c.charAt(0).toUpperCase() + c.slice(1)}</button>`).join('')}
      </div>

      <!-- Advanced Filters Toggle -->
      <div style="margin-bottom:var(--space-6);display:flex;gap:var(--space-3);align-items:center;">
        <button id="btn-advanced-filters" class="cv-btn cv-btn--ghost" style="font-size:var(--text-xs);padding:6px 14px;border-radius:var(--radius-full);">
          ⚙ Advanced Filters
        </button>
        <div id="active-filter-chips" style="display:flex;gap:var(--space-2);flex-wrap:wrap;"></div>
      </div>

      <!-- Advanced Filter Panel (hidden by default) -->
      <div id="cv-advanced-filters" style="display:none;margin-bottom:var(--space-8);padding:var(--space-6);background:var(--color-surface-raised);border:1px solid var(--color-border);border-radius:var(--radius-lg);">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:var(--space-6);">

          <!-- Price Range -->
          <div>
            <label style="font-size:var(--text-xs);color:var(--color-text-tertiary);letter-spacing:0.1em;text-transform:uppercase;display:block;margin-bottom:var(--space-2);">Price Range</label>
            <div style="display:flex;gap:var(--space-2);align-items:center;">
              <input id="filter-price-min" type="number" placeholder="Min" min="0" step="100"
                style="flex:1;padding:8px 12px;background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text-primary);font-family:var(--font-mono);font-size:var(--text-sm);" />
              <span style="color:var(--color-text-tertiary);">—</span>
              <input id="filter-price-max" type="number" placeholder="Max" min="0" step="100"
                style="flex:1;padding:8px 12px;background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text-primary);font-family:var(--font-mono);font-size:var(--text-sm);" />
            </div>
          </div>

          <!-- Min Editions -->
          <div>
            <label style="font-size:var(--text-xs);color:var(--color-text-tertiary);letter-spacing:0.1em;text-transform:uppercase;display:block;margin-bottom:var(--space-2);">Min. Editions Remaining</label>
            <input id="filter-editions-min" type="number" placeholder="Any" min="0"
              style="width:100%;padding:8px 12px;background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text-primary);font-family:var(--font-mono);font-size:var(--text-sm);" />
          </div>

          <!-- Sort -->
          <div>
            <label style="font-size:var(--text-xs);color:var(--color-text-tertiary);letter-spacing:0.1em;text-transform:uppercase;display:block;margin-bottom:var(--space-2);">Sort By</label>
            <select id="filter-sort"
              style="width:100%;padding:8px 12px;background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text-primary);font-size:var(--text-sm);cursor:pointer;">
              <option value="default">Default</option>
              <option value="price-asc">Price: Low → High</option>
              <option value="price-desc">Price: High → Low</option>
              <option value="title-az">Title: A → Z</option>
              <option value="title-za">Title: Z → A</option>
              <option value="editions-asc">Editions: Scarce First</option>
              <option value="newest">Newest First</option>
            </select>
          </div>

          <!-- Artist Filter -->
          <div>
            <label style="font-size:var(--text-xs);color:var(--color-text-tertiary);letter-spacing:0.1em;text-transform:uppercase;display:block;margin-bottom:var(--space-2);">Artist</label>
            <select id="filter-artist"
              style="width:100%;padding:8px 12px;background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text-primary);font-size:var(--text-sm);cursor:pointer;">
              <option value="">All Artists</option>
              ${[...new Set(catalog.map(i => i.artist))].map(a => `<option value="${a}">${a}</option>`).join('')}
            </select>
          </div>
        </div>

        <div style="display:flex;gap:var(--space-3);margin-top:var(--space-5);">
          <button id="btn-apply-filters" class="cv-btn cv-btn--primary" style="font-size:var(--text-sm);padding:8px 20px;">Apply Filters</button>
          <button id="btn-reset-filters" class="cv-btn cv-btn--ghost" style="font-size:var(--text-sm);padding:8px 20px;">Reset</button>
        </div>
      </div>

      <div id="gallery-count" style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-bottom:var(--space-4);font-family:var(--font-mono);">
        ${catalog.length} works
      </div>

      <div class="cv-cards-grid" id="gallery-grid">
        ${catalog.map(item => renderCard(item)).join('')}
      </div>
    </div>
  `;
}

function renderCard(item) {
  const isSoldOut = item.remaining <= 0;
  const editionLabel = isSoldOut ? 'Sold Out' :
    item.remaining === 1 ? 'Last Edition' :
    item.remaining <= 3 ? `Only ${item.remaining}` :
    `${item.remaining}/${item.editions}`;
  
  const editionBadgeStyle = isSoldOut
    ? 'background:rgba(224,82,82,0.2);border:1px solid rgba(224,82,82,0.5);color:#e05252;'
    : 'background:rgba(200,169,110,0.15);border:1px solid rgba(200,169,110,0.35);color:#c8a96e;';

  return `
      <a href="/gallery/${item.id}" class="cv-gallery-card ${isSoldOut ? 'cv-gallery-card--sold-out' : ''}" data-category="${item.category}" data-price="${item.price}" data-editions="${item.remaining}" data-artist="${item.artist}" data-title="${item.title}" data-id="${item.id}" style="text-decoration:none;color:inherit;${isSoldOut ? 'opacity:0.7;' : ''}">
        <div class="cv-gallery-card__image" style="aspect-ratio:4/3;background:linear-gradient(135deg, ${item.color || '#333'}44, var(--color-gradient-end));border-radius:var(--radius-lg);position:relative;overflow:hidden;">
          <img src="/api/image-preview/${item.id}" loading="lazy" alt="${item.title}"
            style="width:100%;height:100%;object-fit:cover;display:block;opacity:0;transition:opacity 0.6s ease;${isSoldOut ? 'filter:grayscale(0.5);' : ''}"
            onload="this.style.opacity='1'"
            onerror="this.style.display='none'" />
          <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 50%,rgba(0,0,0,0.6) 100%);pointer-events:none;"></div>
          ${isSoldOut ? '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);"><span style="font-family:var(--font-display);font-size:1.5rem;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:0.1em;text-shadow:0 2px 8px rgba(0,0,0,0.5);">Sold Out</span></div>' : ''}
          <div style="position:absolute;top:10px;left:10px;">
            <span style="padding:3px 10px;border-radius:999px;background:rgba(0,0,0,0.55);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,0.1);font-family:var(--font-mono);font-size:0.62rem;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.7);">${item.category}</span>
          </div>
          <div style="position:absolute;top:10px;right:10px;">
            <span style="padding:3px 10px;border-radius:999px;${editionBadgeStyle}backdrop-filter:blur(8px);font-family:var(--font-mono);font-size:0.6rem;font-weight:600;">
              ${editionLabel}
            </span>
          </div>
        </div>
        <div style="padding:var(--space-3) 0;">
          <h3 style="font-family:var(--font-display);font-size:var(--text-md);font-weight:600;color:var(--color-text-primary);margin-bottom:2px;">${item.title}</h3>
          <p style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${item.artist}</p>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:var(--space-2);">
            <span style="font-family:var(--font-mono);font-size:var(--text-sm);color:${isSoldOut ? 'var(--color-text-tertiary)' : 'var(--color-accent)'};">${isSoldOut ? 'Sold' : '$' + item.price.toLocaleString()}</span>
            <span style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${isSoldOut ? 'All editions sold' : item.remaining + '/' + item.editions + ' left'}</span>
          </div>
        </div>
      </a>`;
}

export function mount() {
  const catalog = getCatalog();
  let activeCategory = 'all';
  let activeFilters = { priceMin: null, priceMax: null, editionsMin: null, sort: 'default', artist: '' };

  // ── Category Filter Chips ──────────────────────────────
  document.querySelectorAll('.cv-filter-chip[data-filter]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.cv-filter-chip').forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-pressed', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-pressed', 'true');

      activeCategory = chip.dataset.filter;

      // Apply category theme
      if (activeCategory === 'all') resetTheme();
      else applyTheme(activeCategory);

      applyAllFilters();
    });
  });

  // ── Advanced Filters Toggle ────────────────────────────
  const advPanel = document.getElementById('cv-advanced-filters');
  const advBtn = document.getElementById('btn-advanced-filters');
  advBtn?.addEventListener('click', () => {
    const visible = advPanel.style.display !== 'none';
    advPanel.style.display = visible ? 'none' : 'block';
    advBtn.textContent = visible ? '⚙ Advanced Filters' : '✕ Hide Filters';
  });

  // ── Apply / Reset Filters ──────────────────────────────
  document.getElementById('btn-apply-filters')?.addEventListener('click', () => {
    activeFilters.priceMin = parseFloat(document.getElementById('filter-price-min')?.value) || null;
    activeFilters.priceMax = parseFloat(document.getElementById('filter-price-max')?.value) || null;
    activeFilters.editionsMin = parseInt(document.getElementById('filter-editions-min')?.value) || null;
    activeFilters.sort = document.getElementById('filter-sort')?.value || 'default';
    activeFilters.artist = document.getElementById('filter-artist')?.value || '';
    applyAllFilters();
    updateFilterChips();
  });

  document.getElementById('btn-reset-filters')?.addEventListener('click', () => {
    activeFilters = { priceMin: null, priceMax: null, editionsMin: null, sort: 'default', artist: '' };
    if (document.getElementById('filter-price-min')) document.getElementById('filter-price-min').value = '';
    if (document.getElementById('filter-price-max')) document.getElementById('filter-price-max').value = '';
    if (document.getElementById('filter-editions-min')) document.getElementById('filter-editions-min').value = '';
    if (document.getElementById('filter-sort')) document.getElementById('filter-sort').value = 'default';
    if (document.getElementById('filter-artist')) document.getElementById('filter-artist').value = '';
    applyAllFilters();
    updateFilterChips();
  });

  function applyAllFilters() {
    const grid = document.getElementById('gallery-grid');
    const cards = [...(grid?.querySelectorAll('.cv-gallery-card') || [])];

    // Filter
    let visibleCount = 0;
    cards.forEach(card => {
      let show = true;
      // Category
      if (activeCategory !== 'all' && card.dataset.category !== activeCategory) show = false;
      // Price
      const price = parseFloat(card.dataset.price);
      if (activeFilters.priceMin && price < activeFilters.priceMin) show = false;
      if (activeFilters.priceMax && price > activeFilters.priceMax) show = false;
      // Editions
      if (activeFilters.editionsMin && parseInt(card.dataset.editions) < activeFilters.editionsMin) show = false;
      // Artist
      if (activeFilters.artist && card.dataset.artist !== activeFilters.artist) show = false;

      card.style.display = show ? '' : 'none';
      if (show) visibleCount++;
    });

    // Sort (re-order DOM)
    if (activeFilters.sort !== 'default') {
      const sorted = cards.filter(c => c.style.display !== 'none').sort((a, b) => {
        switch (activeFilters.sort) {
          case 'price-asc': return parseFloat(a.dataset.price) - parseFloat(b.dataset.price);
          case 'price-desc': return parseFloat(b.dataset.price) - parseFloat(a.dataset.price);
          case 'title-az': return a.dataset.title.localeCompare(b.dataset.title);
          case 'title-za': return b.dataset.title.localeCompare(a.dataset.title);
          case 'editions-asc': return parseInt(a.dataset.editions) - parseInt(b.dataset.editions);
          case 'newest': return parseInt(b.dataset.id) - parseInt(a.dataset.id);
          default: return 0;
        }
      });
      sorted.forEach(card => grid.appendChild(card));
    }

    // Count
    const countEl = document.getElementById('gallery-count');
    if (countEl) countEl.textContent = `${visibleCount} work${visibleCount !== 1 ? 's' : ''}`;
  }

  function updateFilterChips() {
    const container = document.getElementById('active-filter-chips');
    if (!container) return;
    const chips = [];
    if (activeFilters.priceMin) chips.push(`Min $${activeFilters.priceMin.toLocaleString()}`);
    if (activeFilters.priceMax) chips.push(`Max $${activeFilters.priceMax.toLocaleString()}`);
    if (activeFilters.editionsMin) chips.push(`≥${activeFilters.editionsMin} editions`);
    if (activeFilters.sort !== 'default') chips.push(`Sort: ${activeFilters.sort}`);
    if (activeFilters.artist) chips.push(`Artist: ${activeFilters.artist}`);
    container.innerHTML = chips.map(c =>
      `<span style="padding:3px 10px;border-radius:999px;background:rgba(200,169,110,0.1);border:1px solid rgba(200,169,110,0.3);font-size:0.7rem;color:#c8a96e;font-family:var(--font-mono);">${c}</span>`
    ).join('');
  }

  function syncThemeFromCategory() {
    if (activeCategory === 'all') resetTheme();
    else applyTheme(activeCategory);
  }

  const onThemeChange = () => syncThemeFromCategory();
  document.addEventListener('cv-theme-change', onThemeChange);

  // Reset theme when leaving gallery
  return () => {
    document.removeEventListener('cv-theme-change', onThemeChange);
    resetTheme();
  };
}
