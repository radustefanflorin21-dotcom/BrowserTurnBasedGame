/**
 * Item instance / equipment helpers (mirrors client game.js subset).
 */

import { getItemDef as lookupItemDef, loadGameConfig } from "../load_game_config.js";

export const EQUIP_SLOT_IDS = [
  "head",
  "amulet",
  "weapon",
  "chest",
  "offhand",
  "bracelet",
  "legs",
  "feet",
  "ring1",
  "ring2",
  "pet"
];

export function emptyEquipment() {
  return Object.fromEntries(EQUIP_SLOT_IDS.map((id) => [id, null]));
}

export function getItemBaseName(name) {
  const raw = typeof name === "string" ? name : "";
  if (!raw) return "";
  const sep = raw.lastIndexOf("@@");
  if (sep <= 0) return raw;
  return raw.slice(0, sep);
}

/** Renamed items: old base names in saves still resolve to the new definition. */
const ITEM_DEF_LEGACY_BASE_NAMES = Object.freeze({
  "Mirage Hood": "Mirage Helm",
  "Thick Scale": "Stone Scale",
  "Spirit Bark": "Bark Fragment",
  "Antler Fragment": "Antler Piece",
  "Toxic Extract": "Toxic Essence",
  "Illusion Fragment": "Illusion Essence",
  "Claw Gloves": "Claw Ring",
  "Rockstep Boots": "Rock Serpent Boots",
  "Earth Loop": "Serpent Grip",
  "Stone Helm": "Stone Lizzard Helmet",
  "Stonehide Armor": "Stonescale Armor",
  "Core Leggings": "Stonescale Leggings",
  "Earthpulse Amulet": "Stonepulse Amulet",
  "Earthcaller Staff": "Stonecaller",
  "Crystal Band": "Stonekind Band"
});

export function resolveItemDef(name) {
  const base = getItemBaseName(name);
  if (!base) return null;
  const lookup = ITEM_DEF_LEGACY_BASE_NAMES[base] || base;
  return lookupItemDef(lookup);
}

export function getItemEquipCategory(def) {
  if (!def || typeof def !== "object") return "";
  const rawCategory =
    (typeof def.equipCategory === "string" && def.equipCategory) ||
    (typeof def.weaponCategory === "string" && def.weaponCategory) ||
    "";
  const category = rawCategory.trim().toLowerCase();
  if (
    [
      "one_handed",
      "one_handed_sword",
      "dagger",
      "greatsword",
      "two_handed",
      "polearm",
      "warhammer",
      "scythe",
      "staff",
      "shield",
      "amulet",
      "bracelet",
      "wristband",
      "ring",
      "chest_armor",
      "robe",
      "veil",
      "helmet",
      "leg_armor",
      "feet_armor",
      "pet"
    ].includes(category)
  ) {
    return category;
  }
  if (def.type === "pet") return "pet";
  if (def.type === "weapon") return "one_handed";
  if (def.type === "armor" && def.slot === "offhand") return "shield";
  return "";
}

export function getAllowedEquipSlotsForDef(def) {
  if (!def || typeof def !== "object") return [];
  const category = getItemEquipCategory(def);
  if (category === "one_handed" || category === "one_handed_sword" || category === "dagger") {
    return ["weapon", "offhand"];
  }
  if (["two_handed", "greatsword", "polearm", "warhammer", "scythe", "staff"].includes(category)) {
    return ["weapon"];
  }
  if (category === "shield") return ["offhand"];
  if (category === "amulet") return ["amulet"];
  if (category === "bracelet" || category === "wristband") return ["bracelet"];
  if (category === "ring") return ["ring1", "ring2"];
  if (category === "chest_armor" || category === "robe") return ["chest"];
  if (category === "veil" || category === "helmet") return ["head"];
  if (category === "leg_armor") return ["legs"];
  if (category === "feet_armor") return ["feet"];
  if (category === "pet") return ["pet"];
  if (typeof def.slot === "string" && def.slot.trim()) return [def.slot.trim()];
  return [];
}

export function isTwoHandedWeaponDef(def) {
  const c = getItemEquipCategory(def);
  return ["two_handed", "greatsword", "polearm", "warhammer", "scythe", "staff"].includes(c);
}

export function isOneHandedWeaponDef(def) {
  const c = getItemEquipCategory(def);
  return c === "one_handed" || c === "one_handed_sword" || c === "dagger";
}

export function isEquippableItemDef(def) {
  return getAllowedEquipSlotsForDef(def).length > 0;
}

export function inventoryBaseCounts(inventory) {
  const out = new Map();
  (Array.isArray(inventory) ? inventory : []).forEach((entry) => {
    const base = getItemBaseName(entry);
    if (!base) return;
    out.set(base, (out.get(base) || 0) + 1);
  });
  return out;
}

export function rollLootGearRarityTier() {
  const cfg = loadGameConfig();
  const rw = cfg?.lootDropSettings?.rarityWeights;
  if (!Array.isArray(rw) || !rw.length) return "common";
  let sum = 0;
  for (const row of rw) {
    const w = row && typeof row.weight === "number" && row.weight > 0 ? row.weight : 0;
    sum += w;
  }
  if (sum <= 0) return "common";
  let r = Math.random() * sum;
  for (const row of rw) {
    const w = row && typeof row.weight === "number" && row.weight > 0 ? row.weight : 0;
    r -= w;
    if (r <= 0) return typeof row.id === "string" && row.id ? row.id : "common";
  }
  return "common";
}

export function makeRarityItemInstanceName(baseName, rarityId) {
  const base = String(baseName || "").trim();
  if (!base) return "";
  const rarity = String(rarityId || "common").trim().toLowerCase() || "common";
  return `${base}@@${rarity}`;
}
