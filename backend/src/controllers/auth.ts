import { Request, Response } from 'express';
import * as authService from '../services/auth';

export async function loginController(req: Request, res: Response): Promise<void> {
  try {
    const token = await authService.login(req.body.password as string);
    if (!token) {
      res.status(401).json({ error: 'Invalid password' });
      return;
    }
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}
