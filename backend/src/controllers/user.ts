import { Request, Response } from 'express';
import * as userService from '../services/user';
import { PAGE_SIZE } from '../constants';

export async function listUsers(req: Request, res: Response): Promise<void> {
  try {
    const query = typeof req.query['q'] === 'string' ? req.query['q'] : '';
    const page = Math.max(1, parseInt(typeof req.query['page'] === 'string' ? req.query['page'] : '1', 10) || 1);

    const { users, total } = await userService.getUsers(query, page);
    res.json({ users, total, page, pageSize: PAGE_SIZE });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function createUser(req: Request, res: Response): Promise<void> {
  try {
    const user = await userService.createUser(req.adminId!, req.body);
    res.status(201).json(user);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function getUser(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const user = await userService.getUserById(id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const user = await userService.updateUser(req.adminId!, id, req.body);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const deleted = await userService.softDeleteUser(req.adminId!, id);
    if (!deleted) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function updateNote(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const user = await userService.updateAdminNote(req.adminId!, id, req.body.adminNote as string);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function rotateToken(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const user = await userService.rotateToken(req.adminId!, id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ shortToken: user.shortToken });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function resolveShortCode(req: Request, res: Response): Promise<void> {
  try {
    const code = req.params['code'] as string;
    const user = await userService.getUserByShortCode(code);
    if (!user) {
      res.status(404).json({ error: 'Short link not found' });
      return;
    }
    
    // Track click
    await userService.incrementClickCount(code);
    
    res.json({ shortToken: user.shortToken });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}
