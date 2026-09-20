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
exports.AssignmentHistory = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const AssignmentHistorySchema = new mongoose_1.Schema({
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
    employeeId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Employee',
        required: true,
        index: true,
    },
    employeeName: {
        type: String,
        required: true,
    },
    assignedByUserId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    assignedByUserName: {
        type: String,
        required: true,
    },
    previousEmployeeId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Employee',
        default: null,
    },
    previousEmployeeName: {
        type: String,
        default: null,
    },
    reassignmentReason: {
        type: String,
        default: null,
    },
    assignedAt: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'REASSIGNED', 'REVOKED'],
        default: 'ACTIVE',
        index: true,
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
AssignmentHistorySchema.virtual('id').get(function () {
    return this._id ? this._id.toString() : undefined;
});
exports.AssignmentHistory = mongoose_1.default.models.AssignmentHistory ||
    mongoose_1.default.model('AssignmentHistory', AssignmentHistorySchema);
