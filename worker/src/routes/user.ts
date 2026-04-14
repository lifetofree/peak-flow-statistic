/**
 * User-Facing API Routes.
 *
 * Patient-facing endpoints: view entries, create new entries, export CSV.
 * All routes require valid short_token via validateShortLink middleware.
 *
 * Routes:
 * - GET  /api/u/:token        - Get user profile
 * - GET  /api/u/:token/entries - List entries with pagination and date filtering
 * - POST /api/u/:token/entries - Create new peak flow entry
 * - GET  /api/u/:token/export  - Export entries as CSV
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { DatabaseClient } from '../lib/database';
import { rateLimitPatient } from '../middleware/rateLimit';
import type { Env } from '../index';
import type { UserRecord } from './admin/types';
import { getUserEntries, createUserEntry, type CreateEntryData } from '../services/entryService';
import { generateCsv, getSafeFileName } from '../services/exportService';

type FilterValue = string | number | null | (string | number)[] | { $gte?: string | number; $lte?: string | number };
type Filter = Record<string, FilterValue>;

type Variables = {
  userId: string;
  user: UserRecord;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use('/u/*', rateLimitPatient);

/**
 * Validates short_token and loads user. Returns 404 if invalid or soft-deleted.
 */
const validateShortLink = async (c: any, next: any) => {
  const { token } = c.req.param();
  const db = new DatabaseClient(c.env);

  const user = await db.findOne<UserRecord>('users', { short_token: token, deleted_at: null });
  if (!user) return c.json({ error: 'Not found' }, 404);

  c.set('userId', user.id);
  c.set('user', user);
  await next();
};

app.get('/u/:token', validateShortLink, async (c) => {
  const user = c.get('user');

  return c.json({
    _id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    nickname: user.nickname,
    personalBest: user.personal_best,
  });
});

app.get('/u/:token/entries', validateShortLink, async (c) => {
  const db = new DatabaseClient(c.env);
  const userId = c.get('userId');
  const user = c.get('user');
  const page = parseInt(c.req.query('page') || '1');
  const pageSizeParam = c.req.query('pageSize');
  const pageSize = pageSizeParam ? parseInt(pageSizeParam) : 0;
  const from = c.req.query('from');
  const to = c.req.query('to');

  const result = await getUserEntries(db, { userId, page, pageSize, from, to }, user);

  return c.json(result);
});

const createEntrySchema = z.object({
  date: z.string(),
  peakFlowReadings: z.tuple([z.number(), z.number(), z.number()]),
  spO2: z.number().int().min(70).max(100),
  medicationTiming: z.enum(['before', 'after']),
  period: z.enum(['morning', 'evening']),
  note: z.string().optional(),
});

app.post('/u/:token/entries', validateShortLink, zValidator('json', createEntrySchema), async (c) => {
  const db = new DatabaseClient(c.env);
  const userId = c.get('userId');
  const data = c.req.valid('json') as CreateEntryData;
  const now = new Date().toISOString();

  const result = await createUserEntry(db, userId, data, now);

  return c.json(result, 201);
});

app.get('/u/:token/export', validateShortLink, async (c) => {
  const db = new DatabaseClient(c.env);
  const userId = c.get('userId');
  const user = c.get('user');
  const from = c.req.query('from');
  const to = c.req.query('to');

  let filter: Record<string, any> = { user_id: userId };
  const dateFilter: Record<string, any> = {};
  if (from) dateFilter.$gte = from;
  if (to) dateFilter.$lte = to;
  if (from || to) filter.date = dateFilter;

  const entries = await db.find<any>('entries', filter, { orderBy: 'date', order: 'ASC' });

  const csv = generateCsv(entries);

  c.header('Content-Type', 'text/csv');
  const safeName = getSafeFileName(user.first_name, user.last_name);
  c.header('Content-Disposition', `attachment; filename="${safeName}-entries.csv"`);
  return c.body(csv);
});

export default app;
