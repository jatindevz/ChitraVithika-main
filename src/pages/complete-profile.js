/**
 * ChitraVithika — Complete Profile / Artist Upgrade
 * Route: /complete-profile
 */
import { isLoggedIn, currentUser, updateCurrentProfile, needsProfileCompletion, canAccessArtistTools, getDefaultRouteForUser } from '../js/state.js';
import { navigate } from '../js/router.js';

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function wantsArtistUpgrade(user) {
    const params = new URLSearchParams(window.location.search);
    return params.get('intent') === 'artist' || user?.role === 'photographer';
}

function getSafeUser() {
    const user = currentUser();
    if (!user) return null;
    return {
        id: user.id || null,
        name: user.name || '',
        role: user.role || 'buyer',
        phone: user.phone || '',
        location: user.location || '',
        bio: user.bio || '',
        artistStatement: user.artistStatement || '',
        website: user.website || '',
        instagram: user.instagram || '',
        authProvider: user.authProvider || 'email',
        profileCompleted: Boolean(user.profileCompleted),
        artistProfileCompleted: Boolean(user.artistProfileCompleted),
    };
}

export function render() {
    if (!isLoggedIn()) {
        return `<div class="cv-page-message"><p class="cv-page-message__text">Redirecting to login…</p></div>`;
    }

    const user = getSafeUser();
    if (!user) {
        return `<div class="cv-page-message"><p class="cv-page-message__text">Redirecting to loginâ€¦</p></div>`;
    }
    const artistIntent = wantsArtistUpgrade(user);
    const googleNeedsCompletion = needsProfileCompletion(user);

    return `
    <div class="cv-page-container" style="max-width:880px;">
      <div class="cv-page-header">
        <p class="cv-page-header__eyebrow">${artistIntent ? 'Artist Onboarding' : 'Profile Details'}</p>
        <h1 class="cv-page-header__title">${artistIntent ? 'Complete Your Artist Profile' : 'Complete Your Account Details'}</h1>
        <p class="cv-page-header__subtitle">
          ${artistIntent
            ? 'Fill in the required details below to unlock artist tools and start listing your work.'
            : 'Google sign-in creates your collector account quickly. Add the missing details here so your account is fully set up.'}
        </p>
      </div>

      <div class="cv-dash-section" style="margin-bottom:var(--space-8);">
        <div style="display:flex;flex-wrap:wrap;gap:var(--space-3);margin-bottom:var(--space-4);">
          <span class="cv-badge ${user.role === 'photographer' ? 'cv-badge--live' : ''}">
            ${user.role === 'photographer' ? 'Artist account' : 'Collector account'}
          </span>
          <span class="cv-badge" style="${googleNeedsCompletion ? 'background:rgba(200,169,110,0.2);color:var(--color-accent);' : 'background:rgba(92,184,92,0.18);color:#7cd67c;'}">
            ${googleNeedsCompletion ? 'Profile details still needed' : 'Base profile complete'}
          </span>
          <span class="cv-badge" style="${canAccessArtistTools(user) ? 'background:rgba(92,184,92,0.18);color:#7cd67c;' : 'background:rgba(255,255,255,0.08);color:var(--color-text-secondary);'}">
            ${canAccessArtistTools(user) ? 'Artist tools unlocked' : 'Artist tools locked'}
          </span>
        </div>
        <p style="color:var(--color-text-tertiary);font-size:var(--text-sm);margin:0;">
          Google users start as collectors by default. To become an artist, complete every required field in the artist section below.
        </p>
      </div>

      <div class="cv-dash-section">
        <form id="cv-complete-profile-form" class="cv-form" novalidate>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:var(--space-5);">
            <div class="cv-form-group">
              <label for="profile-name" class="cv-form-label">Full Name</label>
              <input id="profile-name" name="name" class="cv-form-input" value="${escapeHtml(user.name)}" required />
            </div>
            <div class="cv-form-group">
              <label for="profile-phone" class="cv-form-label">Phone Number</label>
              <input id="profile-phone" name="phone" class="cv-form-input" value="${escapeHtml(user.phone)}" placeholder="+91 98765 43210" required />
            </div>
            <div class="cv-form-group" style="grid-column:1 / -1;">
              <label for="profile-location" class="cv-form-label">Location</label>
              <input id="profile-location" name="location" class="cv-form-input" value="${escapeHtml(user.location)}" placeholder="City, State, Country" required />
            </div>
          </div>

          <label style="display:flex;align-items:flex-start;gap:12px;margin:var(--space-7) 0 var(--space-5);padding:var(--space-4);border:1px solid var(--color-border);border-radius:var(--radius-lg);background:var(--color-surface-raised);cursor:pointer;">
            <input type="checkbox" id="profile-upgrade-artist" ${artistIntent ? 'checked' : ''} style="margin-top:4px;" />
            <span>
              <strong style="display:block;color:var(--color-text-primary);margin-bottom:4px;">I want to become an artist</strong>
              <span style="color:var(--color-text-tertiary);font-size:var(--text-sm);">This unlocks <code>/submit</code>, your photographer dashboard, and seller tools once all artist fields are completed.</span>
            </span>
          </label>

          <div id="artist-fields" style="display:${artistIntent ? 'block' : 'none'};">
            <div class="cv-form-group">
              <label for="profile-bio" class="cv-form-label">Artist Bio</label>
              <textarea id="profile-bio" name="bio" class="cv-form-textarea" rows="4" placeholder="Tell collectors about your work, medium, and perspective.">${escapeHtml(user.bio)}</textarea>
            </div>
            <div class="cv-form-group">
              <label for="profile-statement" class="cv-form-label">Artist Statement</label>
              <textarea id="profile-statement" name="artistStatement" class="cv-form-textarea" rows="5" placeholder="Describe what drives your photography and the kinds of stories you create.">${escapeHtml(user.artistStatement)}</textarea>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:var(--space-5);">
              <div class="cv-form-group">
                <label for="profile-website" class="cv-form-label">Website</label>
                <input id="profile-website" name="website" class="cv-form-input" value="${escapeHtml(user.website)}" placeholder="https://yourportfolio.com" />
              </div>
              <div class="cv-form-group">
                <label for="profile-instagram" class="cv-form-label">Instagram</label>
                <input id="profile-instagram" name="instagram" class="cv-form-input" value="${escapeHtml(user.instagram)}" placeholder="@yourhandle" />
              </div>
            </div>
          </div>

          <div id="profile-error" class="cv-form-error" role="alert"></div>
          <div id="profile-success" style="font-size:var(--text-sm);color:#7cd67c;min-height:1.4em;margin-top:var(--space-2);"></div>

          <div style="display:flex;flex-wrap:wrap;gap:var(--space-3);margin-top:var(--space-6);">
            <button type="submit" id="profile-submit" class="cv-btn cv-btn--primary cv-btn--large">
              ${artistIntent ? 'Save and Unlock Artist Tools' : 'Save Profile'}
            </button>
            <a href="${escapeHtml(getDefaultRouteForUser(user) || '/dashboard/buyer')}" class="cv-btn cv-btn--ghost cv-btn--large">Back to Dashboard</a>
          </div>
        </form>
      </div>
    </div>
  `;
}

