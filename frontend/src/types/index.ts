export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  nickname: string;
  shortToken: string;
  shortCode: string;
  clickCount: number;
  personalBest: number | null;
  adminNote: string;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastEntryDate?: string;
}

export interface UserProfile {
  _id: string;
  firstName: string;
  lastName: string;
  nickname: string;
  personalBest: number | null;
}

export interface Entry {
  _id: string;
  userId: string;
  date: string;
  peakFlowReadings: [number, number, number];
  spO2: number;
  medicationTiming: 'before' | 'after';
  period: 'morning' | 'evening';
  note: string;
  createdAt: string;
  updatedAt: string;
}

export type Zone = 'green' | 'yellow' | 'red';

export interface ZoneResult {
  zone: Zone;
  percentage: number;
}

export interface EntryWithZone {
  entry: Entry;
  zone: ZoneResult | null;
}

export interface PaginatedEntries {
  entries: EntryWithZone[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PaginatedUsers {
  users: User[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PaginatedAuditLogs {
  logs: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuditLog {
  _id: string;
  adminId: string;
  targetId: string;
  targetModel: 'Entry' | 'User';
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  diff: {
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
  };
  timestamp: string;
}

export interface CreateEntryInput {
  date: string;
  peakFlowReadings: [number, number, number];
  spO2: number;
  medicationTiming: 'before' | 'after';
  period: 'morning' | 'evening';
  note?: string;
}
