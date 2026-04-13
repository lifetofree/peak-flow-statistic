import { describe, it, expect } from 'vitest';

type Zone = 'green' | 'orange' | 'yellow' | 'red';

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
  if (percentage >= 90) {
    zone = 'green';
  } else if (percentage >= 80) {
    zone = 'orange';
  } else if (percentage >= 60) {
    zone = 'yellow';
  } else {
    zone = 'red';
  }
  return { zone, percentage };
}

describe('zone calculation', () => {
  it('green zone: >= 90% of personal best', () => {
    expect(calculateZone(450, 500).zone).toBe('green');
    expect(calculateZone(500, 500).zone).toBe('green');
    expect(calculateZone(460, 500).zone).toBe('green');
  });

  it('orange zone: >= 80% and < 90% of personal best', () => {
    expect(calculateZone(400, 500).zone).toBe('orange');
    expect(calculateZone(425, 500).zone).toBe('orange');
    expect(calculateZone(440, 500).zone).toBe('orange');
  });

  it('yellow zone: >= 60% and < 80% of personal best', () => {
    expect(calculateZone(350, 500).zone).toBe('yellow');
    expect(calculateZone(300, 500).zone).toBe('yellow');
    expect(calculateZone(394, 500).zone).toBe('yellow');
  });

  it('red zone: < 60% of personal best', () => {
    expect(calculateZone(250, 500).zone).toBe('red');
    expect(calculateZone(200, 500).zone).toBe('red');
    expect(calculateZone(0, 500).zone).toBe('red');
  });

  it('returns red when personal best is 0', () => {
    const result = calculateZone(100, 0);
    expect(result.zone).toBe('red');
    expect(result.percentage).toBe(0);
  });

  it('calculates correct percentage', () => {
    expect(calculateZone(450, 500).percentage).toBe(90);
    expect(calculateZone(300, 500).percentage).toBe(60);
    expect(calculateZone(100, 500).percentage).toBe(20);
  });

  it('rounds percentage', () => {
    expect(calculateZone(333, 500).percentage).toBe(67);
  });
});
