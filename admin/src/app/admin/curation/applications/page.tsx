"use client";

import { useState } from "react";
import { applications, formatTimestamp, type Application, type ApplicationStatus } from "@/lib/adminMockData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function AppStatusBadge({ status }: { status: ApplicationStatus }) {
    const styles: Record<ApplicationStatus, string> = {
        pending: "bg-[#ffa500]/10 text-[#ffa500]",
        approved: "bg-[#00ff88]/10 text-[#00ff88]",
        rejected: "bg-[#ff2d55]/10 text-[#ff2d55]",
        info_requested: "bg-[#5b8def]/10 text-[#5b8def]",
    };
    const labels: Record<ApplicationStatus, string> = {
        pending: "PENDING",
        approved: "APPROVED",
        rejected: "REJECTED",
        info_requested: "INFO REQUESTED",
    };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${styles[status]}`}>{labels[status]}</span>;
}

export default function ApplicationsPage() {
    const [localApps, setLocalApps] = useState(applications);
    const [selectedId, setSelectedId] = useState<string | null>(applications.find(a => a.status === "pending")?.id ?? null);
    const [filter, setFilter] = useState<ApplicationStatus | "all">("all");

    const filteredApps = filter === "all" ? localApps : localApps.filter(a => a.status === filter);
    const selected = localApps.find(a => a.id === selectedId);

    function updateStatus(id: string, status: ApplicationStatus) {
        setLocalApps(prev =>
            prev.map(a => a.id === id ? { ...a, status, reviewedBy: "Admin Root" } : a)
        );
    }

    const tabs: { label: string; value: ApplicationStatus | "all"; count: number }[] = [
        { label: "All", value: "all", count: localApps.length },
        { label: "Pending", value: "pending", count: localApps.filter(a => a.status === "pending").length },
        { label: "Approved", value: "approved", count: localApps.filter(a => a.status === "approved").length },
        { label: "Rejected", value: "rejected", count: localApps.filter(a => a.status === "rejected").length },
        { label: "Info Requested", value: "info_requested", count: localApps.filter(a => a.status === "info_requested").length },
    ];

    return (
        <div className="p-6 max-w-[1600px]">
            <div className="mb-5">
                <h1 className="text-xl font-semibold text-[#e8e5e0] tracking-tight">Photographer Applications</h1>
                <p className="text-xs text-[#6a6560] mt-0.5">Review and curate incoming artist applications</p>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-[#0a0a0a] border border-white/[0.06] rounded-lg p-1 w-fit mb-5">
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

            {/* Split Screen */}
            <div className="flex gap-4 h-[calc(100vh-200px)]">
                {/* Left: Application List */}
                <div className="w-[380px] min-w-[380px] overflow-y-auto space-y-2 pr-2">
                    {filteredApps.map(app => (
                        <div
                            key={app.id}
                            onClick={() => setSelectedId(app.id)}
                            className={`p-4 rounded-xl border cursor-pointer transition-colors ${selectedId === app.id
                                    ? "bg-[#c8a96e]/5 border-[#c8a96e]/20"
                                    : "bg-[#0a0a0a] border-white/[0.06] hover:border-white/[0.1]"
                                }`}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <div className="text-[13px] font-medium text-[#e8e5e0]">{app.applicantName}</div>
                                    <div className="text-[10px] text-[#6a6560] mt-0.5">{app.specialization}</div>
                                </div>
                                <AppStatusBadge status={app.status} />
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-[#6a6560] font-data">
                                <span>{app.country}</span>
                                <span>{app.yearsExperience}yr exp</span>
                                <span>{formatTimestamp(app.submittedAt)}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right: Detail Panel */}
                <div className="flex-1 bg-[#0a0a0a] border border-white/[0.06] rounded-xl overflow-y-auto">
                    {selected ? (
                        <div className="p-6 space-y-6">
                            {/* Header */}
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-[#e8e5e0]">{selected.applicantName}</h2>
                                    <div className="text-[11px] text-[#6a6560] mt-1 space-x-3">
                                        <span>{selected.email}</span>
                                        <span>·</span>
                                        <span>{selected.country}</span>
                                        <span>·</span>
                                        <span>{selected.yearsExperience} years experience</span>
                                    </div>
                                </div>
                                <AppStatusBadge status={selected.status} />
                            </div>

                            {/* Artist Statement */}
                            <div>
                                <div className="text-[10px] text-[#6a6560] uppercase tracking-wider mb-2">Artist Statement</div>
                                <p className="text-[13px] text-[#8a8580] leading-relaxed">{selected.statement}</p>
                            </div>

                            {/* Meta */}
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <div className="text-[10px] text-[#6a6560] uppercase tracking-wider mb-1">Specialization</div>
                                    <div className="text-[12px] text-[#e8e5e0]">{selected.specialization}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-[#6a6560] uppercase tracking-wider mb-1">Instagram</div>
                                    <div className="text-[12px] text-[#c8a96e]">{selected.instagram}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-[#6a6560] uppercase tracking-wider mb-1">Portfolio</div>
                                    <div className="text-[12px] text-[#c8a96e] truncate">{selected.portfolio}</div>
                                </div>
                            </div>

                            {/* Sample Works */}
                            <div>
                                <div className="text-[10px] text-[#6a6560] uppercase tracking-wider mb-3">Portfolio Preview</div>
                                <div className="grid grid-cols-3 gap-3">
                                    {selected.sampleWorks.map((work, i) => (
                                        <div key={i} className="aspect-[4/3] rounded-lg overflow-hidden relative group">
                                            <div
                                                className="w-full h-full"
                                                style={{
                                                    background: `linear-gradient(135deg, ${work.color}40, ${work.color}15, #0a0a0a)`,
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                                                <span className="text-[11px] text-white font-medium">{work.title}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Review Info */}
                            {selected.reviewedBy && (
                                <div className="text-[10px] text-[#6a6560]">
                                    Reviewed by: <span className="text-[#8a8580]">{selected.reviewedBy}</span>
                                </div>
                            )}

                            {/* Actions */}
                            {selected.status === "pending" && (
                                <div className="flex items-center gap-2 pt-4 border-t border-white/[0.06]">
                                    <Button
                                        className="bg-[#00ff88]/10 text-[#00ff88] hover:bg-[#00ff88]/20 border border-[#00ff88]/30 font-bold text-[11px] tracking-wider"
                                        onClick={() => updateStatus(selected.id, "approved")}
                                    >
                                        ✓ Approve
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="border-[#ff2d55]/30 text-[#ff2d55] hover:bg-[#ff2d55]/10 font-bold text-[11px] tracking-wider"
                                        onClick={() => updateStatus(selected.id, "rejected")}
                                    >
                                        ✕ Reject
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="border-[#5b8def]/30 text-[#5b8def] hover:bg-[#5b8def]/10 font-bold text-[11px] tracking-wider"
                                        onClick={() => updateStatus(selected.id, "info_requested")}
                                    >
                                        Request More Info
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-[#6a6560] text-sm">
                            Select an application to review
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
