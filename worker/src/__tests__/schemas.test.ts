import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const createUserSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  nickname: z.string().min(1),
  personalBest: z.number().int().min(50).max(900).nullable().optional(),
  adminNote: z.string().optional(),
});

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  nickname: z.string().min(1).optional(),
  personalBest: z.number().int().min(50).max(900).nullable().optional(),
});

const adminNoteSchema = z.object({
  adminNote: z.string().max(5000),
});

const createEntrySchema = z.object({
  date: z.string(),
  peakFlowReadings: z.tuple([z.number(), z.number(), z.number()]),
  spO2: z.number().int().min(70).max(100),
  medicationTiming: z.enum(['before', 'after']),
  period: z.enum(['morning', 'evening']),
  note: z.string().optional(),
});

const updateEntrySchema = z.object({
  date: z.string().optional(),
  peakFlowReadings: z.tuple([z.number(), z.number(), z.number()]).optional(),
  spO2: z.number().int().min(70).max(100).optional(),
  medicationTiming: z.enum(['before', 'after']).optional(),
  period: z.enum(['morning', 'evening']).optional(),
  note: z.string().optional(),
});

describe('Zod Schemas', () => {
  describe('createUserSchema', () => {
    it('accepts valid user data', () => {
      const result = createUserSchema.safeParse({
        firstName: 'John',
        lastName: 'Smith',
        nickname: 'Johnny',
      });
      expect(result.success).toBe(true);
    });

    it('accepts user with personalBest', () => {
      const result = createUserSchema.safeParse({
        firstName: 'John',
        lastName: 'Smith',
        nickname: 'Johnny',
        personalBest: 500,
      });
      expect(result.success).toBe(true);
    });

    it('rejects personalBest below 50', () => {
      const result = createUserSchema.safeParse({
        firstName: 'John',
        lastName: 'Smith',
        nickname: 'Johnny',
        personalBest: 49,
      });
      expect(result.success).toBe(false);
    });

    it('rejects personalBest above 900', () => {
      const result = createUserSchema.safeParse({
        firstName: 'John',
        lastName: 'Smith',
        nickname: 'Johnny',
        personalBest: 901,
      });
      expect(result.success).toBe(false);
    });

    it('accepts null personalBest', () => {
      const result = createUserSchema.safeParse({
        firstName: 'John',
        lastName: 'Smith',
        nickname: 'Johnny',
        personalBest: null,
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing firstName', () => {
      const result = createUserSchema.safeParse({
        lastName: 'Smith',
        nickname: 'Johnny',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('adminNoteSchema', () => {
    it('accepts valid note', () => {
      const result = adminNoteSchema.safeParse({ adminNote: 'Some note' });
      expect(result.success).toBe(true);
    });

    it('rejects note exceeding 5000 chars', () => {
      const result = adminNoteSchema.safeParse({ adminNote: 'x'.repeat(5001) });
      expect(result.success).toBe(false);
    });

    it('accepts empty note', () => {
      const result = adminNoteSchema.safeParse({ adminNote: '' });
      expect(result.success).toBe(true);
    });
  });

  describe('createEntrySchema', () => {
    it('accepts valid entry', () => {
      const result = createEntrySchema.safeParse({
        date: '2026-04-12',
        peakFlowReadings: [400, 420, 430],
        spO2: 97,
        medicationTiming: 'before',
        period: 'morning',
      });
      expect(result.success).toBe(true);
    });

    it('rejects spO2 below 70', () => {
      const result = createEntrySchema.safeParse({
        date: '2026-04-12',
        peakFlowReadings: [400, 420, 430],
        spO2: 69,
        medicationTiming: 'before',
        period: 'morning',
      });
      expect(result.success).toBe(false);
    });

    it('rejects spO2 above 100', () => {
      const result = createEntrySchema.safeParse({
        date: '2026-04-12',
        peakFlowReadings: [400, 420, 430],
        spO2: 101,
        medicationTiming: 'before',
        period: 'morning',
      });
      expect(result.success).toBe(false);
    });

    it('requires exactly 3 readings', () => {
      const result = createEntrySchema.safeParse({
        date: '2026-04-12',
        peakFlowReadings: [400, 420],
        spO2: 97,
        medicationTiming: 'before',
        period: 'morning',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid period', () => {
      const result = createEntrySchema.safeParse({
        date: '2026-04-12',
        peakFlowReadings: [400, 420, 430],
        spO2: 97,
        medicationTiming: 'before',
        period: 'noon',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid medicationTiming', () => {
      const result = createEntrySchema.safeParse({
        date: '2026-04-12',
        peakFlowReadings: [400, 420, 430],
        spO2: 97,
        medicationTiming: 'during',
        period: 'morning',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateEntrySchema', () => {
    it('accepts partial update', () => {
      const result = updateEntrySchema.safeParse({ spO2: 95 });
      expect(result.success).toBe(true);
    });

    it('accepts empty update', () => {
      const result = updateEntrySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('rejects invalid spO2 in update', () => {
      const result = updateEntrySchema.safeParse({ spO2: 50 });
      expect(result.success).toBe(false);
    });
  });
});
