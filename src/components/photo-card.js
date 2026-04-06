/**
 * ChitraVithika — <photo-card> Web Component
 *
 * Displays a photo card with image, metadata, and acquire button.
 * Loads images from the unencrypted preview endpoint for reliability.
 *
 * Attributes:
 *   item-id, title, artist, price, floor, editions, remaining, category, color
 */

class PhotoCard extends HTMLElement {
  static get observedAttributes() {
    return ['item-id', 'title', 'artist', 'price', 'floor', 'editions', 'remaining', 'category', 'color'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._loaded = false;
  }

  connectedCallback() {
    this._render();
    this._startLoad();
  }

  get itemId() { return parseInt(this.getAttribute('item-id') || '0', 10); }
  get itemTitle() { return this.getAttribute('title') || 'Untitled'; }
  get artist() { return this.getAttribute('artist') || 'Unknown'; }
  get price() { return parseInt(this.getAttribute('price') || '0', 10); }
  get floor() { return parseInt(this.getAttribute('floor') || '0', 10); }
  get editions() { return parseInt(this.getAttribute('editions') || '1', 10); }
  get remaining() { return parseInt(this.getAttribute('remaining') || '1', 10); }
  get category() { return this.getAttribute('category') || ''; }
  get baseColor() { return this.getAttribute('color') || '#888'; }

  _render() {
    const scarceLabel = this.remaining === 1 ? 'Last Edition' :
      this.remaining <= 3 ? `Only ${this.remaining} left` :
        `${this.remaining} / ${this.editions} editions`;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          background: var(--color-placeholder-muted);
          border: 1px solid var(--color-border);
          cursor: pointer;
          container-type: inline-size;
          transition:
            transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
            box-shadow 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
            border-color 0.35s ease;
          will-change: transform;
        }

        :host(:hover) {
          transform: translateY(-6px) scale(1.015);
          box-shadow: var(--shadow-lg), 0 0 40px var(--color-accent-glow);
          border-color: color-mix(in srgb, var(--color-accent) 35%, var(--color-border));
          z-index: 2;
        }

        /* ─── IMAGE CONTAINER ─── */
        .pc-image-wrap {
          position: relative;
          aspect-ratio: 4/3;
          overflow: hidden;
          background: ${this.baseColor}22;
        }

        .pc-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          opacity: 0;
          transition: opacity 0.8s ease;
          -webkit-user-drag: none;
          pointer-events: none;
          user-select: none;
        }

        .pc-image.loaded { opacity: 1; }

