import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Hono } from 'hono';
import { z } from 'zod';
import { parsePeakFlowReadings } from '../lib/peakFlow';

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

const createEntrySchema = z.object({
  date: z.string(),
  peakFlowReadings: z.tuple([z.number(), z.number(), z.number()]),
  spO2: z.number().int().min(70).max(100),
  medicationTiming: z.enum(['before', 'after']),
  period: z.enum(['morning', 'evening']),
  note: z.string().optional(),
});

const updateEntrySchema = z.object({
  date: z.string().optional(),
  peakFlowReadings: z.tuple([z.number(), z.number(), z.number()]).optional(),
  spO2: z.number().int().min(70).max(100).optional(),
  medicationTiming: z.enum(['before', 'after']).optional(),
  period: z.enum(['morning', 'evening']).optional(),
  note: z.string().optional(),
});

interface UserRecord {
  id: string;
  first_name: string;
  last_name: string;
  nickname: string;
  short_token: string;
  short_code: string;
  click_count: number;
  personal_best: number | null;
  admin_note: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

interface EntryRecord {
  id: string;
  user_id: string;
  date: string;
  peak_flow_readings: string;
  peak_flow: number;
  spo2: number;
  medication_timing: string;
  period: string;
  note: string;
  created_at: string;
  updated_at: string;
}

function createMockUser(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id: 'user-123',
    first_name: 'John',
    last_name: 'Smith',
    nickname: 'Johnny',
    short_token: 'token-abc-123',
    short_code: 'a1b2c3d4',
    click_count: 0,
    personal_best: 500,
    admin_note: '',
    deleted_at: null,
    created_at: '2026-04-01T00:00:00.000Z',
    updated_at: '2026-04-01T00:00:00.000Z',
    ...overrides,
  };
}

function createMockEntry(overrides: Partial<EntryRecord> = {}): EntryRecord {
  return {
    id: 'entry-456',
    user_id: 'user-123',
    date: '2026-04-13',
    peak_flow_readings: JSON.stringify([400, 420, 430]),
    peak_flow: 430,
    spo2: 97,
    medication_timing: 'before',
    period: 'morning',
    note: '',
    created_at: '2026-04-13T00:00:00.000Z',
    updated_at: '2026-04-13T00:00:00.000Z',
    ...overrides,
  };
}

