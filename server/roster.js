import { getRosterJson, upsertRosterJson } from "./db.js";
import { requireAuth } from "./auth.js";
import { getActiveCombatSlotsForUser } from "./combat/sessions.js";
import { mergeRosterSlots } from "./progression/merge.js";
import { getAllSnapshotsForUser, upsertSnapshot, clearPendingGrants } from "./progression/store.js";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const MMO_CONSTANTS = require("../shared/mmo_constants.js");

const SLOT_COUNT = MMO_CONSTANTS.CHARACTER_SLOT_COUNT;

function emptyRoster() {
  return {
    version: MMO_CONSTANTS.ROSTER_VERSION,
    slots: Array.from({ length: SLOT_COUNT }, () => null)
  };
}

function parseRoster(raw) {
  if (!raw || typeof raw !== "string") return emptyRoster();
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.slots)) return emptyRoster();
    const slots = parsed.slots.slice(0, SLOT_COUNT);
    while (slots.length < SLOT_COUNT) slots.push(null);
    return { version: MMO_CONSTANTS.ROSTER_VERSION, slots };
  } catch {
    return emptyRoster();
  }
}

function validateRosterBody(roster) {
  if (!roster || typeof roster !== "object" || !Array.isArray(roster.slots)) {
    const err = new Error("Invalid roster payload.");
    err.status = 400;
    throw err;
  }
  if (roster.slots.length !== SLOT_COUNT) {
    const err = new Error(`Roster must have exactly ${SLOT_COUNT} slots.`);
    err.status = 400;
    throw err;
  }
}

export function registerRosterRoutes(app) {
  app.get("/api/roster", requireAuth, (req, res) => {
    const raw = getRosterJson(req.user.id);
    const roster = parseRoster(raw);
    res.json({ roster });
  });

  app.put("/api/roster", requireAuth, (req, res) => {
    try {
      const { roster } = req.body || {};
      validateRosterBody(roster);

      const userId = req.user.id;
      const storedRaw = getRosterJson(userId);
      const storedRoster = parseRoster(storedRaw);
      const snapshotsBySlot = getAllSnapshotsForUser(userId, SLOT_COUNT);
      const pendingGrantsBySlot = new Map();
      snapshotsBySlot.forEach((snap, idx) => {
        if (snap?.pendingGrants) pendingGrantsBySlot.set(idx, snap.pendingGrants);
      });

      const activeCombatSlots = getActiveCombatSlotsForUser(userId);

      const { slots, violations } = mergeRosterSlots({
        authoritativeSlots: storedRoster.slots,
        incomingSlots: roster.slots,
        snapshotsBySlot,
        pendingGrantsBySlot,
        activeCombatSlots
      });

      const mergedRoster = { version: MMO_CONSTANTS.ROSTER_VERSION, slots };
      upsertRosterJson(userId, JSON.stringify(mergedRoster));

      slots.forEach((player, slotIndex) => {
        if (player) {
          upsertSnapshot(userId, slotIndex, player, null);
          if (pendingGrantsBySlot.has(slotIndex)) clearPendingGrants(userId, slotIndex);
        } else {
          upsertSnapshot(userId, slotIndex, null);
        }
      });

      const warnings = violations.filter((v) => v.severity === "clamp");
      res.json({
        ok: true,
        roster: mergedRoster,
        warnings: warnings.length ? warnings : undefined
      });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Failed to save roster." });
    }
  });
}
