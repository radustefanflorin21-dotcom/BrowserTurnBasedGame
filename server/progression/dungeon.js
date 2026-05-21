/**
 * Instanced dungeon entry and progression helpers.
 */

import { loadGameConfig } from "../load_game_config.js";
import { getPartyMemberIds } from "../presence/party.js";
import { byUserId, sendJsonToUser } from "../presence/hub.js";

export function getDungeonDef(dungeonId) {
  const id = typeof dungeonId === "string" ? dungeonId.trim() : "";
  if (!id) return null;
  const cfg = loadGameConfig();
  const dungeons = cfg?.worldMap?.dungeons;
  if (!dungeons || typeof dungeons !== "object") return null;
  return dungeons[id] || null;
}

export function playerHasDungeonKey(player, keyName) {
  if (!player || !Array.isArray(player.inventory) || !keyName) return false;
  return player.inventory.includes(keyName);
}

export function consumeDungeonKey(player, keyName) {
  if (!player || !Array.isArray(player.inventory) || !keyName) return false;
  const idx = player.inventory.indexOf(keyName);
  if (idx === -1) return false;
  player.inventory.splice(idx, 1);
  return true;
}

export function ensureWorldMapForDungeon(player, entrance) {
  if (!player.worldMap || typeof player.worldMap !== "object") {
    player.worldMap = {
      x: entrance.x,
      y: entrance.y,
      cells: {},
      scenePickups: {},
      sceneLayout: {},
      sceneEdits: {},
      portalWorldById: {},
      spawnPressure: { monsters: {} }
    };
  }
}

export function applyDungeonEnterToPlayer(player, dungeonId, entrance) {
  ensureWorldMapForDungeon(player, entrance);
  player.worldMap.x = entrance.x;
  player.worldMap.y = entrance.y;
  player.worldMap.dungeonRun = { id: dungeonId, roomIndex: 0, epilogue: false };
  delete player.worldMap.dungeonPostCombat;
}

export function isPresenceOnEntranceTile(entry, entrance) {
  if (!entry || entry.page !== "adventure") return false;
  if (entry.dungeonId) return false;
  return Math.floor(entry.x) === Math.floor(entrance.x) && Math.floor(entry.y) === Math.floor(entrance.y);
}

export function notifyPartyDungeonEnterInvite(hostUserId, { dungeonId, dungeonName, entrance, keyName }) {
  const memberIds = getPartyMemberIds(hostUserId);
  for (const uid of memberIds) {
    if (uid === hostUserId) continue;
    const entry = byUserId.get(uid);
    if (!entry) continue;
    if (isPresenceOnEntranceTile(entry, entrance)) continue;
    sendJsonToUser(uid, {
      type: "dungeon_enter_invite",
      dungeonId,
      dungeonName,
      entrance,
      keyItem: keyName,
      hostUserId,
      message: `${dungeonName} — join your party at [${entrance.x}, ${entrance.y}] with ${keyName}.`
    });
  }
}

/** Advance dungeon room after victory (mirrors client advanceDungeonToNextRoomOrEpilogue). */
export function advanceDungeonRunAfterRoomVictory(player, dungeonId, roomIndex) {
  if (!player?.worldMap?.dungeonRun) return null;
  const run = player.worldMap.dungeonRun;
  if (run.id !== dungeonId) return null;
  if (typeof run.roomIndex !== "number" || run.roomIndex !== roomIndex) return null;
  const def = getDungeonDef(dungeonId);
  if (!def || !Array.isArray(def.rooms)) return null;
  const nextRoom = run.roomIndex + 1;
  if (nextRoom < def.rooms.length) {
    run.roomIndex = nextRoom;
  } else {
    run.epilogue = true;
  }
  return { ...run };
}
