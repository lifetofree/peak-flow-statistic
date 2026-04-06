import { Router } from 'express';
import { getUserByShortCode, incrementClickCount } from '../services/user';
import { generalRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/:code', generalRateLimiter, async (req, res) => {
  try {
    const code = req.params['code'] as string;
    const user = await getUserByShortCode(code);

    if (!user) {
      const base = process.env.FRONTEND_BASE_URL || 'http://localhost';
      res.redirect(302, `${base}/`);
      return;
    }

    await incrementClickCount(code);

    const base = process.env.FRONTEND_BASE_URL || 'http://localhost';
    res.redirect(302, `${base}/u/${user.shortToken}`);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
