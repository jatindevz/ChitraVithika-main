"use client";

import { useState } from "react";
import { assets, formatTimestamp, type Asset, type AssetStatus } from "@/lib/adminMockData";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

function AssetStatusBadge({ status }: { status: AssetStatus }) {
    const styles: Record<AssetStatus, string> = {
        approved: "bg-[#00ff88]/10 text-[#00ff88]",
        pending_review: "bg-[#ffa500]/10 text-[#ffa500]",
        flagged: "bg-[#ff2d55]/10 text-[#ff2d55]",
        rejected: "bg-white/5 text-[#6a6560]",
    };
    const labels: Record<AssetStatus, string> = { approved: "APPROVED", pending_review: "PENDING", flagged: "FLAGGED", rejected: "REJECTED" };
    return <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase ${styles[status]}`}>{labels[status]}</span>;
}

export default function AssetsPage() {
    const [localAssets, setLocalAssets] = useState(assets);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [filter, setFilter] = useState<AssetStatus | "all">("all");

    const filtered = filter === "all" ? localAssets : localAssets.filter(a => a.status === filter);
    const selected = localAssets.find(a => a.id === selectedId);

    function approve(id: string) {
        setLocalAssets(prev => prev.map(a => a.id === id ? { ...a, status: "approved" as const, flagReason: null } : a));
    }
    function reject(id: string) {
        setLocalAssets(prev => prev.map(a => a.id === id ? { ...a, status: "rejected" as const } : a));
    }
    function toggleStaffPick(id: string) {
        setLocalAssets(prev => prev.map(a => a.id === id ? { ...a, staffPick: !a.staffPick } : a));
    }

    const tabs: { label: string; value: AssetStatus | "all"; count: number }[] = [
        { label: "All", value: "all", count: localAssets.length },
        { label: "Pending", value: "pending_review", count: localAssets.filter(a => a.status === "pending_review").length },
        { label: "Flagged", value: "flagged", count: localAssets.filter(a => a.status === "flagged").length },
        { label: "Approved", value: "approved", count: localAssets.filter(a => a.status === "approved").length },
    ];

    return (
        <div className="p-6 max-w-[1600px]">
            <div className="mb-5">
                <h1 className="text-xl font-semibold text-[#e8e5e0] tracking-tight">Asset Moderation</h1>
                <p className="text-xs text-[#6a6560] mt-0.5">Review uploads, verify EXIF data, and assign Staff Pick badges</p>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-[#0a0a0a] border border-white/[0.06] rounded-lg p-1 w-fit mb-5">
                {tabs.map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => setFilter(tab.value)}
                        className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${filter === tab.value ? "bg-[#c8a96e]/10 text-[#c8a96e]" : "text-[#6a6560] hover:text-[#8a8580]"
                            }`}
                    >
                        {tab.label} <span className="text-[10px] text-[#6a6560] ml-1">{tab.count}</span>
                    </button>
                ))}
            </div>

            <div className="flex gap-4">
                {/* Grid */}
                <div className="flex-1">
                    <div className="grid grid-cols-3 gap-3">
                        {filtered.map(asset => (
                            <div
                                key={asset.id}
                                onClick={() => setSelectedId(asset.id)}
                                className={`rounded-xl border overflow-hidden cursor-pointer transition-all ${selectedId === asset.id
                                        ? "border-[#c8a96e]/30 ring-1 ring-[#c8a96e]/20"
                                        : "border-white/[0.06] hover:border-white/[0.12]"
                                    }`}
                            >
                                {/* Image placeholder */}
                                <div
                                    className="aspect-[4/3] relative"
                                    style={{ background: `linear-gradient(135deg, ${asset.color}30, ${asset.color}08, #0a0a0a)` }}
                                >
                                    {asset.staffPick && (
                                        <span className="absolute top-2 left-2 bg-[#c8a96e]/90 text-[#050505] text-[8px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded">
                                            ★ STAFF PICK
                                        </span>
                                    )}
                                    <span className="absolute top-2 right-2">
                                        <AssetStatusBadge status={asset.status} />
                                    </span>
                                    {asset.flagReason && (
                                        <div className="absolute bottom-0 inset-x-0 bg-[#ff2d55]/10 backdrop-blur-sm px-2 py-1.5">
                                            <div className="text-[9px] text-[#ff2d55] font-medium truncate">⚠ {asset.flagReason}</div>
                                        </div>
                                    )}
                                </div>
                                <div className="p-3 bg-[#0a0a0a]">
                                    <div className="text-[11px] font-medium text-[#e8e5e0] truncate">{asset.title}</div>
                                    <div className="text-[10px] text-[#6a6560] mt-0.5">{asset.artistName} · {asset.category}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* EXIF Sidebar */}
                {selected && (
                    <div className="w-[320px] min-w-[320px] bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-5 h-fit sticky top-6 space-y-5">
                        <div>
                            <h3 className="text-[13px] font-semibold text-[#e8e5e0]">{selected.title}</h3>
                            <div className="text-[10px] text-[#6a6560] mt-0.5">{selected.artistName}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <div className="text-[9px] text-[#6a6560] uppercase tracking-wider mb-1">Resolution</div>
                                <div className="text-[11px] font-data text-[#e8e5e0]">{selected.resolution}</div>
                            </div>
                            <div>
                                <div className="text-[9px] text-[#6a6560] uppercase tracking-wider mb-1">File Size</div>
                                <div className="text-[11px] font-data text-[#e8e5e0]">{selected.fileSize}</div>
                            </div>
                            <div>
                                <div className="text-[9px] text-[#6a6560] uppercase tracking-wider mb-1">Category</div>
                                <div className="text-[11px] text-[#c8a96e] capitalize">{selected.category}</div>
                            </div>
                            <div>
                                <div className="text-[9px] text-[#6a6560] uppercase tracking-wider mb-1">Uploaded</div>
                                <div className="text-[11px] font-data text-[#8a8580]">{formatTimestamp(selected.uploadedAt)}</div>
                            </div>
                        </div>

                        <div>
                            <div className="text-[9px] text-[#6a6560] uppercase tracking-wider mb-2">EXIF Data</div>
                            <div className="bg-[#080808] rounded-lg p-3 space-y-2 font-data text-[11px]">
                                <div className="flex justify-between"><span className="text-[#6a6560]">Camera</span><span className="text-[#e8e5e0]">{selected.exifCamera}</span></div>
                                <div className="flex justify-between"><span className="text-[#6a6560]">Lens</span><span className="text-[#e8e5e0] text-right text-[10px]">{selected.exifLens}</span></div>
                                <div className="flex justify-between"><span className="text-[#6a6560]">ISO</span><span className="text-[#e8e5e0]">{selected.exifISO}</span></div>
                                <div className="flex justify-between"><span className="text-[#6a6560]">Aperture</span><span className="text-[#e8e5e0]">{selected.exifAperture}</span></div>
                                <div className="flex justify-between"><span className="text-[#6a6560]">Shutter</span><span className="text-[#e8e5e0]">{selected.exifShutter}</span></div>
                            </div>
                        </div>

                        {selected.flagReason && (
                            <div className="bg-[#ff2d55]/5 border border-[#ff2d55]/20 rounded-lg p-3">
                                <div className="text-[9px] text-[#ff2d55] uppercase tracking-wider mb-1 font-semibold">Flag Reason</div>
                                <div className="text-[11px] text-[#8a8580]">{selected.flagReason}</div>
                            </div>
                        )}

                        <div className="flex items-center justify-between py-2 border-t border-white/[0.06]">
                            <span className="text-[11px] text-[#6a6560]">Staff Pick</span>
                            <Switch
                                checked={selected.staffPick}
                                onCheckedChange={() => toggleStaffPick(selected.id)}
                                className="data-[state=checked]:bg-[#c8a96e]"
                            />
                        </div>

                        <div className="flex gap-2">
                            {selected.status !== "approved" && (
                                <Button
                                    className="flex-1 bg-[#00ff88]/10 text-[#00ff88] hover:bg-[#00ff88]/20 border border-[#00ff88]/30 font-bold text-[10px] tracking-wider"
                                    onClick={() => approve(selected.id)}
                                    size="sm"
                                >
                                    ✓ Approve
                                </Button>
                            )}
                            {selected.status !== "rejected" && (
                                <Button
                                    variant="outline"
                                    className="flex-1 border-[#ff2d55]/30 text-[#ff2d55] hover:bg-[#ff2d55]/10 font-bold text-[10px] tracking-wider"
                                    onClick={() => reject(selected.id)}
                                    size="sm"
                                >
                                    ✕ Reject
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
