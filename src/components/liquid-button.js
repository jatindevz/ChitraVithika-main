/**
 * ChitraVithika — <liquid-button> Web Component
 *
 * A Shadow DOM button with:
 * - Inline SVG filter pipeline: feTurbulence → feDisplacementMap → feGaussianBlur → feColorMatrix
 * - CSS liquid morphing animation
 * - Pointer-event ripple effect
 * - Variants: 'primary' | 'accent' | 'ghost'
 * - Sizes: 'default' | 'large' | 'small'
 *
 * Usage:
 *   <liquid-button variant="accent" size="large">Purchase</liquid-button>
 */

class LiquidButton extends HTMLElement {
  static get observedAttributes() {
    return ['variant', 'size', 'disabled', 'type'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._ripples = [];
    this._animFrame = null;
  }

  connectedCallback() {
    this._render();
    this._attachEvents();
  }

  disconnectedCallback() {
    cancelAnimationFrame(this._animFrame);
  }

  attributeChangedCallback() {
    if (this.shadowRoot.innerHTML !== '') this._render();
  }

  get variant() { return this.getAttribute('variant') || 'primary'; }
  get size() { return this.getAttribute('size') || 'default'; }
  get disabled() { return this.hasAttribute('disabled'); }
  get btnType() { return this.getAttribute('type') || 'button'; }

  _render() {
    const variant = this.variant;
    const size = this.size;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          --lb-color-bg:     ${this._variantBg(variant)};
          --lb-color-text:   ${this._variantText(variant)};
          --lb-color-border: ${this._variantBorder(variant)};
          --lb-color-glow:   ${this._variantGlow(variant)};
          --lb-pad-x: ${size === 'large' ? '2rem' : size === 'small' ? '0.875rem' : '1.25rem'};
          --lb-pad-y: ${size === 'large' ? '0.875rem' : size === 'small' ? '0.4rem' : '0.6rem'};
          --lb-font-size: ${size === 'large' ? '0.9375rem' : size === 'small' ? '0.75rem' : '0.8125rem'};
        }

        :host([disabled]) { opacity: 0.4; pointer-events: none; }
        :host([hidden]) { display: none !important; }

        /* ─── SVG FILTER (hidden, defines the liquid effect) ─── */
        .lb-filters { position: absolute; width: 0; height: 0; overflow: hidden; }

        /* ─── BUTTON SHELL ─── */
        button {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5em;
          padding: var(--lb-pad-y) var(--lb-pad-x);
          font-family: 'Inter', system-ui, sans-serif;
          font-size: var(--lb-font-size);
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--lb-color-text);
          background: var(--lb-color-bg);
          border: 1px solid var(--lb-color-border);
          border-radius: 6px;
          cursor: pointer;
          overflow: hidden;
          outline: none;
          white-space: nowrap;
          transition:
            background 0.25s ease,
            border-color 0.25s ease,
            box-shadow 0.25s ease,
            transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1);
          -webkit-font-smoothing: antialiased;
          isolation: isolate;
          /* Apply the liquid SVG filter */
          filter: url(#lb-liquid-filter);
        }

        button:hover {
          background: ${this._variantHoverBg(variant)};
          border-color: ${this._variantHoverBorder(variant)};
          box-shadow: 0 0 32px var(--lb-color-glow);
          transform: translateY(-1px);
        }

        button:active {
          transform: translateY(0) scale(0.97);
          box-shadow: none;
        }

        button:focus-visible {
          outline: 2px solid var(--lb-color-border);
          outline-offset: 3px;
        }

        /* ─── LIQUID BLOB UNDERLAY ─── */
        .lb-blob {
          position: absolute;
          inset: -20%;
          border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
          background: ${this._variantGlow(variant)};
          opacity: 0;
          transform: scale(0.4);
          pointer-events: none;
          transition:
            opacity 0.5s ease,
            transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          animation: liquid-morph 8s ease-in-out infinite;
        }

        button:hover .lb-blob {
          opacity: 0.35;
          transform: scale(1);
        }

        @keyframes liquid-morph {
          0%   { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; }
          25%  { border-radius: 60% 40% 30% 70% / 50% 60% 40% 50%; }
          50%  { border-radius: 70% 30% 50% 50% / 30% 30% 70% 70%; }
          75%  { border-radius: 30% 70% 20% 80% / 70% 50% 50% 30%; }
          100% { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; }
        }

