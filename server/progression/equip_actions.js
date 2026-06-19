/**
 * Server-authoritative equip / unequip (Phase B).
 */

import {
  emptyEquipment,
  getAllowedEquipSlotsForDef,
  getItemBaseName,
  getItemEquipCategory,
  isEquippableItemDef,
  isOneHandedWeaponDef,
  isTwoHandedWeaponDef,
  resolveItemDef
} from "./item_helpers.js";
import { computeMaxHpFromActor } from "./stat_actions.js";

function isOffhandBlockedByEquipment(equipment) {
  const eq = equipment && typeof equipment === "object" ? equipment : emptyEquipment();
  return isTwoHandedWeaponDef(resolveItemDef(eq.weapon));
}

function getDuplicateEquipConflictSlot(itemName, slotId, equipmentObj) {
  const def = resolveItemDef(itemName);
  const eq = equipmentObj && typeof equipmentObj === "object" ? equipmentObj : emptyEquipment();
  if (!def || !eq) return "";
  const baseName = getItemBaseName(itemName);
  if (isOneHandedWeaponDef(def) && (slotId === "weapon" || slotId === "offhand")) {
    const otherSlot = slotId === "weapon" ? "offhand" : "weapon";
    const otherName = typeof eq[otherSlot] === "string" ? eq[otherSlot] : "";
    if (otherName && isOneHandedWeaponDef(resolveItemDef(otherName)) && getItemBaseName(otherName) === baseName) {
      return otherSlot;
    }
  }
  if (getItemEquipCategory(def) === "ring" && (slotId === "ring1" || slotId === "ring2")) {
    const otherSlot = slotId === "ring1" ? "ring2" : "ring1";
    const otherName = typeof eq[otherSlot] === "string" ? eq[otherSlot] : "";
    if (otherName && getItemEquipCategory(resolveItemDef(otherName)) === "ring" && getItemBaseName(otherName) === baseName) {
      return otherSlot;
    }
  }
  return "";
}

function canEquipItemInSlot(itemName, slotId, equipmentObj) {
  const def = resolveItemDef(itemName);
  if (!def || typeof slotId !== "string" || !slotId) return false;
  const allowedSlots = getAllowedEquipSlotsForDef(def);
  if (!allowedSlots.includes(slotId)) return false;
  const eq = equipmentObj && typeof equipmentObj === "object" ? equipmentObj : emptyEquipment();
  if (slotId === "offhand" && isOffhandBlockedByEquipment(eq)) return false;
  if (getDuplicateEquipConflictSlot(itemName, slotId, eq)) return false;
  return true;
}

function pickEquipSlotForDef(def, itemName, preferredSlot, equipmentObj) {
  const eq = equipmentObj && typeof equipmentObj === "object" ? equipmentObj : emptyEquipment();
  const allowedSlots = getAllowedEquipSlotsForDef(def);
  if (!allowedSlots.length) return null;
  if (preferredSlot && allowedSlots.includes(preferredSlot)) return preferredSlot;
  const category = getItemEquipCategory(def);
  const baseName = getItemBaseName(itemName);
  if (category === "one_handed" || category === "one_handed_sword" || category === "dagger") {
    if (!eq.weapon) return eq.offhand && getItemBaseName(eq.offhand) === baseName ? "offhand" : "weapon";
    if (!isOffhandBlockedByEquipment(eq) && !eq.offhand && getItemBaseName(eq.weapon) !== baseName) return "offhand";
    return "weapon";
  }
  if (category === "ring") {
    if (!eq.ring1) return eq.ring2 && getItemBaseName(eq.ring2) === baseName ? "ring2" : "ring1";
    if (!eq.ring2 && getItemBaseName(eq.ring1) !== baseName) return "ring2";
    return "ring1";
  }
  return allowedSlots[0];
}

function enforceOffhandRuleForEquipment(eq, inventory) {
  if (!eq || typeof eq !== "object") return;
  if (isOffhandBlockedByEquipment(eq) && eq.offhand) {
    if (Array.isArray(inventory)) inventory.push(eq.offhand);
    eq.offhand = null;
  }
}

