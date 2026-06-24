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

function resolveHealActor(player, { healTarget = "hero", companionSlotIndex = null }) {
  if (healTarget === "companion") {
    const idx = Number(companionSlotIndex);
    if (!Number.isFinite(idx) || idx < 0 || !Array.isArray(player.companions) || !player.companions[idx]) {
      const err = new Error("Invalid companion heal target.");
      err.status = 400;
      throw err;
    }
    const comp = player.companions[idx];
    if (!comp.enabled) {
      const err = new Error("That companion is not active.");
      err.status = 400;
      throw err;
    }
    return { actor: comp, healTarget: "companion", companionSlotIndex: idx };
  }
  return { actor: player, healTarget: "hero", companionSlotIndex: null };
}

export function applyUseConsumable(player, { itemName, healTarget = "hero", companionSlotIndex = null }) {
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
    const { actor, healTarget: resolvedTarget, companionSlotIndex: resolvedSlot } = resolveHealActor(player, {
      healTarget,
      companionSlotIndex
    });
    const vit = totalStat(actor, "vit");
    const bonus = formulaVitHealingReceivedBonusPct(vit) / 100;
    const base = typeof def.value === "number" && Number.isFinite(def.value) ? def.value : 0;
    const healed = Math.max(1, Math.floor(base * (1 + bonus)));
    actor.maxHp = computeMaxHpFromActor(actor);
    const before =
      typeof actor.hp === "number" && Number.isFinite(actor.hp) && actor.hp > 0
        ? Math.floor(actor.hp)
        : actor.maxHp;
    actor.hp = Math.min(actor.maxHp, before + healed);
    if (!removeOneFromInventory(player, name)) {
      const err = new Error("Could not consume item.");
      err.status = 400;
      throw err;
    }
    reconcileQuickslots(player);
    player.maxHp = computeMaxHpFromActor(player);
    return {
      effect: "heal",
      itemName: name,
      healTarget: resolvedTarget,
      companionSlotIndex: resolvedSlot,
      healed: actor.hp - before,
      hp: actor.hp,
      maxHp: actor.maxHp,
      ...(resolvedTarget === "hero"
        ? {}
        : {
            companionHp: actor.hp,
            companionMaxHp: actor.maxHp
          })
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
