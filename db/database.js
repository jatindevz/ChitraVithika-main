/**
 * ChitraVithika — Database Module (MongoDB / Mongoose)
 * Exposes a stable store API used by server.js.
 *
 * IMPORTANT: call  await store.connect()  before using any other method.
 * 
 * Images are stored in MongoDB using GridFS (no filesystem storage).
 */

'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const { Readable } = require('stream');
const { User, Photograph, Auction, Bid, Like, Comment, Purchase, Message, getNextSequence } = require('./models');

let gridFSBucket = null;

async function reconcileCommentIndexes() {
    let indexes = [];
    try {
        indexes = await Comment.collection.indexes();
    } catch (err) {
        if (err?.codeName === 'NamespaceNotFound' || err?.code === 26) {
            return;
        }
        throw err;
    }
    const legacyUniqueIndex = indexes.find((index) =>
        index.unique === true &&
        index.key &&
        index.key.photo_id === 1 &&
        index.key.user_id === 1
    );

    if (!legacyUniqueIndex) return;

    await Comment.collection.dropIndex(legacyUniqueIndex.name);
    console.log(`[db] Dropped legacy comment index: ${legacyUniqueIndex.name}`);
}

// ─── Config ──────────────────────────────────────────────────
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/chitravithika';

const CONNECT_OPTS = {
    serverSelectionTimeoutMS: 10_000,
    connectTimeoutMS: 10_000,
    socketTimeoutMS: 45_000,
    maxPoolSize: 10,
    minPoolSize: 0,
    // Vercel serverless: don't keep idle connections
    maxIdleTimeMS: 30_000,
};

// ─── Connect ─────────────────────────────────────────────────

let isConnected = false;

async function connect() {
    // Reuse existing connection (important for Vercel serverless cold starts)
    if (isConnected && mongoose.connection.readyState === 1) {
        return;
    }

    try {
        await mongoose.connect(MONGO_URI, CONNECT_OPTS);
        isConnected = true;
    } catch (err) {
        isConnected = false;
        console.error('[db] MongoDB connection failed:', err.message);
        throw err;
    }
    
    // Initialize GridFS bucket for image storage
    gridFSBucket = new GridFSBucket(mongoose.connection.db, {
        bucketName: 'images'
    });

    await reconcileCommentIndexes();
    
    console.log(`[db] Connected to MongoDB: ${MONGO_URI.replace(/\/\/([^:@]+):([^@]+)@/, '//***:***@')}`);
    console.log('[db] GridFS bucket initialized for image storage');
}

// Graceful close is exported in module.exports below

// ─── Helpers ─────────────────────────────────────────────────

function formatPhoto(doc) {
    if (!doc) return null;
    const d = doc.toObject ? doc.toObject() : doc;
    return {
        id: d._id,
        title: d.title,
        description: d.description,
        artist: d._artist_name || d.artist || 'Anonymous',
        artistId: d.artist_id,
        category: d.category,
        tags: d.tags || [],
        price: d.price,
        auctionFloor: d.auction_floor,
        editions: d.editions,
        remaining: d.remaining,
        width: d.width,
        height: d.height,
        color: d.color,
        filename: d.saved_as || d.filename,
        saved_as: d.saved_as || null,
        gridfs_id: d.gridfs_id || null,
        fileSize: d.file_size,
        mimeType: d.mime_type || 'image/jpeg',
        exif: d.exif || { camera: null, lens: null, iso: null, aperture: null, shutter: null },
        deletedByAdmin: Boolean(d.deleted_by_admin),
        deletedAt: d.deleted_at || null,
        createdAt: d.created_at,
    };
}

function cleanOptionalString(value) {
    if (value == null) return null;
    const cleaned = String(value).trim();
    return cleaned ? cleaned : null;
}

function isBaseProfileComplete(user) {
    return Boolean(
        cleanOptionalString(user?.name) &&
        cleanOptionalString(user?.phone) &&
        cleanOptionalString(user?.location)
    );
}

function isArtistProfileComplete(user) {
    return Boolean(
        isBaseProfileComplete(user) &&
        cleanOptionalString(user?.bio) &&
        cleanOptionalString(user?.artist_statement)
    );
}

function formatUserRecord(user) {
    if (!user) return null;
    return {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        password_hash: user.password_hash,
        firebase_uid: user.firebase_uid,
        photo_url: user.photo_url,
        auth_provider: user.auth_provider || 'email',
        phone: cleanOptionalString(user.phone),
        location: cleanOptionalString(user.location),
        bio: cleanOptionalString(user.bio),
        artist_statement: cleanOptionalString(user.artist_statement),
        website: cleanOptionalString(user.website),
        instagram: cleanOptionalString(user.instagram),
        profile_completed: Boolean(user.profile_completed || isBaseProfileComplete(user)),
        artist_profile_completed: Boolean(user.artist_profile_completed || isArtistProfileComplete(user)),
        created_at: user.created_at,
        last_active: user.last_active,
    };
}

function formatAuction(doc) {
    if (!doc) return null;
    const d = doc.toObject ? doc.toObject() : doc;
    return {
        id: d._id,
        photo_id: d.photo_id,
        type: d.type,
        start_price: d.start_price,
        floor_price: d.floor_price,
        current_price: d.current_price,
        decrement: d.decrement,
        interval_ms: d.interval_ms,
        sold: d.sold ? 1 : 0,
        sold_price: d.sold_price,
        buyer_id: d.buyer_id,
        started_at: d.started_at,
        ended_at: d.ended_at,
        // Populated photo fields (from aggregate/populate)
        title: d._photo?.title || d.title,
        artist: d._photo?.artist || d.artist,
        color: d._photo?.color || d.color,
        category: d._photo?.category || d.category,
        filename: d._photo?.filename || d.filename,
        saved_as: d._photo?.saved_as || d.saved_as,
        original_price: d._photo?.price || d.original_price,
    };
}

// ─── Public API (same signatures as SQLite version) ──────────

