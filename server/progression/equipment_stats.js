/**
 * Equipment bonus stat aggregation (mirrors client game.js).
 */

import { loadGameConfig } from "../load_game_config.js";
import { EQUIP_SLOT_IDS, emptyEquipment, getItemBaseName, resolveItemDef } from "./item_helpers.js";

const ITEM_RARITY_RULES = Object.freeze({
  common: Object.freeze({
    coreMultiplier: 1.0,
    secondaryMultiplier: 1.0,
    legendaryStaminaChancePct: 0
  }),
  uncommon: Object.freeze({
    coreMultiplier: 1.1,
    secondaryMultiplier: 1.05,
    legendaryStaminaChancePct: 0
  }),
  rare: Object.freeze({
    coreMultiplier: 1.25,
    secondaryMultiplier: 1.1,
    legendaryStaminaChancePct: 0
  }),
  epic: Object.freeze({
    coreMultiplier: 1.45,
    secondaryMultiplier: 1.2,
    legendaryStaminaChancePct: 0
  }),
  legendary: Object.freeze({
    coreMultiplier: 1.7,
    secondaryMultiplier: 1.3,
    legendaryStaminaChancePct: 18
  })
});

const ITEM_RARITY_CORE_STAT_KEYS = new Set(["str", "dex", "vit", "int", "hp"]);
const MAX_STAMINA_FROM_GEAR = 2;

function normalizeItemRarityId(rawValue) {
  const rarity = String(rawValue || "")
    .trim()
    .toLowerCase();
  if (Object.prototype.hasOwnProperty.call(ITEM_RARITY_RULES, rarity)) return rarity;
  return "common";
}

function splitItemInstanceName(name) {
  const raw = typeof name === "string" ? name : "";
  if (!raw) return { baseName: "", rarityId: "" };
  const sep = raw.lastIndexOf("@@");
  if (sep <= 0) return { baseName: raw, rarityId: "" };
  return {
    baseName: raw.slice(0, sep),
    rarityId: normalizeItemRarityId(raw.slice(sep + 2))
  };
}

function getItemInstanceRarityId(name) {
  const suffix = splitItemInstanceName(name).rarityId;
  if (!suffix || suffix.startsWith("pet:")) return "";
  return suffix;
}

function normalizeEquipmentStatKey(k) {
  const raw = String(k || "").trim();
  if (!raw) return null;
  const u = raw.toUpperCase();
  if (u === "STR" || u === "STRENGTH") return "str";
  if (u === "DEX" || u === "AGI" || u === "AGILITY" || u === "DEXTERITY") return "dex";
  if (u === "VIT" || u === "VITALITY") return "vit";
  if (u === "INT" || u === "INTELLIGENCE") return "int";
  if (u === "HP" || u === "HEALTH" || u === "MAX_HP" || u === "MAX HEALTH") return "hp";
  if (u === "STA" || u === "STAMINA" || u === "STAMINA_MAX" || u === "MAX_STAMINA") return "stamina";
  if (u === "PHYS DAMAGE" || u === "PHYSICAL DAMAGE") return "physDamage";
  if (u === "PHYS RESIST" || u === "PHYSICAL RESIST" || u === "PHYS RES") return "physicalResist";
  if (u === "MAGIC RESIST") return "magicResist";
  if (u === "MAGIC DAMAGE" || u === "SKILL POWER") return "skillPower";
  if (u === "CRIT" || u === "CRITICAL") return "crit";
  if (u === "CRIT DAMAGE") return "critDamage";
  if (u === "ACC" || u === "ACCURACY") return "accuracy";
  if (u === "EVA" || u === "EVASION") return "evasion";
  if (u === "HEAL" || u === "HEALING RECEIVED" || u === "INCOMING HEALING") return "healingReceived";
  if (u === "STATUS RESIST" || u === "DEBUFF RESIST") return "statusResist";
  if (u === "MAX HP%" || u === "MAX HP PCT" || u === "MAX HP %" || u === "MAX HEALTH %") return "maxHpPct";
  return null;
}

function addEquipmentBonusStat(out, key, value) {
  const nk = normalizeEquipmentStatKey(key);
  if (!nk || typeof value !== "number" || !Number.isFinite(value)) return;
  const next = nk === "stamina" || nk === "hp" ? Math.floor(value) : value;
  out[nk] = (out[nk] || 0) + next;
}

function getItemRarityIdForItem(def, itemName) {
  const fromInstance = getItemInstanceRarityId(itemName);
  if (fromInstance) return fromInstance;
  return normalizeItemRarityId(def && def.rarity);
}

function getItemRarityRule(def, itemName) {
  return ITEM_RARITY_RULES[getItemRarityIdForItem(def, itemName)];
}

