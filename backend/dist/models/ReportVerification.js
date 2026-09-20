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
exports.ReportVerification = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const ReportVerificationSchema = new mongoose_1.Schema({
    complaintId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Complaint',
        required: true,
        index: true,
    },
    complaintCode: {
        type: String,
        required: true,
        index: true,
    },
    verifiedByUserId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    verifiedByEmployeeId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Employee',
        default: null,
    },
    verifiedByName: {
        type: String,
        required: true,
    },
    verificationResult: {
        type: String,
        enum: ['GENUINE', 'FAKE', 'NEEDS_REVIEW'],
        required: true,
        index: true,
    },
    verificationNotes: {
        type: String,
        required: true,
        trim: true,
    },
    evidenceSummary: {
        type: String,
        default: null,
    },
    verifiedAt: {
        type: Date,
        default: Date.now,
    },
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
ReportVerificationSchema.virtual('id').get(function () {
    return this._id ? this._id.toString() : undefined;
});
exports.ReportVerification = mongoose_1.default.models.ReportVerification ||
    mongoose_1.default.model('ReportVerification', ReportVerificationSchema);
