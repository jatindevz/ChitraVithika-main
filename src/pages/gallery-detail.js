/**
 * ChitraVithika — Gallery Detail Page ("Art Vault")
 * Route: /gallery/:id
 *
 * Features:
 *   - Full image preview with glass overlay (anti-right-click)
 *   - Tiled "PREVIEW" watermark until purchase
 *   - EXIF metadata display (camera, lens, ISO, aperture, shutter)
 *   - Photographer stats + bidding portal
 *   - Like and comment functionality
 */
import { getCatalogItem, isLoggedIn, currentUser, setCart, getAuthToken, getCollectionItem } from '../js/state.js';
import { navigate } from '../js/router.js';

export function render({ id }) {
  const item = getCatalogItem(id);
  if (!item) {
    return `<div class="cv-page-message"><h1 class="cv-page-message__title">Not Found</h1><p class="cv-page-message__text">This photograph doesn't exist.</p><a href="/gallery" class="cv-page-message__link">Back to Gallery</a></div>`;
  }

  const artistSlug = item.artist.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const exif = item.exif || {};
  const hasExif = exif.camera || exif.lens || exif.iso || exif.aperture || exif.shutter;
  const isSoldOut = item.remaining <= 0;
  
  const user = currentUser();
  const isOwnContent = user && (item.artistId === user.id || item.artist === user.name);
  const ownedCopy = getCollectionItem(item.id);

  return `
    <div class="cv-page-container">
      <div style="margin-bottom:var(--space-6);">
        <a href="/gallery" style="font-size:var(--text-sm);color:var(--color-text-tertiary);letter-spacing:0.1em;text-transform:uppercase;">← Gallery</a>
      </div>

      <div class="cv-detail">
        <!-- IMAGE WITH GLASS OVERLAY & WATERMARK -->
        <div class="cv-detail__image-wrap">
          <div class="cv-detail__image" style="width:100%;height:100%;background:linear-gradient(135deg, ${item.color || '#333'}44, var(--color-gradient-end));position:relative;overflow:hidden;user-select:none;-webkit-user-select:none;">
            <img src="/api/image-preview/${item.id}" alt="${item.title}"
              style="width:100%;height:100%;object-fit:cover;display:block;opacity:0;transition:opacity 0.6s ease;pointer-events:none;"
              onload="this.style.opacity='1'"
              onerror="this.style.display='none'"
              draggable="false" />

            <!-- Tiled Watermark Overlay -->
            <div class="cv-watermark-overlay" aria-hidden="true">
              ${Array(20).fill('<span class="cv-watermark-text">CHITRAVITHIKA</span>').join('')}
            </div>

            <!-- Glass Layer (blocks right-click and interaction) -->
            <div class="cv-glass-layer" oncontextmenu="return false;" ondragstart="return false;"></div>
          </div>
        </div>

        <div class="cv-detail__meta">
          <div>
            <h1 class="cv-detail__title">${item.title}</h1>
            <p class="cv-detail__artist">by <a href="/artists/${artistSlug}">${item.artist}</a></p>
          </div>

          <p class="cv-detail__desc">${item.description || ''}</p>

          <!-- Core Metadata -->
          <div class="cv-detail__meta-grid">
            <div class="cv-detail__meta-item">
              <div class="cv-detail__meta-label">Category</div>
              <div class="cv-detail__meta-value" style="text-transform:capitalize;">${item.category}</div>
            </div>
            <div class="cv-detail__meta-item">
              <div class="cv-detail__meta-label">Editions</div>
              <div class="cv-detail__meta-value">${item.remaining} / ${item.editions}</div>
            </div>
            <div class="cv-detail__meta-item">
              <div class="cv-detail__meta-label">Resolution</div>
              <div class="cv-detail__meta-value">${item.width && item.height ? `${item.width} × ${item.height}` : 'High-Res'}</div>
            </div>
            <div class="cv-detail__meta-item">
              <div class="cv-detail__meta-label">Auction Floor</div>
              <div class="cv-detail__meta-value">$${item.auctionFloor.toLocaleString()}</div>
            </div>
          </div>

          <!-- EXIF Technical Metadata -->
          ${hasExif ? `
          <div class="cv-exif-panel">
            <h3 class="cv-exif-panel__title">📷 Technical Metadata</h3>
            <div class="cv-exif-grid">
              ${exif.camera ? `<div class="cv-exif-item"><span class="cv-exif-label">Camera</span><span class="cv-exif-value">${exif.camera}</span></div>` : ''}
              ${exif.lens ? `<div class="cv-exif-item"><span class="cv-exif-label">Lens</span><span class="cv-exif-value">${exif.lens}</span></div>` : ''}
              ${exif.iso ? `<div class="cv-exif-item"><span class="cv-exif-label">ISO</span><span class="cv-exif-value">${exif.iso}</span></div>` : ''}
              ${exif.aperture ? `<div class="cv-exif-item"><span class="cv-exif-label">Aperture</span><span class="cv-exif-value">${exif.aperture}</span></div>` : ''}
              ${exif.shutter ? `<div class="cv-exif-item"><span class="cv-exif-label">Shutter</span><span class="cv-exif-value">${exif.shutter}</span></div>` : ''}
            </div>
          </div>
          ` : ''}

          ${isSoldOut ? `
          <div class="cv-detail__sold-out-block" style="padding:var(--space-6);background:rgba(224,82,82,0.08);border:1px solid rgba(224,82,82,0.3);border-radius:var(--radius-lg);text-align:center;">
            <div style="font-family:var(--font-display);font-size:var(--text-xl);font-weight:700;color:#e05252;margin-bottom:var(--space-2);">SOLD OUT</div>
            <div style="font-size:var(--text-sm);color:var(--color-text-tertiary);">All ${item.editions} editions have been acquired.</div>
          </div>
          ` : ownedCopy ? `
          <div class="cv-detail__owned-block" style="padding:var(--space-6);background:rgba(38,166,154,0.1);border:1px solid rgba(38,166,154,0.32);border-radius:var(--radius-lg);text-align:center;">
            <div style="font-family:var(--font-display);font-size:var(--text-lg);font-weight:600;color:#26a69a;margin-bottom:var(--space-2);">Already Bought</div>
            <div style="font-size:var(--text-sm);color:var(--color-text-tertiary);margin-bottom:var(--space-4);">
              This work is already in your collection with a ${ownedCopy.license || 'personal'} license.
            </div>
            <a href="/dashboard/buyer" class="cv-btn cv-btn--ghost">View Collection</a>
          </div>
          ` : isOwnContent ? `
          <div class="cv-detail__own-content-block" style="padding:var(--space-6);background:rgba(200,169,110,0.08);border:1px solid rgba(200,169,110,0.3);border-radius:var(--radius-lg);text-align:center;">
            <div style="font-family:var(--font-display);font-size:var(--text-lg);font-weight:600;color:var(--color-accent);margin-bottom:var(--space-2);">Your Work</div>
            <div style="font-size:var(--text-sm);color:var(--color-text-tertiary);">You cannot acquire or bid on your own content.</div>
          </div>
          ` : `
          <div class="cv-detail__price-block">
            <div class="cv-detail__price">$${item.price.toLocaleString()}</div>
            <div class="cv-detail__price-hint">Instant acquisition price (Personal License)</div>
          </div>

          <div class="cv-detail__actions">
            <button class="cv-btn cv-btn--primary cv-btn--large" id="btn-acquire" style="flex:1;">Acquire Now</button>
            <a href="/auctions/open/${item.id}" class="cv-btn cv-btn--ghost cv-btn--large">Bid in Auction</a>
          </div>
          `}

          <div style="padding:var(--space-4);background:var(--color-surface);border:1px solid var(--color-border-subtle);border-radius:var(--radius-md);">
            <p style="font-size:var(--text-xs);color:var(--color-text-tertiary);line-height:1.7;">
              <strong style="color:var(--color-text-secondary);">Tags:</strong> ${(item.tags || []).join(', ')}
            </p>
          </div>
        </div>
      </div>

      <!-- Like Button - Positioned below the main content -->
      <div class="cv-like-section" style="display:flex;align-items:center;justify-content:center;gap:var(--space-4);margin:var(--space-6) 0;padding:var(--space-4);background:var(--color-surface);border:1px solid var(--color-border-subtle);border-radius:var(--radius-lg);">
        <button id="btn-like" class="cv-like-btn" style="display:flex;align-items:center;gap:var(--space-2);padding:var(--space-3) var(--space-6);background:var(--color-bg);border:1px solid var(--color-border);border-radius:var(--radius-md);cursor:pointer;transition:all 0.2s ease;font-size:var(--text-md);color:var(--color-text-secondary);">
          <span id="like-icon" style="font-size:1.5rem;">♡</span>
          <span id="like-count" style="font-family:var(--font-mono);">0</span>
        </button>
      </div>

      <!-- Comments Section - Full width below -->
      <div class="cv-comments-section" style="background:var(--color-surface);border:1px solid var(--color-border-subtle);border-radius:var(--radius-lg);padding:var(--space-6);">
        <h3 style="font-family:var(--font-display);font-size:var(--text-lg);font-weight:600;color:var(--color-text-primary);margin-bottom:var(--space-4);">
          Comments <span id="comment-count" style="font-weight:400;color:var(--color-text-tertiary);">(0)</span>
        </h3>

        <!-- Add Comment Form -->
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

        <!-- Comments List with Pagination -->
        <div id="comments-list" style="display:flex;flex-direction:column;gap:var(--space-4);">
          <p id="no-comments" style="font-size:var(--text-sm);color:var(--color-text-tertiary);text-align:center;padding:var(--space-6);">No comments yet. Be the first to share your thoughts!</p>
        </div>
        
        <!-- Comment Pagination -->
        <div id="comment-pagination" style="display:none;margin-top:var(--space-4);padding-top:var(--space-4);border-top:1px solid var(--color-border-subtle);">
          <div style="display:flex;align-items:center;justify-content:center;gap:var(--space-4);font-size:var(--text-sm);">
            <button type="button" id="btn-prev-comments" class="cv-btn cv-btn--ghost cv-btn--small" disabled>Previous</button>
            <span id="comment-page-info" style="color:var(--color-text-tertiary);">Page 1 / 1</span>
            <button type="button" id="btn-next-comments" class="cv-btn cv-btn--ghost cv-btn--small" disabled>Next</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function mount({ id }) {
  const item = getCatalogItem(id);
  if (!item) return;
  const ownedCopy = getCollectionItem(item.id);

  // Anti-right-click on the entire detail area
  const imageWrap = document.querySelector('.cv-detail__image-wrap');
  if (imageWrap) {
    imageWrap.addEventListener('contextmenu', (e) => e.preventDefault());
    imageWrap.addEventListener('dragstart', (e) => e.preventDefault());
  }

  document.getElementById('btn-acquire')?.addEventListener('click', () => {
    if (ownedCopy) {
      navigate('/dashboard/buyer');
      return;
    }
    if (!isLoggedIn()) {
      navigate('/login');
      return;
    }
    setCart({ itemId: item.id, title: item.title, artist: item.artist, price: item.price, license: 'personal', color: item.color });
    navigate(`/checkout/${item.id}`);
  });

  // ─── Like Functionality ─────────────────────────────────────
  const likeBtn = document.getElementById('btn-like');
  const likeIcon = document.getElementById('like-icon');
  const likeCountEl = document.getElementById('like-count');
  let hasLiked = false;

  async function loadLikeStatus() {
    try {
      const headers = {};
      const token = getAuthToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const res = await fetch(`/api/likes/${id}`, { headers });
      const data = await res.json();
      
      likeCountEl.textContent = data.likeCount || 0;
      hasLiked = data.hasLiked;
      updateLikeUI();
    } catch (err) {
      console.error('Failed to load like status:', err);
    }
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

  likeBtn?.addEventListener('click', async () => {
    if (!isLoggedIn()) {
      alert('Authentication required');
      navigate('/login');
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) {
        alert('Authentication required');
        navigate('/login');
        return;
      }
      const res = await fetch(`/api/likes/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Authentication required');
        if (res.status === 401) navigate('/login');
        return;
      }
      
      const data = await res.json();
      hasLiked = data.liked;
      likeCountEl.textContent = data.likeCount;
      updateLikeUI();
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  });

  loadLikeStatus();

  // ─── Comment Functionality ──────────────────────────────────
  const commentForm = document.getElementById('comment-form');
  const commentInput = document.getElementById('comment-input');
  const charCount = document.getElementById('char-count');
  const commentCountEl = document.getElementById('comment-count');
  const commentsList = document.getElementById('comments-list');
  const noComments = document.getElementById('no-comments');
  const loginPrompt = document.getElementById('comment-login-prompt');
  const commentBtn = document.getElementById('btn-comment');

  // Show/hide comment form based on login status
  if (!isLoggedIn()) {
    commentForm.style.display = 'none';
    loginPrompt.style.display = 'block';
  }

  // Character counter
  commentInput?.addEventListener('input', () => {
    const len = commentInput.value.length;
    charCount.textContent = `${len}/1000`;
    charCount.style.color = len > 900 ? '#e05252' : 'var(--color-text-tertiary)';
  });

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
      <div class="cv-comment" data-id="${comment.id}" style="padding:var(--space-4);background:var(--color-surface);border:1px solid var(--color-border-subtle);border-radius:var(--radius-md);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:var(--space-2);">
          <div>
            <span style="font-weight:600;color:var(--color-text-primary);font-size:var(--text-sm);">${comment.user_name}</span>
            <span style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-left:var(--space-2);">${formatTimeAgo(comment.created_at)}</span>
            ${comment.edited ? '<span style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-left:var(--space-1);">(edited)</span>' : ''}
          </div>
          ${isOwner ? `
            <button class="btn-delete-comment" data-id="${comment.id}" style="background:none;border:none;color:var(--color-text-tertiary);cursor:pointer;font-size:var(--text-xs);padding:var(--space-1);" title="Delete comment">✕</button>
          ` : ''}
        </div>
        <p style="font-size:var(--text-sm);color:var(--color-text-secondary);line-height:1.6;white-space:pre-wrap;">${escapeHtml(comment.content)}</p>
      </div>
    `;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  const COMMENTS_PER_PAGE = 5;
  let allComments = [];
  let commentPage = 1;

  const paginationEl = document.getElementById('comment-pagination');
  const pageInfoEl = document.getElementById('comment-page-info');
  const prevBtn = document.getElementById('btn-prev-comments');
  const nextBtn = document.getElementById('btn-next-comments');

  function renderCommentsPage() {
    const totalPages = Math.max(1, Math.ceil(allComments.length / COMMENTS_PER_PAGE));
    commentPage = Math.min(Math.max(1, commentPage), totalPages);
    
    const start = (commentPage - 1) * COMMENTS_PER_PAGE;
    const pageComments = allComments.slice(start, start + COMMENTS_PER_PAGE);
    
    if (allComments.length === 0) {
      noComments.style.display = 'block';
      commentsList.innerHTML = '';
      commentsList.appendChild(noComments);
      paginationEl.style.display = 'none';
    } else {
      noComments.style.display = 'none';
      commentsList.innerHTML = pageComments.map(renderComment).join('');
      
      if (allComments.length > COMMENTS_PER_PAGE) {
        paginationEl.style.display = 'block';
        pageInfoEl.textContent = `Page ${commentPage} / ${totalPages}`;
        prevBtn.disabled = commentPage <= 1;
        nextBtn.disabled = commentPage >= totalPages;
      } else {
        paginationEl.style.display = 'none';
      }
      
      bindDeleteHandlers();
    }
  }

  function bindDeleteHandlers() {
    commentsList.querySelectorAll('.btn-delete-comment').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this comment?')) return;
        
        const commentId = btn.dataset.id;
        const token = getAuthToken();
        if (!token) {
          alert('Authentication required');
          navigate('/login');
          return;
        }
        
        try {
          const res = await fetch(`/api/comments/${id}/${commentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
          });
          
          if (res.ok) {
            commentPage = Math.max(1, commentPage);
            await loadComments();
          } else {
            const data = await res.json().catch(() => ({}));
            alert(data.error || 'Failed to delete comment');
            if (res.status === 401) navigate('/login');
          }
        } catch (err) {
          console.error('Failed to delete comment:', err);
          alert('Failed to delete comment');
        }
      });
    });
  }

  prevBtn?.addEventListener('click', () => {
    commentPage--;
    renderCommentsPage();
  });

  nextBtn?.addEventListener('click', () => {
    commentPage++;
    renderCommentsPage();
  });

  async function loadComments() {
    try {
      const res = await fetch(`/api/comments/${id}`);
      const data = await res.json();
      allComments = Array.isArray(data) ? data : [];
      
      commentCountEl.textContent = `(${allComments.length})`;
      renderCommentsPage();
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  }

  commentForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!isLoggedIn()) {
      alert('Authentication required');
      navigate('/login');
      return;
    }
    
    const content = commentInput.value.trim();
    if (!content) return;
    
    const token = getAuthToken();
    if (!token) {
      alert('Authentication required');
      navigate('/login');
      return;
    }
    
    commentBtn.disabled = true;
    commentBtn.textContent = 'Posting...';
    
    try {
      const res = await fetch(`/api/comments/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });
      
      if (res.ok) {
        commentInput.value = '';
        charCount.textContent = '0/1000';
        commentPage = 1;
        await loadComments();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to post comment');
        if (res.status === 401) navigate('/login');
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
      alert('Failed to post comment');
    } finally {
      commentBtn.disabled = false;
      commentBtn.textContent = 'Post Comment';
    }
  });

  loadComments();
}
