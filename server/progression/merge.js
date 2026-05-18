/**
 * Merge incoming client player onto authoritative snapshot with Phase 3 rules.
 */

import {
  buildPendingGrantsFromCombatResult,
  countAllItems,
  extractEconomy,
  grantsExpired,
  isKnownItemName,
  itemInventoryCounts
} from "./snapshot.js";
import { mergeWorldMap } from "./world_map.js";

const MAX_GOLD_DRIFT = 25;
const MAX_XP_DRIFT = 50;
const MAX_LEVEL_JUMP = 3;
const MAX_ITEM_STACKS_ADDED_PER_SAVE = 40;

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function countGrantItems(items) {
  const c = {};
  (items || []).forEach((name) => {
    if (typeof name === "string" && name.trim()) {
      const k = name.trim();
      c[k] = (c[k] || 0) + 1;
    }
  });
  return c;
}

function inventoryFromCounts(counts) {
  const names = Object.keys(counts).sort((a, b) => a.localeCompare(b));
  const inventory = [];
  names.forEach((name) => {
    const n = counts[name];
    for (let i = 0; i < n; i++) inventory.push(name);
  });
  return inventory;
}

function mergeInventoryAndEquipment(auth, incoming, grantItems, violations) {
  const authInv = itemInventoryCounts(auth?.inventory);
  const incInv = itemInventoryCounts(incoming?.inventory);
  const grantCounts = countGrantItems(grantItems);
  const mergedInv = { ...authInv };
  let addedStacks = 0;
  const allNames = new Set([...Object.keys(authInv), ...Object.keys(incInv)]);

  allNames.forEach((name) => {
    const authN = authInv[name] || 0;
    const incN = incInv[name] || 0;
    if (!isKnownItemName(name)) {
      if (incN > authN) {
        violations.push({
          severity: "clamp",
          code: "UNKNOWN_ITEM",
          message: `Removed unknown item: ${name}`
        });
      }
      return;
    }
    const max = authN + (grantCounts[name] || 0) + 5;
    const want = Math.max(authN, incN);
    if (want > max) {
      mergedInv[name] = max;
      violations.push({
        severity: "clamp",
        code: "ITEM_COUNT",
        message: `Capped stack count for ${name}`
      });
    } else {
      mergedInv[name] = want;
    }
    addedStacks += Math.max(0, want - authN);
  });

  const authTotal = countAllItems(auth);
  const incTotal = countAllItems(incoming);
  Object.keys(incTotal).forEach((name) => {
    if ((incTotal[name] || 0) > (authTotal[name] || 0) + (grantCounts[name] || 0) + 5) {
      violations.push({
        severity: "clamp",
        code: "ITEM_TOTAL",
        message: `Too many copies of ${name} (inventory + equipped).`
      });
    }
  });

  if (addedStacks > MAX_ITEM_STACKS_ADDED_PER_SAVE + (grantItems?.length || 0)) {
    violations.push({
      severity: "clamp",
      code: "ITEM_FLOOD",
      message: "Too many items added since last save."
    });
  }

  const inventory = inventoryFromCounts(mergedInv);
  const equipment = {
    ...(auth?.equipment && typeof auth.equipment === "object" ? auth.equipment : {}),
    ...(incoming?.equipment && typeof incoming.equipment === "object" ? incoming.equipment : {})
  };
  return { inventory, equipment };
}

/**
 * @param {object} authoritative - server snapshot player
 * @param {object} incoming - client player
 * @param {object|null} pendingGrants - combat grants not yet consumed
 * @returns {{ player: object, violations: Array<{ severity: string, code: string, message: string }>, consumedGrants: boolean }}
 */
export function mergePlayerProgression(authoritative, incoming, pendingGrants) {
  const violations = [];
  if (!incoming || typeof incoming !== "object") {
    return { player: authoritative, violations, consumedGrants: false };
  }
  if (!authoritative) {
    return { player: deepClone(incoming), violations, consumedGrants: false };
  }

  const out = deepClone(incoming);
  const authE = extractEconomy(authoritative);
  const incE = extractEconomy(incoming);
  const grants = pendingGrants && !grantsExpired(pendingGrants) ? pendingGrants : null;

  const maxGold = authE.gold + (grants?.gold || 0) + MAX_GOLD_DRIFT;
  if (incE.gold > maxGold) {
    out.gold = maxGold;
    violations.push({
      severity: "clamp",
      code: "GOLD",
      message: `Gold capped to ${maxGold} (server authoritative).`
    });
  } else {
    out.gold = Math.max(authE.gold, Math.max(0, incE.gold));
  }

  const maxXp = authE.xp + (grants?.heroXp || 0) + MAX_XP_DRIFT;
  if (incE.xp > maxXp) {
    out.xp = maxXp;
    violations.push({ severity: "clamp", code: "XP", message: "XP capped to server allowance." });
  } else {
    out.xp = Math.max(authE.xp, incE.xp);
  }

  if (incE.level < authE.level) {
    out.level = authE.level;
    violations.push({ severity: "clamp", code: "LEVEL_DOWN", message: "Level cannot decrease." });
  } else if (incE.level > authE.level + MAX_LEVEL_JUMP) {
    out.level = authE.level + MAX_LEVEL_JUMP;
    violations.push({ severity: "clamp", code: "LEVEL", message: "Level increased too quickly." });
  }

  out.hp = Math.min(Math.max(1, incE.hp), Math.max(1, incE.maxHp));
  out.maxHp = Math.max(1, incE.maxHp);

  out.worldMap = mergeWorldMap(authoritative.worldMap, incoming.worldMap, violations);

  const grantItems = grants?.items || [];
  const invEq = mergeInventoryAndEquipment(authoritative, incoming, grantItems, violations);
  out.inventory = invEq.inventory;
  out.equipment = invEq.equipment;

  if (grants?.companionXp?.length && Array.isArray(out.companions)) {
    grants.companionXp.forEach(({ slotIndex, xp }) => {
      const c = out.companions[slotIndex];
      if (c && typeof c.xp === "number") {
        const authC = authoritative.companions?.[slotIndex];
        const base = authC?.xp || 0;
        c.xp = Math.min(c.xp, base + (xp || 0) + MAX_XP_DRIFT);
      }
    });
  }

  return {
    player: out,
    violations,
    consumedGrants: !!grants
  };
}

export function mergeRosterSlots({
  authoritativeSlots,
  incomingSlots,
  snapshotsBySlot,
  pendingGrantsBySlot,
  activeCombatSlots
}) {
  const violations = [];
  const merged = [];
  const slotCount = Math.max(incomingSlots?.length || 0, authoritativeSlots?.length || 0, 5);

  for (let i = 0; i < slotCount; i++) {
    if (activeCombatSlots.has(i)) {
      const snap = snapshotsBySlot.get(i);
      merged[i] = snap?.player ? deepClone(snap.player) : authoritativeSlots[i] || incomingSlots[i] || null;
      continue;
    }

    const incoming = incomingSlots[i] ?? null;
    if (!incoming) {
      merged[i] = null;
      continue;
    }

    const snap = snapshotsBySlot.get(i);
    const auth = snap?.player || authoritativeSlots[i] || null;
    const grants = pendingGrantsBySlot.get(i) || null;

    if (!auth) {
      merged[i] = deepClone(incoming);
      continue;
    }

    const result = mergePlayerProgression(auth, incoming, grants);
    merged[i] = result.player;
    result.violations.forEach((v) => violations.push({ ...v, slot: i }));
  }

  return { slots: merged, violations };
}

export { buildPendingGrantsFromCombatResult };
