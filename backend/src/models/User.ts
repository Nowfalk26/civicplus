import mongoose, { Schema, Document, Model } from 'mongoose';

export type UserRole = 'CITIZEN' | 'OFFICER' | 'ADMIN' | 'EMPLOYEE';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type AccountStatus = 'ACTIVE' | 'PENDING_APPROVAL' | 'SUSPENDED' | 'DISABLED';
export type PresenceStatus = 'ONLINE' | 'OFFLINE';

export interface IUser extends Document {
  id: string;
  accountNumber: string; // Permanent account number, e.g. CP-10001
  authProviderUserId?: string | null; // Stable authentication provider identity (Google sub or verified Phone)
  username: string;
  name?: string;
  email: string;
  phone: string;
  password?: string;
  role: UserRole;
  location: string;
  avatarUrl?: string;
  department?: string;
  designation?: string;
  governmentIdProof?: string;
  idProofType?: string;
  requestReason?: string;
  approvalStatus?: ApprovalStatus;
  isApproved: boolean;
  needsPasswordChange: boolean;
  approvedAt?: Date | null;
  approvedById?: mongoose.Types.ObjectId | string | null;
  decisionNotes?: string | null;

  // Presence & Activity Tracking
  presenceStatus: PresenceStatus;
  isOnline: boolean;
  lastLoginAt?: Date | null;
  lastSeenAt?: Date | null;
  successfulLoginCount: number;
  failedLoginCount: number;
  loginAttemptCount: number;

  // Account Security & Status
  accountStatus: AccountStatus;
  accountRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  investigationStatus: 'CLEARED' | 'UNDER_REVIEW' | 'FLAGGED';
  accountFraudFlags: Array<{
    reason: string;
    score: number;
    createdAt: Date;
  }>;
  fraudScore: number;
  isBanned: boolean;
  bannedUntil?: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
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
      type: Schema.Types.ObjectId,
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
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret.__v;
        // Never leak password hash in responses
        delete ret.password;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
  }
);

// Virtual id field returning string representation of _id
UserSchema.virtual('id').get(function (this: any) {
  return this._id ? this._id.toString() : undefined;
});

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
