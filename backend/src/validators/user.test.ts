import { createUserSchema, updateUserSchema } from './user';

describe('createUserSchema', () => {
  it('accepts valid input', () => {
    const result = createUserSchema.safeParse({
      firstName: 'สมชาย',
      lastName: 'ใจดี',
      nickname: 'ชาย',
      personalBest: 500,
    });
    expect(result.success).toBe(true);
  });

  it('accepts null personalBest', () => {
    const result = createUserSchema.safeParse({
      firstName: 'A',
      lastName: 'B',
      nickname: 'C',
      personalBest: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing firstName', () => {
    const result = createUserSchema.safeParse({
      lastName: 'B',
      nickname: 'C',
    });
    expect(result.success).toBe(false);
  });

  it('rejects personalBest below min', () => {
    const result = createUserSchema.safeParse({
      firstName: 'A',
      lastName: 'B',
      nickname: 'C',
      personalBest: 10,
    });
    expect(result.success).toBe(false);
  });

  it('rejects personalBest above max', () => {
    const result = createUserSchema.safeParse({
      firstName: 'A',
      lastName: 'B',
      nickname: 'C',
      personalBest: 1000,
    });
    expect(result.success).toBe(false);
  });
});

describe('updateUserSchema', () => {
  it('accepts partial update', () => {
    const result = updateUserSchema.safeParse({ nickname: 'new' });
    expect(result.success).toBe(true);
  });

  it('accepts empty object', () => {
    const result = updateUserSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
