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
exports.Employee = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const EmployeeSchema = new mongoose_1.Schema({
    employeeId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true,
    },
    fullName: {
        type: String,
        required: true,
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
    department: {
        type: String,
        required: true,
        trim: true,
    },
    designation: {
        type: String,
        required: true,
        trim: true,
    },
    assignedZone: {
        type: String,
        required: true,
        trim: true,
    },
    address: {
        type: String,
        default: '',
        trim: true,
    },
    profilePhoto: {
        type: String,
        default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    },
    joiningDate: {
        type: Date,
        default: Date.now,
    },
    notes: {
        type: String,
        default: '',
        trim: true,
    },
    mustChangePassword: {
        type: Boolean,
        default: true,
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    accountStatus: {
        type: String,
        enum: ['ACTIVE', 'DISABLED'],
        default: 'ACTIVE',
        index: true,
    },
    assignedReportsCount: {
        type: Number,
        default: 0,
    },
    completedReportsCount: {
        type: Number,
        default: 0,
    },
    inProgressReportsCount: {
        type: Number,
        default: 0,
    },
    pendingVerificationCount: {
        type: Number,
        default: 0,
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
EmployeeSchema.virtual('id').get(function () {
    return this._id ? this._id.toString() : undefined;
});
exports.Employee = mongoose_1.default.models.Employee || mongoose_1.default.model('Employee', EmployeeSchema);
