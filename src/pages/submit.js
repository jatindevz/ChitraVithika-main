/**
 * ChitraVithika — Submit / List Work Page
 * Route: /submit
 *
 * Premium product listing page. User:
 *  1) Drops/selects a photograph (staged, not auto-uploaded)
 *  2) Fills in title, description, category, editions, price, tags
 *  3) Clicks "List for Sale" to submit
 *
 * Submitted work is stored under the user's portfolio in state.
 */
import { isLoggedIn, currentUser, canAccessArtistTools, getState, getCatalog, setCatalog, refreshCatalogFromApi } from '../js/state.js';
import { navigate } from '../js/router.js';
import { applyTheme, resetTheme } from '../js/themes.js';

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function render() {
  const user = currentUser();
  const canSubmit = canAccessArtistTools(user);

  return `
    <div class="cv-submit-page">
      ${!isLoggedIn() ? `
        <div class="cv-submit-auth-gate">
          <div class="cv-submit-auth-gate__icon">🔐</div>
          <h2 class="cv-submit-auth-gate__title">Sign In to List Your Work</h2>
          <p class="cv-submit-auth-gate__text">Join ChitraVithika's curated marketplace to reach collectors worldwide.</p>
          <div class="cv-submit-auth-gate__actions">
            <a href="/login" class="cv-btn cv-btn--primary">Sign In</a>
            <a href="/register" class="cv-btn cv-btn--ghost">Create Account</a>
          </div>
        </div>
      ` : !canSubmit ? `
        <div class="cv-submit-auth-gate">
          <div class="cv-submit-auth-gate__icon">📋</div>
          <h2 class="cv-submit-auth-gate__title">Complete Your Artist Profile</h2>
          <p class="cv-submit-auth-gate__text">Only artist accounts can list work. Finish your artist details first and we’ll unlock the submit flow.</p>
          <div class="cv-submit-auth-gate__actions">
            <a href="/complete-profile?intent=artist" class="cv-btn cv-btn--primary">Become an Artist</a>
            <a href="/dashboard/buyer" class="cv-btn cv-btn--ghost">Go to Dashboard</a>
          </div>
        </div>
      ` : `
        <div class="cv-submit-layout" id="submit-layout">

          <!-- LEFT: Image Upload -->
          <div class="cv-submit-image-panel">
            <div class="cv-submit-image-panel__header">
              <p class="cv-page-header__eyebrow">List Your Work</p>
              <h1 class="cv-submit-image-panel__title">Create a Listing</h1>
              <p class="cv-submit-image-panel__sub">Showcase your photograph to a global audience of collectors.</p>
            </div>
            <upload-zone
              id="submit-upload"
              accept=".jpg,.jpeg,.png,.webp"
              max-size-mb="50">
            </upload-zone>
          </div>

          <!-- RIGHT: Details Form -->
          <div class="cv-submit-details-panel">
            <form id="submit-form" class="cv-submit-form" novalidate>
              <div class="cv-submit-form__section">
                <h3 class="cv-submit-form__section-title">Details</h3>

                <div class="cv-form-group">
                  <label for="submit-title" class="cv-form-label">Title <span class="cv-required">*</span></label>
                  <input type="text" id="submit-title" name="title" class="cv-form-input"
                         placeholder="e.g. Veiled Dusk Over the Moors" required />
                </div>

                <div class="cv-form-group">
                  <label for="submit-desc" class="cv-form-label">Description</label>
                  <textarea id="submit-desc" name="description" class="cv-form-textarea"
                            placeholder="Describe your photograph — mood, technique, story behind the shot..."
                            rows="3"></textarea>
                </div>

                <div class="cv-form-row">
                  <div class="cv-form-group">
                    <label for="submit-category" class="cv-form-label">Category</label>
                    <select id="submit-category" name="category" class="cv-form-select">
                      <option value="landscape">Landscape</option>
                      <option value="street">Street</option>
                      <option value="portrait">Portrait</option>
                      <option value="abstract">Abstract</option>
                      <option value="macro">Macro</option>
                      <option value="wildlife">Wildlife</option>
                      <option value="aquatic">Aquatic</option>
                      <option value="birds">Birds</option>
                      <option value="documentary">Documentary</option>
                    </select>
                  </div>
                  <div class="cv-form-group">
                    <label for="submit-editions" class="cv-form-label">Editions</label>
                    <input type="number" id="submit-editions" name="editions" class="cv-form-input"
                           value="5" min="1" max="100" />
                  </div>
                </div>
              </div>

              <div class="cv-submit-form__section">
                <h3 class="cv-submit-form__section-title">Pricing</h3>

                <div class="cv-form-group" style="margin-bottom:var(--space-4);">
                  <label for="submit-auction-type" class="cv-form-label">Auction format</label>
                  <select id="submit-auction-type" name="auction_type" class="cv-form-select">
                    <option value="dutch">Open (Dutch) — price drops over time; buy at current price</option>
                    <option value="silent">Sealed — collectors submit hidden bids; you choose a winner</option>
                  </select>
                  <p class="cv-form-hint">Sealed auctions let you grant, decline, or end the listing from your photographer dashboard.</p>
                </div>

                <div class="cv-form-row">
                  <div class="cv-form-group">
                    <label for="submit-price" class="cv-form-label">List Price</label>
                    <div class="cv-masked-input">
                      <span class="cv-masked-input__prefix">$</span>
                      <input type="number" id="submit-price" name="price" class="cv-form-input"
                             value="1500" min="100" step="50" />
                    </div>
                  </div>
                  <div class="cv-form-group">
                    <label for="submit-floor" class="cv-form-label">Auction Floor</label>
                    <div class="cv-masked-input">
                      <span class="cv-masked-input__prefix">$</span>
                      <input type="number" id="submit-floor" name="floor" class="cv-form-input"
                             value="500" min="50" step="50" />
                    </div>
                  </div>
                </div>
              </div>

              <div class="cv-submit-form__section">
                <h3 class="cv-submit-form__section-title">Discovery</h3>
                <div class="cv-form-group">
                  <label for="submit-tags" class="cv-form-label">Tags</label>
                  <input type="text" id="submit-tags" name="tags" class="cv-form-input"
                         placeholder="fog, golden hour, moor, landscape" />
                  <p class="cv-form-hint">Comma-separated. Helps collectors discover your work via search.</p>
                </div>
              </div>

              <div id="submit-error" class="cv-form-error" role="alert"></div>

              <button type="submit" class="cv-btn cv-btn--primary cv-btn--full cv-btn--large" id="submit-btn" disabled>
                <span class="cv-btn__icon">*</span>
                List for Sale
              </button>

              <p class="cv-submit-disclaimer">
                By listing, you confirm this is your original work and agree to our
                <a href="/legal/licensing">licensing terms</a>.
              </p>
            </form>
          </div>
        </div>

        <div id="submit-success" class="cv-submit-success-container" role="alert"></div>
      `}
    </div>
  `;
}

