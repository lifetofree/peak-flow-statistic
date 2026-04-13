/**
 * Peak flow utility functions.
 * 
 * Shared functions for parsing peak flow readings from database format.
 */

export interface PeakFlowReadings {
  readings: number[];
  best: number;
}

/**
 * Parses peak flow readings from JSON string or fallback value.
 * @param readingsStr - JSON string of readings array, or null
 * @param fallback - Fallback value if parsing fails
 * @returns PeakFlowReadings object with readings array and best reading
 */
export function parsePeakFlowReadings(readingsStr: string | null, fallback: number): PeakFlowReadings {
  let readings: number[];
  try {
    const parsed = JSON.parse(readingsStr || '[]');
    readings = Array.isArray(parsed) ? parsed : [fallback];
  } catch {
    readings = [fallback];
  }
  const best = readings.length > 0 ? Math.max(...readings) : fallback;
  return { readings, best };
}

/**
 * Gets the best (maximum) reading from an array.
 */
export function getBestReading(readings: number[]): number {
  return readings.length > 0 ? Math.max(...readings) : 0;
}