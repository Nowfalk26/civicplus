import mongoose, { Schema, Document, Model } from 'mongoose';

export type ComplaintEventType =
  | 'COMPLAINT_SUBMITTED'
  | 'EMPLOYEE_ASSIGNED'
  | 'COMPLAINT_VIEWED'
  | 'SITE_VISIT_COMPLETED'
  | 'WORK_STARTED'
  | 'WORK_IN_PROGRESS'
  | 'WORK_COMPLETED'
  | 'STATUS_CHANGED'
  | 'REASSIGNED'
  | 'VERIFIED';

export interface IComplaintEvent extends Document {
  id: string;
  complaintId: mongoose.Types.ObjectId | string;
  eventType: ComplaintEventType;
  actorId: mongoose.Types.ObjectId | string;
  actorRole: string;
  actorName: string;
  timestamp: Date;
  description: string;
  evidenceId?: mongoose.Types.ObjectId | string | null;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

const ComplaintEventSchema = new Schema<IComplaintEvent>(
  {
    complaintId: {
      type: Schema.Types.ObjectId,
      ref: 'Complaint',
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      enum: [
        'COMPLAINT_SUBMITTED',
        'EMPLOYEE_ASSIGNED',
        'COMPLAINT_VIEWED',
        'SITE_VISIT_COMPLETED',
        'WORK_STARTED',
        'WORK_IN_PROGRESS',
        'WORK_COMPLETED',
        'STATUS_CHANGED',
        'REASSIGNED',
        'VERIFIED',
      ],
      required: true,
      index: true,
    },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actorRole: {
      type: String,
      required: true,
    },
    actorName: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    evidenceId: {
      type: Schema.Types.ObjectId,
      ref: 'ComplaintEvidence',
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
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

ComplaintEventSchema.virtual('id').get(function (this: any) {
  return this._id ? this._id.toString() : undefined;
});

export const ComplaintEvent: Model<IComplaintEvent> =
  mongoose.models.ComplaintEvent || mongoose.model<IComplaintEvent>('ComplaintEvent', ComplaintEventSchema);
