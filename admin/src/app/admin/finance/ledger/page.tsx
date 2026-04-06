"use client";

import { useState, useMemo } from "react";
import { transactions, formatCurrency, formatTimestamp, type Transaction, type TxType, type TxStatus } from "@/lib/adminMockData";

function TxTypeBadge({ type }: { type: TxType }) {
    const styles: Record<TxType, string> = {
        sale: "bg-[#00ff88]/10 text-[#00ff88]",
        escrow_hold: "bg-[#ffa500]/10 text-[#ffa500]",
        escrow_release: "bg-[#5b8def]/10 text-[#5b8def]",
        platform_fee: "bg-[#c8a96e]/10 text-[#c8a96e]",
        payout: "bg-[#00ff88]/10 text-[#00ff88]",
        refund: "bg-[#ff2d55]/10 text-[#ff2d55]",
    };
    return <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase ${styles[type]}`}>{type.replace("_", " ")}</span>;
}

function TxStatusDot({ status }: { status: TxStatus }) {
    const cls: Record<TxStatus, string> = {
        completed: "glow-dot-live",
        pending: "glow-dot-pending",
        failed: "glow-dot-flagged",
        held: "glow-dot-pending",
    };
    return (
        <span className="inline-flex items-center gap-1.5">
            <span className={`glow-dot ${cls[status]}`} />
            <span className="text-[10px] uppercase tracking-wider font-data">{status}</span>
        </span>
    );
}

type SortKey = "timestamp" | "amount" | "type" | "status";
const PAGE_SIZE = 8;

export default function LedgerPage() {
    const [sortKey, setSortKey] = useState<SortKey>("timestamp");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [typeFilter, setTypeFilter] = useState<TxType | "all">("all");
    const [statusFilter, setStatusFilter] = useState<TxStatus | "all">("all");
    const [page, setPage] = useState(0);

    const filtered = useMemo(() => {
        let list = [...transactions];
        if (typeFilter !== "all") list = list.filter(t => t.type === typeFilter);
        if (statusFilter !== "all") list = list.filter(t => t.status === statusFilter);
        list.sort((a, b) => {
            let cmp = 0;
            if (sortKey === "timestamp") cmp = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
            else if (sortKey === "amount") cmp = a.amount - b.amount;
            else if (sortKey === "type") cmp = a.type.localeCompare(b.type);
            else cmp = a.status.localeCompare(b.status);
            return sortDir === "asc" ? cmp : -cmp;
        });
        return list;
    }, [sortKey, sortDir, typeFilter, statusFilter]);

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const totalAmount = filtered.reduce((s, t) => s + t.amount, 0);

    function toggleSort(key: SortKey) {
        if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortKey(key); setSortDir("desc"); }
    }

    const SortIcon = ({ k }: { k: SortKey }) => sortKey === k ? <span className="ml-1 text-[#c8a96e]">{sortDir === "asc" ? "↑" : "↓"}</span> : null;

    return (
        <div className="p-6 space-y-5 max-w-[1600px]">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-[#e8e5e0] tracking-tight">Financial Ledger</h1>
                    <p className="text-xs text-[#6a6560] mt-0.5">Immutable transaction record — all sales, escrows, fees, and payouts</p>
                </div>
                <div className="text-right">
                    <div className="text-[10px] text-[#6a6560] uppercase tracking-wider">Filtered Total</div>
                    <div className="text-lg font-data text-[#c8a96e]">{formatCurrency(totalAmount)}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#6a6560] uppercase tracking-wider">Type:</span>
                    <select
                        value={typeFilter}
                        onChange={e => { setTypeFilter(e.target.value as TxType | "all"); setPage(0); }}
                        className="bg-[#0a0a0a] border border-white/[0.08] rounded-md px-2 py-1 text-[11px] text-[#e8e5e0] outline-none focus:border-[#c8a96e]/30"
                    >
                        <option value="all">All Types</option>
                        <option value="sale">Sale</option>
                        <option value="escrow_hold">Escrow Hold</option>
                        <option value="escrow_release">Escrow Release</option>
                        <option value="platform_fee">Platform Fee</option>
                        <option value="payout">Payout</option>
                        <option value="refund">Refund</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#6a6560] uppercase tracking-wider">Status:</span>
                    <select
                        value={statusFilter}
                        onChange={e => { setStatusFilter(e.target.value as TxStatus | "all"); setPage(0); }}
                        className="bg-[#0a0a0a] border border-white/[0.08] rounded-md px-2 py-1 text-[11px] text-[#e8e5e0] outline-none focus:border-[#c8a96e]/30"
                    >
                        <option value="all">All Statuses</option>
                        <option value="completed">Completed</option>
                        <option value="pending">Pending</option>
                        <option value="held">Held</option>
                        <option value="failed">Failed</option>
                    </select>
                </div>
                <div className="ml-auto text-[10px] text-[#6a6560] font-data">{filtered.length} transactions</div>
            </div>

            {/* Table */}
            <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl overflow-hidden">
                <table className="w-full text-[12px]">
                    <thead>
                        <tr className="border-b border-white/[0.06]">
                            <th className="text-left px-4 py-3 text-[10px] text-[#6a6560] font-semibold tracking-wider uppercase">TX ID</th>
                            <th className="text-left px-4 py-3 text-[10px] text-[#6a6560] font-semibold tracking-wider uppercase cursor-pointer hover:text-[#c8a96e]" onClick={() => toggleSort("type")}>
                                Type<SortIcon k="type" />
                            </th>
                            <th className="text-left px-4 py-3 text-[10px] text-[#6a6560] font-semibold tracking-wider uppercase">From</th>
                            <th className="text-left px-4 py-3 text-[10px] text-[#6a6560] font-semibold tracking-wider uppercase">To</th>
                            <th className="text-right px-4 py-3 text-[10px] text-[#6a6560] font-semibold tracking-wider uppercase cursor-pointer hover:text-[#c8a96e]" onClick={() => toggleSort("amount")}>
                                Amount<SortIcon k="amount" />
                            </th>
                            <th className="text-center px-4 py-3 text-[10px] text-[#6a6560] font-semibold tracking-wider uppercase cursor-pointer hover:text-[#c8a96e]" onClick={() => toggleSort("status")}>
                                Status<SortIcon k="status" />
                            </th>
                            <th className="text-right px-4 py-3 text-[10px] text-[#6a6560] font-semibold tracking-wider uppercase cursor-pointer hover:text-[#c8a96e]" onClick={() => toggleSort("timestamp")}>
                                Timestamp<SortIcon k="timestamp" />
                            </th>
                            <th className="text-left px-4 py-3 text-[10px] text-[#6a6560] font-semibold tracking-wider uppercase">Note</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageData.map(tx => (
                            <tr key={tx.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                                <td className="px-4 py-3 font-data text-[#c8a96e] text-[11px]">{tx.id}</td>
                                <td className="px-4 py-3"><TxTypeBadge type={tx.type} /></td>
                                <td className="px-4 py-3 text-[#8a8580]">{tx.from}</td>
                                <td className="px-4 py-3 text-[#8a8580]">{tx.to}</td>
                                <td className="px-4 py-3 text-right font-data text-[#e8e5e0] font-medium">{formatCurrency(tx.amount)}</td>
                                <td className="px-4 py-3 text-center"><TxStatusDot status={tx.status} /></td>
                                <td className="px-4 py-3 text-right font-data text-[#6a6560] text-[10px]">{formatTimestamp(tx.timestamp)}</td>
                                <td className="px-4 py-3 text-[#6a6560] text-[10px] max-w-[200px] truncate">{tx.note}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
                <div className="text-[10px] text-[#6a6560] font-data">
                    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="px-3 py-1.5 rounded-md text-[11px] bg-[#0a0a0a] border border-white/[0.06] text-[#8a8580] disabled:opacity-30 hover:border-[#c8a96e]/20 transition-colors"
                    >
                        ← Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => (
                        <button
                            key={i}
                            onClick={() => setPage(i)}
                            className={`w-7 h-7 rounded-md text-[11px] font-data transition-colors ${page === i ? "bg-[#c8a96e]/10 text-[#c8a96e] border border-[#c8a96e]/20" : "text-[#6a6560] hover:text-[#8a8580]"
                                }`}
                        >
                            {i + 1}
                        </button>
                    ))}
                    <button
                        onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                        className="px-3 py-1.5 rounded-md text-[11px] bg-[#0a0a0a] border border-white/[0.06] text-[#8a8580] disabled:opacity-30 hover:border-[#c8a96e]/20 transition-colors"
                    >
                        Next →
                    </button>
                </div>
            </div>
        </div>
    );
}
