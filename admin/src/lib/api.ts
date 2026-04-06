/**
 * Admin API Client
 * Fetches real data from the ChitraVithika backend
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

let authToken: string | null = null;

export function setAuthToken(token: string) {
    authToken = token;
    if (typeof window !== 'undefined') {
        localStorage.setItem('cv_admin_token', token);
    }
}

export function getAuthToken(): string | null {
    if (authToken) return authToken;
    if (typeof window !== 'undefined') {
        return localStorage.getItem('cv_admin_token');
    }
    return null;
}

export function clearAuthToken() {
    authToken = null;
    if (typeof window !== 'undefined') {
        localStorage.removeItem('cv_admin_token');
    }
}

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
    const token = getAuthToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };
    
    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }
    
    const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });
    
    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error.error || `HTTP ${res.status}`);
    }
    
    return res.json();
}

// Auth
export async function login(email: string, password: string) {
    const data = await fetchAPI('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
    
    if (data.token) {
        setAuthToken(data.token);
    }
    
    return data;
}

export async function getCurrentUser() {
    return fetchAPI('/api/auth/me');
}

// Admin Stats
export async function getAdminStats() {
    return fetchAPI('/api/admin/stats');
}

export async function getAdminUsers() {
    return fetchAPI('/api/admin/users');
}

export async function getEngagementStats() {
    return fetchAPI('/api/admin/engagement');
}

// Catalog & Auctions
export async function getCatalog() {
    return fetchAPI('/api/catalog');
}

export async function getAuctions() {
    return fetchAPI('/api/auctions');
}

export async function getUsers() {
    return fetchAPI('/api/users');
}

// Types
export interface AdminStats {
    users: {
        total: number;
        photographers: number;
        buyers: number;
        admins: number;
        activeIn24h: number;
        recent: Array<{
            id: string;
            name: string;
            email: string;
            role: string;
            created_at: string;
        }>;
    };
    photos: {
        total: number;
        totalLikes: number;
        totalComments: number;
        mostLiked: Array<{
            id: number;
            title: string;
            artist: string;
            likeCount: number;
        }>;
        leastLiked: Array<{
            id: number;
            title: string;
            artist: string;
            likeCount: number;
        }>;
        mostCommented: Array<{
            id: number;
            title: string;
            artist: string;
            commentCount: number;
        }>;
    };
    auctions: {
        total: number;
        live: number;
        sold: number;
        totalBids: number;
        acceptedBids: number;
        totalRevenue: number;
        recentBids: Array<{
            id: number;
            auction_id: number;
            user_name: string;
            amount: number;
            accepted: boolean;
            placed_at: string;
        }>;
    };
}

export interface UserWithStats {
    id: string;
    email: string;
    name: string;
    role: string;
    created_at: string;
    last_active: string | null;
    stats: {
        photos: number;
        bids: number;
        likesGiven: number;
        comments: number;
        totalSpent: number;
        totalEarned: number;
    };
}

export interface PhotoEngagement {
    id: number;
    title: string;
    artist: string;
    category: string;
    price: number;
    engagement: {
        likes: number;
        comments: number;
        total: number;
    };
    auction: {
        id: number;
        sold: boolean;
        current_price: number;
        sold_price: number | null;
    } | null;
}
