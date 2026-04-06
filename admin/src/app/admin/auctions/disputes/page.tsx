"use client";

import { useState, useMemo } from "react";
import { disputes, formatCurrency, formatTimestamp, type Dispute, type DisputeStatus } from "@/lib/adminMockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function DisputeStatusBadge({ status }: { status: DisputeStatus }) {
    const styles: Record<DisputeStatus, string> = {
        open: "bg-[#ff2d55]/10 text-[#ff2d55]",
        investigating: "bg-[#ffa500]/10 text-[#ffa500]",
        resolved: "bg-[#00ff88]/10 text-[#00ff88]",
        escalated: "bg-[#ff2d55]/15 text-[#ff2d55] border border-[#ff2d55]/30",
    };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${styles[status]}`}>{status}</span>;
}

type SortKey = "filedAt" | "amount" | "status";

export default function DisputesPage() {
    const [filter, setFilter] = useState<DisputeStatus | "all">("all");
    const [sortKey, setSortKey] = useState<SortKey>("filedAt");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [localDisputes, setLocalDisputes] = useState(disputes);

    const filtered = useMemo(() => {
        let list = filter === "all" ? localDisputes : localDisputes.filter(d => d.status === filter);
        list = [...list].sort((a, b) => {
            let cmp = 0;
            if (sortKey === "filedAt") cmp = new Date(a.filedAt).getTime() - new Date(b.filedAt).getTime();
            else if (sortKey === "amount") cmp = a.amount - b.amount;
            else cmp = a.status.localeCompare(b.status);
            return sortDir === "asc" ? cmp : -cmp;
        });
        return list;
    }, [localDisputes, filter, sortKey, sortDir]);

    function toggleSort(key: SortKey) {
        if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortKey(key); setSortDir("desc"); }
    }

    function resolveDispute(id: string) {
        setLocalDisputes(prev =>
            prev.map(d => d.id === id ? { ...d, status: "resolved" as const, resolvedAt: new Date().toISOString(), resolution: "Resolved by admin action." } : d)
        );
    }

    const tabs: { label: string; value: DisputeStatus | "all"; count: number }[] = [
        { label: "All", value: "all", count: localDisputes.length },
        { label: "Open", value: "open", count: localDisputes.filter(d => d.status === "open").length },
        { label: "Investigating", value: "investigating", count: localDisputes.filter(d => d.status === "investigating").length },
        { label: "Escalated", value: "escalated", count: localDisputes.filter(d => d.status === "escalated").length },
        { label: "Resolved", value: "resolved", count: localDisputes.filter(d => d.status === "resolved").length },
    ];

    return (
        <div className="p-6 space-y-5 max-w-[1600px]">
            <div>
                <h1 className="text-xl font-semibold text-[#e8e5e0] tracking-tight">Dispute Resolution</h1>
                <p className="text-xs text-[#6a6560] mt-0.5">Contested bids, failed payments, and authenticity challenges</p>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-[#0a0a0a] border border-white/[0.06] rounded-lg p-1 w-fit">
                {tabs.map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => setFilter(tab.value)}
                        className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${filter === tab.value
                                ? "bg-[#c8a96e]/10 text-[#c8a96e]"
                                : "text-[#6a6560] hover:text-[#8a8580]"
                            }`}
                    >
                        {tab.label} <span className="text-[10px] text-[#6a6560] ml-1">{tab.count}</span>
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl overflow-hidden">
                <table className="w-full text-[12px]">
                    <thead>
                        <tr className="border-b border-white/[0.06]">
                            <th className="text-left px-4 py-3 text-[10px] text-[#6a6560] font-semibold tracking-wider uppercase">ID</th>
                            <th className="text-left px-4 py-3 text-[10px] text-[#6a6560] font-semibold tracking-wider uppercase">Auction</th>
                            <th className="text-left px-4 py-3 text-[10px] text-[#6a6560] font-semibold tracking-wider uppercase">Complainant</th>
                            <th className="text-left px-4 py-3 text-[10px] text-[#6a6560] font-semibold tracking-wider uppercase">Reason</th>
                            <th className="text-right px-4 py-3 text-[10px] text-[#6a6560] font-semibold tracking-wider uppercase cursor-pointer hover:text-[#c8a96e]" onClick={() => toggleSort("amount")}>
                                Amount {sortKey === "amount" && (sortDir === "asc" ? "↑" : "↓")}
                            </th>
                            <th className="text-center px-4 py-3 text-[10px] text-[#6a6560] font-semibold tracking-wider uppercase cursor-pointer hover:text-[#c8a96e]" onClick={() => toggleSort("status")}>
                                Status {sortKey === "status" && (sortDir === "asc" ? "↑" : "↓")}
                            </th>
                            <th className="text-right px-4 py-3 text-[10px] text-[#6a6560] font-semibold tracking-wider uppercase cursor-pointer hover:text-[#c8a96e]" onClick={() => toggleSort("filedAt")}>
                                Filed {sortKey === "filedAt" && (sortDir === "asc" ? "↑" : "↓")}
                            </th>
                            <th className="text-center px-4 py-3 text-[10px] text-[#6a6560] font-semibold tracking-wider uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(d => (
                            <>
                                <tr
                                    key={d.id}
                                    onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
                                    className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer"
                                >
                                    <td className="px-4 py-3 font-data text-[#c8a96e]">{d.id}</td>
                                    <td className="px-4 py-3 text-[#e8e5e0]">{d.auctionTitle}</td>
                                    <td className="px-4 py-3 text-[#8a8580]">{d.complainantName}</td>
                                    <td className="px-4 py-3 text-[#8a8580]">{d.reason}</td>
                                    <td className="px-4 py-3 text-right font-data text-[#e8e5e0]">{formatCurrency(d.amount)}</td>
                                    <td className="px-4 py-3 text-center"><DisputeStatusBadge status={d.status} /></td>
                                    <td className="px-4 py-3 text-right font-data text-[#6a6560]">{formatTimestamp(d.filedAt)}</td>
                                    <td className="px-4 py-3 text-center">
                                        {d.status !== "resolved" && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 text-[10px] text-[#00ff88] hover:bg-[#00ff88]/10"
                                                onClick={(e) => { e.stopPropagation(); resolveDispute(d.id); }}
                                            >
                                                Resolve
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                                {expandedId === d.id && (
                                    <tr key={`${d.id}-detail`} className="bg-[#0e0e0e]">
                                        <td colSpan={8} className="px-6 py-4">
                                            <div className="grid grid-cols-2 gap-6 text-[11px]">
                                                <div>
                                                    <div className="text-[#6a6560] uppercase tracking-wider text-[9px] mb-2">Description</div>
                                                    <p className="text-[#8a8580] leading-relaxed">{d.description}</p>
                                                </div>
                                                <div className="space-y-3">
                                                    <div>
                                                        <div className="text-[#6a6560] uppercase tracking-wider text-[9px] mb-1">Respondent</div>
                                                        <div className="text-[#e8e5e0]">{d.respondentName}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-[#6a6560] uppercase tracking-wider text-[9px] mb-1">Auction ID</div>
                                                        <div className="font-data text-[#c8a96e]">{d.auctionId}</div>
                                                    </div>
                                                    {d.resolution && (
                                                        <div>
                                                            <div className="text-[#6a6560] uppercase tracking-wider text-[9px] mb-1">Resolution</div>
                                                            <div className="text-[#00ff88]">{d.resolution}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
