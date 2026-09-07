const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'taskvault.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// --- Schema ---
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_progress','done')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    key_hash TEXT NOT NULL,
    label TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'read' CHECK(scope IN ('read','write')),
    created_at TEXT DEFAULT (datetime('now')),
    last_used_at TEXT,
    revoked INTEGER NOT NULL DEFAULT 0
  );
`);

// --- Seed a default admin user if none exists (dev convenience only) ---
function seedAdmin() {
  const existing = db.prepare('SELECT id FROM users LIMIT 1').get();
  if (!existing) {
    const username = process.env.SEED_ADMIN_USER || 'admin';
    const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
    const hash = bcrypt.hashSync(password, 10);
    db.prepare(
      'INSERT INTO users (id, username, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run(randomUUID(), username, hash, 'admin');
    console.log(`Seeded default admin user "${username}". CHANGE THE PASSWORD IMMEDIATELY.`);
  }
}

seedAdmin();

module.exports = db;
