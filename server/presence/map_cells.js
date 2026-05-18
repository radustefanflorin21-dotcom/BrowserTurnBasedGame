/**
 * Shared world-map cell state per tile (x,y). All players on the same tile see the same
 * mob previews and defeat timers; each player still has their own roster/inventory.
 */

import { getEncounterSlotCountForCell, worldMapKey } from "../progression/world_map.js";
import { rollSharedMobPreview } from "../world/mob_roll.js";

/** @type {Map<string, { defeated: (number|null)[], defeatedUnits: (string[]|null)[], mobPreviews: (object|null)[] }>} */
const sharedByKey = new Map();

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function emptyCell(slotCount) {
  const n = Math.max(1, slotCount);
  return {
    defeated: Array.from({ length: n }, () => null),
    defeatedUnits: Array.from({ length: n }, () => null),
    mobPreviews: Array.from({ length: n }, () => null)
  };
}

function ensureCell(key, x, y) {
  let cell = sharedByKey.get(key);
  const slots = getEncounterSlotCountForCell(x, y);
  if (!cell) {
    cell = emptyCell(slots);
    sharedByKey.set(key, cell);
    return cell;
  }
  while (cell.defeated.length < slots) {
    cell.defeated.push(null);
    cell.defeatedUnits.push(null);
    cell.mobPreviews.push(null);
  }
  return cell;
}

export function getSharedMapCell(x, y) {
  const key = worldMapKey(x, y);
  const cell = sharedByKey.get(key);
  if (!cell) return null;
  return { key, ...deepClone(cell) };
}

export function getSharedMapCellForKey(key) {
  const cell = sharedByKey.get(key);
  if (!cell) return null;
  return { key, ...deepClone(cell) };
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} slotIndex
 * @param {object} preview
 * @returns {object | null} full cell snapshot if updated
 */
export function setSharedMobPreview(x, y, slotIndex, preview) {
  if (!preview || typeof preview !== "object" || !Array.isArray(preview.units) || !preview.units.length) {
    return null;
  }
  const key = worldMapKey(x, y);
  const si = Math.max(0, Math.floor(slotIndex));
  const cell = ensureCell(key, x, y);
  if (cell.defeated[si] != null && cell.defeated[si] !== 0) {
    return getSharedMapCellForKey(key);
  }
  if (cell.mobPreviews[si] && cell.mobPreviews[si].units && cell.mobPreviews[si].units.length) {
    return getSharedMapCellForKey(key);
  }
  cell.mobPreviews[si] = deepClone(preview);
  return getSharedMapCellForKey(key);
}

/** Replace entire cell from authoritative snapshot (e.g. all slots rolled together). */
export function mergeSharedMapCell(mapCell) {
  if (!mapCell || !mapCell.key) return null;
  const parts = String(mapCell.key).split(",");
  const x = parseInt(parts[0], 10);
  const y = parseInt(parts[1], 10);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const cell = ensureCell(mapCell.key, x, y);
  if (Array.isArray(mapCell.defeated)) {
    for (let i = 0; i < mapCell.defeated.length; i++) {
      cell.defeated[i] = mapCell.defeated[i];
      if (cell.defeated[i] != null && cell.defeated[i] !== 0) {
        cell.mobPreviews[i] = null;
      }
    }
  }
  if (Array.isArray(mapCell.defeatedUnits)) {
    for (let i = 0; i < mapCell.defeatedUnits.length; i++) {
      cell.defeatedUnits[i] = mapCell.defeatedUnits[i];
    }
  }
  if (Array.isArray(mapCell.mobPreviews)) {
    for (let i = 0; i < mapCell.mobPreviews.length; i++) {
      if (cell.defeated[i] != null && cell.defeated[i] !== 0) {
        cell.mobPreviews[i] = null;
        continue;
      }
      const incoming = mapCell.mobPreviews[i];
      if (incoming && incoming.units && incoming.units.length) {
        cell.mobPreviews[i] = deepClone(incoming);
      }
    }
  }
  return getSharedMapCellForKey(mapCell.key);
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} slotIndex
 * @param {number} timestamp
 * @param {string[]} killedNames
 */
/**
 * Roll any missing mob previews for a tile (server-authoritative, deterministic).
 * @returns {object | null} full cell snapshot
 */
export function ensureSharedMapCellRolled(x, y) {
  const key = worldMapKey(x, y);
  const slots = getEncounterSlotCountForCell(x, y);
  if (slots <= 0) {
    const mapCell = getSharedMapCellForKey(key);
    return mapCell ? { mapCell, changed: false } : null;
  }
  const cell = ensureCell(key, x, y);
  let changed = false;
  for (let si = 0; si < slots; si++) {
    if (cell.defeated[si] != null && cell.defeated[si] !== 0) continue;
    const existing = cell.mobPreviews[si];
    if (existing && existing.units && existing.units.length) continue;
    const roll = rollSharedMobPreview(x, y, si);
    if (roll && roll.units && roll.units.length) {
      cell.mobPreviews[si] = deepClone(roll);
      changed = true;
    }
  }
  const mapCell = getSharedMapCellForKey(key);
  return mapCell ? { mapCell, changed } : null;
}

/** Roll a single slot if missing; returns full cell snapshot when updated. */
export function ensureSharedMapCellSlotRolled(x, y, slotIndex) {
  const key = worldMapKey(x, y);
  const si = Math.max(0, Math.floor(slotIndex));
  const cell = ensureCell(key, x, y);
  let changed = false;
  if (cell.defeated[si] != null && cell.defeated[si] !== 0) {
    const mapCell = getSharedMapCellForKey(key);
    return mapCell ? { mapCell, changed: false } : null;
  }
  if (cell.mobPreviews[si] && cell.mobPreviews[si].units && cell.mobPreviews[si].units.length) {
    const mapCell = getSharedMapCellForKey(key);
    return mapCell ? { mapCell, changed: false } : null;
  }
  const roll = rollSharedMobPreview(x, y, si);
  if (roll && roll.units && roll.units.length) {
    cell.mobPreviews[si] = deepClone(roll);
    changed = true;
  }
  const mapCell = getSharedMapCellForKey(key);
  return mapCell ? { mapCell, changed } : null;
}

export function setSharedDefeat(x, y, slotIndex, timestamp, killedNames) {
  const key = worldMapKey(x, y);
  const si = Math.max(0, Math.floor(slotIndex));
  const cell = ensureCell(key, x, y);
  cell.defeated[si] = timestamp;
  cell.defeatedUnits[si] = Array.isArray(killedNames) ? killedNames.slice() : [];
  cell.mobPreviews[si] = null;
  return getSharedMapCellForKey(key);
}
