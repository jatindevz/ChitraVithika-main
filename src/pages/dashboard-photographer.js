/**
 * ChitraVithika — Photographer Dashboard
 * Route: /dashboard/photographer
 */
import { isLoggedIn, currentUser, getCatalog, getAuthToken, logout, deleteCurrentAccount, canAccessArtistTools, updateCurrentProfilePhoto } from '../js/state.js';
import { navigate } from '../js/router.js';

const PAGE_SIZE = 5;
let bidPage = 1;
let incomingBids = [];
let removedWorks = [];
let inboxThreads = [];
let selectedThreadUserId = null;
let currentThreadMessages = [];

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function getInitials(name) {
    return String(name || 'CV')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('') || 'CV';
}

function qualityBadge(item) {
    const hasHighRes = (item.width && item.height && item.width >= 3000);
    const hasExif = item.exif && (item.exif.camera || item.exif.lens);
    if (hasHighRes && hasExif) {
        return `<span class="cv-quality-badge cv-quality-badge--high">● Lossless</span>`;
    }
    if (hasHighRes || hasExif) {
        return `<span class="cv-quality-badge cv-quality-badge--medium">● Good</span>`;
    }
    return `<span class="cv-quality-badge cv-quality-badge--low">● Basic</span>`;
}

function bidRowStatus(b) {
    const st = b.bid_status || 'active';
    if (st === 'pending') return '<span class="cv-badge" style="background:rgba(200,169,110,0.2);color:var(--color-accent);">Pending</span>';
    if (st === 'declined') return '<span class="cv-badge" style="background:rgba(180,80,80,0.15);color:#c44;">Declined</span>';
    if (st === 'cancelled') return '<span class="cv-badge" style="opacity:0.8;">Closed</span>';
    if (st === 'accepted' && !b.sold) return '<span class="cv-badge" style="background:rgba(38,166,154,0.15);color:#26a69a;">Awaiting buyer payment</span>';
    if (st === 'accepted') return '<span class="cv-badge cv-badge--live">Paid by buyer</span>';
    return '<span class="cv-badge cv-badge--live">Active</span>';
}

function pagerHtml(page, tp, total) {
    if (total <= PAGE_SIZE) return '';
    return `
      <div class="cv-dash-pager" style="display:flex;align-items:center;justify-content:center;gap:var(--space-4);margin-top:var(--space-4);font-size:var(--text-sm);">
        <button type="button" class="cv-btn cv-btn--ghost cv-btn--small" data-pager="bid" data-dir="prev" ${page <= 1 ? 'disabled' : ''}>Previous</button>
        <span style="color:var(--color-text-tertiary);">Page ${page} / ${tp}</span>
        <button type="button" class="cv-btn cv-btn--ghost cv-btn--small" data-pager="bid" data-dir="next" ${page >= tp ? 'disabled' : ''}>Next</button>
      </div>`;
}

function formatMessageTime(value) {
    return new Date(value).toLocaleString();
}

