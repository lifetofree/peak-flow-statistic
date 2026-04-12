import { Hono } from 'hono';
import { cors } from 'hono/cors';
import healthRoutes from './routes/health';
import userRoutes from './routes/user';
import adminRoutes from './routes/admin';
import redirectRoutes from './routes/redirect';

export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  CORS_ORIGIN: string;
  FRONTEND_URL: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: (origin, c) => {
    const allowedOrigins = c.env.CORS_ORIGIN?.split(',') || ['*'];
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return origin;
    }
    return allowedOrigins[0] || '*';
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.route('/api', healthRoutes);
app.route('/api', userRoutes);
app.route('/api', adminRoutes);
app.route('/s', redirectRoutes);

export default app;
