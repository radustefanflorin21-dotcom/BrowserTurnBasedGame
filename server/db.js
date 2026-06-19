import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");
mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.DATABASE_PATH || path.join(dataDir, "game.db");
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS rosters (
    user_id INTEGER PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS progression_snapshots (
    user_id INTEGER NOT NULL,
    slot_index INTEGER NOT NULL,
    player_json TEXT NOT NULL,
    pending_grants TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, slot_index),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS economy_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    slot_index INTEGER,
    kind TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_economy_events_user ON economy_events(user_id, created_at);

  CREATE TABLE IF NOT EXISTS market_listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seller_user_id INTEGER NOT NULL,
    seller_slot_index INTEGER NOT NULL,
    seller_name TEXT NOT NULL,
    item_display_name TEXT NOT NULL,
    items_json TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price INTEGER NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT NOT NULL,
    search_text TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    FOREIGN KEY (seller_user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_market_listings_seller ON market_listings(seller_user_id, seller_slot_index);
  CREATE INDEX IF NOT EXISTS idx_market_listings_expires ON market_listings(expires_at);
  CREATE INDEX IF NOT EXISTS idx_market_listings_category ON market_listings(category, subcategory);

  CREATE TABLE IF NOT EXISTS player_mail (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    sender TEXT NOT NULL DEFAULT 'Auction Manager',
    body TEXT NOT NULL,
    read_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_player_mail_user ON player_mail(user_id, read_at);
`);

try {
  db.exec(`ALTER TABLE rosters ADD COLUMN revision INTEGER NOT NULL DEFAULT 0`);
} catch {
  /* column already exists */
}

export function findUserByEmail(email) {
  return db.prepare("SELECT id, email, password_hash FROM users WHERE email = ?").get(email);
}

export function createUser(email, passwordHash) {
  const info = db
    .prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)")
    .run(email, passwordHash);
  return info.lastInsertRowid;
}

export function getUserById(id) {
  return db.prepare("SELECT id, email FROM users WHERE id = ?").get(id);
}

export function getRosterJson(userId) {
  const row = db.prepare("SELECT data FROM rosters WHERE user_id = ?").get(userId);
  return row ? row.data : null;
}

export function getRosterRevision(userId) {
  const row = db.prepare("SELECT revision FROM rosters WHERE user_id = ?").get(userId);
  return row && typeof row.revision === "number" ? row.revision : 0;
}

/** @returns {number} new revision after write */
export function upsertRosterJson(userId, json) {
  const existing = db.prepare("SELECT revision FROM rosters WHERE user_id = ?").get(userId);
  const nextRevision = existing ? Math.max(0, Number(existing.revision) || 0) + 1 : 1;
  db.prepare(
    `INSERT INTO rosters (user_id, data, revision, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       data = excluded.data,
       revision = excluded.revision,
       updated_at = datetime('now')`
  ).run(userId, json, nextRevision);
  return nextRevision;
}

export { db, dbPath };
