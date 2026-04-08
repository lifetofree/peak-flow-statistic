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

export function getBestReading(readings: number[]): number {
  return Math.max(...readings);
}