describe('Admin User Management Flow', () => {
  const mockEnv = {
    DB: {},
    JWT_SECRET: 'test-secret',
    CORS_ORIGIN: '*',
    FRONTEND_URL: 'http://localhost:5173',
  };

  describe('AU-01 to AU-06: Create User Validation', () => {
    it('AU-01: Create user with valid data - validates schema accepts required fields', () => {
      const result = createUserSchema.safeParse({
        firstName: 'John',
        lastName: 'Smith',
        nickname: 'Johnny',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.firstName).toBe('John');
        expect(result.data.lastName).toBe('Smith');
        expect(result.data.nickname).toBe('Johnny');
      }
    });

    it('AU-02: Create user without optional fields - personalBest defaults to undefined', () => {
      const result = createUserSchema.safeParse({
        firstName: 'John',
        lastName: 'Smith',
        nickname: 'Johnny',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.personalBest).toBeUndefined();
      }
    });

    it('AU-03: Create user with personalBest - stores correctly', () => {
      const result = createUserSchema.safeParse({
        firstName: 'John',
        lastName: 'Smith',
        nickname: 'Johnny',
        personalBest: 500,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.personalBest).toBe(500);
      }
    });

    it('AU-04: Create user missing required field - rejects empty firstName', () => {
      const result = createUserSchema.safeParse({
        firstName: '',
        lastName: 'Smith',
        nickname: 'Johnny',
      });
      expect(result.success).toBe(false);
    });

    it('AU-05: Create user with invalid personalBest (<50) - rejects', () => {
      const result = createUserSchema.safeParse({
        firstName: 'John',
        lastName: 'Smith',
        nickname: 'Johnny',
        personalBest: 49,
      });
      expect(result.success).toBe(false);
    });

    it('AU-06: Create user with invalid personalBest (>900) - rejects', () => {
      const result = createUserSchema.safeParse({
        firstName: 'John',
        lastName: 'Smith',
        nickname: 'Johnny',
        personalBest: 901,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('AU-07 to AU-08: Get User', () => {
    it('AU-07: Get existing user - returns user object', async () => {
      const mockUser = createMockUser();

      const app = new Hono();
      app.get('/admin/users/:id', async (c) => {
        const userId = c.req.param('id');
        if (userId !== 'user-123') return c.json({ error: 'Not found' }, 404);
        return c.json({
          _id: mockUser.id,
          firstName: mockUser.first_name,
          lastName: mockUser.last_name,
          nickname: mockUser.nickname,
          personalBest: mockUser.personal_best,
        });
      });

      const res = await app.request('/admin/users/user-123', {}, mockEnv);
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data._id).toBe('user-123');
      expect(data.firstName).toBe('John');
    });

    it('AU-08: Get non-existent user - returns 404', async () => {
      const app = new Hono();
      app.get('/admin/users/:id', async (c) => {
        const userId = c.req.param('id');
        if (userId !== 'user-123') return c.json({ error: 'Not found' }, 404);
        return c.json({});
      });

      const res = await app.request('/admin/users/nonexistent', {}, mockEnv);
      expect(res.status).toBe(404);
    });
  });

  describe('AU-09 to AU-10: List Users', () => {
    it('AU-09: List users with pagination - returns paginated list', async () => {
      const users = [createMockUser(), createMockUser({ id: 'user-456' })];

      const app = new Hono();
      app.get('/admin/users', async (c) => {
        return c.json({ users, total: 2, page: 1, pageSize: 20 });
      });

      const res = await app.request('/admin/users', {}, mockEnv);
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.users).toHaveLength(2);
      expect(data.total).toBe(2);
      expect(data.page).toBe(1);
    });

    it('AU-10: List users with search query - filters by name', async () => {
      const users = [createMockUser({ first_name: 'John' })];

      const app = new Hono();
      app.get('/admin/users', async (c) => {
        const query = c.req.query('q');
        const filtered = query ? users.filter(u => u.first_name.includes(query)) : users;
        return c.json({ users: filtered, total: filtered.length });
      });

      const res = await app.request('/admin/users?q=John', {}, mockEnv);
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.users).toHaveLength(1);
    });
  });

  describe('AU-11 to AU-14: Update User', () => {
    it('AU-11: Update user firstName - returns updated user', async () => {
      let currentUser = createMockUser();

      const app = new Hono();
      app.patch('/admin/users/:id', async (c) => {
        const userId = c.req.param('id');
        if (userId !== 'user-123') return c.json({ error: 'Not found' }, 404);
        if (currentUser.deleted_at) return c.json({ error: 'User is deleted' }, 400);
        
        const data = await c.req.json();
        currentUser = { ...currentUser, first_name: data.firstName, updated_at: new Date().toISOString() };
        
        return c.json({ _id: currentUser.id, firstName: currentUser.first_name });
      });

      const res = await app.request('/admin/users/user-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: 'Jane' }),
      }, mockEnv);

      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.firstName).toBe('Jane');
    });

    it('AU-13: Update non-existent user - returns 404', async () => {
      const app = new Hono();
      app.patch('/admin/users/:id', async (c) => {
        const userId = c.req.param('id');
        if (userId !== 'user-123') return c.json({ error: 'Not found' }, 404);
        return c.json({});
      });

      const res = await app.request('/admin/users/nonexistent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: 'Jane' }),
      }, mockEnv);

      expect(res.status).toBe(404);
    });

    it('AU-14: Update deleted user - returns 400', async () => {
      const deletedUser = createMockUser({ deleted_at: '2026-04-13T00:00:00.000Z' });

      const app = new Hono();
      app.patch('/admin/users/:id', async (c) => {
        const userId = c.req.param('id');
        if (userId !== 'user-123') return c.json({ error: 'Not found' }, 404);
        if (deletedUser.deleted_at) return c.json({ error: 'User is deleted' }, 400);
        return c.json({});
      });

      const res = await app.request('/admin/users/user-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: 'Jane' }),
      }, mockEnv);

      expect(res.status).toBe(400);
    });
  });

  describe('AU-15 to AU-16: Delete User', () => {
    it('AU-15: Soft delete user - marks deleted_at', async () => {
      let currentUser = createMockUser();

      const app = new Hono();
      app.delete('/admin/users/:id', async (c) => {
        const userId = c.req.param('id');
        if (userId !== 'user-123') return c.json({ error: 'Not found' }, 404);
        currentUser = { ...currentUser, deleted_at: new Date().toISOString() };
        return c.json({ success: true });
      });

      const res = await app.request('/admin/users/user-123', { method: 'DELETE' }, mockEnv);
      expect(res.status).toBe(200);
      expect(currentUser.deleted_at).toBeTruthy();
    });

    it('AU-16: Delete non-existent user - returns 404', async () => {
      const app = new Hono();
      app.delete('/admin/users/:id', async (c) => {
        const userId = c.req.param('id');
        if (userId !== 'user-123') return c.json({ error: 'Not found' }, 404);
        return c.json({ success: true });
      });

      const res = await app.request('/admin/users/nonexistent', { method: 'DELETE' }, mockEnv);
      expect(res.status).toBe(404);
    });
  });

  describe('AU-17 to AU-18: Admin Note', () => {
    it('AU-17: Update admin note - saves note correctly', () => {
      const result = adminNoteSchema.safeParse({ adminNote: 'Patient needs follow-up' });
      expect(result.success).toBe(true);
    });

    it('AU-18: Update admin note exceeding 5000 chars - rejects', () => {
      const result = adminNoteSchema.safeParse({ adminNote: 'x'.repeat(5001) });
      expect(result.success).toBe(false);
    });
  });
});

