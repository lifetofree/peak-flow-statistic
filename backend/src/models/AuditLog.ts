import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  adminId: string;
  targetId: Types.ObjectId;
  targetModel: 'Entry' | 'User';
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  diff: {
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
  };
  timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>({
  adminId: { type: String, required: true },
  targetId: { type: Schema.Types.ObjectId, required: true },
  targetModel: { type: String, enum: ['Entry', 'User'], required: true },
  action: { type: String, enum: ['CREATE', 'UPDATE', 'DELETE'], required: true },
  diff: {
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
  },
  timestamp: { type: Date, default: Date.now },
});

auditLogSchema.index({ targetId: 1, timestamp: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
