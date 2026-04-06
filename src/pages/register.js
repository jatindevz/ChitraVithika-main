/**
 * ChitraVithika — Register Page
 * Route: /register
 */
import { register, loginWithGoogle, isLoggedIn, getDefaultRouteForUser } from '../js/state.js';
import { navigate } from '../js/router.js';
import { getNextPathAfterAuth } from '../js/auth-routes.js';

const BG_COLORS = ['#4A148C', '#E040FB', '#0D47A1', '#F9A825', '#00BCD4', '#1B5E20'];

function buildAuthBackgroundSlides() {
    return BG_COLORS.map((color, i) =>
        `<div class="cv-auth-bg__slide ${i === 0 ? 'active' : ''}"
      style="background:linear-gradient(135deg,${color} 0%, var(--color-gradient-end) 100%);"
      data-slide="${i}"></div>`
    ).join('');
}

export function render() {
    if (isLoggedIn()) {
        return `<div class="cv-page-message"><p class="cv-page-message__text">Redirecting…</p></div>`;
    }

    const slides = buildAuthBackgroundSlides();

    return `
    <div class="cv-auth-bg" id="cv-auth-bg">${slides}</div>

    <div class="cv-auth-container" style="position:relative;z-index:1;">
      <div class="cv-auth-card" style="backdrop-filter:blur(10px);background:var(--color-auth-card-scrim);">
        <h1 class="cv-auth-card__title">Join ChitraVithika</h1>
        <p class="cv-auth-card__subtitle">Create your account and start your journey</p>

        <form id="cv-register-form" class="cv-form" novalidate>
          <div class="cv-form-group">
            <label class="cv-form-label">I am a…</label>
            <div class="cv-role-chooser">
              <div class="cv-role-option selected" data-role="buyer" tabindex="0" role="radio" aria-checked="true">
                <div class="cv-role-option__icon">🖼️</div>
                <div class="cv-role-option__label">Collector</div>
                <div class="cv-role-option__desc">Acquire limited editions</div>
              </div>
              <div class="cv-role-option" data-role="photographer" tabindex="0" role="radio" aria-checked="false">
                <div class="cv-role-option__icon">📷</div>
                <div class="cv-role-option__label">Photographer</div>
                <div class="cv-role-option__desc">Sell your work</div>
              </div>
            </div>
            <input type="hidden" name="role" id="reg-role" value="buyer" />
          </div>

          <div class="cv-form-group">
            <label for="reg-name" class="cv-form-label">Full Name</label>
            <input
              type="text"
              id="reg-name"
              name="name"
              class="cv-form-input"
              placeholder="Your full name"
              required
              autocomplete="name"
            />
          </div>

          <div class="cv-form-group">
            <label for="reg-email" class="cv-form-label">Email</label>
            <input
              type="email"
              id="reg-email"
              name="email"
              class="cv-form-input"
              placeholder="you@example.com"
              required
              autocomplete="email"
            />
          </div>

          <div class="cv-form-group">
            <label for="reg-password" class="cv-form-label">Password</label>
            <input
              type="password"
              id="reg-password"
              name="password"
              class="cv-form-input"
              placeholder="Minimum 6 characters"
              required
              minlength="6"
              autocomplete="new-password"
            />
          </div>

          <div id="register-error" class="cv-form-error" role="alert"></div>

          <button type="submit" class="cv-btn cv-btn--primary cv-btn--full cv-btn--large" id="register-submit">
            Create Account
          </button>
        </form>

        <!-- Divider -->
        <div class="cv-auth-divider" style="display:flex;align-items:center;gap:var(--space-4);margin:var(--space-6) 0;">
          <div style="flex:1;height:1px;background:var(--color-border);"></div>
          <span style="font-size:var(--text-xs);color:var(--color-text-tertiary);text-transform:uppercase;">or continue with</span>
          <div style="flex:1;height:1px;background:var(--color-border);"></div>
        </div>

        <!-- Google Sign-In Button -->
        <button type="button" id="google-signin-btn" class="cv-btn cv-btn--outline cv-btn--full cv-btn--large cv-google-btn" style="display:flex;align-items:center;justify-content:center;gap:var(--space-3);">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span>Sign up with Google</span>
        </button>

        <div id="google-error" class="cv-form-error" role="alert" style="margin-top:var(--space-3);"></div>

        <div class="cv-auth-card__footer">
          Already have an account? <a href="/login" id="register-to-login">Sign in</a>
        </div>
      </div>
    </div>
  `;
}

