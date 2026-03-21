import { Router, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import db from '../db/connection.js';
import { AuthRequest, requireAuth, signToken, setTokenCookie } from '../middleware/auth.js';

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const APP_URL = process.env.APP_URL || 'https://creighton.stephens.page';

function getMailTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '25'),
    secure: process.env.SMTP_SECURE === 'true',
    ...(process.env.SMTP_USER ? {
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS || '',
      },
    } : {}),
  });
}

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
  // Read firstName from DB in case it was updated after the JWT was issued
  const user = db.prepare('SELECT first_name FROM users WHERE id = ?').get(req.user.userId) as
    | { first_name: string }
    | undefined;
  res.json({ id: req.user.userId, email: req.user.email, firstName: user?.first_name || req.user.firstName });
});

router.put('/me', requireAuth, (req: AuthRequest, res: Response) => {
  try {
    const { firstName } = req.body;
    if (!firstName || !firstName.trim()) {
      res.status(400).json({ error: 'First name is required' });
      return;
    }
    const trimmed = firstName.trim();
    db.prepare("UPDATE users SET first_name = ?, updated_at = datetime('now') WHERE id = ?").run(trimmed, req.user!.userId);

    // Re-issue JWT with updated name
    const token = signToken({ userId: req.user!.userId, email: req.user!.email, firstName: trimmed });
    setTokenCookie(res, token);
    res.json({ ok: true, firstName: trimmed });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.post('/forgot-password', async (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || !EMAIL_RE.test(email)) {
      res.status(400).json({ error: 'Valid email is required' });
      return;
    }

    const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email.toLowerCase()) as
      | { id: number; email: string }
      | undefined;

    // Always return success to avoid leaking whether email exists
    if (!user) {
      res.json({ ok: true });
      return;
    }

    // Invalidate any existing tokens for this user
    db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0').run(user.id);

    // Generate a secure token with 1-hour expiry
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)').run(user.id, token, expiresAt);

    const resetUrl = `${APP_URL}/#/reset-password/${token}`;

    try {
      const transport = getMailTransport();
      await transport.sendMail({
        from: process.env.SMTP_FROM || 'noreply@creighton.stephens.page',
        to: user.email,
        subject: 'Creighton Tracker — Password Reset',
        text: `You requested a password reset.\n\nClick this link to set a new password (expires in 1 hour):\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`,
        html: `<p>You requested a password reset.</p><p><a href="${resetUrl}">Click here to set a new password</a> (expires in 1 hour).</p><p>If you did not request this, you can ignore this email.</p>`,
      });
    } catch (mailErr) {
      console.error('Failed to send reset email:', mailErr);
      // Still return ok — don't leak mail delivery status
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

router.post('/reset-password', async (req: AuthRequest, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token) {
      res.status(400).json({ error: 'Reset token is required' });
      return;
    }
    if (!password || password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    const row = db.prepare(
      'SELECT id, user_id, expires_at, used FROM password_reset_tokens WHERE token = ?'
    ).get(token) as
      | { id: number; user_id: number; expires_at: string; used: number }
      | undefined;

    if (!row || row.used) {
      res.status(400).json({ error: 'Invalid or expired reset link' });
      return;
    }

    if (new Date(row.expires_at) < new Date()) {
      res.status(400).json({ error: 'This reset link has expired' });
      return;
    }

    // Mark token as used
    db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(row.id);

    // Update password
    const hash = await bcrypt.hash(password, 12);
    db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").run(hash, row.user_id);

    // Fetch user info for auto-login
    const user = db.prepare('SELECT id, email, first_name FROM users WHERE id = ?').get(row.user_id) as
      | { id: number; email: string; first_name: string }
      | undefined;

    if (user) {
      const jwt = signToken({ userId: user.id, email: user.email, firstName: user.first_name });
      setTokenCookie(res, jwt);
      res.json({ ok: true, id: user.id, email: user.email, firstName: user.first_name });
    } else {
      res.json({ ok: true });
    }
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

export default router;
