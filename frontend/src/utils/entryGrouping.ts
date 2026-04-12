export interface Entry {
  _id: string;
  date: string;
  period: 'morning' | 'evening';
  medicationTiming: 'before' | 'after';
  createdAt: string;
  peakFlowReadings?: number[];
  spO2?: number;
  note?: string;
}

export interface GroupedEntries {
  [date: string]: {
    'morning-before': Entry | null;
    'morning-after': Entry | null;
    'evening-before': Entry | null;
    'evening-after': Entry | null;
  };
}

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

export function getSortedDates(entriesByDate: Record<string, Entry[]>): string[] {
  return Object.keys(entriesByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
}
