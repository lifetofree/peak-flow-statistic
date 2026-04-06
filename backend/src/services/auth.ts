import argon2 from 'argon2';
import jwt from 'jsonwebtoken';

const ADMIN_ID = 'admin';

export async function login(password: string): Promise<string | null> {
  const hash = process.env.ADMIN_SECRET;
  if (!hash) throw new Error('ADMIN_SECRET not configured');

  const valid = await argon2.verify(hash, password);
  if (!valid) return null;

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');

  const token = jwt.sign({ adminId: ADMIN_ID }, secret, { expiresIn: '8h' });
  return token;
}
