/**
 * Load/save roster slots for server-authoritative player actions (Phase B).
 */

import { getRosterJson, upsertRosterJson } from "../db.js";
import { getActiveCombatSlotsForUser } from "../combat/sessions.js";
import { upsertSnapshot } from "./store.js";
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
  upsertRosterJson(userId, JSON.stringify(roster));
  upsertSnapshot(userId, slotIndex, player, null);
  return roster;
}

export function actionRosterResponse(roster) {
  return { ok: true, roster };
}
