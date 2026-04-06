import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      adminId?: string;
    }
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  req.adminId = 'admin';
  next();
}
