import type { UserRecord, FormattedUser } from '../routes/admin/types';

export interface CreateUserData {
  firstName: string;
  lastName: string;
  nickname: string;
  personalBest?: number | null;
  adminNote?: string;
  instructionBox?: string;
  userNote?: string;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  nickname?: string;
  personalBest?: number | null;
  instructionBox?: string;
  userNote?: string;
}

export function generateShortToken(): string {
  return crypto.randomUUID();
}

export function generateShortCode(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

export function buildUserData(data: CreateUserData, now: string): UserRecord {
  const shortToken = generateShortToken();
  const shortCode = generateShortCode();

  return {
    id: crypto.randomUUID(),
    first_name: data.firstName,
    last_name: data.lastName,
    nickname: data.nickname,
    short_token: shortToken,
    short_code: shortCode,
    click_count: 0,
    personal_best: data.personalBest || null,
    admin_note: data.adminNote || '',
    instruction_box: data.instructionBox || '',
    user_note: data.userNote || '',
    deleted_at: null,
    created_at: now,
    updated_at: now,
  };
  }

export function formatUser(user: UserRecord, lastEntryDate?: string | null): FormattedUser {
  return {
    _id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    nickname: user.nickname,
    shortToken: user.short_token,
    shortCode: user.short_code,
    clickCount: user.click_count || 0,
    personalBest: user.personal_best,
    adminNote: user.admin_note || '',
    instructionBox: user.instruction_box || '',
    userNote: user.user_note || '',
    deletedAt: user.deleted_at,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    lastEntryDate,
  };
}

export function buildUserUpdates(data: UpdateUserData, now: string) {
  const updates: Record<string, any> = { updated_at: now };

  if (data.firstName !== undefined) updates.first_name = data.firstName;
  if (data.lastName !== undefined) updates.last_name = data.lastName;
  if (data.nickname !== undefined) updates.nickname = data.nickname;
  if (data.personalBest !== undefined) updates.personal_best = data.personalBest;
  if (data.instructionBox !== undefined) updates.instruction_box = data.instructionBox;
  if (data.userNote !== undefined) updates.user_note = data.userNote;

  return updates;
}

export async function getLastEntryDates(
  db: any,
  userIds: string[]
): Promise<Map<string, string>> {
  return db.getLastEntryDatesForUsers(userIds);
}

export interface UserListParams {
  page?: number;
  query?: string;
  pageSize?: number;
}

export interface UserListResult {
  users: FormattedUser[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listUsers(
  db: {
    find: <T>(table: string, filter: any, options?: any) => Promise<T[]>;
    count: (table: string, filter: any) => Promise<number>;
  },
  params: UserListParams
): Promise<UserListResult> {
  const page = params.page || 1;
  const query = params.query;
  const pageSize = params.pageSize || 20;
  const offset = (page - 1) * pageSize;

  let filter: Record<string, any> = { deleted_at: null };
  if (query) {
    filter.first_name = `%${query}%`;
  }

  const [users, total] = await Promise.all([
    db.find<UserRecord>('users', filter, { orderBy: 'created_at', order: 'DESC', limit: pageSize, offset }),
    db.count('users', filter),
  ]);

  const formattedUsers = users.map((u: UserRecord) => formatUser(u, null));

  if (users.length > 0) {
    const userIds = users.map(u => u.id);
    const lastEntryMap = await getLastEntryDates(db, userIds);
    for (let i = 0; i < formattedUsers.length; i++) {
      formattedUsers[i].lastEntryDate = lastEntryMap.get(users[i].id) || null;
    }
  }

  return { users: formattedUsers, total, page, pageSize };
}

export async function createUser(
  db: {
    insertOne: (table: string, data: Record<string, unknown>) => Promise<void>;
  },
  data: CreateUserData,
  writeAudit: (db: any, id: string, model: string, record: Record<string, unknown>) => Promise<void>
): Promise<FormattedUser> {
  const now = new Date().toISOString();
  const user = buildUserData(data, now);

  await db.insertOne('users', { ...user });

  await writeAudit(db, user.id, 'User', { ...user });

  return formatUser(user);
}

export async function getUser(
  db: {
    findOne: <T>(table: string, filter: any) => Promise<T | null>;
  },
  userId: string
): Promise<FormattedUser | null> {
  const user = await db.findOne<UserRecord>('users', { id: userId });
  if (!user) return null;

  return formatUser(user);
}

export async function updateUser(
  db: {
    findOne: <T>(table: string, filter: any) => Promise<T | null>;
    updateOne: (table: string, filter: any, data: Record<string, unknown>) => Promise<void>;
  },
  userId: string,
  data: UpdateUserData,
  writeAudit: (db: any, id: string, model: string, before: Record<string, unknown>, after: Record<string, unknown>) => Promise<void>
): Promise<FormattedUser | null> {
  const now = new Date().toISOString();

  const user = await db.findOne<UserRecord>('users', { id: userId });
  if (!user) return null;
  if (user.deleted_at) return null;

  const before = { ...user };
  const updates = buildUserUpdates(data, now);

  await db.updateOne('users', { id: userId }, updates);

  await writeAudit(db, userId, 'User', before, { ...user, ...updates });

  const updated = await db.findOne<UserRecord>('users', { id: userId });
  return updated ? formatUser(updated) : null;
}

export async function deleteUser(
  db: {
    findOne: <T>(table: string, filter: any) => Promise<T | null>;
    updateOne: (table: string, filter: any, data: Record<string, unknown>) => Promise<void>;
  },
  userId: string,
  writeAudit: (db: any, id: string, model: string, record: Record<string, unknown>) => Promise<void>
): Promise<boolean> {
  const now = new Date().toISOString();

  const user = await db.findOne<UserRecord>('users', { id: userId });
  if (!user) return false;

  await db.updateOne('users', { id: userId }, { deleted_at: now, updated_at: now });

  await writeAudit(db, userId, 'User', { ...user });

  return true;
}
