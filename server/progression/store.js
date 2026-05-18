/** SQLite persistence for authoritative per-slot snapshots. */

import { db } from "../db.js";

export function getSnapshot(userId, slotIndex) {
  const row = db
    .prepare(
      "SELECT player_json, pending_grants FROM progression_snapshots WHERE user_id = ? AND slot_index = ?"
    )
    .get(userId, slotIndex);
  if (!row) return null;
  let player = null;
  let pendingGrants = null;
  try {
    player = JSON.parse(row.player_json);
  } catch {
    player = null;
  }
  if (row.pending_grants) {
    try {
      pendingGrants = JSON.parse(row.pending_grants);
    } catch {
      pendingGrants = null;
    }
  }
  return { player, pendingGrants };
}

export function getAllSnapshotsForUser(userId, slotCount = 5) {
  const map = new Map();
  for (let i = 0; i < slotCount; i++) {
    const snap = getSnapshot(userId, i);
    if (snap) map.set(i, snap);
  }
  return map;
}

export function upsertSnapshot(userId, slotIndex, player, pendingGrants = undefined) {
  if (!player) {
    deleteSnapshot(userId, slotIndex);
    return;
  }
  const grantsJson =
    pendingGrants === undefined
      ? undefined
      : pendingGrants === null
        ? null
        : JSON.stringify(pendingGrants);
  const existing = getSnapshot(userId, slotIndex);
  const keepGrants =
    grantsJson === undefined
      ? existing?.pendingGrants
        ? JSON.stringify(existing.pendingGrants)
        : null
      : grantsJson;

  db.prepare(
    `INSERT INTO progression_snapshots (user_id, slot_index, player_json, pending_grants, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, slot_index) DO UPDATE SET
       player_json = excluded.player_json,
       pending_grants = excluded.pending_grants,
       updated_at = datetime('now')`
  ).run(userId, slotIndex, JSON.stringify(player), keepGrants);
}

export function clearPendingGrants(userId, slotIndex) {
  db.prepare(
    "UPDATE progression_snapshots SET pending_grants = NULL, updated_at = datetime('now') WHERE user_id = ? AND slot_index = ?"
  ).run(userId, slotIndex);
}

export function deleteSnapshot(userId, slotIndex) {
  db.prepare("DELETE FROM progression_snapshots WHERE user_id = ? AND slot_index = ?").run(userId, slotIndex);
}
