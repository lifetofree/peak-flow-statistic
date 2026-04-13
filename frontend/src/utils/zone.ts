/**
 * Peak flow zone calculation utilities.
 * 
 * ⚠️ CRITICAL: This logic MUST match backend zone calculation in worker/src/routes/zone.ts.
 * Update both files together.
 * 
 * Zone thresholds (standard clinical practice):
 * - Green:  80-100% of personal best → Well controlled
 * - Yellow: 50-79%  of personal best → Caution - adjust medication
 * - Red:    <50%    of personal best → Medical alert - seek help
 * 
 * Note: Zone data is returned by API but NOT currently displayed in UI.
 * ZoneBadge component exists but is not rendered.
 */
import type { Zone, ZoneResult } from '../types';

/**
 * Calculates peak flow zone based on reading vs personal best.
 * @param bestReading - Best (highest) peak flow reading in L/min
 * @param personalBest - User's personal best peak flow in L/min
 * @returns ZoneResult with zone and percentage
 * 
 * Edge cases:
 * - If personalBest is null, 0, or negative → returns { zone: 'red', percentage: 0 }
 */
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

/**
 * Returns best (maximum) reading from array.
 * @param readings - Array of peak flow values
 * @returns Maximum value
 */
export function getBestReading(readings: number[]): number {
  return Math.max(...readings);
}

/**
 * Zone color mapping for display.
 * Used by deprecated ZoneBadge component (not currently rendered).
 */
export const ZONE_COLORS: Record<Zone, string> = {
  green: '#22c55e',
  yellow: '#eab308',
  red: '#ef4444',
};
