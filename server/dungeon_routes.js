import { requireAuth } from "./auth.js";
import { getRosterJson } from "./db.js";
import { savePlayerForSlot } from "./progression/roster_ops.js";
import { getPartyMemberIds } from "./presence/party.js";
import { byUserId, updatePresence } from "./presence/hub.js";
import {
  getDungeonDef,
  playerHasDungeonKey,
  consumeDungeonKey,
  applyDungeonEnterToPlayer,
  applyDungeonLeaveToPlayer,
  isPresenceOnEntranceTile,
  isUserAtDungeonEntrance,
  notifyPartyDungeonEnterInvite,
  skipDungeonRoomCheat
} from "./progression/dungeon.js";
import { allowDevCheat } from "./dev_cheats.js";
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
      const hostRoster = parseRoster(getRosterJson(hostUserId));
      const hostPlayer = getPlayerFromRoster(hostRoster, slotIndex);
      if (!hostPlayer) {
        res.status(400).json({ error: "No character in that slot." });
        return;
      }

      const hostEntry = byUserId.get(hostUserId);
      const skipDungeonKey = allowDevCheat(req);
      if (!skipDungeonKey && !isUserAtDungeonEntrance(hostEntry, hostPlayer, entrance)) {
        res.status(400).json({ error: "Stand on the dungeon entrance to enter." });
        return;
      }
      if (!skipDungeonKey && !playerHasDungeonKey(hostPlayer, keyName)) {
        res.status(400).json({ error: `You need ${keyName}.` });
        return;
      }

      const dungeonName = typeof def.name === "string" && def.name.trim() ? def.name.trim() : dungeonId;
      const entered = [];
      const skipped = [];

      const enterSlotForUser = (userId, roster, sIdx) => {
        const entry = byUserId.get(userId);
        const pl = getPlayerFromRoster(roster, sIdx);
        if (!pl) {
          skipped.push({ userId, reason: "no_character" });
          return;
        }
        if (!skipDungeonKey && !isUserAtDungeonEntrance(entry, pl, entrance)) {
          skipped.push({ userId, reason: "not_at_entrance" });
          return;
        }
        if (!skipDungeonKey && !playerHasDungeonKey(pl, keyName)) {
          skipped.push({ userId, reason: "no_key" });
          return;
        }
        if (!skipDungeonKey) consumeDungeonKey(pl, keyName);
        applyDungeonEnterToPlayer(pl, dungeonId, entrance);
        const saved = savePlayerForSlot(userId, roster, sIdx, pl);
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
        return saved;
      };

      const hostSaved = enterSlotForUser(hostUserId, hostRoster, slotIndex);
      if (!entered.some((e) => e.userId === hostUserId)) {
        res.status(400).json({
          error: skipDungeonKey ? "Could not enter dungeon." : `You need ${keyName}.`
        });
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

      const hostRosterOut = hostSaved?.roster || hostRoster;
      const hostSlot = hostRosterOut.slots[slotIndex];
      res.json({
        ok: true,
        dungeonId,
        dungeonName,
        entrance,
        entered,
        skipped,
        dungeonRun: hostSlot?.worldMap?.dungeonRun || null,
        roster: hostRosterOut,
        revision: hostSaved?.revision ?? 0
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
      const { roster: saved, revision } = savePlayerForSlot(userId, roster, slotIndex, player);
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
        roster: saved,
        revision
      });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Failed to leave dungeon." });
    }
  });

  app.post("/api/dungeon/skip-room", requireAuth, (req, res) => {
    try {
      if (!allowDevCheat(req)) {
        res.status(403).json({ error: "Dev cheats are not enabled on this server." });
        return;
      }
      const slotIndex = Number(req.body?.slotIndex);
      if (!Number.isFinite(slotIndex) || slotIndex < 0 || slotIndex >= SLOT_COUNT) {
        res.status(400).json({ error: "Invalid character slot." });
        return;
      }

      const userId = req.user.id;
      const roster = parseRoster(getRosterJson(userId));
      const player = getPlayerFromRoster(roster, slotIndex);
      if (!player) {
        res.status(400).json({ error: "No character in that slot." });
        return;
      }

      const result = skipDungeonRoomCheat(player);
      if (!result.ok) {
        res.status(400).json({ error: result.error || "Could not skip dungeon room." });
        return;
      }

      roster.slots[slotIndex] = player;
      const { roster: saved, revision } = savePlayerForSlot(userId, roster, slotIndex, player);
      const run = player.worldMap?.dungeonRun;
      if (run && !run.epilogue) {
        updatePresence(userId, {
          dungeonId: run.id,
          dungeonRoomIndex: typeof run.roomIndex === "number" ? run.roomIndex : 0
        });
      } else {
        updatePresence(userId, { dungeonId: null });
      }

      res.json({
        ok: true,
        dungeonId: result.dungeonId,
        dungeonRun: result.dungeonRun,
        roster: saved,
        revision
      });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Failed to skip dungeon room." });
    }
  });
}
