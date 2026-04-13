/**
 * Entry grouping utilities for list view display.
 * 
 * Groups entries by date, then by period (morning/evening) and
 * medication timing (before/after), creating a 4-slot grid per day:
 * 
 * [morning-before] [morning-after]
 * [evening-before] [evening-after]
 * 
 * Used by both UserDashboard (list view) and AdminUserDetail.
 * Entry list view uses 80 entries per page (20 days × 4 slots).
 */
export interface Entry {
  _id: string;
  userId?: string;
  date: string;
  period: 'morning' | 'evening';
  medicationTiming: 'before' | 'after';
  createdAt: string;
  updatedAt?: string;
  peakFlowReadings?: number[];
  spO2?: number;
  note?: string;
}

export interface ZoneInfo {
  zone: 'green' | 'orange' | 'yellow' | 'red';
  percentage: number;
}

export interface EntryWithZone extends Entry {
  zone?: ZoneInfo;
}

export interface GroupedEntries {
  [date: string]: {
    'morning-before': Entry | null;
    'morning-after': Entry | null;
    'evening-before': Entry | null;
    'evening-after': Entry | null;
  };
}

export interface GroupedEntriesWithZone {
  [date: string]: {
    'morning-before': EntryWithZone | null;
    'morning-after': EntryWithZone | null;
    'evening-before': EntryWithZone | null;
    'evening-after': EntryWithZone | null;
  };
}

/**
 * Groups entries by date, then by period-medication combination.
 * If multiple entries exist for the same slot, only the most recent (by createdAt) is kept.
 * @param entries - Flat array of entry objects
 * @returns Nested object keyed by ISO date, each containing 4 slots
 */
export function groupEntriesByDate(entries: Entry[]): GroupedEntries {
  const grouped: GroupedEntries = {};
  
  entries.forEach((entry) => {
    if (!entry.date) return;
    const dateKey = entry.date.split('T')[0];
    const subKey = `${entry.period}-${entry.medicationTiming}`;
    
    if (!grouped[dateKey]) {
      grouped[dateKey] = {
        'morning-before': null,
        'morning-after': null,
        'evening-before': null,
        'evening-after': null,
      };
    }
    
    if (!grouped[dateKey][subKey] || 
        new Date(entry.createdAt) > new Date(grouped[dateKey][subKey]?.createdAt || 0)) {
      grouped[dateKey][subKey] = entry;
    }
  });
  
  return grouped;
}

/**
 * Groups entries with zone info by date, then by period-medication combination.
 * If multiple entries exist for the same slot, only the most recent (by createdAt) is kept.
 * @param entries - Flat array of entry objects with zone info
 * @returns Nested object keyed by ISO date, each containing 4 slots with zone info
 */
export function groupEntriesByDateWithZone(entries: EntryWithZone[]): GroupedEntriesWithZone {
  const grouped: GroupedEntriesWithZone = {};
  
  entries.forEach((entry) => {
    if (!entry.date) return;
    const dateKey = entry.date.split('T')[0];
    const subKey = `${entry.period}-${entry.medicationTiming}`;
    
    if (!grouped[dateKey]) {
      grouped[dateKey] = {
        'morning-before': null,
        'morning-after': null,
        'evening-before': null,
        'evening-after': null,
      };
    }
    
    if (!grouped[dateKey][subKey] || 
        new Date(entry.createdAt) > new Date(grouped[dateKey][subKey]?.createdAt || 0)) {
      grouped[dateKey][subKey] = entry;
    }
  });
  
  return grouped;
}

/**
 * Converts grouped object format to array format grouped by date.
 * @param grouped - Output of groupEntriesByDate()
 * @returns Object keyed by date, each containing array of non-null entries
 */
export function convertGroupedToArray(grouped: GroupedEntries): Record<string, Entry[]> {
  const entriesByDate: Record<string, Entry[]> = {};
  
  Object.keys(grouped).forEach((date) => {
    entriesByDate[date] = [
      grouped[date]['morning-before'],
      grouped[date]['morning-after'],
      grouped[date]['evening-before'],
      grouped[date]['evening-after'],
    ].filter(Boolean) as Entry[];
  });
  
  return entriesByDate;
}

/**
 * Converts grouped object format with zone to array format grouped by date.
 * @param grouped - Output of groupEntriesByDateWithZone()
 * @returns Object keyed by date, each containing array of non-null entries with zone
 */
export function convertGroupedToArrayWithZone(grouped: GroupedEntriesWithZone): Record<string, EntryWithZone[]> {
  const entriesByDate: Record<string, EntryWithZone[]> = {};
  
  Object.keys(grouped).forEach((date) => {
    entriesByDate[date] = [
      grouped[date]['morning-before'],
      grouped[date]['morning-after'],
      grouped[date]['evening-before'],
      grouped[date]['evening-after'],
    ].filter(Boolean) as EntryWithZone[];
  });
  
  return entriesByDate;
}

/**
 * Returns sorted date keys in descending order (most recent first).
 * @param entriesByDate - Output of convertGroupedToArray()
 * @returns Array of ISO date strings, sorted newest to oldest
 */
export function getSortedDates(entriesByDate: Record<string, Entry[]>): string[] {
  return Object.keys(entriesByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
}
