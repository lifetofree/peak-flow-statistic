import { z } from 'zod';
import { PEAK_FLOW_MIN, PEAK_FLOW_MAX, SPO2_MIN, SPO2_MAX } from './common';

const peakFlowReading = z.number().int().min(PEAK_FLOW_MIN).max(PEAK_FLOW_MAX);

export const createEntrySchema = z.object({
  date: z.string().refine((val) => {
    const d = new Date(val);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    return d <= now;
  }, { message: 'Invalid date or date is in the future' }),
  peakFlowReadings: z.tuple([peakFlowReading, peakFlowReading, peakFlowReading]),
  spO2: z.number().int().min(SPO2_MIN).max(SPO2_MAX),
  medicationTiming: z.enum(['before', 'after']),
  period: z.enum(['morning', 'evening']),
  note: z.string().optional().default(''),
});

export const updateEntrySchema = z.object({
  date: z.string().refine((val) => {
    const d = new Date(val);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    return d <= now;
  }, { message: 'Invalid date or date is in the future' }).optional(),
  peakFlowReadings: z.tuple([peakFlowReading, peakFlowReading, peakFlowReading]).optional(),
  spO2: z.number().int().min(SPO2_MIN).max(SPO2_MAX).optional(),
  medicationTiming: z.enum(['before', 'after']).optional(),
  period: z.enum(['morning', 'evening']).optional().default('morning'),
  note: z.string().optional(),
});

export const entryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export type CreateEntryInput = z.infer<typeof createEntrySchema>;
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>;
