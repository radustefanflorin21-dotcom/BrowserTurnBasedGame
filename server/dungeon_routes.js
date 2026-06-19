import { requireAuth } from "./auth.js";
import { getRosterJson, getRosterRevision } from "./db.js";
import { saveRosterDocument } from "./progression/roster_save.js";
import { getPartyMemberIds } from "./presence/party.js";
import { byUserId, updatePresence } from "./presence/hub.js";
import {
  getDungeonDef,
  playerHasDungeonKey,
  consumeDungeonKey,
  applyDungeonEnterToPlayer,
  applyDungeonLeaveToPlayer,
  isPresenceOnEntranceTile,
  notifyPartyDungeonEnterInvite
} from "./progression/dungeon.js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const MMO_CONSTANTS = require("../shared/mmo_constants.js");
const SLOT_COUNT = MMO_CONSTANTS.CHARACTER_SLOT_COUNT;

function parseRoster(raw) {
  if (!raw) return { version: 1, slots: Array(SLOT_COUNT).fill(null) };
  try {
    const p = JSON.parse(raw);
    if (p && Array.isArray(p.slots)) {
      const slots = p.slots.slice(0, SLOT_COUNT);
      while (slots.length < SLOT_COUNT) slots.push(null);
      return { version: 1, slots };
    }
  } catch {
    /* ignore */
  }
  return { version: 1, slots: Array(SLOT_COUNT).fill(null) };
}

function getPlayerFromRoster(roster, slotIndex) {
  const idx = Number(slotIndex);
  if (!Number.isFinite(idx) || idx < 0 || idx >= SLOT_COUNT) return null;
  const pl = roster.slots[idx];
  if (!pl) return null;
  return JSON.parse(JSON.stringify(pl));
}