        /* ─── RIPPLE ─── */
        .lb-ripple {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.25);
          transform: scale(0);
          pointer-events: none;
          animation: lb-ripple-anim 0.65s ease-out forwards;
        }

        @keyframes lb-ripple-anim {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }

        /* ─── SLOT ─── */
        slot {
          position: relative;
          z-index: 1;
          pointer-events: none;
        }
      </style>

      <!--
        The SVG filter element must live in the Shadow DOM.
        feGaussianBlur + feColorMatrix creates the "gooey" liquid merge effect.
      -->
      <svg class="lb-filters" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <filter id="lb-liquid-filter" x="-20%" y="-20%" width="140%" height="140%"
                  color-interpolation-filters="sRGB">
            <!-- Step 1: Subtle displacement (warp the button edges) -->
            <feTurbulence
              id="lb-turbulence"
              type="fractalNoise"
              baseFrequency="0.012 0.018"
              numOctaves="3"
              seed="42"
              result="noise">
              <animate
                attributeName="baseFrequency"
                values="0.012 0.018; 0.018 0.012; 0.012 0.018"
                dur="8s"
                repeatCount="indefinite" />
            </feTurbulence>

            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="4"
              xChannelSelector="R"
              yChannelSelector="G"
              result="displaced" />

            <!-- Step 2: Slight blur to soften edges -->
            <feGaussianBlur
              in="displaced"
              stdDeviation="0.8"
              result="blurred" />

            <!-- Step 3: Contrast boost — recreates the liquid merge look -->
            <feColorMatrix
              in="blurred"
              type="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 18 -7"
              result="liquid" />

            <!-- Composite back with original for color fidelity -->
            <feComposite in="SourceGraphic" in2="liquid" operator="atop" />
          </filter>
        </defs>
      </svg>

      <button
        type="${this.btnType}"
        aria-label="${this.getAttribute('aria-label') || ''}"
        ${this.disabled ? 'disabled' : ''}
        part="button">

        <div class="lb-blob" aria-hidden="true"></div>
        <slot></slot>

      </button>
    `;
  }

  _attachEvents() {
    const btn = this.shadowRoot.querySelector('button');
    if (!btn) return;

    btn.addEventListener('pointerdown', (e) => {
      if (this.disabled) return;
      this._spawnRipple(e, btn);
    });

    // Forward click from shadow button to host element so outer handlers work.
    // CRITICAL: Use a re-entry guard to prevent infinite recursion.
    // Without this, the dispatched click re-enters the shadow DOM button handler.
    btn.addEventListener('click', (e) => {
      if (this._dispatching || this.disabled) return;
      e.stopPropagation();
      this._dispatching = true;
      this.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, cancelable: true }));
      this._dispatching = false;
    });
  }

  _spawnRipple(event, btn) {
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.className = 'lb-ripple';
    ripple.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
    `;

    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  }

  // ─── VARIANT HELPERS ──────────────────────────────────────
  _variantBg(v) {
    return {
      primary: 'rgba(200, 169, 110, 0.12)',
      accent: 'rgba(200, 169, 110, 0.95)',
      ghost: 'transparent',
    }[v] || 'transparent';
  }

  _variantText(v) {
    return {
      primary: '#c8a96e',
      accent: '#0a0a0a',
      ghost: '#8a8580',
    }[v] || '#f0ede8';
  }

  _variantBorder(v) {
    return {
      primary: 'rgba(200, 169, 110, 0.35)',
      accent: '#c8a96e',
      ghost: 'rgba(255,255,255,0.1)',
    }[v] || 'rgba(255,255,255,0.1)';
  }

  _variantGlow(v) {
    return {
      primary: 'rgba(200, 169, 110, 0.25)',
      accent: 'rgba(200, 169, 110, 0.35)',
      ghost: 'rgba(200, 169, 110, 0.1)',
    }[v] || 'rgba(200, 169, 110, 0.15)';
  }

  _variantHoverBg(v) {
    return {
      primary: 'rgba(200, 169, 110, 0.2)',
      accent: '#e2c68d',
      ghost: 'rgba(200, 169, 110, 0.06)',
    }[v] || 'rgba(200, 169, 110, 0.1)';
  }

  _variantHoverBorder(v) {
    return {
      primary: 'rgba(200, 169, 110, 0.6)',
      accent: '#e2c68d',
      ghost: 'rgba(200, 169, 110, 0.25)',
    }[v] || 'rgba(200, 169, 110, 0.3)';
  }
}

customElements.define('liquid-button', LiquidButton);
