import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { verifyToken } from '../utils/auth.js';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[env.COOKIE_NAME];

  if (!token) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
    return;
  }

  try {
    const payload = verifyToken(token);
    if (!payload?.sub) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired session token',
        },
      });
      return;
    }

    req.user = {
      id: payload.sub,
    };
    next();
  } catch (_error) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired session token',
      },
    });
  }
}

