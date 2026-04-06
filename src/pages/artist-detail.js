/**
 * ChitraVithika — Artist Detail Page
 * Route: /artists/:id
 */
import { currentUser, getArtistById, getAuthToken, isLoggedIn } from '../js/state.js';
import { navigate } from '../js/router.js';

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatTime(ts) {
    return new Date(ts).toLocaleString();
}

function renderMessageBubble(message, userId) {
    const own = message.senderId === userId;
    return `
      <div style="display:flex;justify-content:${own ? 'flex-end' : 'flex-start'};">
        <div style="max-width:min(100%,420px);padding:12px 14px;border-radius:18px;background:${own ? 'rgba(200,169,110,0.14)' : 'rgba(255,255,255,0.05)'};border:1px solid ${own ? 'rgba(200,169,110,0.28)' : 'rgba(255,255,255,0.08)'};">
          <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-bottom:6px;">${escapeHtml(message.senderName)} · ${formatTime(message.createdAt)}</div>
          <div style="font-size:var(--text-sm);color:var(--color-text-primary);line-height:1.6;white-space:pre-wrap;">${escapeHtml(message.content)}</div>
        </div>
      </div>
    `;
}

export function render({ id }) {
    const artist = getArtistById(id);
    if (!artist) {
        return `<div class="cv-page-message"><h1 class="cv-page-message__title">Not Found</h1><p class="cv-page-message__text">This artist doesn't exist.</p><a href="/artists" class="cv-page-message__link">Back to Artists</a></div>`;
    }

    const user = currentUser();
    const canMessage = Boolean(isLoggedIn() && artist.userId && user?.id && user.id !== artist.userId);

    return `
    <div class="cv-page-container">
      <div style="margin-bottom:var(--space-6);">
        <a href="/artists" style="font-size:var(--text-sm);color:var(--color-text-tertiary);letter-spacing:0.1em;text-transform:uppercase;">← Artists</a>
      </div>

      <div style="display:flex;align-items:center;justify-content:space-between;gap:var(--space-6);margin-bottom:var(--space-10);flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:var(--space-6);">
          <div class="cv-artist-card__avatar" style="width:80px;height:80px;font-size:var(--text-2xl);background:linear-gradient(135deg, ${artist.color || '#8c7248'}, var(--color-avatar-gradient-end))">
            ${escapeHtml(artist.name.charAt(0))}
          </div>
          <div>
            <h1 style="font-family:var(--font-display);font-size:var(--text-2xl);font-weight:600;color:var(--color-text-primary);">${escapeHtml(artist.name)}</h1>
            <p style="font-size:var(--text-sm);color:var(--color-text-secondary);">${artist.works.length} work${artist.works.length !== 1 ? 's' : ''} · ${artist.works.map((w) => w.category).filter((v, i, a) => a.indexOf(v) === i).join(', ')}</p>
          </div>
        </div>
        ${canMessage ? `
          <button type="button" id="btn-open-artist-chat" class="cv-btn cv-btn--primary">Message This Photographer</button>
        ` : user?.id === artist.userId ? `
          <span class="cv-badge" style="background:rgba(200,169,110,0.16);color:var(--color-accent);">This is your artist profile</span>
        ` : ''}
      </div>

      ${canMessage ? `
        <section style="margin-bottom:var(--space-10);padding:var(--space-6);border-radius:var(--radius-lg);background:var(--color-surface);border:1px solid var(--color-border);">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:var(--space-4);margin-bottom:var(--space-4);flex-wrap:wrap;">
            <div>
              <h2 style="font-family:var(--font-display);font-size:var(--text-lg);font-weight:600;color:var(--color-text-primary);">Direct Message</h2>
              <p style="font-size:var(--text-sm);color:var(--color-text-tertiary);">Talk directly with ${escapeHtml(artist.name)} about the works in this portfolio.</p>
            </div>
            <span id="artist-chat-status" style="font-size:var(--text-xs);color:var(--color-text-tertiary);">Private collector-to-photographer thread</span>
          </div>
          <div id="artist-chat-thread" style="display:flex;flex-direction:column;gap:12px;max-height:360px;overflow:auto;padding-right:4px;margin-bottom:var(--space-4);">
            <p style="font-size:var(--text-sm);color:var(--color-text-tertiary);">Loading conversation…</p>
          </div>
          <form id="artist-chat-form" style="display:flex;flex-direction:column;gap:var(--space-3);">
            <textarea id="artist-chat-input" rows="4" maxlength="2000" placeholder="Ask about availability, process, framing, licensing, or the story behind the work..." style="width:100%;padding:var(--space-3);background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text-primary);font-family:var(--font-sans);font-size:var(--text-sm);resize:vertical;"></textarea>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:var(--space-3);flex-wrap:wrap;">
              <span id="artist-chat-count" style="font-size:var(--text-xs);color:var(--color-text-tertiary);">0/2000</span>
              <button type="submit" class="cv-btn cv-btn--primary" id="btn-send-artist-chat">Send Message</button>
            </div>
          </form>
        </section>
      ` : ''}

      <h2 style="font-family:var(--font-display);font-size:var(--text-lg);font-weight:600;color:var(--color-text-primary);margin-bottom:var(--space-6);">Portfolio</h2>

      <div class="cv-cards-grid">
        ${artist.works.map((item) => `
          <a href="/gallery/${item.id}" style="text-decoration:none;color:inherit;">
            <div style="aspect-ratio:4/3;background:linear-gradient(135deg, ${item.color || '#333'} 0%, var(--color-gradient-end) 100%);border-radius:var(--radius-lg);margin-bottom:var(--space-3);position:relative;overflow:hidden;">
              <img src="/api/image-preview/${item.id}?v=${Date.now()}" loading="lazy" alt="${escapeHtml(item.title)}"
                style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;"
                onerror="this.style.display='none'" />
            </div>
            <h3 style="font-family:var(--font-display);font-size:var(--text-md);font-weight:600;color:var(--color-text-primary);margin-bottom:2px;">${escapeHtml(item.title)}</h3>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:var(--space-2);">
              <span style="font-family:var(--font-mono);font-size:var(--text-sm);color:var(--color-accent);">$${item.price.toLocaleString()}</span>
              <span style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${item.remaining}/${item.editions} left</span>
            </div>
          </a>
        `).join('')}
      </div>
    </div>
  `;
}

