/**
 * Characteristic point spend + max HP (Phase B).
 */

import { loadGameConfig } from "../load_game_config.js";
import { sumEquippedBonusStats } from "../combat/formulas.js";

const STAT_CHAR_ALLOC_FLOOR = 5;
const STAT_CHAR_PREMIUM_THRESHOLD = 100;

function getActorStatBase(actor, statKey) {
  if (!actor) return STAT_CHAR_ALLOC_FLOOR;
  if (statKey === "dex") {
    if (typeof actor.dex === "number" && Number.isFinite(actor.dex)) return Math.floor(actor.dex);
    if (typeof actor.agi === "number" && Number.isFinite(actor.agi)) return Math.floor(actor.agi);
    return STAT_CHAR_ALLOC_FLOOR;
  }
  const v = actor[statKey];
  return typeof v === "number" && Number.isFinite(v) ? Math.floor(v) : STAT_CHAR_ALLOC_FLOOR;
}

function getNextCharPointCostPerBaseStat(currentBaseStat) {
  const v = Math.floor(Number(currentBaseStat) || STAT_CHAR_ALLOC_FLOOR);
  return v < STAT_CHAR_PREMIUM_THRESHOLD ? 1 : 2;
}

function getStatSystem() {
  const cfg = loadGameConfig();
  return cfg?.statSystem && typeof cfg.statSystem === "object" ? cfg.statSystem : {};
}

function getBaseHpFromLevel(level) {
  const sys = getStatSystem();
  const base = typeof sys.baseHpFromLevel === "number" ? sys.baseHpFromLevel : 50;
  const per = typeof sys.hpPerLevel === "number" ? sys.hpPerLevel : 10;
  const lv = Math.max(1, Math.floor(typeof level === "number" ? level : 1));
  return base + (lv - 1) * per;
}

export function computeMaxHpFromActor(actor) {
  if (!actor || typeof actor !== "object") return 1;
  const sys = getStatSystem();
  const lv = typeof actor.level === "number" && actor.level >= 1 ? Math.floor(actor.level) : 1;
  const vitPer = typeof sys.vitHpPerPoint === "number" ? sys.vitHpPerPoint : 5;
  const gear = sumEquippedBonusStats(actor.equipment);
  const baseVit = getActorStatBase(actor, "vit");
  const gearHp = gear.hp || 0;
  const hpPct = Math.max(0, Number(gear.maxHpPct) || 0);
  const flat = getBaseHpFromLevel(lv) + vitPer * (baseVit + (gear.vit || 0)) + gearHp;
  return Math.max(1, Math.floor(flat * (1 + hpPct / 100)));
}

export function resolveStatTarget(player, { target = "hero", companionSlotIndex = null }) {
  if (target === "companion") {
    const idx = Number(companionSlotIndex);
    if (!Number.isFinite(idx) || idx < 0 || !Array.isArray(player.companions) || !player.companions[idx]) {
      const err = new Error("Invalid companion slot.");
      err.status = 400;
      throw err;
    }
    return player.companions[idx];
  }
  return player;
}

export function applySpendCharacteristicPoints(player, { statKey, amount, target = "hero", companionSlotIndex = null }) {
  const key = typeof statKey === "string" ? statKey.trim() : "";
  if (!["str", "dex", "vit", "int"].includes(key)) {
    const err = new Error("Invalid stat key.");
    err.status = 400;
    throw err;
  }
  const actor = resolveStatTarget(player, { target, companionSlotIndex });
  const pool = typeof actor.charPoints === "number" ? Math.max(0, Math.floor(actor.charPoints)) : 0;
  const budget = Math.max(0, Math.floor(Number(amount) || 0));
  const useBudget = Math.min(budget, pool);
  if (useBudget <= 0) {
    const err = new Error("Not enough characteristic points.");
    err.status = 400;
    throw err;
  }

  let cur = getActorStatBase(actor, key);
  let spent = 0;
  let stat = cur;
  while (spent < useBudget) {
    const step = getNextCharPointCostPerBaseStat(stat);
    if (spent + step > useBudget) break;
    spent += step;
    stat += 1;
  }
  if (spent <= 0) {
    const err = new Error("Not enough characteristic points for the next step.");
    err.status = 400;
    throw err;
  }

  actor.charPoints = pool - spent;
  actor[key] = stat;
  const prevMax = typeof actor.maxHp === "number" ? actor.maxHp : computeMaxHpFromActor(actor);
  actor.maxHp = computeMaxHpFromActor(actor);
  const gained = actor.maxHp - prevMax;
  if (gained > 0) {
    actor.hp = Math.min(actor.maxHp, (typeof actor.hp === "number" ? actor.hp : actor.maxHp) + gained);
  }
  return { statKey: key, spent, newValue: stat };
}
