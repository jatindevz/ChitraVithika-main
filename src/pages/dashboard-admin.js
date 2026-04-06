/**
 * ChitraVithika — Admin Dashboard
 * Route: /dashboard/admin
 *
 * Features:
 *   - Platform statistics overview
 *   - User management (view, delete)
 *   - Photo management (view, delete)
 *   - Engagement stats (most liked, most commented)
 *   - Auction stats
 */
import { isLoggedIn, currentUser, getAuthToken } from '../js/state.js';
import { navigate } from '../js/router.js';

let statsData = null;
let usersData = null;
let photosData = null;
let activeTab = 'overview';

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
}

function timeAgo(iso) {
    if (!iso) return 'Never';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
}

export function render() {
    const user = currentUser();
    
    if (!isLoggedIn() || user?.role !== 'admin') {
        return `
            <div class="cv-page-message">
                <h1 class="cv-page-message__title">Access Denied</h1>
                <p class="cv-page-message__text">Admin access required.</p>
                <a href="/login" class="cv-page-message__link">Sign In</a>
            </div>
        `;
    }

    return `
        <div class="cv-page-container cv-page-container--wide">
            <div class="cv-page-header">
                <p class="cv-page-header__eyebrow">COMMAND CENTER</p>
                <h1 class="cv-page-header__title">Admin Dashboard</h1>
                <p class="cv-page-header__subtitle">Platform overview and management</p>
            </div>

            <!-- Tabs -->
            <div class="cv-admin-tabs" style="display:flex;gap:var(--space-2);margin-bottom:var(--space-8);border-bottom:1px solid var(--color-border);">
                <button class="cv-admin-tab active" data-tab="overview" style="padding:var(--space-3) var(--space-4);background:none;border:none;border-bottom:2px solid transparent;color:var(--color-text-secondary);font-size:var(--text-sm);cursor:pointer;transition:all 0.2s;">Overview</button>
                <button class="cv-admin-tab" data-tab="users" style="padding:var(--space-3) var(--space-4);background:none;border:none;border-bottom:2px solid transparent;color:var(--color-text-secondary);font-size:var(--text-sm);cursor:pointer;transition:all 0.2s;">Users</button>
                <button class="cv-admin-tab" data-tab="photos" style="padding:var(--space-3) var(--space-4);background:none;border:none;border-bottom:2px solid transparent;color:var(--color-text-secondary);font-size:var(--text-sm);cursor:pointer;transition:all 0.2s;">Photos</button>
                <button class="cv-admin-tab" data-tab="engagement" style="padding:var(--space-3) var(--space-4);background:none;border:none;border-bottom:2px solid transparent;color:var(--color-text-secondary);font-size:var(--text-sm);cursor:pointer;transition:all 0.2s;">Engagement</button>
            </div>

            <!-- Tab Content -->
            <div id="admin-content">
                <div style="text-align:center;padding:var(--space-12);color:var(--color-text-tertiary);">
                    Loading dashboard data...
                </div>
            </div>
        </div>
    `;
}

