// ─────────────────────────────────────────────────────────────
// ChitraVithika Command Center — Mock Data Layer
// All entities are cross-referenced for realistic data tables.
// ─────────────────────────────────────────────────────────────

export type UserRole = "user" | "artist" | "moderator" | "admin";
export type UserStatus = "active" | "suspended" | "pending";

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    avatar: string;
    joinedAt: string;
    totalSpent: number;
    totalEarned: number;
    lastActive: string;
}

export type AuctionType = "dutch" | "open";
export type AuctionStatus = "live" | "ending" | "sold" | "frozen" | "scheduled";

export interface Auction {
    id: string;
    title: string;
    artist: string;
    artistId: string;
    type: AuctionType;
    status: AuctionStatus;
    currentPrice: number;
    startPrice: number;
    floorPrice: number;
    topBid: number;
    bidCount: number;
    startedAt: string;
    endsAt: string;
    category: string;
    watchers: number;
    imageColor: string;
}

export type BidStatus = "active" | "won" | "outbid" | "cancelled";

export interface Bid {
    id: string;
    auctionId: string;
    auctionTitle: string;
    userId: string;
    userName: string;
    amount: number;
    placedAt: string;
    status: BidStatus;
}

export type TxType = "sale" | "escrow_hold" | "escrow_release" | "platform_fee" | "payout" | "refund";
export type TxStatus = "completed" | "pending" | "failed" | "held";

export interface Transaction {
    id: string;
    type: TxType;
    amount: number;
    currency: string;
    from: string;
    to: string;
    auctionId: string | null;
    status: TxStatus;
    timestamp: string;
    note: string;
}

export type ApplicationStatus = "pending" | "approved" | "rejected" | "info_requested";

export interface Application {
    id: string;
    applicantName: string;
    email: string;
    portfolio: string;
    specialization: string;
    statement: string;
    submittedAt: string;
    status: ApplicationStatus;
    reviewedBy: string | null;
    sampleWorks: { title: string; color: string }[];
    yearsExperience: number;
    instagram: string;
    country: string;
}

export type AssetStatus = "approved" | "pending_review" | "flagged" | "rejected";

export interface Asset {
    id: string;
    title: string;
    artistId: string;
    artistName: string;
    uploadedAt: string;
    status: AssetStatus;
    category: string;
    resolution: string;
    fileSize: string;
    exifCamera: string;
    exifLens: string;
    exifISO: number;
    exifAperture: string;
    exifShutter: string;
    staffPick: boolean;
    color: string;
    flagReason: string | null;
}

export type DisputeStatus = "open" | "investigating" | "resolved" | "escalated";

export interface Dispute {
    id: string;
    auctionId: string;
    auctionTitle: string;
    complainantId: string;
    complainantName: string;
    respondentId: string;
    respondentName: string;
    reason: string;
    description: string;
    status: DisputeStatus;
    filedAt: string;
    resolvedAt: string | null;
    resolution: string | null;
    amount: number;
}

export type PayoutStatus = "pending" | "authorized" | "processing" | "completed" | "failed";

export interface Payout {
    id: string;
    artistId: string;
    artistName: string;
    amount: number;
    currency: string;
    status: PayoutStatus;
    period: string;
    salesCount: number;
    platformFee: number;
    netAmount: number;
    requestedAt: string;
    processedAt: string | null;
    bankLast4: string;
}

export type AuditAction = "login" | "approve_application" | "reject_application" | "freeze_auction" | "unfreeze_auction" | "authorize_payout" | "change_role" | "flag_asset" | "approve_asset" | "resolve_dispute" | "bulk_payout" | "modify_user" | "staff_pick";

export interface AuditLog {
    id: string;
    adminId: string;
    adminName: string;
    action: AuditAction;
    target: string;
    targetId: string;
    details: string;
    timestamp: string;
    ip: string;
}

// ─── USERS ────────────────────────────────────────────────────

