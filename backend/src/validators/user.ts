import { z } from 'zod';
import { PERSONAL_BEST_MIN, PERSONAL_BEST_MAX } from './common';

export const createUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  nickname: z.string().min(1, 'Nickname is required'),
  personalBest: z
    .number()
    .int()
    .min(PERSONAL_BEST_MIN)
    .max(PERSONAL_BEST_MAX)
    .nullable()
    .optional(),
  adminNote: z.string().optional(),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  nickname: z.string().min(1).optional(),
  shortCode: z.string().min(3).max(20).optional(),
  personalBest: z
    .number()
    .int()
    .min(PERSONAL_BEST_MIN)
    .max(PERSONAL_BEST_MAX)
    .nullable()
    .optional(),
});

export const updateNoteSchema = z.object({
  adminNote: z.string(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
