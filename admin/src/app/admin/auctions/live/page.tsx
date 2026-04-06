"use client";

import { useState } from "react";
import { auctions, bids, formatCurrency, timeAgo, type Auction } from "@/lib/adminMockData";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

function getTimeLeft(endsAt: string): string {
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return "ENDED";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function AuctionStatusBadge({ status }: { status: Auction["status"] }) {
    const styles: Record<string, string> = {
        live: "bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/20",
        ending: "bg-[#ff2d55]/10 text-[#ff2d55] border-[#ff2d55]/20",
        sold: "bg-white/5 text-[#8a8580] border-white/10",
        frozen: "bg-[#ffa500]/10 text-[#ffa500] border-[#ffa500]/20",
        scheduled: "bg-[#5b8def]/10 text-[#5b8def] border-[#5b8def]/20",
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${styles[status]}`}>
            {(status === "live" || status === "ending") && <span className={`glow-dot ${status === "ending" ? "glow-dot-flagged" : "glow-dot-live"}`} />}
            {status === "frozen" && <span className="glow-dot glow-dot-pending" />}
            {status}
        </span>
    );
}

export default function AuctionsLivePage() {
    const [localAuctions, setLocalAuctions] = useState(auctions);
    const [killTarget, setKillTarget] = useState<Auction | null>(null);

    const liveAuctions = localAuctions.filter(a => a.status === "live" || a.status === "ending");
    const frozenAuctions = localAuctions.filter(a => a.status === "frozen");
    const otherAuctions = localAuctions.filter(a => a.status === "sold" || a.status === "scheduled");

    function handleFreeze(id: string) {
        setLocalAuctions(prev =>
            prev.map(a => a.id === id ? { ...a, status: "frozen" as const } : a)
        );
        setKillTarget(null);
    }

    function handleUnfreeze(id: string) {
        setLocalAuctions(prev =>
            prev.map(a => a.id === id ? { ...a, status: "live" as const } : a)
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-[1600px]">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-[#e8e5e0] tracking-tight">Auction Overwatch</h1>
                    <p className="text-xs text-[#6a6560] mt-0.5">Real-time monitoring — All active and recent auctions</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-[11px] font-data">
                        <span className="glow-dot glow-dot-live" />
                        <span className="text-[#00ff88]">{liveAuctions.length} LIVE</span>
                    </div>
                    {frozenAuctions.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[11px] font-data">
                            <span className="glow-dot glow-dot-pending" />
                            <span className="text-[#ffa500]">{frozenAuctions.length} FROZEN</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Live Auctions */}
            {liveAuctions.length > 0 && (
                <div>
                    <h2 className="text-xs font-semibold tracking-[0.1em] uppercase text-[#6a6560] mb-3">Live Auctions</h2>
                    <div className="grid grid-cols-2 gap-4">
                        {liveAuctions.map((auction) => {
                            const auctionBids = bids.filter(b => b.auctionId === auction.id).sort((a, b) => b.amount - a.amount);
                            return (
                                <div key={auction.id} className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl p-5 hover:border-[#c8a96e]/15 transition-colors">
                                    {/* Header row */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-lg" style={{ background: auction.imageColor, opacity: 0.8 }} />
                                            <div>
                                                <div className="text-[13px] font-semibold text-[#e8e5e0]">{auction.title}</div>
                                                <div className="text-[11px] text-[#6a6560]">{auction.artist} · {auction.category}</div>
                                            </div>
                                        </div>
                                        <AuctionStatusBadge status={auction.status} />
                                    </div>

                                    {/* Metrics row */}
                                    <div className="grid grid-cols-4 gap-3 mb-4">
                                        <div>
                                            <div className="text-[9px] text-[#6a6560] uppercase tracking-wider mb-1">{auction.type === "dutch" ? "Current Price" : "Top Bid"}</div>
                                            <div className="text-[16px] font-data text-[#c8a96e] font-semibold">{formatCurrency(auction.type === "dutch" ? auction.currentPrice : auction.topBid)}</div>
                                        </div>
                                        <div>
                                            <div className="text-[9px] text-[#6a6560] uppercase tracking-wider mb-1">Start Price</div>
                                            <div className="text-[13px] font-data text-[#8a8580]">{formatCurrency(auction.startPrice)}</div>
                                        </div>
                                        <div>
                                            <div className="text-[9px] text-[#6a6560] uppercase tracking-wider mb-1">Floor</div>
                                            <div className="text-[13px] font-data text-[#8a8580]">{formatCurrency(auction.floorPrice)}</div>
                                        </div>
                                        <div>
                                            <div className="text-[9px] text-[#6a6560] uppercase tracking-wider mb-1">Time Left</div>
                                            <div className={`text-[13px] font-data font-semibold ${auction.status === "ending" ? "text-[#ff2d55]" : "text-[#e8e5e0]"}`}>
                                                {getTimeLeft(auction.endsAt)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info row */}
                                    <div className="flex items-center justify-between py-2 border-t border-white/[0.04]">
                                        <div className="flex items-center gap-4 text-[10px] text-[#6a6560] font-data">
                                            <span>ID: {auction.id}</span>
                                            <span>Type: {auction.type.toUpperCase()}</span>
                                            <span>Bids: {auction.bidCount}</span>
                                            <span>Watchers: {auction.watchers}</span>
                                        </div>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="h-7 text-[10px] font-bold tracking-wider uppercase bg-[#ff2d55]/10 text-[#ff2d55] border border-[#ff2d55]/30 hover:bg-[#ff2d55]/20"
                                            onClick={() => setKillTarget(auction)}
                                        >
                                            ⚠ Kill Switch
                                        </Button>
                                    </div>

                                    {/* Recent bids */}
                                    {auctionBids.length > 0 && (
                                        <div className="mt-3 pt-3 border-t border-white/[0.04]">
                                            <div className="text-[9px] text-[#6a6560] uppercase tracking-wider mb-2">Recent Bids</div>
                                            <div className="space-y-1">
                                                {auctionBids.slice(0, 3).map((bid) => (
                                                    <div key={bid.id} className="flex items-center justify-between text-[11px]">
                                                        <span className="text-[#8a8580]">{bid.userName}</span>
                                                        <span className="font-data text-[#c8a96e]">{formatCurrency(bid.amount)}</span>
                                                        <span className="font-data text-[#6a6560] text-[10px]">{timeAgo(bid.placedAt)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Frozen Auctions */}
            {frozenAuctions.length > 0 && (
                <div>
                    <h2 className="text-xs font-semibold tracking-[0.1em] uppercase text-[#ffa500] mb-3">Frozen / Under Investigation</h2>
                    <div className="grid grid-cols-2 gap-4">
                        {frozenAuctions.map((auction) => (
                            <div key={auction.id} className="bg-[#0a0a0a] border border-[#ffa500]/20 rounded-xl p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg opacity-40" style={{ background: auction.imageColor }} />
                                        <div>
                                            <div className="text-[13px] font-semibold text-[#e8e5e0]">{auction.title}</div>
                                            <div className="text-[11px] text-[#6a6560]">{auction.artist} · {auction.category}</div>
                                        </div>
                                    </div>
                                    <AuctionStatusBadge status={auction.status} />
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-[#6a6560] font-data">
                                    <span>Frozen Price: {formatCurrency(auction.currentPrice)}</span>
                                    <span>ID: {auction.id}</span>
                                </div>
                                <div className="mt-3 flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-[10px] font-bold tracking-wider uppercase border-[#00ff88]/30 text-[#00ff88] hover:bg-[#00ff88]/10"
                                        onClick={() => handleUnfreeze(auction.id)}
                                    >
                                        Unfreeze
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-[10px] font-bold tracking-wider uppercase border-white/10 text-[#8a8580]"
                                    >
                                        View Investigation
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Other Auctions */}
            <div>
                <h2 className="text-xs font-semibold tracking-[0.1em] uppercase text-[#6a6560] mb-3">Recent / Scheduled</h2>
                <div className="bg-[#0a0a0a] border border-white/[0.06] rounded-xl overflow-hidden">
                    <table className="w-full text-[12px]">
                        <thead>
                            <tr className="border-b border-white/[0.06]">
                                <th className="text-left px-4 py-3 text-[10px] text-[#6a6560] font-semibold tracking-wider uppercase">ID</th>
                                <th className="text-left px-4 py-3 text-[10px] text-[#6a6560] font-semibold tracking-wider uppercase">Title</th>
                                <th className="text-left px-4 py-3 text-[10px] text-[#6a6560] font-semibold tracking-wider uppercase">Artist</th>
                                <th className="text-left px-4 py-3 text-[10px] text-[#6a6560] font-semibold tracking-wider uppercase">Type</th>
                                <th className="text-right px-4 py-3 text-[10px] text-[#6a6560] font-semibold tracking-wider uppercase">Price</th>
                                <th className="text-center px-4 py-3 text-[10px] text-[#6a6560] font-semibold tracking-wider uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {otherAuctions.map((a) => (
                                <tr key={a.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                                    <td className="px-4 py-3 font-data text-[#c8a96e]">{a.id}</td>
                                    <td className="px-4 py-3 text-[#e8e5e0]">{a.title}</td>
                                    <td className="px-4 py-3 text-[#8a8580]">{a.artist}</td>
                                    <td className="px-4 py-3 font-data text-[#6a6560] uppercase">{a.type}</td>
                                    <td className="px-4 py-3 text-right font-data text-[#e8e5e0]">{formatCurrency(a.type === "dutch" ? a.currentPrice : (a.topBid || a.startPrice))}</td>
                                    <td className="px-4 py-3 text-center"><AuctionStatusBadge status={a.status} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Kill Switch Dialog */}
            <Dialog open={!!killTarget} onOpenChange={() => setKillTarget(null)}>
                <DialogContent className="bg-[#0a0a0a] border-[#ff2d55]/30 text-[#e8e5e0] max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-[#ff2d55] flex items-center gap-2">
                            ⚠ Freeze Auction
                        </DialogTitle>
                        <DialogDescription className="text-[#8a8580]">
                            This will immediately freeze <span className="text-[#e8e5e0] font-semibold">&ldquo;{killTarget?.title}&rdquo;</span> and notify all bidders. The auction clock will stop and all active bids will be held in escrow pending investigation.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="bg-[#ff2d55]/5 border border-[#ff2d55]/20 rounded-lg p-3 my-2">
                        <div className="text-[10px] text-[#ff2d55] font-semibold uppercase tracking-wider mb-1">Action Summary</div>
                        <ul className="text-[11px] text-[#8a8580] space-y-1">
                            <li>• Auction clock frozen immediately</li>
                            <li>• All active bids held in escrow</li>
                            <li>• Bidders will be notified via email</li>
                            <li>• Event logged to audit trail</li>
                        </ul>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="ghost" onClick={() => setKillTarget(null)} className="text-[#8a8580]">Cancel</Button>
                        <Button
                            className="bg-[#ff2d55] text-white hover:bg-[#ff2d55]/80 font-bold"
                            onClick={() => killTarget && handleFreeze(killTarget.id)}
                        >
                            Confirm Freeze
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
