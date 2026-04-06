/**
 * ChitraVithika — Home Page
 * Route: /
 * Contains hero, gallery preview (exhibition), auction preview, artist preview, and submit CTA.
 */
import { getCatalog, getArtists, isLoggedIn } from '../js/state.js';
import { applyTheme, resetTheme } from '../js/themes.js';

export function render() {
  if (!isLoggedIn()) {
    return `
    <section class="cv-hero" aria-labelledby="hero-heading">
      <div class="cv-hero__content">
        <p class="cv-hero__eyebrow">Curated. Limited. Luminous.</p>
        <h1 id="hero-heading" class="cv-hero__heading">
          Photography<br>
          <em>as a living investment</em>
        </h1>
        <p class="cv-hero__sub">
          Sign in to explore the gallery, live auctions, artist profiles, and natural-language search — all reserved for members.
        </p>
        <div class="cv-hero__actions">
          <a href="/login" class="cv-btn cv-btn--primary cv-btn--large">Sign in</a>
          <a href="/register" class="cv-btn cv-btn--ghost cv-btn--large">Create an account</a>
        </div>
      </div>
    </section>
    <section class="cv-section cv-section--dark" style="text-align:center; padding:var(--space-16) var(--gutter); max-width:42rem; margin:0 auto;">
      <h2 class="cv-section__title" style="justify-content:center;">Member access</h2>
      <p class="cv-section__subtitle" style="margin:0 auto var(--space-4);">
        The exhibition, auctions, and artist directory are not shown on the public home page. Create a free account to browse and bid.
      </p>
    </section>
    <section class="cv-section" style="text-align:center; padding:var(--space-16) var(--gutter);">
      <h2 class="cv-section__title" style="justify-content:center;">Submit Your Vision</h2>
      <p class="cv-section__subtitle" style="margin:0 auto var(--space-8);">
        Are you a photographer? Join ChitraVithika's curated roster and reach discerning collectors worldwide.
      </p>
      <a href="/submit" class="cv-btn cv-btn--primary cv-btn--large">Submit Work</a>
    </section>
  `;
  }

  const catalog = getCatalog();
  const artists = getArtists();
  const totalEditions = catalog.reduce((sum, i) => sum + (i.remaining || 0), 0);

  // Pick top 4 auction items for preview
  const auctionItems = catalog.slice(0, 4);

  return `
    <!-- HERO -->
    <section class="cv-hero" aria-labelledby="hero-heading">
      <div class="cv-hero__content">
        <p class="cv-hero__eyebrow">Curated. Limited. Luminous.</p>
        <h1 id="hero-heading" class="cv-hero__heading">
          Photography<br>
          <em>as a living investment</em>
        </h1>
        <p class="cv-hero__sub">
          Acquire museum-quality digital fine-art prints with provable scarcity,
          from the world's most compelling visual storytellers.
        </p>
        <div class="cv-hero__actions">
          <a href="/gallery" class="cv-btn cv-btn--primary cv-btn--large">Explore Gallery</a>
          <a href="/auctions" class="cv-btn cv-btn--ghost cv-btn--large">Live Auctions →</a>
        </div>
      </div>

      <figure class="cv-hero__stat-strip" aria-label="Platform statistics">
        <div class="cv-hero__stat">
          <span class="cv-hero__stat-value" id="stat-photos">${totalEditions}</span>
          <span class="cv-hero__stat-label">Editions Available</span>
        </div>
        <div class="cv-hero__stat">
          <span class="cv-hero__stat-value" id="stat-artists">${artists.length}</span>
          <span class="cv-hero__stat-label">Active Artists</span>
        </div>
        <div class="cv-hero__stat">
          <span class="cv-hero__stat-value" id="stat-auctions">${catalog.length}</span>
          <span class="cv-hero__stat-label">Auctions Live</span>
        </div>
      </figure>
    </section>

    <!-- GALLERY EXHIBITION PREVIEW -->
    <section class="cv-section" aria-labelledby="gallery-heading">
      <div class="cv-section__header">
        <h2 id="gallery-heading" class="cv-section__title">Exhibition</h2>
        <p class="cv-section__subtitle">Hover to navigate. Click to acquire.</p>
        <div class="cv-section__filters" role="group" aria-label="Filter by category">
          <button class="cv-filter-chip active" data-filter="all" aria-pressed="true">All</button>
          <button class="cv-filter-chip" data-filter="landscape" aria-pressed="false">Landscape</button>
          <button class="cv-filter-chip" data-filter="street" aria-pressed="false">Street</button>
          <button class="cv-filter-chip" data-filter="portrait" aria-pressed="false">Portrait</button>
          <button class="cv-filter-chip" data-filter="abstract" aria-pressed="false">Abstract</button>
          <button class="cv-filter-chip" data-filter="macro" aria-pressed="false">Macro</button>
          <button class="cv-filter-chip" data-filter="wildlife" aria-pressed="false">Wildlife</button>
        </div>
      </div>
      <parallax-gallery id="cv-main-gallery" perspective="1200" lerp-factor="0.08" aria-label="3D Photography Exhibition">
        <div class="cv-gallery-skeleton" aria-hidden="true">
          ${Array(6).fill('<div class="cv-gallery-skeleton__card"></div>').join('')}
        </div>
      </parallax-gallery>
      <div style="text-align:center; margin-top:var(--space-8)">
        <a href="/gallery" class="cv-btn cv-btn--ghost">View Full Gallery →</a>
      </div>
    </section>

    <!-- AUCTION PREVIEW -->
    <section class="cv-section cv-section--dark" aria-labelledby="auctions-heading">
      <div class="cv-section__header">
        <h2 id="auctions-heading" class="cv-section__title">
          Live Auctions <span class="cv-badge cv-badge--live" aria-label="Live">●&nbsp;LIVE</span>
        </h2>
        <p class="cv-section__subtitle">
          Dutch descending-price auctions. First collector to act, wins.
          Price drops every <strong>10 seconds</strong>.
        </p>
      </div>
      <div id="cv-auction-grid" class="cv-auction-grid" role="list" aria-label="Active auction listings">
        ${auctionItems.map(item => `
          <a href="/auctions/open/${item.id}" class="cv-auction-preview-card" role="listitem">
            <div class="cv-auction-preview-card__color" style="background:linear-gradient(135deg, ${item.color || '#8c7248'}88, ${item.color || '#8c7248'}22);position:relative;overflow:hidden;">
              <img src="/api/image-preview/${item.id}" loading="lazy" alt="${item.title}"
                style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 0.6s ease;"
                onload="this.style.opacity='1'"
                onerror="this.style.display='none'" />
            </div>
            <div class="cv-auction-preview-card__body">
              <div class="cv-auction-preview-card__title">${item.title}</div>
              <div class="cv-auction-preview-card__artist">${item.artist}</div>
              <div class="cv-auction-preview-card__price-row">
                <span class="cv-auction-preview-card__price">$${item.price.toLocaleString()}</span>
                <span class="cv-auction-preview-card__floor">Floor $${item.auctionFloor.toLocaleString()}</span>
              </div>
              <div class="cv-auction-preview-card__status">
                <span class="cv-auction-preview-card__pulse"></span>
                Dropping now
              </div>
            </div>
          </a>
        `).join('')}
      </div>
      <div style="text-align:center; margin-top:var(--space-8)">
        <a href="/auctions" class="cv-btn cv-btn--ghost">View All Auctions →</a>
      </div>
    </section>

    <!-- ARTIST PREVIEW -->
    <section class="cv-section" aria-labelledby="artists-heading">
      <div class="cv-section__header">
        <h2 id="artists-heading" class="cv-section__title">Artists</h2>
        <p class="cv-section__subtitle">The voices behind the light.</p>
      </div>
      <div id="cv-artists-grid" class="cv-artists-grid" aria-label="Featured artists">
        ${artists.map(a => `
          <a href="/artists/${a.id}" class="cv-artist-card" data-artist="${a.id}">
            <div class="cv-artist-card__avatar" style="background:linear-gradient(135deg, ${a.color || '#8c7248'}, var(--color-avatar-gradient-end))">
              ${a.name.charAt(0)}
            </div>
            <h3 class="cv-artist-card__name">${a.name}</h3>
            <p class="cv-artist-card__works">${a.works.length} work${a.works.length !== 1 ? 's' : ''}</p>
          </a>
        `).join('')}
      </div>
      <div style="text-align:center; margin-top:var(--space-8)">
        <a href="/artists" class="cv-btn cv-btn--ghost">All Artists →</a>
      </div>
    </section>

    <!-- SUBMIT CTA -->
    <section class="cv-section cv-section--dark" style="text-align:center; padding:var(--space-16) var(--gutter);">
      <h2 class="cv-section__title" style="justify-content:center;">Submit Your Vision</h2>
      <p class="cv-section__subtitle" style="margin:0 auto var(--space-8);">
        Are you a photographer? Join ChitraVithika's curated roster and reach discerning collectors worldwide.
      </p>
      <a href="/submit" class="cv-btn cv-btn--primary cv-btn--large">Submit Work</a>
    </section>
  `;
}

