import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const error = result.error as ZodError;
      res.status(400).json({
        error: error.errors.map((e) => e.message).join(', '),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