        /* Gradient overlay */
        .pc-gradient {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            transparent 40%,
            rgba(0,0,0,0.7) 100%
          );
          pointer-events: none;
        }

        /* ─── LOADING SHIMMER ─── */
        .pc-shimmer {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0.02) 0%,
            rgba(255,255,255,0.06) 50%,
            rgba(255,255,255,0.02) 100%
          );
          background-size: 200% 100%;
          animation: shimmer 1.4s ease-in-out infinite;
        }

        .pc-shimmer.hidden { display: none; }

        @keyframes shimmer {
          0%   { background-position: 200% center; }
          100% { background-position: -200% center; }
        }

        :host-context(html[data-theme="light"]) .pc-shimmer {
          background: linear-gradient(
            90deg,
            #f1f3f4 0%,
            #e8eaed 50%,
            #f1f3f4 100%
          );
        }

        /* ─── CATEGORY BADGE ─── */
        .pc-category {
          position: absolute;
          top: 12px;
          left: 12px;
          padding: 3px 10px;
          border-radius: 999px;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.1);
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 0.65rem;
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.7);
          pointer-events: none;
        }

        /* ─── SCARCITY BADGE ─── */
        .pc-scarcity {
          position: absolute;
          top: 12px;
          right: 12px;
          padding: 3px 10px;
          border-radius: 999px;
          background: var(--color-accent-glow);
          backdrop-filter: blur(8px);
          border: 1px solid color-mix(in srgb, var(--color-accent) 40%, transparent);
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.62rem;
          font-weight: 600;
          color: var(--color-accent);
          pointer-events: none;
        }

        /* ─── INFO SECTION ─── */
        .pc-info {
          padding: 16px 16px 18px;
        }

        .pc-title {
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(0.9rem, 2.5cqi, 1.125rem);
          font-weight: 600;
          color: var(--color-text-primary);
          letter-spacing: -0.01em;
          line-height: 1.3;
          margin-bottom: 4px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .pc-artist {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
          letter-spacing: 0.05em;
          margin-bottom: 14px;
        }

        /* ─── PRICE ROW ─── */
        .pc-price-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 8px;
        }

        .pc-price {
          font-family: 'JetBrains Mono', monospace;
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-accent);
          letter-spacing: -0.02em;
          line-height: 1;
        }

        .pc-price-floor {
          font-family: 'JetBrains Mono', monospace;
          font-size: 0.7rem;
          color: var(--color-text-tertiary);
          text-decoration: line-through;
        }

        /* ─── ACQUIRE BUTTON ─── */
        .pc-acquire {
          padding: 6px 14px;
          border-radius: 6px;
          border: 1px solid color-mix(in srgb, var(--color-accent) 45%, transparent);
          background: color-mix(in srgb, var(--color-accent) 10%, transparent);
          color: var(--color-accent);
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.2s ease, border-color 0.2s ease, transform 0.12s ease;
          outline: none;
        }

        .pc-acquire:hover {
          background: color-mix(in srgb, var(--color-accent) 20%, transparent);
          border-color: var(--color-accent-bright);
          transform: scale(1.04);
        }

        .pc-acquire:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }
      </style>

      <article>
        <div class="pc-image-wrap">
          <span class="pc-shimmer" id="shimmer"></span>
          <img
            id="pc-img"
            class="pc-image"
            alt="${this.itemTitle} by ${this.artist}"
            draggable="false" />
          <div class="pc-gradient" aria-hidden="true"></div>
          <span class="pc-category">${this.category}</span>
          <span class="pc-scarcity">${scarceLabel}</span>
        </div>

        <div class="pc-info">
          <div class="pc-title">${this.itemTitle}</div>
          <div class="pc-artist">${this.artist}</div>
          <div class="pc-price-row">
            <div>
              <div class="pc-price" id="pc-price-display">$${this.price.toLocaleString()}</div>
              <div class="pc-price-floor">Floor $${this.floor.toLocaleString()}</div>
            </div>
            <button class="pc-acquire" id="pc-acquire-btn" aria-label="Acquire ${this.itemTitle} for $${this.price.toLocaleString()}">
              Acquire
            </button>
          </div>
        </div>
      </article>
    `;

    // Wire acquire button
    this.shadowRoot.getElementById('pc-acquire-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dispatchEvent(new CustomEvent('photo-card:acquire', {
        bubbles: true, composed: true,
        detail: {
          itemId: this.itemId,
          title: this.itemTitle,
          artist: this.artist,
          price: this.price,
        },
      }));
    });

    // Disable context menu on the image
    this.shadowRoot.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _startLoad() {
    const itemId = this.itemId;
    if (!itemId) return;

    const img = this.shadowRoot.getElementById('pc-img');
    const shimmer = this.shadowRoot.getElementById('shimmer');

    if (!img) return;

    // Direct image load from unencrypted preview endpoint
    img.addEventListener('load', () => {
      img.classList.add('loaded');
      shimmer?.classList.add('hidden');
      this._loaded = true;
    }, { once: true });

    img.addEventListener('error', () => {
      shimmer?.classList.add('hidden');
      // Show color swatch fallback
      const wrap = this.shadowRoot.querySelector('.pc-image-wrap');
      if (wrap) wrap.style.background = `linear-gradient(135deg, ${this.baseColor}66, ${this.baseColor}22)`;
    }, { once: true });

    img.src = `/api/image-preview/${itemId}`;
  }

  /** Called to update displayed price (auction) */
  updatePrice(newPrice) {
    const el = this.shadowRoot.getElementById('pc-price-display');
    if (el) {
      el.textContent = `$${newPrice.toLocaleString()}`;
    }
  }
}

customElements.define('photo-card', PhotoCard);
