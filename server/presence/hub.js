/**
 * In-memory presence registry (Phase 4B). One entry per connected account.
 */

import { getSharedMapCell } from "./map_cells.js";
import { onUserDisconnected } from "./party.js";
import { handleCombatUserDisconnect } from "../combat/sessions.js";
import { getSameLocationPlayers, normalizeDungeonId, normalizeDungeonRoomIndex } from "./location.js";

const STALE_MS = 45_000;
const PRESENCE_RADIUS = 10;

/** @typedef {{ userId: number, email: string, name: string, slotIndex: number, x: number, y: number, page: string, updatedAt: number }} PresenceEntry */

/** @type {Map<number, PresenceEntry & { sockets: Set<object> }>} */
export const byUserId = new Map();

export function displayLabel(entry) {
  if (entry.name && entry.name.trim()) return entry.name.trim().slice(0, 32);
  const email = entry.email || "";
  const local = email.split("@")[0];
  return local ? local.slice(0, 32) : `Player ${entry.userId}`;
}

function chebyshev(ax, ay, bx, by) {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

function publicEntry(entry) {
  const out = {
    userId: entry.userId,
    name: displayLabel(entry),
    slotIndex: entry.slotIndex,
    x: entry.x,
    y: entry.y,
    page: entry.page
  };
  const dungeonId = normalizeDungeonId(entry.dungeonId);
  if (dungeonId) {
    out.dungeonId = dungeonId;
    out.dungeonRoomIndex = normalizeDungeonRoomIndex(entry.dungeonRoomIndex);
  }
  return out;
}

function pruneStale() {
  const now = Date.now();
  for (const [userId, entry] of byUserId) {
    if (now - entry.updatedAt > STALE_MS) {
      byUserId.delete(userId);
    }
  }
}

/**
 * @param {number} viewerId
 * @param {number} x
 * @param {number} y
 */
export function getNearbyForViewer(viewerId, x, y) {
  pruneStale();
  const out = [];
  for (const entry of byUserId.values()) {
    if (entry.userId === viewerId) continue;
    if (entry.page !== "adventure") continue;
    if (!Number.isFinite(entry.x) || !Number.isFinite(entry.y)) continue;
    if (chebyshev(x, y, entry.x, entry.y) > PRESENCE_RADIUS) continue;
    out.push(publicEntry(entry));
  }
  return out;
}

/**
 * Players on the exact same world map cell (shared map instance; mobs remain per-player).
 * @param {number} viewerId
 * @param {number} x
 * @param {number} y
 */
/** Same overworld tile (ignores dungeon instances). */
export function getSameMapPlayers(viewerId, x, y) {
  pruneStale();
  const viewer = byUserId.get(viewerId);
  if (viewer && normalizeDungeonId(viewer.dungeonId)) {
    return getSameLocationPlayers(viewerId, viewer).map(publicEntry);
  }
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const out = [];
  for (const entry of byUserId.values()) {
    if (entry.userId === viewerId) continue;
    if (entry.page !== "adventure") continue;
    if (normalizeDungeonId(entry.dungeonId)) continue;
    if (Math.floor(entry.x) !== ix || Math.floor(entry.y) !== iy) continue;
    out.push(publicEntry(entry));
  }
  return out;
}

/**
 * @param {object} user - { id, email }
 * @param {object} socket - ws instance
 */
export function attachSocket(user, socket) {
  const userId = user.id;
  let entry = byUserId.get(userId);
  if (!entry) {
    entry = {
      userId,
      email: user.email || "",
      name: "",
      slotIndex: 0,
      x: 0,
      y: 0,
      page: "menu",
      dungeonId: null,
      dungeonRoomIndex: 0,
      updatedAt: Date.now(),
      sockets: new Set()
    };
    byUserId.set(userId, entry);
  }
  entry.sockets.add(socket);
  socket.__presenceUserId = userId;
  return { userId, label: displayLabel(entry) };
}

export function detachSocket(socket) {
  const userId = socket.__presenceUserId;
  if (!userId) return null;
  const entry = byUserId.get(userId);
  if (!entry) return userId;
  entry.sockets.delete(socket);
  if (entry.sockets.size === 0) {
    byUserId.delete(userId);
    onUserDisconnected(userId);
    handleCombatUserDisconnect(userId);
  }
  return userId;
}

/**
 * @param {number} userId
 * @param {{ slotIndex?: number, x?: number, y?: number, name?: string, page?: string }} patch
 */
export function updatePresence(userId, patch) {
  const entry = byUserId.get(userId);
  if (!entry) return null;
  if (typeof patch.name === "string") entry.name = patch.name.slice(0, 48);
  if (typeof patch.slotIndex === "number" && Number.isFinite(patch.slotIndex)) {
    entry.slotIndex = Math.max(0, Math.min(4, Math.floor(patch.slotIndex)));
  }
  if (typeof patch.x === "number" && Number.isFinite(patch.x)) entry.x = Math.floor(patch.x);
  if (typeof patch.y === "number" && Number.isFinite(patch.y)) entry.y = Math.floor(patch.y);
  if (typeof patch.page === "string" && patch.page.trim()) entry.page = patch.page.trim().slice(0, 24);
  if (patch.dungeonId === null || patch.dungeonId === "") {
    entry.dungeonId = null;
    entry.dungeonRoomIndex = 0;
  } else if (typeof patch.dungeonId === "string" && patch.dungeonId.trim()) {
    entry.dungeonId = patch.dungeonId.trim().slice(0, 48);
    if (typeof patch.dungeonRoomIndex === "number" && Number.isFinite(patch.dungeonRoomIndex)) {
      entry.dungeonRoomIndex = Math.max(0, Math.floor(patch.dungeonRoomIndex));
    }
  } else if (typeof patch.dungeonRoomIndex === "number" && Number.isFinite(patch.dungeonRoomIndex)) {
    entry.dungeonRoomIndex = Math.max(0, Math.floor(patch.dungeonRoomIndex));
  }
  entry.updatedAt = Date.now();
  return entry;
}

let broadcastPresenceTimer = null;

/** Debounced to avoid blocking the WS thread on every movement tick. */
export function scheduleBroadcastPresence() {
  if (broadcastPresenceTimer) return;
  broadcastPresenceTimer = setTimeout(() => {
    broadcastPresenceTimer = null;
    broadcastPresence();
  }, 250);
  broadcastPresenceTimer.unref?.();
}

/** Notify every connected client with a personalized nearby list. */
export function broadcastPresence() {
  pruneStale();
  for (const entry of byUserId.values()) {
    const nearby = getNearbyForViewer(entry.userId, entry.x, entry.y);
    const sameMap =
      entry.page === "adventure"
        ? getSameLocationPlayers(entry.userId, entry).map(publicEntry)
        : [];
    // Map cell state is pushed via map_cell / welcome / map_cell_sync — not on every presence tick
    // (re-sending it here caused clients to rebuild encounter DOM ~4×/sec and broke mob portraits).
    const payload = JSON.stringify({ type: "presence", players: nearby, sameMap });
    for (const socket of entry.sockets) {
      if (socket.readyState === 1) {
        try {
          socket.send(payload);
        } catch {
          /* ignore */
        }
      }
    }
  }
}

export function getPresenceStats() {
  pruneStale();
  return { connected: byUserId.size };
}

export function sendJsonToUser(userId, payload) {
  const entry = byUserId.get(userId);
  if (!entry) return;
  const raw = JSON.stringify(payload);
  for (const socket of entry.sockets) {
    if (socket.readyState === 1) {
      try {
        socket.send(raw);
      } catch {
        /* ignore */
      }
    }
  }
}

/** Push shared map cell state to everyone on the same adventure tile. */
export function broadcastMapCellToTile(x, y, mapCell) {
  if (!mapCell) return;
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const payload = JSON.stringify({ type: "map_cell", mapCell });
  for (const entry of byUserId.values()) {
    if (entry.page !== "adventure") continue;
    if (Math.floor(entry.x) !== ix || Math.floor(entry.y) !== iy) continue;
    for (const socket of entry.sockets) {
      if (socket.readyState === 1) {
        try {
          socket.send(payload);
        } catch {
          /* ignore */
        }
      }
    }
  }
}
