import { Hono } from 'hono';
import type { Env } from '../../index';
import usersRoutes from './users';
import entriesRoutes from './entries';
import auditRoutes from './audit';

const app = new Hono<{ Bindings: Env }>();

app.route('/', usersRoutes);
app.route('/', entriesRoutes);
app.route('/', auditRoutes);

export default app;
