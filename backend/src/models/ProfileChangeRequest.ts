import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProfileChangeRequest extends Document {
  id: string;
  officerId: mongoose.Types.ObjectId | string;
  officerName: string;
  officerEmail: string;
  requestedChanges: {
    department?: string;
    designation?: string;
    location?: string;
    phone?: string;
  };
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: mongoose.Types.ObjectId | string | null;
  reviewedAt?: Date | null;
  reviewNotes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ProfileChangeRequestSchema = new Schema<IProfileChangeRequest>(
  {
    officerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    officerName: {
      type: String,
      required: true,
    },
    officerEmail: {
      type: String,
      required: true,
      lowercase: true,
    },
    requestedChanges: {
      department: { type: String },
      designation: { type: String },
      location: { type: String },
      phone: { type: String },
    },
    reason: {
      type: String,
      required: true,
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
    reviewNotes: {
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

ProfileChangeRequestSchema.virtual('id').get(function (this: any) {
  return this._id ? this._id.toString() : undefined;
});

export const ProfileChangeRequest: Model<IProfileChangeRequest> =
  mongoose.models.ProfileChangeRequest ||
  mongoose.model<IProfileChangeRequest>('ProfileChangeRequest', ProfileChangeRequestSchema);
