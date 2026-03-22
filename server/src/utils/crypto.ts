import crypto from 'crypto';

const ENC_KEY_SOURCE = process.env.DATA_ENCRYPTION_KEY || process.env.JWT_SECRET || '';
const ENC_KEY = crypto.createHash('sha256').update(ENC_KEY_SOURCE).digest();

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decrypt(encoded: string): string {
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

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('base64');
}
