/**
 * Load/save roster slots for server-authoritative player actions (Phase B).
 */

import { getRosterJson } from "../db.js";
import { getActiveCombatSlotsForUser } from "../combat/sessions.js";
import { upsertSnapshot } from "./store.js";
import { saveRosterDocument } from "./roster_save.js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const MMO_CONSTANTS = require("../../shared/mmo_constants.js");
const SLOT_COUNT = MMO_CONSTANTS.CHARACTER_SLOT_COUNT;

export function parseRoster(raw) {
  if (!raw) return { version: MMO_CONSTANTS.ROSTER_VERSION, slots: Array(SLOT_COUNT).fill(null) };
  try {
    const p = JSON.parse(raw);
    if (p && Array.isArray(p.slots)) {
      const slots = p.slots.slice(0, SLOT_COUNT);
      while (slots.length < SLOT_COUNT) slots.push(null);
      return { version: MMO_CONSTANTS.ROSTER_VERSION, slots };
    }
  } catch {
    /* ignore */
  }
  return { version: MMO_CONSTANTS.ROSTER_VERSION, slots: Array(SLOT_COUNT).fill(null) };
}

export function validateSlotIndex(slotIndex) {
  const idx = Number(slotIndex);
  if (!Number.isFinite(idx) || idx < 0 || idx >= SLOT_COUNT) {
    const err = new Error("Invalid character slot.");
    err.status = 400;
    throw err;
  }
  return idx;
}

export function assertSlotNotInCombat(userId, slotIndex) {
  if (getActiveCombatSlotsForUser(userId).has(slotIndex)) {
    const err = new Error("Cannot modify character during an active fight.");
    err.status = 409;
    throw err;
  }
}

export function loadPlayerForSlot(userId, slotIndex) {
  const idx = validateSlotIndex(slotIndex);
  assertSlotNotInCombat(userId, idx);
  const roster = parseRoster(getRosterJson(userId));
  const player = roster.slots[idx];
  if (!player) {
    const err = new Error("No character in that slot.");
    err.status = 400;
    throw err;
  }
  return { roster, player: JSON.parse(JSON.stringify(player)), slotIndex: idx };
}

export function savePlayerForSlot(userId, roster, slotIndex, player) {
  roster.slots[slotIndex] = player;
  upsertSnapshot(userId, slotIndex, player, null);
  return saveRosterDocument(userId, roster);
}

export function actionRosterResponse(roster, revision, extra = {}) {
  return { ok: true, roster, revision, ...extra };
}
