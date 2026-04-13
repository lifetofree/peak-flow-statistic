import { describe, it, expect } from 'vitest';
import { calculateZone } from '../routes/zone';

describe('calculateZone', () => {
  it('returns green zone for >= 90% of personal best', () => {
    const result = calculateZone(450, 500);
    expect(result.zone).toBe('green');
    expect(result.percentage).toBe(90);
  });

  it('returns green zone for exactly 100%', () => {
    const result = calculateZone(500, 500);
    expect(result.zone).toBe('green');
    expect(result.percentage).toBe(100);
  });

  it('returns orange zone for >= 80% and < 90% of personal best', () => {
    const result = calculateZone(400, 500);
    expect(result.zone).toBe('orange');
    expect(result.percentage).toBe(80);
  });

  it('returns orange zone for 85%', () => {
    const result = calculateZone(425, 500);
    expect(result.zone).toBe('orange');
    expect(result.percentage).toBe(85);
  });

  it('returns yellow zone for >= 60% and < 80% of personal best', () => {
    const result = calculateZone(350, 500);
    expect(result.zone).toBe('yellow');
    expect(result.percentage).toBe(70);
  });

  it('returns yellow zone for exactly 60%', () => {
    const result = calculateZone(300, 500);
    expect(result.zone).toBe('yellow');
    expect(result.percentage).toBe(60);
  });

  it('returns red zone for < 60% of personal best', () => {
    const result = calculateZone(250, 500);
    expect(result.zone).toBe('red');
    expect(result.percentage).toBe(50);
  });

  it('returns red zone for 0% of personal best', () => {
    const result = calculateZone(0, 500);
    expect(result.zone).toBe('red');
    expect(result.percentage).toBe(0);
  });

  it('returns red zone with percentage 0 when personal best is 0', () => {
    const result = calculateZone(100, 0);
    expect(result.zone).toBe('red');
    expect(result.percentage).toBe(0);
  });

  it('rounds percentage', () => {
    const result = calculateZone(333, 500);
    expect(result.percentage).toBe(67);
  });
});
