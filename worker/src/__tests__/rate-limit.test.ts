import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rateLimitPatient, rateLimitAdmin } from '../middleware/rateLimit';
import { Hono } from 'hono';
import type { Env } from '../index';

describe('Rate Limiting Middleware', () => {
  let mockEnv: Env;
  let mockKV: any;

  beforeEach(() => {
    mockKV = {
      get: vi.fn(),
      put: vi.fn(),
    };

    mockEnv = {
      DB: {} as any,
      RATE_LIMIT: mockKV,
      JWT_SECRET: 'test-secret',
      CORS_ORIGIN: '*',
      FRONTEND_URL: 'http://localhost:5173',
    };
  });

  describe('rateLimitPatient', () => {
    it('should allow requests within limit', async () => {
      const app = new Hono<{ Bindings: Env }>();
      app.use('*', rateLimitPatient);
      app.get('/test', (c) => c.json({ success: true }));

      mockKV.get.mockResolvedValue(null);

      const res = await app.request('/test', {}, mockEnv);
      expect(res.status).toBe(200);
      expect(res.headers.get('X-RateLimit-Limit')).toBe('100');
      expect(res.headers.get('X-RateLimit-Remaining')).toBe('99');
    });

    it('should reject requests exceeding limit', async () => {
      const app = new Hono<{ Bindings: Env }>();
      app.use('*', rateLimitPatient);
      app.get('/test', (c) => c.json({ success: true }));

      const timestamps = Array(100).fill(Date.now());
      mockKV.get.mockResolvedValue(JSON.stringify(timestamps));

      const res = await app.request('/test', {}, mockEnv);
      expect(res.status).toBe(429);
      expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(res.headers.get('Retry-After')).toBeDefined();
    });
  });

  describe('rateLimitAdmin', () => {
    it('should allow requests within admin limit', async () => {
      const app = new Hono<{ Bindings: Env }>();
      app.use('*', rateLimitAdmin);
      app.get('/test', (c) => c.json({ success: true }));

      mockKV.get.mockResolvedValue(null);

      const res = await app.request('/test', {}, mockEnv);
      expect(res.status).toBe(200);
      expect(res.headers.get('X-RateLimit-Limit')).toBe('300');
      expect(res.headers.get('X-RateLimit-Remaining')).toBe('299');
    });

    it('should reject admin requests exceeding limit', async () => {
      const app = new Hono<{ Bindings: Env }>();
      app.use('*', rateLimitAdmin);
      app.get('/test', (c) => c.json({ success: true }));

      const timestamps = Array(300).fill(Date.now());
      mockKV.get.mockResolvedValue(JSON.stringify(timestamps));

      const res = await app.request('/test', {}, mockEnv);
      expect(res.status).toBe(429);
      expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
    });
  });
});
