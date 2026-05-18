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
`);

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

export function upsertRosterJson(userId, json) {
  db.prepare(
    `INSERT INTO rosters (user_id, data, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET
       data = excluded.data,
       updated_at = datetime('now')`
  ).run(userId, json);
}

export { db, dbPath };