export function mount({ id }) {
    const artist = getArtistById(id);
    const user = currentUser();
    if (!artist || !artist.userId || !user || user.id === artist.userId) return;

    const threadEl = document.getElementById('artist-chat-thread');
    const statusEl = document.getElementById('artist-chat-status');
    const form = document.getElementById('artist-chat-form');
    const input = document.getElementById('artist-chat-input');
    const count = document.getElementById('artist-chat-count');
    const sendBtn = document.getElementById('btn-send-artist-chat');

    async function loadThread() {
        const token = getAuthToken();
        if (!token) return;
        const res = await fetch(`/api/messages/thread/${encodeURIComponent(artist.userId)}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            if (threadEl) threadEl.innerHTML = `<p style="font-size:var(--text-sm);color:#e05252;">${escapeHtml(data.error || 'Unable to load messages')}</p>`;
            return;
        }
        if (statusEl) statusEl.textContent = `Chatting with ${artist.name}`;
        if (threadEl) {
            const messages = Array.isArray(data.messages) ? data.messages : [];
            threadEl.innerHTML = messages.length
                ? messages.map((message) => renderMessageBubble(message, user.id)).join('')
                : `<p style="font-size:var(--text-sm);color:var(--color-text-tertiary);">No messages yet. Start the conversation with ${escapeHtml(artist.name)}.</p>`;
            threadEl.scrollTop = threadEl.scrollHeight;
        }
    }

    document.getElementById('btn-open-artist-chat')?.addEventListener('click', () => {
        form?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        input?.focus();
    });

    input?.addEventListener('input', () => {
        if (count) count.textContent = `${input.value.length}/2000`;
    });

    form?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const token = getAuthToken();
        if (!token) {
            navigate('/login');
            return;
        }
        const content = input.value.trim();
        if (!content) return;

        sendBtn.disabled = true;
        if (statusEl) statusEl.textContent = 'Sending message...';

        try {
            const res = await fetch(`/api/messages/thread/${encodeURIComponent(artist.userId)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ content }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Unable to send message');
            input.value = '';
            if (count) count.textContent = '0/2000';
            await loadThread();
        } catch (err) {
            if (statusEl) statusEl.textContent = err.message || 'Unable to send message';
        } finally {
            sendBtn.disabled = false;
        }
    });

    loadThread().catch((err) => {
        if (statusEl) statusEl.textContent = err.message || 'Unable to load conversation';
    });
}
