import mongoose, { Schema, Document, Model } from 'mongoose';

export type ComplaintCategory =
  | 'ROAD_DAMAGE'
  | 'STREET_LIGHT'
  | 'ELECTRICAL_WIRE'
  | 'GARBAGE_WASTE'
  | 'STORM_WATER_DRAIN'
  | 'PUBLIC_SPACE';

export type ComplaintStatus =
  | 'SUBMITTED'
  | 'ACCEPTED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'REJECTED';

export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type VerificationStatus =
  | 'PENDING_VERIFICATION'
  | 'GENUINE'
  | 'FAKE'
  | 'NEEDS_REVIEW';

export type AssignmentStatus =
  | 'PENDING_ASSIGNMENT'
  | 'ASSIGNED'
  | 'REASSIGNED';

export interface IComplaintPhoto {
  id?: string;
  url: string;
  type: 'BEFORE' | 'AFTER' | 'EVIDENCE';
  uploadedAt: Date;
}

export interface IComplaintTimeline {
  id?: string;
  stage: string;
  timestamp: Date;
  officerName?: string;
  notes?: string;
}

export interface IComplaintFraudFlag {
  id?: string;
  reason: string;
  score: number;
  createdAt: Date;
}

export interface IComplaint extends Document {
  id: string;
  complaintId: string; // TN-TIR-2026-XXXXX
  category: ComplaintCategory;
  description: string;
  location: string;
  latitude: number;
  longitude: number;
  status: ComplaintStatus;
  priority: PriorityLevel;

  // Assignment fields
  assignmentStatus: AssignmentStatus;
  reportedById: mongoose.Types.ObjectId | string;
  assignedToId?: mongoose.Types.ObjectId | string | null; // Officer
  assignedEmployeeId?: mongoose.Types.ObjectId | string | null; // Employee
  assignedAt?: Date | null;

  // Verification Desk fields (Officer / Employee)
  verificationStatus: VerificationStatus;
  verifiedByUserId?: mongoose.Types.ObjectId | string | null;
  verifiedByEmployeeId?: mongoose.Types.ObjectId | string | null;
  verifiedByName?: string | null;
  verifiedAt?: Date | null;
  verificationNotes?: string | null;

  rejectionReason?: string | null;
  resolvedAt?: Date | null;

  photos: IComplaintPhoto[];
  timeline: IComplaintTimeline[];
  fraudFlags: IComplaintFraudFlag[];

  createdAt: Date;
  updatedAt: Date;
}

const PhotoSubSchema = new Schema<IComplaintPhoto>(
  {
    url: { type: String, required: true },
    type: { type: String, enum: ['BEFORE', 'AFTER', 'EVIDENCE'], default: 'BEFORE' },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const TimelineSubSchema = new Schema<IComplaintTimeline>(
  {
    stage: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    officerName: { type: String, default: null },
    notes: { type: String, default: null },
  },
  { _id: true }
);

const FraudFlagSubSchema = new Schema<IComplaintFraudFlag>(
  {
    reason: { type: String, required: true },
    score: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const ComplaintSchema = new Schema<IComplaint>(
  {
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
      enum: ['SUBMITTED', 'ACCEPTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'],
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
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    assignedToId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    assignedEmployeeId: {
      type: Schema.Types.ObjectId,
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
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedByEmployeeId: {
      type: Schema.Types.ObjectId,
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

    photos: [PhotoSubSchema],
    timeline: [TimelineSubSchema],
    fraudFlags: [FraudFlagSubSchema],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

ComplaintSchema.virtual('id').get(function (this: any) {
  return this._id ? this._id.toString() : undefined;
});

export const Complaint: Model<IComplaint> =
  mongoose.models.Complaint || mongoose.model<IComplaint>('Complaint', ComplaintSchema);
