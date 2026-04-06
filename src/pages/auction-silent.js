/**
 * ChitraVithika — Silent Auction Page
 * Route: /auctions/silent/:id
 */
import { getCatalogItem, isLoggedIn, getAuthToken, getCollectionItem } from '../js/state.js';
import { navigate } from '../js/router.js';
import { renderEngagementPanel, mountEngagementPanel } from '../js/engagement-panel.js';

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
          <div style="aspect-ratio:4/3;background:linear-gradient(135deg,${item.color || '#333'}40,var(--color-gradient-end));border-radius:var(--radius-lg);margin-bottom:var(--space-6);position:relative;overflow:hidden;">
            <img src="/api/image-preview/${item.id}?v=${Date.now()}" alt="${item.title}"
              style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;"
              onerror="this.style.display='none'" />
          </div>
          <h1 style="font-family:var(--font-display);font-size:var(--text-2xl);font-weight:600;color:var(--color-text-primary);margin-bottom:var(--space-2);">${item.title}</h1>
          <p style="font-size:var(--text-sm);color:var(--color-text-secondary);margin-bottom:var(--space-4);">${item.artist}</p>
          <p style="font-size:var(--text-base);color:var(--color-text-secondary);line-height:1.7;">${item.description}</p>
        </div>

        <div class="cv-bid-panel">
          <h2 style="font-family:var(--font-display);font-size:var(--text-lg);font-weight:600;color:var(--color-text-primary);margin-bottom:var(--space-4);">Place Your Sealed Bid</h2>
          
          <p style="font-size:var(--text-sm);color:var(--color-text-secondary);margin-bottom:var(--space-6);line-height:1.7;">
            Submit a sealed bid. All bids are hidden until the auction closes. Highest bidder wins.
            Minimum bid: <strong style="color:var(--color-accent);">$${item.auctionFloor.toLocaleString()}</strong>
          </p>

          ${ownedCopy ? `
            <div style="padding:var(--space-5);border-radius:var(--radius-lg);background:rgba(38,166,154,0.1);border:1px solid rgba(38,166,154,0.3);text-align:center;">
              <div style="font-family:var(--font-display);font-size:var(--text-lg);font-weight:600;color:#26a69a;margin-bottom:var(--space-2);">Already Bought</div>
              <div style="font-size:var(--text-sm);color:var(--color-text-tertiary);margin-bottom:var(--space-4);">
                You already own this work, so repeat bidding is disabled for this account.
              </div>
              <a href="/dashboard/buyer" class="cv-btn cv-btn--ghost">View Collection</a>
            </div>
          ` : `
            <form id="silent-bid-form" class="cv-form">
              <div class="cv-form-group">
                <label for="bid-amount" class="cv-form-label">Your Bid</label>
                <div class="cv-masked-input">
                  <span class="cv-masked-input__prefix">$</span>
                  <input
                    type="number"
                    id="bid-amount"
                    name="amount"
                    class="cv-form-input"
                    min="${item.auctionFloor}"
                    step="50"
                    value="${item.auctionFloor}"
                    required
                  />
                </div>
              </div>

              <div id="silent-bid-error" class="cv-form-error" role="alert"></div>

              <button type="submit" class="cv-btn cv-btn--primary cv-btn--full cv-btn--large" id="btn-silent-bid">
                Submit Sealed Bid
              </button>
            </form>
          `}

          <div id="silent-bid-status" style="margin-top:var(--space-4);" role="alert"></div>

          <div style="margin-top:var(--space-6);padding-top:var(--space-4);border-top:1px solid var(--color-border-subtle);">
            <p style="font-size:var(--text-xs);color:var(--color-text-tertiary);line-height:1.7;">
              <strong style="color:var(--color-text-secondary);">How Silent Auctions work:</strong><br>
              All bids are sealed — no one can see competing bids. When the auction closes, the highest 
              bidder wins. When your bid is accepted, you will be taken through the same UPI checkout flow used for all purchases.
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
    if (getCollectionItem(item.id)) {
        mountEngagementPanel(id);
        return;
    }

    const form = document.getElementById('silent-bid-form');
    const errorEl = document.getElementById('silent-bid-error');
    const statusEl = document.getElementById('silent-bid-status');
    const submitBtn = document.getElementById('btn-silent-bid');

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!isLoggedIn()) { navigate('/login'); return; }

        const amount = parseFloat(form.elements['amount'].value);
        errorEl.textContent = '';

        if (isNaN(amount) || amount < item.auctionFloor) {
            errorEl.textContent = `Minimum bid is $${item.auctionFloor.toLocaleString()}`;
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting…';

        try {
            const token = getAuthToken();
            if (!token) {
                navigate('/login');
                return;
            }
            const res = await fetch(`/api/bids/${id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ amount }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error || 'Could not submit bid');
            }
            statusEl.innerHTML = `
        <div class="cv-success-card" style="margin:0;">
          <div class="cv-success-card__icon">🔒</div>
          <div class="cv-success-card__title">Bid Submitted</div>
          <div class="cv-success-card__text">Your sealed bid of <strong>$${amount.toLocaleString()}</strong> for "${item.title}" has been recorded.</div>
          <a href="/dashboard/buyer" class="cv-btn cv-btn--ghost">View My Bids</a>
        </div>
      `;
            form.style.display = 'none';
        } catch (err) {
            errorEl.textContent = err.message;
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Sealed Bid';
        }
    });

    mountEngagementPanel(id);
}
