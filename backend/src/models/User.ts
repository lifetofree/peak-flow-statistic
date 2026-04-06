import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  nickname: string;
  shortToken: string;
  shortCode: string;
  clickCount: number;
  personalBest: number | null;
  adminNote: string;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    nickname: { type: String, required: true },
    shortToken: { type: String, required: true, unique: true, index: true },
    shortCode: { type: String, required: true, unique: true, index: true },
    clickCount: { type: Number, default: 0 },
    personalBest: { type: Number, default: null },
    adminNote: { type: String, default: '' },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collation: { locale: 'th', strength: 2 },
  }
);

userSchema.index({ firstName: 1, lastName: 1, nickname: 1 });

export const User = mongoose.model<IUser>('User', userSchema);
