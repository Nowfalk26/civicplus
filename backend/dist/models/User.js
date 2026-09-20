"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const UserSchema = new mongoose_1.Schema({
    accountNumber: {
        type: String,
        unique: true,
        sparse: true,
        index: true,
    },
    authProviderUserId: {
        type: String,
        unique: true,
        sparse: true,
        index: true,
        trim: true,
    },
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    name: {
        type: String,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    phone: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    password: {
        type: String,
        select: true, // Allow password verification during auth
    },
    role: {
        type: String,
        enum: ['CITIZEN', 'OFFICER', 'ADMIN', 'EMPLOYEE'],
        default: 'CITIZEN',
        index: true,
    },
    location: {
        type: String,
        default: 'Tamil Nadu',
    },
    avatarUrl: {
        type: String,
        default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
    department: {
        type: String,
        trim: true,
    },
    designation: {
        type: String,
        trim: true,
    },
    governmentIdProof: {
        type: String,
        trim: true,
    },
    idProofType: {
        type: String,
        default: 'TN_CIVIC_BADGE',
    },
    requestReason: {
        type: String,
        trim: true,
    },
    approvalStatus: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'APPROVED',
        index: true,
    },
    isApproved: {
        type: Boolean,
        default: true,
        index: true,
    },
    needsPasswordChange: {
        type: Boolean,
        default: false,
    },
    approvedAt: {
        type: Date,
        default: null,
    },
    approvedById: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    decisionNotes: {
        type: String,
        default: null,
    },
    // Presence Tracking
    presenceStatus: {
        type: String,
        enum: ['ONLINE', 'OFFLINE'],
        default: 'OFFLINE',
        index: true,
    },
    isOnline: {
        type: Boolean,
        default: false,
        index: true,
    },
    lastLoginAt: {
        type: Date,
        default: null,
    },
    lastSeenAt: {
        type: Date,
        default: null,
    },
    successfulLoginCount: {
        type: Number,
        default: 0,
    },
    failedLoginCount: {
        type: Number,
        default: 0,
    },
    loginAttemptCount: {
        type: Number,
        default: 0,
    },
    // Account Security & Fraud Oversight
    accountStatus: {
        type: String,
        enum: ['ACTIVE', 'PENDING_APPROVAL', 'SUSPENDED', 'DISABLED'],
        default: 'ACTIVE',
        index: true,
    },
    accountRiskLevel: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        default: 'LOW',
    },
    investigationStatus: {
        type: String,
        enum: ['CLEARED', 'UNDER_REVIEW', 'FLAGGED'],
        default: 'CLEARED',
    },
    accountFraudFlags: [
        {
            reason: { type: String, required: true },
            score: { type: Number, required: true },
            createdAt: { type: Date, default: Date.now },
        },
    ],
    fraudScore: {
        type: Number,
        default: 0,
    },
    isBanned: {
        type: Boolean,
        default: false,
        index: true,
    },
    bannedUntil: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: (_doc, ret) => {
            ret.id = ret._id ? ret._id.toString() : ret.id;
            delete ret.__v;
            // Never leak password hash in responses
            delete ret.password;
            return ret;
        },
    },
    toObject: {
        virtuals: true,
        transform: (_doc, ret) => {
            ret.id = ret._id ? ret._id.toString() : ret.id;
            delete ret.__v;
            delete ret.password;
            return ret;
        },
    },
});
// Virtual id field returning string representation of _id
UserSchema.virtual('id').get(function () {
    return this._id ? this._id.toString() : undefined;
});
exports.User = mongoose_1.default.models.User || mongoose_1.default.model('User', UserSchema);
