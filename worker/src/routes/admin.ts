import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { DatabaseClient } from '../lib/database';
import { calculateZone } from './zone';
import type { Env } from '../index';

const app = new Hono<{ Bindings: Env }>();

const PAGE_SIZE = 20;

app.get('/admin/users', async (c) => {
  const db = new DatabaseClient(c.env);
  const page = parseInt(c.req.query('page') || '1');
  const query = c.req.query('q');
  const offset = (page - 1) * PAGE_SIZE;

  let filter: Record<string, any> = { deleted_at: null };
  if (query) {
    filter.first_name = `%${query}%`;
  }

  const [users, total] = await Promise.all([
    db.find<any>('users', filter, { orderBy: 'created_at', order: 'DESC', limit: PAGE_SIZE, offset }),
    db.count('users', filter),
  ]);

  const formattedUsers = await Promise.all(users.map(async (u: any) => {
    const lastEntry = await db.find<any>('entries', { user_id: u.id }, { orderBy: 'date', order: 'DESC', limit: 1 });
    return {
      _id: u.id,
      firstName: u.first_name,
      lastName: u.last_name,
      nickname: u.nickname,
      shortToken: u.short_token,
      shortCode: u.short_code,
      clickCount: u.click_count || 0,
      personalBest: u.personal_best,
      adminNote: u.admin_note || '',
      deletedAt: u.deleted_at,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
      lastEntryDate: lastEntry[0]?.date || null,
    };
  }));

  return c.json({ users: formattedUsers, total, page, pageSize: PAGE_SIZE });
});

const createUserSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  nickname: z.string().min(1),
  personalBest: z.number().int().min(50).max(900).nullable().optional(),
  adminNote: z.string().optional(),
});

app.post('/admin/users', zValidator('json', createUserSchema), async (c) => {
  const db = new DatabaseClient(c.env);
  const data = c.req.valid('json');
  const now = new Date().toISOString();

  const shortToken = crypto.randomUUID();
  const shortCode = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  const user = {
    id: crypto.randomUUID(),
    first_name: data.firstName,
    last_name: data.lastName,
    nickname: data.nickname,
    short_token: shortToken,
    short_code: shortCode,
    click_count: 0,
    personal_best: data.personalBest,
    admin_note: data.adminNote || '',
    deleted_at: null,
    created_at: now,
    updated_at: now,
  };

  await db.insertOne('users', user);

  await db.insertOne('audit_logs', {
    id: crypto.randomUUID(),
    admin_id: 'admin',
    target_id: user.id,
    target_model: 'User',
    action: 'CREATE',
    diff: JSON.stringify({ before: null, after: user }),
    timestamp: now,
  });

  return c.json({
    _id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    nickname: user.nickname,
    shortToken: user.short_token,
    shortCode: user.short_code,
    clickCount: user.click_count,
    personalBest: user.personal_best,
    adminNote: user.admin_note,
    deletedAt: user.deleted_at,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  }, 201);
});

app.get('/admin/users/:id', async (c) => {
  const db = new DatabaseClient(c.env);
  const user = await db.findOne<any>('users', { id: c.req.param('id') });

  if (!user) return c.json({ error: 'Not found' }, 404);

  return c.json({
    _id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    nickname: user.nickname,
    shortToken: user.short_token,
    shortCode: user.short_code,
    clickCount: user.click_count || 0,
    personalBest: user.personal_best,
    adminNote: user.admin_note || '',
    deletedAt: user.deleted_at,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  });
});

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  nickname: z.string().min(1).optional(),
  personalBest: z.number().int().min(50).max(900).nullable().optional(),
});