export function mount() {
  if (!isLoggedIn()) {
    return () => {};
  }

  const catalog = getCatalog();

  // ── Populate gallery with photo-card elements (correct attributes) ──
  const gallery = document.getElementById('cv-main-gallery');
  if (gallery) {
    const skeleton = gallery.querySelector('.cv-gallery-skeleton');
    if (skeleton) skeleton.remove();

    const frag = document.createDocumentFragment();
    for (const item of catalog) {
      const card = document.createElement('photo-card');
      // photo-card.js expects these exact attribute names (see observedAttributes)
      card.setAttribute('item-id', item.id);
      card.setAttribute('title', item.title);
      card.setAttribute('artist', item.artist);
      card.setAttribute('price', item.price);
      card.setAttribute('floor', item.auctionFloor);
      card.setAttribute('editions', item.editions);
      card.setAttribute('remaining', item.remaining);
      card.setAttribute('category', item.category);
      card.setAttribute('color', item.color || '#888');
      card.setAttribute('role', 'listitem');
      card.style.cursor = 'pointer';
      card.addEventListener('click', () => {
        import('../js/router.js').then(r => r.navigate(`/gallery/${item.id}`));
      });
      frag.appendChild(card);
    }
    gallery.appendChild(frag);
  }

  // ── Wire filter chips ──
  document.querySelectorAll('.cv-filter-chip[data-filter]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.cv-filter-chip').forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-pressed', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-pressed', 'true');
      const filter = chip.dataset.filter;

      // Dynamic category theme transition
      if (filter === 'all') resetTheme();
      else applyTheme(filter);

      if (gallery && gallery.filterByCategory) {
        gallery.filterByCategory(filter);
      }
    });
  });

  // ── Animate hero stat counters ──
  const totalEditions = catalog.reduce((s, i) => s + (i.remaining || 0), 0);
  const artistCount = new Set(catalog.map(i => i.artist)).size;
  animateCounter('stat-photos', totalEditions);
  animateCounter('stat-artists', artistCount);
  animateCounter('stat-auctions', catalog.length);

  // ── IntersectionObserver reveal for sections ──
  const revealTargets = document.querySelectorAll('.cv-section__header, .cv-artist-card, .cv-auction-preview-card');
  if (revealTargets.length > 0) {
    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          revealObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    revealTargets.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = `opacity 0.6s ease ${i * 0.06}s, transform 0.6s ease ${i * 0.06}s`;
      revealObs.observe(el);
    });
  }

  function syncHomeCategoryTheme() {
    const active = document.querySelector('.cv-section__filters .cv-filter-chip.active[data-filter]');
    const filter = active?.dataset.filter || 'all';
    if (filter === 'all') resetTheme();
    else applyTheme(filter);
  }

  const onThemeChange = () => syncHomeCategoryTheme();
  document.addEventListener('cv-theme-change', onThemeChange);

  // Cleanup
  return () => {
    document.removeEventListener('cv-theme-change', onThemeChange);
    resetTheme();
  };
}

// ── Counter animation helper ──
function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const duration = 1200;
  const start = performance.now();
  const tick = (now) => {
    const elapsed = now - start;
    const pct = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - pct, 3);
    el.textContent = Math.round(eased * target).toLocaleString();
    if (pct < 1) requestAnimationFrame(tick);
    else el.textContent = target.toLocaleString();
  };
  requestAnimationFrame(tick);
}
