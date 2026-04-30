import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { DatabaseClient } from '../../lib/database';
import { calculateZone } from '../zone';
import { parsePeakFlowReadings } from '../../lib/peakFlow';
import { writeUpdateAudit, writeDeleteAudit } from '../../lib/audit';
import { DEFAULT_PAGE_SIZE } from '../../constants/pagination';
import type { Env } from '../../index';
import type { EntryRecord, UserRecord, FormattedEntry } from './types';
import { updateEntry, deleteEntry, type UpdateEntryData } from '../../services/entryService';

const entriesApp = new Hono<{ Bindings: Env }>();
const PAGE_SIZE = DEFAULT_PAGE_SIZE;

const updateEntrySchema = z.object({
  date: z.string().optional(),
  peakFlowReadings: z.tuple([z.number(), z.number(), z.number()]).optional(),
  spO2: z.number().int().min(0).max(100).optional(),
  medicationTiming: z.enum(['before', 'after']).optional(),
  period: z.enum(['morning', 'evening']).optional(),
  note: z.string().optional(),
});

function formatEntryWithZone(entry: EntryRecord, user: UserRecord | null): FormattedEntry {
  const { readings: peakFlowReadings, best: bestReading } = parsePeakFlowReadings(
    entry.peak_flow_readings,
    entry.peak_flow
  );
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
  const pageSizeParam = c.req.query('pageSize');
  const pageSize = pageSizeParam !== null && pageSizeParam !== '' ? parseInt(pageSizeParam) : PAGE_SIZE;
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

  const formattedEntries = await Promise.all(entries.map(async (e: EntryRecord) => {
    const user = userMap.get(e.user_id) || null;
    return await formatEntryWithZone(e, user);
  }));

  return c.json({ entries: formattedEntries, total, page, pageSize });
});

entriesApp.patch('/admin/entries/:id', zValidator('json', updateEntrySchema), async (c) => {
  const db = new DatabaseClient(c.env);
  const entryId = c.req.param('id');
  const data = c.req.valid('json') as UpdateEntryData;
  const now = new Date().toISOString();

  const entry = await db.findOne<EntryRecord>('entries', { id: entryId });
  if (!entry) return c.json({ error: 'Not found' }, 404);

  const before = { ...entry };
  const formatted = await updateEntry(db, entryId, data, now);

  if (formatted) {
    await writeUpdateAudit(db, entryId, 'Entry', before, { ...formatted });
  }

  return c.json(formatted);
});

entriesApp.delete('/admin/entries/:id', async (c) => {
  const db = new DatabaseClient(c.env);
  const entryId = c.req.param('id');

  const entry = await db.findOne<EntryRecord>('entries', { id: entryId });
  if (!entry) return c.json({ error: 'Not found' }, 404);

  const success = await deleteEntry(db, entryId);

  if (success) {
    await writeDeleteAudit(db, entryId, 'Entry', entry as unknown as Record<string, unknown>);
  }

  return c.json({ success });
});

export default entriesApp;