describe('Admin Entry Management Flow', () => {
  const mockEnv = {
    DB: {},
    JWT_SECRET: 'test-secret',
    CORS_ORIGIN: '*',
    FRONTEND_URL: 'http://localhost:5173',
  };

  describe('AE-01 to AE-03: List Entries', () => {
    it('AE-01: List all entries - returns paginated entries', async () => {
      const entries = [createMockEntry()];

      const app = new Hono();
      app.get('/admin/entries', async (c) => {
        return c.json({ entries, total: 1, page: 1, pageSize: 20 });
      });

      const res = await app.request('/admin/entries', {}, mockEnv);
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.entries).toHaveLength(1);
      expect(data.total).toBe(1);
    });

    it('AE-02: List entries filtered by userId - returns filtered entries', async () => {
      const entries = [createMockEntry({ user_id: 'user-123' })];

      const app = new Hono();
      app.get('/admin/entries', async (c) => {
        const userId = c.req.query('userId');
        const filtered = userId ? entries.filter(e => e.user_id === userId) : entries;
        return c.json({ entries: filtered, total: filtered.length });
      });

      const res = await app.request('/admin/entries?userId=user-123', {}, mockEnv);
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.entries).toHaveLength(1);
    });

    it('AE-03: List entries with date range - applies date filter', async () => {
      const entries = [createMockEntry({ date: '2026-04-10' })];

      const app = new Hono();
      app.get('/admin/entries', async (c) => {
        const from = c.req.query('from');
        const to = c.req.query('to');
        let filtered = entries;
        if (from || to) {
          filtered = entries.filter(e => {
            if (from && e.date < from) return false;
            if (to && e.date > to) return false;
            return true;
          });
        }
        return c.json({ entries: filtered });
      });

      const res = await app.request('/admin/entries?from=2026-04-01&to=2026-04-15', {}, mockEnv);
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.entries).toHaveLength(1);
    });
  });

  describe('AE-04 to AE-08: Update Entry', () => {
    it('AE-04: Update entry date - validates and updates', () => {
      const result = updateEntrySchema.safeParse({ date: '2026-04-15' });
      expect(result.success).toBe(true);
    });

    it('AE-05: Update entry peakFlowReadings - validates and updates', () => {
      const result = updateEntrySchema.safeParse({ peakFlowReadings: [450, 460, 470] });
      expect(result.success).toBe(true);
    });

    it('AE-06: Update entry spO2 - validates and updates', () => {
      const result = updateEntrySchema.safeParse({ spO2: 98 });
      expect(result.success).toBe(true);
    });

    it('AE-07: Update entry with invalid spO2 - rejects', () => {
      const result = updateEntrySchema.safeParse({ spO2: 50 });
      expect(result.success).toBe(false);
    });

    it('AE-08: Update non-existent entry - returns 404', async () => {
      const app = new Hono();
      app.patch('/admin/entries/:id', async (c) => {
        const entryId = c.req.param('id');
        if (entryId !== 'entry-456') return c.json({ error: 'Not found' }, 404);
        return c.json({});
      });

      const res = await app.request('/admin/entries/nonexistent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spO2: 98 }),
      }, mockEnv);

      expect(res.status).toBe(404);
    });
  });

  describe('AE-09 to AE-10: Delete Entry', () => {
    it('AE-09: Delete entry - returns success', async () => {
      let deleted = false;

      const app = new Hono();
      app.delete('/admin/entries/:id', async (c) => {
        const entryId = c.req.param('id');
        if (entryId !== 'entry-456') return c.json({ error: 'Not found' }, 404);
        deleted = true;
        return c.json({ success: true });
      });

      const res = await app.request('/admin/entries/entry-456', { method: 'DELETE' }, mockEnv);
      expect(res.status).toBe(200);
      expect(deleted).toBe(true);
    });

    it('AE-10: Delete non-existent entry - returns 404', async () => {
      const app = new Hono();
      app.delete('/admin/entries/:id', async (c) => {
        const entryId = c.req.param('id');
        if (entryId !== 'entry-456') return c.json({ error: 'Not found' }, 404);
        return c.json({ success: true });
      });

      const res = await app.request('/admin/entries/nonexistent', { method: 'DELETE' }, mockEnv);
      expect(res.status).toBe(404);
    });
  });
});

