/**
 * Audit log utility functions.
 * 
 * Shared functions for writing audit log entries.
 */

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

export interface AuditLogInput {
  targetId: string;
  targetModel: 'User' | 'Entry';
  action: AuditAction;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

/**
 * Writes an audit log entry to the database.
 * @param db - DatabaseClient instance
 * @param input - Audit log data
 */
export function writeAuditLog(
  db: { insertOne: (table: string, data: Record<string, unknown>) => Promise<void> },
  input: AuditLogInput
): Promise<void> {
  return db.insertOne('audit_logs', {
    id: crypto.randomUUID(),
    admin_id: 'admin',
    target_id: input.targetId,
    target_model: input.targetModel,
    action: input.action,
    diff: JSON.stringify({ before: input.before, after: input.after }),
    timestamp: new Date().toISOString(),
  });
}

/**
 * Writes a CREATE audit log entry.
 */
export function writeCreateAudit(
  db: { insertOne: (table: string, data: Record<string, unknown>) => Promise<void> },
  targetId: string,
  targetModel: 'User' | 'Entry',
  after: Record<string, unknown>
): Promise<void> {
  return writeAuditLog(db, {
    targetId,
    targetModel,
    action: 'CREATE',
    before: null,
    after,
  });
}

/**
 * Writes an UPDATE audit log entry.
 */
export function writeUpdateAudit(
  db: { insertOne: (table: string, data: Record<string, unknown>) => Promise<void> },
  targetId: string,
  targetModel: 'User' | 'Entry',
  before: Record<string, unknown>,
  after: Record<string, unknown>
): Promise<void> {
  return writeAuditLog(db, {
    targetId,
    targetModel,
    action: 'UPDATE',
    before,
    after,
  });
}

/**
 * Writes a DELETE audit log entry.
 */
export function writeDeleteAudit(
  db: { insertOne: (table: string, data: Record<string, unknown>) => Promise<void> },
  targetId: string,
  targetModel: 'User' | 'Entry',
  before: Record<string, unknown>
): Promise<void> {
  return writeAuditLog(db, {
    targetId,
    targetModel,
    action: 'DELETE',
    before,
    after: null,
  });
}