function isRarityCoreStatKey(statKey) {
  return ITEM_RARITY_CORE_STAT_KEYS.has(String(statKey || "").trim().toLowerCase());
}

function hashStringToPercent(input) {
  const s = String(input || "");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0) % 100;
}

function getLegendaryStaminaRollBonus(def, itemName) {
  const rule = getItemRarityRule(def, itemName);
  if (!rule || rule.legendaryStaminaChancePct <= 0) return 0;
  return hashStringToPercent(itemName) < rule.legendaryStaminaChancePct ? 1 : 0;
}

function scaleItemNumericStatByRarity(def, itemName, statKey, baseValue) {
  if (typeof baseValue !== "number" || !Number.isFinite(baseValue)) return 0;
  const rule = getItemRarityRule(def, itemName);
  const mult = isRarityCoreStatKey(statKey) ? rule.coreMultiplier : rule.secondaryMultiplier;
  return Math.round(baseValue * mult);
}

function getScaledItemBonusStats(def, itemName) {
  const out = {};
  const src = def && def.bonusStats && typeof def.bonusStats === "object" ? def.bonusStats : {};
  for (const [k, v] of Object.entries(src)) {
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    const nk = normalizeEquipmentStatKey(k);
    if (nk === "stamina") continue;
    const scaled = scaleItemNumericStatByRarity(def, itemName, nk || k, v);
    if (!scaled) continue;
    out[k] = scaled;
  }
  const legendarySta = getLegendaryStaminaRollBonus(def, itemName);
  if (legendarySta > 0) out.stamina = (out.stamina || 0) + legendarySta;
  return out;
}

function getEquipmentSetBonusStats(equipment) {
  const bonuses = loadGameConfig()?.mmoEquipmentSetBonuses;
  if (!bonuses || typeof bonuses !== "object") return {};
  const eq = equipment && typeof equipment === "object" ? equipment : emptyEquipment();
  const counts = {};
  EQUIP_SLOT_IDS.forEach((slot) => {
    const n = eq[slot];
    if (!n) return;
    const def = resolveItemDef(n);
    const setName = def && typeof def.set === "string" ? def.set.trim() : "";
    if (!setName) return;
    counts[setName] = (counts[setName] || 0) + 1;
  });
  const out = {};
  Object.keys(counts).forEach((setName) => {
    const setCfg = bonuses[setName];
    if (!setCfg || typeof setCfg !== "object") return;
    const c = counts[setName];
    let best = 0;
    Object.keys(setCfg).forEach((thresholdRaw) => {
      const threshold = parseInt(thresholdRaw, 10);
      if (!Number.isFinite(threshold) || c < threshold) return;
      if (threshold > best) best = threshold;
    });
    if (best <= 0) return;
    const stats = setCfg[String(best)];
    if (!stats || typeof stats !== "object") return;
    Object.entries(stats).forEach(([k, v]) => {
      if (String(k).startsWith("_")) return;
      addEquipmentBonusStat(out, k, v);
    });
  });
  return out;
}

/**
 * Sum scaled equipment + set bonuses for an actor's equipment object.
 * @param {object|null} equipment
 * @returns {Record<string, number>}
 */
export function sumEquippedBonusStats(equipment) {
  const out = {
    str: 0,
    dex: 0,
    vit: 0,
    int: 0,
    hp: 0,
    stamina: 0,
    physDamage: 0,
    physicalResist: 0,
    skillPower: 0,
    magicResist: 0,
    crit: 0,
    critDamage: 0,
    accuracy: 0,
    evasion: 0,
    healingReceived: 0,
    statusResist: 0,
    maxHpPct: 0
  };
  const eq = equipment && typeof equipment === "object" ? equipment : emptyEquipment();
  EQUIP_SLOT_IDS.forEach((slot) => {
    if (slot === "pet") return;
    const n = eq[slot];
    if (!n) return;
    const def = resolveItemDef(n);
    if (!def) return;
    const scaledBonusStats = getScaledItemBonusStats(def, n);
    for (const [k, v] of Object.entries(scaledBonusStats)) {
      addEquipmentBonusStat(out, k, v);
    }
  });
  const setBonusStats = getEquipmentSetBonusStats(eq);
  Object.entries(setBonusStats).forEach(([k, v]) => {
    if (typeof v === "number" && Number.isFinite(v)) out[k] = (out[k] || 0) + v;
  });
  out.stamina = Math.max(0, Math.min(MAX_STAMINA_FROM_GEAR, Math.floor(out.stamina)));
  out.hp = Math.max(0, Math.floor(out.hp));
  return out;
}

export { getItemBaseName, normalizeEquipmentStatKey };
