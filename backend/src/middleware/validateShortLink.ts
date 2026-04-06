import { Request, Response, NextFunction } from 'express';
import { getUserByToken, getFirstActiveUser } from '../services/user';
import { Types } from 'mongoose';

declare global {
  namespace Express {
    interface Request {
      userId?: Types.ObjectId;
      userToken?: string;
    }
  }
}

export async function validateShortLink(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.params['token'] as string | undefined;

    if (token) {
      const user = await getUserByToken(token);
      if (user) {
        req.userId = user._id as Types.ObjectId;
        req.userToken = token;
        return next();
      }
    }

    const defaultUser = await getFirstActiveUser();
    if (defaultUser) {
      req.userId = defaultUser._id as Types.ObjectId;
      req.userToken = defaultUser.shortToken;
      return next();
    }

    res.status(404).json({ error: 'No users found. Please create a user via admin panel.' });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
}
