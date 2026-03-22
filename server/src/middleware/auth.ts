import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import database from '../db/connection.js';

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Exiting.');
  process.exit(1);
}
const JWT_SECRET: string = process.env.JWT_SECRET;

export interface AuthPayload {
  userId: number;
  email: string;
  firstName: string;
  tokenVersion: number;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.cookies?.token;
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;

    // Verify token version matches DB (invalidates sessions after password reset)
    const user = database.prepare('SELECT token_version FROM users WHERE id = ?').get(payload.userId) as
      | { token_version: number }
      | undefined;

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Allow tokens without tokenVersion (pre-migration) but reject mismatched versions
    if (payload.tokenVersion !== undefined && payload.tokenVersion !== user.token_version) {
      res.status(401).json({ error: 'Session expired. Please sign in again.' });
      return;
    }

    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function setTokenCookie(res: Response, token: string): void {
  res.cookie('token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
}
