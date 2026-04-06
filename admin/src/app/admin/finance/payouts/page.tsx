"use client";

import { useState, useMemo } from "react";
import { payouts, formatCurrency, formatTimestamp, type Payout, type PayoutStatus } from "@/lib/adminMockData";
import { Button } from "@/components/ui/button";

function PayoutStatusBadge({ status }: { status: PayoutStatus }) {
    const styles: Record<PayoutStatus, string> = {
        pending: "bg-[#ffa500]/10 text-[#ffa500]",
        authorized: "bg-[#5b8def]/10 text-[#5b8def]",
        processing: "bg-[#c8a96e]/10 text-[#c8a96e]",
        completed: "bg-[#00ff88]/10 text-[#00ff88]",
        failed: "bg-[#ff2d55]/10 text-[#ff2d55]",
    };
    return <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase ${styles[status]}`}>{status}</span>;
}

type SortKey = "requestedAt" | "netAmount" | "status" | "artistName";

export default function PayoutsPage() {
    const [localPayouts, setLocalPayouts] = useState(payouts);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [sortKey, setSortKey] = useState<SortKey>("requestedAt");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    const sorted = useMemo(() => {
        return [...localPayouts].sort((a, b) => {
            let cmp = 0;
            if (sortKey === "requestedAt") cmp = new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime();
            else if (sortKey === "netAmount") cmp = a.netAmount - b.netAmount;
            else if (sortKey === "status") cmp = a.status.localeCompare(b.status);
            else cmp = a.artistName.localeCompare(b.artistName);
            return sortDir === "asc" ? cmp : -cmp;
        });
    }, [localPayouts, sortKey, sortDir]);

    function toggleSort(key: SortKey) {
        if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortKey(key); setSortDir("desc"); }
    }

    function toggleSelect(id: string) {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    }

    function selectAllPending() {
        const pendingIds = localPayouts.filter(p => p.status === "pending").map(p => p.id);
        setSelected(new Set(pendingIds));
    }

    function bulkAuthorize() {
        setLocalPayouts(prev =>
            prev.map(p => selected.has(p.id) && p.status === "pending" ? { ...p, status: "authorized" as const } : p)
        );
        setSelected(new Set());
    }

    const pendingTotal = localPayouts.filter(p => p.status === "pending").reduce((s, p) => s + p.netAmount, 0);
    const selectedPending = [...selected].filter(id => localPayouts.find(p => p.id === id)?.status === "pending");

    const SortIcon = ({ k }: { k: SortKey }) => sortKey === k ? <span className="ml-1 text-[#c8a96e]">{sortDir === "asc" ? "↑" : "↓"}</span> : null;

    return (
        <div className="p-6 space-y-5 max-w-[1600px]">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-[#e8e5e0] tracking-tight">Artist Payouts</h1>
                    <p className="text-xs text-[#6a6560] mt-0.5">Royalty management — authorize and track artist payments</p>
                </div>
                <div className="text-right">
                    <div className="text-[10px] text-[#6a6560] uppercase tracking-wider">Pending Total</div>
                    <div className="text-lg font-data text-[#ffa500]">{formatCurrency(pendingTotal)}</div>
                </div>
            </div>

            {/* Bulk Action Bar */}
            {selectedPending.length > 0 && (
                <div className="bg-[#c8a96e]/5 border border-[#c8a96e]/20 rounded-xl px-5 py-3 flex items-center justify-between">
                    <div className="text-[12px] text-[#c8a96e]">
                        <span className="font-semibold">{selectedPending.length}</span> pending payout{selectedPending.length > 1 ? "s" : ""} selected
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            className="h-7 bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/30 hover:bg-[#00ff88]/20 font-bold text-[10px] tracking-wider"
                            onClick={bulkAuthorize}
                        >
                            ✓ Authorize Selected ({formatCurrency(selectedPending.reduce((s, id) => s + (localPayouts.find(p => p.id === id)?.netAmount ?? 0), 0))})
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[10px] text-[#6a6560]"
                            onClick={() => setSelected(new Set())}
                        >
                            Clear
                        </Button>
                    </div>
                </div>
            )}

            {/* Controls */}
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] text-[#8a8580] border-white/[0.08]"
                    onClick={selectAllPending}
                >
                    Select All Pending
                </Button>
            </div>

            {/* Table */}
            <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl overflow-hidden">
                <table className="w-full text-[12px]">
                    <thead>
                        <tr className="border-b border-white/[0.06]">
                            <th className="w-10 px-4 py-3">
                                <input
                                    type="checkbox"
                                    checked={selectedPending.length > 0 && selectedPending.length === localPayouts.filter(p => p.status === "pending").length}
                                    onChange={e => e.target.checked ? selectAllPending() : setSelected(new Set())}
                                    className="accent-[#c8a96e]"
                                />
                            </th>
                            <th className="text-left px-4 py-3 text-[10px] text-[#6a6560] font-semibold tracking-wider uppercase">Payout ID</th>
                            <th className="text-left px-4 py-3 text-[10px] text-[#6a6560] font-semibold tracking-wider uppercase cursor-pointer hover:text-[#c8a96e]" onClick={() => toggleSort("artistName")}>
                                Artist<SortIcon k="artistName" />
                            </th>
                            <th className="text-left px-4 py-3 text-[10px] text-[#6a6560] font-semibold tracking-wider uppercase">Period</th>
                            <th className="text-right px-4 py-3 text-[10px] text-[#6a6560] font-semibold tracking-wider uppercase">Gross</th>
                            <th className="text-right px-4 py-3 text-[10px] text-[#6a6560] font-semibold tracking-wider uppercase">Fee (12%)</th>
                            <th className="text-right px-4 py-3 text-[10px] text-[#6a6560] font-semibold tracking-wider uppercase cursor-pointer hover:text-[#c8a96e]" onClick={() => toggleSort("netAmount")}>
                                Net<SortIcon k="netAmount" />
                            </th>
                            <th className="text-center px-4 py-3 text-[10px] text-[#6a6560] font-semibold tracking-wider uppercase">Sales</th>
                            <th className="text-center px-4 py-3 text-[10px] text-[#6a6560] font-semibold tracking-wider uppercase cursor-pointer hover:text-[#c8a96e]" onClick={() => toggleSort("status")}>
                                Status<SortIcon k="status" />
                            </th>
                            <th className="text-right px-4 py-3 text-[10px] text-[#6a6560] font-semibold tracking-wider uppercase">Bank</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map(p => (
                            <tr key={p.id} className={`border-b border-white/[0.03] hover:bg-white/[0.02] ${selected.has(p.id) ? "bg-[#c8a96e]/5" : ""}`}>
                                <td className="px-4 py-3">
                                    {p.status === "pending" && (
                                        <input
                                            type="checkbox"
                                            checked={selected.has(p.id)}
                                            onChange={() => toggleSelect(p.id)}
                                            className="accent-[#c8a96e]"
                                        />
                                    )}
                                </td>
                                <td className="px-4 py-3 font-data text-[#c8a96e] text-[11px]">{p.id}</td>
                                <td className="px-4 py-3 text-[#e8e5e0]">{p.artistName}</td>
                                <td className="px-4 py-3 text-[#6a6560] font-data text-[10px]">{p.period}</td>
                                <td className="px-4 py-3 text-right font-data text-[#8a8580]">{formatCurrency(p.amount)}</td>
                                <td className="px-4 py-3 text-right font-data text-[#ff2d55] text-[11px]">-{formatCurrency(p.platformFee)}</td>
                                <td className="px-4 py-3 text-right font-data text-[#e8e5e0] font-semibold">{formatCurrency(p.netAmount)}</td>
                                <td className="px-4 py-3 text-center font-data text-[#8a8580]">{p.salesCount}</td>
                                <td className="px-4 py-3 text-center"><PayoutStatusBadge status={p.status} /></td>
                                <td className="px-4 py-3 text-right font-data text-[#6a6560] text-[10px]">****{p.bankLast4}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
