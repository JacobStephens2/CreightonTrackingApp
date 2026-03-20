import { Router, Response } from 'express';
import database from '../db/connection.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

router.post('/upload', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { observations, cycles, settings } = req.body;

    if (!observations || !Array.isArray(observations)) {
      res.status(400).json({ error: 'Invalid data format: observations array required' });
      return;
    }

    const data = JSON.stringify({ observations, cycles: cycles || [], settings: settings || null });

    const existing = database.prepare('SELECT id FROM sync_snapshots WHERE user_id = ?').get(userId);
    if (existing) {
      database.prepare("UPDATE sync_snapshots SET data = ?, updated_at = datetime('now') WHERE user_id = ?").run(data, userId);
    } else {
      database.prepare('INSERT INTO sync_snapshots (user_id, data) VALUES (?, ?)').run(userId, data);
    }

    res.json({ ok: true, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

router.get('/download', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const row = database.prepare('SELECT data, updated_at FROM sync_snapshots WHERE user_id = ?').get(userId) as
      | { data: string; updated_at: string }
      | undefined;

    if (!row) {
      res.status(404).json({ error: 'No synced data found. Sync your data first.' });
      return;
    }

    const data = JSON.parse(row.data);
    res.json({ ...data, updatedAt: row.updated_at });
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Download failed' });
  }
});

export default router;
