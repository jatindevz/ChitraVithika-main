"use client";

import { useEffect, useState } from "react";
import { getAdminStats, getAuthToken, login, type AdminStats } from "@/lib/api";

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(amount);
}

function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function StatusDot({ type }: { type: string }) {
    const cls = type === "up" || type === "live" ? "glow-dot-live" : type === "pending" ? "glow-dot-pending" : type === "flagged" ? "glow-dot-flagged" : "glow-dot-live";
    return <span className={`glow-dot ${cls}`} />;
}

function LoginForm({ onLogin }: { onLogin: () => void }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const data = await login(email, password);
            if (data.user?.role !== "admin") {
                setError("Admin access required");
                return;
            }
            onLogin();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#050505]">
            <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-8 w-full max-w-md">
                <div className="text-center mb-6">
                    <div className="w-12 h-12 rounded-lg bg-[#c8a96e]/20 flex items-center justify-center text-[#c8a96e] text-xl font-bold mx-auto mb-4">
                        CV
                    </div>
                    <h1 className="text-xl font-semibold text-[#e8e5e0]">Admin Login</h1>
                    <p className="text-xs text-[#6a6560] mt-1">ChitraVithika Command Center</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs text-[#6a6560] mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 bg-[#0e0e0e] border border-white/[0.06] rounded-lg text-[#e8e5e0] text-sm focus:outline-none focus:border-[#c8a96e]/30"
                            placeholder="admin@chitravithika.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-[#6a6560] mb-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 bg-[#0e0e0e] border border-white/[0.06] rounded-lg text-[#e8e5e0] text-sm focus:outline-none focus:border-[#c8a96e]/30"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    {error && (
                        <div className="text-xs text-[#ff2d55] bg-[#ff2d55]/10 px-3 py-2 rounded-lg">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 bg-[#c8a96e] text-[#0a0a0a] font-semibold rounded-lg text-sm hover:bg-[#d4b87a] transition-colors disabled:opacity-50"
                    >
                        {loading ? "Signing in..." : "Sign In"}
                    </button>
                </form>
            </div>
        </div>
    );
}

function LoadingState() {
    return (
        <div className="p-6 space-y-6 max-w-[1600px]">
            <div className="flex items-center justify-center h-64">
                <div className="text-[#6a6560]">Loading dashboard...</div>
            </div>
        </div>
    );
}

function Dashboard({ stats }: { stats: AdminStats }) {
    const kpiCards = [
        { label: "Total Users", value: stats.users.total.toString(), sub: `${stats.users.activeIn24h} active (24h)`, changeType: "up" as const },
        { label: "Photographers", value: stats.users.photographers.toString(), changeType: "neutral" as const },
        { label: "Buyers", value: stats.users.buyers.toString(), changeType: "neutral" as const },
        { label: "Total Photos", value: stats.photos.total.toString(), sub: `${stats.photos.totalLikes} likes, ${stats.photos.totalComments} comments`, changeType: "up" as const },
        { label: "Total Auctions", value: stats.auctions.total.toString(), sub: `${stats.auctions.live} live`, changeType: "live" as const },
        { label: "Auctions Sold", value: stats.auctions.sold.toString(), changeType: "up" as const },
        { label: "Total Bids", value: stats.auctions.totalBids.toString(), sub: `${stats.auctions.acceptedBids} accepted`, changeType: "neutral" as const },
        { label: "Total Revenue", value: formatCurrency(stats.auctions.totalRevenue), changeType: "up" as const },
    ];

    return (
        <div className="p-6 space-y-6 max-w-[1600px]">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-[#e8e5e0] tracking-tight">The Nexus</h1>
                    <p className="text-xs text-[#6a6560] mt-0.5">Global Platform Overview — Real-time Data</p>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-data text-[#6a6560]">
                    <span className="glow-dot glow-dot-live" />
                    <span className="text-[#00ff88]">CONNECTED TO DATABASE</span>
                    <span className="mx-2 text-white/10">|</span>
                    <span>{new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })}</span>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-4 gap-3">
                {kpiCards.map((card) => (
                    <div
                        key={card.label}
                        className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-4 hover:border-[#c8a96e]/20 transition-colors"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#6a6560]">
                                {card.label}
                            </span>
                            <StatusDot type={card.changeType} />
                        </div>
                        <div className="text-2xl font-semibold text-[#e8e5e0] font-data">{card.value}</div>
                        {"sub" in card && card.sub && (
                            <div className="text-[11px] mt-1 text-[#6a6560]">{card.sub}</div>
                        )}
                    </div>
                ))}
            </div>

            {/* Engagement Stats */}
            <div className="grid grid-cols-3 gap-4">
                {/* Most Liked */}
                <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-lg">❤️</span>
                        <h2 className="text-sm font-semibold text-[#e8e5e0]">Most Liked Photos</h2>
                    </div>
                    <div className="space-y-3">
                        {stats.photos.mostLiked.length === 0 ? (
                            <p className="text-xs text-[#6a6560]">No likes yet</p>
                        ) : (
                            stats.photos.mostLiked.slice(0, 5).map((photo, i) => (
                                <div key={photo.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-[#6a6560] w-4">{i + 1}.</span>
                                        <div>
                                            <div className="text-[12px] text-[#e8e5e0] font-medium truncate max-w-[150px]">{photo.title}</div>
                                            <div className="text-[10px] text-[#6a6560]">{photo.artist}</div>
                                        </div>
                                    </div>
                                    <div className="text-[13px] font-data text-[#ff6b6b] font-semibold">
                                        ♥ {photo.likeCount}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Least Liked */}
                <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-lg">📉</span>
                        <h2 className="text-sm font-semibold text-[#e8e5e0]">Least Engaged Photos</h2>
                    </div>
                    <div className="space-y-3">
                        {stats.photos.leastLiked.length === 0 ? (
                            <p className="text-xs text-[#6a6560]">No data</p>
                        ) : (
                            stats.photos.leastLiked.slice(0, 5).map((photo, i) => (
                                <div key={photo.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-[#6a6560] w-4">{i + 1}.</span>
                                        <div>
                                            <div className="text-[12px] text-[#e8e5e0] font-medium truncate max-w-[150px]">{photo.title}</div>
                                            <div className="text-[10px] text-[#6a6560]">{photo.artist}</div>
                                        </div>
                                    </div>
                                    <div className="text-[13px] font-data text-[#8a8580] font-semibold">
                                        ♥ {photo.likeCount}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Most Commented */}
                <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-lg">💬</span>
                        <h2 className="text-sm font-semibold text-[#e8e5e0]">Most Commented</h2>
                    </div>
                    <div className="space-y-3">
                        {stats.photos.mostCommented.length === 0 ? (
                            <p className="text-xs text-[#6a6560]">No comments yet</p>
                        ) : (
                            stats.photos.mostCommented.slice(0, 5).map((photo, i) => (
                                <div key={photo.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-[#6a6560] w-4">{i + 1}.</span>
                                        <div>
                                            <div className="text-[12px] text-[#e8e5e0] font-medium truncate max-w-[150px]">{photo.title}</div>
                                            <div className="text-[10px] text-[#6a6560]">{photo.artist}</div>
                                        </div>
                                    </div>
                                    <div className="text-[13px] font-data text-[#00ff88] font-semibold">
                                        💬 {photo.commentCount}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-2 gap-4">
                {/* Recent Users */}
                <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="text-lg">👥</span>
                        <h2 className="text-sm font-semibold text-[#e8e5e0]">Recent Users</h2>
                    </div>
                    <div className="space-y-3">
                        {stats.users.recent.map((user) => (
                            <div key={user.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#c8a96e]/20 flex items-center justify-center text-[10px] font-bold text-[#c8a96e]">
                                        {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                    </div>
                                    <div>
                                        <div className="text-[12px] text-[#e8e5e0] font-medium">{user.name}</div>
                                        <div className="text-[10px] text-[#6a6560]">{user.email}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wider uppercase ${
                                        user.role === 'admin' ? 'bg-[#ff2d55]/10 text-[#ff2d55]' :
                                        user.role === 'photographer' ? 'bg-[#c8a96e]/10 text-[#c8a96e]' :
                                        'bg-[#00ff88]/10 text-[#00ff88]'
                                    }`}>
                                        {user.role}
                                    </div>
                                    <div className="text-[9px] text-[#6a6560] mt-1">{timeAgo(user.created_at)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Bids */}
                <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="glow-dot glow-dot-live" />
                        <h2 className="text-sm font-semibold text-[#e8e5e0]">Recent Bids</h2>
                    </div>
                    <div className="space-y-3">
                        {stats.auctions.recentBids.length === 0 ? (
                            <p className="text-xs text-[#6a6560]">No bids yet</p>
                        ) : (
                            stats.auctions.recentBids.slice(0, 6).map((bid) => (
                                <div key={bid.id} className="flex items-start justify-between py-2 border-b border-white/[0.04] last:border-0">
                                    <div>
                                        <div className="text-[12px] text-[#e8e5e0] font-medium">Auction #{bid.auction_id}</div>
                                        <div className="text-[10px] text-[#6a6560] mt-0.5">{bid.user_name}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-[13px] font-data font-semibold ${bid.accepted ? 'text-[#00ff88]' : 'text-[#c8a96e]'}`}>
                                            {formatCurrency(bid.amount)}
                                        </div>
                                        <div className="text-[9px] text-[#6a6560] font-data">{timeAgo(bid.placed_at)}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* User Breakdown */}
            <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-5">
                <h2 className="text-sm font-semibold text-[#e8e5e0] mb-4">User Breakdown</h2>
                <div className="grid grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-[#0e0e0e] rounded-lg">
                        <div className="text-3xl font-data text-[#c8a96e] font-bold">{stats.users.total}</div>
                        <div className="text-[10px] text-[#6a6560] mt-1 uppercase tracking-wider">Total Users</div>
                    </div>
                    <div className="text-center p-4 bg-[#0e0e0e] rounded-lg">
                        <div className="text-3xl font-data text-[#00ff88] font-bold">{stats.users.buyers}</div>
                        <div className="text-[10px] text-[#6a6560] mt-1 uppercase tracking-wider">Buyers</div>
                    </div>
                    <div className="text-center p-4 bg-[#0e0e0e] rounded-lg">
                        <div className="text-3xl font-data text-[#ff6b6b] font-bold">{stats.users.photographers}</div>
                        <div className="text-[10px] text-[#6a6560] mt-1 uppercase tracking-wider">Photographers</div>
                    </div>
                    <div className="text-center p-4 bg-[#0e0e0e] rounded-lg">
                        <div className="text-3xl font-data text-[#7c4dff] font-bold">{stats.users.admins}</div>
                        <div className="text-[10px] text-[#6a6560] mt-1 uppercase tracking-wider">Admins</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        const token = getAuthToken();
        if (token) {
            loadStats();
        } else {
            setIsLoading(false);
        }
    }, []);

    const loadStats = async () => {
        try {
            const data = await getAdminStats();
            setStats(data);
            setIsAuthenticated(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load stats");
            setIsAuthenticated(false);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <LoadingState />;
    }

    if (!isAuthenticated) {
        return <LoginForm onLogin={loadStats} />;
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-[#ff2d55]/10 border border-[#ff2d55]/30 rounded-lg p-4 text-[#ff2d55]">
                    {error}
                </div>
            </div>
        );
    }

    if (!stats) {
        return <LoadingState />;
    }

    return <Dashboard stats={stats} />;
}