export const users: User[] = [
    { id: "usr_001", name: "Arjun Kapoor", email: "arjun@chitravithika.com", role: "user", status: "active", avatar: "AK", joinedAt: "2024-03-15", totalSpent: 24800, totalEarned: 0, lastActive: "2026-02-25T21:30:00Z" },
    { id: "usr_002", name: "Irina Volkova", email: "irina@chitravithika.com", role: "artist", status: "active", avatar: "IV", joinedAt: "2024-01-08", totalSpent: 0, totalEarned: 89200, lastActive: "2026-02-25T22:10:00Z" },
    { id: "usr_003", name: "Björn Sigurðsson", email: "bjorn@coldlight.is", role: "artist", status: "active", avatar: "BS", joinedAt: "2024-06-22", totalSpent: 1200, totalEarned: 67500, lastActive: "2026-02-25T20:45:00Z" },
    { id: "usr_004", name: "Solène Armand", email: "solene@armandphoto.fr", role: "artist", status: "active", avatar: "SA", joinedAt: "2024-02-14", totalSpent: 0, totalEarned: 45800, lastActive: "2026-02-25T19:30:00Z" },
    { id: "usr_005", name: "Marcus Chen", email: "marcus.c@artcollect.hk", role: "user", status: "active", avatar: "MC", joinedAt: "2024-07-01", totalSpent: 52400, totalEarned: 0, lastActive: "2026-02-25T22:15:00Z" },
    { id: "usr_006", name: "Priya Mehta", email: "priya@auravision.in", role: "artist", status: "pending", avatar: "PM", joinedAt: "2025-12-10", totalSpent: 0, totalEarned: 0, lastActive: "2026-02-25T18:00:00Z" },
    { id: "usr_007", name: "James Whitfield", email: "james.w@whitelight.co.uk", role: "user", status: "active", avatar: "JW", joinedAt: "2024-09-03", totalSpent: 18700, totalEarned: 0, lastActive: "2026-02-25T17:20:00Z" },
    { id: "usr_008", name: "Yuki Tanaka", email: "yuki@tokyolens.jp", role: "artist", status: "active", avatar: "YT", joinedAt: "2024-04-18", totalSpent: 3200, totalEarned: 31200, lastActive: "2026-02-25T21:00:00Z" },
    { id: "usr_009", name: "Elena Vasquez", email: "elena.v@fotovida.mx", role: "moderator", status: "active", avatar: "EV", joinedAt: "2024-01-05", totalSpent: 0, totalEarned: 0, lastActive: "2026-02-25T22:40:00Z" },
    { id: "usr_010", name: "Admin Root", email: "admin@chitravithika.com", role: "admin", status: "active", avatar: "AR", joinedAt: "2023-06-01", totalSpent: 0, totalEarned: 0, lastActive: "2026-02-25T22:50:00Z" },
    { id: "usr_011", name: "Liam O'Brien", email: "liam@dublinframe.ie", role: "user", status: "active", avatar: "LO", joinedAt: "2025-01-15", totalSpent: 8900, totalEarned: 0, lastActive: "2026-02-24T14:30:00Z" },
    { id: "usr_012", name: "Fatima Al-Rashid", email: "fatima@desertecho.ae", role: "artist", status: "active", avatar: "FA", joinedAt: "2024-11-03", totalSpent: 0, totalEarned: 22100, lastActive: "2026-02-25T16:00:00Z" },
    { id: "usr_013", name: "Nikolai Petrov", email: "nikolai@moscowgaze.ru", role: "user", status: "suspended", avatar: "NP", joinedAt: "2024-08-20", totalSpent: 6200, totalEarned: 0, lastActive: "2026-02-20T10:00:00Z" },
    { id: "usr_014", name: "Camille Dubois", email: "camille@parisoir.fr", role: "artist", status: "active", avatar: "CD", joinedAt: "2024-05-12", totalSpent: 800, totalEarned: 55400, lastActive: "2026-02-25T15:30:00Z" },
    { id: "usr_015", name: "Rafael Torres", email: "rafael@luzlatina.br", role: "user", status: "active", avatar: "RT", joinedAt: "2025-03-22", totalSpent: 14300, totalEarned: 0, lastActive: "2026-02-25T20:10:00Z" },
    { id: "usr_016", name: "Anya Novak", email: "anya@praguelens.cz", role: "artist", status: "active", avatar: "AN", joinedAt: "2025-06-01", totalSpent: 0, totalEarned: 18900, lastActive: "2026-02-25T13:45:00Z" },
    { id: "usr_017", name: "David Kim", email: "david.k@seoulshot.kr", role: "user", status: "active", avatar: "DK", joinedAt: "2025-02-14", totalSpent: 31200, totalEarned: 0, lastActive: "2026-02-25T22:30:00Z" },
    { id: "usr_018", name: "Isabella Rossi", email: "bella@romanlens.it", role: "artist", status: "active", avatar: "IR", joinedAt: "2024-12-01", totalSpent: 0, totalEarned: 41300, lastActive: "2026-02-25T11:20:00Z" },
    { id: "usr_019", name: "Omar Hassan", email: "omar@cairolens.eg", role: "user", status: "active", avatar: "OH", joinedAt: "2025-07-10", totalSpent: 9800, totalEarned: 0, lastActive: "2026-02-25T09:00:00Z" },
    { id: "usr_020", name: "Sophie Turner", email: "sophie.t@londonframe.uk", role: "user", status: "active", avatar: "ST", joinedAt: "2025-04-05", totalSpent: 22100, totalEarned: 0, lastActive: "2026-02-25T19:15:00Z" },
];

// ─── AUCTIONS ─────────────────────────────────────────────────

