/**
 * ChitraVithika — About Page
 * Route: /about
 */

export function render() {
    return `
    <div class="cv-about-hero">
      <p class="cv-page-header__eyebrow">Our Philosophy</p>
      <h1 class="cv-page-header__title" style="font-size:var(--text-3xl);">The Gallery of Light & Form</h1>
      <p class="cv-page-header__subtitle" style="max-width:50ch;">
        ChitraVithika is a Sanskrit compound — <em>Chitra</em> (picture, painting) + <em>Vithika</em> (gallery, corridor) — a luminous corridor of images.
      </p>
    </div>

    <div class="cv-about-prose">
      <blockquote>
        "Photography is not about capturing light — it is about investing in a moment's permanence."
      </blockquote>

      <p>
        In a world drowning in disposable imagery, ChitraVithika stands as a sanctuary for photographs 
        that demand contemplation. We are not a stock library. We are not a social feed. We are a 
        <strong>curated marketplace</strong> where every image has been selected for its capacity to 
        arrest time and give light a permanent address.
      </p>

      <h3>The Living Investment</h3>
      <p>
        Every photograph on ChitraVithika is issued as a <strong>limited edition</strong> — scarce by 
        design, valuable by intent. When you acquire a print, you're not downloading a file. You're 
        securing a position in an artist's creative legacy. As editions sell through, remaining copies 
        appreciate. Photography becomes what it has always deserved to be: a living investment.
      </p>

      <h3>The Dutch Auction</h3>
      <p>
        Our auctions operate on the <strong>Dutch descending-price model</strong>. Prices start high 
        and drop at fixed intervals. The first collector to act wins. This creates a thrilling tension 
        between patience and desire — wait too long, and someone else claims the work. Act too early, 
        and you pay a premium. It's game theory meets aesthetic conviction.
      </p>

      <h3>For Artists</h3>
      <p>
        We believe in compensating vision. ChitraVithika photographers retain full copyright and 
        creative control. We provide the technology — encrypted delivery, provable scarcity, and 
        a collector network — so artists can focus on what matters: the work itself.
      </p>

      <h3>Technology Stack</h3>
      <p>
        ChitraVithika is built entirely with native web technologies. Zero frameworks. Zero bundlers. 
        Zero dependencies. Pure <strong>HTML5, CSS3, and vanilla JavaScript (ES2024+)</strong>, running 
        on a bare Node.js server. Web Components with Shadow DOM, Web Workers for off-main-thread 
        processing, IndexedDB for client-side caching, and the Web Crypto API for AES-256-GCM image 
        encryption. Every pixel is intentional.
      </p>

      <blockquote>
        "The best technology is invisible. It serves the art, not the engineer."
      </blockquote>

      <div style="margin-top:var(--space-12);display:flex;gap:var(--space-4);flex-wrap:wrap;">
        <a href="/gallery" class="cv-btn cv-btn--primary cv-btn--large">Explore the Gallery</a>
        <a href="/register" class="cv-btn cv-btn--ghost cv-btn--large">Become a Collector</a>
      </div>
    </div>
  `;
}

export function mount() {
    // Static page — no interactivity needed
}