export function mount() {
  const user = currentUser();
  if (isLoggedIn() && !canAccessArtistTools(user)) return;

  const form = document.getElementById('submit-form');
  const errorEl = document.getElementById('submit-error');
  const submitBtn = document.getElementById('submit-btn');
  const uploadZone = document.getElementById('submit-upload');

  if (!form || !submitBtn || !uploadZone) return;

  // Live theme preview on category change
  const categorySelect = document.getElementById('submit-category');
  categorySelect?.addEventListener('change', () => {
    applyTheme(categorySelect.value);
  });
  // Apply initial theme
  if (categorySelect) applyTheme(categorySelect.value);

  // Enable submit button only when a file is staged
  uploadZone.addEventListener('upload-zone:file-selected', () => {
    submitBtn.disabled = false;
  });

  uploadZone.addEventListener('upload-zone:file-removed', () => {
    submitBtn.disabled = true;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isLoggedIn()) { navigate('/login'); return; }

    // Validate
    const title = form.elements['title'].value.trim();
    if (!title) {
      errorEl.textContent = 'Title is required.';
      return;
    }

    if (!uploadZone.hasFiles()) {
      errorEl.textContent = 'Please upload a photograph.';
      return;
    }

    errorEl.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Listing...';

    const description = form.elements['description'].value.trim();
    const category = form.elements['category'].value;
    const editions = parseInt(form.elements['editions'].value) || 5;
    const price = parseFloat(form.elements['price'].value) || 1500;
    const floor = parseFloat(form.elements['floor'].value) || 500;
    const tags = form.elements['tags'].value.split(',').map(t => t.trim()).filter(Boolean);

    // Upload file + all metadata to /api/upload - backend writes to DB
    try {
      const files = uploadZone.getFiles();
      const formData = new FormData();
      formData.append('file', files[0], files[0].name);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('editions', String(editions));
      formData.append('price', String(price));
      formData.append('floor', String(floor));
      formData.append('tags', tags.join(','));
      const auctionType = form.elements['auction_type']?.value || 'dutch';
      formData.append('auction_type', auctionType);

      const token = getState('auth.token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData, headers });
      if (!uploadRes.ok) throw new Error('Upload failed: ' + uploadRes.status);
      const uploadResult = await uploadRes.json();

      const uploadedItem = uploadResult.uploaded?.[0];
      const photoId = uploadedItem?.id;
      const displayTitle = title || uploadedItem?.filename || 'Your photograph';

      // Refresh catalog cache so the new listing appears immediately across the SPA.
      try {
        const freshCatalog = await refreshCatalogFromApi({
          expectedItemId: photoId,
          retries: 6,
          retryDelayMs: 350,
        });

        if (photoId && !freshCatalog.some((item) => Number(item.id) === Number(photoId))) {
          throw new Error('Uploaded item not visible in catalog yet');
        }
      } catch (e) {
        console.warn('[submit] Catalog refresh lagged, applying optimistic listing:', e);
        if (photoId) {
          const existingCatalog = getCatalog();
          const alreadyPresent = existingCatalog.some((item) => Number(item.id) === Number(photoId));

          if (!alreadyPresent) {
            setCatalog([{
              id: photoId,
              title: displayTitle,
              description,
              artist: uploadedItem?.artist || 'Unknown',
              artistId: uploadedItem?.artistId || null,
              category,
              tags,
              price,
              auctionFloor: floor,
              editions,
              remaining: editions,
              width: null,
              height: null,
              color: '#888888',
              filename: uploadedItem?.savedAs || uploadedItem?.filename || null,
              saved_as: uploadedItem?.savedAs || null,
              gridfs_id: uploadedItem?.gridfsId || null,
              fileSize: uploadedItem?.size || null,
              mimeType: files?.[0]?.type || 'image/jpeg',
              exif: uploadedItem?.exif || { camera: null, lens: null, iso: null, aperture: null, shutter: null },
              createdAt: new Date().toISOString(),
            }, ...existingCatalog]);
          }
        }
      }

      // Success: completely replace page content with just the success card

      // Hide the entire layout (upload zone + form)
      const layoutEl = document.getElementById('submit-layout');
      if (layoutEl) layoutEl.remove();

      // Show success card
      const successEl = document.getElementById('submit-success');
      if (successEl) {
        successEl.innerHTML = '<div class="cv-submit-success">' +
          (photoId ? '<div class="cv-submit-success__thumb"><img src="/api/image-preview/' + photoId + '" alt="' + escapeHtml(displayTitle) + '" /></div>' : '') +
          '<div class="cv-submit-success__icon" aria-hidden="true">&#127881;</div>' +
          '<h2 class="cv-submit-success__title">Listed successfully</h2>' +
          '<p class="cv-submit-success__text"><strong>' + escapeHtml(displayTitle) + '</strong> is live. Collectors can discover and acquire it.</p>' +
          '<div class="cv-submit-success__actions">' +
          '<a href="/gallery/' + (photoId || '') + '" class="cv-btn cv-btn--primary">View listing</a>' +
          '<a href="/my-work" class="cv-btn cv-btn--ghost">My portfolio</a>' +
          '<a href="/submit" class="cv-btn cv-btn--ghost">List another</a>' +
          '</div>' +
          '</div>';
      }

      // Add class for styling
      const pageEl = document.querySelector('.cv-submit-page');
      if (pageEl) pageEl.classList.add('cv-submit-page--listed');

      window.scrollTo({ top: 0, behavior: 'instant' });
    } catch (err) {
      console.error('[submit] Failed:', err);
      errorEl.textContent = 'Listing failed: ' + err.message;
      submitBtn.disabled = false;
      submitBtn.textContent = 'List for Sale';
    }
  });

  const onThemeChange = () => applyTheme(categorySelect.value);
  document.addEventListener('cv-theme-change', onThemeChange);

  // Cleanup: reset theme on page exit
  return () => {
    document.removeEventListener('cv-theme-change', onThemeChange);
    resetTheme();
  };
}