export const auctions: Auction[] = [
    { id: "AUC-2026-001", title: "Veiled Dusk Over the Moors", artist: "Irina Volkova", artistId: "usr_002", type: "dutch", status: "live", currentPrice: 2850, startPrice: 4200, floorPrice: 1500, topBid: 0, bidCount: 0, startedAt: "2026-02-25T20:00:00Z", endsAt: "2026-02-25T23:59:59Z", category: "landscape", watchers: 47, imageColor: "#4A90D9" },
    { id: "AUC-2026-002", title: "Neon Monsoon, Shibuya", artist: "Yuki Tanaka", artistId: "usr_008", type: "open", status: "live", currentPrice: 0, startPrice: 1800, floorPrice: 600, topBid: 3200, bidCount: 18, startedAt: "2026-02-25T18:00:00Z", endsAt: "2026-02-26T02:00:00Z", category: "street", watchers: 124, imageColor: "#E040FB" },
    { id: "AUC-2026-003", title: "Glacial Cathedral, Vatnajökull", artist: "Björn Sigurðsson", artistId: "usr_003", type: "dutch", status: "live", currentPrice: 3100, startPrice: 5500, floorPrice: 2000, topBid: 0, bidCount: 0, startedAt: "2026-02-25T19:30:00Z", endsAt: "2026-02-26T01:30:00Z", category: "abstract", watchers: 83, imageColor: "#40C4FF" },
    { id: "AUC-2026-004", title: "Dust & Light, Jaisalmer", artist: "Fatima Al-Rashid", artistId: "usr_012", type: "open", status: "ending", currentPrice: 0, startPrice: 2100, floorPrice: 700, topBid: 4800, bidCount: 31, startedAt: "2026-02-25T12:00:00Z", endsAt: "2026-02-25T23:45:00Z", category: "portrait", watchers: 156, imageColor: "#F9A825" },
    { id: "AUC-2026-005", title: "Chromatic Tide Pool", artist: "Solène Armand", artistId: "usr_004", type: "dutch", status: "live", currentPrice: 1950, startPrice: 3200, floorPrice: 1200, topBid: 0, bidCount: 0, startedAt: "2026-02-25T21:00:00Z", endsAt: "2026-02-26T03:00:00Z", category: "macro", watchers: 62, imageColor: "#FF6D00" },
    { id: "AUC-2026-006", title: "Midnight Canopy, Borneo", artist: "Camille Dubois", artistId: "usr_014", type: "open", status: "live", currentPrice: 0, startPrice: 2700, floorPrice: 900, topBid: 5100, bidCount: 24, startedAt: "2026-02-25T16:00:00Z", endsAt: "2026-02-26T04:00:00Z", category: "wildlife", watchers: 201, imageColor: "#1B5E20" },
    { id: "AUC-2026-007", title: "Serengeti Twilight", artist: "Isabella Rossi", artistId: "usr_018", type: "dutch", status: "sold", currentPrice: 1800, startPrice: 3800, floorPrice: 1500, topBid: 0, bidCount: 0, startedAt: "2026-02-24T20:00:00Z", endsAt: "2026-02-25T08:00:00Z", category: "wildlife", watchers: 89, imageColor: "#FF8F00" },
    { id: "AUC-2026-008", title: "Prague at 4AM", artist: "Anya Novak", artistId: "usr_016", type: "open", status: "sold", currentPrice: 0, startPrice: 1400, floorPrice: 500, topBid: 2900, bidCount: 22, startedAt: "2026-02-24T14:00:00Z", endsAt: "2026-02-25T02:00:00Z", category: "street", watchers: 78, imageColor: "#7C4DFF" },
    { id: "AUC-2026-009", title: "Arctic Solitude", artist: "Björn Sigurðsson", artistId: "usr_003", type: "dutch", status: "frozen", currentPrice: 4200, startPrice: 6000, floorPrice: 3000, topBid: 0, bidCount: 0, startedAt: "2026-02-25T10:00:00Z", endsAt: "2026-02-25T22:00:00Z", category: "landscape", watchers: 34, imageColor: "#B0BEC5" },
    { id: "AUC-2026-010", title: "Kerala Monsoon Reflections", artist: "Irina Volkova", artistId: "usr_002", type: "open", status: "live", currentPrice: 0, startPrice: 2400, floorPrice: 800, topBid: 3800, bidCount: 15, startedAt: "2026-02-25T22:00:00Z", endsAt: "2026-02-26T06:00:00Z", category: "landscape", watchers: 95, imageColor: "#00897B" },
    { id: "AUC-2026-011", title: "Abstract Fermentation", artist: "Solène Armand", artistId: "usr_004", type: "dutch", status: "scheduled", currentPrice: 4500, startPrice: 4500, floorPrice: 1800, topBid: 0, bidCount: 0, startedAt: "2026-02-26T10:00:00Z", endsAt: "2026-02-26T22:00:00Z", category: "abstract", watchers: 12, imageColor: "#F50057" },
    { id: "AUC-2026-012", title: "Tokyo Rain", artist: "Yuki Tanaka", artistId: "usr_008", type: "open", status: "scheduled", currentPrice: 0, startPrice: 2000, floorPrice: 650, topBid: 0, bidCount: 0, startedAt: "2026-02-26T12:00:00Z", endsAt: "2026-02-27T00:00:00Z", category: "street", watchers: 8, imageColor: "#311B92" },
];

// ─── BIDS ─────────────────────────────────────────────────────

