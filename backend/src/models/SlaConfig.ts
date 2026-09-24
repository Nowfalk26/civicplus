import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISlaConfig extends Document {
  id: string;
  priority: string;
  category?: string | null;
  resolutionDays: number;
  description?: string | null;
  updatedBy?: mongoose.Types.ObjectId | string | null;
  createdAt: Date;
  updatedAt: Date;
}

const SlaConfigSchema = new Schema<ISlaConfig>(
  {
    priority: {
      type: String,
      required: true,
      index: true,
    },
    category: {
      type: String,
      default: null,
      index: true,
    },
    resolutionDays: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      default: null,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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

SlaConfigSchema.virtual('id').get(function (this: any) {
  return this._id ? this._id.toString() : undefined;
});

// Default SLA resolution days per priority level
export const DEFAULT_SLA_DAYS: Record<string, number> = {
  CRITICAL: 2,
  HIGH: 5,
  MEDIUM: 10,
  LOW: 15,
};

/**
 * Resolves the expected resolution days for a complaint based on priority and optional category.
 * Checks database for admin-configured SLAs first, then falls back to defaults.
 */
export async function getResolutionDays(priority: string, category?: string | null): Promise<number> {
  // First try category-specific SLA
  if (category) {
    const catSla = await SlaConfig.findOne({ priority, category }).lean();
    if (catSla) return catSla.resolutionDays;
  }
  // Then try priority-level SLA
  const prioritySla = await SlaConfig.findOne({ priority, category: null }).lean();
  if (prioritySla) return prioritySla.resolutionDays;
  // Fallback to hardcoded defaults
  return DEFAULT_SLA_DAYS[priority] || 10;
}

/**
 * Calculates the due date by adding resolutionDays to the submission date.
 */
export function calculateDueDate(submittedAt: Date, resolutionDays: number): Date {
  const due = new Date(submittedAt);
  due.setDate(due.getDate() + resolutionDays);
  return due;
}

export const SlaConfig: Model<ISlaConfig> =
  mongoose.models.SlaConfig || mongoose.model<ISlaConfig>('SlaConfig', SlaConfigSchema);
