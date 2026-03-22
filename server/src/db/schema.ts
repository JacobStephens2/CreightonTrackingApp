import db from './connection.js';

export function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      first_name TEXT NOT NULL DEFAULT '',
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sync_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      data TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS share_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      token TEXT NOT NULL UNIQUE,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Migrations
  const cols = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  if (!cols.some(c => c.name === 'first_name')) {
    db.exec("ALTER TABLE users ADD COLUMN first_name TEXT NOT NULL DEFAULT ''");
  }
  if (!cols.some(c => c.name === 'email_verified')) {
    db.exec("ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0");
  }
  if (!cols.some(c => c.name === 'encryption_salt')) {
    db.exec("ALTER TABLE users ADD COLUMN encryption_salt TEXT");
  }
  if (!cols.some(c => c.name === 'token_version')) {
    db.exec("ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0");
  }

  const syncCols = db.prepare("PRAGMA table_info(sync_snapshots)").all() as { name: string }[];
  if (!syncCols.some(c => c.name === 'share_data')) {
    db.exec("ALTER TABLE sync_snapshots ADD COLUMN share_data TEXT");
  }
  if (!syncCols.some(c => c.name === 'e2e')) {
    db.exec("ALTER TABLE sync_snapshots ADD COLUMN e2e INTEGER NOT NULL DEFAULT 0");
  }

  const shareCols = db.prepare("PRAGMA table_info(share_tokens)").all() as { name: string }[];
  if (!shareCols.some(c => c.name === 'expires_at')) {
    db.exec("ALTER TABLE share_tokens ADD COLUMN expires_at TEXT");
  }
}
