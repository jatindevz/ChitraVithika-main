/**
 * ChitraVithika — Licensing Page
 * Route: /legal/licensing
 */

export function render() {
    return `
    <div class="cv-page-container" style="max-width:900px;">
      <div class="cv-page-header">
        <p class="cv-page-header__eyebrow">Legal</p>
        <h1 class="cv-page-header__title">Licensing</h1>
        <p class="cv-page-header__subtitle">
          Every photograph on ChitraVithika comes with a specified usage license. 
          Choose the tier that matches your intended use.
        </p>
      </div>

      <div class="cv-license-grid" style="margin-bottom:var(--space-12);">
        <div class="cv-license-card">
          <div class="cv-license-card__name">Personal</div>
          <div class="cv-license-card__price">1×</div>
          <div class="cv-license-card__features">
            <div class="cv-license-card__feature">Personal display & enjoyment</div>
            <div class="cv-license-card__feature">Digital viewing on your devices</div>
            <div class="cv-license-card__feature">Non-commercial use only</div>
            <div class="cv-license-card__feature">Single location display</div>
            <div class="cv-license-card__feature">No reproduction rights</div>
          </div>
        </div>

        <div class="cv-license-card" style="border-color:var(--color-accent-dim);">
          <div style="font-size:var(--text-xs);color:var(--color-accent);letter-spacing:0.15em;text-transform:uppercase;margin-bottom:var(--space-2);">Most Popular</div>
          <div class="cv-license-card__name">Editorial</div>
          <div class="cv-license-card__price">1.8×</div>
          <div class="cv-license-card__features">
            <div class="cv-license-card__feature">All Personal rights included</div>
            <div class="cv-license-card__feature">Publication in editorial content</div>
            <div class="cv-license-card__feature">Magazine, blog, news contexts</div>
            <div class="cv-license-card__feature">Educational use permitted</div>
            <div class="cv-license-card__feature">Attribution required</div>
          </div>
        </div>

        <div class="cv-license-card">
          <div class="cv-license-card__name">Commercial</div>
          <div class="cv-license-card__price">3.5×</div>
          <div class="cv-license-card__features">
            <div class="cv-license-card__feature">All Editorial rights included</div>
            <div class="cv-license-card__feature">Commercial use permitted</div>
            <div class="cv-license-card__feature">Advertising & branding</div>
            <div class="cv-license-card__feature">Product packaging</div>
            <div class="cv-license-card__feature">Unlimited distribution</div>
          </div>
        </div>
      </div>

      <div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:var(--space-8);">
        <h2 style="font-family:var(--font-display);font-size:var(--text-lg);font-weight:600;color:var(--color-text-primary);margin-bottom:var(--space-6);">Terms & Conditions</h2>

        <div style="font-size:var(--text-sm);color:var(--color-text-secondary);line-height:1.9;">
          <h3 style="font-size:var(--text-base);color:var(--color-text-primary);margin-top:var(--space-6);margin-bottom:var(--space-2);">1. Ownership</h3>
          <p>Copyright of all photographs remains with the original artist. Purchasing a license grants 
          you usage rights as specified by the license tier, not ownership of the underlying work.</p>

          <h3 style="font-size:var(--text-base);color:var(--color-text-primary);margin-top:var(--space-6);margin-bottom:var(--space-2);">2. Limited Editions</h3>
          <p>Each photograph is issued as a limited edition. The total number of editions is set by the 
          artist and cannot be increased after listing. Changes to remaining edition counts are permanent.</p>

          <h3 style="font-size:var(--text-base);color:var(--color-text-primary);margin-top:var(--space-6);margin-bottom:var(--space-2);">3. Delivery</h3>
          <p>Purchased images are delivered via AES-256-GCM encrypted download. Downloads are available 
          immediately after purchase and remain accessible through your dashboard.</p>

          <h3 style="font-size:var(--text-base);color:var(--color-text-primary);margin-top:var(--space-6);margin-bottom:var(--space-2);">4. Prohibited Use</h3>
          <p>You may not resell, sublicense, or redistribute the image itself. You may not use the image 
          in a manner that infringes on the artist's moral rights or reputation.</p>

          <h3 style="font-size:var(--text-base);color:var(--color-text-primary);margin-top:var(--space-6);margin-bottom:var(--space-2);">5. Auctions</h3>
          <p>Dutch auction prices are final. Silent auction bids are binding. Winning a bid constitutes 
          agreement to purchase at the winning price.</p>
        </div>
      </div>

      <div style="text-align:center;margin-top:var(--space-8);">
        <a href="/gallery" class="cv-btn cv-btn--primary cv-btn--large">Browse Gallery</a>
      </div>
    </div>
  `;
}

export function mount() {
    // Static legal page
}
