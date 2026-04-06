import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IEntry extends Document {
  userId: Types.ObjectId;
  date: Date;
  peakFlowReadings: [number, number, number];
  spO2: number;
  medicationTiming: 'before' | 'after';
  period: 'morning' | 'evening';
  note: string;
  createdAt: Date;
  updatedAt: Date;
}

const entrySchema = new Schema<IEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    peakFlowReadings: {
      type: [Number],
      required: true,
      validate: {
        validator: (v: number[]) => v.length === 3,
        message: 'peakFlowReadings must have exactly 3 values',
      },
    },
    spO2: { type: Number, required: true },
    medicationTiming: {
      type: String,
      enum: ['before', 'after'],
      required: true,
    },
    period: {
      type: String,
      enum: ['morning', 'evening'],
      required: true,
    },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

entrySchema.index({ userId: 1, date: -1 });

export const Entry = mongoose.model<IEntry>('Entry', entrySchema);