app.patch('/admin/users/:id', zValidator('json', updateUserSchema), async (c) => {
  const db = new DatabaseClient(c.env);
  const userId = c.req.param('id');
  const data = c.req.valid('json');
  const now = new Date().toISOString();

  const user = await db.findOne<any>('users', { id: userId });
  if (!user) return c.json({ error: 'Not found' }, 404);
  if (user.deleted_at) return c.json({ error: 'User is deleted' }, 400);

  const before = { ...user };
  const updates: Record<string, any> = { updated_at: now };

  if (data.firstName !== undefined) updates.first_name = data.firstName;
  if (data.lastName !== undefined) updates.last_name = data.lastName;
  if (data.nickname !== undefined) updates.nickname = data.nickname;
  if (data.personalBest !== undefined) updates.personal_best = data.personalBest;

  await db.updateOne('users', { id: userId }, updates);

  await db.insertOne('audit_logs', {
    id: crypto.randomUUID(),
    admin_id: 'admin',
    target_id: userId,
    target_model: 'User',
    action: 'UPDATE',
    diff: JSON.stringify({ before, after: { ...user, ...updates } }),
    timestamp: now,
  });

  const updated = await db.findOne<any>('users', { id: userId });
  return c.json({
    _id: updated.id,
    firstName: updated.first_name,
    lastName: updated.last_name,
    nickname: updated.nickname,
    shortToken: updated.short_token,
    shortCode: updated.short_code,
    clickCount: updated.click_count || 0,
    personalBest: updated.personal_best,
    adminNote: updated.admin_note || '',
    deletedAt: updated.deleted_at,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
  });
});

app.delete('/admin/users/:id', async (c) => {
  const db = new DatabaseClient(c.env);
  const userId = c.req.param('id');
  const now = new Date().toISOString();

  const user = await db.findOne<any>('users', { id: userId });
  if (!user) return c.json({ error: 'Not found' }, 404);

  await db.updateOne('users', { id: userId }, { deleted_at: now, updated_at: now });

  await db.insertOne('audit_logs', {
    id: crypto.randomUUID(),
    admin_id: 'admin',
    target_id: userId,
    target_model: 'User',
    action: 'DELETE',
    diff: JSON.stringify({ before: user, after: null }),
    timestamp: now,
  });

  return c.json({ success: true });
});

app.patch('/admin/users/:id/note', async (c) => {
  const db = new DatabaseClient(c.env);
  const userId = c.req.param('id');
  const { adminNote } = await c.req.json();
  const now = new Date().toISOString();

  const user = await db.findOne<any>('users', { id: userId });
  if (!user) return c.json({ error: 'Not found' }, 404);

  const before = { adminNote: user.admin_note };
  await db.updateOne('users', { id: userId }, { admin_note: adminNote, updated_at: now });

  await db.insertOne('audit_logs', {
    id: crypto.randomUUID(),
    admin_id: 'admin',
    target_id: userId,
    target_model: 'User',
    action: 'UPDATE',
    diff: JSON.stringify({ before, after: { adminNote } }),
    timestamp: now,
  });

  return c.json({ success: true });
});

