import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { DatabaseClient } from '../../lib/database';
import { writeCreateAudit, writeUpdateAudit, writeDeleteAudit } from '../../lib/audit';
import { DEFAULT_PAGE_SIZE } from '../../constants/pagination';
import type { Env } from '../../index';
import type { UserRecord, FormattedUser } from './types';
import {
  listUsers,
  createUser,
  getUser,
  updateUser,
  deleteUser,
  type CreateUserData,
  type UpdateUserData,
} from '../../services/userService';
import { generateCsv, getSafeFileName } from '../../services/exportService';

const usersApp = new Hono<{ Bindings: Env }>();
const PAGE_SIZE = DEFAULT_PAGE_SIZE;

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

usersApp.get('/admin/users', async (c) => {
  const db = new DatabaseClient(c.env);
  const page = parseInt(c.req.query('page') || '1');
  const query = c.req.query('q');

  const result = await listUsers(db, { page, query, pageSize: PAGE_SIZE });

  return c.json(result);
});

usersApp.post('/admin/users', zValidator('json', createUserSchema), async (c) => {
  const db = new DatabaseClient(c.env);
  const data = c.req.valid('json') as CreateUserData;

  const user = await createUser(db, data, writeCreateAudit);

  return c.json(user, 201);
});

usersApp.get('/admin/users/:id', async (c) => {
  const db = new DatabaseClient(c.env);
  const userId = c.req.param('id');

  const user = await getUser(db, userId);

  if (!user) return c.json({ error: 'Not found' }, 404);

  return c.json(user);
});

usersApp.patch('/admin/users/:id', zValidator('json', updateUserSchema), async (c) => {
  const db = new DatabaseClient(c.env);
  const userId = c.req.param('id');
  const data = c.req.valid('json') as UpdateUserData;

  const user = await updateUser(db, userId, data, writeUpdateAudit);

  if (!user) {
    const originalUser = await db.findOne<UserRecord>('users', { id: userId });
    if (!originalUser) return c.json({ error: 'Not found' }, 404);
    return c.json({ error: 'User is deleted' }, 400);
  }

  return c.json(user);
});

usersApp.delete('/admin/users/:id', async (c) => {
  const db = new DatabaseClient(c.env);
  const userId = c.req.param('id');

  const success = await deleteUser(db, userId, writeDeleteAudit);

  if (!success) return c.json({ error: 'Not found' }, 404);

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

  await writeUpdateAudit(db, userId, 'User', before, { adminNote });

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

  const csv = generateCsv(entries);

  c.header('Content-Type', 'text/csv');
  const safeName = getSafeFileName(user.first_name, user.last_name);
  c.header('Content-Disposition', `attachment; filename="${safeName}-entries.csv"`);
  return c.body(csv);
});

export default usersApp;
