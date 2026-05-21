/**
 * Shared location rules for overworld tiles and instanced dungeon rooms.
 */

import { byUserId } from "./hub.js";

export function normalizeDungeonId(dungeonId) {
  return typeof dungeonId === "string" && dungeonId.trim() ? dungeonId.trim() : null;
}

export function normalizeDungeonRoomIndex(roomIndex) {
  if (typeof roomIndex !== "number" || !Number.isFinite(roomIndex)) return 0;
  return Math.max(0, Math.floor(roomIndex));
}

/** @param {object | null | undefined} wmc */
export function worldMapContextHasDungeon(wmc) {
  return !!(wmc && normalizeDungeonId(wmc.dungeonId));
}

/**
 * Whether a presence entry is in the same "local" space as a combat/world context.
 * @param {object | null | undefined} entry
 * @param {object | null | undefined} wmc - worldMapContext from combat
 */
export function presenceMatchesWorldMapContext(entry, wmc) {
  if (!entry || !wmc || typeof wmc !== "object") return false;
  const dungeonId = normalizeDungeonId(wmc.dungeonId);
  if (dungeonId) {
    if (entry.page !== "adventure") return false;
    const entryDungeon = normalizeDungeonId(entry.dungeonId);
    if (!entryDungeon || entryDungeon !== dungeonId) return false;
    const room = normalizeDungeonRoomIndex(wmc.roomIndex);
    const entryRoom = normalizeDungeonRoomIndex(entry.dungeonRoomIndex);
    return entryRoom === room;
  }
  if (typeof wmc.x !== "number" || typeof wmc.y !== "number") return true;
  if (entry.page !== "adventure") return false;
  if (normalizeDungeonId(entry.dungeonId)) return false;
  return Math.floor(entry.x) === Math.floor(wmc.x) && Math.floor(entry.y) === Math.floor(wmc.y);
}

/**
 * Players sharing the viewer's current location (tile or dungeon chamber).
 * @param {number} viewerId
 * @param {object} viewerEntry
 */
export function getSameLocationPlayers(viewerId, viewerEntry) {
  if (!viewerEntry || viewerEntry.page !== "adventure") return [];
  const viewerDungeon = normalizeDungeonId(viewerEntry.dungeonId);
  const out = [];
  for (const entry of byUserId.values()) {
    if (entry.userId === viewerId) continue;
    if (entry.page !== "adventure") continue;
    if (viewerDungeon) {
      if (normalizeDungeonId(entry.dungeonId) !== viewerDungeon) continue;
      if (
        normalizeDungeonRoomIndex(entry.dungeonRoomIndex) !==
        normalizeDungeonRoomIndex(viewerEntry.dungeonRoomIndex)
      ) {
        continue;
      }
    } else {
      if (normalizeDungeonId(entry.dungeonId)) continue;
      if (
        Math.floor(entry.x) !== Math.floor(viewerEntry.x) ||
        Math.floor(entry.y) !== Math.floor(viewerEntry.y)
      ) {
        continue;
      }
    }
    out.push(entry);
  }
  return out;
}

/**
 * @param {number} viewerId
 * @param {object | null | undefined} senderEntry
 */
export function canReceiveLocalChatFrom(senderEntry, viewerEntry) {
  if (!senderEntry || !viewerEntry) return false;
  if (senderEntry.page !== "adventure" || viewerEntry.page !== "adventure") return false;
  const senderDungeon = normalizeDungeonId(senderEntry.dungeonId);
  const viewerDungeon = normalizeDungeonId(viewerEntry.dungeonId);
  if (senderDungeon || viewerDungeon) {
    if (!senderDungeon || !viewerDungeon || senderDungeon !== viewerDungeon) return false;
    return (
      normalizeDungeonRoomIndex(senderEntry.dungeonRoomIndex) ===
      normalizeDungeonRoomIndex(viewerEntry.dungeonRoomIndex)
    );
  }
  return (
    Math.floor(senderEntry.x) === Math.floor(viewerEntry.x) &&
    Math.floor(senderEntry.y) === Math.floor(viewerEntry.y)
  );
}
