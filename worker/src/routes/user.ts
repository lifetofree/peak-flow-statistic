import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { DatabaseClient } from '../lib/database';
import { calculateZone } from './zone';
import type { Env } from '../index';

const app = new Hono<{ Bindings: Env }>();

const PAGE_SIZE = 20;

const validateShortLink = async (c: any, next: any) => {
  const { token } = c.req.param();
  const db = new DatabaseClient(c.env);

  const user = await db.findOne<any>('users', { short_token: token, deleted_at: null });
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
  const pageSize = pageSizeParam ? parseInt(pageSizeParam) : 0; // 0 means fetch all
  const offset = pageSize > 0 ? (page - 1) * pageSize : 0;

  let filter: Record<string, any> = { user_id: userId };

  const [entries, total] = await Promise.all([
    db.find<any>('entries', filter, { orderBy: 'date', order: 'DESC', limit: pageSize > 0 ? pageSize : undefined, offset: pageSize > 0 ? offset : 0 }),
    db.count('entries', filter),
  ]);

  const formattedEntries = entries.map((e: any) => {
    let peakFlowReadings: number[] = [];
    try {
      peakFlowReadings = JSON.parse(e.peak_flow_readings || '[]');
    } catch {
      peakFlowReadings = [e.peak_flow];
    }
    const bestReading = peakFlowReadings.length > 0 ? Math.max(...peakFlowReadings) : e.peak_flow;
    const zone = user.personal_best ? calculateZone(bestReading, user.personal_best) : null;

    return {
      entry: {
        _id: e.id,
        userId: e.user_id,
        date: e.date,
        peakFlowReadings,
        spO2: e.spo2,
        medicationTiming: e.medication_timing,
        period: e.period || 'morning',
        note: e.note || '',
        createdAt: e.created_at,
        updatedAt: e.updated_at,
      },
      zone,
    };
  });

  return c.json({ entries: formattedEntries, total, page, pageSize });
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
  const data = c.req.valid('json');
  const now = new Date().toISOString();

  const entry = {
    id: crypto.randomUUID(),
    user_id: userId,
    date: data.date,
    peak_flow_readings: JSON.stringify(data.peakFlowReadings),
    peak_flow: Math.max(...data.peakFlowReadings),
    spo2: data.spO2,
    medication_timing: data.medicationTiming,
    period: data.period,
    note: data.note || '',
    created_at: now,
    updated_at: now,
  };

  await db.insertOne('entries', entry);

  return c.json({
    _id: entry.id,
    userId: entry.user_id,
    date: entry.date,
    peakFlowReadings: data.peakFlowReadings,
    spO2: entry.spo2,
    medicationTiming: entry.medication_timing,
    period: entry.period,
    note: entry.note,
    createdAt: entry.created_at,
    updatedAt: entry.updated_at,
  }, 201);
});

app.get('/u/:token/export', validateShortLink, async (c) => {
  const db = new DatabaseClient(c.env);
  const userId = c.get('userId');
  const user = c.get('user');

  const entries = await db.find<any>('entries', { user_id: userId }, { orderBy: 'date', order: 'ASC' });

  let csv = 'Date,Period,Best Peak Flow,SpO2,Medication,Note\n';
  for (const entry of entries) {
    let peakFlowReadings: number[] = [];
    try {
      peakFlowReadings = JSON.parse(entry.peak_flow_readings || '[]');
    } catch {
      peakFlowReadings = [entry.peak_flow];
    }
    const bestReading = peakFlowReadings.length > 0 ? Math.max(...peakFlowReadings) : entry.peak_flow;
    const note = (entry.note || '').replace(/"/g, '""');
    csv += `"${entry.date}","${entry.period || 'morning'}","${bestReading}","${entry.spo2 || ''}","${entry.medication_timing || ''}","${note}"\n`;
  }

  c.header('Content-Type', 'text/csv');
  c.header('Content-Disposition', `attachment; filename="${user.first_name}-${user.last_name}-entries.csv"`);
  return c.body(csv);
});

export default app;
