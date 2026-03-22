import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import database from '../db/connection.js';
import { AuthRequest } from '../middleware/auth.js';
import { encrypt, decrypt } from '../utils/crypto.js';

export const shareAuthRouter = Router();

const SHARE_EXPIRY_DAYS = 90;

shareAuthRouter.post('/generate', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SHARE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const existing = database.prepare('SELECT id FROM share_tokens WHERE user_id = ?').get(userId);
    if (existing) {
      database.prepare("UPDATE share_tokens SET token = ?, expires_at = ?, created_at = datetime('now') WHERE user_id = ?").run(token, expiresAt, userId);
    } else {
      database.prepare('INSERT INTO share_tokens (user_id, token, expires_at) VALUES (?, ?, ?)').run(userId, token, expiresAt);
    }

    const syncData = database.prepare('SELECT data FROM sync_snapshots WHERE user_id = ?').get(userId);
    const url = `https://creighton.stephens.page/shared/${token}`;

    res.json({ token, url, hasData: !!syncData, expiresAt });
  } catch (err) {
    console.error('Share generate error:', err);
    res.status(500).json({ error: 'Failed to generate share link' });
  }
});

shareAuthRouter.delete('/revoke', (req: AuthRequest, res: Response) => {
  try {
    database.prepare('DELETE FROM share_tokens WHERE user_id = ?').run(req.user!.userId);
    res.json({ ok: true });
  } catch (err) {
    console.error('Share revoke error:', err);
    res.status(500).json({ error: 'Failed to revoke share link' });
  }
});

shareAuthRouter.get('/status', (req: AuthRequest, res: Response) => {
  try {
    const row = database.prepare('SELECT token, created_at, expires_at FROM share_tokens WHERE user_id = ?').get(req.user!.userId) as
      | { token: string; created_at: string; expires_at: string | null }
      | undefined;

    if (!row) {
      res.json({ active: false });
      return;
    }

    // Check if expired
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      database.prepare('DELETE FROM share_tokens WHERE user_id = ?').run(req.user!.userId);
      res.json({ active: false });
      return;
    }

    res.json({
      active: true,
      token: row.token,
      url: `https://creighton.stephens.page/shared/${row.token}`,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    });
  } catch (err) {
    console.error('Share status error:', err);
    res.status(500).json({ error: 'Failed to check share status' });
  }
});

export function shareViewHandler(req: Request, res: Response): void {
  try {
    const { token } = req.params;

    const shareRow = database.prepare('SELECT user_id, expires_at FROM share_tokens WHERE token = ?').get(token) as
      | { user_id: number; expires_at: string | null }
      | undefined;

    if (!shareRow) {
      res.status(404).json({ error: 'This share link is invalid or has been revoked' });
      return;
    }

    // Check expiration
    if (shareRow.expires_at && new Date(shareRow.expires_at) < new Date()) {
      res.status(410).json({ error: 'This share link has expired' });
      return;
    }

    const userRow = database.prepare('SELECT first_name FROM users WHERE id = ?').get(shareRow.user_id) as
      | { first_name: string }
      | undefined;

    const syncRow = database.prepare('SELECT data, share_data, e2e, updated_at FROM sync_snapshots WHERE user_id = ?').get(shareRow.user_id) as
      | { data: string; share_data: string | null; e2e: number; updated_at: string }
      | undefined;

    if (!syncRow) {
      res.status(404).json({ error: 'No synced data available. The user needs to sync their data first.' });
      return;
    }

    // Prefer share_data (pre-filtered by client for E2E users)
    if (syncRow.share_data) {
      const shareDataStr = decrypt(syncRow.share_data);
      const data = JSON.parse(shareDataStr);
      res.json({
        firstName: userRow?.first_name || '',
        observations: data.observations || [],
        cycles: data.cycles || [],
        updatedAt: syncRow.updated_at,
      });
      return;
    }

    // Legacy fallback: decrypt main data and strip private fields
    const plaintext = decrypt(syncRow.data);
    const data = JSON.parse(plaintext);

    const observations = (data.observations || []).map((obs: Record<string, unknown>) => {
      const { intercourse, notes, ...safe } = obs;
      return safe;
    });

    res.json({
      firstName: userRow?.first_name || '',
      observations,
      cycles: data.cycles || [],
      updatedAt: syncRow.updated_at,
    });
  } catch (err) {
    console.error('Share view error:', err);
    res.status(500).json({ error: 'Failed to load shared data' });
  }
}
