import mongoose, { Schema, Document, Model } from 'mongoose';

export type EvidenceType =
  | 'CITIZEN_SUBMISSION'
  | 'SITE_VISIT'
  | 'WORK_STARTED'
  | 'WORK_COMPLETED';

export interface IComplaintEvidence extends Document {
  id: string;
  complaintId: mongoose.Types.ObjectId | string;
  type: EvidenceType;
  fileUrl: string;
  uploadedBy: mongoose.Types.ObjectId | string;
  uploadedByName: string;
  uploadedAt: Date;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ComplaintEvidenceSchema = new Schema<IComplaintEvidence>(
  {
    complaintId: {
      type: Schema.Types.ObjectId,
      ref: 'Complaint',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['CITIZEN_SUBMISSION', 'SITE_VISIT', 'WORK_STARTED', 'WORK_COMPLETED'],
      required: true,
      index: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    uploadedByName: {
      type: String,
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    description: {
      type: String,
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

ComplaintEvidenceSchema.virtual('id').get(function (this: any) {
  return this._id ? this._id.toString() : undefined;
});

export const ComplaintEvidence: Model<IComplaintEvidence> =
  mongoose.models.ComplaintEvidence || mongoose.model<IComplaintEvidence>('ComplaintEvidence', ComplaintEvidenceSchema);
