import { Router, Response } from 'express';
import crypto from 'crypto';
import database from '../db/connection.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

// Derive a 256-bit encryption key from the env var (same secret as JWT for simplicity,
// but can be a separate DATA_ENCRYPTION_KEY if desired)
const ENC_KEY_SOURCE = process.env.DATA_ENCRYPTION_KEY || process.env.JWT_SECRET || '';
const ENC_KEY = crypto.createHash('sha256').update(ENC_KEY_SOURCE).digest();

function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: base64(iv):base64(tag):base64(ciphertext)
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decrypt(encoded: string): string {
  const parts = encoded.split(':');
  if (parts.length !== 3) {
    // Not encrypted (legacy plain JSON) — return as-is
    return encoded;
  }
  try {
    const iv = Buffer.from(parts[0], 'base64');
    const tag = Buffer.from(parts[1], 'base64');
    const ciphertext = Buffer.from(parts[2], 'base64');
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, iv);
    decipher.setAuthTag(tag);
    return decipher.update(ciphertext) + decipher.final('utf8');
  } catch {
    // If decryption fails, assume it's legacy plain JSON
    return encoded;
  }
}

router.post('/upload', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { observations, cycles, settings } = req.body;

    if (!observations || !Array.isArray(observations)) {
      res.status(400).json({ error: 'Invalid data format: observations array required' });
      return;
    }

    const plaintext = JSON.stringify({ observations, cycles: cycles || [], settings: settings || null });
    const data = encrypt(plaintext);

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

    const plaintext = decrypt(row.data);
    const data = JSON.parse(plaintext);
    res.json({ ...data, updatedAt: row.updated_at });
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Download failed' });
  }
});

export default router;
