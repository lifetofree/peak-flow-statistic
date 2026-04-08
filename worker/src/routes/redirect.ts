import { Hono } from 'hono';
import { DatabaseClient } from '../lib/database';
import type { Env } from '../index';

const app = new Hono<{ Bindings: Env }>();

app.get('/:code', async (c) => {
  const { code } = c.req.param();
  const db = new DatabaseClient(c.env);

  const user = await db.findOne<any>('users', { short_code: code, deleted_at: null });

  if (!user) {
    return c.redirect('/', 302);
  }

  // Increment click count
  await db.updateOne('users', { id: user.id }, { click_count: (user.click_count || 0) + 1 });

  const frontendUrl = c.env.FRONTEND_URL || 'https://www.peakflowstat.allergyclinic.cc';
  return c.redirect(`${frontendUrl}/u/${user.short_token}`, 302);
});

export default app;
