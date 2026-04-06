/**
 * ChitraVithika — Checkout Page
 * Route: /checkout/:id
 */
import {
    getCatalogItem,
    getState,
    clearCart,
    addToCollection,
    isLoggedIn,
    getCollectionItem,
    refreshCatalogFromApi,
    syncBuyerDashboardFromApi,
} from '../js/state.js';
import { navigate } from '../js/router.js';

const UPI_APPS = [
    { id: 'gpay', label: 'GPay', accent: '#4285f4' },
    { id: 'phonepe', label: 'PhonePe', accent: '#5f259f' },
    { id: 'paytm', label: 'Paytm', accent: '#00b9f1' },
    { id: 'bhim', label: 'BHIM', accent: '#ff7a00' },
];

const LICENSES = [
    { id: 'personal', name: 'Personal', multiplier: 1, note: 'Private display and personal digital use.' },
    { id: 'editorial', name: 'Editorial', multiplier: 1.8, note: 'Publishing, news, and editorial storytelling.' },
    { id: 'commercial', name: 'Commercial', multiplier: 3.5, note: 'Advertising, campaigns, and unlimited brand use.' },
];

function formatUsd(amount) {
    return `$${Number(amount || 0).toLocaleString()}`;
}

function formatInr(amount) {
    return `₹${Math.round(amount || 0).toLocaleString('en-IN')}`;
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function getPayeeVpa(item) {
    const artistSlug = String(item.artist || 'artist').toLowerCase().replace(/[^a-z0-9]+/g, '');
    return `${artistSlug || 'artist'}.gallery@chitra`;
}

function getCheckoutContext(id) {
    const params = new URLSearchParams(window.location.search);
    const rawMode = String(params.get('mode') || 'direct');
    const amount = Number.parseFloat(params.get('amount'));
    const bidId = Number.parseInt(params.get('bidId') || '', 10);

    if (rawMode === 'dutch') {
        return {
            mode: 'dutch',
            bidId: null,
            amount: Number.isFinite(amount) ? amount : null,
            backHref: `/auctions/open/${id}`,
            backLabel: 'Auction',
            heading: 'UPI Auction Checkout',
            eyebrow: 'Dutch Auction Settlement',
            title: 'Pay the live Dutch-auction price',
            subtitle: 'Same UPI simulation, now used for auction wins as well.',
            flowTitle: 'Dutch Auction Flow',
            flowSteps: [
                'Review the live Dutch-auction amount.',
                'Choose a UPI app and enter your UPI ID.',
                'Type your 6-digit demo PIN on the keypad.',
                'Complete the simulated payment to secure the work.',
            ],
            fixedLicense: {
                id: 'commercial',
                name: 'Commercial',
                note: 'Auction purchases settle with a commercial license.',
            },
        };
    }

    if (rawMode === 'silent-award') {
        return {
            mode: 'silent-award',
            bidId: Number.isFinite(bidId) ? bidId : null,
            amount: Number.isFinite(amount) ? amount : null,
            backHref: '/dashboard/buyer',
            backLabel: 'Dashboard',
            heading: 'UPI Winning Bid Checkout',
            eyebrow: 'Accepted Silent Bid',
            title: 'Complete payment for your accepted bid',
            subtitle: 'Your accepted silent-auction bid is reserved for you until payment finishes.',
            flowTitle: 'Silent Auction Flow',
            flowSteps: [
                'Review your accepted winning bid.',
                'Choose your preferred UPI app.',
                'Enter your UPI ID and confirm the 6-digit PIN.',
                'Finish payment to move the work into your collection.',
            ],
            fixedLicense: {
                id: 'commercial',
                name: 'Commercial',
                note: 'Accepted auction bids settle with a commercial license.',
            },
        };
    }

    return {
        mode: 'direct',
        bidId: null,
        amount: null,
        backHref: `/gallery/${id}`,
        backLabel: 'Back',
        heading: 'UPI Checkout',
        eyebrow: 'Simulated Payment',
        title: 'Pay with UPI',
        subtitle: 'A realistic UPI-style flow for previewing how buyers would confirm a purchase inside the app.',
        flowTitle: 'Simulated Buyer Flow',
        flowSteps: [
            'Choose the license and UPI app.',
            'Confirm the payee and simulated amount.',
            'Enter a demo UPI ID and 6-digit PIN.',
            'Watch the app mimic a real approval and success callback.',
        ],
        fixedLicense: null,
    };
}

function buildPricing(item, checkoutContext) {
    if (checkoutContext.fixedLicense) {
        const usd = Number.isFinite(checkoutContext.amount) ? checkoutContext.amount : Number(item.price || 0);
        return [{
            id: checkoutContext.fixedLicense.id,
            name: checkoutContext.fixedLicense.name,
            usd,
            inr: Math.round(usd * 83),
            note: checkoutContext.fixedLicense.note,
        }];
    }

    return LICENSES.map((license) => ({
        ...license,
        usd: Math.round((item.price || 0) * license.multiplier),
        inr: Math.round((item.price || 0) * license.multiplier * 83),
    }));
}

function getSuccessCopy(mode, item, selectedLicense, merchantReference) {
    if (mode === 'dutch') {
        return `
          <strong>${escapeHtml(item.title)}</strong> is now marked as purchased from the Dutch auction with a
          <strong>${escapeHtml(selectedLicense.id)}</strong> license.
          Reference: <span style="font-family:var(--font-mono);">${merchantReference}</span>.
        `;
    }

    if (mode === 'silent-award') {
        return `
          Your accepted bid for <strong>${escapeHtml(item.title)}</strong> is now fully paid and moved into your
          collection with a <strong>${escapeHtml(selectedLicense.id)}</strong> license.
          Reference: <span style="font-family:var(--font-mono);">${merchantReference}</span>.
        `;
    }

    return `
      <strong>${escapeHtml(item.title)}</strong> is now marked as purchased with a
      <strong>${escapeHtml(selectedLicense.id)}</strong> license.
      Reference: <span style="font-family:var(--font-mono);">${merchantReference}</span>.
    `;
}

export function render({ id }) {
    if (!isLoggedIn()) {
        return `<div class="cv-page-message"><p class="cv-page-message__text">Redirecting to login...</p></div>`;
    }

    const cart = getState('cart');
    const item = getCatalogItem(id) || cart;

    if (!item) {
        return `<div class="cv-page-message"><h1 class="cv-page-message__title">Empty Cart</h1><p class="cv-page-message__text">No item selected for checkout.</p><a href="/gallery" class="cv-page-message__link">Browse Gallery</a></div>`;
    }

    const checkoutContext = getCheckoutContext(id);
    if (checkoutContext.mode === 'silent-award' && !checkoutContext.bidId) {
        return `<div class="cv-page-message"><h1 class="cv-page-message__title">Winning Bid Missing</h1><p class="cv-page-message__text">This accepted bid payment link is incomplete.</p><a href="/dashboard/buyer" class="cv-page-message__link">Back to Dashboard</a></div>`;
    }

    const existingPurchase = getCollectionItem(item.id || id);
    const priceOptions = buildPricing(item, checkoutContext);
    const selectedLicenseId = cart?.license || existingPurchase?.license || priceOptions[0].id;
    const selected = priceOptions.find((option) => option.id === selectedLicenseId) || priceOptions[0];
    const payeeVpa = getPayeeVpa(item);

    if (existingPurchase) {
        return `
        <div class="cv-page-container">
          <div style="margin-bottom:var(--space-6);">
            <a href="${checkoutContext.backHref}" style="font-size:var(--text-sm);color:var(--color-text-tertiary);letter-spacing:0.1em;text-transform:uppercase;">← ${checkoutContext.backLabel}</a>
          </div>
          <div class="cv-success-card" style="max-width:720px;margin:0 auto;">
            <div class="cv-success-card__icon">✓</div>
            <div class="cv-success-card__title">Already Bought</div>
            <div class="cv-success-card__text">
              You already own <strong>${escapeHtml(item.title)}</strong> with a
              <strong>${escapeHtml(existingPurchase.license || 'personal')}</strong> license.
              Re-purchasing this same work is disabled for this account.
            </div>
            <div style="display:flex;gap:var(--space-3);justify-content:center;flex-wrap:wrap;">
              <a href="/dashboard/buyer" class="cv-btn cv-btn--primary">View Collection</a>
              <a href="/gallery/${item.id}" class="cv-btn cv-btn--ghost">Back to Artwork</a>
            </div>
          </div>
        </div>
      `;
    }

    return `
    <div class="cv-page-container">
      <div style="margin-bottom:var(--space-6);">
        <a href="${checkoutContext.backHref}" style="font-size:var(--text-sm);color:var(--color-text-tertiary);letter-spacing:0.1em;text-transform:uppercase;">← ${checkoutContext.backLabel}</a>
      </div>

      <div style="display:grid;grid-template-columns:minmax(0,1.15fr) minmax(320px,0.85fr);gap:var(--space-8);align-items:start;">
        <section style="display:flex;flex-direction:column;gap:var(--space-6);">
          <header>
            <p class="cv-page-header__eyebrow">${checkoutContext.eyebrow}</p>
            <h1 class="cv-page-header__title" style="margin-bottom:var(--space-3);">${checkoutContext.heading}</h1>
            <p class="cv-page-header__subtitle">
              ${checkoutContext.subtitle}
            </p>
          </header>

          <div style="border:1px solid var(--color-border);border-radius:28px;overflow:hidden;background:linear-gradient(180deg,rgba(15,18,24,0.9),rgba(9,10,12,0.96));box-shadow:0 28px 64px rgba(0,0,0,0.35);">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,0.06);">
              <div>
                <div style="font-size:var(--text-xs);letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.6);margin-bottom:4px;">ChitraVithika Pay</div>
                <div style="font-family:var(--font-display);font-size:1.4rem;color:#fff;">${checkoutContext.title}</div>
              </div>
              <div style="padding:8px 12px;border-radius:999px;background:rgba(255,255,255,0.08);font-size:var(--text-xs);color:rgba(255,255,255,0.72);">
                Simulated UX
              </div>
            </div>

            <form id="checkout-form" style="padding:22px;display:flex;flex-direction:column;gap:var(--space-5);">
              <div style="padding:18px;border-radius:22px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);">
                <div style="display:flex;justify-content:space-between;gap:var(--space-4);align-items:flex-start;flex-wrap:wrap;">
                  <div>
                    <div style="font-size:var(--text-xs);letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.56);margin-bottom:6px;">You Are Paying</div>
                    <div id="upi-amount" style="font-family:var(--font-display);font-size:2rem;color:#fff;">${formatInr(selected.inr)}</div>
                    <div id="usd-amount" style="font-size:var(--text-sm);color:rgba(255,255,255,0.65);margin-top:6px;">Artwork price ${formatUsd(selected.usd)}</div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-size:var(--text-xs);letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.56);margin-bottom:6px;">Payee</div>
                    <div style="font-size:var(--text-sm);color:#fff;font-weight:600;">${escapeHtml(item.artist)}</div>
                    <div style="font-size:var(--text-xs);color:rgba(255,255,255,0.65);margin-top:4px;">${payeeVpa}</div>
                  </div>
                </div>
              </div>

              ${checkoutContext.fixedLicense ? `
                <div style="padding:18px;border-radius:18px;border:1px solid rgba(200,169,110,0.35);background:rgba(200,169,110,0.08);color:#fff;">
                  <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:8px;">
                    <span style="font-weight:600;">${checkoutContext.fixedLicense.name} License</span>
                    <span style="font-family:var(--font-mono);font-size:var(--text-xs);color:rgba(255,255,255,0.72);">${formatInr(selected.inr)}</span>
                  </div>
                  <div style="font-size:var(--text-xs);line-height:1.6;color:rgba(255,255,255,0.65);">${checkoutContext.fixedLicense.note}</div>
                </div>
              ` : `
                <div>
                  <div style="font-size:var(--text-xs);letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.56);margin-bottom:10px;">Choose License</div>
                  <div id="license-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
                    ${priceOptions.map((option) => `
                      <button type="button" class="cv-upi-license ${option.id === selected.id ? 'is-selected' : ''}" data-license="${option.id}" data-usd="${option.usd}" data-inr="${option.inr}"
                        style="text-align:left;padding:16px;border-radius:18px;border:1px solid ${option.id === selected.id ? 'rgba(200,169,110,0.55)' : 'rgba(255,255,255,0.08)'};background:${option.id === selected.id ? 'rgba(200,169,110,0.12)' : 'rgba(255,255,255,0.03)'};color:#fff;cursor:pointer;">
                        <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:8px;">
                          <span style="font-weight:600;">${option.name}</span>
                          <span style="font-family:var(--font-mono);font-size:var(--text-xs);color:rgba(255,255,255,0.72);">${formatInr(option.inr)}</span>
                        </div>
                        <div style="font-size:var(--text-xs);line-height:1.6;color:rgba(255,255,255,0.65);">${option.note}</div>
                      </button>
                    `).join('')}
                  </div>
                </div>
              `}

              <div>
                <div style="font-size:var(--text-xs);letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.56);margin-bottom:10px;">Choose UPI App</div>
                <div id="upi-app-grid" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;">
                  ${UPI_APPS.map((app, index) => `
                    <button type="button" class="cv-upi-app ${index === 0 ? 'is-selected' : ''}" data-app="${app.id}"
                      style="padding:14px 10px;border-radius:18px;border:1px solid ${index === 0 ? app.accent : 'rgba(255,255,255,0.08)'};background:${index === 0 ? `${app.accent}22` : 'rgba(255,255,255,0.03)'};color:#fff;cursor:pointer;display:flex;flex-direction:column;gap:10px;align-items:center;justify-content:center;">
                      <span data-app-badge="${app.id}" style="width:42px;height:42px;border-radius:14px;background:${app.accent};display:inline-flex;align-items:center;justify-content:center;font-size:0.78rem;font-weight:700;">${app.label.slice(0, 2)}</span>
                      <span style="font-size:var(--text-xs);letter-spacing:0.08em;text-transform:uppercase;">${app.label}</span>
                    </button>
                  `).join('')}
                </div>
              </div>

              <div>
                <label for="upi-id" style="display:block;font-size:var(--text-xs);letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.56);margin-bottom:8px;">Your UPI ID</label>
                <input id="upi-id" class="cv-form-input" type="text" value="collector@okaxis" spellcheck="false"
                  style="background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.08);color:#fff;" />
              </div>

              <div style="padding:18px;border-radius:20px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:var(--space-4);margin-bottom:12px;">
                  <div style="font-size:var(--text-xs);letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.56);">Enter UPI PIN</div>
                  <div style="font-size:var(--text-xs);color:rgba(255,255,255,0.56);">6-digit demo PIN</div>
                </div>
                <input id="upi-pin" type="hidden" value="" />
                <div id="upi-pin-slots" style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin-bottom:14px;">
                  ${Array.from({ length: 6 }, (_, index) => `
                    <div data-pin-slot="${index}" style="height:52px;border-radius:16px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03);display:flex;align-items:center;justify-content:center;font-size:1.2rem;color:#fff;">
                      <span style="opacity:0.25;">•</span>
                    </div>
                  `).join('')}
                </div>
                <div id="upi-keypad" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;">
                  ${['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'backspace'].map((key) => `
                    <button type="button" data-key="${key}" style="height:48px;border-radius:16px;border:1px solid rgba(255,255,255,0.09);background:${key === 'clear' ? 'rgba(224,82,82,0.12)' : key === 'backspace' ? 'rgba(200,169,110,0.12)' : 'rgba(255,255,255,0.03)'};color:#fff;font-weight:600;cursor:pointer;">
                      ${key === 'clear' ? 'Clear' : key === 'backspace' ? '⌫' : key}
                    </button>
                  `).join('')}
                </div>
              </div>

              <div style="padding:16px;border-radius:18px;background:rgba(255,255,255,0.03);border:1px dashed rgba(255,255,255,0.08);">
                <div style="display:flex;justify-content:space-between;gap:var(--space-4);font-size:var(--text-sm);color:rgba(255,255,255,0.78);margin-bottom:6px;">
                  <span>Merchant reference</span>
                  <span id="merchant-ref" style="font-family:var(--font-mono);">SIM-${item.id}-${Date.now().toString().slice(-6)}</span>
                </div>
                <div style="display:flex;justify-content:space-between;gap:var(--space-4);font-size:var(--text-sm);color:rgba(255,255,255,0.78);margin-bottom:6px;">
                  <span>Artwork</span>
                  <span>${escapeHtml(item.title || 'Untitled')}</span>
                </div>
                <div style="display:flex;justify-content:space-between;gap:var(--space-4);font-size:var(--text-sm);color:rgba(255,255,255,0.78);">
                  <span>Seller VPA</span>
                  <span style="font-family:var(--font-mono);">${payeeVpa}</span>
                </div>
              </div>

              <div id="checkout-status-panel" style="padding:16px;border-radius:18px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);">
                <div style="font-size:var(--text-xs);letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.56);margin-bottom:10px;">Payment Status</div>
                <div id="checkout-status" style="font-size:var(--text-sm);color:#fff;">Ready to simulate a UPI payment.</div>
              </div>

              <div id="checkout-error" class="cv-form-error" role="alert" style="margin:0;"></div>

              <button type="submit" id="btn-pay" class="cv-btn cv-btn--primary cv-btn--full cv-btn--large" style="background:linear-gradient(135deg,#00c853,#26a69a);border:none;">
                Pay ${formatInr(selected.inr)}
              </button>
            </form>
          </div>
        </section>

        <aside style="display:flex;flex-direction:column;gap:var(--space-5);">
          <div style="padding:var(--space-5);border-radius:24px;background:var(--color-surface);border:1px solid var(--color-border);">
            <div style="aspect-ratio:4/3;background:linear-gradient(135deg,${item.color || '#333'}66,var(--color-gradient-end));border-radius:18px;margin-bottom:var(--space-4);position:relative;overflow:hidden;">
              <img src="/api/image-preview/${item.id || id}" alt="${escapeHtml(item.title)}"
                style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;"
                onerror="this.style.display='none'" />
            </div>
            <div style="font-family:var(--font-display);font-size:var(--text-xl);font-weight:600;color:var(--color-text-primary);margin-bottom:6px;">${escapeHtml(item.title || 'Untitled')}</div>
            <div style="font-size:var(--text-sm);color:var(--color-text-tertiary);margin-bottom:var(--space-4);">by ${escapeHtml(item.artist || 'Anonymous')}</div>
            <div style="display:grid;gap:10px;">
              <div style="display:flex;justify-content:space-between;gap:var(--space-4);font-size:var(--text-sm);">
                <span style="color:var(--color-text-secondary);">License</span>
                <span id="summary-license" style="text-transform:capitalize;">${selected.id}</span>
              </div>
              <div style="display:flex;justify-content:space-between;gap:var(--space-4);font-size:var(--text-sm);">
                <span style="color:var(--color-text-secondary);">Original price</span>
                <span id="summary-usd">${formatUsd(selected.usd)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;gap:var(--space-4);font-size:var(--text-sm);">
                <span style="color:var(--color-text-secondary);">UPI simulation</span>
                <span id="summary-inr">${formatInr(selected.inr)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;gap:var(--space-4);font-size:var(--text-sm);">
                <span style="color:var(--color-text-secondary);">Remaining editions</span>
                <span>${item.remaining} / ${item.editions}</span>
              </div>
            </div>
          </div>

          <div style="padding:var(--space-5);border-radius:24px;background:rgba(200,169,110,0.08);border:1px solid rgba(200,169,110,0.24);">
            <div style="font-family:var(--font-display);font-size:var(--text-lg);font-weight:600;color:var(--color-text-primary);margin-bottom:8px;">${checkoutContext.flowTitle}</div>
            <ol style="margin:0;padding-left:18px;display:grid;gap:8px;font-size:var(--text-sm);color:var(--color-text-secondary);line-height:1.6;">
              ${checkoutContext.flowSteps.map((step) => `<li>${step}</li>`).join('')}
            </ol>
          </div>
        </aside>
      </div>

      <div id="checkout-success" style="display:none;margin-top:var(--space-8);"></div>
    </div>
  `;
}

export function mount({ id }) {
    if (!isLoggedIn()) {
        setTimeout(() => navigate('/login', { replace: true }), 50);
        return;
    }

    const item = getCatalogItem(id) || getState('cart');
    if (!item) return;
    if (getCollectionItem(item.id || id)) return;

    const checkoutContext = getCheckoutContext(id);
    const form = document.getElementById('checkout-form');
    const payBtn = document.getElementById('btn-pay');
    const errorEl = document.getElementById('checkout-error');
    const successEl = document.getElementById('checkout-success');
    const statusEl = document.getElementById('checkout-status');
    const licenseGrid = document.getElementById('license-grid');
    const appGrid = document.getElementById('upi-app-grid');
    const upiAmountEl = document.getElementById('upi-amount');
    const usdAmountEl = document.getElementById('usd-amount');
    const summaryLicense = document.getElementById('summary-license');
    const summaryUsd = document.getElementById('summary-usd');
    const summaryInr = document.getElementById('summary-inr');
    const merchantRefEl = document.getElementById('merchant-ref');
    const hiddenPinInput = document.getElementById('upi-pin');
    const keypad = document.getElementById('upi-keypad');
    const pinSlots = [...document.querySelectorAll('[data-pin-slot]')];

    const priceOptions = buildPricing(item, checkoutContext);
    let selectedLicense = priceOptions.find((option) => option.id === (getState('cart')?.license || priceOptions[0].id)) || priceOptions[0];
    let selectedApp = UPI_APPS[0];
    let pinValue = '';

    function setStatus(message) {
        if (statusEl) statusEl.textContent = message;
    }

    function syncPricing(option) {
        selectedLicense = option;
        if (upiAmountEl) upiAmountEl.textContent = formatInr(option.inr);
        if (usdAmountEl) usdAmountEl.textContent = `Artwork price ${formatUsd(option.usd)}`;
        if (summaryLicense) summaryLicense.textContent = option.id;
        if (summaryUsd) summaryUsd.textContent = formatUsd(option.usd);
        if (summaryInr) summaryInr.textContent = formatInr(option.inr);
        if (payBtn) payBtn.textContent = `Pay ${formatInr(option.inr)}`;
    }

    function updatePinUI() {
        if (hiddenPinInput) hiddenPinInput.value = pinValue;
        pinSlots.forEach((slot, index) => {
            slot.innerHTML = pinValue[index]
                ? '<span style="opacity:1;">●</span>'
                : '<span style="opacity:0.25;">•</span>';
        });
    }

    function pushPinDigit(digit) {
        if (pinValue.length >= 6) return;
        pinValue += digit;
        updatePinUI();
    }

    function popPinDigit() {
        pinValue = pinValue.slice(0, -1);
        updatePinUI();
    }

    function clearPinDigits() {
        pinValue = '';
        updatePinUI();
    }

    licenseGrid?.addEventListener('click', (event) => {
        const button = event.target.closest('[data-license]');
        if (!button) return;
        licenseGrid.querySelectorAll('[data-license]').forEach((el) => {
            el.classList.remove('is-selected');
            el.style.borderColor = 'rgba(255,255,255,0.08)';
            el.style.background = 'rgba(255,255,255,0.03)';
        });
        button.classList.add('is-selected');
        button.style.borderColor = 'rgba(200,169,110,0.55)';
        button.style.background = 'rgba(200,169,110,0.12)';
        syncPricing({
            id: button.dataset.license,
            usd: Number(button.dataset.usd),
            inr: Number(button.dataset.inr),
        });
    });

    appGrid?.addEventListener('click', (event) => {
        const button = event.target.closest('[data-app]');
        if (!button) return;
        selectedApp = UPI_APPS.find((app) => app.id === button.dataset.app) || UPI_APPS[0];
        appGrid.querySelectorAll('[data-app]').forEach((el) => {
            const app = UPI_APPS.find((entry) => entry.id === el.dataset.app);
            el.classList.remove('is-selected');
            el.style.borderColor = 'rgba(255,255,255,0.08)';
            el.style.background = 'rgba(255,255,255,0.03)';
            if (app) {
                const badge = el.querySelector(`[data-app-badge="${app.id}"]`);
                if (badge) badge.style.background = app.accent;
            }
        });
        button.classList.add('is-selected');
        button.style.borderColor = selectedApp.accent;
        button.style.background = `${selectedApp.accent}22`;
    });

    keypad?.addEventListener('click', (event) => {
        const key = event.target.closest('[data-key]')?.dataset.key;
        if (!key) return;
        if (/^\d$/.test(key)) pushPinDigit(key);
        if (key === 'backspace') popPinDigit();
        if (key === 'clear') clearPinDigits();
    });

    form?.addEventListener('submit', async (event) => {
        event.preventDefault();
        errorEl.textContent = '';

        const upiId = document.getElementById('upi-id')?.value.trim();
        const merchantReference = merchantRefEl?.textContent || `SIM-${item.id}-${Date.now()}`;

        if (!upiId || !/^[\w.-]+@[\w.-]+$/.test(upiId)) {
            errorEl.textContent = 'Enter a valid demo UPI ID like name@bank.';
            return;
        }
        if (!/^\d{6}$/.test(pinValue)) {
            errorEl.textContent = 'Enter a 6 digit demo UPI PIN using the keypad.';
            return;
        }

        payBtn.disabled = true;

        try {
            setStatus(`Opening ${selectedApp.label}...`);
            await delay(650);
            setStatus('Verifying payee and amount...');
            await delay(800);
            setStatus('Requesting UPI PIN approval...');
            await delay(900);
            setStatus('Payment authorised. Finalising purchase...');

            const token = getState('auth.token');
            const purchaseRes = await fetch(`/api/purchase/${item.id || id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    purchaseMode: checkoutContext.mode,
                    bidId: checkoutContext.bidId,
                    license: selectedLicense.id,
                    amount: selectedLicense.usd,
                    paymentMethod: 'upi-simulated',
                    paymentReference: merchantReference,
                    paymentApp: selectedApp.label,
                    upiId,
                    payeeVpa: getPayeeVpa(item),
                }),
            });

            if (!purchaseRes.ok) {
                const err = await purchaseRes.json().catch(() => ({ error: 'Purchase failed' }));
                throw new Error(err.error || 'Purchase failed');
            }

            const purchaseResult = await purchaseRes.json();
            await refreshCatalogFromApi();
            await syncBuyerDashboardFromApi();
            addToCollection({
                itemId: item.id || id,
                title: item.title || 'Untitled',
                artist: item.artist || 'Unknown',
                price: selectedLicense.usd,
                license: selectedLicense.id,
                color: item.color,
            });
            clearCart();

            const layout = document.querySelector('.cv-page-container > div[style*="display:grid"]');
            if (layout) layout.style.display = 'none';
            successEl.style.display = '';
            successEl.innerHTML = `
              <div class="cv-success-card" style="max-width:760px;margin:0 auto;">
                <div class="cv-success-card__icon">₹</div>
                <div class="cv-success-card__title">UPI Payment Simulated Successfully</div>
                <div class="cv-success-card__text">
                  ${getSuccessCopy(checkoutContext.mode, item, selectedLicense, merchantReference)}
                </div>
                <div style="display:grid;gap:10px;max-width:420px;margin:0 auto var(--space-5);text-align:left;">
                  <div style="display:flex;justify-content:space-between;gap:var(--space-4);"><span>UPI app</span><strong>${selectedApp.label}</strong></div>
                  <div style="display:flex;justify-content:space-between;gap:var(--space-4);"><span>Simulated amount</span><strong>${formatInr(selectedLicense.inr)}</strong></div>
                  <div style="display:flex;justify-content:space-between;gap:var(--space-4);"><span>Artwork price</span><strong>${formatUsd(selectedLicense.usd)}</strong></div>
                  <div style="display:flex;justify-content:space-between;gap:var(--space-4);"><span>Editions left</span><strong>${purchaseResult.remaining}</strong></div>
                </div>
                <div style="display:flex;gap:var(--space-3);justify-content:center;flex-wrap:wrap;">
                  <a href="/dashboard/buyer" class="cv-btn cv-btn--primary">View Collection</a>
                  <a href="/gallery/${item.id}" class="cv-btn cv-btn--ghost">Back to Artwork</a>
                </div>
              </div>
            `;
        } catch (err) {
            errorEl.textContent = err.message || 'Purchase failed. Please try again.';
            setStatus('Payment could not be completed.');
            payBtn.disabled = false;
            payBtn.textContent = `Pay ${formatInr(selectedLicense.inr)}`;
            return;
        }
    });

    updatePinUI();
    syncPricing(selectedLicense);
}
