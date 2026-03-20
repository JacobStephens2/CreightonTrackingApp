import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import database from '../db/connection.js';
import { AuthRequest } from '../middleware/auth.js';

export const shareAuthRouter = Router();

shareAuthRouter.post('/generate', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const token = crypto.randomBytes(32).toString('hex');

    const existing = database.prepare('SELECT id FROM share_tokens WHERE user_id = ?').get(userId);
    if (existing) {
      database.prepare('UPDATE share_tokens SET token = ?, created_at = datetime(\'now\') WHERE user_id = ?').run(token, userId);
    } else {
      database.prepare('INSERT INTO share_tokens (user_id, token) VALUES (?, ?)').run(userId, token);
    }

    // Auto-sync data when generating share link
    const syncData = database.prepare('SELECT data FROM sync_snapshots WHERE user_id = ?').get(userId);
    const url = `https://creighton.stephens.page/shared/${token}`;

    res.json({ token, url, hasData: !!syncData });
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
    const row = database.prepare('SELECT token, created_at FROM share_tokens WHERE user_id = ?').get(req.user!.userId) as
      | { token: string; created_at: string }
      | undefined;

    if (!row) {
      res.json({ active: false });
      return;
    }

    res.json({
      active: true,
      token: row.token,
      url: `https://creighton.stephens.page/shared/${row.token}`,
      createdAt: row.created_at,
    });
  } catch (err) {
    console.error('Share status error:', err);
    res.status(500).json({ error: 'Failed to check share status' });
  }
});

export function shareViewHandler(req: Request, res: Response): void {
  try {
    const { token } = req.params;

    const shareRow = database.prepare('SELECT user_id FROM share_tokens WHERE token = ?').get(token) as
      | { user_id: number }
      | undefined;

    if (!shareRow) {
      res.status(404).json({ error: 'This share link is invalid or has been revoked' });
      return;
    }

    const userRow = database.prepare('SELECT first_name FROM users WHERE id = ?').get(shareRow.user_id) as
      | { first_name: string }
      | undefined;

    const syncRow = database.prepare('SELECT data, updated_at FROM sync_snapshots WHERE user_id = ?').get(shareRow.user_id) as
      | { data: string; updated_at: string }
      | undefined;

    if (!syncRow) {
      res.status(404).json({ error: 'No synced data available. The user needs to sync their data first.' });
      return;
    }

    const data = JSON.parse(syncRow.data);

    // Strip private fields from observations
    const observations = (data.observations || []).map((obs: Record<string, unknown>) => {
      const { intercourse, notes, ...safe } = obs;
      return safe;
    });

    // Strip settings entirely
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
