import { describe, it, expect } from 'vitest';
import type { CreateEntryInput, Entry, EntryWithZone, User, AuditLog } from '../types';

describe('TypeScript types', () => {
  describe('User', () => {
    it('has all required fields', () => {
      const user: User = {
        _id: 'u001',
        firstName: 'John',
        lastName: 'Smith',
        nickname: 'Johnny',
        shortToken: 'tok-001',
        shortCode: 'a1b2c3d4',
        clickCount: 5,
        personalBest: 500,
        adminNote: '',
        deletedAt: null,
        createdAt: '2026-04-01T00:00:00Z',
        updatedAt: '2026-04-01T00:00:00Z',
      };
      expect(user._id).toBe('u001');
      expect(user.personalBest).toBe(500);
    });

    it('allows null personalBest', () => {
      const user: User = {
        _id: 'u001',
        firstName: 'John',
        lastName: 'Smith',
        nickname: 'Johnny',
        shortToken: 'tok-001',
        shortCode: 'a1b2c3d4',
        clickCount: 0,
        personalBest: null,
        adminNote: '',
        deletedAt: null,
        createdAt: '2026-04-01T00:00:00Z',
        updatedAt: '2026-04-01T00:00:00Z',
      };
      expect(user.personalBest).toBeNull();
    });
  });

  describe('Entry', () => {
    it('has all required fields', () => {
      const entry: Entry = {
        _id: 'e001',
        userId: 'u001',
        date: '2026-04-12',
        peakFlowReadings: [400, 420, 430],
        spO2: 97,
        medicationTiming: 'before',
        period: 'morning',
        note: '',
        createdAt: '2026-04-12T08:00:00Z',
        updatedAt: '2026-04-12T08:00:00Z',
      };
      expect(entry.peakFlowReadings).toHaveLength(3);
    });
  });

  describe('CreateEntryInput', () => {
    it('includes period field', () => {
      const input: CreateEntryInput = {
        date: '2026-04-12',
        peakFlowReadings: [400, 420, 430],
        spO2: 97,
        medicationTiming: 'before',
        period: 'morning',
      };
      expect(input.period).toBe('morning');
    });

    it('includes optional note', () => {
      const input: CreateEntryInput = {
        date: '2026-04-12',
        peakFlowReadings: [400, 420, 430],
        spO2: 97,
        medicationTiming: 'after',
        period: 'evening',
        note: 'Feeling better',
      };
      expect(input.note).toBe('Feeling better');
    });
  });

  describe('EntryWithZone', () => {
    it('wraps entry with zone data', () => {
      const item: EntryWithZone = {
        entry: {
          _id: 'e001',
          userId: 'u001',
          date: '2026-04-12',
          peakFlowReadings: [400, 420, 430],
          spO2: 97,
          medicationTiming: 'before',
          period: 'morning',
          note: '',
          createdAt: '2026-04-12T08:00:00Z',
          updatedAt: '2026-04-12T08:00:00Z',
        },
        zone: { zone: 'green', percentage: 86 },
      };
      expect(item.zone?.zone).toBe('green');
    });

    it('allows null zone', () => {
      const item: EntryWithZone = {
        entry: {
          _id: 'e001',
          userId: 'u001',
          date: '2026-04-12',
          peakFlowReadings: [400, 420, 430],
          spO2: 97,
          medicationTiming: 'before',
          period: 'morning',
          note: '',
          createdAt: '2026-04-12T08:00:00Z',
          updatedAt: '2026-04-12T08:00:00Z',
        },
        zone: null,
      };
      expect(item.zone).toBeNull();
    });
  });

  describe('AuditLog', () => {
    it('has structured diff', () => {
      const log: AuditLog = {
        _id: 'al001',
        adminId: 'admin',
        targetId: 'e001',
        targetModel: 'Entry',
        action: 'UPDATE',
        diff: {
          before: { spO2: 95 },
          after: { spO2: 97 },
        },
        timestamp: '2026-04-12T10:00:00Z',
      };
      expect(log.action).toBe('UPDATE');
      expect(log.diff.before).toBeDefined();
    });
  });
});
