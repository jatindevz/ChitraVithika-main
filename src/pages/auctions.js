/**
 * ChitraVithika — Auctions Hub Page
 * Route: /auctions
 */
import { getCatalog } from '../js/state.js';

export function render() {
  const catalog = getCatalog();

  return `
    <div class="cv-page-container cv-page-container--wide">
      <div class="cv-page-header">
        <p class="cv-page-header__eyebrow">Marketplace</p>
        <h1 class="cv-page-header__title">
          Auctions <span class="cv-badge cv-badge--live">● LIVE</span>
        </h1>
        <p class="cv-page-header__subtitle">
          Dutch descending-price auctions. Watch the price drop every 10 seconds. 
          The first collector to act wins the edition.
        </p>
      </div>

      <div class="cv-tabs">
        <button class="cv-tab active" data-tab="open">Open Auctions</button>
        <button class="cv-tab" data-tab="silent">Silent Auctions</button>
      </div>

      <div id="tab-open" class="cv-tab-content">
        <div class="cv-cards-grid" id="cv-auctions-list">
          ${catalog.map(item => `
            <a href="/auctions/open/${item.id}" class="cv-auction-card" style="text-decoration:none;color:inherit;background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:var(--space-5);display:block;transition:border-color 0.25s ease,transform 0.25s var(--ease-spring);">
              <div style="aspect-ratio:16/9;background:linear-gradient(135deg,${item.color || '#333'}44,var(--color-gradient-end));border-radius:var(--radius-md);margin-bottom:var(--space-4);position:relative;overflow:hidden;">
                <img src="/api/image-preview/${item.id}" loading="lazy" alt="${item.title}"
                  style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 0.6s ease;"
                  onload="this.style.opacity='1'" onerror="this.style.display='none'" />
              </div>
              <h3 style="font-family:var(--font-display);font-size:var(--text-md);font-weight:600;color:var(--color-text-primary);margin-bottom:var(--space-1);">${item.title}</h3>
              <p style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-bottom:var(--space-3);">${item.artist}</p>
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span data-auction-price="${item.id}" style="font-family:var(--font-mono);font-size:var(--text-lg);color:var(--color-accent);">$${item.price.toLocaleString()}</span>
                <span data-auction-status="${item.id}" style="font-size:var(--text-xs);color:var(--color-text-tertiary);letter-spacing:0.1em;text-transform:uppercase;">Next drop soon</span>
              </div>
            </a>
          `).join('')}
        </div>
      </div>

      <div id="tab-silent" class="cv-tab-content" style="display:none;">
        <div class="cv-cards-grid">
          ${catalog.slice(0, 3).map(item => `
            <a href="/auctions/silent/${item.id}" class="cv-auction-card" style="text-decoration:none;color:inherit;background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:var(--space-5);display:block;transition:border-color 0.25s ease;">
              <div style="aspect-ratio:16/9;background:linear-gradient(135deg,${item.color || '#333'}40,var(--color-gradient-end));border-radius:var(--radius-md);margin-bottom:var(--space-4);position:relative;overflow:hidden;">
                <img src="/api/image-preview/${item.id}" loading="lazy" alt="${item.title}"
                  style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 0.6s ease;"
                  onload="this.style.opacity='1'" onerror="this.style.display='none'" />
                <span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:var(--text-xs);color:rgba(255,255,255,0.5);letter-spacing:0.2em;text-transform:uppercase;background:rgba(0,0,0,0.3);">Sealed Bid</span>
              </div>
              <h3 style="font-family:var(--font-display);font-size:var(--text-md);font-weight:600;color:var(--color-text-primary);margin-bottom:var(--space-1);">${item.title}</h3>
              <p style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-bottom:var(--space-3);">${item.artist}</p>
              <span style="font-size:var(--text-xs);color:var(--color-accent);letter-spacing:0.1em;">SUBMIT SEALED BID →</span>
            </a>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}

export function mount() {
  document.querySelectorAll('.cv-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.cv-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.cv-tab-content').forEach(c => c.style.display = 'none');
      const target = document.getElementById(`tab-${tab.dataset.tab}`);
      if (target) target.style.display = '';
    });
  });

  // Add hover effects
  document.querySelectorAll('.cv-auction-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.borderColor = 'var(--color-accent-dim)';
      card.style.transform = 'translateY(-4px)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.borderColor = 'var(--color-border)';
      card.style.transform = 'translateY(0)';
    });
  });

  const source = new EventSource('/api/auction/stream');
  source.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      for (const auction of payload.auctions || []) {
        const priceEl = document.querySelector(`[data-auction-price="${auction.itemId}"]`);
        const statusEl = document.querySelector(`[data-auction-status="${auction.itemId}"]`);
        if (priceEl) priceEl.textContent = `$${Number(auction.currentPrice || 0).toLocaleString()}`;
        if (statusEl) {
          if (auction.sold) {
            statusEl.textContent = 'Claimed';
          } else if (Number(auction.nextDropIn || 0) <= 0) {
            statusEl.textContent = `Floor $${Number(auction.floor || 0).toLocaleString()}`;
          } else {
            statusEl.textContent = `Drops in ${Math.max(1, Math.ceil(Number(auction.nextDropIn || 0) / 1000))}s`;
          }
        }
      }
    } catch (err) {
      console.warn('[auctions] stream parse failed:', err);
    }
  };

  return () => {
    source.close();
  };
}
