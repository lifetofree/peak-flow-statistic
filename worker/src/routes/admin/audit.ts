import { Hono } from 'hono';
import { DatabaseClient } from '../../lib/database';
import type { Env } from '../../index';
import type { AuditLogRecord, FormattedAuditLog } from './types';

const auditApp = new Hono<{ Bindings: Env }>();
const PAGE_SIZE = 20;

function formatAuditLog(log: AuditLogRecord): FormattedAuditLog {
  return {
    _id: log.id,
    adminId: log.admin_id,
    targetId: log.target_id,
    targetModel: log.target_model,
    action: log.action,
    diff: JSON.parse(log.diff || '{}'),
    timestamp: log.timestamp,
  };
}

auditApp.get('/admin/audit', async (c) => {
  const db = new DatabaseClient(c.env);
  const page = parseInt(c.req.query('page') || '1');
  const userId = c.req.query('userId');
  const action = c.req.query('action');
  const offset = (page - 1) * PAGE_SIZE;

  let filter: Record<string, any> = {};
  if (userId) filter.target_id = userId;
  if (action) filter.action = action;

  const [logs, total] = await Promise.all([
    db.find<AuditLogRecord>('audit_logs', filter, { orderBy: 'timestamp', order: 'DESC', limit: PAGE_SIZE, offset }),
    db.count('audit_logs', filter),
  ]);

  const formattedLogs = logs.map(formatAuditLog);

  return c.json({ logs: formattedLogs, total, page, pageSize: PAGE_SIZE });
});

export default auditApp;
