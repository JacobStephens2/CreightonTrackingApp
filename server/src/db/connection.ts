import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../../data/creighton.db');
console.log('Opening Creighton DB at', dbPath);

const database = new Database(dbPath);
database.pragma('journal_mode = WAL');
database.pragma('foreign_keys = ON');

export default database;
