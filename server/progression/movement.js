/**
 * World-map movement validation for roster merge (Phase A).
 */

import { loadGameConfig } from "../load_game_config.js";
import { loadWorldMapData } from "../load_world_map.js";

/** @type {Set<string> | null} */
let teleportAllowlistCache = null;

function worldMapKey(x, y) {
  return `${Math.floor(x)},${Math.floor(y)}`;
}

function canEnterMapTile(x, y) {
  const d = loadWorldMapData();
  if (!d || x < 0 || y < 0 || x >= d.width || y >= d.height) return false;
  const cfg = loadGameConfig();
  const biomes = cfg?.worldMap?.biomes;
  if (!Array.isArray(biomes)) return false;
  const idx = d.biomeIndex[y * d.width + x] || 0;
  const b = biomes[idx] || biomes[0];
  return !!(b && b.passable);
}

function addTileKey(set, x, y) {
  if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) return;
  set.add(worldMapKey(Math.floor(x), Math.floor(y)));
}

function collectTeleportAllowlist() {
  if (teleportAllowlistCache) return teleportAllowlistCache;
  const keys = new Set();
  const cfg = loadGameConfig();
  const wm = cfg?.worldMap;

  const dungeons = wm?.dungeons;
  if (dungeons && typeof dungeons === "object") {
    Object.values(dungeons).forEach((def) => {
      if (def?.entrance) addTileKey(keys, def.entrance.x, def.entrance.y);
    });
  }

  const defaultStart = wm?.defaultStart;
  if (defaultStart) addTileKey(keys, defaultStart.x, defaultStart.y);

  const cells = wm?.coordinateCells;
  if (cells && typeof cells === "object") {
    Object.entries(cells).forEach(([key, cell]) => {
      keys.add(key);
      const elements = cell?.elements;
      if (!Array.isArray(elements)) return;
      elements.forEach((el) => {
        if (!el || typeof el !== "object") return;
        if (el.type === "boat" && Array.isArray(el.destinations)) {
          el.destinations.forEach((dest) => addTileKey(keys, dest?.x, dest?.y));
        }
        if (el.type === "portal" && typeof el.id === "string") {
          const m = /^portal_(-?\d+),(-?\d+)$/.exec(el.id.trim());
          if (m) addTileKey(keys, parseInt(m[1], 10), parseInt(m[2], 10));
        }
      });
    });
  }

  const mapData = loadWorldMapData();
  if (mapData?.cityNames && typeof mapData.cityNames === "object") {
    Object.keys(mapData.cityNames).forEach((key) => keys.add(key));
  }

  teleportAllowlistCache = keys;
  return keys;
}

function manhattan(ax, ay, bx, by) {
  return Math.abs(Math.floor(ax) - Math.floor(bx)) + Math.abs(Math.floor(ay) - Math.floor(by));
}

function isDungeonLeaveTeleport(authWm, incomingWm, ix, iy) {
  const authRun = authWm?.dungeonRun;
  const incRun = incomingWm?.dungeonRun;
  if (!authRun || typeof authRun.id !== "string" || !authRun.id.trim()) return false;
  if (incRun && incRun.id === authRun.id && !incRun.epilogue) return false;
  const cfg = loadGameConfig();
  const def = cfg?.worldMap?.dungeons?.[authRun.id.trim()];
  const ent = def?.entrance;
  if (!ent) return false;
  return Math.floor(ix) === Math.floor(ent.x) && Math.floor(iy) === Math.floor(ent.y);
}

/**
 * Whether an incoming world-map position is allowed from the authoritative tile.
 */
export function isWorldMovementAllowed(authWm, incomingWm, ix, iy, ax, ay) {
  if (typeof ax !== "number" || typeof ay !== "number" || !Number.isFinite(ax) || !Number.isFinite(ay)) {
    return canEnterMapTile(ix, iy);
  }
  if (Math.floor(ix) === Math.floor(ax) && Math.floor(iy) === Math.floor(ay)) return true;

  const dist = manhattan(ax, ay, ix, iy);
  if (dist === 1) return true;

  if (isDungeonLeaveTeleport(authWm, incomingWm, ix, iy)) return true;

  const allowlist = collectTeleportAllowlist();
  if (allowlist.has(worldMapKey(ix, iy))) return true;

  return false;
}
