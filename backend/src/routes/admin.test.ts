import mongoose from 'mongoose';
import request from 'supertest';
import argon2 from 'argon2';
import { app } from '../index';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';

const TEST_PASSWORD = 'admintest123';
const TEST_JWT_SECRET = 'test-jwt-secret-admin';

beforeAll(async () => {
  const hash = await argon2.hash(TEST_PASSWORD);
  process.env.ADMIN_SECRET = hash;
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.MONGODB_URI = 'mongodb://localhost:27017/peakflow_test';

  await mongoose.connect(process.env.MONGODB_URI);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await User.deleteMany({});
  await AuditLog.deleteMany({});
});

async function getAdminToken(): Promise<string> {
  const res = await request(app)
    .post('/api/admin/login')
    .send({ password: TEST_PASSWORD });
  return res.body.token as string;
}

describe('POST /api/admin/login', () => {
  it('returns JWT for correct password', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for missing password', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('User CRUD', () => {
  it('creates a user and writes audit log', async () => {
    const token = await getAdminToken();

    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'สมชาย', lastName: 'ใจดี', nickname: 'ชาย', personalBest: 500 });

    expect(res.status).toBe(201);
    expect(res.body.shortToken).toBeDefined();
    expect(res.body.firstName).toBe('สมชาย');

    const log = await AuditLog.findOne({ action: 'CREATE', targetModel: 'User' });
    expect(log).not.toBeNull();
    expect(log!.adminId).toBe('admin');
  });

  it('lists users', async () => {
    const token = await getAdminToken();
    await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'A', lastName: 'B', nickname: 'AB' });

    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.users.length).toBe(1);
    expect(res.body.total).toBe(1);
  });

  it('gets a single user', async () => {
    const token = await getAdminToken();
    const created = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'A', lastName: 'B', nickname: 'C' });

    const res = await request(app)
      .get(`/api/admin/users/${created.body._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body._id).toBe(created.body._id);
  });

  it('updates a user and writes audit log', async () => {
    const token = await getAdminToken();
    const created = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'Old', lastName: 'Name', nickname: 'old' });

    const res = await request(app)
      .patch(`/api/admin/users/${created.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'New' });

    expect(res.status).toBe(200);
    expect(res.body.firstName).toBe('New');

    const log = await AuditLog.findOne({ action: 'UPDATE', targetModel: 'User' });
    expect(log).not.toBeNull();
    expect((log!.diff.before as Record<string, unknown>).firstName).toBe('Old');
    expect((log!.diff.after as Record<string, unknown>).firstName).toBe('New');
  });

  it('soft-deletes a user', async () => {
    const token = await getAdminToken();
    const created = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'A', lastName: 'B', nickname: 'C' });

    const del = await request(app)
      .delete(`/api/admin/users/${created.body._id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);

    // Should not appear in list
    const list = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${token}`);
    expect(list.body.total).toBe(0);
  });

  it('rotates short token', async () => {
    const token = await getAdminToken();
    const created = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'A', lastName: 'B', nickname: 'C' });

    const oldToken = created.body.shortToken as string;

    const rotate = await request(app)
      .post(`/api/admin/users/${created.body._id}/rotate-token`)
      .set('Authorization', `Bearer ${token}`);

    expect(rotate.status).toBe(200);
    expect(rotate.body.shortToken).not.toBe(oldToken);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/admin/users');
    expect(res.status).toBe(401);
  });
});
