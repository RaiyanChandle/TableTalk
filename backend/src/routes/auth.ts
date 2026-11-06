import bcrypt from 'bcryptjs';
import { Request, Response, Router } from 'express';
import { env } from '../config/env.js';
import { authRateLimiter } from '../middleware/rateLimit.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { User } from '../models/User.js';
import { loginSchema, registerSchema } from '../schemas/index.js';
import { clearSessionCookie, setSessionCookie, signToken } from '../utils/auth.js';

const router = Router();

// POST /api/auth/register
router.post('/register', authRateLimiter, async (req: Request, res: Response): Promise<void> => {
  const parseResult = registerSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid registration input',
        detail: parseResult.error.flatten(),
      },
    });
    return;
  }

  const { email, password } = parseResult.data;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(409).json({
      error: {
        code: 'CONFLICT',
        message: 'Email already registered',
      },
    });
    return;
  }

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_COST);
  const user = await User.create({
    email,
    passwordHash,
  });

  const token = signToken(user._id.toString());
  setSessionCookie(res, token);

  res.status(201).json({
    user: {
      id: user._id.toString(),
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

// POST /api/auth/login
router.post('/login', authRateLimiter, async (req: Request, res: Response): Promise<void> => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid email or password',
      },
    });
    return;
  }

  const { email, password } = parseResult.data;

  const user = await User.findOne({ email });
  if (!user) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password',
      },
    });
    return;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password',
      },
    });
    return;
  }

  const token = signToken(user._id.toString());
  setSessionCookie(res, token);

  res.status(200).json({
    user: {
      id: user._id.toString(),
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response): void => {
  clearSessionCookie(res);
  res.status(200).json({
    message: 'Logged out successfully',
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = await User.findById(req.user?.id);
  if (!user) {
    clearSessionCookie(res);
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'User session not found',
      },
    });
    return;
  }

  res.status(200).json({
    user: {
      id: user._id.toString(),
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

export default router;