export const bids: Bid[] = [
    { id: "BID-001", auctionId: "AUC-2026-002", auctionTitle: "Neon Monsoon, Shibuya", userId: "usr_005", userName: "Marcus Chen", amount: 3200, placedAt: "2026-02-25T22:15:00Z", status: "active" },
    { id: "BID-002", auctionId: "AUC-2026-002", auctionTitle: "Neon Monsoon, Shibuya", userId: "usr_001", userName: "Arjun Kapoor", amount: 2900, placedAt: "2026-02-25T21:45:00Z", status: "outbid" },
    { id: "BID-003", auctionId: "AUC-2026-004", auctionTitle: "Dust & Light, Jaisalmer", userId: "usr_017", userName: "David Kim", amount: 4800, placedAt: "2026-02-25T22:30:00Z", status: "active" },
    { id: "BID-004", auctionId: "AUC-2026-004", auctionTitle: "Dust & Light, Jaisalmer", userId: "usr_020", userName: "Sophie Turner", amount: 4500, placedAt: "2026-02-25T22:10:00Z", status: "outbid" },
    { id: "BID-005", auctionId: "AUC-2026-006", auctionTitle: "Midnight Canopy, Borneo", userId: "usr_015", userName: "Rafael Torres", amount: 5100, placedAt: "2026-02-25T22:40:00Z", status: "active" },
    { id: "BID-006", auctionId: "AUC-2026-006", auctionTitle: "Midnight Canopy, Borneo", userId: "usr_007", userName: "James Whitfield", amount: 4600, placedAt: "2026-02-25T22:20:00Z", status: "outbid" },
    { id: "BID-007", auctionId: "AUC-2026-010", auctionTitle: "Kerala Monsoon Reflections", userId: "usr_019", userName: "Omar Hassan", amount: 3800, placedAt: "2026-02-25T22:45:00Z", status: "active" },
    { id: "BID-008", auctionId: "AUC-2026-010", auctionTitle: "Kerala Monsoon Reflections", userId: "usr_011", userName: "Liam O'Brien", amount: 3400, placedAt: "2026-02-25T22:30:00Z", status: "outbid" },
    { id: "BID-009", auctionId: "AUC-2026-008", auctionTitle: "Prague at 4AM", userId: "usr_005", userName: "Marcus Chen", amount: 2900, placedAt: "2026-02-25T01:50:00Z", status: "won" },
    { id: "BID-010", auctionId: "AUC-2026-002", auctionTitle: "Neon Monsoon, Shibuya", userId: "usr_017", userName: "David Kim", amount: 2800, placedAt: "2026-02-25T21:00:00Z", status: "outbid" },
    { id: "BID-011", auctionId: "AUC-2026-004", auctionTitle: "Dust & Light, Jaisalmer", userId: "usr_001", userName: "Arjun Kapoor", amount: 4200, placedAt: "2026-02-25T20:30:00Z", status: "outbid" },
    { id: "BID-012", auctionId: "AUC-2026-006", auctionTitle: "Midnight Canopy, Borneo", userId: "usr_005", userName: "Marcus Chen", amount: 4900, placedAt: "2026-02-25T22:35:00Z", status: "outbid" },
];

// ─── TRANSACTIONS ────────────────────────────────────────────

export const transactions: Transaction[] = [
    { id: "TXN-20260225-001", type: "sale", amount: 2900, currency: "USD", from: "Marcus Chen", to: "Anya Novak", auctionId: "AUC-2026-008", status: "completed", timestamp: "2026-02-25T02:05:00Z", note: "Auction AUC-2026-008 — Prague at 4AM" },
    { id: "TXN-20260225-002", type: "platform_fee", amount: 348, currency: "USD", from: "Anya Novak", to: "ChitraVithika", auctionId: "AUC-2026-008", status: "completed", timestamp: "2026-02-25T02:05:01Z", note: "12% platform fee on sale TXN-20260225-001" },
    { id: "TXN-20260225-003", type: "escrow_hold", amount: 3200, currency: "USD", from: "Marcus Chen", to: "Escrow", auctionId: "AUC-2026-002", status: "held", timestamp: "2026-02-25T22:15:00Z", note: "Top bid escrow — Neon Monsoon" },
    { id: "TXN-20260225-004", type: "escrow_hold", amount: 4800, currency: "USD", from: "David Kim", to: "Escrow", auctionId: "AUC-2026-004", status: "held", timestamp: "2026-02-25T22:30:00Z", note: "Top bid escrow — Dust & Light" },
    { id: "TXN-20260225-005", type: "escrow_hold", amount: 5100, currency: "USD", from: "Rafael Torres", to: "Escrow", auctionId: "AUC-2026-006", status: "held", timestamp: "2026-02-25T22:40:00Z", note: "Top bid escrow — Midnight Canopy" },
    { id: "TXN-20260225-006", type: "escrow_release", amount: 2900, currency: "USD", from: "Escrow", to: "Marcus Chen", auctionId: null, status: "completed", timestamp: "2026-02-25T21:45:30Z", note: "Outbid refund — Neon Monsoon previous bid" },
    { id: "TXN-20260225-007", type: "payout", amount: 2552, currency: "USD", from: "ChitraVithika", to: "Anya Novak", auctionId: null, status: "completed", timestamp: "2026-02-25T10:00:00Z", note: "Royalty payout — Prague at 4AM (net after 12% fee)" },
    { id: "TXN-20260225-008", type: "sale", amount: 1800, currency: "USD", from: "James Whitfield", to: "Isabella Rossi", auctionId: "AUC-2026-007", status: "completed", timestamp: "2026-02-25T07:45:00Z", note: "Dutch auction hit floor — Serengeti Twilight" },
    { id: "TXN-20260225-009", type: "platform_fee", amount: 216, currency: "USD", from: "Isabella Rossi", to: "ChitraVithika", auctionId: "AUC-2026-007", status: "completed", timestamp: "2026-02-25T07:45:01Z", note: "12% platform fee — Serengeti Twilight" },
    { id: "TXN-20260225-010", type: "refund", amount: 4200, currency: "USD", from: "ChitraVithika", to: "Arjun Kapoor", auctionId: "AUC-2026-004", status: "completed", timestamp: "2026-02-25T20:35:00Z", note: "Outbid refund — Dust & Light" },
    { id: "TXN-20260224-011", type: "sale", amount: 3400, currency: "USD", from: "Sophie Turner", to: "Camille Dubois", auctionId: null, status: "completed", timestamp: "2026-02-24T16:20:00Z", note: "Direct purchase — Parisian Fog Series #3" },
    { id: "TXN-20260224-012", type: "platform_fee", amount: 408, currency: "USD", from: "Camille Dubois", to: "ChitraVithika", auctionId: null, status: "completed", timestamp: "2026-02-24T16:20:01Z", note: "12% platform fee — direct purchase" },
    { id: "TXN-20260224-013", type: "payout", amount: 4628, currency: "USD", from: "ChitraVithika", to: "Irina Volkova", auctionId: null, status: "pending", timestamp: "2026-02-24T12:00:00Z", note: "Weekly royalty payout batch" },
    { id: "TXN-20260224-014", type: "escrow_hold", amount: 3800, currency: "USD", from: "Omar Hassan", to: "Escrow", auctionId: "AUC-2026-010", status: "held", timestamp: "2026-02-25T22:45:00Z", note: "Top bid escrow — Kerala Monsoon" },
    { id: "TXN-20260223-015", type: "sale", amount: 5200, currency: "USD", from: "David Kim", to: "Björn Sigurðsson", auctionId: null, status: "completed", timestamp: "2026-02-23T14:30:00Z", note: "Direct purchase — Glacial Series #7" },
];

