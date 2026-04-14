import { parsePeakFlowReadings } from '../lib/peakFlow';
import type { UserRecord } from '../routes/admin/types';

export interface EntryRecord {
  id: string;
  user_id: string;
  date: string;
  peak_flow_readings: string;
  peak_flow: number;
  spo2: number;
  medication_timing: string;
  period: string;
  note: string;
  created_at: string;
  updated_at: string;
}

export function generateCsvHeader(): string {
  return 'Date,Period,Best Peak Flow,SpO2,Medication,Note\n';
}

export function generateCsvEntry(entry: EntryRecord): string {
  const { best: bestReading } = parsePeakFlowReadings(entry.peak_flow_readings, entry.peak_flow);
  const note = (entry.note || '').replace(/"/g, '""');
  return `"${entry.date}","${entry.period || 'morning'}","${bestReading}","${entry.spo2 || ''}","${entry.medication_timing || ''}","${note}"\n`;
}

export function generateCsv(entries: EntryRecord[]): string {
  let csv = generateCsvHeader();
  for (const entry of entries) {
    csv += generateCsvEntry(entry);
  }
  return csv;
}

export function getSafeFileName(firstName: string, lastName: string): string {
  return `${firstName}-${lastName}`.replace(/[^a-zA-Z0-9-]/g, '_');
}