export function mount() {
    if (!isLoggedIn()) {
        setTimeout(() => navigate('/login', { replace: true }), 50);
        return;
    }

    const form = document.getElementById('cv-complete-profile-form');
    const artistCheckbox = document.getElementById('profile-upgrade-artist');
    const artistFields = document.getElementById('artist-fields');
    const submitBtn = document.getElementById('profile-submit');
    const errorEl = document.getElementById('profile-error');
    const successEl = document.getElementById('profile-success');

    const syncArtistFields = () => {
        const wantsArtist = artistCheckbox?.checked;
        if (artistFields) artistFields.style.display = wantsArtist ? 'block' : 'none';
        if (submitBtn) submitBtn.textContent = wantsArtist ? 'Save and Unlock Artist Tools' : 'Save Profile';
    };

    artistCheckbox?.addEventListener('change', syncArtistFields);
    syncArtistFields();

    form?.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (errorEl) errorEl.textContent = '';
        if (successEl) successEl.textContent = '';
        if (!form) return;

        const wantsArtist = Boolean(artistCheckbox?.checked);
        const formData = new FormData(form);
        const payload = {
            name: String(formData.get('name') || '').trim(),
            phone: String(formData.get('phone') || '').trim(),
            location: String(formData.get('location') || '').trim(),
            bio: String(formData.get('bio') || '').trim(),
            artistStatement: String(formData.get('artistStatement') || '').trim(),
            website: String(formData.get('website') || '').trim(),
            instagram: String(formData.get('instagram') || '').trim(),
            upgradeToArtist: wantsArtist,
        };

        submitBtn.disabled = true;
        submitBtn.textContent = wantsArtist ? 'Unlocking…' : 'Saving…';

        try {
            const updatedUser = await updateCurrentProfile(payload);
            if (successEl) {
                successEl.textContent = wantsArtist && updatedUser.role === 'photographer'
                    ? 'Artist profile completed. Seller tools are now unlocked.'
                    : 'Profile updated successfully.';
            }
            setTimeout(() => navigate(getDefaultRouteForUser(updatedUser), { replace: true }), 350);
        } catch (error) {
            if (errorEl) errorEl.textContent = error.message || 'Unable to update profile';
            submitBtn.disabled = false;
            syncArtistFields();
        }
    });
}
