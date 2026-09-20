import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOfficerRequest extends Document {
  id: string;
  applicantId?: mongoose.Types.ObjectId | string | null;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  district: string;
  governmentIdProof: string;
  idProofType: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: mongoose.Types.ObjectId | string | null;
  reviewedAt?: Date | null;
  decisionNotes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const OfficerRequestSchema = new Schema<IOfficerRequest>(
  {
    applicantId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
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
    district: {
      type: String,
      default: 'Tamil Nadu',
      trim: true,
    },
    governmentIdProof: {
      type: String,
      required: true,
      trim: true,
    },
    idProofType: {
      type: String,
      default: 'TN_CIVIC_BADGE',
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    decisionNotes: {
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

OfficerRequestSchema.virtual('id').get(function (this: any) {
  return this._id ? this._id.toString() : undefined;
});

export const OfficerRequest: Model<IOfficerRequest> =
  mongoose.models.OfficerRequest ||
  mongoose.model<IOfficerRequest>('OfficerRequest', OfficerRequestSchema);
