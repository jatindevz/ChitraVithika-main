"use client";

import { useEffect, useState } from "react";
import { getAdminUsers, getAuthToken, type UserWithStats } from "@/lib/api";
import { useRouter } from "next/navigation";

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(amount);
}

function timeAgo(iso: string | null): string {
    if (!iso) return "Never";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
}

export default function UserDirectoryPage() {
    const router = useRouter();
    const [users, setUsers] = useState<UserWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState<"all" | "buyer" | "photographer" | "admin">("all");
    const [sortBy, setSortBy] = useState<"created" | "active" | "spent" | "earned">("created");

    useEffect(() => {
        const token = getAuthToken();
        if (!token) {
            router.push("/admin/dashboard");
            return;
        }
        loadUsers();
    }, [router]);

    const loadUsers = async () => {
        try {
            const data = await getAdminUsers();
            setUsers(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users
        .filter(u => filter === "all" || u.role === filter)
        .sort((a, b) => {
            switch (sortBy) {
                case "active":
                    return (new Date(b.last_active || 0).getTime()) - (new Date(a.last_active || 0).getTime());
                case "spent":
                    return b.stats.totalSpent - a.stats.totalSpent;
                case "earned":
                    return b.stats.totalEarned - a.stats.totalEarned;
                default:
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
        });

    const stats = {
        total: users.length,
        buyers: users.filter(u => u.role === "buyer").length,
        photographers: users.filter(u => u.role === "photographer").length,
        admins: users.filter(u => u.role === "admin").length,
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-[#6a6560]">Loading users...</div>
            </div>
        );
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

    return (
        <div className="p-6 space-y-6 max-w-[1600px]">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-[#e8e5e0] tracking-tight">User Directory</h1>
                    <p className="text-xs text-[#6a6560] mt-0.5">Manage all platform users</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-3">
                <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-4">
                    <div className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#6a6560] mb-2">Total Users</div>
                    <div className="text-2xl font-semibold text-[#e8e5e0] font-data">{stats.total}</div>
                </div>
                <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-4">
                    <div className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#6a6560] mb-2">Buyers</div>
                    <div className="text-2xl font-semibold text-[#00ff88] font-data">{stats.buyers}</div>
                </div>
                <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-4">
                    <div className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#6a6560] mb-2">Photographers</div>
                    <div className="text-2xl font-semibold text-[#c8a96e] font-data">{stats.photographers}</div>
                </div>
                <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-4">
                    <div className="text-[10px] font-semibold tracking-[0.1em] uppercase text-[#6a6560] mb-2">Admins</div>
                    <div className="text-2xl font-semibold text-[#7c4dff] font-data">{stats.admins}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-[#6a6560]">Filter:</span>
                    <div className="flex gap-1">
                        {(["all", "buyer", "photographer", "admin"] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                    filter === f
                                        ? "bg-[#c8a96e]/20 text-[#c8a96e]"
                                        : "bg-[#0e0e0e] text-[#6a6560] hover:text-[#e8e5e0]"
                                }`}
                            >
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                    <span className="text-xs text-[#6a6560]">Sort by:</span>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                        className="px-3 py-1.5 bg-[#0e0e0e] border border-white/[0.06] rounded-lg text-xs text-[#e8e5e0] focus:outline-none"
                    >
                        <option value="created">Join Date</option>
                        <option value="active">Last Active</option>
                        <option value="spent">Total Spent</option>
                        <option value="earned">Total Earned</option>
                    </select>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/[0.06]">
                            <th className="text-left px-4 py-3 text-[10px] font-semibold tracking-[0.1em] uppercase text-[#6a6560]">User</th>
                            <th className="text-left px-4 py-3 text-[10px] font-semibold tracking-[0.1em] uppercase text-[#6a6560]">Role</th>
                            <th className="text-left px-4 py-3 text-[10px] font-semibold tracking-[0.1em] uppercase text-[#6a6560]">Activity</th>
                            <th className="text-right px-4 py-3 text-[10px] font-semibold tracking-[0.1em] uppercase text-[#6a6560]">Photos</th>
                            <th className="text-right px-4 py-3 text-[10px] font-semibold tracking-[0.1em] uppercase text-[#6a6560]">Bids</th>
                            <th className="text-right px-4 py-3 text-[10px] font-semibold tracking-[0.1em] uppercase text-[#6a6560]">Likes</th>
                            <th className="text-right px-4 py-3 text-[10px] font-semibold tracking-[0.1em] uppercase text-[#6a6560]">Comments</th>
                            <th className="text-right px-4 py-3 text-[10px] font-semibold tracking-[0.1em] uppercase text-[#6a6560]">Spent</th>
                            <th className="text-right px-4 py-3 text-[10px] font-semibold tracking-[0.1em] uppercase text-[#6a6560]">Earned</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map((user) => (
                            <tr key={user.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[#c8a96e]/20 flex items-center justify-center text-[10px] font-bold text-[#c8a96e]">
                                            {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                        </div>
                                        <div>
                                            <div className="text-[12px] text-[#e8e5e0] font-medium">{user.name}</div>
                                            <div className="text-[10px] text-[#6a6560]">{user.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wider uppercase ${
                                        user.role === 'admin' ? 'bg-[#7c4dff]/10 text-[#7c4dff]' :
                                        user.role === 'photographer' ? 'bg-[#c8a96e]/10 text-[#c8a96e]' :
                                        'bg-[#00ff88]/10 text-[#00ff88]'
                                    }`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="text-[11px] text-[#6a6560]">
                                        <div>Joined {timeAgo(user.created_at)}</div>
                                        <div>Active {timeAgo(user.last_active)}</div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <span className="text-[12px] font-data text-[#e8e5e0]">{user.stats.photos}</span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <span className="text-[12px] font-data text-[#e8e5e0]">{user.stats.bids}</span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <span className="text-[12px] font-data text-[#ff6b6b]">{user.stats.likesGiven}</span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <span className="text-[12px] font-data text-[#00ff88]">{user.stats.comments}</span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <span className="text-[12px] font-data text-[#c8a96e]">
                                        {user.stats.totalSpent > 0 ? formatCurrency(user.stats.totalSpent) : '-'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <span className="text-[12px] font-data text-[#00ff88]">
                                        {user.stats.totalEarned > 0 ? formatCurrency(user.stats.totalEarned) : '-'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredUsers.length === 0 && (
                    <div className="text-center py-8 text-[#6a6560] text-sm">
                        No users found
                    </div>
                )}
            </div>
        </div>
    );
}
