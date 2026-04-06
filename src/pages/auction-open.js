/**
 * ChitraVithika — Open Auction (Dutch)
 * Route: /auctions/open/:id
 */
import {
    getCatalogItem,
    isLoggedIn,
    getCollectionItem,
} from '../js/state.js';
import { navigate } from '../js/router.js';
import { renderEngagementPanel, mountEngagementPanel } from '../js/engagement-panel.js';

function formatCurrency(amount) {
    return `$${Number(amount || 0).toLocaleString()}`;
}

export function render({ id }) {
    const item = getCatalogItem(id);
    if (!item) {
        return `<div class="cv-page-message"><h1 class="cv-page-message__title">Not Found</h1><p class="cv-page-message__text">This auction doesn't exist.</p><a href="/auctions" class="cv-page-message__link">Back to Auctions</a></div>`;
    }

    const ownedCopy = getCollectionItem(item.id);

    return `
    <div class="cv-page-container">
      <div style="margin-bottom:var(--space-6);">
        <a href="/auctions" style="font-size:var(--text-sm);color:var(--color-text-tertiary);letter-spacing:0.1em;text-transform:uppercase;">← Auctions</a>
      </div>

      <div class="cv-bid-room">
        <div>
          <div style="aspect-ratio:4/3;background:linear-gradient(135deg, ${item.color || '#333'} 0%, var(--color-gradient-end) 100%);border-radius:var(--radius-lg);margin-bottom:var(--space-6);position:relative;overflow:hidden;">
            <img src="/api/image-preview/${item.id}?v=${Date.now()}" alt="${item.title}"
              style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;"
              onerror="this.style.display='none'" />
          </div>
          <h1 style="font-family:var(--font-display);font-size:var(--text-2xl);font-weight:600;color:var(--color-text-primary);margin-bottom:var(--space-2);">${item.title}</h1>
          <p style="font-size:var(--text-sm);color:var(--color-text-secondary);margin-bottom:var(--space-4);">${item.artist}</p>
          <p style="font-size:var(--text-base);color:var(--color-text-secondary);line-height:1.7;margin-bottom:var(--space-5);">${item.description || ''}</p>

          <div style="padding:var(--space-5);border-radius:var(--radius-lg);background:var(--color-surface);border:1px solid var(--color-border-subtle);display:grid;gap:12px;">
            <div style="display:flex;justify-content:space-between;gap:var(--space-4);font-size:var(--text-sm);">
              <span style="color:var(--color-text-tertiary);">Start price</span>
              <strong>${formatCurrency(item.price)}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;gap:var(--space-4);font-size:var(--text-sm);">
              <span style="color:var(--color-text-tertiary);">Floor price</span>
              <strong>${formatCurrency(item.auctionFloor)}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;gap:var(--space-4);font-size:var(--text-sm);">
              <span style="color:var(--color-text-tertiary);">Remaining editions</span>
              <strong id="auction-remaining">${item.remaining} / ${item.editions}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;gap:var(--space-4);font-size:var(--text-sm);">
              <span style="color:var(--color-text-tertiary);">Auction mode</span>
              <strong>Dutch, 10-second drop</strong>
            </div>
          </div>
        </div>

        <div class="cv-bid-panel">
          <div class="cv-bid-panel__current">
            <div class="cv-bid-panel__label">Current Price</div>
            <div class="cv-bid-panel__price" id="bid-current-price">${formatCurrency(item.price)}</div>
            <div style="margin-top:var(--space-2);">
              <auction-timer
                id="auction-timer"
                data-item-id="${item.id}"
                data-title="${item.title}"
                data-floor="${item.auctionFloor}"
                data-start-price="${item.price}"
                style="display:inline-block;"></auction-timer>
            </div>
          </div>

          ${ownedCopy ? `
            <div style="padding:var(--space-5);border-radius:var(--radius-lg);background:rgba(38,166,154,0.1);border:1px solid rgba(38,166,154,0.3);text-align:center;">
              <div style="font-family:var(--font-display);font-size:var(--text-lg);font-weight:600;color:#26a69a;margin-bottom:var(--space-2);">Already Bought</div>
              <div style="font-size:var(--text-sm);color:var(--color-text-tertiary);margin-bottom:var(--space-4);">
                You already own this work, so repeat auction purchases are disabled for this account.
              </div>
              <a href="/dashboard/buyer" class="cv-btn cv-btn--ghost">View Collection</a>
            </div>
          ` : `
            <button class="cv-btn cv-btn--primary cv-btn--full cv-btn--large" id="btn-buy-now">
              Buy at Current Price
            </button>
          `}

          <div id="bid-status" style="margin-top:var(--space-3);font-size:var(--text-sm);text-align:center;min-height:1.5em;" role="alert"></div>

          <div style="margin-top:var(--space-6);padding-top:var(--space-4);border-top:1px solid var(--color-border-subtle);">
            <p style="font-size:var(--text-xs);color:var(--color-text-tertiary);line-height:1.7;">
              <strong style="color:var(--color-text-secondary);">How it works:</strong><br>
              The server drops the Dutch auction price every 10 seconds until it reaches the floor.
              When you decide to buy, the app takes you through the same simulated UPI flow used across the marketplace.
            </p>
          </div>
        </div>
      </div>

      ${renderEngagementPanel()}
    </div>
  `;
}

export function mount({ id }) {
    const item = getCatalogItem(id);
    if (!item) return;

    const ownedCopy = getCollectionItem(item.id);
    const btn = document.getElementById('btn-buy-now');
    const status = document.getElementById('bid-status');
    const priceEl = document.getElementById('bid-current-price');
    const remainingEl = document.getElementById('auction-remaining');
    const timer = document.getElementById('auction-timer');
    let currentPrice = item.price;
    let sold = false;

    timer?.addEventListener('auction-timer:update', (event) => {
        const detail = event.detail || {};
        currentPrice = Number(detail.currentPrice || currentPrice);
        sold = !!detail.sold;
        if (priceEl) priceEl.textContent = formatCurrency(currentPrice);
        if (btn) {
            btn.disabled = sold;
            btn.textContent = sold ? 'Already Claimed' : 'Buy at Current Price';
        }
        if (status && sold) {
            status.style.color = 'var(--color-text-tertiary)';
            status.textContent = 'This round is temporarily claimed. If editions remain, the auction will reopen shortly.';
        }
    });

    btn?.addEventListener('click', async () => {
        if (ownedCopy) {
            navigate('/dashboard/buyer');
            return;
        }
        if (!isLoggedIn()) {
            navigate('/login');
            return;
        }

        status.style.color = 'var(--color-text-secondary)';
        status.textContent = `Continuing to UPI checkout at ${formatCurrency(currentPrice)}...`;
        navigate(`/checkout/${item.id}?mode=dutch&amount=${encodeURIComponent(String(currentPrice))}`);
    });

    mountEngagementPanel(id);
}
