/**
 * Server-authoritative consumable use (heal potions, teleport potion, etc.).
 */

import { totalStat } from "../combat/formulas.js";
import { resolveItemDef } from "./item_helpers.js";
import { computeMaxHpFromActor } from "./stat_actions.js";

function attribBonusPer10(val) {
  return Math.floor(Math.max(0, Number(val) || 0) / 10);
}

function formulaVitHealingReceivedBonusPct(vit) {
  return attribBonusPer10(vit);
}

function ensureQuickSlots(player) {
  if (!player || typeof player !== "object") return;
  if (!Array.isArray(player.quickSlots)) player.quickSlots = [];
}

function reconcileQuickslots(player) {
  ensureQuickSlots(player);
  player.quickSlots.forEach((name, i) => {
    if (!name || typeof name !== "string") {
      player.quickSlots[i] = null;
      return;
    }
    const def = resolveItemDef(name);
    if (!def || def.type !== "consumable" || !Array.isArray(player.inventory) || !player.inventory.includes(name)) {
      player.quickSlots[i] = null;
    }
  });
}

function removeOneFromInventory(player, itemName) {
  if (!Array.isArray(player.inventory)) return false;
  const idx = player.inventory.indexOf(itemName);
  if (idx < 0) return false;
  player.inventory.splice(idx, 1);
  return true;
}

export function applyUseConsumable(player, { itemName }) {
  const name = String(itemName || "").trim();
  if (!name) {
    const err = new Error("Invalid item.");
    err.status = 400;
    throw err;
  }
  const def = resolveItemDef(name);
  if (!def || def.type !== "consumable") {
    const err = new Error("That item is not consumable.");
    err.status = 400;
    throw err;
  }
  if (!Array.isArray(player.inventory) || !player.inventory.includes(name)) {
    const err = new Error("You do not have that item.");
    err.status = 400;
    throw err;
  }

  if (def.effect === "heal") {
    const vit = totalStat(player, "vit");
    const bonus = formulaVitHealingReceivedBonusPct(vit) / 100;
    const base = typeof def.value === "number" && Number.isFinite(def.value) ? def.value : 0;
    const healed = Math.max(1, Math.floor(base * (1 + bonus)));
    player.maxHp = computeMaxHpFromActor(player);
    const before =
      typeof player.hp === "number" && Number.isFinite(player.hp) && player.hp > 0
        ? Math.floor(player.hp)
        : player.maxHp;
    player.hp = Math.min(player.maxHp, before + healed);
    if (!removeOneFromInventory(player, name)) {
      const err = new Error("Could not consume item.");
      err.status = 400;
      throw err;
    }
    reconcileQuickslots(player);
    return {
      effect: "heal",
      itemName: name,
      healed: player.hp - before,
      hp: player.hp,
      maxHp: player.maxHp
    };
  }

  if (def.effect === "teleport_portal") {
    if (!removeOneFromInventory(player, name)) {
      const err = new Error("Could not consume item.");
      err.status = 400;
      throw err;
    }
    reconcileQuickslots(player);
    return {
      effect: "teleport_portal",
      itemName: name
    };
  }

  if (def.effect === "hatch_pet_egg") {
    const err = new Error("Pet eggs cannot be hatched online yet.");
    err.status = 400;
    throw err;
  }

  const err = new Error("This consumable cannot be used.");
  err.status = 400;
  throw err;
}
