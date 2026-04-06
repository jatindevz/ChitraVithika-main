import { isLoggedIn, currentUser, getAuthToken } from './state.js';
import { navigate } from './router.js';

function escapeHtml(text) {
    return String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function formatTimeAgo(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString();
}

function renderComment(comment) {
    const user = currentUser();
    const isOwner = user && user.id === comment.user_id;

    return `
      <div class="cv-comment" style="padding:var(--space-4);background:var(--color-surface);border:1px solid var(--color-border-subtle);border-radius:var(--radius-md);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--space-2);gap:12px;">
          <div>
            <span style="font-weight:600;color:var(--color-text-primary);font-size:var(--text-sm);">${escapeHtml(comment.user_name)}</span>
            <span style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-left:var(--space-2);">${formatTimeAgo(comment.created_at)}</span>
            ${comment.edited ? '<span style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-left:var(--space-1);">(edited)</span>' : ''}
          </div>
          ${isOwner ? `<button type="button" class="btn-delete-comment" data-id="${comment.id}" style="background:none;border:none;color:var(--color-text-tertiary);cursor:pointer;font-size:var(--text-xs);padding:var(--space-1);" title="Delete comment">✕</button>` : ''}
        </div>
        <p style="font-size:var(--text-sm);color:var(--color-text-secondary);line-height:1.6;white-space:pre-wrap;">${escapeHtml(comment.content)}</p>
      </div>
    `;
}

export function renderEngagementPanel() {
    return `
      <div class="cv-like-section" style="display:flex;align-items:center;justify-content:center;gap:var(--space-4);margin:var(--space-6) 0;padding:var(--space-4);background:var(--color-surface);border:1px solid var(--color-border-subtle);border-radius:var(--radius-lg);">
        <button id="btn-like" class="cv-like-btn" style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-3) var(--space-6);background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-md);cursor:pointer;transition:all 0.2s ease;font-size:var(--text-md);color:var(--color-text-secondary);">
          <span id="like-icon" style="font-size:1.5rem;">♡</span>
          <span id="like-count" style="font-family:var(--font-mono);">0</span>
        </button>
      </div>

      <div class="cv-comments-section" style="background:var(--color-surface);border:1px solid var(--color-border-subtle);border-radius:var(--radius-lg);padding:var(--space-6);">
        <h3 style="font-family:var(--font-display);font-size:var(--text-lg);font-weight:600;color:var(--color-text-primary);margin-bottom:var(--space-4);">
          Comments <span id="comment-count" style="font-weight:400;color:var(--color-text-tertiary);">(0)</span>
        </h3>

        <div id="comment-form-wrapper" style="margin-bottom:var(--space-6);">
          <form id="comment-form" style="display:flex;flex-direction:column;gap:var(--space-3);">
            <textarea
              id="comment-input"
              placeholder="Share your thoughts about this photograph..."
              rows="3"
              maxlength="1000"
              style="width:100%;padding:var(--space-3);background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-md);color:var(--color-text-primary);font-family:var(--font-sans);font-size:var(--text-sm);resize:vertical;min-height:80px;"
            ></textarea>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span id="char-count" style="font-size:var(--text-xs);color:var(--color-text-tertiary);">0/1000</span>
              <button type="submit" id="btn-comment" class="cv-btn cv-btn--primary" style="padding:var(--space-2) var(--space-4);">
                Post Comment
              </button>
            </div>
          </form>
          <div id="comment-login-prompt" style="display:none;padding:var(--space-4);background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-md);text-align:center;">
            <p style="font-size:var(--text-sm);color:var(--color-text-secondary);margin-bottom:var(--space-2);">Sign in to leave a comment</p>
            <a href="/login" class="cv-btn cv-btn--ghost" style="font-size:var(--text-sm);">Sign In</a>
          </div>
        </div>

        <div id="comments-list" style="display:flex;flex-direction:column;gap:var(--space-4);">
          <p id="no-comments" style="font-size:var(--text-sm);color:var(--color-text-tertiary);text-align:center;padding:var(--space-6);">No comments yet. Be the first to share your thoughts!</p>
        </div>
      </div>
    `;
}

export function mountEngagementPanel(photoId) {
    const likeBtn = document.getElementById('btn-like');
    const likeIcon = document.getElementById('like-icon');
    const likeCountEl = document.getElementById('like-count');
    const commentForm = document.getElementById('comment-form');
    const commentInput = document.getElementById('comment-input');
    const charCount = document.getElementById('char-count');
    const commentCountEl = document.getElementById('comment-count');
    const commentsList = document.getElementById('comments-list');
    const noComments = document.getElementById('no-comments');
    const loginPrompt = document.getElementById('comment-login-prompt');
    const commentBtn = document.getElementById('btn-comment');
    let hasLiked = false;
    let allComments = [];

    if (!commentForm || !commentsList) return;

    if (!isLoggedIn()) {
        commentForm.style.display = 'none';
        loginPrompt.style.display = 'block';
    }

    function updateLikeUI() {
        if (hasLiked) {
            likeIcon.textContent = '♥';
            likeIcon.style.color = '#e05252';
            likeBtn.style.borderColor = 'rgba(224, 82, 82, 0.3)';
            likeBtn.style.background = 'rgba(224, 82, 82, 0.08)';
        } else {
            likeIcon.textContent = '♡';
            likeIcon.style.color = 'var(--color-text-secondary)';
            likeBtn.style.borderColor = 'var(--color-border)';
            likeBtn.style.background = 'var(--color-surface)';
        }
    }

    async function loadLikeStatus() {
        try {
            const headers = {};
            const token = getAuthToken();
            if (token) headers.Authorization = `Bearer ${token}`;
            const res = await fetch(`/api/likes/${photoId}`, { headers });
            const data = await res.json();
            likeCountEl.textContent = data.likeCount || 0;
            hasLiked = data.hasLiked;
            updateLikeUI();
        } catch (err) {
            console.error('Failed to load like status:', err);
        }
    }

    async function loadComments() {
        try {
            const res = await fetch(`/api/comments/${photoId}`);
            const data = await res.json();
            allComments = Array.isArray(data) ? data : [];
            commentCountEl.textContent = `(${allComments.length})`;

            if (!allComments.length) {
                commentsList.innerHTML = '';
                commentsList.appendChild(noComments);
                return;
            }

            commentsList.innerHTML = allComments.map(renderComment).join('');
            commentsList.querySelectorAll('.btn-delete-comment').forEach((btn) => {
                btn.addEventListener('click', async () => {
                    if (!confirm('Delete this comment?')) return;
                    const token = getAuthToken();
                    if (!token) {
                        navigate('/login');
                        return;
                    }
                    const res = await fetch(`/api/comments/${photoId}/${btn.dataset.id}`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    if (!res.ok) {
                        const data = await res.json().catch(() => ({}));
                        alert(data.error || 'Failed to delete comment');
                        return;
                    }
                    await loadComments();
                });
            });
        } catch (err) {
            console.error('Failed to load comments:', err);
        }
    }

    likeBtn?.addEventListener('click', async () => {
        if (!isLoggedIn()) {
            navigate('/login');
            return;
        }

        try {
            const token = getAuthToken();
            const res = await fetch(`/api/likes/${photoId}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error || 'Unable to update like');
            }
            hasLiked = data.liked;
            likeCountEl.textContent = data.likeCount;
            updateLikeUI();
        } catch (err) {
            console.error('Failed to toggle like:', err);
        }
    });

    commentInput?.addEventListener('input', () => {
        const len = commentInput.value.length;
        charCount.textContent = `${len}/1000`;
        charCount.style.color = len > 900 ? '#e05252' : 'var(--color-text-tertiary)';
    });

    commentForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const token = getAuthToken();
        if (!token) {
            navigate('/login');
            return;
        }

        const content = commentInput.value.trim();
        if (!content) return;

        commentBtn.disabled = true;
        commentBtn.textContent = 'Posting...';

        try {
            const res = await fetch(`/api/comments/${photoId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ content }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error || 'Failed to post comment');
            }
            commentInput.value = '';
            charCount.textContent = '0/1000';
            await loadComments();
        } catch (err) {
            alert(err.message || 'Failed to post comment');
        } finally {
            commentBtn.disabled = false;
            commentBtn.textContent = 'Post Comment';
        }
    });

    loadLikeStatus();
    loadComments();
}