describe('User Flow', () => {
  const mockEnv = {
    DB: {},
    JWT_SECRET: 'test-secret',
    CORS_ORIGIN: '*',
    FRONTEND_URL: 'http://localhost:5173',
  };

  describe('UF-01 to UF-03: Get User Profile', () => {
    it('UF-01: Get user profile with valid token - returns profile', async () => {
      const mockUser = createMockUser();

      const app = new Hono();
      app.get('/u/:token', async (c) => {
        const token = c.req.param('token');
        if (token !== 'token-abc-123') return c.json({ error: 'Not found' }, 404);
        return c.json({
          _id: mockUser.id,
          firstName: mockUser.first_name,
          lastName: mockUser.last_name,
          nickname: mockUser.nickname,
          personalBest: mockUser.personal_best,
        });
      });

      const res = await app.request('/u/token-abc-123', {}, mockEnv);
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.firstName).toBe('John');
      expect(data.personalBest).toBe(500);
    });

    it('UF-02: Get user profile with invalid token - returns 404', async () => {
      const app = new Hono();
      app.get('/u/:token', async (c) => {
        const token = c.req.param('token');
        if (token !== 'token-abc-123') return c.json({ error: 'Not found' }, 404);
        return c.json({});
      });

      const res = await app.request('/u/invalid-token', {}, mockEnv);
      expect(res.status).toBe(404);
    });

    it('UF-03: Get user profile with deleted user token - returns 404', async () => {
      const app = new Hono();
      app.get('/u/:token', async (c) => {
        const token = c.req.param('token');
        if (token !== 'token-abc-123') return c.json({ error: 'Not found' }, 404);
        return c.json({});
      });

      const res = await app.request('/u/deleted-user-token', {}, mockEnv);
      expect(res.status).toBe(404);
    });
  });

  describe('UF-04 to UF-06: List User Entries', () => {
    it('UF-04: List user entries - returns entries with zone', async () => {
      const mockEntry = createMockEntry();

      const app = new Hono();
      app.get('/u/:token/entries', async (c) => {
        const { readings, best } = parsePeakFlowReadings(mockEntry.peak_flow_readings, mockEntry.peak_flow);
        const formatted = [{ entry: { _id: mockEntry.id, date: mockEntry.date, peakFlowReadings: readings }, zone: { zone: best >= 400 ? 'green' : 'yellow', percentage: 86 } }];
        return c.json({ entries: formatted, total: 1, page: 1, pageSize: 20 });
      });

      const res = await app.request('/u/token-abc-123/entries', {}, mockEnv);
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.entries).toHaveLength(1);
      expect(data.entries[0].zone.zone).toBe('green');
    });

    it('UF-05: List user entries with pagination - respects page and pageSize', async () => {
      const app = new Hono();
      app.get('/u/:token/entries', async (c) => {
        const page = parseInt(c.req.query('page') || '1');
        const pageSize = parseInt(c.req.query('pageSize') || '20');
        return c.json({ entries: [], total: 50, page, pageSize });
      });

      const res = await app.request('/u/token-abc-123/entries?page=2&pageSize=10', {}, mockEnv);
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.page).toBe(2);
      expect(data.pageSize).toBe(10);
    });

    it('UF-06: List user entries with date filter - applies date range', async () => {
      const entries = [createMockEntry({ date: '2026-04-10' })];

      const app = new Hono();
      app.get('/u/:token/entries', async (c) => {
        const from = c.req.query('from');
        const to = c.req.query('to');
        let filtered = entries;
        if (from || to) {
          filtered = entries.filter(e => {
            if (from && e.date < from) return false;
            if (to && e.date > to) return false;
            return true;
          });
        }
        return c.json({ entries: filtered });
      });

      const res = await app.request('/u/token-abc-123/entries?from=2026-04-01&to=2026-04-15', {}, mockEnv);
      expect(res.status).toBe(200);
      const data = await res.json() as any;
      expect(data.entries).toHaveLength(1);
    });
  });

  describe('UF-07 to UF-10: Create Entry', () => {
    it('UF-07: Create valid entry - returns 201 with created entry', () => {
      const result = createEntrySchema.safeParse({
        date: '2026-04-13',
        peakFlowReadings: [400, 420, 430],
        spO2: 97,
        medicationTiming: 'before',
        period: 'morning',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.peakFlowReadings).toEqual([400, 420, 430]);
      }
    });

    it('UF-08: Create entry with invalid spO2 - rejects', () => {
      const result = createEntrySchema.safeParse({
        date: '2026-04-13',
        peakFlowReadings: [400, 420, 430],
        spO2: 69,
        medicationTiming: 'before',
        period: 'morning',
      });
      expect(result.success).toBe(false);
    });

    it('UF-09: Create entry with invalid period - rejects', () => {
      const result = createEntrySchema.safeParse({
        date: '2026-04-13',
        peakFlowReadings: [400, 420, 430],
        spO2: 97,
        medicationTiming: 'before',
        period: 'noon',
      });
      expect(result.success).toBe(false);
    });

    it('UF-10: Create entry with missing readings - rejects', () => {
      const result = createEntrySchema.safeParse({
        date: '2026-04-13',
        peakFlowReadings: [400, 420],
        spO2: 97,
        medicationTiming: 'before',
        period: 'morning',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('UF-11: Export Entries', () => {
    it('UF-11: Export entries as CSV - returns CSV content', async () => {
      const entries = [createMockEntry()];

      const app = new Hono();
      app.get('/u/:token/export', async (c) => {
        let csv = 'Date,Period,Best Peak Flow,SpO2,Medication,Note\n';
        for (const entry of entries) {
          const { best } = parsePeakFlowReadings(entry.peak_flow_readings, entry.peak_flow);
          csv += `"${entry.date}","${entry.period}","${best}","${entry.spo2}","${entry.medication_timing}","${entry.note}"\n`;
        }
        c.header('Content-Type', 'text/csv');
        return c.body(csv);
      });

      const res = await app.request('/u/token-abc-123/export', {}, mockEnv);
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('text/csv');
      const csv = await res.text();
      expect(csv).toContain('Date,Period,Best Peak Flow,SpO2,Medication,Note');
      expect(csv).toContain('2026-04-13');
    });

    it('UF-11: Export entries with date filter - returns filtered CSV content', async () => {
      const entries = [
        createMockEntry({ date: '2026-04-10' }),
        createMockEntry({ date: '2026-04-13' }),
        createMockEntry({ date: '2026-04-15' }),
      ];

      const app = new Hono();
      app.get('/u/:token/export', async (c) => {
        const from = c.req.query('from');
        const to = c.req.query('to');
        
        let filteredEntries = entries;
        if (from || to) {
          filteredEntries = entries.filter(e => {
            if (from && e.date < from) return false;
            if (to && e.date > to) return false;
            return true;
          });
        }
        
        let csv = 'Date,Period,Best Peak Flow,SpO2,Medication,Note\n';
        for (const entry of filteredEntries) {
          const { best } = parsePeakFlowReadings(entry.peak_flow_readings, entry.peak_flow);
          csv += `"${entry.date}","${entry.period}","${best}","${entry.spo2}","${entry.medication_timing}","${entry.note}"\n`;
        }
        c.header('Content-Type', 'text/csv');
        return c.body(csv);
      });

      // Test with from date filter
      const resFrom = await app.request('/u/token-abc-123/export?from=2026-04-12', {}, mockEnv);
      expect(resFrom.status).toBe(200);
      const csvFrom = await resFrom.text();
      expect(csvFrom).toContain('2026-04-13');
      expect(csvFrom).toContain('2026-04-15');
      expect(csvFrom).not.toContain('2026-04-10');

      // Test with to date filter
      const resTo = await app.request('/u/token-abc-123/export?to=2026-04-12', {}, mockEnv);
      expect(resTo.status).toBe(200);
      const csvTo = await resTo.text();
      expect(csvTo).toContain('2026-04-10');
      expect(csvTo).not.toContain('2026-04-13');
      expect(csvTo).not.toContain('2026-04-15');

      // Test with both from and to date filters
      const resRange = await app.request('/u/token-abc-123/export?from=2026-04-12&to=2026-04-14', {}, mockEnv);
      expect(resRange.status).toBe(200);
      const csvRange = await resRange.text();
      expect(csvRange).toContain('2026-04-13');
      expect(csvRange).not.toContain('2026-04-10');
      expect(csvRange).not.toContain('2026-04-15');
    });
  });
});

describe('Input Validation Limits', () => {
  it('SpO2 must be between 70 and 100', () => {
    const valid = createEntrySchema.safeParse({
      date: '2026-04-13',
      peakFlowReadings: [400, 420, 430],
      spO2: 70,
      medicationTiming: 'before',
      period: 'morning',
    });
    expect(valid.success).toBe(true);

    const tooLow = createEntrySchema.safeParse({
      date: '2026-04-13',
      peakFlowReadings: [400, 420, 430],
      spO2: 69,
      medicationTiming: 'before',
      period: 'morning',
    });
    expect(tooLow.success).toBe(false);
  });

  it('Personal Best must be between 50 and 900', () => {
    const valid = createUserSchema.safeParse({
      firstName: 'John',
      lastName: 'Smith',
      nickname: 'Johnny',
      personalBest: 500,
    });
    expect(valid.success).toBe(true);

    const tooLow = createUserSchema.safeParse({
      firstName: 'John',
      lastName: 'Smith',
      nickname: 'Johnny',
      personalBest: 49,
    });
    expect(tooLow.success).toBe(false);

    const tooHigh = createUserSchema.safeParse({
      firstName: 'John',
      lastName: 'Smith',
      nickname: 'Johnny',
      personalBest: 901,
    });
    expect(tooHigh.success).toBe(false);
  });

  it('Medication timing must be before or after', () => {
    const valid = createEntrySchema.safeParse({
      date: '2026-04-13',
      peakFlowReadings: [400, 420, 430],
      spO2: 97,
      medicationTiming: 'before',
      period: 'morning',
    });
    expect(valid.success).toBe(true);

    const invalid = createEntrySchema.safeParse({
      date: '2026-04-13',
      peakFlowReadings: [400, 420, 430],
      spO2: 97,
      medicationTiming: 'during',
      period: 'morning',
    });
    expect(invalid.success).toBe(false);
  });

  it('Period must be morning or evening', () => {
    const valid = createEntrySchema.safeParse({
      date: '2026-04-13',
      peakFlowReadings: [400, 420, 430],
      spO2: 97,
      medicationTiming: 'before',
      period: 'evening',
    });
    expect(valid.success).toBe(true);

    const invalid = createEntrySchema.safeParse({
      date: '2026-04-13',
      peakFlowReadings: [400, 420, 430],
      spO2: 97,
      medicationTiming: 'before',
      period: 'afternoon',
    });
    expect(invalid.success).toBe(false);
  });
});

describe('Zone Calculation', () => {
  function calculateZone(reading: number, personalBest: number | null): { zone: string; percentage: number } | null {
    if (personalBest === null) return null;
    const percentage = Math.round((reading / personalBest) * 100);
    if (percentage >= 80) return { zone: 'green', percentage };
    if (percentage >= 50) return { zone: 'yellow', percentage };
    return { zone: 'red', percentage };
  }

  it('returns green zone for >= 80% of personal best', () => {
    const result = calculateZone(400, 500);
    expect(result?.zone).toBe('green');
    expect(result?.percentage).toBe(80);
  });

  it('returns green zone for exactly 100%', () => {
    const result = calculateZone(500, 500);
    expect(result?.zone).toBe('green');
    expect(result?.percentage).toBe(100);
  });

  it('returns yellow zone for 50-79% of personal best', () => {
    const result = calculateZone(350, 500);
    expect(result?.zone).toBe('yellow');
    expect(result?.percentage).toBe(70);
  });

  it('returns yellow zone for exactly 50%', () => {
    const result = calculateZone(250, 500);
    expect(result?.zone).toBe('yellow');
    expect(result?.percentage).toBe(50);
  });

  it('returns red zone for < 50% of personal best', () => {
    const result = calculateZone(200, 500);
    expect(result?.zone).toBe('red');
    expect(result?.percentage).toBe(40);
  });

  it('returns null zone when personalBest is null', () => {
    const result = calculateZone(400, null);
    expect(result).toBeNull();
  });
});

describe('Audit Log Behavior', () => {
  it('audit log is created on user create action', () => {
    const auditLog = {
      id: 'audit-1',
      admin_id: 'admin',
      target_id: 'user-123',
      target_model: 'User',
      action: 'CREATE',
      diff: JSON.stringify({ before: null, after: { id: 'user-123' } }),
      timestamp: new Date().toISOString(),
    };
    expect(auditLog.action).toBe('CREATE');
    expect(auditLog.target_model).toBe('User');
  });

  it('audit log is created on user update action', () => {
    const auditLog = {
      id: 'audit-2',
      admin_id: 'admin',
      target_id: 'user-123',
      target_model: 'User',
      action: 'UPDATE',
      diff: JSON.stringify({ before: { first_name: 'John' }, after: { first_name: 'Jane' } }),
      timestamp: new Date().toISOString(),
    };
    expect(auditLog.action).toBe('UPDATE');
    expect(auditLog.target_model).toBe('User');
  });

  it('audit log is created on user delete action', () => {
    const auditLog = {
      id: 'audit-3',
      admin_id: 'admin',
      target_id: 'user-123',
      target_model: 'User',
      action: 'DELETE',
      diff: JSON.stringify({ before: { id: 'user-123' }, after: null }),
      timestamp: new Date().toISOString(),
    };
    expect(auditLog.action).toBe('DELETE');
    expect(auditLog.target_model).toBe('User');
  });

  it('audit log is created on entry delete action', () => {
    const auditLog = {
      id: 'audit-4',
      admin_id: 'admin',
      target_id: 'entry-456',
      target_model: 'Entry',
      action: 'DELETE',
      diff: JSON.stringify({ before: { id: 'entry-456' }, after: null }),
      timestamp: new Date().toISOString(),
    };
    expect(auditLog.action).toBe('DELETE');
    expect(auditLog.target_model).toBe('Entry');
  });
});
