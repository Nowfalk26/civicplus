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
exports.Complaint = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const PhotoSubSchema = new mongoose_1.Schema({
    url: { type: String, required: true },
    type: { type: String, enum: ['BEFORE', 'AFTER', 'EVIDENCE', 'SITE_VISIT', 'WORK_STARTED', 'WORK_IN_PROGRESS', 'WORK_COMPLETED'], default: 'BEFORE' },
    uploadedAt: { type: Date, default: Date.now },
    uploadedBy: { type: String, default: null },
    description: { type: String, default: null },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    capturedAt: { type: Date, default: null },
    isLocationVerified: { type: Boolean, default: null },
    distanceFromSiteKm: { type: Number, default: null },
}, { _id: true });
const TimelineSubSchema = new mongoose_1.Schema({
    stage: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    officerName: { type: String, default: null },
    notes: { type: String, default: null },
    actorId: { type: String, default: null },
    evidenceId: { type: String, default: null },
}, { _id: true });
const FraudFlagSubSchema = new mongoose_1.Schema({
    reason: { type: String, required: true },
    score: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
}, { _id: true });
const ComplaintSchema = new mongoose_1.Schema({
    complaintId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
    },
    category: {
        type: String,
        enum: [
            'ROAD_DAMAGE',
            'STREET_LIGHT',
            'ELECTRICAL_WIRE',
            'GARBAGE_WASTE',
            'STORM_WATER_DRAIN',
            'PUBLIC_SPACE',
        ],
        required: true,
        index: true,
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    location: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    district: {
        type: String,
        default: null,
        trim: true,
        index: true,
    },
    voiceRecordingUrl: {
        type: String,
        default: null,
    },
    voiceDuration: {
        type: Number,
        default: 0,
    },
    aiValidation: {
        type: mongoose_1.Schema.Types.Mixed,
        default: null,
    },
    latitude: {
        type: Number,
        required: true,
    },
    longitude: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        enum: ['SUBMITTED', 'ACCEPTED', 'ASSIGNED', 'VIEWED', 'SITE_VISIT_COMPLETED', 'WORK_STARTED', 'WORK_IN_PROGRESS', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'],
        default: 'SUBMITTED',
        index: true,
    },
    priority: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        default: 'MEDIUM',
        index: true,
    },
    // Assignment
    assignmentStatus: {
        type: String,
        enum: ['PENDING_ASSIGNMENT', 'ASSIGNED', 'REASSIGNED'],
        default: 'PENDING_ASSIGNMENT',
        index: true,
    },
    reportedById: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    assignedToId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
        index: true,
    },
    assignedEmployeeId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Employee',
        default: null,
        index: true,
    },
    assignedAt: {
        type: Date,
        default: null,
    },
    // Verification Workflow
    verificationStatus: {
        type: String,
        enum: ['PENDING_VERIFICATION', 'GENUINE', 'FAKE', 'NEEDS_REVIEW'],
        default: 'PENDING_VERIFICATION',
        index: true,
    },
    verifiedByUserId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    verifiedByEmployeeId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Employee',
        default: null,
    },
    verifiedByName: {
        type: String,
        default: null,
    },
    verifiedAt: {
        type: Date,
        default: null,
    },
    verificationNotes: {
        type: String,
        default: null,
    },
    rejectionReason: {
        type: String,
        default: null,
    },
    resolvedAt: {
        type: Date,
        default: null,
    },
    // Work Tracking
    dueDate: {
        type: Date,
        default: null,
    },
    viewedAt: {
        type: Date,
        default: null,
    },
    viewedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Employee',
        default: null,
    },
    siteVisitAt: {
        type: Date,
        default: null,
    },
    siteVisitBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Employee',
        default: null,
    },
    siteVisitNotes: {
        type: String,
        default: null,
    },
    workStartedAt: {
        type: Date,
        default: null,
    },
    workStartedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Employee',
        default: null,
    },
    workStartedNotes: {
        type: String,
        default: null,
    },
    completedAt: {
        type: Date,
        default: null,
    },
    completedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Employee',
        default: null,
    },
    completionNotes: {
        type: String,
        default: null,
    },
    workDuration: {
        type: Number,
        default: null,
    },
    photos: [PhotoSubSchema],
    timeline: [TimelineSubSchema],
    fraudFlags: [FraudFlagSubSchema],
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: (_doc, ret) => {
            ret.id = ret._id ? ret._id.toString() : ret.id;
            delete ret.__v;
            return ret;
        },
    },
    toObject: {
        virtuals: true,
        transform: (_doc, ret) => {
            ret.id = ret._id ? ret._id.toString() : ret.id;
            delete ret.__v;
            return ret;
        },
    },
});
ComplaintSchema.virtual('id').get(function () {
    return this._id ? this._id.toString() : undefined;
});
exports.Complaint = mongoose_1.default.models.Complaint || mongoose_1.default.model('Complaint', ComplaintSchema);
