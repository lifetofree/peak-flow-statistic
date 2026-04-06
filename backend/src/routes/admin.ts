import { Router } from 'express';
import { requireAdmin } from '../middleware/requireAdmin';
import { validate } from '../middleware/validate';
import { loginRateLimiter } from '../middleware/rateLimiter';
import { loginSchema } from '../validators/auth';
import { createUserSchema, updateUserSchema, updateNoteSchema } from '../validators/user';
import { updateEntrySchema } from '../validators/entry';
import { loginController } from '../controllers/auth';
import {
  listUsers,
  createUser,
  getUser,
  updateUser,
  deleteUser,
  updateNote,
  rotateToken,
} from '../controllers/user';
import {
  adminListEntries,
  adminUpdateEntry,
  adminDeleteEntry,
  adminExportUser,
} from '../controllers/entry';
import { listAuditLogs } from '../controllers/audit';

const router = Router();

// Auth
router.post('/admin/login', loginRateLimiter, validate(loginSchema), loginController);

// User management (all require admin auth)
router.get('/admin/users', requireAdmin, listUsers);
router.post('/admin/users', requireAdmin, validate(createUserSchema), createUser);
router.get('/admin/users/:id', requireAdmin, getUser);
router.patch('/admin/users/:id', requireAdmin, validate(updateUserSchema), updateUser);
router.delete('/admin/users/:id', requireAdmin, deleteUser);
router.patch('/admin/users/:id/note', requireAdmin, validate(updateNoteSchema), updateNote);
router.post('/admin/users/:id/rotate-token', requireAdmin, rotateToken);
router.get('/admin/users/:id/export', requireAdmin, adminExportUser);

// Entry management (all require admin auth)
router.get('/admin/entries', requireAdmin, adminListEntries);
router.patch('/admin/entries/:id', requireAdmin, validate(updateEntrySchema), adminUpdateEntry);
router.delete('/admin/entries/:id', requireAdmin, adminDeleteEntry);

// Audit log
router.get('/admin/audit', requireAdmin, listAuditLogs);

export default router;
