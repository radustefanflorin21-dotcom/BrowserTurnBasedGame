/**
 * Persisted private mail (Auction Manager notifications, etc.).
 */

import { db } from "../db.js";
import { AUCTION_MANAGER_NAME } from "./market_catalog.js";

export function insertPlayerMail(userId, body, sender = AUCTION_MANAGER_NAME) {
  const uid = Number(userId);
  if (!Number.isFinite(uid)) return null;
  const text = typeof body === "string" ? body.trim() : "";
  if (!text) return null;
  const from = typeof sender === "string" && sender.trim() ? sender.trim() : AUCTION_MANAGER_NAME;
  const info = db
    .prepare(`INSERT INTO player_mail (user_id, sender, body) VALUES (?, ?, ?)`)
    .run(uid, from, text);
  return info.lastInsertRowid;
}

export function getPlayerMail(userId, limit = 50) {
  const uid = Number(userId);
  const lim = Math.max(1, Math.min(200, Math.floor(Number(limit) || 50)));
  return db
    .prepare(
      `SELECT id, sender, body, read_at, created_at
       FROM player_mail WHERE user_id = ?
       ORDER BY created_at DESC LIMIT ?`
    )
    .all(uid, lim);
}

export function getUnreadMailCount(userId) {
  const uid = Number(userId);
  const row = db
    .prepare(`SELECT COUNT(*) AS c FROM player_mail WHERE user_id = ? AND read_at IS NULL`)
    .get(uid);
  return row && typeof row.c === "number" ? row.c : 0;
}

export function markMailRead(userId, mailId) {
  const uid = Number(userId);
  const id = Number(mailId);
  if (!Number.isFinite(id)) return false;
  const info = db
    .prepare(
      `UPDATE player_mail SET read_at = datetime('now')
       WHERE id = ? AND user_id = ? AND read_at IS NULL`
    )
    .run(id, uid);
  return info.changes > 0;
}

export function markAllMailRead(userId) {
  const uid = Number(userId);
  db.prepare(`UPDATE player_mail SET read_at = datetime('now') WHERE user_id = ? AND read_at IS NULL`).run(
    uid
  );
}

export function formatSoldMail(itemLabel, price) {
  return `Your listing sold: ${itemLabel} for ${price} gold. The gold has been added to your inventory.`;
}

export function formatBoughtMail(itemLabel, price) {
  return `Purchase complete: you bought ${itemLabel} for ${price} gold.`;
}

export function formatExpiredMail(itemLabel) {
  return `Your market listing expired: ${itemLabel} was returned to your inventory.`;
}
