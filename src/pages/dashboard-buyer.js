/**
 * ChitraVithika — Buyer Dashboard
 * Route: /dashboard/buyer
 */
import { isLoggedIn, currentUser, getState, syncBuyerDashboardFromApi, deleteCurrentAccount, needsProfileCompletion, canAccessArtistTools, updateCurrentProfilePhoto, refreshCatalogFromApi, getAuthToken } from '../js/state.js';
import { navigate } from '../js/router.js';

const PAGE_SIZE = 5;
let colPage = 1;
let bidPage = 1;
let wonPage = 1;

function totalPages(len) {
    return Math.max(1, Math.ceil(len / PAGE_SIZE));
}

function slicePage(arr, page) {
    const tp = totalPages(arr.length);
    const p = Math.min(Math.max(1, page), tp);
    const start = (p - 1) * PAGE_SIZE;
    return { items: arr.slice(start, start + PAGE_SIZE), page: p, totalPages: tp };
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function getInitials(name) {
    return String(name || 'CV')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('') || 'CV';
}

function bidStatusLabel(b) {
    const st = b.bid_status || 'active';
    if (st === 'pending') return '<span class="cv-badge" style="background:rgba(200,169,110,0.2);color:var(--color-accent);">Pending seller</span>';
    if (st === 'declined') return '<span class="cv-badge" style="background:rgba(180,80,80,0.15);color:#c44;">Declined</span>';
    if (st === 'cancelled') return '<span class="cv-badge" style="opacity:0.8;">Closed</span>';
    if (st === 'accepted') return '<span class="cv-badge cv-badge--live">Won</span>';
    return '<span class="cv-badge cv-badge--live">Active</span>';
}

function pagerHtml(prefix, page, tp, totalItems) {
    if (totalItems <= PAGE_SIZE) return '';
    return `
      <div class="cv-dash-pager" style="display:flex;align-items:center;justify-content:center;gap:var(--space-4);margin-top:var(--space-4);font-size:var(--text-sm);">
        <button type="button" class="cv-btn cv-btn--ghost cv-btn--small" data-pager="${prefix}" data-dir="prev" ${page <= 1 ? 'disabled' : ''}>Previous</button>
        <span style="color:var(--color-text-tertiary);">Page ${page} / ${tp}</span>
        <button type="button" class="cv-btn cv-btn--ghost cv-btn--small" data-pager="${prefix}" data-dir="next" ${page >= tp ? 'disabled' : ''}>Next</button>
      </div>`;
}

export function render() {
    if (!isLoggedIn()) {
        return `<div class="cv-page-message"><p class="cv-page-message__text">Redirecting to login…</p></div>`;
    }

    const user = currentUser();
    const collection = getState('collection') || [];
    const activeBids = getState('bids.active') || [];
    const wonBids = getState('bids.won') || [];
    const googleNeedsCompletion = needsProfileCompletion(user);
    const artistReady = canAccessArtistTools(user);

    const colSlice = slicePage(collection, colPage);
    const bidSlice = slicePage(activeBids, bidPage);
    const wonSlice = slicePage(wonBids, wonPage);

    return `
    <div class="cv-page-container">
      <div class="cv-page-header">
        <p class="cv-page-header__eyebrow">Dashboard</p>
        <h1 class="cv-page-header__title">Welcome, ${escapeHtml(user.name)}</h1>
        <p class="cv-page-header__subtitle">Manage your collection and active bids.</p>
      </div>

      <div class="cv-dash-section" style="display:grid;grid-template-columns:auto 1fr;gap:var(--space-5);align-items:center;">
        <div style="width:96px;height:96px;border-radius:28px;overflow:hidden;border:1px solid var(--color-border);background:linear-gradient(135deg,rgba(200,169,110,0.18),rgba(38,166,154,0.22));display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:1.6rem;color:var(--color-text-primary);">
          ${user.photoURL ? `<img src="${escapeHtml(user.photoURL)}" alt="${escapeHtml(user.name)}" style="width:100%;height:100%;object-fit:cover;" />` : escapeHtml(getInitials(user.name))}
        </div>
        <div>
          <h2 class="cv-dash-section__title" style="margin-bottom:var(--space-2);">Profile Photo</h2>
          <p style="color:var(--color-text-tertiary);font-size:var(--text-sm);margin-bottom:var(--space-3);">
            Upload a display photo for your dashboard and account menu presence.
          </p>
          <div style="display:flex;flex-wrap:wrap;gap:var(--space-3);align-items:center;">
            <label class="cv-btn cv-btn--ghost" for="buyer-profile-photo-input">Upload Photo</label>
            <input id="buyer-profile-photo-input" type="file" accept="image/*" hidden />
            <span id="buyer-profile-photo-status" style="font-size:var(--text-sm);color:var(--color-text-tertiary);">PNG, JPG, or WEBP works best.</span>
          </div>
        </div>
      </div>

      <div class="cv-stats-row">
        <div class="cv-stat-card">
          <div class="cv-stat-card__value">${collection.length}</div>
          <div class="cv-stat-card__label">Acquired Works</div>
        </div>
        <div class="cv-stat-card">
          <div class="cv-stat-card__value">${activeBids.length}</div>
          <div class="cv-stat-card__label">Active Bids</div>
        </div>
        <div class="cv-stat-card">
          <div class="cv-stat-card__value">${wonBids.length}</div>
          <div class="cv-stat-card__label">Auctions Won</div>
        </div>
        <div class="cv-stat-card">
          <div class="cv-stat-card__value">$${collection.reduce((s, c) => s + (c.price || 0), 0).toLocaleString()}</div>
          <div class="cv-stat-card__label">Collection Value</div>
        </div>
      </div>

      <!-- My Collection -->
      <div class="cv-dash-section">
        <h2 class="cv-dash-section__title">My Collection</h2>
        ${collection.length === 0 ? `
          <div class="cv-empty-state">
            <div class="cv-empty-state__icon">🖼️</div>
            <h3 class="cv-empty-state__title">Your collection is empty</h3>
            <p class="cv-empty-state__text">Start acquiring fine-art photography to build your collection.</p>
            <a href="/gallery" class="cv-btn cv-btn--primary">Explore Gallery</a>
          </div>
        ` : `
          <div class="cv-dash-grid">
            ${colSlice.items.map(item => `
              <div class="cv-collection-card">
                <div class="cv-collection-card__thumb" style="background:linear-gradient(135deg,${item.color || '#333'},var(--color-gradient-end));position:relative;overflow:hidden;">
                  ${item.removedByAdmin ? `
                    <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:var(--space-4);text-align:center;background:rgba(30,10,10,0.55);color:#e05252;font-size:var(--text-xs);letter-spacing:0.08em;text-transform:uppercase;">
                      Item Removed By The Admin
                    </div>
                  ` : `
                    <img src="/api/image-preview/${item.itemId}" alt="${escapeHtml(item.title)}"
                      style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;"
                      onerror="this.style.display='none'" />
                  `}
                </div>
                <div>
                  <div class="cv-collection-card__title">${escapeHtml(item.title)}</div>
                  <div class="cv-collection-card__artist">${escapeHtml(item.artist)} · ${escapeHtml(item.license || 'commercial')} license</div>
                  ${item.removedByAdmin ? `<div style="margin-top:6px;font-size:var(--text-xs);color:#e05252;font-weight:600;">ITEM REMOVED BY THE ADMIN</div>` : ''}
                </div>
                <div class="cv-collection-card__price">$${(item.price || 0).toLocaleString()}</div>
                <div style="display:flex;gap:var(--space-2);flex-wrap:wrap;">
                  ${item.removedByAdmin ? `
                    <span style="font-size:var(--text-xs);color:var(--color-text-tertiary);align-self:center;">Visible only to your account.</span>
                  ` : `
                    <a href="/gallery/${item.itemId}" class="cv-btn cv-btn--ghost cv-btn--small">View</a>
                    <button type="button" class="cv-btn cv-btn--primary cv-btn--small" data-relist-item="${item.itemId}" data-relist-price="${item.price || 0}">
                      Sell This Copy
                    </button>
                  `}
                </div>
              </div>
            `).join('')}
          </div>
          ${pagerHtml('col', colSlice.page, colSlice.totalPages, collection.length)}
        `}
      </div>

      <!-- Active Bids -->
      <div class="cv-dash-section">
        <h2 class="cv-dash-section__title">My Bids</h2>
        ${activeBids.length === 0 ? `
          <p style="color:var(--color-text-tertiary);font-size:var(--text-sm);font-style:italic;">No active bids. <a href="/auctions" style="color:var(--color-accent);">Browse auctions</a></p>
        ` : `
          <div class="cv-table-wrap">
            <table class="cv-table">
              <thead><tr>
                <th>Item</th>
                <th>Amount</th>
                <th>Type</th>
                <th>Status</th>
              </tr></thead>
              <tbody>
                ${bidSlice.items.map(bid => `
                  <tr>
                    <td><a href="/auctions/${bid.type === 'silent' ? 'silent' : 'open'}/${bid.itemId}" style="color:var(--color-accent);">${escapeHtml(bid.title || `Item #${bid.itemId}`)}</a></td>
                    <td style="font-family:var(--font-mono);color:var(--color-accent);">$${bid.amount.toLocaleString()}</td>
                    <td style="text-transform:capitalize;">${bid.type}</td>
                    <td>${bidStatusLabel(bid)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ${pagerHtml('bid', bidSlice.page, bidSlice.totalPages, activeBids.length)}
        `}
      </div>

      <!-- Won Auctions -->
      ${wonBids.length > 0 ? `
        <div class="cv-dash-section">
          <h2 class="cv-dash-section__title">Auctions Won</h2>
          <div class="cv-table-wrap">
            <table class="cv-table">
              <thead><tr>
                <th>Work</th>
                <th>Artist</th>
                <th>Winning Bid</th>
                <th>Status</th>
                <th>Won On</th>
                <th>Action</th>
              </tr></thead>
              <tbody>
                ${wonSlice.items.map(bid => `
                  <tr>
                    <td style="color:var(--color-text-primary);">${escapeHtml(bid.title)}</td>
                    <td>${escapeHtml(bid.artist)}</td>
                    <td style="font-family:var(--font-mono);color:var(--color-accent);">$${bid.amount.toLocaleString()}</td>
                    <td>${bid.removedByAdmin ? '<span class="cv-badge" style="background:rgba(224,82,82,0.14);color:#e05252;">ITEM REMOVED BY THE ADMIN</span>' : bid.paymentPending ? '<span class="cv-badge" style="background:rgba(200,169,110,0.2);color:var(--color-accent);">Awaiting UPI Payment</span>' : '<span class="cv-badge cv-badge--live">Paid</span>'}</td>
                    <td>${new Date(bid.wonAt).toLocaleDateString()}</td>
                    <td>
                      ${bid.removedByAdmin
                        ? '<span style="color:var(--color-text-tertiary);font-size:var(--text-sm);">Unavailable</span>'
                        : bid.paymentPending
                        ? `<a href="/checkout/${bid.itemId}?mode=silent-award&bidId=${bid.bidId}&amount=${bid.amount}" class="cv-btn cv-btn--primary cv-btn--small">Pay with UPI</a>`
                        : '<span style="color:var(--color-text-tertiary);font-size:var(--text-sm);">Complete</span>'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ${pagerHtml('won', wonSlice.page, wonSlice.totalPages, wonBids.length)}
        </div>
      ` : ''}

      <div class="cv-dash-section">
        <h2 class="cv-dash-section__title">Profile & Artist Access</h2>
        <p style="color:var(--color-text-tertiary);font-size:var(--text-sm);margin-bottom:var(--space-4);">
          ${artistReady
            ? 'Your artist tools are active. You can open your photographer dashboard and submit new work.'
            : googleNeedsCompletion
              ? 'Your Google account still needs a few details. Complete your profile first, then you can upgrade to artist access.'
              : 'Collector accounts can be upgraded any time. Complete your artist profile to unlock submissions and seller tools.'}
        </p>
        <div style="display:flex;flex-wrap:wrap;gap:var(--space-3);">
          <a href="${artistReady ? '/dashboard/photographer' : googleNeedsCompletion ? '/complete-profile' : '/complete-profile?intent=artist'}" class="cv-btn cv-btn--primary">
            ${artistReady ? 'Open Photographer Dashboard' : googleNeedsCompletion ? 'Complete Profile' : 'Become an Artist'}
          </a>
          ${!artistReady ? '<a href="/complete-profile?intent=artist" class="cv-btn cv-btn--ghost">Artist Requirements</a>' : ''}
        </div>
      </div>

      <div class="cv-dash-section">
        <h2 class="cv-dash-section__title">Account</h2>
        <p style="color:var(--color-text-tertiary);font-size:var(--text-sm);margin-bottom:var(--space-4);">
          Delete your account permanently. This removes your bids, likes, comments, and sign-in access.
        </p>
        <button type="button" id="btn-delete-account" class="cv-btn cv-btn--ghost" style="border-color:rgba(224,82,82,0.35);color:#e05252;">
          Delete My Account
        </button>
      </div>
    </div>
  `;
}

function bindPager() {
    document.querySelectorAll('[data-pager]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const prefix = btn.getAttribute('data-pager');
            const dir = btn.getAttribute('data-dir');
            const delta = dir === 'next' ? 1 : -1;
            if (prefix === 'col') colPage += delta;
            if (prefix === 'bid') bidPage += delta;
            if (prefix === 'won') wonPage += delta;
            const outlet = document.getElementById('cv-page');
            if (outlet) outlet.innerHTML = render();
            bindPager();
            bindResaleButtons();
            bindProfilePhotoUpload();
            document.getElementById('btn-logout')?.addEventListener('click', onLogout);
            document.getElementById('btn-delete-account')?.addEventListener('click', onDeleteAccount);
        });
    });
}

function bindProfilePhotoUpload() {
    const input = document.getElementById('buyer-profile-photo-input');
    const status = document.getElementById('buyer-profile-photo-status');
    input?.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file) return;
        if (status) status.textContent = 'Uploading profile photo...';

        try {
            const photoURL = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result || ''));
                reader.onerror = () => reject(new Error('Unable to read image'));
                reader.readAsDataURL(file);
            });
            await updateCurrentProfilePhoto(photoURL);
            if (status) status.textContent = 'Profile photo updated.';
            const outlet = document.getElementById('cv-page');
            if (outlet) outlet.innerHTML = render();
            bindPager();
            bindResaleButtons();
            bindProfilePhotoUpload();
            document.getElementById('btn-logout')?.addEventListener('click', onLogout);
            document.getElementById('btn-delete-account')?.addEventListener('click', onDeleteAccount);
        } catch (err) {
            if (status) status.textContent = err.message || 'Unable to upload photo';
        } finally {
            input.value = '';
        }
    });
}

function bindResaleButtons() {
    document.querySelectorAll('[data-relist-item]').forEach((button) => {
        button.addEventListener('click', async () => {
            const itemId = Number(button.getAttribute('data-relist-item'));
            const startPriceInput = prompt('Set the resale price in USD for this work:', button.getAttribute('data-relist-price') || '1200');
            if (startPriceInput == null) return;
            const startPrice = Number.parseFloat(startPriceInput);
            if (!Number.isFinite(startPrice) || startPrice <= 0) {
                alert('Enter a valid resale price.');
                return;
            }

            const floorInput = prompt('Set the auction floor price in USD:', String(Math.max(1, Math.round(startPrice * 0.65))));
            if (floorInput == null) return;
            const floorPrice = Number.parseFloat(floorInput);
            if (!Number.isFinite(floorPrice) || floorPrice <= 0 || floorPrice > startPrice) {
                alert('Enter a valid floor price that is not above the resale price.');
                return;
            }

            const useSilentAuction = confirm('Use a sealed silent auction for this resale?\n\nChoose OK for silent auction or Cancel for Dutch auction.');
            const token = getAuthToken();
            if (!token) {
                navigate('/login');
                return;
            }

            try {
                const res = await fetch(`/api/resale/${itemId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        startPrice,
                        floorPrice,
                        auctionType: useSilentAuction ? 'silent' : 'dutch',
                    }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    throw new Error(data.error || 'Unable to relist this work');
                }
                await refreshCatalogFromApi();
                await syncBuyerDashboardFromApi();
                alert('Your acquired work has been relisted successfully.');
                const outlet = document.getElementById('cv-page');
                if (outlet) outlet.innerHTML = render();
                bindPager();
                bindResaleButtons();
                bindProfilePhotoUpload();
                document.getElementById('btn-logout')?.addEventListener('click', onLogout);
                document.getElementById('btn-delete-account')?.addEventListener('click', onDeleteAccount);
            } catch (err) {
                alert(err.message || 'Unable to relist this work');
            }
        });
    });
}

function onLogout() {
    import('../js/state.js').then((s) => {
        s.logout();
        navigate('/');
    });
}

async function onDeleteAccount() {
    const confirmed = confirm('Delete your account permanently? This action cannot be undone.');
    if (!confirmed) return;

    try {
        await deleteCurrentAccount();
        navigate('/', { replace: true });
    } catch (err) {
        alert(err.message || 'Unable to delete account');
    }
}

export function mount() {
    if (!isLoggedIn()) {
        setTimeout(() => navigate('/login', { replace: true }), 50);
        return;
    }

    (async () => {
        try {
            await syncBuyerDashboardFromApi();
        } catch (e) {
            console.warn('[dashboard-buyer] sync failed', e);
        }
        const outlet = document.getElementById('cv-page');
        if (outlet) outlet.innerHTML = render();
        bindPager();
        bindResaleButtons();
        bindProfilePhotoUpload();
        document.getElementById('btn-logout')?.addEventListener('click', onLogout);
        document.getElementById('btn-delete-account')?.addEventListener('click', onDeleteAccount);
    })();
}
