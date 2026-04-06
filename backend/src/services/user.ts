import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';
import { Types } from 'mongoose';
import { User, IUser } from '../models/User';
import { Entry } from '../models/Entry';
import { logAction } from './audit';
import { PAGE_SIZE } from '../constants';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function generateShortCode(): Promise<string> {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  let exists = true;

  while (exists) {
    code = randomBytes(8).toString('hex').slice(0, 8);
    const count = await User.countDocuments({ shortCode: code });
    if (count === 0) exists = false;
  }
  return code;
}

export async function createUser(
  adminId: string,
  data: {
    firstName: string;
    lastName: string;
    nickname: string;
    personalBest?: number | null;
    adminNote?: string;
  }
): Promise<IUser> {
  const user = await User.create({
    ...data,
    shortToken: uuidv4(),
    shortCode: await generateShortCode(),
    personalBest: data.personalBest ?? null,
    adminNote: data.adminNote ?? '',
  });

  await logAction(adminId, user._id as Types.ObjectId, 'User', 'CREATE', null, {
    firstName: user.firstName,
    lastName: user.lastName,
    nickname: user.nickname,
    shortToken: user.shortToken,
    shortCode: user.shortCode,
    adminNote: user.adminNote,
  });

  return user;
}

export async function getUsers(
  query: string,
  page: number
): Promise<{ users: (IUser & { lastEntryDate?: string })[]; total: number }> {
  const filter: Record<string, unknown> = { deletedAt: null };

  if (query) {
    const escaped = escapeRegex(query);
    filter['$or'] = [
      { firstName: { $regex: escaped, $options: 'i' } },
      { lastName: { $regex: escaped, $options: 'i' } },
      { nickname: { $regex: escaped, $options: 'i' } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .sort({ createdAt: -1 }),
    User.countDocuments(filter),
  ]);

  // Get last entry date for each user
  const usersWithLastEntry = await Promise.all(
    users.map(async (user) => {
      const lastEntry = await Entry.findOne({ userId: user._id })
        .sort({ date: -1 })
        .select('date')
        .lean();
      const userObj = JSON.parse(JSON.stringify(user.toObject())) as Record<string, unknown>;
      return {
        ...userObj,
        lastEntryDate: lastEntry?.date ? new Date(lastEntry.date).toISOString() : undefined,
      };
    })
  );

  return { users: usersWithLastEntry as (IUser & { lastEntryDate?: string })[], total };
}

export async function getUserById(id: string): Promise<IUser | null> {
  return User.findOne({ _id: id, deletedAt: null });
}

export async function getUserByToken(token: string): Promise<IUser | null> {
  return User.findOne({ shortToken: token, deletedAt: null });
}

export async function getUserByShortCode(code: string): Promise<IUser | null> {
  return User.findOne({ shortCode: code, deletedAt: null });
}

export async function incrementClickCount(code: string): Promise<void> {
  await User.updateOne({ shortCode: code }, { $inc: { clickCount: 1 } });
}

export async function getFirstActiveUser(): Promise<IUser | null> {
  return User.findOne({ deletedAt: null }).sort({ createdAt: 1 });
}

export async function updateUser(
  adminId: string,
  id: string,
  data: {
    firstName?: string;
    lastName?: string;
    nickname?: string;
    shortCode?: string;
    personalBest?: number | null;
  }
): Promise<IUser | null> {
  const user = await User.findOne({ _id: id, deletedAt: null });
  if (!user) return null;

  const before = {
    firstName: user.firstName,
    lastName: user.lastName,
    nickname: user.nickname,
    shortCode: user.shortCode,
    personalBest: user.personalBest,
  };

  if (data.shortCode && data.shortCode !== user.shortCode) {
    const existing = await User.findOne({ shortCode: data.shortCode, deletedAt: null, _id: { $ne: id } });
    if (existing) throw new Error('Short code already in use');
  }

  Object.assign(user, data);
  await user.save();

  const after = {
    firstName: user.firstName,
    lastName: user.lastName,
    nickname: user.nickname,
    shortCode: user.shortCode,
    personalBest: user.personalBest,
  };

  await logAction(adminId, user._id as Types.ObjectId, 'User', 'UPDATE', before, after);

  return user;
}

export async function softDeleteUser(adminId: string, id: string): Promise<boolean> {
  const user = await User.findOne({ _id: id, deletedAt: null });
  if (!user) return false;

  const before = { firstName: user.firstName, lastName: user.lastName };
  user.deletedAt = new Date();
  await user.save();

  await logAction(adminId, user._id as Types.ObjectId, 'User', 'DELETE', before, null);

  return true;
}

export async function updateAdminNote(
  adminId: string,
  id: string,
  adminNote: string
): Promise<IUser | null> {
  const user = await User.findOne({ _id: id, deletedAt: null });
  if (!user) return null;

  const before = { adminNote: user.adminNote };
  user.adminNote = adminNote;
  await user.save();

  await logAction(adminId, user._id as Types.ObjectId, 'User', 'UPDATE', before, { adminNote });
  return user;
}

export async function rotateToken(
  adminId: string,
  id: string
): Promise<IUser | null> {
  const user = await User.findOne({ _id: id, deletedAt: null });
  if (!user) return null;

  const oldToken = user.shortToken;
  user.shortToken = uuidv4();
  await user.save();

  await logAction(adminId, user._id as Types.ObjectId, 'User', 'UPDATE',
    { shortToken: oldToken },
    { shortToken: user.shortToken }
  );

  return user;
}