// ─── APPLICATIONS ────────────────────────────────────────────

export const applications: Application[] = [
    { id: "APP-2026-041", applicantName: "Priya Mehta", email: "priya@auravision.in", portfolio: "https://auravision.in/portfolio", specialization: "Temple Architecture & Sacred Geometry", statement: "My work explores the interplay of light and shadow within India's ancient temple complexes, capturing moments of spiritual resonance through precise composition and natural illumination.", submittedAt: "2026-02-20T09:30:00Z", status: "pending", reviewedBy: null, sampleWorks: [{ title: "Dawn at Hampi", color: "#F9A825" }, { title: "Stepwell Symmetry", color: "#4A90D9" }, { title: "Jain Temple Ceiling", color: "#7C4DFF" }], yearsExperience: 8, instagram: "@priyamehtafoto", country: "India" },
    { id: "APP-2026-042", applicantName: "Lucas Bergström", email: "lucas@nordiskbild.se", portfolio: "https://nordiskbild.se", specialization: "Scandinavian Minimalist Landscape", statement: "I seek the quiet drama of Nordic landscapes — where vast emptiness speaks louder than detail. My long exposures transform familiar coastlines into dreamscapes of mist and stone.", submittedAt: "2026-02-18T14:15:00Z", status: "pending", reviewedBy: null, sampleWorks: [{ title: "Swedish Coast, Winter", color: "#B0BEC5" }, { title: "Lapland Dawn", color: "#FF6D00" }, { title: "Baltic Fog", color: "#607D8B" }], yearsExperience: 12, instagram: "@lucasbergstrom", country: "Sweden" },
    { id: "APP-2026-043", applicantName: "Amara Osei", email: "amara@accraeye.gh", portfolio: "https://accraeye.gh/gallery", specialization: "West African Street Photography", statement: "I document the vibrant pulse of Accra's markets and streets — the color, the movement, the stories written on faces. My work is a celebration of everyday beauty in West Africa.", submittedAt: "2026-02-22T11:00:00Z", status: "pending", reviewedBy: null, sampleWorks: [{ title: "Market Day", color: "#E040FB" }, { title: "Fishermen at Dawn", color: "#F9A825" }, { title: "Kente Weaver", color: "#FF2D55" }], yearsExperience: 5, instagram: "@amaraosei_photo", country: "Ghana" },
    { id: "APP-2026-038", applicantName: "Viktor Kozlov", email: "viktor@urbanrust.ru", portfolio: "https://urbanrust.ru", specialization: "Post-Industrial Urban Decay", statement: "My photographs explore the haunting beauty of abandoned Soviet-era industrial complexes, finding poetry in rust, concrete, and reclaimed nature.", submittedAt: "2026-02-10T08:45:00Z", status: "approved", reviewedBy: "Elena Vasquez", sampleWorks: [{ title: "Pripyat Classroom", color: "#455A64" }, { title: "Rust Cathedral", color: "#BF360C" }], yearsExperience: 15, instagram: "@viktorkozlov", country: "Russia" },
    { id: "APP-2026-035", applicantName: "Hannah Kim", email: "hannah@noirseoul.kr", portfolio: "https://noirseoul.kr", specialization: "Korean Noir Portraiture", statement: "Blending cinematic noir aesthetics with intimate portrait photography, I create narratives that sit between reality and film stills.", submittedAt: "2026-02-05T16:30:00Z", status: "rejected", reviewedBy: "Elena Vasquez", sampleWorks: [{ title: "Gangnam After Midnight", color: "#1A237E" }, { title: "Soju & Smoke", color: "#212121" }], yearsExperience: 3, instagram: "@hannahkim_noir", country: "South Korea" },
    { id: "APP-2026-040", applicantName: "Diego Morales", email: "diego@selvaverde.co", portfolio: "https://selvaverde.co", specialization: "Amazonian Wildlife & Conservation", statement: "Through macro and telephoto work in the Colombian Amazon, I document species under threat and the ecosystems that sustain them, partnering with conservation organizations.", submittedAt: "2026-02-15T13:20:00Z", status: "info_requested", reviewedBy: "Elena Vasquez", sampleWorks: [{ title: "Poison Dart Frog", color: "#00E676" }, { title: "Canopy at Night", color: "#1B5E20" }, { title: "River Dolphin", color: "#0097A7" }], yearsExperience: 10, instagram: "@diegomorales_wild", country: "Colombia" },
];

