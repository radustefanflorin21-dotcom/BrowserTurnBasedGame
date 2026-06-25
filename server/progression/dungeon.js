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

export function isPlayerOnDungeonEntrance(player, entrance) {
  if (!player?.worldMap || player.worldMap.dungeonRun) return false;
  const wm = player.worldMap;
  if (typeof wm.x !== "number" || typeof wm.y !== "number") return false;
  return Math.floor(wm.x) === Math.floor(entrance.x) && Math.floor(wm.y) === Math.floor(entrance.y);
}

/** Presence tile or authoritative saved player position (presence WS can lag). */
export function isUserAtDungeonEntrance(presenceEntry, player, entrance) {
  if (presenceEntry && isPresenceOnEntranceTile(presenceEntry, entrance)) return true;
  return isPlayerOnDungeonEntrance(player, entrance);
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
  return room.enemies
    .map((e) => {
      if (!e || typeof e !== "object") return null;
      const { moodId, moodName, mood, ...rest } = e;
      return { ...rest };
    })
    .filter(Boolean);
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

/** Dev cheat: advance dungeon room without fighting (current room only). */
export function skipDungeonRoomCheat(player) {
  if (!player?.worldMap?.dungeonRun) {
    return { ok: false, error: "Not in an active dungeon." };
  }
  const run = player.worldMap.dungeonRun;
  if (run.epilogue) {
    return { ok: false, error: "Dungeon already complete." };
  }
  const dungeonId = typeof run.id === "string" ? run.id.trim() : "";
  if (!dungeonId) {
    return { ok: false, error: "Invalid dungeon run." };
  }
  const roomIndex = typeof run.roomIndex === "number" ? Math.max(0, Math.floor(run.roomIndex)) : 0;
  const advanced = advanceDungeonRunAfterRoomVictory(player, dungeonId, roomIndex);
  if (!advanced) {
    return { ok: false, error: "Could not skip this dungeon room." };
  }
  delete player.worldMap.dungeonPostCombat;
  return { ok: true, dungeonId, dungeonRun: { ...advanced } };
}

/**
 * End a dungeon run and place the player on the overworld entrance tile.
 * Does not restore the dungeon key (already consumed on entry).
 * @returns {{ ok: boolean, error?: string, entrance?: { x: number, y: number }, dungeonId?: string }}
 */
export function ejectPlayerFromDungeon(player, dungeonId) {
  const id = typeof dungeonId === "string" ? dungeonId.trim() : "";
  if (!id || !player?.worldMap) {
    return { ok: false, error: "Invalid request." };
  }
  const def = getDungeonDef(id);
  if (!def) {
    return { ok: false, error: "Dungeon not configured." };
  }
  const entrance =
    def.entrance && typeof def.entrance.x === "number" && typeof def.entrance.y === "number"
      ? { x: Math.floor(def.entrance.x), y: Math.floor(def.entrance.y) }
      : null;
  if (!entrance) {
    return { ok: false, error: "Dungeon entrance not configured." };
  }
  delete player.worldMap.dungeonRun;
  delete player.worldMap.dungeonPostCombat;
  player.worldMap.x = entrance.x;
  player.worldMap.y = entrance.y;
  return { ok: true, entrance, dungeonId: id };
}

/** Defeat or forfeit in a dungeon — eject to entrance (key stays consumed). */
export function applyDungeonCombatDefeat(player, dungeonId) {
  return ejectPlayerFromDungeon(player, dungeonId);
}

/**
 * Exit an instanced dungeon back to the world-map entrance tile.
 * @returns {{ ok: boolean, error?: string, entrance?: { x: number, y: number } }}
 */
export function applyDungeonLeaveToPlayer(player, dungeonId, opts = {}) {
  const id = typeof dungeonId === "string" ? dungeonId.trim() : "";
  if (!id || !player?.worldMap) {
    return { ok: false, error: "Invalid request." };
  }
  const def = getDungeonDef(id);
  if (!def) {
    return { ok: false, error: "Dungeon not configured." };
  }
  const run = player.worldMap.dungeonRun;
  const requireEpilogue = opts.requireEpilogue !== false;
  const roomCount = Array.isArray(def.rooms) ? def.rooms.length : 0;
  const lastRoomIdx = roomCount > 0 ? roomCount - 1 : 0;
  if (run && run.id === id && !run.epilogue && roomCount > 0) {
    const post = player.worldMap.dungeonPostCombat;
    const clearedFinalRoom =
      post?.victory &&
      post.dungeonId === id &&
      typeof post.roomIndex === "number" &&
      post.roomIndex >= lastRoomIdx;
    const atFinalRoom = typeof run.roomIndex === "number" && run.roomIndex >= lastRoomIdx;
    if (clearedFinalRoom && atFinalRoom) {
      run.epilogue = true;
    }
  }
  if (requireEpilogue && (!run || run.id !== id || !run.epilogue)) {
    return { ok: false, error: "Complete the dungeon before leaving through the guide." };
  }
  const entrance =
    def.entrance && typeof def.entrance.x === "number" && typeof def.entrance.y === "number"
      ? { x: Math.floor(def.entrance.x), y: Math.floor(def.entrance.y) }
      : null;
  if (!entrance) {
    return { ok: false, error: "Dungeon entrance not configured." };
  }
  delete player.worldMap.dungeonRun;
  delete player.worldMap.dungeonPostCombat;
  player.worldMap.x = entrance.x;
  player.worldMap.y = entrance.y;
  return { ok: true, entrance };
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
  const wm = player.worldMap;
  const run = wm.dungeonRun;
  if (run && typeof run.id === "string" && run.id.trim() && !run.epilogue) {
    updatePresence(userId, {
      dungeonId: run.id.trim(),
      dungeonRoomIndex: typeof run.roomIndex === "number" ? Math.max(0, Math.floor(run.roomIndex)) : 0
    });
    return;
  }
  const pos = {};
  if (typeof wm.x === "number" && Number.isFinite(wm.x)) pos.x = Math.floor(wm.x);
  if (typeof wm.y === "number" && Number.isFinite(wm.y)) pos.y = Math.floor(wm.y);
  updatePresence(userId, { dungeonId: null, dungeonRoomIndex: 0, page: "adventure", ...pos });
}
