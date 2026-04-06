import { Types } from 'mongoose';
import { Entry, IEntry } from '../models/Entry';
import { User } from '../models/User';
import { logAction } from './audit';
import { calculateZone, getBestReading, ZoneResult } from './zone';
import { stringify } from 'csv-stringify/sync';
import { PAGE_SIZE } from '../constants';

export interface EntryWithZone {
  entry: IEntry;
  zone: ZoneResult | null;
}

function enrichWithZone(entry: IEntry, personalBest: number | null): EntryWithZone {
  if (personalBest == null) return { entry, zone: null };
  const best = getBestReading(entry.peakFlowReadings);
  return { entry, zone: calculateZone(best, personalBest) };
}

export async function createEntry(
  userId: Types.ObjectId,
  data: {
    date: string;
    peakFlowReadings: [number, number, number];
    spO2: number;
    medicationTiming: 'before' | 'after';
    period: 'morning' | 'evening';
    note?: string;
  }
): Promise<IEntry> {
  const entry = await Entry.create({
    userId,
    date: new Date(data.date),
    peakFlowReadings: data.peakFlowReadings,
    spO2: data.spO2,
    medicationTiming: data.medicationTiming,
    period: data.period,
    note: data.note || '',
  });
  return entry;
}

export async function getEntries(
  userId: Types.ObjectId,
  page: number,
  from?: string,
  to?: string
): Promise<{ entries: EntryWithZone[]; total: number }> {
  const user = await User.findById(userId);
  const filter: Record<string, unknown> = { userId };
  if (from || to) {
    const dateFilter: Record<string, Date> = {};
    if (from) dateFilter['$gte'] = new Date(from);
    if (to) dateFilter['$lte'] = new Date(to);
    filter['date'] = dateFilter;
  }

  const [rawEntries, total] = await Promise.all([
    Entry.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE),
    Entry.countDocuments(filter),
  ]);

  const entries = rawEntries.map((e) => enrichWithZone(e, user?.personalBest ?? null));
  return { entries, total };
}

export async function getEntriesForChart(
  userId: Types.ObjectId,
  from?: string,
  to?: string
): Promise<EntryWithZone[]> {
  const user = await User.findById(userId);
  const filter: Record<string, unknown> = { userId };
  if (from || to) {
    const dateFilter: Record<string, Date> = {};
    if (from) dateFilter['$gte'] = new Date(from);
    if (to) dateFilter['$lte'] = new Date(to);
    filter['date'] = dateFilter;
  }

  const rawEntries = await Entry.find(filter).sort({ date: 1 });
  return rawEntries.map((e) => enrichWithZone(e, user?.personalBest ?? null));
}

export async function adminGetEntries(
  page: number,
  userId?: string
): Promise<{ entries: IEntry[]; total: number }> {
  const filter: Record<string, unknown> = {};
  if (userId) filter['userId'] = new Types.ObjectId(userId);

  const [entries, total] = await Promise.all([
    Entry.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .populate('userId', 'firstName lastName nickname'),
    Entry.countDocuments(filter),
  ]);

  return { entries, total };
}

export async function adminUpdateEntry(
  adminId: string,
  entryId: string,
  data: Record<string, unknown>
): Promise<IEntry | null> {
  const entry = await Entry.findById(entryId);
  if (!entry) return null;

  const before = {
    date: entry.date,
    peakFlowReadings: entry.peakFlowReadings,
    spO2: entry.spO2,
    medicationTiming: entry.medicationTiming,
    period: entry.period,
    note: entry.note,
  };

  if (data['date']) data['date'] = new Date(data['date'] as string);
  Object.assign(entry, data);
  await entry.save();

  const after = {
    date: entry.date,
    peakFlowReadings: entry.peakFlowReadings,
    spO2: entry.spO2,
    medicationTiming: entry.medicationTiming,
    period: entry.period,
    note: entry.note,
  };

  await logAction(adminId, entry._id as Types.ObjectId, 'Entry', 'UPDATE', before, after);
  return entry;
}

export async function adminDeleteEntry(
  adminId: string,
  entryId: string
): Promise<boolean> {
  const entry = await Entry.findById(entryId);
  if (!entry) return false;

  const before = {
    date: entry.date,
    peakFlowReadings: entry.peakFlowReadings,
    spO2: entry.spO2,
    medicationTiming: entry.medicationTiming,
  };

  await Entry.deleteOne({ _id: entryId });
  await logAction(adminId, entry._id as Types.ObjectId, 'Entry', 'DELETE', before, null);
  return true;
}

export async function exportEntriesCsv(
  userId: Types.ObjectId,
  from?: string,
  to?: string
): Promise<string> {
  const filter: Record<string, unknown> = { userId };
  if (from || to) {
    const dateFilter: Record<string, Date> = {};
    if (from) dateFilter['$gte'] = new Date(from);
    if (to) dateFilter['$lte'] = new Date(to);
    filter['date'] = dateFilter;
  }

  const entries = await Entry.find(filter).sort({ date: -1 });

  const rows = entries.map((e) => ({
    date: e.date.toISOString(),
    reading1: e.peakFlowReadings[0],
    reading2: e.peakFlowReadings[1],
    reading3: e.peakFlowReadings[2],
    bestReading: getBestReading(e.peakFlowReadings),
    spO2: e.spO2,
    medicationTiming: e.medicationTiming,
    period: e.period,
    note: e.note,
  }));

  return stringify(rows, {
    header: true,
    columns: ['date', 'reading1', 'reading2', 'reading3', 'bestReading', 'spO2', 'medicationTiming', 'period', 'note'],
  });
}
