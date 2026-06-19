/**
 * Append-only economy / progression audit log (Phase C).
 */

import { db } from "../db.js";

const MAX_PAYLOAD_LEN = 8000;

function trimPayload(obj) {
  const raw = JSON.stringify(obj && typeof obj === "object" ? obj : {});
  if (raw.length <= MAX_PAYLOAD_LEN) return raw;
  return raw.slice(0, MAX_PAYLOAD_LEN);
}

/**
 * @param {number} userId
 * @param {object} event
 * @param {string} event.kind
 * @param {number|null} [event.slotIndex]
 * @param {object} [event.meta]
 */
export function logEconomyEvent(userId, event) {
  if (userId == null || !event || typeof event.kind !== "string" || !event.kind.trim()) return;
  const slotIndex =
    typeof event.slotIndex === "number" && Number.isFinite(event.slotIndex)
      ? Math.floor(event.slotIndex)
      : null;
  const payload = trimPayload({
    kind: event.kind.trim(),
    slotIndex,
    meta: event.meta && typeof event.meta === "object" ? event.meta : {}
  });
  db.prepare(
    `INSERT INTO economy_events (user_id, slot_index, kind, payload)
     VALUES (?, ?, ?, ?)`
  ).run(userId, slotIndex, event.kind.trim(), payload);
}

export function getEconomyEventsForUser(userId, limit = 50) {
  const n = Math.max(1, Math.min(200, Math.floor(limit) || 50));
  const rows = db
    .prepare(
      `SELECT id, slot_index, kind, payload, created_at
       FROM economy_events
       WHERE user_id = ?
       ORDER BY id DESC
       LIMIT ?`
    )
    .all(userId, n);
  return rows.map((row) => {
    let meta = {};
    try {
      const parsed = JSON.parse(row.payload);
      meta = parsed?.meta && typeof parsed.meta === "object" ? parsed.meta : {};
    } catch {
      /* ignore */
    }
    return {
      id: row.id,
      slotIndex: row.slot_index,
      kind: row.kind,
      meta,
      createdAt: row.created_at
    };
  });
}
