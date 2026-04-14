import { describe, it, expect } from 'vitest';
import { formatThaiDate, formatThaiDateTime, toISODateString, getDaysAgoDate } from '../utils/date';

describe('formatThaiDate', () => {
  it('formats ISO date to dd/mm/yyyy', () => {
    const result = formatThaiDate('2026-04-12');
    expect(result).toBe('12/04/2026');
  });

  it('formats date with time component', () => {
    const result = formatThaiDate('2026-04-12T08:30:00.000Z');
    expect(result).toMatch(/^\d{2}\/04\/2026$/);
  });

  it('handles Jan 1 boundary', () => {
    const result = formatThaiDate('2026-01-01');
    expect(result).toBe('01/01/2026');
  });

  it('handles Dec 31', () => {
    const result = formatThaiDate('2026-12-31');
    expect(result).toBe('31/12/2026');
  });

  it('preserves year from ISO', () => {
    const result = formatThaiDate('2000-06-15');
    expect(result).toBe('15/06/2000');
  });
});

describe('formatThaiDateTime', () => {
  it('includes time in output', () => {
    const result = formatThaiDateTime('2026-04-12T14:30:00');
    expect(result).toContain('14:30');
    expect(result).toContain('12/04/2026');
  });
});

describe('toISODateString', () => {
  it('converts Date to YYYY-MM-DD', () => {
    const date = new Date(2026, 3, 12);
    const result = toISODateString(date);
    expect(result).toBe('2026-04-12');
  });

  it('pads month and day', () => {
    const date = new Date(2026, 0, 5);
    const result = toISODateString(date);
    expect(result).toBe('2026-01-05');
  });
});

describe('getDaysAgoDate', () => {
  it('returns a date N days ago', () => {
    const result = getDaysAgoDate(7);
    const now = new Date();
    expect(result.getTime()).toBeLessThan(now.getTime());
    const diffMs = now.getTime() - result.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    expect(diffDays).toBeGreaterThanOrEqual(6);
    expect(diffDays).toBeLessThanOrEqual(8);
  });

  it('sets hours to zero', () => {
    const result = getDaysAgoDate(0);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
  });
});
