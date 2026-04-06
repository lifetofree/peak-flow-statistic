import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { login } from './auth';

const TEST_PASSWORD = 'supersecret';
const TEST_SECRET = 'test-jwt-secret';

beforeAll(async () => {
  // Set NODE_ENV to production to test actual auth logic
  process.env.NODE_ENV = 'production';
  const hash = await argon2.hash(TEST_PASSWORD);
  process.env.ADMIN_SECRET = hash;
  process.env.JWT_SECRET = TEST_SECRET;
});

afterAll(() => {
  delete process.env.ADMIN_SECRET;
  delete process.env.JWT_SECRET;
  delete process.env.NODE_ENV;
});

describe('auth service', () => {
  it('returns a JWT for correct password', async () => {
    const token = await login(TEST_PASSWORD);
    expect(token).not.toBeNull();

    const payload = jwt.verify(token!, TEST_SECRET) as { adminId: string };
    expect(payload.adminId).toBe('admin');
  });

  it('returns null for wrong password', async () => {
    const token = await login('wrongpassword');
    expect(token).toBeNull();
  });

  it('throws if ADMIN_SECRET is not set', async () => {
    const backup = process.env.ADMIN_SECRET;
    delete process.env.ADMIN_SECRET;
    await expect(login(TEST_PASSWORD)).rejects.toThrow('ADMIN_SECRET not configured');
    process.env.ADMIN_SECRET = backup;
  });
});
