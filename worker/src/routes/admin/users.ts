import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { DatabaseClient } from '../../lib/database';
import type { Env } from '../../index';
import type { UserRecord, FormattedUser } from './types';

const usersApp = new Hono<{ Bindings: Env }>();
const PAGE_SIZE = 20;

const createUserSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  nickname: z.string().min(1),
  personalBest: z.number().int().min(50).max(900).nullable().optional(),
  adminNote: z.string().optional(),
});

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  nickname: z.string().min(1).optional(),
  personalBest: z.number().int().min(50).max(900).nullable().optional(),
});

const adminNoteSchema = z.object({
  adminNote: z.string().max(5000),
});

function formatUser(user: UserRecord, lastEntryDate?: string | null): FormattedUser {
  return {
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
    lastEntryDate,
  };
}

usersApp.get('/admin/users', async (c) => {
  const db = new DatabaseClient(c.env);
  const page = parseInt(c.req.query('page') || '1');
  const query = c.req.query('q');
  const offset = (page - 1) * PAGE_SIZE;

  let filter: Record<string, any> = { deleted_at: null };
  if (query) {
    filter.first_name = `%${query}%`;
  }

  const [users, total] = await Promise.all([
    db.find<UserRecord>('users', filter, { orderBy: 'created_at', order: 'DESC', limit: PAGE_SIZE, offset }),
    db.count('users', filter),
  ]);

  const formattedUsers = users.map((u: UserRecord) => formatUser(u, null));

  if (users.length > 0) {
    const userIds = users.map(u => u.id);
    const latestEntries = await db.find<{ user_id: string; date: string }>('entries', { user_id: userIds }, { orderBy: 'date', order: 'DESC', limit: 1000 });
    const lastEntryMap = new Map<string, string>();
    for (const e of latestEntries) {
      if (!lastEntryMap.has(e.user_id)) {
        lastEntryMap.set(e.user_id, e.date);
      }
    }
    for (let i = 0; i < formattedUsers.length; i++) {
      formattedUsers[i].lastEntryDate = lastEntryMap.get(users[i].id) || null;
    }
  }

  return c.json({ users: formattedUsers, total, page, pageSize: PAGE_SIZE });
});

usersApp.post('/admin/users', zValidator('json', createUserSchema), async (c) => {
  const db = new DatabaseClient(c.env);
  const data = c.req.valid('json');
  const now = new Date().toISOString();

  const shortToken = crypto.randomUUID();
  const shortCode = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  const user: UserRecord = {
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

  await db.insertOne('users', { ...user });

  await db.insertOne('audit_logs', {
    id: crypto.randomUUID(),
    admin_id: 'admin',
    target_id: user.id,
    target_model: 'User',
    action: 'CREATE',
    diff: JSON.stringify({ before: null, after: user }),
    timestamp: now,
  });

  return c.json(formatUser(user), 201);
});

usersApp.get('/admin/users/:id', async (c) => {
  const db = new DatabaseClient(c.env);
  const user = await db.findOne<UserRecord>('users', { id: c.req.param('id') });

  if (!user) return c.json({ error: 'Not found' }, 404);

  return c.json(formatUser(user));
});

usersApp.patch('/admin/users/:id', zValidator('json', updateUserSchema), async (c) => {
  const db = new DatabaseClient(c.env);
  const userId = c.req.param('id');
  const data = c.req.valid('json');
  const now = new Date().toISOString();

  const user = await db.findOne<UserRecord>('users', { id: userId });
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

  const updated = await db.findOne<UserRecord>('users', { id: userId });
  return c.json(formatUser(updated!));
});

usersApp.delete('/admin/users/:id', async (c) => {
  const db = new DatabaseClient(c.env);
  const userId = c.req.param('id');
  const now = new Date().toISOString();

  const user = await db.findOne<UserRecord>('users', { id: userId });
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

usersApp.patch('/admin/users/:id/note', zValidator('json', adminNoteSchema), async (c) => {
  const db = new DatabaseClient(c.env);
  const userId = c.req.param('id');
  const { adminNote } = c.req.valid('json');
  const now = new Date().toISOString();

  const user = await db.findOne<UserRecord>('users', { id: userId });
  if (!user) return c.json({ error: 'Not found' }, 404);

  const before = { adminNote: user.admin_note || '' };
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

usersApp.get('/admin/users/:id/export', async (c) => {
  const db = new DatabaseClient(c.env);
  const userId = c.req.param('id');
  const from = c.req.query('from');
  const to = c.req.query('to');

  const user = await db.findOne<UserRecord>('users', { id: userId });
  if (!user) return c.json({ error: 'Not found' }, 404);

  let filter: Record<string, any> = { user_id: userId };
  const dateFilter: Record<string, any> = {};
  if (from) dateFilter.$gte = from;
  if (to) dateFilter.$lte = to;
  if (from || to) filter.date = dateFilter;

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

export default usersApp;