export function resolveEquipTarget(player, { target = "hero", companionSlotIndex = null }) {
  if (target === "companion") {
    const idx = Number(companionSlotIndex);
    if (!Number.isFinite(idx) || idx < 0 || !Array.isArray(player.companions) || !player.companions[idx]) {
      const err = new Error("Invalid companion slot.");
      err.status = 400;
      throw err;
    }
    const comp = player.companions[idx];
    if (!comp.enabled) {
      const err = new Error("That companion is not enabled.");
      err.status = 400;
      throw err;
    }
    if (!comp.equipment || typeof comp.equipment !== "object") comp.equipment = emptyEquipment();
    return comp;
  }
  if (!player.equipment || typeof player.equipment !== "object") player.equipment = emptyEquipment();
  return player;
}

export function applyEquipItem(player, { itemName, preferredSlot = null, target = "hero", companionSlotIndex = null }) {
  const name = typeof itemName === "string" ? itemName.trim() : "";
  if (!name) {
    const err = new Error("itemName required.");
    err.status = 400;
    throw err;
  }
  const def = resolveItemDef(name);
  if (!isEquippableItemDef(def)) {
    const err = new Error("That item cannot be equipped.");
    err.status = 400;
    throw err;
  }
  const actor = resolveEquipTarget(player, { target, companionSlotIndex });
  const reqLevel =
    typeof def.itemLevel === "number" && Number.isFinite(def.itemLevel) ? Math.max(1, Math.floor(def.itemLevel)) : 1;
  const actorLevel =
    typeof actor.level === "number" && Number.isFinite(actor.level) ? Math.max(1, Math.floor(actor.level)) : 1;
  if (reqLevel > actorLevel) {
    const err = new Error(`Requires level ${reqLevel}.`);
    err.status = 400;
    throw err;
  }
  if (!Array.isArray(player.inventory)) player.inventory = [];
  const invIdx = player.inventory.indexOf(name);
  if (invIdx === -1) {
    const err = new Error("Item not in inventory.");
    err.status = 400;
    throw err;
  }
  const eq = actor.equipment || emptyEquipment();
  const slot = pickEquipSlotForDef(def, name, preferredSlot, eq);
  if (!slot) {
    const err = new Error("No valid equipment slot.");
    err.status = 400;
    throw err;
  }
  if (getDuplicateEquipConflictSlot(name, slot, eq)) {
    const err = new Error("Cannot equip duplicate item.");
    err.status = 400;
    throw err;
  }
  if (!canEquipItemInSlot(name, slot, eq)) {
    const err = new Error("Cannot equip in that slot.");
    err.status = 400;
    throw err;
  }
  const prev = eq[slot];
  let displacedOffhand = null;
  if (slot === "weapon" && isTwoHandedWeaponDef(def) && eq.offhand) {
    displacedOffhand = eq.offhand;
    eq.offhand = null;
  }
  eq[slot] = name;
  actor.equipment = eq;
  player.inventory.splice(invIdx, 1);
  if (prev) player.inventory.push(prev);
  if (displacedOffhand) player.inventory.push(displacedOffhand);
  enforceOffhandRuleForEquipment(actor.equipment, player.inventory);
  actor.maxHp = computeMaxHpFromActor(actor);
  actor.hp = Math.min(actor.maxHp, Math.max(1, typeof actor.hp === "number" ? actor.hp : actor.maxHp));
  return { slot, itemName: name };
}

export function applyUnequipItem(player, { equipSlot, target = "hero", companionSlotIndex = null }) {
  const slotId = typeof equipSlot === "string" ? equipSlot.trim() : "";
  if (!slotId) {
    const err = new Error("equipSlot required.");
    err.status = 400;
    throw err;
  }
  const actor = resolveEquipTarget(player, { target, companionSlotIndex });
  const eq = actor.equipment || emptyEquipment();
  const name = eq[slotId];
  if (!name) {
    const err = new Error("Nothing equipped in that slot.");
    err.status = 400;
    throw err;
  }
  eq[slotId] = null;
  actor.equipment = eq;
  if (!Array.isArray(player.inventory)) player.inventory = [];
  player.inventory.push(name);
  return { slot: slotId, itemName: name };
}
