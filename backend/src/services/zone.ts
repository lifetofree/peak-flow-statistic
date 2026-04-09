// ⚠️ IMPORTANT: Zone calculation logic MUST match frontend/src/utils/zone.ts exactly.
// Update both files together. Backend returns zone data in API responses, but frontend
// also has these utilities for local calculations and type consistency.
export type Zone = 'green' | 'yellow' | 'red';

export interface ZoneResult {
  zone: Zone;
  percentage: number;
}

export function calculateZone(bestReading: number, personalBest: number): ZoneResult {
  if (!personalBest || personalBest <= 0) {
    return { zone: 'red', percentage: 0 };
  }

  const percentage = Math.round((bestReading / personalBest) * 100);

  let zone: Zone;
  if (percentage >= 80) {
    zone = 'green';
  } else if (percentage >= 50) {
    zone = 'yellow';
  } else {
    zone = 'red';
  }

  return { zone, percentage };
}

export function getBestReading(readings: number[]): number | null {
  if (readings.length === 0) return null;
  return Math.max(...readings);
}
