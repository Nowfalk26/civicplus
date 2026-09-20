import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICounter extends Document {
  name: string;
  sequenceValue: number;
}

const CounterSchema = new Schema<ICounter>({
  name: { type: String, required: true, unique: true },
  sequenceValue: { type: Number, default: 10000 },
});

export const Counter: Model<ICounter> =
  mongoose.models.Counter || mongoose.model<ICounter>('Counter', CounterSchema);

/**
 * Returns the next permanent formatted account sequence number, e.g. CP-10001
 */
export async function getNextAccountNumber(): Promise<string> {
  const counter = await Counter.findOneAndUpdate(
    { name: 'userAccountNumber' },
    { $inc: { sequenceValue: 1 } },
    { returnDocument: 'after', upsert: true }
  );
  return `CP-${counter.sequenceValue}`;
}

/**
 * Returns the next permanent formatted employee sequence number, e.g. EMP-TN-1001
 */
export async function getNextEmployeeNumber(): Promise<string> {
  const counter = await Counter.findOneAndUpdate(
    { name: 'employeeNumber' },
    { $inc: { sequenceValue: 1 } },
    { returnDocument: 'after', upsert: true }
  );
  return `EMP-TN-${counter.sequenceValue}`;
}
