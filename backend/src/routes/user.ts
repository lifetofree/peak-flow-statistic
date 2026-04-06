import { Router } from 'express';
import { validateShortLink } from '../middleware/validateShortLink';
import { validate } from '../middleware/validate';
import { generalRateLimiter } from '../middleware/rateLimiter';
import { createEntrySchema } from '../validators/entry';
import {
  getUserProfile,
  listEntries,
  createEntry,
  exportEntries,
} from '../controllers/entry';
const router = Router();

router.use('/u/:token', generalRateLimiter, validateShortLink);

router.get('/u/:token', getUserProfile);
router.get('/u/:token/entries', listEntries);
router.post('/u/:token/entries', validate(createEntrySchema), createEntry);
router.get('/u/:token/export', exportEntries);

export default router;