export function registerDungeonRoutes(app) {
  app.post("/api/dungeon/enter", requireAuth, (req, res) => {
    try {
      const dungeonId = typeof req.body?.dungeonId === "string" ? req.body.dungeonId.trim() : "";
      const slotIndex = Number(req.body?.slotIndex);
      if (!dungeonId) {
        res.status(400).json({ error: "dungeonId required." });
        return;
      }
      if (!Number.isFinite(slotIndex) || slotIndex < 0 || slotIndex >= SLOT_COUNT) {
        res.status(400).json({ error: "Invalid character slot." });
        return;
      }

      const def = getDungeonDef(dungeonId);
      if (!def) {
        res.status(404).json({ error: "Dungeon not configured." });
        return;
      }
      const keyName = typeof def.keyItem === "string" && def.keyItem.trim() ? def.keyItem.trim() : null;
      if (!keyName) {
        res.status(400).json({ error: "Dungeon key not configured." });
        return;
      }
      const entrance =
        def.entrance && typeof def.entrance.x === "number" && typeof def.entrance.y === "number"
          ? { x: Math.floor(def.entrance.x), y: Math.floor(def.entrance.y) }
          : null;
      if (!entrance) {
        res.status(400).json({ error: "Dungeon entrance not configured." });
        return;
      }

      const hostUserId = req.user.id;
      const hostEntry = byUserId.get(hostUserId);
      if (!hostEntry || !isPresenceOnEntranceTile(hostEntry, entrance)) {
        res.status(400).json({ error: "Stand on the dungeon entrance to enter." });
        return;
      }

      const hostRoster = parseRoster(getRosterJson(hostUserId));
      const hostPlayer = getPlayerFromRoster(hostRoster, slotIndex);
      if (!hostPlayer) {
        res.status(400).json({ error: "No character in that slot." });
        return;
      }
      if (!playerHasDungeonKey(hostPlayer, keyName)) {
        res.status(400).json({ error: `You need ${keyName}.` });
        return;
      }

      const dungeonName = typeof def.name === "string" && def.name.trim() ? def.name.trim() : dungeonId;
      const entered = [];
      const skipped = [];

      const enterSlotForUser = (userId, roster, sIdx) => {
        const entry = byUserId.get(userId);
        if (!entry || !isPresenceOnEntranceTile(entry, entrance)) {
          skipped.push({ userId, reason: "not_at_entrance" });
          return;
        }
        const pl = getPlayerFromRoster(roster, sIdx);
        if (!pl) {
          skipped.push({ userId, reason: "no_character" });
          return;
        }
        if (!playerHasDungeonKey(pl, keyName)) {
          skipped.push({ userId, reason: "no_key" });
          return;
        }
        consumeDungeonKey(pl, keyName);
        applyDungeonEnterToPlayer(pl, dungeonId, entrance);
        roster.slots[sIdx] = pl;
        const { revision } = saveRosterDocument(userId, roster);
        updatePresence(userId, {
          x: entrance.x,
          y: entrance.y,
          page: "adventure",
          dungeonId,
          dungeonRoomIndex: 0
        });
        entered.push({
          userId,
          slotIndex: sIdx,
          dungeonRun: { ...pl.worldMap.dungeonRun }
        });
      };

      enterSlotForUser(hostUserId, hostRoster, slotIndex);
      if (!entered.some((e) => e.userId === hostUserId)) {
        res.status(400).json({ error: `You need ${keyName}.` });
        return;
      }

      const memberIds = getPartyMemberIds(hostUserId);
      for (const uid of memberIds) {
        if (uid === hostUserId) continue;
        const partEntry = byUserId.get(uid);
        if (!partEntry) continue;
        const sIdx =
          typeof partEntry.slotIndex === "number"
            ? Math.max(0, Math.min(SLOT_COUNT - 1, Math.floor(partEntry.slotIndex)))
            : 0;
        const roster = parseRoster(getRosterJson(uid));
        enterSlotForUser(uid, roster, sIdx);
      }

      notifyPartyDungeonEnterInvite(hostUserId, { dungeonId, dungeonName, entrance, keyName });

      res.json({
        ok: true,
        dungeonId,
        dungeonName,
        entrance,
        entered,
        skipped,
        dungeonRun: hostPlayer.worldMap.dungeonRun,
        roster: hostRoster,
        revision: getRosterRevision(hostUserId)
      });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Failed to enter dungeon." });
    }
  });

  app.post("/api/dungeon/leave", requireAuth, (req, res) => {
    try {
      const dungeonId = typeof req.body?.dungeonId === "string" ? req.body.dungeonId.trim() : "";
      const slotIndex = Number(req.body?.slotIndex);
      if (!dungeonId) {
        res.status(400).json({ error: "dungeonId required." });
        return;
      }
      if (!Number.isFinite(slotIndex) || slotIndex < 0 || slotIndex >= SLOT_COUNT) {
        res.status(400).json({ error: "Invalid character slot." });
        return;
      }
      if (!getDungeonDef(dungeonId)) {
        res.status(404).json({ error: "Dungeon not configured." });
        return;
      }

      const userId = req.user.id;
      const roster = parseRoster(getRosterJson(userId));
      const player = getPlayerFromRoster(roster, slotIndex);
      if (!player) {
        res.status(400).json({ error: "No character in that slot." });
        return;
      }

      const afterDefeat = req.body?.afterDefeat === true;
      const leaveResult = applyDungeonLeaveToPlayer(player, dungeonId, {
        requireEpilogue: !afterDefeat
      });
      if (!leaveResult.ok) {
        res.status(400).json({ error: leaveResult.error || "Could not leave dungeon." });
        return;
      }

      roster.slots[slotIndex] = player;
      const { revision } = saveRosterDocument(userId, roster);
      updatePresence(userId, {
        x: leaveResult.entrance.x,
        y: leaveResult.entrance.y,
        page: "adventure",
        dungeonId: null,
        dungeonRoomIndex: 0
      });

      res.json({
        ok: true,
        dungeonId,
        entrance: leaveResult.entrance,
        roster,
        revision
      });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Failed to leave dungeon." });
    }
  });
}
