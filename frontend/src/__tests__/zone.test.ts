import { describe, it, expect } from 'vitest';

type Zone = 'green' | 'yellow' | 'red';

interface ZoneResult {
  zone: Zone;
  percentage: number;
}

function calculateZone(bestReading: number, personalBest: number): ZoneResult {
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

describe('zone calculation', () => {
  it('green zone: 80-100% of personal best', () => {
    expect(calculateZone(400, 500).zone).toBe('green');
    expect(calculateZone(500, 500).zone).toBe('green');
    expect(calculateZone(450, 500).zone).toBe('green');
  });

  it('yellow zone: 50-79% of personal best', () => {
    expect(calculateZone(350, 500).zone).toBe('yellow');
    expect(calculateZone(250, 500).zone).toBe('yellow');
    expect(calculateZone(394, 500).zone).toBe('yellow');
  });

  it('red zone: <50% of personal best', () => {
    expect(calculateZone(200, 500).zone).toBe('red');
    expect(calculateZone(0, 500).zone).toBe('red');
    expect(calculateZone(244, 500).zone).toBe('red');
  });

  it('returns red when personal best is 0', () => {
    const result = calculateZone(100, 0);
    expect(result.zone).toBe('red');
    expect(result.percentage).toBe(0);
  });

  it('calculates correct percentage', () => {
    expect(calculateZone(400, 500).percentage).toBe(80);
    expect(calculateZone(250, 500).percentage).toBe(50);
    expect(calculateZone(100, 500).percentage).toBe(20);
  });

  it('rounds percentage', () => {
    expect(calculateZone(333, 500).percentage).toBe(67);
  });
});