// ─── ASSETS ──────────────────────────────────────────────────

export const assets: Asset[] = [
    { id: "AST-001", title: "Veiled Dusk Over the Moors", artistId: "usr_002", artistName: "Irina Volkova", uploadedAt: "2026-02-20T14:00:00Z", status: "approved", category: "landscape", resolution: "5472 × 3648", fileSize: "18.2 MB", exifCamera: "Canon EOS R5", exifLens: "RF 24-70mm f/2.8L IS", exifISO: 200, exifAperture: "f/11", exifShutter: "1/125s", staffPick: true, color: "#4A90D9", flagReason: null },
    { id: "AST-002", title: "Neon Monsoon, Shibuya", artistId: "usr_008", artistName: "Yuki Tanaka", uploadedAt: "2026-02-19T10:30:00Z", status: "approved", category: "street", resolution: "7952 × 5304", fileSize: "24.1 MB", exifCamera: "Sony A7R V", exifLens: "GM 35mm f/1.4", exifISO: 3200, exifAperture: "f/1.8", exifShutter: "1/200s", staffPick: true, color: "#E040FB", flagReason: null },
    { id: "AST-003", title: "Glacial Cathedral, Vatnajökull", artistId: "usr_003", artistName: "Björn Sigurðsson", uploadedAt: "2026-02-18T16:45:00Z", status: "approved", category: "abstract", resolution: "8640 × 5760", fileSize: "31.7 MB", exifCamera: "Hasselblad X2D", exifLens: "XCD 21mm f/4", exifISO: 100, exifAperture: "f/8", exifShutter: "2s", staffPick: false, color: "#40C4FF", flagReason: null },
    { id: "AST-004", title: "Dust & Light, Jaisalmer", artistId: "usr_012", artistName: "Fatima Al-Rashid", uploadedAt: "2026-02-21T08:20:00Z", status: "approved", category: "portrait", resolution: "6000 × 4000", fileSize: "15.8 MB", exifCamera: "Nikon Z9", exifLens: "Nikkor Z 85mm f/1.2 S", exifISO: 400, exifAperture: "f/2", exifShutter: "1/500s", staffPick: false, color: "#F9A825", flagReason: null },
    { id: "AST-005", title: "Midnight Garden Bloom", artistId: "usr_004", artistName: "Solène Armand", uploadedAt: "2026-02-23T19:00:00Z", status: "pending_review", category: "macro", resolution: "5472 × 3648", fileSize: "12.4 MB", exifCamera: "Canon EOS R5", exifLens: "RF 100mm f/2.8L Macro IS", exifISO: 800, exifAperture: "f/5.6", exifShutter: "1/60s", staffPick: false, color: "#AD1457", flagReason: null },
    { id: "AST-006", title: "Untitled Upload #47", artistId: "usr_016", artistName: "Anya Novak", uploadedAt: "2026-02-24T22:10:00Z", status: "pending_review", category: "street", resolution: "4000 × 6000", fileSize: "8.9 MB", exifCamera: "Fujifilm X-T5", exifLens: "XF 23mm f/1.4 R LM WR", exifISO: 1600, exifAperture: "f/2.8", exifShutter: "1/125s", staffPick: false, color: "#7C4DFF", flagReason: null },
    { id: "AST-007", title: "Desert Bloom (copy?)", artistId: "usr_006", artistName: "Priya Mehta", uploadedAt: "2026-02-24T23:50:00Z", status: "flagged", category: "landscape", resolution: "6000 × 4000", fileSize: "14.1 MB", exifCamera: "Sony A7 IV", exifLens: "FE 24-105mm f/4 G", exifISO: 100, exifAperture: "f/9", exifShutter: "1/250s", staffPick: false, color: "#FF6D00", flagReason: "Potential duplicate — 94% visual similarity with AST-004 (Fatima Al-Rashid)" },
    { id: "AST-008", title: "NSFW Content Detected", artistId: "usr_013", artistName: "Nikolai Petrov", uploadedAt: "2026-02-25T01:30:00Z", status: "flagged", category: "portrait", resolution: "4000 × 6000", fileSize: "9.2 MB", exifCamera: "Canon EOS R6 II", exifLens: "RF 50mm f/1.2", exifISO: 800, exifAperture: "f/1.4", exifShutter: "1/250s", staffPick: false, color: "#D50000", flagReason: "Automated content filter — explicit content detected (confidence: 92%)" },
];

// ─── DISPUTES ────────────────────────────────────────────────

