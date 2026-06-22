/** Extract and store authoritative progression fingerprints from player records. */

import { resolveItemDef } from "./item_helpers.js";

const MAX_LEVEL = 60;

export function itemInventoryCounts(inventory) {
  const counts = {};
  if (!Array.isArray(inventory)) return counts;
  inventory.forEach((name) => {
    if (typeof name !== "string" || !name.trim()) return;
    const k = name.trim();
    counts[k] = (counts[k] || 0) + 1;
  });
  return counts;
}

function equipmentItems(equipment) {
  const items = [];
  if (!equipment || typeof equipment !== "object") return items;
  Object.values(equipment).forEach((name) => {
    if (typeof name === "string" && name.trim()) items.push(name.trim());
  });
  return items;
}

/** Defeated world-map cell keys (encounters cleared). */
export function getDefeatedCellKeys(worldMap) {
  const keys = [];
  if (!worldMap?.cells || typeof worldMap.cells !== "object") return keys;
  Object.entries(worldMap.cells).forEach(([key, cell]) => {
    if (!cell || typeof cell !== "object") return;
    const defeated = Array.isArray(cell.defeated) ? cell.defeated : [];
    if (defeated.some((t) => t != null && t !== 0)) keys.push(key);
  });
  return keys.sort();
}

export function countAllItems(player) {
  const counts = itemInventoryCounts(player?.inventory);
  equipmentItems(player?.equipment).forEach((name) => {
    counts[name] = (counts[name] || 0) + 1;
  });
  return counts;
}

export function extractEconomy(player) {
  return {
    gold: Math.max(0, Math.floor(Number(player?.gold) || 0)),
    xp: Math.max(0, Math.floor(Number(player?.xp) || 0)),
    level: Math.max(1, Math.min(MAX_LEVEL, Math.floor(Number(player?.level) || 1))),
    hp: Math.max(0, Math.floor(Number(player?.hp) || 0)),
    maxHp: Math.max(1, Math.floor(Number(player?.maxHp) || 1))
  };
}

export function isKnownItemName(name) {
  if (!name || typeof name !== "string") return false;
  return !!resolveItemDef(name.trim());
}

/**
 * Pending combat grants (consumed on next validated save).
 * @typedef {{ gold: number, heroXp: number, items: string[], companionXp: Array<{ slotIndex: number, xp: number }> }}
 */
export function buildPendingGrantsFromCombatResult(result) {
  if (!result?.victory) return null;
  const companionXp = [];
  (result.memberRewards || []).forEach((row) => {
    if (row?.kind === "companion" && Number.isFinite(row.companionSlotIndex)) {
      companionXp.push({ slotIndex: row.companionSlotIndex, xp: row.xp || 0 });
    }
  });
  let heroXp = 0;
  (result.memberRewards || []).forEach((row) => {
    if (row?.kind === "hero") heroXp = row.xp || 0;
  });
  return {
    gold: result.gold || 0,
    heroXp,
    items: Array.isArray(result.items) ? result.items.slice() : [],
    companionXp,
    createdAt: Date.now()
  };
}

export function grantsExpired(grants, maxAgeMs = 10 * 60 * 1000) {
  if (!grants?.createdAt) return true;
  return Date.now() - grants.createdAt > maxAgeMs;
}
