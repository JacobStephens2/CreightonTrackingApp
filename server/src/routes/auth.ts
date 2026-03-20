import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import db from '../db/connection.js';
import { AuthRequest, requireAuth, signToken, setTokenCookie } from '../middleware/auth.js';

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/register', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, firstName } = req.body;

    if (!firstName || !firstName.trim()) {
      res.status(400).json({ error: 'First name is required' });
      return;
    }
    if (!email || !EMAIL_RE.test(email)) {
      res.status(400).json({ error: 'Valid email is required' });
      return;
    }
    if (!password || password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists' });
      return;
    }

    const trimmedName = firstName.trim();
    const hash = await bcrypt.hash(password, 12);
    const result = db.prepare('INSERT INTO users (email, first_name, password_hash) VALUES (?, ?, ?)').run(email.toLowerCase(), trimmedName, hash);

    const token = signToken({ userId: result.lastInsertRowid as number, email: email.toLowerCase(), firstName: trimmedName });
    setTokenCookie(res, token);
    res.status(201).json({ id: result.lastInsertRowid, email: email.toLowerCase(), firstName: trimmedName });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = db.prepare('SELECT id, email, first_name, password_hash FROM users WHERE email = ?').get(email.toLowerCase()) as
      | { id: number; email: string; first_name: string; password_hash: string }
      | undefined;

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = signToken({ userId: user.id, email: user.email, firstName: user.first_name });
    setTokenCookie(res, token);
    res.json({ id: user.id, email: user.email, firstName: user.first_name });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (_req: AuthRequest, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
  });
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  res.json({ id: req.user.userId, email: req.user.email, firstName: req.user.firstName });
});

export default router;