export const disputes: Dispute[] = [
    { id: "DSP-001", auctionId: "AUC-2026-009", auctionTitle: "Arctic Solitude", complainantId: "usr_011", complainantName: "Liam O'Brien", respondentId: "usr_003", respondentName: "Björn Sigurðsson", reason: "Suspected Bid Manipulation", description: "I noticed the auction was frozen after my bid was placed. The artist appears to have self-bid from an alt account to inflate the price before the freeze occurred.", status: "investigating", filedAt: "2026-02-25T12:30:00Z", resolvedAt: null, resolution: null, amount: 4200 },
    { id: "DSP-002", auctionId: "AUC-2026-007", auctionTitle: "Serengeti Twilight", complainantId: "usr_007", complainantName: "James Whitfield", respondentId: "usr_018", respondentName: "Isabella Rossi", reason: "Image Authenticity", description: "After winning the auction, I discovered the winning image appears to be AI-generated based on visual artifacts in the horizon line. Requesting full refund.", status: "open", filedAt: "2026-02-25T14:00:00Z", resolvedAt: null, resolution: null, amount: 1800 },
    { id: "DSP-003", auctionId: "AUC-2026-008", auctionTitle: "Prague at 4AM", complainantId: "usr_005", complainantName: "Marcus Chen", respondentId: "usr_016", respondentName: "Anya Novak", reason: "Failed Payment", description: "Payment was deducted from my account but the high-resolution download was never delivered. Support has been unresponsive for 3 days.", status: "escalated", filedAt: "2026-02-25T08:15:00Z", resolvedAt: null, resolution: null, amount: 2900 },
    { id: "DSP-004", auctionId: "AUC-2026-003", auctionTitle: "Glacial Cathedral, Vatnajökull", complainantId: "usr_015", complainantName: "Rafael Torres", respondentId: "usr_003", respondentName: "Björn Sigurðsson", reason: "Misrepresented Edition Count", description: "The listing stated 3/7 editions remaining, but I've found evidence that 6 copies were sold on another platform simultaneously.", status: "resolved", filedAt: "2026-02-22T10:00:00Z", resolvedAt: "2026-02-24T16:30:00Z", resolution: "Artist issued full refund. Edition count corrected. 30-day watch placed on artist account.", amount: 5500 },
];

// ─── PAYOUTS ─────────────────────────────────────────────────

export const payouts: Payout[] = [
    { id: "PAY-2026-081", artistId: "usr_002", artistName: "Irina Volkova", amount: 5260, currency: "USD", status: "pending", period: "Feb 17-23, 2026", salesCount: 4, platformFee: 632, netAmount: 4628, requestedAt: "2026-02-24T00:00:00Z", processedAt: null, bankLast4: "4829" },
    { id: "PAY-2026-082", artistId: "usr_003", artistName: "Björn Sigurðsson", amount: 8100, currency: "USD", status: "pending", period: "Feb 17-23, 2026", salesCount: 3, platformFee: 972, netAmount: 7128, requestedAt: "2026-02-24T00:00:00Z", processedAt: null, bankLast4: "7213" },
    { id: "PAY-2026-083", artistId: "usr_014", artistName: "Camille Dubois", amount: 6800, currency: "USD", status: "pending", period: "Feb 17-23, 2026", salesCount: 5, platformFee: 816, netAmount: 5984, requestedAt: "2026-02-24T00:00:00Z", processedAt: null, bankLast4: "3391" },
    { id: "PAY-2026-084", artistId: "usr_018", artistName: "Isabella Rossi", amount: 4200, currency: "USD", status: "authorized", period: "Feb 10-16, 2026", salesCount: 2, platformFee: 504, netAmount: 3696, requestedAt: "2026-02-17T00:00:00Z", processedAt: null, bankLast4: "8854" },
    { id: "PAY-2026-085", artistId: "usr_016", artistName: "Anya Novak", amount: 3600, currency: "USD", status: "processing", period: "Feb 10-16, 2026", salesCount: 2, platformFee: 432, netAmount: 3168, requestedAt: "2026-02-17T00:00:00Z", processedAt: null, bankLast4: "1127" },
    { id: "PAY-2026-080", artistId: "usr_004", artistName: "Solène Armand", amount: 7400, currency: "USD", status: "completed", period: "Feb 10-16, 2026", salesCount: 4, platformFee: 888, netAmount: 6512, requestedAt: "2026-02-17T00:00:00Z", processedAt: "2026-02-19T14:30:00Z", bankLast4: "5502" },
    { id: "PAY-2026-079", artistId: "usr_008", artistName: "Yuki Tanaka", amount: 5100, currency: "USD", status: "completed", period: "Feb 10-16, 2026", salesCount: 3, platformFee: 612, netAmount: 4488, requestedAt: "2026-02-17T00:00:00Z", processedAt: "2026-02-19T14:30:00Z", bankLast4: "9041" },
    { id: "PAY-2026-086", artistId: "usr_012", artistName: "Fatima Al-Rashid", amount: 2800, currency: "USD", status: "failed", period: "Feb 10-16, 2026", salesCount: 1, platformFee: 336, netAmount: 2464, requestedAt: "2026-02-17T00:00:00Z", processedAt: "2026-02-19T14:35:00Z", bankLast4: "6678" },
];

// ─── AUDIT LOGS ──────────────────────────────────────────────