function renderOverview(stats) {
    if (!stats) return '<div style="text-align:center;padding:var(--space-8);color:var(--color-text-tertiary);">Loading...</div>';

    return `
        <!-- Stats Grid -->
        <div class="cv-stats-row" style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--space-4);margin-bottom:var(--space-8);">
            <div class="cv-stat-card" style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:var(--space-5);text-align:center;">
                <div style="font-size:var(--text-3xl);font-weight:700;color:var(--color-accent);font-family:var(--font-mono);">${stats.users.total}</div>
                <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:0.1em;margin-top:var(--space-1);">Total Users</div>
            </div>
            <div class="cv-stat-card" style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:var(--space-5);text-align:center;">
                <div style="font-size:var(--text-3xl);font-weight:700;color:#00ff88;font-family:var(--font-mono);">${stats.photos.total}</div>
                <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:0.1em;margin-top:var(--space-1);">Total Photos</div>
            </div>
            <div class="cv-stat-card" style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:var(--space-5);text-align:center;">
                <div style="font-size:var(--text-3xl);font-weight:700;color:#ff6b6b;font-family:var(--font-mono);">${stats.auctions.sold}</div>
                <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:0.1em;margin-top:var(--space-1);">Auctions Sold</div>
            </div>
            <div class="cv-stat-card" style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:var(--space-5);text-align:center;">
                <div style="font-size:var(--text-3xl);font-weight:700;color:#7c4dff;font-family:var(--font-mono);">${formatCurrency(stats.auctions.totalRevenue)}</div>
                <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:0.1em;margin-top:var(--space-1);">Total Revenue</div>
            </div>
        </div>

        <!-- Second Row Stats -->
        <div class="cv-stats-row" style="display:grid;grid-template-columns:repeat(5,1fr);gap:var(--space-4);margin-bottom:var(--space-8);">
            <div class="cv-stat-card" style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:var(--space-5);text-align:center;">
                <div style="font-size:var(--text-2xl);font-weight:700;color:var(--color-text-primary);font-family:var(--font-mono);">${stats.users.photographers}</div>
                <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:0.1em;margin-top:var(--space-1);">Photographers</div>
            </div>
            <div class="cv-stat-card" style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:var(--space-5);text-align:center;">
                <div style="font-size:var(--text-2xl);font-weight:700;color:var(--color-text-primary);font-family:var(--font-mono);">${stats.users.buyers}</div>
                <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:0.1em;margin-top:var(--space-1);">Buyers</div>
            </div>
            <div class="cv-stat-card" style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:var(--space-5);text-align:center;">
                <div style="font-size:var(--text-2xl);font-weight:700;color:var(--color-text-primary);font-family:var(--font-mono);">${stats.auctions.live}</div>
                <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:0.1em;margin-top:var(--space-1);">Live Auctions</div>
            </div>
            <div class="cv-stat-card" style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:var(--space-5);text-align:center;">
                <div style="font-size:var(--text-2xl);font-weight:700;color:var(--color-text-primary);font-family:var(--font-mono);">${stats.auctions.totalBids}</div>
                <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:0.1em;margin-top:var(--space-1);">Total Bids</div>
            </div>
            <div class="cv-stat-card" style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:var(--space-5);text-align:center;">
                <div style="font-size:var(--text-2xl);font-weight:700;color:var(--color-accent);font-family:var(--font-mono);">${stats.auctions.pendingSellerBids ?? 0}</div>
                <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:0.1em;margin-top:var(--space-1);">Pending sealed</div>
            </div>
        </div>

        <!-- Recent Activity -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-6);">
            <!-- Recent Users -->
            <div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:var(--space-5);">
                <h3 style="font-family:var(--font-display);font-size:var(--text-md);font-weight:600;color:var(--color-text-primary);margin-bottom:var(--space-4);">Recent Users</h3>
                <div style="display:flex;flex-direction:column;gap:var(--space-3);">
                    ${stats.users.recent.length === 0 ? '<p style="color:var(--color-text-tertiary);font-size:var(--text-sm);">No users yet</p>' : 
                    stats.users.recent.map(u => `
                        <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-2) 0;border-bottom:1px solid var(--color-border-subtle);">
                            <div>
                                <div style="font-size:var(--text-sm);color:var(--color-text-primary);font-weight:500;">${u.name}</div>
                                <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${u.email}</div>
                            </div>
                            <span style="padding:2px 8px;border-radius:999px;font-size:10px;font-weight:600;text-transform:uppercase;${
                                u.role === 'admin' ? 'background:rgba(124,77,255,0.15);color:#7c4dff;' :
                                u.role === 'photographer' ? 'background:rgba(200,169,110,0.15);color:#c8a96e;' :
                                'background:rgba(0,255,136,0.15);color:#00ff88;'
                            }">${u.role}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Recent Bids -->
            <div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:var(--space-5);">
                <h3 style="font-family:var(--font-display);font-size:var(--text-md);font-weight:600;color:var(--color-text-primary);margin-bottom:var(--space-4);">Recent Bids</h3>
                <div style="display:flex;flex-direction:column;gap:var(--space-3);">
                    ${stats.auctions.recentBids.length === 0 ? '<p style="color:var(--color-text-tertiary);font-size:var(--text-sm);">No bids yet</p>' :
                    stats.auctions.recentBids.slice(0, 5).map(b => `
                        <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-2) 0;border-bottom:1px solid var(--color-border-subtle);">
                            <div>
                                <div style="font-size:var(--text-sm);color:var(--color-text-primary);">Auction #${b.auction_id}</div>
                                <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${b.user_name} • ${timeAgo(b.placed_at)}</div>
                            </div>
                            <span style="font-family:var(--font-mono);font-size:var(--text-sm);color:${b.accepted ? '#00ff88' : 'var(--color-accent)'};">${formatCurrency(b.amount)}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function renderUsers(users) {
    if (!users) return '<div style="text-align:center;padding:var(--space-8);color:var(--color-text-tertiary);">Loading...</div>';

    return `
        <div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);overflow:hidden;">
            <table style="width:100%;border-collapse:collapse;">
                <thead>
                    <tr style="border-bottom:1px solid var(--color-border);">
                        <th style="text-align:left;padding:var(--space-3) var(--space-4);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:var(--color-text-tertiary);">User</th>
                        <th style="text-align:left;padding:var(--space-3) var(--space-4);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:var(--color-text-tertiary);">Role</th>
                        <th style="text-align:left;padding:var(--space-3) var(--space-4);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:var(--color-text-tertiary);">Joined</th>
                        <th style="text-align:right;padding:var(--space-3) var(--space-4);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:var(--color-text-tertiary);">Photos</th>
                        <th style="text-align:right;padding:var(--space-3) var(--space-4);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:var(--color-text-tertiary);">Bids</th>
                        <th style="text-align:right;padding:var(--space-3) var(--space-4);font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:var(--color-text-tertiary);">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(u => `
                        <tr style="border-bottom:1px solid var(--color-border-subtle);" data-user-id="${u.id}">
                            <td style="padding:var(--space-3) var(--space-4);">
                                <div style="font-size:var(--text-sm);color:var(--color-text-primary);font-weight:500;">${u.name}</div>
                                <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${u.email}</div>
                            </td>
                            <td style="padding:var(--space-3) var(--space-4);">
                                <span style="padding:2px 8px;border-radius:999px;font-size:10px;font-weight:600;text-transform:uppercase;${
                                    u.role === 'admin' ? 'background:rgba(124,77,255,0.15);color:#7c4dff;' :
                                    u.role === 'photographer' ? 'background:rgba(200,169,110,0.15);color:#c8a96e;' :
                                    'background:rgba(0,255,136,0.15);color:#00ff88;'
                                }">${u.role}</span>
                            </td>
                            <td style="padding:var(--space-3) var(--space-4);font-size:var(--text-xs);color:var(--color-text-tertiary);">${timeAgo(u.created_at)}</td>
                            <td style="padding:var(--space-3) var(--space-4);text-align:right;font-family:var(--font-mono);font-size:var(--text-sm);color:var(--color-text-primary);">${u.stats.photos}</td>
                            <td style="padding:var(--space-3) var(--space-4);text-align:right;font-family:var(--font-mono);font-size:var(--text-sm);color:var(--color-text-primary);">${u.stats.bids}</td>
                            <td style="padding:var(--space-3) var(--space-4);text-align:right;">
                                ${u.role !== 'admin' ? `
                                    <button class="btn-delete-user" data-user-id="${u.id}" data-user-name="${u.name}" style="padding:4px 12px;background:rgba(224,82,82,0.1);border:1px solid rgba(224,82,82,0.3);border-radius:var(--radius-sm);color:#e05252;font-size:11px;cursor:pointer;transition:all 0.2s;">Delete</button>
                                ` : '<span style="font-size:11px;color:var(--color-text-tertiary);">Protected</span>'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderPhotos(photos) {
    if (!photos) return '<div style="text-align:center;padding:var(--space-8);color:var(--color-text-tertiary);">Loading...</div>';

    return `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:var(--space-4);">
            ${photos.map(p => `
                <div class="cv-admin-photo-card" data-photo-id="${p.id}" style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);overflow:hidden;">
                    <div style="aspect-ratio:16/9;background:linear-gradient(135deg,${p.color || '#333'}44,var(--color-gradient-end));position:relative;">
                        <img src="/api/image-preview/${p.id}" alt="${p.title}" style="width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 0.3s;" onload="this.style.opacity='1'" onerror="this.style.display='none'" />
                    </div>
                    <div style="padding:var(--space-4);">
                        <h4 style="font-size:var(--text-sm);font-weight:600;color:var(--color-text-primary);margin-bottom:var(--space-1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.title}</h4>
                        <p style="font-size:var(--text-xs);color:var(--color-text-tertiary);margin-bottom:var(--space-3);">by ${p.artist}</p>
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <div style="display:flex;gap:var(--space-3);">
                                <span style="font-size:var(--text-xs);color:#ff6b6b;">♥ ${p.engagement?.likes || 0}</span>
                                <span style="font-size:var(--text-xs);color:#00ff88;">💬 ${p.engagement?.comments || 0}</span>
                            </div>
                            <button class="btn-delete-photo" data-photo-id="${p.id}" data-photo-title="${p.title}" style="padding:4px 10px;background:rgba(224,82,82,0.1);border:1px solid rgba(224,82,82,0.3);border-radius:var(--radius-sm);color:#e05252;font-size:10px;cursor:pointer;">Delete</button>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
        ${photos.length === 0 ? '<p style="text-align:center;padding:var(--space-8);color:var(--color-text-tertiary);">No photos uploaded yet</p>' : ''}
    `;
}

function renderEngagement(stats) {
    if (!stats) return '<div style="text-align:center;padding:var(--space-8);color:var(--color-text-tertiary);">Loading...</div>';

    return `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-6);">
            <!-- Most Liked -->
            <div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:var(--space-5);">
                <h3 style="font-family:var(--font-display);font-size:var(--text-md);font-weight:600;color:var(--color-text-primary);margin-bottom:var(--space-4);display:flex;align-items:center;gap:var(--space-2);">
                    <span style="color:#ff6b6b;">♥</span> Most Liked
                </h3>
                <div style="display:flex;flex-direction:column;gap:var(--space-3);">
                    ${stats.photos.mostLiked.length === 0 ? '<p style="color:var(--color-text-tertiary);font-size:var(--text-sm);">No likes yet</p>' :
                    stats.photos.mostLiked.slice(0, 5).map((p, i) => `
                        <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-2) 0;border-bottom:1px solid var(--color-border-subtle);">
                            <div style="display:flex;align-items:center;gap:var(--space-2);">
                                <span style="font-size:var(--text-xs);color:var(--color-text-tertiary);width:16px;">${i + 1}.</span>
                                <div>
                                    <div style="font-size:var(--text-sm);color:var(--color-text-primary);max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.title}</div>
                                    <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${p.artist}</div>
                                </div>
                            </div>
                            <span style="font-family:var(--font-mono);font-size:var(--text-sm);color:#ff6b6b;font-weight:600;">♥ ${p.likeCount}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Least Liked -->
            <div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:var(--space-5);">
                <h3 style="font-family:var(--font-display);font-size:var(--text-md);font-weight:600;color:var(--color-text-primary);margin-bottom:var(--space-4);display:flex;align-items:center;gap:var(--space-2);">
                    <span style="color:var(--color-text-tertiary);">📉</span> Least Engaged
                </h3>
                <div style="display:flex;flex-direction:column;gap:var(--space-3);">
                    ${stats.photos.leastLiked.length === 0 ? '<p style="color:var(--color-text-tertiary);font-size:var(--text-sm);">No data</p>' :
                    stats.photos.leastLiked.slice(0, 5).map((p, i) => `
                        <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-2) 0;border-bottom:1px solid var(--color-border-subtle);">
                            <div style="display:flex;align-items:center;gap:var(--space-2);">
                                <span style="font-size:var(--text-xs);color:var(--color-text-tertiary);width:16px;">${i + 1}.</span>
                                <div>
                                    <div style="font-size:var(--text-sm);color:var(--color-text-primary);max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.title}</div>
                                    <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${p.artist}</div>
                                </div>
                            </div>
                            <span style="font-family:var(--font-mono);font-size:var(--text-sm);color:var(--color-text-tertiary);">♥ ${p.likeCount}</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Most Commented -->
            <div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-lg);padding:var(--space-5);">
                <h3 style="font-family:var(--font-display);font-size:var(--text-md);font-weight:600;color:var(--color-text-primary);margin-bottom:var(--space-4);display:flex;align-items:center;gap:var(--space-2);">
                    <span style="color:#00ff88;">💬</span> Most Commented
                </h3>
                <div style="display:flex;flex-direction:column;gap:var(--space-3);">
                    ${stats.photos.mostCommented.length === 0 ? '<p style="color:var(--color-text-tertiary);font-size:var(--text-sm);">No comments yet</p>' :
                    stats.photos.mostCommented.slice(0, 5).map((p, i) => `
                        <div style="display:flex;justify-content:space-between;align-items:center;padding:var(--space-2) 0;border-bottom:1px solid var(--color-border-subtle);">
                            <div style="display:flex;align-items:center;gap:var(--space-2);">
                                <span style="font-size:var(--text-xs);color:var(--color-text-tertiary);width:16px;">${i + 1}.</span>
                                <div>
                                    <div style="font-size:var(--text-sm);color:var(--color-text-primary);max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.title}</div>
                                    <div style="font-size:var(--text-xs);color:var(--color-text-tertiary);">${p.artist}</div>
                                </div>
                            </div>
                            <span style="font-family:var(--font-mono);font-size:var(--text-sm);color:#00ff88;font-weight:600;">💬 ${p.commentCount}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

export function mount() {
    const user = currentUser();
    if (!isLoggedIn() || user?.role !== 'admin') {
        navigate('/login');
        return;
    }

    const contentEl = document.getElementById('admin-content');
    const tabs = document.querySelectorAll('.cv-admin-tab');

    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => {
                t.classList.remove('active');
                t.style.borderBottomColor = 'transparent';
                t.style.color = 'var(--color-text-secondary)';
            });
            tab.classList.add('active');
            tab.style.borderBottomColor = 'var(--color-accent)';
            tab.style.color = 'var(--color-accent)';
            activeTab = tab.dataset.tab;
            renderContent();
        });

        // Set initial active state
        if (tab.dataset.tab === activeTab) {
            tab.style.borderBottomColor = 'var(--color-accent)';
            tab.style.color = 'var(--color-accent)';
        }
    });

    async function loadData() {
        const token = getAuthToken();
        const headers = { 'Authorization': `Bearer ${token}` };

        try {
            const [stats, users, engagement] = await Promise.all([
                fetch('/api/admin/stats', { headers }).then(r => r.json()),
                fetch('/api/admin/users', { headers }).then(r => r.json()),
                fetch('/api/admin/engagement', { headers }).then(r => r.json()),
            ]);
            
            statsData = stats;
            usersData = users;
            photosData = engagement;
            renderContent();
        } catch (err) {
            console.error('Failed to load admin data:', err);
            contentEl.innerHTML = `<div style="text-align:center;padding:var(--space-8);color:#e05252;">Failed to load data: ${err.message}</div>`;
        }
    }

    function renderContent() {
        switch (activeTab) {
            case 'overview':
                contentEl.innerHTML = renderOverview(statsData);
                break;
            case 'users':
                contentEl.innerHTML = renderUsers(usersData);
                attachUserDeleteHandlers();
                break;
            case 'photos':
                contentEl.innerHTML = renderPhotos(photosData);
                attachPhotoDeleteHandlers();
                break;
            case 'engagement':
                contentEl.innerHTML = renderEngagement(statsData);
                break;
        }
    }

    function attachUserDeleteHandlers() {
        document.querySelectorAll('.btn-delete-user').forEach(btn => {
            btn.addEventListener('click', async () => {
                const userId = btn.dataset.userId;
                const userName = btn.dataset.userName;
                
                if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) return;
                
                btn.disabled = true;
                btn.textContent = 'Deleting...';
                
                try {
                    const token = getAuthToken();
                    const res = await fetch(`/api/admin/users/${userId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` },
                    });
                    
                    if (res.ok) {
                        usersData = usersData.filter(u => u.id !== userId);
                        renderContent();
                    } else {
                        const data = await res.json();
                        alert(data.error || 'Failed to delete user');
                        btn.disabled = false;
                        btn.textContent = 'Delete';
                    }
                } catch (err) {
                    alert('Failed to delete user');
                    btn.disabled = false;
                    btn.textContent = 'Delete';
                }
            });
        });
    }

    function attachPhotoDeleteHandlers() {
        document.querySelectorAll('.btn-delete-photo').forEach(btn => {
            btn.addEventListener('click', async () => {
                const photoId = btn.dataset.photoId;
                const photoTitle = btn.dataset.photoTitle;
                
                if (!confirm(`Are you sure you want to delete "${photoTitle}"? This will also delete associated auctions and bids.`)) return;
                
                btn.disabled = true;
                btn.textContent = 'Deleting...';
                
                try {
                    const token = getAuthToken();
                    const res = await fetch(`/api/admin/photos/${photoId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` },
                    });
                    
                    if (res.ok) {
                        photosData = photosData.filter(p => p.id !== parseInt(photoId));
                        renderContent();
                    } else {
                        const data = await res.json();
                        alert(data.error || 'Failed to delete photo');
                        btn.disabled = false;
                        btn.textContent = 'Delete';
                    }
                } catch (err) {
                    alert('Failed to delete photo');
                    btn.disabled = false;
                    btn.textContent = 'Delete';
                }
            });
        });
    }

    loadData();
}