app.get('/admin/users/:id/export', async (c) => {
  const db = new DatabaseClient(c.env);
  const userId = c.req.param('id');
  const from = c.req.query('from');
  const to = c.req.query('to');

  const user = await db.findOne<any>('users', { id: userId });
  if (!user) return c.json({ error: 'Not found' }, 404);

  let filter: Record<string, any> = { user_id: userId };
  if (from) filter.date = from;
  if (to) filter.date = `%${to}%`;

  const entries = await db.find<any>('entries', filter, { orderBy: 'date', order: 'ASC' });

  let csv = 'Date,Period,Best Peak Flow,SpO2,Medication,Note\n';
  for (const entry of entries) {
    const peakFlowStr = entry.peak_flow_readings || String(entry.peak_flow);
    let bestReading = entry.peak_flow;
    try {
      const readings = JSON.parse(peakFlowStr);
      bestReading = Math.max(...readings);
    } catch {}
    const note = (entry.note || '').replace(/"/g, '""');
    csv += `"${entry.date}","${entry.period || 'morning'}","${bestReading}","${entry.spo2 || ''}","${entry.medication_timing || ''}","${note}"\n`;
  }

  c.header('Content-Type', 'text/csv');
  c.header('Content-Disposition', `attachment; filename="${user.first_name}-${user.last_name}-entries.csv"`);
  return c.body(csv);
});

app.get('/admin/entries', async (c) => {
  const db = new DatabaseClient(c.env);
  const page = parseInt(c.req.query('page') || '1');
  const userId = c.req.query('userId');
  const offset = (page - 1) * PAGE_SIZE;

  let filter: Record<string, any> = {};
  if (userId) filter.user_id = userId;

  const [entries, total] = await Promise.all([
    db.find<any>('entries', filter, { orderBy: 'date', order: 'DESC', limit: PAGE_SIZE, offset }),
    db.count('entries', filter),
  ]);

  const formattedEntries = await Promise.all(entries.map(async (e: any) => {
    const user = await db.findOne<any>('users', { id: e.user_id });
    let peakFlowReadings: number[] = [];
    try {
      peakFlowReadings = JSON.parse(e.peak_flow_readings || '[]');
    } catch {
      peakFlowReadings = [e.peak_flow];
    }
    const bestReading = peakFlowReadings.length > 0 ? Math.max(...peakFlowReadings) : e.peak_flow;
    const zone = user?.personal_best ? calculateZone(bestReading, user.personal_best) : null;

    return {
      _id: e.id,
      userId: e.user_id,
      date: e.date,
      peakFlowReadings,
      spO2: e.spo2,
      medicationTiming: e.medication_timing,
      period: e.period || 'morning',
      note: e.note || '',
      zone,
      createdAt: e.created_at,
      updatedAt: e.updated_at,
    };
  }));

  return c.json({ entries: formattedEntries, total, page, pageSize: PAGE_SIZE });
});

const updateEntrySchema = z.object({
  date: z.string().optional(),
  peakFlowReadings: z.tuple([z.number(), z.number(), z.number()]).optional(),
  spO2: z.number().int().min(70).max(100).optional(),
  medicationTiming: z.enum(['before', 'after']).optional(),
  period: z.enum(['morning', 'evening']).optional(),
  note: z.string().optional(),
});

app.patch('/admin/entries/:id', zValidator('json', updateEntrySchema), async (c) => {
  const db = new DatabaseClient(c.env);
  const entryId = c.req.param('id');
  const data = c.req.valid('json');
  const now = new Date().toISOString();

  const entry = await db.findOne<any>('entries', { id: entryId });
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

  const updated = await db.findOne<any>('entries', { id: entryId });
  return c.json({
    _id: updated.id,
    userId: updated.user_id,
    date: updated.date,
    peakFlowReadings: JSON.parse(updated.peak_flow_readings || '[]'),
    spO2: updated.spo2,
    medicationTiming: updated.medication_timing,
    period: updated.period,
    note: updated.note,
    createdAt: updated.created_at,
    updatedAt: updated.updated_at,
  });
});

app.delete('/admin/entries/:id', async (c) => {
  const db = new DatabaseClient(c.env);
  const entryId = c.req.param('id');
  const now = new Date().toISOString();

  const entry = await db.findOne<any>('entries', { id: entryId });
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

app.get('/admin/audit', async (c) => {
  const db = new DatabaseClient(c.env);
  const page = parseInt(c.req.query('page') || '1');
  const userId = c.req.query('userId');
  const action = c.req.query('action');
  const offset = (page - 1) * PAGE_SIZE;

  let filter: Record<string, any> = {};
  if (userId) filter.target_id = userId;
  if (action) filter.action = action;

  const [logs, total] = await Promise.all([
    db.find<any>('audit_logs', filter, { orderBy: 'timestamp', order: 'DESC', limit: PAGE_SIZE, offset }),
    db.count('audit_logs', filter),
  ]);

  const formattedLogs = logs.map((l: any) => ({
    _id: l.id,
    adminId: l.admin_id,
    targetId: l.target_id,
    targetModel: l.target_model,
    action: l.action,
    diff: JSON.parse(l.diff || '{}'),
    timestamp: l.timestamp,
  }));

  return c.json({ logs: formattedLogs, total, page, pageSize: PAGE_SIZE });
});

export default app;