export const auditLogs: AuditLog[] = [
    { id: "LOG-001", adminId: "usr_010", adminName: "Admin Root", action: "freeze_auction", target: "AUC-2026-009", targetId: "AUC-2026-009", details: "Froze auction 'Arctic Solitude' — suspected bid manipulation reported by Liam O'Brien", timestamp: "2026-02-25T12:35:00Z", ip: "10.0.1.42" },
    { id: "LOG-002", adminId: "usr_009", adminName: "Elena Vasquez", action: "approve_application", target: "APP-2026-038", targetId: "APP-2026-038", details: "Approved Viktor Kozlov — portfolio quality exceptional, 15yr experience", timestamp: "2026-02-25T11:00:00Z", ip: "10.0.1.88" },
    { id: "LOG-003", adminId: "usr_009", adminName: "Elena Vasquez", action: "reject_application", target: "APP-2026-035", targetId: "APP-2026-035", details: "Rejected Hannah Kim — portfolio quality below threshold, only 3yr experience", timestamp: "2026-02-25T11:15:00Z", ip: "10.0.1.88" },
    { id: "LOG-004", adminId: "usr_010", adminName: "Admin Root", action: "flag_asset", target: "AST-007", targetId: "AST-007", details: "Flagged 'Desert Bloom' — 94% visual similarity with existing asset AST-004", timestamp: "2026-02-25T09:30:00Z", ip: "10.0.1.42" },
    { id: "LOG-005", adminId: "usr_010", adminName: "Admin Root", action: "flag_asset", target: "AST-008", targetId: "AST-008", details: "Auto-flagged — NSFW content detected with 92% confidence", timestamp: "2026-02-25T01:35:00Z", ip: "SYSTEM" },
    { id: "LOG-006", adminId: "usr_009", adminName: "Elena Vasquez", action: "resolve_dispute", target: "DSP-004", targetId: "DSP-004", details: "Resolved dispute — artist issued full refund, edition count corrected, 30-day watch", timestamp: "2026-02-24T16:30:00Z", ip: "10.0.1.88" },
    { id: "LOG-007", adminId: "usr_010", adminName: "Admin Root", action: "staff_pick", target: "AST-001", targetId: "AST-001", details: "Awarded Staff Pick badge — 'Veiled Dusk Over the Moors' by Irina Volkova", timestamp: "2026-02-24T15:00:00Z", ip: "10.0.1.42" },
    { id: "LOG-008", adminId: "usr_010", adminName: "Admin Root", action: "staff_pick", target: "AST-002", targetId: "AST-002", details: "Awarded Staff Pick badge — 'Neon Monsoon, Shibuya' by Yuki Tanaka", timestamp: "2026-02-24T15:05:00Z", ip: "10.0.1.42" },
    { id: "LOG-009", adminId: "usr_010", adminName: "Admin Root", action: "authorize_payout", target: "PAY-2026-084", targetId: "PAY-2026-084", details: "Authorized payout of $3,696 to Isabella Rossi (bank ****8854)", timestamp: "2026-02-24T10:00:00Z", ip: "10.0.1.42" },
    { id: "LOG-010", adminId: "usr_010", adminName: "Admin Root", action: "change_role", target: "usr_013", targetId: "usr_013", details: "Changed Nikolai Petrov role from 'artist' to 'user' — suspended for TOS violation", timestamp: "2026-02-23T18:00:00Z", ip: "10.0.1.42" },
    { id: "LOG-011", adminId: "usr_010", adminName: "Admin Root", action: "bulk_payout", target: "BATCH-2026-W07", targetId: "BATCH-2026-W07", details: "Bulk authorized 4 payouts totaling $17,864 for period Feb 10-16", timestamp: "2026-02-19T14:30:00Z", ip: "10.0.1.42" },
    { id: "LOG-012", adminId: "usr_009", adminName: "Elena Vasquez", action: "approve_asset", target: "AST-004", targetId: "AST-004", details: "Approved 'Dust & Light, Jaisalmer' — EXIF verified, original work confirmed", timestamp: "2026-02-22T09:00:00Z", ip: "10.0.1.88" },
    { id: "LOG-013", adminId: "usr_010", adminName: "Admin Root", action: "login", target: "admin_panel", targetId: "usr_010", details: "Admin login from 10.0.1.42", timestamp: "2026-02-25T08:00:00Z", ip: "10.0.1.42" },
    { id: "LOG-014", adminId: "usr_009", adminName: "Elena Vasquez", action: "login", target: "admin_panel", targetId: "usr_009", details: "Moderator login from 10.0.1.88", timestamp: "2026-02-25T09:00:00Z", ip: "10.0.1.88" },
    { id: "LOG-015", adminId: "usr_009", adminName: "Elena Vasquez", action: "modify_user", target: "usr_013", targetId: "usr_013", details: "Suspended user Nikolai Petrov — multiple TOS violations flagged", timestamp: "2026-02-20T14:00:00Z", ip: "10.0.1.88" },
];

// ─── DASHBOARD METRICS ──────────────────────────────────────

export const dashboardMetrics = {
    totalGMV: 1_247_800,
    gmvChange: 12.4,
    activeAuctions: 6,
    totalUsers: 20,
    activeUsers24h: 14,
    totalArtists: 8,
    pendingApplications: 3,
    pendingPayouts: 3,
    escrowHeld: 16_900,
    platformRevenue24h: 972,
    totalPlatformRevenue: 148_600,
    flaggedAssets: 2,
    openDisputes: 3,
    volume24h: [1200, 3400, 2100, 4800, 3200, 5100, 2900, 1800, 4200, 3600, 5600, 4100, 2800, 3900, 5200, 4400, 3100, 4700, 3800, 5400, 4200, 6100, 5800, 4900],
};

// ─── HELPERS ─────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(amount);
}

export function formatTimestamp(iso: string): string {
    return new Date(iso).toLocaleString("en-US", {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
    });
}

export function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}
