import { Router, Response } from 'express';
import database from '../db/connection.js';
import { AuthRequest } from '../middleware/auth.js';
import { encrypt, decrypt } from '../utils/crypto.js';

const router = Router();

router.post('/upload', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    if (req.body.encryptedData) {
      // E2E encrypted format: client already encrypted the data
      const data = encrypt(req.body.encryptedData); // server-encrypt the client-encrypted blob
      const shareData = req.body.shareData ? encrypt(JSON.stringify(req.body.shareData)) : null;

      const existing = database.prepare('SELECT id FROM sync_snapshots WHERE user_id = ?').get(userId);
      if (existing) {
        database.prepare("UPDATE sync_snapshots SET data = ?, share_data = ?, e2e = 1, updated_at = datetime('now') WHERE user_id = ?").run(data, shareData, userId);
      } else {
        database.prepare('INSERT INTO sync_snapshots (user_id, data, share_data, e2e) VALUES (?, ?, ?, 1)').run(userId, data, shareData);
      }
    } else {
      // Legacy format: plaintext observations/cycles/settings
      const { observations, cycles, settings } = req.body;

      if (!observations || !Array.isArray(observations)) {
        res.status(400).json({ error: 'Invalid data format: observations array required' });
        return;
      }

      const plaintext = JSON.stringify({ observations, cycles: cycles || [], settings: settings || null });
      const data = encrypt(plaintext);

      const existing = database.prepare('SELECT id FROM sync_snapshots WHERE user_id = ?').get(userId);
      if (existing) {
        database.prepare("UPDATE sync_snapshots SET data = ?, e2e = 0, updated_at = datetime('now') WHERE user_id = ?").run(data, userId);
      } else {
        database.prepare('INSERT INTO sync_snapshots (user_id, data, e2e) VALUES (?, ?, 0)').run(userId, data);
      }
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
    const row = database.prepare('SELECT data, share_data, e2e, updated_at FROM sync_snapshots WHERE user_id = ?').get(userId) as
      | { data: string; share_data: string | null; e2e: number; updated_at: string }
      | undefined;

    if (!row) {
      res.status(404).json({ error: 'No synced data found. Sync your data first.' });
      return;
    }

    if (row.e2e) {
      // E2E format: server-decrypt to get client-encrypted blob, return it
      const encryptedData = decrypt(row.data);
      res.json({ e2e: true, encryptedData, updatedAt: row.updated_at });
    } else {
      // Legacy format: server-decrypt to get plaintext
      const plaintext = decrypt(row.data);
      const data = JSON.parse(plaintext);
      res.json({ ...data, updatedAt: row.updated_at });
    }
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Download failed' });
  }
});

export default router;
