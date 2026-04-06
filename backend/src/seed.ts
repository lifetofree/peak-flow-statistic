import dotenv from 'dotenv';
dotenv.config();

import argon2 from 'argon2';
import mongoose from 'mongoose';
import { User } from './models/User';

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/peakflow';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  // Generate a hash for the test password "admin123"
  const testPassword = 'admin123';
  const hash = await argon2.hash(testPassword);
  console.log('\n=== Admin credentials ===');
  console.log(`Password: ${testPassword}`);
  console.log(`Hash (set this as ADMIN_SECRET in .env):\n${hash}\n`);

  // Create test users
  await User.deleteMany({});
  const users = await User.insertMany([
    {
      firstName: 'สมชาย',
      lastName: 'ใจดี',
      nickname: 'ชาย',
      shortToken: 'test-token-user-001',
      shortCode: 'chai01',
      personalBest: 500,
      adminNote: '',
      deletedAt: null,
    },
    {
      firstName: 'สมหญิง',
      lastName: 'รักษ์สุขภาพ',
      nickname: 'หญิง',
      shortToken: 'test-token-user-002',
      shortCode: 'ying02',
      personalBest: 420,
      adminNote: '',
      deletedAt: null,
    },
    {
      firstName: 'ทดสอบ',
      lastName: 'ระบบ',
      nickname: 'test',
      shortToken: 'test-token-user-003',
      shortCode: 'test03',
      personalBest: null,
      adminNote: 'ผู้ใช้ทดสอบ — ยังไม่มี personal best',
      deletedAt: null,
    },
  ]);

  console.log('=== Test users created ===');
  users.forEach((u) => {
    const baseUrl = process.env.BASE_SHORT_LINK_URL || 'http://localhost:5173/u';
    console.log(`${u.nickname}: ${baseUrl}/${u.shortToken}`);
  });

  await mongoose.disconnect();
  console.log('\nDone.');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
