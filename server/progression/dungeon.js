/**
 * Instanced dungeon entry and progression helpers.
 */

import { loadGameConfig } from "../load_game_config.js";
import { getPartyMemberIds } from "../presence/party.js";
import { byUserId, sendJsonToUser, updatePresence } from "../presence/hub.js";

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

/** Enemy unit list for a dungeon room (authoritative for online fights). */
export function buildDungeonEnemyUnitsForRoom(dungeonId, roomIndex) {
  const def = getDungeonDef(dungeonId);
  const room = def && Array.isArray(def.rooms) ? def.rooms[roomIndex] : null;
  if (!room || !Array.isArray(room.enemies)) return [];
  return room.enemies.map((e) => (e && typeof e === "object" ? { ...e } : null)).filter(Boolean);
}

/** Mark dungeon room cleared and advance run state on the authoritative player. */
export function applyDungeonCombatVictory(player, dungeonId, roomIndex) {
  if (!player?.worldMap) return null;
  const id = typeof dungeonId === "string" ? dungeonId.trim() : "";
  if (!id) return null;
  const ri = typeof roomIndex === "number" && Number.isFinite(roomIndex) ? Math.floor(roomIndex) : 0;
  player.worldMap.dungeonPostCombat = { dungeonId: id, roomIndex: ri, victory: true };
  return advanceDungeonRunAfterRoomVictory(player, id, ri);
}

/** Record dungeon defeat and end the run on the authoritative player. */
export function applyDungeonCombatDefeat(player, dungeonId) {
  if (!player?.worldMap) return;
  const id = typeof dungeonId === "string" ? dungeonId.trim() : "";
  if (!id) return;
  player.worldMap.dungeonPostCombat = { dungeonId: id, defeat: true };
  delete player.worldMap.dungeonRun;
}

/**
 * For online dungeon fights, ignore client room/enemy payload and use roster progression.
 * @returns {object} encounter safe to pass into buildFoesFromEncounter
 */
export function resolveAuthoritativeDungeonEncounter(player, encounter) {
  const enc = encounter && typeof encounter === "object" ? { ...encounter } : {};
  const wmc =
    enc.worldMapContext && typeof enc.worldMapContext === "object" ? { ...enc.worldMapContext } : null;
  if (!wmc || typeof wmc.dungeonId !== "string" || !wmc.dungeonId.trim()) return enc;

  const dungeonId = wmc.dungeonId.trim();
  const run = player?.worldMap?.dungeonRun;
  if (!run || run.id !== dungeonId || run.epilogue) {
    const err = new Error("You are not in an active dungeon room.");
    err.status = 400;
    throw err;
  }

  const roomIndex = typeof run.roomIndex === "number" ? Math.max(0, Math.floor(run.roomIndex)) : 0;
  const def = getDungeonDef(dungeonId);
  if (!def || !Array.isArray(def.rooms) || roomIndex < 0 || roomIndex >= def.rooms.length) {
    const err = new Error("Invalid dungeon room.");
    err.status = 400;
    throw err;
  }

  const units = buildDungeonEnemyUnitsForRoom(dungeonId, roomIndex);
  if (!units.length) {
    const err = new Error("This dungeon room has no enemies configured.");
    err.status = 400;
    throw err;
  }

  const room = def.rooms[roomIndex];
  const ctx = { dungeonId, roomIndex, combatGlobalRound: 0 };
  if (
    room &&
    typeof room.enemyDamageMult === "number" &&
    Number.isFinite(room.enemyDamageMult) &&
    room.enemyDamageMult > 0
  ) {
    ctx.enemyDamageMult = room.enemyDamageMult;
  }

  return {
    ...enc,
    units,
    worldMapContext: ctx
  };
}

/** Keep presence dungeon fields aligned with saved roster after combat. */
export function syncPresenceDungeonRun(userId, player) {
  if (userId == null || !player?.worldMap) return;
  const run = player.worldMap.dungeonRun;
  if (run && typeof run.id === "string" && run.id.trim() && !run.epilogue) {
    updatePresence(userId, {
      dungeonId: run.id.trim(),
      dungeonRoomIndex: typeof run.roomIndex === "number" ? Math.max(0, Math.floor(run.roomIndex)) : 0
    });
    return;
  }
  if (player.worldMap.dungeonPostCombat?.defeat) {
    updatePresence(userId, { dungeonId: null, dungeonRoomIndex: 0 });
  }
}
