import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEmployee extends Document {
  id: string;
  employeeId: string; // EMP-TN-1001
  userId: mongoose.Types.ObjectId | string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  assignedZone: string;
  accountStatus: 'ACTIVE' | 'DISABLED';
  assignedReportsCount: number;
  completedReportsCount: number;
  inProgressReportsCount: number;
  pendingVerificationCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    employeeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
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

EmployeeSchema.virtual('id').get(function (this: any) {
  return this._id ? this._id.toString() : undefined;
});

export const Employee: Model<IEmployee> =
  mongoose.models.Employee || mongoose.model<IEmployee>('Employee', EmployeeSchema);
