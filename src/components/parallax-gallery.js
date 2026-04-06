/**
 * ChitraVithika — <parallax-gallery> Web Component
 *
 * Creates a 3D parallax exhibition using:
 * - CSS: transform-style: preserve-3d, perspective
 * - JS:  mousemove → pointer delta → Lerp → rotateX/Y applied via RAF
 * - Physics-based Lerp: currentX += (targetX - currentX) * lerpFactor
 *
 * Attributes:
 *   perspective  — CSS perspective value in px (default: 1200)
 *   lerp-factor  — Lerp smooth factor 0..1 (default: 0.08)
 *
 * Usage:
 *   <parallax-gallery perspective="1200" lerp-factor="0.08">
 *     <photo-card ...></photo-card>
 *     ...
 *   </parallax-gallery>
 */

class ParallaxGallery extends HTMLElement {
    static get observedAttributes() {
        return ['perspective', 'lerp-factor'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });

        // Lerp state
        this._targetX = 0;   // deg, target tilt X (pitch)
        this._targetY = 0;   // deg, target tilt Y (yaw)
        this._currentX = 0;   // deg, current smoothed X
        this._currentY = 0;   // deg, current smoothed Y

        // Mouse state relative to gallery center
        this._mouseX = 0;
        this._mouseY = 0;
        this._rafId = null;
        this._active = false;

        // Bound handlers
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseLeave = this._onMouseLeave.bind(this);
        this._onMouseEnter = this._onMouseEnter.bind(this);
    }

    connectedCallback() {
        this._render();
        this._attachEvents();
        this._startRAF();
    }

    disconnectedCallback() {
        cancelAnimationFrame(this._rafId);
        this.removeEventListener('mousemove', this._onMouseMove);
        this.removeEventListener('mouseleave', this._onMouseLeave);
        this.removeEventListener('mouseenter', this._onMouseEnter);
    }

    get perspective() { return parseInt(this.getAttribute('perspective') || '1200', 10); }
    get lerpFactor() { return parseFloat(this.getAttribute('lerp-factor') || '0.08'); }

    _render() {
        this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          /* Perspective applied to host itself */
          perspective: ${this.perspective}px;
          perspective-origin: 50% 40%;
          overflow: visible;
          /* Restrain width to content */
          width: 100%;
        }

        .pg-scene {
          transform-style: preserve-3d;
          will-change: transform;
          /* Grid layout for cards */
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.5rem;
          padding: 0.5rem;
          transition: transform 0.05s linear; /* smoothed by Lerp in RAF */
        }

        /* Each card gets a subtle individual Z offset for depth layers */
        ::slotted(:nth-child(3n+1)) { transform: translateZ(0px);   }
        ::slotted(:nth-child(3n+2)) { transform: translateZ(20px);  }
        ::slotted(:nth-child(3n))   { transform: translateZ(-10px); }

        /* Depth fallback — skeleton lives in slot too */
        ::slotted(.cv-gallery-skeleton) {
          grid-column: 1 / -1;
          transform: none;
        }
      </style>

      <div class="pg-scene" id="pg-scene" role="list"
           aria-label="3D Photography Exhibition Grid">
        <slot></slot>
      </div>
    `;
    }

    _attachEvents() {
        this.addEventListener('mousemove', this._onMouseMove);
        this.addEventListener('mouseleave', this._onMouseLeave);
        this.addEventListener('mouseenter', this._onMouseEnter);
    }

    _onMouseEnter() {
        this._active = true;
    }

    _onMouseLeave() {
        this._active = false;
        // Spring back to zero
        this._targetX = 0;
        this._targetY = 0;
    }

    _onMouseMove(e) {
        const rect = this.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        // Normalised delta: -1..+1
        const ndx = (e.clientX - cx) / (rect.width / 2);
        const ndy = (e.clientY - cy) / (rect.height / 2);

        // Clamp and scale to max tilt angle (±6 degrees — subtle)
        const MAX_DEG = 6;
        this._targetY = ndx * MAX_DEG;  // yaw  (rotate around Y)
        this._targetX = -ndy * MAX_DEG;  // pitch (rotate around X, inverted)
    }

    _startRAF() {
        const scene = () => this.shadowRoot.getElementById('pg-scene');

        const loop = () => {
            const factor = this.lerpFactor;

            // Physics-based Lerp: exponential ease toward target
            this._currentX += (this._targetX - this._currentX) * factor;
            this._currentY += (this._targetY - this._currentY) * factor;

            // Apply transform - clamp to avoid extreme values from floating point drift
            const x = Math.abs(this._currentX) < 0.001 ? 0 : this._currentX;
            const y = Math.abs(this._currentY) < 0.001 ? 0 : this._currentY;

            const el = scene();
            if (el) {
                el.style.transform = `rotateX(${x.toFixed(3)}deg) rotateY(${y.toFixed(3)}deg)`;
            }

            this._rafId = requestAnimationFrame(loop);
        };

        this._rafId = requestAnimationFrame(loop);
    }

    /**
     * Filters visible photo cards by category.
     * Called by app.js when filter chips are clicked.
     * @param {string} category - category slug or 'all'
     */
    filterByCategory(category) {
        const cards = this.querySelectorAll('photo-card');
        cards.forEach(card => {
            const match = !category || category === 'all' || card.getAttribute('category') === category;
            card.style.display = match ? '' : 'none';
            card.setAttribute('aria-hidden', match ? 'false' : 'true');
        });
    }
}

customElements.define('parallax-gallery', ParallaxGallery);
