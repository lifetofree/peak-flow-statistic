// ⚠️ IMPORTANT: Zone calculation logic MUST match backend/src/services/zone.ts exactly.
// Update both files together. Note: Backend returns zone data in API responses, but these
// utilities are retained for local type consistency and any direct calculations.
import type { Zone, ZoneResult } from '../types';

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

export function getBestReading(readings: number[]): number {
  return Math.max(...readings);
}

export const ZONE_COLORS: Record<Zone, string> = {
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
};
