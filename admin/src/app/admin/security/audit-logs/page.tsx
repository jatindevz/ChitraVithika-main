"use client";

import { useState, useMemo } from "react";
import { auditLogs, formatTimestamp, type AuditLog, type AuditAction } from "@/lib/adminMockData";

const actionColors: Record<AuditAction, string> = {
    login: "#8a8580",
    approve_application: "#00ff88",
    reject_application: "#ff2d55",
    freeze_auction: "#ffa500",
    unfreeze_auction: "#00ff88",
    authorize_payout: "#5b8def",
    change_role: "#c8a96e",
    flag_asset: "#ff2d55",
    approve_asset: "#00ff88",
    resolve_dispute: "#00ff88",
    bulk_payout: "#5b8def",
    modify_user: "#ffa500",
    staff_pick: "#c8a96e",
};

const actionLabels: Record<AuditAction, string> = {
    login: "LOGIN",
    approve_application: "APPROVE_APP",
    reject_application: "REJECT_APP",
    freeze_auction: "FREEZE_AUC",
    unfreeze_auction: "UNFREEZE_AUC",
    authorize_payout: "AUTH_PAYOUT",
    change_role: "CHANGE_ROLE",
    flag_asset: "FLAG_ASSET",
    approve_asset: "APPROVE_ASSET",
    resolve_dispute: "RESOLVE_DSP",
    bulk_payout: "BULK_PAYOUT",
    modify_user: "MODIFY_USER",
    staff_pick: "STAFF_PICK",
};

export default function AuditLogsPage() {
    const [actionFilter, setActionFilter] = useState<AuditAction | "all">("all");
    const [adminFilter, setAdminFilter] = useState<string>("all");

    const admins = useMemo(() => [...new Set(auditLogs.map(l => l.adminName))], []);
    const actions = useMemo(() => [...new Set(auditLogs.map(l => l.action))], []);

    const filtered = useMemo(() => {
        let list = [...auditLogs];
        if (actionFilter !== "all") list = list.filter(l => l.action === actionFilter);
        if (adminFilter !== "all") list = list.filter(l => l.adminName === adminFilter);
        return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [actionFilter, adminFilter]);

    return (
        <div className="p-6 space-y-5 max-w-[1600px]">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-[#e8e5e0] tracking-tight">Audit Logs</h1>
                    <p className="text-xs text-[#6a6560] mt-0.5">Terminal-style feed of all admin actions in the Command Center</p>
                </div>
                <div className="text-[10px] text-[#6a6560] font-data">{filtered.length} events</div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#6a6560] uppercase tracking-wider">Action:</span>
                    <select
                        value={actionFilter}
                        onChange={e => setActionFilter(e.target.value as AuditAction | "all")}
                        className="bg-[#0a0a0a] border border-white/[0.08] rounded-md px-2 py-1 text-[11px] text-[#e8e5e0] outline-none focus:border-[#c8a96e]/30 font-data"
                    >
                        <option value="all">All Actions</option>
                        {actions.map(a => <option key={a} value={a}>{actionLabels[a]}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#6a6560] uppercase tracking-wider">Admin:</span>
                    <select
                        value={adminFilter}
                        onChange={e => setAdminFilter(e.target.value)}
                        className="bg-[#0a0a0a] border border-white/[0.08] rounded-md px-2 py-1 text-[11px] text-[#e8e5e0] outline-none focus:border-[#c8a96e]/30"
                    >
                        <option value="all">All Admins</option>
                        {admins.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>
            </div>

            {/* Terminal Log Feed */}
            <div className="bg-[#060606] border border-white/[0.06] rounded-xl overflow-hidden">
                {/* Terminal Header */}
                <div className="flex items-center gap-2 px-4 py-2 bg-[#0a0a0a] border-b border-white/[0.06]">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ff2d55]/70" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ffa500]/70" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#00ff88]/70" />
                    </div>
                    <span className="text-[10px] text-[#6a6560] font-data ml-2">cv-cc-audit-log — bash</span>
                </div>

                {/* Log Entries */}
                <div className="p-4 space-y-0 font-data text-[11px] leading-[1.8] max-h-[600px] overflow-y-auto">
                    {filtered.map((log) => {
                        const color = actionColors[log.action];
                        const ts = new Date(log.timestamp);
                        const timeStr = ts.toISOString().replace("T", " ").substring(0, 19);

                        return (
                            <div key={log.id} className="flex items-start gap-0 hover:bg-white/[0.02] px-2 py-0.5 rounded group">
                                {/* Timestamp */}
                                <span className="text-[#4a4540] flex-shrink-0 w-[160px]">[{timeStr}]</span>

                                {/* Admin */}
                                <span className="text-[#5b8def] flex-shrink-0 w-[140px] truncate">{log.adminName}</span>

                                {/* Action */}
                                <span
                                    className="flex-shrink-0 w-[130px] font-bold"
                                    style={{ color }}
                                >
                                    {actionLabels[log.action]}
                                </span>

                                {/* Target */}
                                <span className="text-[#c8a96e] flex-shrink-0 w-[130px] truncate">{log.target}</span>

                                {/* Details */}
                                <span className="text-[#6a6560] flex-1 truncate group-hover:text-[#8a8580]">
                                    {log.details}
                                </span>

                                {/* IP */}
                                <span className="text-[#3a3530] flex-shrink-0 ml-4 w-[90px] text-right">{log.ip}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Terminal Footer */}
                <div className="px-4 py-2 border-t border-white/[0.06] bg-[#0a0a0a]">
                    <div className="flex items-center gap-1 text-[10px] font-data text-[#4a4540]">
                        <span className="text-[#00ff88]">$</span>
                        <span>tail -f /var/log/cv-cc/audit.log</span>
                        <span className="animate-pulse ml-1">█</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
