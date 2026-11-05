import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { db } from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'orokin_void_key_secret_2026_warframe';
const COOKIE_NAME = 'tenno_token';

export interface AuthUser {
  id: number;
  username: string;
}

export async function initAuth() {
  const existing = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM users');
  if (!existing || existing.count === 0) {
    const defaultPassword = process.env.ADMIN_PASSWORD || 'tenno2026';
    const hash = bcrypt.hashSync(defaultPassword, 10);
    await db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', ['operator', hash]);
    console.log('[AUTH] Created default user: "operator" with initial password: "tenno2026"');
  }
}

export function generateToken(user: AuthUser): string {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: '7d',
  });
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(COOKIE_NAME);
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  let token = req.cookies?.[COOKIE_NAME];
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Access restricted. Authentication required.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    (req as any).user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired cipher session.' });
  }
}
