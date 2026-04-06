import { Request, Response } from 'express';
import * as entryService from '../services/entry';
import { getUserByToken } from '../services/user';
import { PAGE_SIZE } from '../constants';

export async function getUserProfile(req: Request, res: Response): Promise<void> {
  try {
    const user = await getUserByToken(req.userToken!);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      nickname: user.nickname,
      personalBest: user.personalBest,
    });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function listEntries(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(typeof req.query['page'] === 'string' ? req.query['page'] : '1', 10) || 1);
    const from = typeof req.query['from'] === 'string' ? req.query['from'] : undefined;
    const to = typeof req.query['to'] === 'string' ? req.query['to'] : undefined;

    const { entries, total } = await entryService.getEntries(req.userId!, page, from, to);
    res.json({ entries, total, page, pageSize: PAGE_SIZE });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function createEntry(req: Request, res: Response): Promise<void> {
  try {
    const entry = await entryService.createEntry(req.userId!, req.body);
    res.status(201).json(entry);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function exportEntries(req: Request, res: Response): Promise<void> {
  try {
    const from = typeof req.query['from'] === 'string' ? req.query['from'] : undefined;
    const to = typeof req.query['to'] === 'string' ? req.query['to'] : undefined;

    const csv = await entryService.exportEntriesCsv(req.userId!, from, to);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="entries.csv"');
    res.send(csv);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function adminListEntries(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(typeof req.query['page'] === 'string' ? req.query['page'] : '1', 10) || 1);
    const userId = typeof req.query['userId'] === 'string' ? req.query['userId'] : undefined;

    const { entries, total } = await entryService.adminGetEntries(page, userId);
    res.json({ entries, total, page, pageSize: PAGE_SIZE });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function adminUpdateEntry(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const entry = await entryService.adminUpdateEntry(req.adminId!, id, req.body);
    if (!entry) {
      res.status(404).json({ error: 'Entry not found' });
      return;
    }
    res.json(entry);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function adminDeleteEntry(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const deleted = await entryService.adminDeleteEntry(req.adminId!, id);
    if (!deleted) {
      res.status(404).json({ error: 'Entry not found' });
      return;
    }
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}

export async function adminExportUser(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const { Types } = await import('mongoose');
    const from = typeof req.query['from'] === 'string' ? req.query['from'] : undefined;
    const to = typeof req.query['to'] === 'string' ? req.query['to'] : undefined;

    const csv = await entryService.exportEntriesCsv(new Types.ObjectId(id), from, to);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="entries.csv"');
    res.send(csv);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}
