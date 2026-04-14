import { calculateZone, type ZoneResult } from '../routes/zone';
import { parsePeakFlowReadings } from '../lib/peakFlow';
import type { EntryRecord, UserRecord, FormattedEntry } from '../routes/admin/types';

export interface CreateEntryData {
  date: string;
  peakFlowReadings: [number, number, number];
  spO2: number;
  medicationTiming: 'before' | 'after';
  period: 'morning' | 'evening';
  note?: string;
}

export interface UpdateEntryData {
  date?: string;
  peakFlowReadings?: [number, number, number];
  spO2?: number;
  medicationTiming?: 'before' | 'after';
  period?: 'morning' | 'evening';
  note?: string;
}

export interface EntryListParams {
  userId: string;
  page?: number;
  pageSize?: number;
  from?: string;
  to?: string;
}

export interface EntryListResult {
  entries: Array<{
    entry: {
      _id: string;
      userId: string;
      date: string;
      peakFlowReadings: number[];
      spO2: number;
      medicationTiming: string;
      period: string;
      note: string;
      createdAt: string;
      updatedAt: string;
    };
    zone: { zone: string; percentage: number } | null;
  }>;
  total: number;
  page: number;
  pageSize: number;
}

export function formatEntryWithZone(entry: EntryRecord, user: UserRecord | null): FormattedEntry {
  const { readings: peakFlowReadings, best: bestReading } = parsePeakFlowReadings(
    entry.peak_flow_readings,
    entry.peak_flow
  );
  const zone = user?.personal_best ? calculateZone(bestReading, user.personal_best) : null;

  return {
    _id: entry.id,
    userId: entry.user_id,
    date: entry.date,
    peakFlowReadings,
    spO2: entry.spo2,
    medicationTiming: entry.medication_timing,
    period: entry.period || 'morning',
    note: entry.note || '',
    zone,
    createdAt: entry.created_at,
    updatedAt: entry.updated_at,
  };
}

export function formatEntriesWithZone(entries: EntryRecord[], userMap: Map<string, UserRecord>): FormattedEntry[] {
  return entries.map(entry => {
    const user = userMap.get(entry.user_id) || null;
    return formatEntryWithZone(entry, user);
  });
}

export function buildEntryData(userId: string, data: CreateEntryData, now: string) {
  const entry = {
    id: crypto.randomUUID(),
    user_id: userId,
    date: data.date,
    peak_flow_readings: JSON.stringify(data.peakFlowReadings),
    peak_flow: Math.max(data.peakFlowReadings[0], data.peakFlowReadings[1], data.peakFlowReadings[2]),
    spo2: data.spO2,
    medication_timing: data.medicationTiming,
    period: data.period,
    note: data.note || '',
    created_at: now,
    updated_at: now,
  };

  return entry;
}

export function buildEntryUpdates(data: UpdateEntryData, now: string) {
  const updates: Record<string, any> = { updated_at: now };

  if (data.date !== undefined) updates.date = data.date;
  if (data.peakFlowReadings !== undefined) updates.peak_flow_readings = JSON.stringify(data.peakFlowReadings);
  if (data.spO2 !== undefined) updates.spo2 = data.spO2;
  if (data.medicationTiming !== undefined) updates.medication_timing = data.medicationTiming;
  if (data.period !== undefined) updates.period = data.period;
  if (data.note !== undefined) updates.note = data.note;

  return updates;
}

export async function getUserEntries(
  db: {
    find: (table: string, filter: any, options?: any) => Promise<any[]>;
    count: (table: string, filter: any) => Promise<number>;
  },
  params: EntryListParams,
  user: UserRecord
): Promise<EntryListResult> {
  const page = params.page || 1;
  const pageSize = params.pageSize !== undefined ? params.pageSize : 0;
  const from = params.from;
  const to = params.to;

  const filter: Record<string, any> = { user_id: params.userId };
  const dateFilter: Record<string, any> = {};
  if (from) dateFilter.$gte = from;
  if (to) dateFilter.$lte = to;
  if (from || to) filter.date = dateFilter;

  const offset = pageSize > 0 ? (page - 1) * pageSize : 0;

  const [entries, total] = await Promise.all([
    db.find('entries', filter, {
      orderBy: 'date', order: 'DESC',
      limit: pageSize > 0 ? pageSize : undefined,
      offset: pageSize > 0 ? offset : undefined,
    }),
    db.count('entries', filter),
  ]);

  const formattedEntries = entries.map((e: any) => {
    const formatted = formatEntryWithZone(e, user);

    return {
      entry: {
        _id: formatted._id,
        userId: formatted.userId,
        date: formatted.date,
        peakFlowReadings: formatted.peakFlowReadings,
        spO2: formatted.spO2,
        medicationTiming: formatted.medicationTiming,
        period: formatted.period,
        note: formatted.note,
        createdAt: formatted.createdAt,
        updatedAt: formatted.updatedAt,
      },
      zone: formatted.zone,
    };
  });

  return { entries: formattedEntries, total, page, pageSize };
}

export async function createUserEntry(
  db: { insertOne: (table: string, data: Record<string, unknown>) => Promise<void> },
  userId: string,
  data: CreateEntryData,
  now: string
): Promise<{
  _id: string;
  userId: string;
  date: string;
  peakFlowReadings: [number, number, number];
  spO2: number;
  medicationTiming: string;
  period: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}> {
  const entry = buildEntryData(userId, data, now);

  await db.insertOne('entries', entry);

  return {
    _id: entry.id,
    userId: entry.user_id,
    date: entry.date,
    peakFlowReadings: data.peakFlowReadings,
    spO2: entry.spo2,
    medicationTiming: entry.medication_timing,
    period: entry.period,
    note: entry.note,
    createdAt: entry.created_at,
    updatedAt: entry.updated_at,
  };
}

export async function updateEntry(
  db: {
    findOne: <T>(table: string, filter: any) => Promise<T | null>;
    updateOne: (table: string, filter: any, data: Record<string, unknown>) => Promise<void>;
  },
  entryId: string,
  data: UpdateEntryData,
  now: string
): Promise<FormattedEntry | null> {
  const entry = await db.findOne<EntryRecord>('entries', { id: entryId });
  if (!entry) return null;

  const updates = buildEntryUpdates(data, now);

  await db.updateOne('entries', { id: entryId }, updates);

  const updated = await db.findOne<EntryRecord>('entries', { id: entryId });
  return updated ? formatEntryWithZone(updated, null) : null;
}

export async function deleteEntry(
  db: {
    findOne: <T>(table: string, filter: any) => Promise<T | null>;
    deleteOne: (table: string, filter: any) => Promise<void>;
  },
  entryId: string
): Promise<boolean> {
  const entry = await db.findOne<EntryRecord>('entries', { id: entryId });
  if (!entry) return false;

  await db.deleteOne('entries', { id: entryId });

  return true;
}