module.exports = {
    connect,

    // Photographs
    async getPhotographs() {
        const photos = await Photograph.find({ deleted_by_admin: { $ne: true } }).sort({ created_at: -1 }).lean();
        // Resolve artist names
        const artistIds = [...new Set(photos.map(p => p.artist_id).filter(Boolean))];
        const artists = await User.find({ _id: { $in: artistIds } }).lean();
        const artistMap = {};
        artists.forEach(a => { artistMap[a._id] = a.name; });

        return photos.map(p => {
            p._artist_name = artistMap[p.artist_id] || null;
            return formatPhoto(p);
        });
    },

    async getPhotograph(id) {
        const photo = await Photograph.findById(id).lean();
        if (!photo) return null;
        if (photo.artist_id) {
            const user = await User.findById(photo.artist_id).lean();
            if (user) photo._artist_name = user.name;
        }
        return formatPhoto(photo);
    },

    async insertPhotograph(data) {
        const id = await getNextSequence('photograph_id');
        const doc = await Photograph.create({
            _id: id,
            title: data.title,
            description: data.description || null,
            artist: data.artist,
            artist_id: data.artist_id || null,
            category: data.category || 'other',
            tags: data.tags || [],
            price: data.price,
            auction_floor: data.auction_floor || Math.round(data.price / 3),
            editions: data.editions || 1,
            remaining: data.remaining || data.editions || 1,
            width: data.width || null,
            height: data.height || null,
            color: data.color || '#888888',
            filename: data.filename || null,
            saved_as: data.saved_as || null,
            gridfs_id: data.gridfs_id || null,
            file_size: data.file_size || null,
            mime_type: data.mime_type || 'image/jpeg',
            exif: {
                camera: data.exif_camera || null,
                lens: data.exif_lens || null,
                iso: data.exif_iso || null,
                aperture: data.exif_aperture || null,
                shutter: data.exif_shutter || null,
            },
        });
        return doc._id;
    },

    // Users
    async getUserByEmail(email) {
        const user = await User.findOne({ email: email.toLowerCase() }).lean();
        return formatUserRecord(user);
    },

    async getUserById(id) {
        const user = await User.findById(id).lean();
        return formatUserRecord(user);
    },

    async getUsers() {
        const users = await User.find({}).sort({ created_at: -1 }).lean();
        return users.map((user) => formatUserRecord(user));
    },

    async createUser(data) {
        const baseProfileCompleted = isBaseProfileComplete(data);
        const artistProfileCompleted = isArtistProfileComplete(data);
        return User.create({
            _id: data.id,
            email: data.email.toLowerCase(),
            name: data.name,
            role: data.role || 'buyer',
            password_hash: data.password_hash || null,
            firebase_uid: data.firebase_uid || null,
            photo_url: data.photo_url || null,
            auth_provider: data.auth_provider || (data.firebase_uid ? 'google' : 'email'),
            phone: cleanOptionalString(data.phone),
            location: cleanOptionalString(data.location),
            bio: cleanOptionalString(data.bio),
            artist_statement: cleanOptionalString(data.artist_statement),
            website: cleanOptionalString(data.website),
            instagram: cleanOptionalString(data.instagram),
            profile_completed: baseProfileCompleted,
            artist_profile_completed: artistProfileCompleted,
        });
    },

    async updateUserFirebaseUID(userId, firebaseUid, photoUrl) {
        await User.findByIdAndUpdate(userId, { 
            firebase_uid: firebaseUid,
            photo_url: photoUrl,
        });
    },

    async updateUserProfile(userId, data) {
        const existing = await User.findById(userId).lean();
        if (!existing) return null;

        const merged = {
            ...existing,
            name: cleanOptionalString(data.name) || existing.name,
            phone: cleanOptionalString(data.phone),
            location: cleanOptionalString(data.location),
            bio: cleanOptionalString(data.bio),
            artist_statement: cleanOptionalString(data.artist_statement),
            website: cleanOptionalString(data.website),
            instagram: cleanOptionalString(data.instagram),
        };

        const profileCompleted = isBaseProfileComplete(merged);
        const wantsArtistRole = Boolean(data.upgrade_to_artist || existing.role === 'photographer');
        const artistProfileCompleted = isArtistProfileComplete(merged);
        const preserveExistingPhotographer = existing.role === 'photographer' && existing.auth_provider !== 'google';
        const nextRole = existing.role === 'admin'
            ? 'admin'
            : preserveExistingPhotographer || (wantsArtistRole && artistProfileCompleted)
                ? 'photographer'
                : 'buyer';

        await User.findByIdAndUpdate(userId, {
            name: merged.name,
            phone: merged.phone,
            location: merged.location,
            bio: merged.bio,
            artist_statement: merged.artist_statement,
            website: merged.website,
            instagram: merged.instagram,
            profile_completed: profileCompleted,
            artist_profile_completed: artistProfileCompleted,
            role: nextRole,
        });

        return this.getUserById(userId);
    },

    async updateUserPhoto(userId, photoUrl) {
        const cleaned = cleanOptionalString(photoUrl);
        if (!cleaned) return null;
        await User.findByIdAndUpdate(userId, { photo_url: cleaned });
        return this.getUserById(userId);
    },

    async touchUser(id) {
        await User.findByIdAndUpdate(id, { last_active: new Date() });
    },

    // Auctions
    async getAuctions() {
        const auctions = await Auction.find().sort({ started_at: -1 }).lean();
        const photoIds = [...new Set(auctions.map(a => a.photo_id))];
        const photos = await Photograph.find({ _id: { $in: photoIds } }).lean();
        const photoMap = {};
        photos.forEach(p => { photoMap[p._id] = p; });

        return auctions.map(a => {
            a._photo = photoMap[a.photo_id] || {};
            return formatAuction(a);
        });
    },

    async getAuctionByPhotoId(photoId) {
        const auction = await Auction.findOne({ photo_id: photoId }).lean();
        if (!auction) return null;
        const photo = await Photograph.findById(photoId).lean();
        auction._photo = photo || {};
        return formatAuction(auction);
    },

    async getAuctionById(id) {
        const auction = await Auction.findById(id).lean();
        if (!auction) return null;
        return {
            id: auction._id,
            photo_id: auction.photo_id,
            type: auction.type,
            start_price: auction.start_price,
            floor_price: auction.floor_price,
            current_price: auction.current_price,
            decrement: auction.decrement,
            interval_ms: auction.interval_ms,
            sold: auction.sold ? 1 : 0,
            sold_price: auction.sold_price,
            buyer_id: auction.buyer_id,
            started_at: auction.started_at,
            ended_at: auction.ended_at,
        };
    },

    async updateAuctionPrice(id, price, sold) {
        await Auction.findByIdAndUpdate(id, { current_price: price, sold: !!sold });
    },

    async resetAuction(id) {
        const auction = await Auction.findById(id);
        if (auction) {
            auction.current_price = auction.start_price;
            auction.sold = false;
            auction.sold_price = null;
            auction.buyer_id = null;
            auction.ended_at = null;
            await auction.save();
        }
    },

    async sellAuction(id, price, buyerId) {
        await Auction.findByIdAndUpdate(id, { sold: true, sold_price: price, buyer_id: buyerId, ended_at: new Date() });
    },

    async createAuction(data) {
        const id = await getNextSequence('auction_id');
        const doc = await Auction.create({
            _id: id,
            photo_id: data.photo_id,
            type: data.type || 'dutch',
            start_price: data.start_price,
            floor_price: data.floor_price,
            current_price: data.start_price,
            decrement: data.decrement || Math.round((data.start_price - data.floor_price) / 20),
            interval_ms: data.interval_ms || 10000,
        });
        return doc._id;
    },

    // Bids
    _formatBidRow(b) {
        let bid_status = b.bid_status;
        if (!bid_status) {
            if (b.accepted) bid_status = 'accepted';
            else bid_status = 'active';
        }
        return {
            id: b._id,
            auction_id: b.auction_id,
            user_id: b.user_id,
            user_name: b.user_name,
            amount: b.amount,
            accepted: b.accepted ? 1 : 0,
            bid_status,
            placed_at: b.placed_at,
        };
    },

    async getBidsForAuction(auctionId) {
        const bids = await Bid.find({ auction_id: auctionId }).sort({ placed_at: -1 }).lean();
        return bids.map(b => this._formatBidRow(b));
    },

    async placeBid(data) {
        const id = await getNextSequence('bid_id');
        const doc = await Bid.create({
            _id: id,
            auction_id: data.auction_id,
            user_id: data.user_id || null,
            user_name: data.user_name || 'Anonymous',
            amount: data.amount,
            accepted: !!data.accepted,
            bid_status: data.bid_status || (data.accepted ? 'accepted' : 'active'),
        });
        return doc._id;
    },

    async setBidStatus(bidId, bid_status) {
        await Bid.findByIdAndUpdate(bidId, { bid_status, accepted: bid_status === 'accepted' });
    },

    async cancelPendingBidsForAuction(auctionId) {
        await Bid.updateMany(
            { auction_id: auctionId, bid_status: { $in: ['pending', 'active'] } },
            { bid_status: 'cancelled' }
        );
    },

    async declinePendingBidsExcept(auctionId, winningBidId) {
        await Bid.updateMany(
            { auction_id: auctionId, _id: { $ne: winningBidId }, bid_status: 'pending' },
            { bid_status: 'declined' }
        );
    },

    async endAuctionWithoutSale(auctionId) {
        await Auction.findByIdAndUpdate(auctionId, {
            sold: false,
            ended_at: new Date(),
        });
        await Bid.updateMany(
            { auction_id: auctionId, bid_status: { $in: ['pending', 'active'] } },
            { bid_status: 'cancelled' }
        );
    },

    /**
     * Bids on listings owned by seller (for photographer dashboard).
     */
    async getIncomingBidsForSeller(sellerUserId) {
        const photos = await Photograph.find({ artist_id: sellerUserId }, '_id title artist').lean();
        if (!photos.length) return [];
        const photoIds = photos.map(p => p._id);
        const auctions = await Auction.find({ photo_id: { $in: photoIds } }).lean();
        const aucMap = new Map(auctions.map(a => [a._id, a]));
        const photoMap = new Map(photos.map(p => [p._id, p]));

        const bids = await Bid.find({ auction_id: { $in: [...aucMap.keys()] } })
            .sort({ placed_at: -1 })
            .lean();

        return bids.map(b => {
            const auc = aucMap.get(b.auction_id);
            const ph = auc ? photoMap.get(auc.photo_id) : null;
            const row = this._formatBidRow(b);
            return {
                ...row,
                photo_id: auc?.photo_id,
                auction_type: auc?.type || 'dutch',
                sold: auc?.sold,
                ended_at: auc?.ended_at,
                work_title: ph?.title || 'Work',
            };
        });
    },

    /**
     * Buyer dashboard: active bids + won list (deduped by photo).
     */
    async getBuyerBidSnapshot(userId) {
        const purchases = await Purchase.find({ user_id: userId }).select('photo_id').lean();
        const purchasedPhotoIds = new Set(purchases.map((purchase) => purchase.photo_id));
        const bids = await Bid.find({ user_id: userId }).sort({ placed_at: -1 }).lean();
        const auctionIds = [...new Set(bids.map(b => b.auction_id))];
        const auctions = auctionIds.length
            ? await Auction.find({ _id: { $in: auctionIds } }).lean()
            : [];
        const aucMap = new Map(auctions.map(a => [a._id, a]));
        const photoIds = [...new Set(auctions.map(a => a.photo_id))];
        const photos = photoIds.length
            ? await Photograph.find({ _id: { $in: photoIds } }).lean()
            : [];
        const photoMap = new Map(photos.map(p => [p._id, p]));

        const active = [];
        const seenActive = new Set();

        for (const b of bids) {
            const row = this._formatBidRow(b);
            const auc = aucMap.get(b.auction_id);
            if (!auc) continue;
            const ph = photoMap.get(auc.photo_id);
            const itemId = auc.photo_id;
            const type = auc.type === 'silent' ? 'silent' : 'open';

            if (['pending', 'active'].includes(row.bid_status) && !auc.sold && !auc.ended_at) {
                const key = `${itemId}-${b._id}`;
                if (!seenActive.has(key)) {
                    seenActive.add(key);
                    active.push({
                        ...row,
                        itemId,
                        title: ph?.title || 'Work',
                        artist: ph?.artist || '—',
                        color: ph?.color || '#888',
                        type,
                        amount: b.amount,
                        placed_at: b.placed_at,
                    });
                }
            }
        }

        const wonMap = new Map();
        const soldAuctions = await Auction.find({ buyer_id: userId, sold: true }).lean();
        const extraPhotoIds = soldAuctions.map(a => a.photo_id).filter(id => !photoMap.has(id));
        if (extraPhotoIds.length) {
            const extraPhotos = await Photograph.find({ _id: { $in: extraPhotoIds } }).lean();
            extraPhotos.forEach(p => photoMap.set(p._id, p));
        }

        for (const auc of soldAuctions) {
            const ph = photoMap.get(auc.photo_id);
            if (!ph) continue;
            wonMap.set(auc.photo_id, {
                bidId: null,
                itemId: auc.photo_id,
                title: ph.title,
                artist: ph.artist,
                amount: auc.sold_price || 0,
                color: ph.color || '#888',
                type: auc.type === 'silent' ? 'silent' : 'open',
                wonAt: auc.ended_at || auc.started_at,
                paymentPending: false,
                removedByAdmin: Boolean(ph.deleted_by_admin),
            });
        }

        for (const b of bids) {
            const row = this._formatBidRow(b);
            if (row.bid_status !== 'accepted') continue;
            const auc = aucMap.get(b.auction_id);
            if (!auc) continue;
            const paymentPending = auc.type === 'silent' && !purchasedPhotoIds.has(auc.photo_id);
            if (!auc.sold && !paymentPending) continue;
            const ph = photoMap.get(auc.photo_id);
            if (!ph) continue;
            wonMap.set(auc.photo_id, {
                bidId: b._id,
                itemId: auc.photo_id,
                title: ph.title,
                artist: ph.artist,
                amount: b.amount,
                color: ph.color || '#888',
                type: auc.type === 'silent' ? 'silent' : 'open',
                wonAt: auc.ended_at || b.placed_at,
                paymentPending,
                removedByAdmin: Boolean(ph.deleted_by_admin),
            });
        }

        return { active, won: [...wonMap.values()] };
    },

    /** Collection rows for buyer (direct purchases + won auctions). */
    async getBuyerCollectionFromDb(userId) {
        const [purchases, sold] = await Promise.all([
            Purchase.find({ user_id: userId }).sort({ created_at: -1 }).lean(),
            Auction.find({ buyer_id: userId, sold: true }).lean(),
        ]);

        const photoIds = [...new Set([
            ...purchases.map((p) => p.photo_id),
            ...sold.map((a) => a.photo_id),
        ])];
        if (!photoIds.length) return [];

        const photos = await Photograph.find({ _id: { $in: photoIds } }).lean();
        const photoMap = new Map(photos.map(p => [p._id, p]));
        const collectionMap = new Map();

        for (const pur of purchases) {
            const ph = photoMap.get(pur.photo_id);
            if (!ph) continue;
            collectionMap.set(pur.photo_id, {
                itemId: pur.photo_id,
                title: ph.title,
                artist: ph.artist,
                price: pur.amount || ph.price,
                license: pur.license || 'personal',
                color: ph.color || '#888',
                acquiredAt: pur.created_at ? pur.created_at.getTime() : Date.now(),
                source: pur.source || 'direct',
                removedByAdmin: Boolean(ph.deleted_by_admin),
                deletedAt: ph.deleted_at || null,
            });
        }

        for (const auc of sold) {
            const ph = photoMap.get(auc.photo_id);
            if (!ph || collectionMap.has(auc.photo_id)) continue;
            collectionMap.set(auc.photo_id, {
                itemId: auc.photo_id,
                title: ph.title,
                artist: ph.artist,
                price: auc.sold_price || ph.price,
                license: 'commercial',
                color: ph.color || '#888',
                acquiredAt: auc.ended_at ? auc.ended_at.getTime() : Date.now(),
                source: 'auction',
                removedByAdmin: Boolean(ph.deleted_by_admin),
                deletedAt: ph.deleted_at || null,
            });
        }

        return [...collectionMap.values()].sort((a, b) => b.acquiredAt - a.acquiredAt);
    },

    async hasUserPurchasedPhoto(userId, photoId) {
        if (!userId) return false;
        const existing = await Purchase.findOne({ user_id: userId, photo_id: photoId }).lean();
        return !!existing;
    },

    async getRemovedWorksForArtist(userId) {
        const photos = await Photograph.find({
            artist_id: userId,
            deleted_by_admin: true,
        }).sort({ deleted_at: -1, created_at: -1 }).lean();

        return photos.map((photo) => ({
            itemId: photo._id,
            title: photo.title,
            artist: photo.artist,
            color: photo.color || '#888',
            deletedAt: photo.deleted_at || photo.created_at || new Date(),
            price: photo.price || 0,
            remaining: photo.remaining || 0,
            editions: photo.editions || 0,
        }));
    },

    async sellerAcceptBid(sellerUserId, bidId) {
        const bid = await Bid.findById(bidId).lean();
        if (!bid) return { success: false, error: 'Bid not found' };
        if (bid.bid_status !== 'pending') {
            return { success: false, error: 'This bid cannot be granted' };
        }
        const auc = await Auction.findById(bid.auction_id).lean();
        if (!auc || auc.sold || auc.ended_at) {
            return { success: false, error: 'Auction is closed or sold' };
        }
        const photo = await Photograph.findById(auc.photo_id).lean();
        if (!photo || photo.artist_id !== sellerUserId) {
            return { success: false, error: 'You do not own this listing' };
        }
        if (auc.type !== 'silent') {
            return { success: false, error: 'Seller grant applies to sealed (silent) auctions only' };
        }

        await Auction.findByIdAndUpdate(auc._id, {
            sold: false,
            sold_price: bid.amount,
            buyer_id: bid.user_id,
            current_price: bid.amount,
            ended_at: new Date(),
        });
        await this.setBidStatus(bid._id, 'accepted');
        await this.declinePendingBidsExcept(auc._id, bid._id);
        return { success: true, photo_id: auc.photo_id, buyer_id: bid.user_id, bid_id: bid._id, amount: bid.amount, payment_pending: true };
    },

    async finalizeAcceptedBidPurchase(photoId, buyerId, bidId, options = {}) {
        const bid = await Bid.findById(bidId).lean();
        if (!bid) return { success: false, error: 'Winning bid not found' };
        if (bid.user_id !== buyerId) return { success: false, error: 'This winning bid belongs to another user' };
        if (bid.bid_status !== 'accepted') return { success: false, error: 'This bid is not ready for payment' };

        const auc = await Auction.findById(bid.auction_id).lean();
        if (!auc || auc.photo_id !== photoId) return { success: false, error: 'Auction not found for this work' };
        if (auc.type !== 'silent') return { success: false, error: 'Only accepted silent-auction bids can be paid here' };
        if (auc.buyer_id && auc.buyer_id !== buyerId) return { success: false, error: 'This auction is reserved for another buyer' };

        const pur = await this.purchaseEdition(photoId, buyerId, {
            license: 'commercial',
            amount: options.amount || bid.amount,
            payment_method: options.payment_method || 'auction-silent-upi',
            payment_reference: options.payment_reference || `AUC-${auc._id}-${bid._id}`,
            payment_app: options.payment_app || null,
            upi_id: options.upi_id || null,
            payee_vpa: options.payee_vpa || null,
            source: 'auction',
            auction_id: auc._id,
        });
        if (!pur.success) {
            return pur;
        }
        await this.sellAuction(auc._id, bid.amount, buyerId);
        await this.setBidStatus(bid._id, 'accepted');
        return {
            success: true,
            photo_id: auc.photo_id,
            buyer_id: buyerId,
            amount: bid.amount,
            remaining: pur.remaining,
            soldOut: pur.soldOut,
        };
    },

    async sellerDeclineBid(sellerUserId, bidId) {
        const bid = await Bid.findById(bidId).lean();
        if (!bid) return { success: false, error: 'Bid not found' };
        if (bid.bid_status !== 'pending') {
            return { success: false, error: 'Only pending sealed bids can be declined' };
        }
        const auc = await Auction.findById(bid.auction_id).lean();
        if (!auc) return { success: false, error: 'Auction not found' };
        const photo = await Photograph.findById(auc.photo_id).lean();
        if (!photo || photo.artist_id !== sellerUserId) {
            return { success: false, error: 'You do not own this listing' };
        }
        if (auc.type !== 'silent') {
            return { success: false, error: 'Only sealed bids can be declined this way' };
        }
        await Bid.findByIdAndUpdate(bidId, { bid_status: 'declined' });
        return { success: true };
    },

    async sellerEndAuction(sellerUserId, photoId) {
        const photo = await Photograph.findById(photoId).lean();
        if (!photo || photo.artist_id !== sellerUserId) {
            return { success: false, error: 'You do not own this listing' };
        }
        const auc = await Auction.findOne({ photo_id: photoId }).lean();
        if (!auc) return { success: false, error: 'No auction for this work' };
        if (auc.sold) return { success: false, error: 'Already sold' };
        if (auc.ended_at) return { success: false, error: 'Auction already ended' };

        await this.endAuctionWithoutSale(auc._id);
        return { success: true, photo_id: photoId };
    },

    // Purchase - decrement remaining editions and persist ownership
    async purchaseEdition(photoId, buyerId, options = {}) {
        const photo = await Photograph.findById(photoId);
        if (!photo) return { success: false, error: 'Photo not found' };
        if (!buyerId) return { success: false, error: 'Authentication required' };
        const alreadyPurchased = await Purchase.findOne({ user_id: buyerId, photo_id: photoId }).lean();
        if (alreadyPurchased) return { success: false, error: 'Already purchased' };
        if (photo.remaining <= 0) return { success: false, error: 'Sold out' };
        
        photo.remaining = photo.remaining - 1;
        await photo.save();

        const purchaseId = await getNextSequence('purchase_id');
        await Purchase.create({
            _id: purchaseId,
            photo_id: photoId,
            user_id: buyerId,
            license: options.license || 'personal',
            amount: options.amount || photo.price,
            payment_method: options.payment_method || 'upi-simulated',
            payment_reference: options.payment_reference || null,
            payment_meta: {
                app: options.payment_app || null,
                upi_id: options.upi_id || null,
                payee_vpa: options.payee_vpa || null,
            },
            source: options.source || 'direct',
            auction_id: options.auction_id || null,
        });
        
        return { 
            success: true, 
            remaining: photo.remaining, 
            soldOut: photo.remaining === 0,
            purchaseId,
        };
    },

    async relistOwnedPurchase(userId, photoId, data = {}) {
        const purchase = await Purchase.findOne({ user_id: userId, photo_id: photoId }).lean();
        if (!purchase) return { success: false, error: 'You do not own this work' };

        const photo = await Photograph.findById(photoId);
        if (!photo) return { success: false, error: 'Photo not found' };

        const startPrice = Number.parseFloat(data.start_price);
        const floorPrice = Number.parseFloat(data.floor_price);
        const auctionType = data.type === 'silent' ? 'silent' : 'dutch';

        if (!Number.isFinite(startPrice) || startPrice <= 0) {
            return { success: false, error: 'Enter a valid resale price' };
        }
        if (!Number.isFinite(floorPrice) || floorPrice <= 0) {
            return { success: false, error: 'Enter a valid floor price' };
        }
        if (floorPrice > startPrice) {
            return { success: false, error: 'Floor price cannot be higher than the resale price' };
        }

        photo.price = startPrice;
        photo.auction_floor = floorPrice;
        photo.remaining = Math.min(photo.editions, Math.max(0, photo.remaining) + 1);
        await photo.save();

        await Purchase.deleteOne({ _id: purchase._id });

        const nextDecrement = auctionType === 'silent'
            ? 0
            : Math.max(1, Math.round((startPrice - floorPrice) / 20));

        let auction = await Auction.findOne({ photo_id: photoId });
        if (!auction) {
            const auctionId = await this.createAuction({
                photo_id: photoId,
                type: auctionType,
                start_price: startPrice,
                floor_price: floorPrice,
                decrement: nextDecrement,
                interval_ms: 10000,
            });
            auction = await Auction.findById(auctionId);
        } else {
            auction.type = auctionType;
            auction.start_price = startPrice;
            auction.floor_price = floorPrice;
            auction.current_price = startPrice;
            auction.decrement = nextDecrement;
            auction.interval_ms = 10000;
            auction.sold = false;
            auction.sold_price = null;
            auction.buyer_id = null;
            auction.ended_at = null;
            await auction.save();
        }

        await Bid.deleteMany({ auction_id: auction._id });

        return {
            success: true,
            photo_id: photoId,
            auction_id: auction._id,
            type: auctionType,
            start_price: startPrice,
            floor_price: floorPrice,
            current_price: startPrice,
            decrement: nextDecrement,
            interval_ms: 10000,
            remaining: photo.remaining,
        };
    },

    // Claim unclaimed photos for a user
    async claimUnclaimedPhotos(userId, userName) {
        const result = await Photograph.updateMany(
            { artist_id: null },
            { $set: { artist_id: userId, artist: userName } }
        );
        return { modified: result.modifiedCount };
    },

    // ─── Likes ────────────────────────────────────────────────────

    async toggleLike(photoId, userId) {
        const existing = await Like.findOne({ photo_id: photoId, user_id: userId });
        if (existing) {
            await Like.deleteOne({ _id: existing._id });
            return { liked: false };
        }
        const id = await getNextSequence('like_id');
        await Like.create({ _id: id, photo_id: photoId, user_id: userId });
        return { liked: true };
    },

    async getLikesForPhoto(photoId) {
        const count = await Like.countDocuments({ photo_id: photoId });
        return count;
    },

    async hasUserLiked(photoId, userId) {
        if (!userId) return false;
        const existing = await Like.findOne({ photo_id: photoId, user_id: userId });
        return !!existing;
    },

    async getUserLikes(userId) {
        const likes = await Like.find({ user_id: userId }).lean();
        return likes.map(l => l.photo_id);
    },

    // ─── Comments ─────────────────────────────────────────────────

    async addComment(photoId, userId, userName, content) {
        const id = await getNextSequence('comment_id');
        const doc = await Comment.create({
            _id: id,
            photo_id: photoId,
            user_id: userId,
            user_name: userName,
            content: content.trim(),
        });
        return {
            id: doc._id,
            photo_id: doc.photo_id,
            user_id: doc.user_id,
            user_name: doc.user_name,
            content: doc.content,
            created_at: doc.created_at,
        };
    },

    async getCommentsForPhoto(photoId) {
        const comments = await Comment.find({ photo_id: photoId }).sort({ created_at: -1 }).lean();
        return comments.map(c => ({
            id: c._id,
            photo_id: c.photo_id,
            user_id: c.user_id,
            user_name: c.user_name,
            content: c.content,
            edited: c.edited,
            created_at: c.created_at,
        }));
    },

    async deleteComment(commentId, userId) {
        const comment = await Comment.findById(commentId);
        if (!comment) return { success: false, error: 'Comment not found' };
        if (comment.user_id !== userId) return { success: false, error: 'Not authorized' };
        await Comment.deleteOne({ _id: commentId });
        return { success: true };
    },

    async editComment(commentId, userId, newContent) {
        const comment = await Comment.findById(commentId);
        if (!comment) return { success: false, error: 'Comment not found' };
        if (comment.user_id !== userId) return { success: false, error: 'Not authorized' };
        comment.content = newContent.trim();
        comment.edited = true;
        await comment.save();
        return { success: true, comment };
    },

    // —— Messages ————————————————————————————————————————————————

    async getConversation(userId, otherUserId) {
        const messages = await Message.find({
            $or: [
                { sender_id: userId, recipient_id: otherUserId },
                { sender_id: otherUserId, recipient_id: userId },
            ],
        }).sort({ created_at: 1 }).lean();

        await Message.updateMany(
            { sender_id: otherUserId, recipient_id: userId, read: false },
            { read: true }
        );

        return messages.map((message) => ({
            id: message._id,
            senderId: message.sender_id,
            recipientId: message.recipient_id,
            senderName: message.sender_name,
            recipientName: message.recipient_name,
            content: message.content,
            read: Boolean(message.read),
            createdAt: message.created_at,
        }));
    },

    async sendMessage(senderId, senderName, recipientId, recipientName, content) {
        const id = await getNextSequence('message_id');
        const doc = await Message.create({
            _id: id,
            sender_id: senderId,
            recipient_id: recipientId,
            sender_name: senderName,
            recipient_name: recipientName,
            content: content.trim(),
            read: false,
        });

        return {
            id: doc._id,
            senderId: doc.sender_id,
            recipientId: doc.recipient_id,
            senderName: doc.sender_name,
            recipientName: doc.recipient_name,
            content: doc.content,
            read: Boolean(doc.read),
            createdAt: doc.created_at,
        };
    },

    async getInboxThreads(userId) {
        const messages = await Message.find({
            $or: [
                { sender_id: userId },
                { recipient_id: userId },
            ],
        }).sort({ created_at: -1 }).lean();

        const threads = new Map();
        for (const message of messages) {
            const otherId = message.sender_id === userId ? message.recipient_id : message.sender_id;
            const otherName = message.sender_id === userId ? message.recipient_name : message.sender_name;
            if (!threads.has(otherId)) {
                threads.set(otherId, {
                    otherUserId: otherId,
                    otherUserName: otherName,
                    lastMessage: message.content,
                    lastAt: message.created_at,
                    unreadCount: 0,
                });
            }
            if (message.recipient_id === userId && !message.read) {
                threads.get(otherId).unreadCount += 1;
            }
        }

        return [...threads.values()].sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt));
    },

    // ─── Admin Stats ──────────────────────────────────────────────

    async getAdminStats() {
        const [
            totalUsers,
            totalPhotographers,
            totalBuyers,
            totalPhotos,
            totalAuctions,
            totalBids,
            totalLikes,
            totalComments,
            soldAuctions,
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ role: 'photographer' }),
            User.countDocuments({ role: 'buyer' }),
            Photograph.countDocuments(),
            Auction.countDocuments(),
            Bid.countDocuments(),
            Like.countDocuments(),
            Comment.countDocuments(),
            Auction.countDocuments({ sold: true }),
        ]);

        // Calculate total revenue from sold auctions
        const soldAuctionDocs = await Auction.find({ sold: true, sold_price: { $gt: 0 } }).lean();
        const totalRevenue = soldAuctionDocs.reduce((sum, a) => sum + (a.sold_price || 0), 0);

        // Get recent activity
        const recentUsers = await User.find().sort({ created_at: -1 }).limit(5).lean();
        const recentBids = await Bid.find().sort({ placed_at: -1 }).limit(10).lean();

        // Get most liked photos
        const likeCounts = await Like.aggregate([
            { $group: { _id: '$photo_id', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
        const mostLikedIds = likeCounts.map(l => l._id);
        const mostLikedPhotos = await Photograph.find({ _id: { $in: mostLikedIds } }).lean();
        const mostLiked = likeCounts.map(l => {
            const photo = mostLikedPhotos.find(p => p._id === l._id);
            return photo ? { ...formatPhoto(photo), likeCount: l.count } : null;
        }).filter(Boolean);

        // Get least liked photos (photos with 0 or few likes)
        const allPhotoIds = await Photograph.find().select('_id').lean();
        const photoLikeCounts = await Promise.all(
            allPhotoIds.map(async (p) => {
                const count = await Like.countDocuments({ photo_id: p._id });
                return { id: p._id, count };
            })
        );
        photoLikeCounts.sort((a, b) => a.count - b.count);
        const leastLikedIds = photoLikeCounts.slice(0, 10).map(p => p.id);
        const leastLikedPhotos = await Photograph.find({ _id: { $in: leastLikedIds } }).lean();
        const leastLiked = photoLikeCounts.slice(0, 10).map(l => {
            const photo = leastLikedPhotos.find(p => p._id === l.id);
            return photo ? { ...formatPhoto(photo), likeCount: l.count } : null;
        }).filter(Boolean);

        // Get most commented photos
        const commentCounts = await Comment.aggregate([
            { $group: { _id: '$photo_id', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
        const mostCommentedIds = commentCounts.map(c => c._id);
        const mostCommentedPhotos = await Photograph.find({ _id: { $in: mostCommentedIds } }).lean();
        const mostCommented = commentCounts.map(c => {
            const photo = mostCommentedPhotos.find(p => p._id === c._id);
            return photo ? { ...formatPhoto(photo), commentCount: c.count } : null;
        }).filter(Boolean);

        // User activity stats
        const activeUsers24h = await User.countDocuments({
            last_active: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        });

        // Auction stats
        const liveAuctions = await Auction.countDocuments({ sold: false });
        const acceptedBids = await Bid.countDocuments({ accepted: true });
        const pendingSellerBids = await Bid.countDocuments({ bid_status: 'pending' });

        return {
            users: {
                total: totalUsers,
                photographers: totalPhotographers,
                buyers: totalBuyers,
                admins: await User.countDocuments({ role: 'admin' }),
                activeIn24h: activeUsers24h,
                recent: recentUsers.map(u => ({
                    id: u._id,
                    name: u.name,
                    email: u.email,
                    role: u.role,
                    created_at: u.created_at,
                })),
            },
            photos: {
                total: totalPhotos,
                totalLikes,
                totalComments,
                mostLiked,
                leastLiked,
                mostCommented,
            },
            auctions: {
                total: totalAuctions,
                live: liveAuctions,
                sold: soldAuctions,
                totalBids,
                acceptedBids,
                pendingSellerBids,
                totalRevenue,
                recentBids: recentBids.map(b => ({
                    id: b._id,
                    auction_id: b.auction_id,
                    user_name: b.user_name,
                    amount: b.amount,
                    accepted: b.accepted,
                    bid_status: b.bid_status || (b.accepted ? 'accepted' : 'pending'),
                    placed_at: b.placed_at,
                })),
            },
        };
    },

    async getAllUsersWithStats() {
        const users = await User.find().sort({ created_at: -1 }).lean();
        const userStats = await Promise.all(users.map(async (u) => {
            const photosCount = await Photograph.countDocuments({ artist_id: u._id });
            const bidsCount = await Bid.countDocuments({ user_id: u._id });
            const likesGiven = await Like.countDocuments({ user_id: u._id });
            const commentsCount = await Comment.countDocuments({ user_id: u._id });
            
            // Calculate total spent (accepted bids)
            const acceptedBids = await Bid.find({ user_id: u._id, accepted: true }).lean();
            const totalSpent = acceptedBids.reduce((sum, b) => sum + b.amount, 0);
            
            // Calculate total earned (for photographers - sold auctions)
            let totalEarned = 0;
            if (u.role === 'photographer') {
                const userPhotos = await Photograph.find({ artist_id: u._id }).select('_id').lean();
                const photoIds = userPhotos.map(p => p._id);
                const soldAuctions = await Auction.find({ 
                    photo_id: { $in: photoIds }, 
                    sold: true 
                }).lean();
                totalEarned = soldAuctions.reduce((sum, a) => sum + (a.sold_price || 0), 0);
            }

            return {
                id: u._id,
                email: u.email,
                name: u.name,
                role: u.role,
                created_at: u.created_at,
                last_active: u.last_active,
                stats: {
                    photos: photosCount,
                    bids: bidsCount,
                    likesGiven,
                    comments: commentsCount,
                    totalSpent,
                    totalEarned,
                },
            };
        }));
        return userStats;
    },

    async getPhotoEngagementStats() {
        const photos = await Photograph.find({ deleted_by_admin: { $ne: true } }).lean();
        const stats = await Promise.all(photos.map(async (p) => {
            const likes = await Like.countDocuments({ photo_id: p._id });
            const comments = await Comment.countDocuments({ photo_id: p._id });
            const auction = await Auction.findOne({ photo_id: p._id }).lean();
            return {
                ...formatPhoto(p),
                engagement: {
                    likes,
                    comments,
                    total: likes + comments,
                },
                auction: auction ? {
                    id: auction._id,
                    sold: auction.sold,
                    current_price: auction.current_price,
                    sold_price: auction.sold_price,
                } : null,
            };
        }));
        return stats.sort((a, b) => b.engagement.total - a.engagement.total);
    },

    // ─── Admin Delete Operations ──────────────────────────────────

    async deleteUser(userId) {
        const user = await User.findById(userId);
        if (!user) return { success: false, error: 'User not found' };
        if (user.role === 'admin') return { success: false, error: 'Cannot delete admin users' };

        // Delete user's photos, their auctions, bids, likes, comments
        const userPhotos = await Photograph.find({ artist_id: userId }).lean();
        const photoIds = userPhotos.map(p => p._id);

        // Find auctions before deleting them so we can remove associated bids.
        const auctions = photoIds.length
            ? await Auction.find({ photo_id: { $in: photoIds } }).lean()
            : [];
        const auctionIds = auctions.map(a => a._id);

        // Delete auctions for user's photos
        if (auctionIds.length) {
            await Bid.deleteMany({ auction_id: { $in: auctionIds } });
            await Auction.deleteMany({ _id: { $in: auctionIds } });
        }

        // Delete user's photos
        for (const photo of userPhotos) {
            if (photo.gridfs_id) {
                try {
                    await this.deleteImageFromGridFS(photo.gridfs_id);
                } catch (e) {
                    console.error('[admin] Failed to delete GridFS image:', e.message);
                }
            }
        }
        await Photograph.deleteMany({ artist_id: userId });

        // Delete user's likes, comments, and purchases
        await Like.deleteMany({ user_id: userId });
        await Comment.deleteMany({ user_id: userId });
        await Message.deleteMany({ $or: [{ sender_id: userId }, { recipient_id: userId }] });
        await Purchase.deleteMany({
            $or: [
                { user_id: userId },
                { photo_id: { $in: photoIds } },
            ],
        });

        // Delete user's bids
        await Bid.deleteMany({ user_id: userId });

        // Finally delete the user
        await User.deleteOne({ _id: userId });

        console.log(`[admin] Deleted user ${userId} and all associated data`);
        return { success: true, deletedPhotoIds: photoIds };
    },

    async deletePhoto(photoId) {
        const photo = await Photograph.findById(photoId);
        if (!photo) return { success: false, error: 'Photo not found' };

        const auction = await Auction.findOne({ photo_id: photoId });
        if (auction) {
            await Bid.updateMany(
                { auction_id: auction._id, bid_status: { $in: ['pending', 'active'] } },
                { bid_status: 'cancelled' }
            );
            if (!auction.sold) {
                auction.ended_at = new Date();
                await auction.save();
            }
        }

        await Like.deleteMany({ photo_id: photoId });
        await Comment.deleteMany({ photo_id: photoId });

        // Delete image from GridFS if exists
        if (photo.gridfs_id) {
            try {
                await this.deleteImageFromGridFS(photo.gridfs_id);
            } catch (e) {
                console.error('[admin] Failed to delete GridFS image:', e.message);
            }
        }

        photo.deleted_by_admin = true;
        photo.deleted_at = new Date();
        photo.gridfs_id = null;
        photo.saved_as = null;
        photo.filename = null;
        await photo.save();

        console.log(`[admin] Soft-removed photo ${photoId} and ended public availability`);
        return { success: true };
    },

    // ─── GridFS Image Storage ─────────────────────────────────────

    // Upload image buffer to GridFS, returns the GridFS file ID
    async uploadImageToGridFS(buffer, filename, mimeType = 'image/jpeg') {
        if (!gridFSBucket) {
            throw new Error('GridFS bucket not initialized. Call connect() first.');
        }

        return new Promise((resolve, reject) => {
            const uploadStream = gridFSBucket.openUploadStream(filename, {
                contentType: mimeType,
                metadata: {
                    uploadedAt: new Date(),
                    originalName: filename,
                }
            });

            const readableStream = Readable.from(buffer);
            
            readableStream.pipe(uploadStream)
                .on('error', reject)
                .on('finish', () => {
                    console.log(`[gridfs] Uploaded: ${filename} → ${uploadStream.id}`);
                    resolve(uploadStream.id);
                });
        });
    },

    // Download image from GridFS by file ID, returns Buffer
    async downloadImageFromGridFS(fileId) {
        if (!gridFSBucket) {
            throw new Error('GridFS bucket not initialized. Call connect() first.');
        }

        const { ObjectId } = require('mongodb');
        const objectId = typeof fileId === 'string' ? new ObjectId(fileId) : fileId;

        return new Promise((resolve, reject) => {
            const chunks = [];
            const downloadStream = gridFSBucket.openDownloadStream(objectId);

            downloadStream
                .on('data', chunk => chunks.push(chunk))
                .on('error', reject)
                .on('end', () => {
                    resolve(Buffer.concat(chunks));
                });
        });
    },

    // Get GridFS file info by ID
    async getGridFSFileInfo(fileId) {
        if (!gridFSBucket) {
            throw new Error('GridFS bucket not initialized. Call connect() first.');
        }

        const { ObjectId } = require('mongodb');
        const objectId = typeof fileId === 'string' ? new ObjectId(fileId) : fileId;

        const files = await gridFSBucket.find({ _id: objectId }).toArray();
        return files.length > 0 ? files[0] : null;
    },

    // Delete image from GridFS by file ID
    async deleteImageFromGridFS(fileId) {
        if (!gridFSBucket) {
            throw new Error('GridFS bucket not initialized. Call connect() first.');
        }

        const { ObjectId } = require('mongodb');
        const objectId = typeof fileId === 'string' ? new ObjectId(fileId) : fileId;

        await gridFSBucket.delete(objectId);
        console.log(`[gridfs] Deleted: ${fileId}`);
    },

    // Close (reset isConnected flag for serverless reuse)
    async close() {
        if (mongoose.connection.readyState === 1) {
            await mongoose.disconnect();
            isConnected = false;
            console.log('[db] MongoDB connection closed');
        }
    },
};
