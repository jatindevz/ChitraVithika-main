/**
 * ChitraVithika — Mongoose Models
 * Defines schemas for Users, Photographs, Auctions, and Bids.
 */

'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Counter Schema (for auto-incrementing integer IDs) ──────
const counterSchema = new Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
});
const Counter = mongoose.model('Counter', counterSchema);

async function getNextSequence(name) {
    const counter = await Counter.findByIdAndUpdate(
        name,
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return counter.seq;
}

// ─── User Schema ─────────────────────────────────────────────
const userSchema = new Schema({
    _id: { type: String },                                    // 'usr_xxx' format kept
    email: { type: String, required: true, unique: true, lowercase: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['buyer', 'photographer', 'admin'], default: 'buyer' },
    password_hash: { type: String, default: null },
    firebase_uid: { type: String, default: null },            // Firebase UID for Google sign-in
    photo_url: { type: String, default: null },               // Profile photo from Google
    auth_provider: { type: String, enum: ['email', 'google'], default: 'email' },
    phone: { type: String, default: null },
    location: { type: String, default: null },
    bio: { type: String, default: null },
    artist_statement: { type: String, default: null },
    website: { type: String, default: null },
    instagram: { type: String, default: null },
    profile_completed: { type: Boolean, default: false },
    artist_profile_completed: { type: Boolean, default: false },
    last_active: { type: Date, default: null },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false },
});

// email index created automatically by unique: true

// ─── Photograph Schema ───────────────────────────────────────
const photographSchema = new Schema({
    _id: { type: Number },                                     // auto-increment integer
    title: { type: String, required: true },
    description: { type: String, default: null },
    artist: { type: String, required: true },
    artist_id: { type: String, ref: 'User', default: null },
    category: { type: String, required: true, default: 'other' },
    tags: { type: [String], default: [] },                     // native array!
    price: { type: Number, required: true },
    auction_floor: { type: Number, default: 0 },
    editions: { type: Number, default: 1 },
    remaining: { type: Number, default: 1 },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    color: { type: String, default: '#888888' },
    filename: { type: String, default: null },
    saved_as: { type: String, default: null },
    gridfs_id: { type: Schema.Types.ObjectId, default: null },
    file_size: { type: Number, default: null },
    mime_type: { type: String, default: 'image/jpeg' },
    exif: {
        camera: { type: String, default: null },
        lens: { type: String, default: null },
        iso: { type: String, default: null },
        aperture: { type: String, default: null },
        shutter: { type: String, default: null },
    },
    deleted_by_admin: { type: Boolean, default: false },
    deleted_at: { type: Date, default: null },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false },
});

photographSchema.index({ artist_id: 1 });
photographSchema.index({ category: 1 });

// ─── Auction Schema ──────────────────────────────────────────
const auctionSchema = new Schema({
    _id: { type: Number },                                     // auto-increment integer
    photo_id: { type: Number, ref: 'Photograph', required: true },
    type: { type: String, enum: ['dutch', 'english', 'silent'], default: 'dutch' },
    start_price: { type: Number, required: true },
    floor_price: { type: Number, required: true },
    current_price: { type: Number, required: true },
    decrement: { type: Number, default: 0 },
    interval_ms: { type: Number, default: 10000 },
    sold: { type: Boolean, default: false },
    sold_price: { type: Number, default: null },
    buyer_id: { type: String, ref: 'User', default: null },
    ended_at: { type: Date, default: null },
}, {
    timestamps: { createdAt: 'started_at', updatedAt: false },
});

auctionSchema.index({ photo_id: 1 });

// ─── Bid Schema ──────────────────────────────────────────────
const bidSchema = new Schema({
    _id: { type: Number },                                     // auto-increment integer
    auction_id: { type: Number, ref: 'Auction', required: true },
    user_id: { type: String, ref: 'User', default: null },
    user_name: { type: String, default: 'Anonymous' },
    amount: { type: Number, required: true },
    accepted: { type: Boolean, default: false },              // legacy: instant Dutch win
    bid_status: {
        type: String,
        enum: ['pending', 'active', 'accepted', 'declined', 'cancelled'],
        default: 'pending',
    },
}, {
    timestamps: { createdAt: 'placed_at', updatedAt: 'updated_at' },
});

bidSchema.index({ auction_id: 1 });
bidSchema.index({ user_id: 1 });

// ─── Like Schema ─────────────────────────────────────────────
const likeSchema = new Schema({
    _id: { type: Number },
    photo_id: { type: Number, ref: 'Photograph', required: true },
    user_id: { type: String, ref: 'User', required: true },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false },
});

likeSchema.index({ photo_id: 1 });
likeSchema.index({ user_id: 1 });
likeSchema.index({ photo_id: 1, user_id: 1 }, { unique: true });

// ─── Comment Schema ──────────────────────────────────────────
const commentSchema = new Schema({
    _id: { type: Number },
    photo_id: { type: Number, ref: 'Photograph', required: true },
    user_id: { type: String, ref: 'User', required: true },
    user_name: { type: String, required: true },
    content: { type: String, required: true, maxlength: 1000 },
    edited: { type: Boolean, default: false },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

commentSchema.index({ photo_id: 1 });
commentSchema.index({ user_id: 1 });
const purchaseSchema = new Schema({
    _id: { type: Number },
    photo_id: { type: Number, ref: 'Photograph', required: true },
    user_id: { type: String, ref: 'User', required: true },
    license: { type: String, enum: ['personal', 'editorial', 'commercial'], default: 'personal' },
    amount: { type: Number, required: true },
    payment_method: { type: String, default: 'upi-simulated' },
    payment_reference: { type: String, default: null },
    payment_meta: {
        app: { type: String, default: null },
        upi_id: { type: String, default: null },
        payee_vpa: { type: String, default: null },
    },
    source: { type: String, enum: ['direct', 'auction'], default: 'direct' },
    auction_id: { type: Number, ref: 'Auction', default: null },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false },
});

purchaseSchema.index({ photo_id: 1 });
purchaseSchema.index({ user_id: 1 });
purchaseSchema.index({ photo_id: 1, user_id: 1 }, { unique: true });

const messageSchema = new Schema({
    _id: { type: Number },
    sender_id: { type: String, ref: 'User', required: true },
    recipient_id: { type: String, ref: 'User', required: true },
    sender_name: { type: String, required: true },
    recipient_name: { type: String, required: true },
    content: { type: String, required: true, maxlength: 2000 },
    read: { type: Boolean, default: false },
}, {
    timestamps: { createdAt: 'created_at', updatedAt: false },
});

messageSchema.index({ sender_id: 1, recipient_id: 1, created_at: -1 });
messageSchema.index({ recipient_id: 1, read: 1, created_at: -1 });

// ─── Models ──────────────────────────────────────────────────
const User = mongoose.model('User', userSchema);
const Photograph = mongoose.model('Photograph', photographSchema);
const Auction = mongoose.model('Auction', auctionSchema);
const Bid = mongoose.model('Bid', bidSchema);
const Like = mongoose.model('Like', likeSchema);
const Comment = mongoose.model('Comment', commentSchema);
const Purchase = mongoose.model('Purchase', purchaseSchema);
const Message = mongoose.model('Message', messageSchema);

module.exports = { User, Photograph, Auction, Bid, Like, Comment, Purchase, Message, Counter, getNextSequence };
