import { Types } from 'mongoose';
import { AuditLog } from '../models/AuditLog';

type TargetModel = 'Entry' | 'User';
type Action = 'CREATE' | 'UPDATE' | 'DELETE';

export async function logAction(
  adminId: string,
  targetId: Types.ObjectId,
  targetModel: TargetModel,
  action: Action,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null
): Promise<void> {
  await AuditLog.create({
    adminId,
    targetId,
    targetModel,
    action,
    diff: { before, after },
    timestamp: new Date(),
  });
}