let bgInterval = null;

function nextRouteForUser(user = null) {
    const next = getNextPathAfterAuth();
    const defaultRoute = getDefaultRouteForUser(user);
    return defaultRoute === '/complete-profile' ? defaultRoute : (next || defaultRoute);
}

export function mount() {
    if (isLoggedIn()) {
        setTimeout(() => navigate(nextRouteForUser(), { replace: true }), 50);
        return;
    }

    const loginLink = document.getElementById('register-to-login');
    if (loginLink && window.location.search) loginLink.setAttribute('href', '/login' + window.location.search);

    const slides = document.querySelectorAll('.cv-auth-bg__slide');
    if (slides.length > 1) {
        let current = 0;
        bgInterval = setInterval(() => {
            slides[current].classList.remove('active');
            current = (current + 1) % slides.length;
            slides[current].classList.add('active');
        }, 4000);
    }

    const form = document.getElementById('cv-register-form');
    const submitBtn = document.getElementById('register-submit');
    const roleInput = document.getElementById('reg-role');
    const errorEl = document.getElementById('register-error');

    document.querySelectorAll('.cv-role-option').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.cv-role-option').forEach(b => {
                b.classList.remove('selected');
                b.setAttribute('aria-checked', 'false');
            });
            btn.classList.add('selected');
            btn.setAttribute('aria-checked', 'true');
            roleInput.value = btn.dataset.role;
        });
        btn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                btn.click();
            }
        });
    });

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (errorEl) errorEl.textContent = '';

        const name = form.elements['name'].value.trim();
        const email = form.elements['email'].value.trim();
        const password = form.elements['password'].value;
        const role = roleInput.value;

        if (!name || !email || !password) {
            if (errorEl) errorEl.textContent = 'All fields are required.';
            return;
        }
        if (password.length < 6) {
            if (errorEl) errorEl.textContent = 'Password must be at least 6 characters.';
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating account…';

        try {
            const user = await register({ name, email, password, role });
            navigate(nextRouteForUser(user));
        } catch (err) {
            if (errorEl) errorEl.textContent = err.message;
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Account';
        }
    });

    // Google Sign-In handler
    const googleBtn = document.getElementById('google-signin-btn');
    const googleError = document.getElementById('google-error');

    googleBtn?.addEventListener('click', async () => {
        googleBtn.disabled = true;
        googleBtn.innerHTML = `
            <svg class="cv-spinner" width="18" height="18" viewBox="0 0 24 24" style="animation:spin 1s linear infinite;">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="31.4 31.4" stroke-linecap="round"/>
            </svg>
            <span>Signing up…</span>
        `;
        if (googleError) googleError.textContent = '';

        try {
            const user = await loginWithGoogle();
            const destination = nextRouteForUser(user);
            console.log('[register] Google user role:', user.role, '→ Redirecting to:', destination);
            navigate(destination);
        } catch (err) {
            console.error('[register] Google sign-up failed:', err);
            if (googleError) {
                googleError.textContent = err.message || 'Google sign-up failed. Please try again.';
            }
            googleBtn.disabled = false;
            googleBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Sign up with Google</span>
            `;
        }
    });

    return () => {
        if (bgInterval) {
            clearInterval(bgInterval);
            bgInterval = null;
        }
        document.getElementById('cv-auth-bg')?.remove();
    };
}
