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
  | 'VIEWED'
  | 'SITE_VISIT_COMPLETED'
  | 'WORK_STARTED'
  | 'WORK_IN_PROGRESS'
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
  type: 'BEFORE' | 'AFTER' | 'EVIDENCE' | 'SITE_VISIT' | 'WORK_STARTED' | 'WORK_IN_PROGRESS' | 'WORK_COMPLETED';
  uploadedAt: Date;
  uploadedBy?: string | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  capturedAt?: Date | null;
  isLocationVerified?: boolean | null;
  distanceFromSiteKm?: number | null;
}

export interface IComplaintTimeline {
  id?: string;
  stage: string;
  timestamp: Date;
  officerName?: string;
  notes?: string;
  actorId?: string;
  evidenceId?: string;
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

  // Work Tracking fields
  dueDate?: Date | null;
  viewedAt?: Date | null;
  viewedBy?: mongoose.Types.ObjectId | string | null;
  siteVisitAt?: Date | null;
  siteVisitBy?: mongoose.Types.ObjectId | string | null;
  siteVisitNotes?: string | null;
  workStartedAt?: Date | null;
  workStartedBy?: mongoose.Types.ObjectId | string | null;
  workStartedNotes?: string | null;
  completedAt?: Date | null;
  completedBy?: mongoose.Types.ObjectId | string | null;
  completionNotes?: string | null;
  workDuration?: number | null; // milliseconds

  district?: string | null;
  voiceRecordingUrl?: string | null;
  voiceDuration?: number;
  aiValidation?: any;

  photos: IComplaintPhoto[];
  timeline: IComplaintTimeline[];
  fraudFlags: IComplaintFraudFlag[];

  createdAt: Date;
  updatedAt: Date;
}

const PhotoSubSchema = new Schema<IComplaintPhoto>(
  {
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
  },
  { _id: true }
);

const TimelineSubSchema = new Schema<IComplaintTimeline>(
  {
    stage: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    officerName: { type: String, default: null },
    notes: { type: String, default: null },
    actorId: { type: String, default: null },
    evidenceId: { type: String, default: null },
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
      type: Schema.Types.Mixed,
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
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    siteVisitAt: {
      type: Date,
      default: null,
    },
    siteVisitBy: {
      type: Schema.Types.ObjectId,
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
      type: Schema.Types.ObjectId,
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
      type: Schema.Types.ObjectId,
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
