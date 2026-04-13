import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { DatabaseClient } from '../../lib/database';
import { calculateZone } from '../zone';
import type { Env } from '../../index';
import type { EntryRecord, UserRecord, FormattedEntry } from './types';

const entriesApp = new Hono<{ Bindings: Env }>();
const PAGE_SIZE = 20;

const updateEntrySchema = z.object({
  date: z.string().optional(),
  peakFlowReadings: z.tuple([z.number(), z.number(), z.number()]).optional(),
  spO2: z.number().int().min(70).max(100).optional(),
  medicationTiming: z.enum(['before', 'after']).optional(),
  period: z.enum(['morning', 'evening']).optional(),
  note: z.string().optional(),
});

function parsePeakFlowReadings(readingsStr: string | null, fallback: number): number[] {
  try {
    const parsed = JSON.parse(readingsStr || '[]');
    return Array.isArray(parsed) ? parsed : [fallback];
  } catch {
    return [fallback];
  }
}

function getBestReadingFromEntry(entry: EntryRecord): number {
  const readings = parsePeakFlowReadings(entry.peak_flow_readings, entry.peak_flow);
  return Math.max(...readings);
}

function formatEntryWithZone(entry: EntryRecord, user: UserRecord | null): FormattedEntry {
  const peakFlowReadings = parsePeakFlowReadings(entry.peak_flow_readings, entry.peak_flow);
  const bestReading = getBestReadingFromEntry(entry);
  const zone = user?.personal_best ? calculateZone(bestReading, user.personal_best) : null;

  return {
    _id: entry.id,
    userId: entry.user_id,
    date: entry.date,
    peakFlowReadings,
    spO2: entry.spo2,
    medicationTiming: entry.medication_timing,
    period: entry.period || 'morning',
    note: entry.note || '',
    zone,
    createdAt: entry.created_at,
    updatedAt: entry.updated_at,
  };
}

entriesApp.get('/admin/entries', async (c) => {
  const db = new DatabaseClient(c.env);
  const page = parseInt(c.req.query('page') || '1');
  const userId = c.req.query('userId');
  const pageSize = c.req.query('pageSize') ? parseInt(c.req.query('pageSize')!) : PAGE_SIZE;
  const from = c.req.query('from');
  const to = c.req.query('to');

  const filter: Record<string, any> = {};
  if (userId) filter.user_id = userId;
  const dateFilter: Record<string, any> = {};
  if (from) dateFilter.$gte = from;
  if (to) dateFilter.$lte = to;
  if (from || to) filter.date = dateFilter;

  const offset = pageSize > 0 ? (page - 1) * pageSize : 0;

  const [entries, total] = await Promise.all([
    db.find<EntryRecord>('entries', filter, {
      orderBy: 'date', order: 'DESC',
      limit: pageSize > 0 ? pageSize : undefined,
      offset: pageSize > 0 ? offset : undefined,
    }),
    db.count('entries', filter),
  ]);

  if (entries.length === 0) {
    return c.json({ entries: [], total: 0, page, pageSize });
  }

  const userIds = [...new Set(entries.map(e => e.user_id))];
  const users = await db.find<UserRecord>('users', { id: userIds });
  const userMap = new Map(users.map(u => [u.id, u]));

  const formattedEntries = entries.map((e: EntryRecord) => {
    const user = userMap.get(e.user_id) || null;
    return formatEntryWithZone(e, user);
  });

  return c.json({ entries: formattedEntries, total, page, pageSize });
});

entriesApp.patch('/admin/entries/:id', zValidator('json', updateEntrySchema), async (c) => {
  const db = new DatabaseClient(c.env);
  const entryId = c.req.param('id');
  const data = c.req.valid('json');
  const now = new Date().toISOString();

  const entry = await db.findOne<EntryRecord>('entries', { id: entryId });
  if (!entry) return c.json({ error: 'Not found' }, 404);

  const before = { ...entry };
  const updates: Record<string, any> = { updated_at: now };

  if (data.date !== undefined) updates.date = data.date;
  if (data.peakFlowReadings !== undefined) updates.peak_flow_readings = JSON.stringify(data.peakFlowReadings);
  if (data.spO2 !== undefined) updates.spo2 = data.spO2;
  if (data.medicationTiming !== undefined) updates.medication_timing = data.medicationTiming;
  if (data.period !== undefined) updates.period = data.period;
  if (data.note !== undefined) updates.note = data.note;

  await db.updateOne('entries', { id: entryId }, updates);

  await db.insertOne('audit_logs', {
    id: crypto.randomUUID(),
    admin_id: 'admin',
    target_id: entryId,
    target_model: 'Entry',
    action: 'UPDATE',
    diff: JSON.stringify({ before, after: { ...entry, ...updates } }),
    timestamp: now,
  });

  const updated = await db.findOne<EntryRecord>('entries', { id: entryId });
  const user = updated ? await db.findOne<UserRecord>('users', { id: updated.user_id }) : null;
  const formattedUpdated = updated ? formatEntryWithZone(updated, user) : null;
  
  return c.json(formattedUpdated);
});

entriesApp.delete('/admin/entries/:id', async (c) => {
  const db = new DatabaseClient(c.env);
  const entryId = c.req.param('id');
  const now = new Date().toISOString();

  const entry = await db.findOne<EntryRecord>('entries', { id: entryId });
  if (!entry) return c.json({ error: 'Not found' }, 404);

  await db.deleteOne('entries', { id: entryId });

  await db.insertOne('audit_logs', {
    id: crypto.randomUUID(),
    admin_id: 'admin',
    target_id: entryId,
    target_model: 'Entry',
    action: 'DELETE',
    diff: JSON.stringify({ before: entry, after: null }),
    timestamp: now,
  });

  return c.json({ success: true });
});

export default entriesApp;
