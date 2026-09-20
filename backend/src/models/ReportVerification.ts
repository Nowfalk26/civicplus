import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReportVerification extends Document {
  id: string;
  complaintId: mongoose.Types.ObjectId | string;
  complaintCode: string;
  verifiedByUserId: mongoose.Types.ObjectId | string;
  verifiedByEmployeeId?: mongoose.Types.ObjectId | string | null;
  verifiedByName: string;
  verificationResult: 'GENUINE' | 'FAKE' | 'NEEDS_REVIEW';
  verificationNotes: string;
  evidenceSummary?: string | null;
  verifiedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReportVerificationSchema = new Schema<IReportVerification>(
  {
    complaintId: {
      type: Schema.Types.ObjectId,
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
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    verifiedByEmployeeId: {
      type: Schema.Types.ObjectId,
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

ReportVerificationSchema.virtual('id').get(function (this: any) {
  return this._id ? this._id.toString() : undefined;
});

export const ReportVerification: Model<IReportVerification> =
  mongoose.models.ReportVerification ||
  mongoose.model<IReportVerification>('ReportVerification', ReportVerificationSchema);
