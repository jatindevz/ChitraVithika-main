"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navGroups = [
    {
        label: "Overview",
        items: [
            { href: "/admin/dashboard", label: "The Nexus", icon: "◆" },
        ],
    },
    {
        label: "Curation",
        items: [
            { href: "/admin/curation/applications", label: "Applications", icon: "◎" },
            { href: "/admin/curation/assets", label: "Asset Review", icon: "◫" },
        ],
    },
    {
        label: "Auctions",
        items: [
            { href: "/admin/auctions/live", label: "Live Overwatch", icon: "◉" },
            { href: "/admin/auctions/disputes", label: "Disputes", icon: "⚡" },
        ],
    },
    {
        label: "Finance",
        items: [
            { href: "/admin/finance/ledger", label: "Ledger", icon: "▤" },
            { href: "/admin/finance/payouts", label: "Payouts", icon: "◈" },
        ],
    },
    {
        label: "Security",
        items: [
            { href: "/admin/users/directory", label: "User Directory", icon: "◧" },
            { href: "/admin/security/audit-logs", label: "Audit Logs", icon: "▣" },
        ],
    },
];

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Sidebar */}
            <aside className="w-[240px] min-w-[240px] h-full bg-[#080808] border-r border-white/[0.06] flex flex-col overflow-y-auto">
                {/* Logo */}
                <div className="px-5 py-5 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md bg-[#c8a96e]/20 flex items-center justify-center text-[#c8a96e] text-xs font-bold">
                            CV
                        </div>
                        <div>
                            <div className="text-xs font-semibold tracking-wider text-[#e8e5e0]">
                                COMMAND CENTER
                            </div>
                            <div className="text-[10px] text-[#6a6560] tracking-wider">
                                CHITRAVITHIKA
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 px-3 space-y-5">
                    {navGroups.map((group) => (
                        <div key={group.label}>
                            <div className="px-2 mb-2 text-[10px] font-semibold tracking-[0.15em] uppercase text-[#6a6560]">
                                {group.label}
                            </div>
                            <div className="space-y-0.5">
                                {group.items.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all duration-150 ${isActive
                                                    ? "bg-[#c8a96e]/10 text-[#c8a96e] font-medium"
                                                    : "text-[#8a8580] hover:text-[#e8e5e0] hover:bg-white/[0.04]"
                                                }`}
                                        >
                                            <span className={`text-sm ${isActive ? "text-[#c8a96e]" : "text-[#6a6560]"}`}>
                                                {item.icon}
                                            </span>
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Admin user */}
                <div className="px-4 py-3 border-t border-white/[0.06]">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#c8a96e]/20 flex items-center justify-center text-[10px] font-bold text-[#c8a96e]">
                            AR
                        </div>
                        <div>
                            <div className="text-[11px] font-medium text-[#e8e5e0]">Admin Root</div>
                            <div className="text-[10px] text-[#6a6560]">Super Admin</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-[#050505]">
                {children}
            </main>
        </div>
    );
}
