/**
 * Central roster persistence with revision bump (Phase C).
 */

import { upsertRosterJson } from "../db.js";

export function saveRosterDocument(userId, roster) {
  const revision = upsertRosterJson(userId, JSON.stringify(roster));
  return { roster, revision };
}

export function withRosterResponse(roster, revision, extra = {}) {
  return { ok: true, roster, revision, ...extra };
}