export function render() {
    if (!isLoggedIn()) {
        return `<div class="cv-page-message"><p class="cv-page-message__text">Redirecting to login…</p></div>`;
    }

    if (!canAccessArtistTools(currentUser())) {
        return `
        <div class="cv-page-message">
          <h1 class="cv-page-message__title">Artist Access Required</h1>
          <p class="cv-page-message__text">Complete your artist profile to unlock the photographer dashboard and listing tools.</p>
          <a href="/complete-profile?intent=artist" class="cv-btn cv-btn--primary">Complete Artist Profile</a>
        </div>`;
    }

    const user = currentUser();
    const catalog = getCatalog();
    const myWorks = catalog.filter(i => i.artist === user.name);
    const totalRevenue = myWorks.reduce((sum, i) => sum + (i.price * (i.editions - i.remaining)), 0);
    const totalSold = myWorks.reduce((sum, i) => sum + (i.editions - i.remaining), 0);

    const tp = Math.max(1, Math.ceil(incomingBids.length / PAGE_SIZE));
    const p = Math.min(Math.max(1, bidPage), tp);
    const start = (p - 1) * PAGE_SIZE;
    const slice = incomingBids.slice(start, start + PAGE_SIZE);
    const activeThread = inboxThreads.find((thread) => thread.otherUserId === selectedThreadUserId) || inboxThreads[0] || null;

    const photoEndButtons = [...new Map(myWorks.map((w) => [w.id, w])).values()]
        .map((w) => `
          <button type="button" class="cv-btn cv-btn--ghost cv-btn--small" data-end-auction="${w.id}" title="End without selling (cancels pending sealed bids)">
            End #${w.id}
          </button>
        `).join(' ');

    return `
    <div class="cv-page-container">
      <div class="cv-page-header">
        <p class="cv-page-header__eyebrow">Photographer Dashboard</p>
        <h1 class="cv-page-header__title">Welcome, ${escapeHtml(user.name)}</h1>
        <p class="cv-page-header__subtitle">Manage your listings, sealed bids, and earnings.</p>
      </div>

      <div class="cv-dash-section" style="display:grid;grid-template-columns:auto 1fr;gap:var(--space-5);align-items:center;">
        <div style="width:104px;height:104px;border-radius:30px;overflow:hidden;border:1px solid var(--color-border);background:linear-gradient(135deg,rgba(200,169,110,0.18),rgba(38,166,154,0.22));display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-size:1.8rem;color:var(--color-text-primary);">
          ${user.photoURL ? `<img src="${escapeHtml(user.photoURL)}" alt="${escapeHtml(user.name)}" style="width:100%;height:100%;object-fit:cover;" />` : escapeHtml(getInitials(user.name))}
        </div>
        <div>
          <h2 class="cv-dash-section__title" style="margin-bottom:var(--space-2);">Artist Profile Photo</h2>
          <p style="color:var(--color-text-tertiary);font-size:var(--text-sm);margin-bottom:var(--space-3);">
            Upload a portrait for your artist dashboard and profile presence.
          </p>
          <div style="display:flex;flex-wrap:wrap;gap:var(--space-3);align-items:center;">
            <label class="cv-btn cv-btn--ghost" for="artist-profile-photo-input">Upload Photo</label>
            <input id="artist-profile-photo-input" type="file" accept="image/*" hidden />
            <span id="artist-profile-photo-status" style="font-size:var(--text-sm);color:var(--color-text-tertiary);">Use a square image for best results.</span>
          </div>
        </div>
      </div>

      <div class="cv-stats-row">
        <div class="cv-stat-card">
          <div class="cv-stat-card__value">${myWorks.length}</div>
          <div class="cv-stat-card__label">Listed Works</div>
        </div>
        <div class="cv-stat-card">
          <div class="cv-stat-card__value">${totalSold}</div>
          <div class="cv-stat-card__label">Editions Sold</div>
        </div>
        <div class="cv-stat-card">
          <div class="cv-stat-card__value">$${totalRevenue.toLocaleString()}</div>
          <div class="cv-stat-card__label">Total Revenue</div>
        </div>
        <div class="cv-stat-card">
          <div class="cv-stat-card__value">${myWorks.reduce((s, i) => s + i.remaining, 0)}</div>
          <div class="cv-stat-card__label">Available Editions</div>
        </div>
      </div>

      <div style="margin-bottom:var(--space-8);">
        <a href="/submit" class="cv-btn cv-btn--primary cv-btn--large">+ Submit New Work</a>
      </div>

      ${removedWorks.length ? `
        <div class="cv-dash-section" style="border-color:rgba(224,82,82,0.3);">
          <h2 class="cv-dash-section__title" style="color:#e05252;">Removed By Admin</h2>
          <p style="color:var(--color-text-tertiary);font-size:var(--text-sm);margin-bottom:var(--space-4);">
            These works were removed from the public gallery by the admin and are visible only to you here.
          </p>
          <div style="display:grid;gap:var(--space-3);">
            ${removedWorks.map((item) => `
              <div style="padding:var(--space-4);border-radius:var(--radius-md);background:rgba(224,82,82,0.07);border:1px solid rgba(224,82,82,0.25);">
                <div style="display:flex;justify-content:space-between;gap:var(--space-4);flex-wrap:wrap;">
                  <div>
                    <div style="font-family:var(--font-display);font-size:var(--text-md);color:var(--color-text-primary);">${escapeHtml(item.title)}</div>
                    <div style="font-size:var(--text-xs);color:#e05252;margin-top:4px;">ITEM REMOVED BY THE ADMIN</div>
                  </div>
                  <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">Removed on ${new Date(item.deletedAt).toLocaleDateString()}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="cv-dash-section">
        <h2 class="cv-dash-section__title">Your Listings</h2>
        ${myWorks.length === 0 ? `
          <div class="cv-empty-state">
            <div class="cv-empty-state__icon">📸</div>
            <h3 class="cv-empty-state__title">No works listed yet</h3>
            <p class="cv-empty-state__text">Upload your first photograph to start reaching collectors worldwide.</p>
            <a href="/submit" class="cv-btn cv-btn--primary">Submit Work</a>
          </div>
        ` : `
          <div class="cv-table-wrap">
            <table class="cv-table">
              <thead><tr>
                <th>Title</th>
                <th>Category</th>
                <th>Price</th>
                <th>Editions</th>
                <th>Sold</th>
                <th>Revenue</th>
                <th>Quality</th>
              </tr></thead>
              <tbody>
                ${myWorks.map(item => `
                  <tr>
                    <td><a href="/gallery/${item.id}" style="color:var(--color-accent);">${escapeHtml(item.title)}</a></td>
                    <td style="text-transform:capitalize;">${escapeHtml(item.category)}</td>
                    <td style="font-family:var(--font-mono);color:var(--color-accent);">$${item.price.toLocaleString()}</td>
                    <td>${item.editions}</td>
                    <td>${item.editions - item.remaining}</td>
                    <td style="font-family:var(--font-mono);">$${(item.price * (item.editions - item.remaining)).toLocaleString()}</td>
                    <td>${qualityBadge(item)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ${myWorks.length ? `<p style="margin-top:var(--space-3);font-size:var(--text-sm);color:var(--color-text-secondary);">End an auction without selling: ${photoEndButtons}</p>` : ''}
        `}
      </div>

      <div class="cv-dash-section">
        <h2 class="cv-dash-section__title">Incoming bids</h2>
        <p style="font-size:var(--text-sm);color:var(--color-text-tertiary);margin-bottom:var(--space-4);">
          For <strong>sealed</strong> listings, grant a bid to sell to that collector, decline individual bids, or end the auction without a sale.
        </p>
        ${incomingBids.length === 0 ? `
          <p style="color:var(--color-text-tertiary);font-size:var(--text-sm);font-style:italic;">No bids yet.</p>
        ` : `
          <div class="cv-table-wrap">
            <table class="cv-table">
              <thead><tr>
                <th>Work</th>
                <th>Bidder</th>
                <th>Amount</th>
                <th>Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr></thead>
              <tbody>
                ${slice.map((b) => `
                  <tr>
                    <td><a href="/gallery/${b.photo_id}" style="color:var(--color-accent);">${escapeHtml(b.work_title || 'Work')}</a></td>
                    <td>${escapeHtml(b.user_name || '—')}</td>
                    <td style="font-family:var(--font-mono);color:var(--color-accent);">$${b.amount.toLocaleString()}</td>
                    <td style="text-transform:capitalize;">${escapeHtml(b.auction_type || '')}</td>
                    <td>${bidRowStatus(b)}</td>
                    <td style="white-space:nowrap;">
                      ${b.auction_type === 'silent' && b.bid_status === 'pending' && !b.sold && !b.ended_at ? `
                        <button type="button" class="cv-btn cv-btn--primary cv-btn--small" data-grant-bid="${b.id}">Grant</button>
                        <button type="button" class="cv-btn cv-btn--ghost cv-btn--small" data-decline-bid="${b.id}">Decline</button>
                      ` : '—'}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ${pagerHtml(p, tp, incomingBids.length)}
        `}
      </div>

      <div class="cv-dash-section">
        <h2 class="cv-dash-section__title">Collector Messages</h2>
        <p style="font-size:var(--text-sm);color:var(--color-text-tertiary);margin-bottom:var(--space-4);">
          Reply to collectors who contacted you from your artist profile page.
        </p>
        ${inboxThreads.length === 0 ? `
          <p style="color:var(--color-text-tertiary);font-size:var(--text-sm);font-style:italic;">No direct messages yet.</p>
        ` : `
          <div style="display:grid;grid-template-columns:minmax(220px,0.75fr) minmax(0,1.25fr);gap:var(--space-5);">
            <div style="display:flex;flex-direction:column;gap:var(--space-3);">
              ${inboxThreads.map((thread) => `
                <button type="button" class="cv-btn cv-btn--ghost" data-open-thread="${thread.otherUserId}" style="justify-content:flex-start;text-align:left;padding:var(--space-3);border-color:${thread.otherUserId === activeThread?.otherUserId ? 'rgba(200,169,110,0.38)' : 'var(--color-border)'};">
                  <span style="display:block;font-weight:600;color:var(--color-text-primary);">${escapeHtml(thread.otherUserName)}</span>
                  <span style="display:block;font-size:var(--text-xs);color:var(--color-text-tertiary);margin-top:4px;">${escapeHtml(thread.lastMessage)}</span>
                  ${thread.unreadCount ? `<span style="display:inline-flex;margin-top:6px;padding:2px 8px;border-radius:999px;background:rgba(200,169,110,0.18);color:var(--color-accent);font-size:10px;">${thread.unreadCount} unread</span>` : ''}
                </button>
              `).join('')}
            </div>
            <div style="padding:var(--space-4);border-radius:var(--radius-md);background:var(--color-surface);border:1px solid var(--color-border);min-height:320px;display:flex;flex-direction:column;gap:var(--space-4);">
              <div>
                <div style="font-family:var(--font-display);font-size:var(--text-md);color:var(--color-text-primary);">${escapeHtml(activeThread?.otherUserName || 'Conversation')}</div>
                <div id="photographer-thread-status" style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-top:4px;">Messages stay private between you and the collector.</div>
              </div>
              <div id="photographer-thread" style="display:flex;flex-direction:column;gap:12px;max-height:320px;overflow:auto;">
                ${currentThreadMessages.length
                  ? currentThreadMessages.map((message) => `
                    <div style="display:flex;justify-content:${message.senderId === user.id ? 'flex-end' : 'flex-start'};">
                      <div style="max-width:min(100%,420px);padding:12px 14px;border-radius:18px;background:${message.senderId === user.id ? 'rgba(200,169,110,0.14)' : 'rgba(255,255,255,0.05)'};border:1px solid ${message.senderId === user.id ? 'rgba(200,169,110,0.28)' : 'rgba(255,255,255,0.08)'};">
                        <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-bottom:6px;">${escapeHtml(message.senderName)} · ${formatMessageTime(message.createdAt)}</div>
                        <div style="font-size:var(--text-sm);color:var(--color-text-primary);line-height:1.6;white-space:pre-wrap;">${escapeHtml(message.content)}</div>
                      </div>
                    </div>
                  `).join('')
                  : '<p style="font-size:var(--text-sm);color:var(--color-text-tertiary);">Select a conversation to view messages.</p>'}
              </div>
              ${activeThread ? `
                <form id="photographer-reply-form" style="display:flex;flex-direction:column;gap:var(--space-3);margin-top:auto;">
                  <textarea id="photographer-reply-input" rows="3" maxlength="2000" placeholder="Reply to this collector..." style="width:100%;padding:var(--space-3);background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text-primary);font-family:var(--font-sans);font-size:var(--text-sm);resize:vertical;"></textarea>
                  <div style="display:flex;justify-content:flex-end;">
                    <button type="submit" class="cv-btn cv-btn--primary" id="btn-send-photographer-reply">Send Reply</button>
                  </div>
                </form>
              ` : ''}
            </div>
          </div>
        `}
      </div>

      <div class="cv-dash-section">
        <h2 class="cv-dash-section__title">Account</h2>
        <p style="color:var(--color-text-tertiary);font-size:var(--text-sm);margin-bottom:var(--space-4);">
          Delete your account permanently. Your listings, auctions, bids, likes, and comments will be removed.
        </p>
        <button type="button" id="btn-delete-account" class="cv-btn cv-btn--ghost" style="border-color:rgba(224,82,82,0.35);color:#e05252;">
          Delete My Account
        </button>
      </div>
    </div>
  `;
}

function redraw() {
    const outlet = document.getElementById('cv-page');
    if (outlet) outlet.innerHTML = render();
    bind();
}

export function mount() {
    if (!isLoggedIn()) {
        setTimeout(() => navigate('/login', { replace: true }), 50);
        return;
    }

    if (!canAccessArtistTools(currentUser())) {
        setTimeout(() => navigate('/complete-profile?intent=artist', { replace: true }), 50);
        return;
    }

    (async () => {
        const token = getAuthToken();
        if (token) {
            try {
                const [bidsRes, removedRes, inboxRes] = await Promise.all([
                    fetch('/api/seller/incoming-bids', {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    fetch('/api/me/removed-works', {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    fetch('/api/messages/inbox', {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                ]);
                if (bidsRes.ok) incomingBids = await bidsRes.json();
                if (removedRes.ok) removedWorks = await removedRes.json();
                if (inboxRes.ok) {
                    inboxThreads = await inboxRes.json();
                    selectedThreadUserId = inboxThreads[0]?.otherUserId || null;
                    currentThreadMessages = [];
                    if (selectedThreadUserId) {
                        const threadRes = await fetch(`/api/messages/thread/${encodeURIComponent(selectedThreadUserId)}`, {
                            headers: { Authorization: `Bearer ${token}` },
                        });
                        if (threadRes.ok) {
                            const threadData = await threadRes.json();
                            currentThreadMessages = threadData.messages || [];
                        }
                    }
                }
            } catch (e) {
                console.warn('[photographer] dashboard extras', e);
            }
        }
        redraw();
    })();
}

function bind() {
    async function refreshInbox(loadSelected = true) {
        const token = getAuthToken();
        if (!token) return;
        const inboxRes = await fetch('/api/messages/inbox', {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (inboxRes.ok) {
            inboxThreads = await inboxRes.json();
            if (!selectedThreadUserId) {
                selectedThreadUserId = inboxThreads[0]?.otherUserId || null;
            }
            if (!inboxThreads.some((thread) => thread.otherUserId === selectedThreadUserId)) {
                selectedThreadUserId = inboxThreads[0]?.otherUserId || null;
            }
        }
        currentThreadMessages = [];
        if (loadSelected && selectedThreadUserId) {
            const threadRes = await fetch(`/api/messages/thread/${encodeURIComponent(selectedThreadUserId)}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (threadRes.ok) {
                const threadData = await threadRes.json();
                currentThreadMessages = threadData.messages || [];
            }
        }
    }

    document.querySelectorAll('[data-pager]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const dir = btn.getAttribute('data-dir');
            bidPage += dir === 'next' ? 1 : -1;
            redraw();
        });
    });

    document.querySelectorAll('[data-grant-bid]').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-grant-bid');
            if (!confirm('Grant this bid? The buyer will be asked to complete payment through the UPI checkout flow.')) return;
            await fetch(`/api/seller/bids/${id}/accept`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${getAuthToken()}` },
            });
            const res = await fetch('/api/seller/incoming-bids', {
                headers: { Authorization: `Bearer ${getAuthToken()}` },
            });
            if (res.ok) incomingBids = await res.json();
            redraw();
        });
    });

    document.querySelectorAll('[data-decline-bid]').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-decline-bid');
            if (!confirm('Decline this bid?')) return;
            await fetch(`/api/seller/bids/${id}/decline`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${getAuthToken()}` },
            });
            const res = await fetch('/api/seller/incoming-bids', {
                headers: { Authorization: `Bearer ${getAuthToken()}` },
            });
            if (res.ok) incomingBids = await res.json();
            redraw();
        });
    });

    document.querySelectorAll('[data-end-auction]').forEach((btn) => {
        btn.addEventListener('click', async () => {
            const photoId = btn.getAttribute('data-end-auction');
            if (!confirm('End this auction without a sale? Pending sealed bids will be cancelled.')) return;
            await fetch(`/api/seller/auctions/${photoId}/end`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${getAuthToken()}` },
            });
            const res = await fetch('/api/seller/incoming-bids', {
                headers: { Authorization: `Bearer ${getAuthToken()}` },
            });
            if (res.ok) incomingBids = await res.json();
            redraw();
        });
    });

    document.querySelectorAll('[data-open-thread]').forEach((btn) => {
        btn.addEventListener('click', async () => {
            selectedThreadUserId = btn.getAttribute('data-open-thread');
            await refreshInbox(true);
            redraw();
        });
    });

    document.getElementById('photographer-reply-form')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!selectedThreadUserId) return;
        const input = document.getElementById('photographer-reply-input');
        const status = document.getElementById('photographer-thread-status');
        const content = input?.value.trim();
        if (!content) return;
        try {
            const res = await fetch(`/api/messages/thread/${encodeURIComponent(selectedThreadUserId)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${getAuthToken()}`,
                },
                body: JSON.stringify({ content }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Unable to send reply');
            input.value = '';
            await refreshInbox(true);
            if (status) status.textContent = 'Reply sent.';
            redraw();
        } catch (err) {
            if (status) status.textContent = err.message || 'Unable to send reply';
        }
    });

    document.getElementById('btn-logout')?.addEventListener('click', () => {
        logout();
        navigate('/');
    });

    document.getElementById('btn-delete-account')?.addEventListener('click', async () => {
        const confirmed = confirm('Delete your account permanently? All of your listings and related activity will be removed.');
        if (!confirmed) return;

        try {
            await deleteCurrentAccount();
            navigate('/', { replace: true });
        } catch (err) {
            alert(err.message || 'Unable to delete account');
        }
    });

    const profileInput = document.getElementById('artist-profile-photo-input');
    const profileStatus = document.getElementById('artist-profile-photo-status');
    profileInput?.addEventListener('change', async () => {
        const file = profileInput.files?.[0];
        if (!file) return;
        if (profileStatus) profileStatus.textContent = 'Uploading profile photo...';

        try {
            const photoURL = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result || ''));
                reader.onerror = () => reject(new Error('Unable to read image'));
                reader.readAsDataURL(file);
            });
            await updateCurrentProfilePhoto(photoURL);
            if (profileStatus) profileStatus.textContent = 'Profile photo updated.';
            redraw();
        } catch (err) {
            if (profileStatus) profileStatus.textContent = err.message || 'Unable to upload photo';
        } finally {
            profileInput.value = '';
        }
    });
}
