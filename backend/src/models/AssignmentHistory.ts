import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAssignmentHistory extends Document {
  id: string;
  complaintId: mongoose.Types.ObjectId | string;
  complaintCode: string;
  employeeId: mongoose.Types.ObjectId | string;
  employeeName: string;
  assignedByUserId: mongoose.Types.ObjectId | string;
  assignedByUserName: string;
  previousEmployeeId?: mongoose.Types.ObjectId | string | null;
  previousEmployeeName?: string | null;
  reassignmentReason?: string | null;
  assignedAt: Date;
  status: 'ACTIVE' | 'REASSIGNED' | 'REVOKED';
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentHistorySchema = new Schema<IAssignmentHistory>(
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
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    employeeName: {
      type: String,
      required: true,
    },
    assignedByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedByUserName: {
      type: String,
      required: true,
    },
    previousEmployeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    previousEmployeeName: {
      type: String,
      default: null,
    },
    reassignmentReason: {
      type: String,
      default: null,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'REASSIGNED', 'REVOKED'],
      default: 'ACTIVE',
      index: true,
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

AssignmentHistorySchema.virtual('id').get(function (this: any) {
  return this._id ? this._id.toString() : undefined;
});

export const AssignmentHistory: Model<IAssignmentHistory> =
  mongoose.models.AssignmentHistory ||
  mongoose.model<IAssignmentHistory>('AssignmentHistory', AssignmentHistorySchema);
