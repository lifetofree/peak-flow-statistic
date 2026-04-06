import { Request, Response } from 'express';
import { AuditLog } from '../models/AuditLog';
import { PAGE_SIZE } from '../constants';

export async function listAuditLogs(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(typeof req.query['page'] === 'string' ? req.query['page'] : '1', 10) || 1);
    const userId = typeof req.query['userId'] === 'string' ? req.query['userId'] : undefined;
    const action = typeof req.query['action'] === 'string' ? req.query['action'] : undefined;

    const filter: Record<string, unknown> = {};
    if (userId) filter['targetId'] = userId;
    if (action) filter['action'] = action;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE),
      AuditLog.countDocuments(filter),
    ]);

    res.json({ logs, total, page, pageSize: PAGE_SIZE });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}
