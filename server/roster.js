import { getRosterJson, getRosterRevision } from "./db.js";
import { requireAuth } from "./auth.js";
import { getActiveCombatSlotsForUser } from "./combat/sessions.js";
import { mergeRosterSlots } from "./progression/merge.js";
import { getAllSnapshotsForUser, upsertSnapshot, clearPendingGrants } from "./progression/store.js";
import { saveRosterDocument } from "./progression/roster_save.js";
import { logEconomyEvent } from "./economy/audit.js";
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
    const revision = getRosterRevision(req.user.id);
    res.json({ roster, revision });
  });

  app.put("/api/roster", requireAuth, (req, res) => {
    try {
      const { roster, baseRevision } = req.body || {};
      validateRosterBody(roster);

      const userId = req.user.id;
      const currentRevision = getRosterRevision(userId);
      if (baseRevision != null && Number(baseRevision) !== currentRevision) {
        const authoritative = parseRoster(getRosterJson(userId));
        res.status(409).json({
          error: "Roster save conflict — your game was updated elsewhere.",
          roster: authoritative,
          revision: currentRevision,
          violations: [
            {
              severity: "conflict",
              code: "REVISION_MISMATCH",
              message: `Expected revision ${baseRevision}, server has ${currentRevision}.`
            }
          ]
        });
        return;
      }

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
      const { revision } = saveRosterDocument(userId, mergedRoster);

      slots.forEach((player, slotIndex) => {
        if (player) {
          upsertSnapshot(userId, slotIndex, player, null);
          if (pendingGrantsBySlot.has(slotIndex)) clearPendingGrants(userId, slotIndex);
        } else {
          upsertSnapshot(userId, slotIndex, null);
        }
      });

      const warnings = violations.filter((v) => v.severity === "clamp");
      if (warnings.length) {
        logEconomyEvent(userId, {
          kind: "merge_clamp",
          slotIndex: null,
          meta: { warnings, revision }
        });
      }

      res.json({
        ok: true,
        roster: mergedRoster,
        revision,
        warnings: warnings.length ? warnings : undefined
      });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Failed to save roster." });
    }
  });
}
