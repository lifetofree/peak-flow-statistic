import { Hono } from 'hono';
import type { Env } from '../../index';
import { rateLimitAdmin } from '../../middleware/rateLimit';
import usersRoutes from './users';
import entriesRoutes from './entries';
import auditRoutes from './audit';

const app = new Hono<{ Bindings: Env }>();

app.use('/admin/*', rateLimitAdmin);

app.route('/', usersRoutes);
app.route('/', entriesRoutes);
app.route('/', auditRoutes);

export default app;
