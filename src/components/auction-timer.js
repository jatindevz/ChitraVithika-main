class AuctionTimer extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._auction = {
      currentPrice: Number(this.getAttribute('data-start-price') || 0),
      floor: Number(this.getAttribute('data-floor') || 0),
      sold: false,
      nextDropIn: 10000,
      intervalMs: 10000,
    };
    this._source = null;
    this._tickHandle = null;
  }

  connectedCallback() {
    this._render();
    this._connect();
    this._startClock();
  }

  disconnectedCallback() {
    this._stopClock();
    if (this._source) {
      this._source.close();
      this._source = null;
    }
  }

  get itemId() {
    return Number(this.getAttribute('data-item-id') || 0);
  }

  get currentPrice() {
    return this._auction.currentPrice;
  }

  get sold() {
    return !!this._auction.sold;
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-family: var(--font-mono, 'JetBrains Mono', monospace);
          color: var(--color-text-secondary, #c7c2ba);
        }

        .pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(200, 169, 110, 0.28);
          background: rgba(200, 169, 110, 0.08);
          backdrop-filter: blur(10px);
          font-size: 0.75rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #c8a96e;
          box-shadow: 0 0 0 0 rgba(200, 169, 110, 0.55);
          animation: pulse 1.8s infinite;
        }

        .pill.floor {
          border-color: rgba(120, 190, 255, 0.28);
          background: rgba(120, 190, 255, 0.08);
        }

        .pill.sold {
          border-color: rgba(224, 82, 82, 0.32);
          background: rgba(224, 82, 82, 0.12);
        }

        .pill.sold .dot {
          background: #e05252;
          animation: none;
          box-shadow: none;
        }

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(200, 169, 110, 0.55); }
          70% { box-shadow: 0 0 0 10px rgba(200, 169, 110, 0); }
          100% { box-shadow: 0 0 0 0 rgba(200, 169, 110, 0); }
        }
      </style>
      <div class="pill" id="pill">
        <span class="dot" aria-hidden="true"></span>
        <span id="label">Connecting…</span>
      </div>
    `;
    this._paint();
  }

  _connect() {
    if (!this.itemId) return;
    this._source = new EventSource('/api/auction/stream');
    this._source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const next = payload.auctions?.find((auction) => Number(auction.itemId) === this.itemId);
        if (!next) return;
        this._auction = {
          currentPrice: Number(next.currentPrice || 0),
          floor: Number(next.floor || 0),
          sold: !!next.sold,
          nextDropIn: Number(next.nextDropIn || 0),
          intervalMs: Number(next.intervalMs || 10000),
        };
        this._paint();
        this.dispatchEvent(new CustomEvent('auction-timer:update', {
          bubbles: true,
          composed: true,
          detail: { ...this._auction, itemId: this.itemId },
        }));
      } catch (err) {
        console.warn('[auction-timer] SSE parse failed:', err);
      }
    };
    this._source.onerror = () => {
      this._setLabel('Reconnecting…');
    };
  }

  _startClock() {
    this._stopClock();
    this._tickHandle = window.setInterval(() => {
      if (!this._auction.sold && this._auction.nextDropIn > 0) {
        this._auction.nextDropIn = Math.max(0, this._auction.nextDropIn - 1000);
        this._paint();
      }
    }, 1000);
  }

  _stopClock() {
    if (this._tickHandle) {
      window.clearInterval(this._tickHandle);
      this._tickHandle = null;
    }
  }

  _setLabel(text) {
    const label = this.shadowRoot.getElementById('label');
    if (label) label.textContent = text;
  }

  _paint() {
    const pill = this.shadowRoot.getElementById('pill');
    if (!pill) return;

    pill.classList.remove('floor', 'sold');

    if (this._auction.sold) {
      pill.classList.add('sold');
      this._setLabel('Temporarily claimed');
      return;
    }

    if (this._auction.currentPrice <= this._auction.floor || this._auction.nextDropIn === 0) {
      pill.classList.add('floor');
      this._setLabel('Floor price reached');
      return;
    }

    const seconds = Math.max(1, Math.ceil(this._auction.nextDropIn / 1000));
    this._setLabel(`Next drop in ${seconds}s`);
  }
}

customElements.define('auction-timer', AuctionTimer);
