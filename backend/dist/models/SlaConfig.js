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
exports.SlaConfig = exports.DEFAULT_SLA_DAYS = void 0;
exports.getResolutionDays = getResolutionDays;
exports.calculateDueDate = calculateDueDate;
const mongoose_1 = __importStar(require("mongoose"));
const SlaConfigSchema = new mongoose_1.Schema({
    priority: {
        type: String,
        required: true,
        index: true,
    },
    category: {
        type: String,
        default: null,
        index: true,
    },
    resolutionDays: {
        type: Number,
        required: true,
    },
    description: {
        type: String,
        default: null,
    },
    updatedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
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
SlaConfigSchema.virtual('id').get(function () {
    return this._id ? this._id.toString() : undefined;
});
// Default SLA resolution days per priority level
exports.DEFAULT_SLA_DAYS = {
    CRITICAL: 2,
    HIGH: 5,
    MEDIUM: 10,
    LOW: 15,
};
/**
 * Resolves the expected resolution days for a complaint based on priority and optional category.
 * Checks database for admin-configured SLAs first, then falls back to defaults.
 */
async function getResolutionDays(priority, category) {
    // First try category-specific SLA
    if (category) {
        const catSla = await exports.SlaConfig.findOne({ priority, category }).lean();
        if (catSla)
            return catSla.resolutionDays;
    }
    // Then try priority-level SLA
    const prioritySla = await exports.SlaConfig.findOne({ priority, category: null }).lean();
    if (prioritySla)
        return prioritySla.resolutionDays;
    // Fallback to hardcoded defaults
    return exports.DEFAULT_SLA_DAYS[priority] || 10;
}
/**
 * Calculates the due date by adding resolutionDays to the submission date.
 */
function calculateDueDate(submittedAt, resolutionDays) {
    const due = new Date(submittedAt);
    due.setDate(due.getDate() + resolutionDays);
    return due;
}
exports.SlaConfig = mongoose_1.default.models.SlaConfig || mongoose_1.default.model('SlaConfig', SlaConfigSchema);
