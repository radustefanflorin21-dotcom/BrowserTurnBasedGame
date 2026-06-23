/**
 * Actor XP → level progression (mirrors client game.js).
 */

import { loadGameConfig } from "../load_game_config.js";
import { computeMaxHpFromActor } from "./stat_actions.js";

const STAT_CHAR_ALLOC_FLOOR = 5;
const MAX_LEVEL = 60;

function getSkillCatalog() {
  return typeof globalThis.SKILL_CATALOG === "object" && globalThis.SKILL_CATALOG ? globalThis.SKILL_CATALOG : {};
}

function getClassSkillMaxRank(skillName) {
  const cat = getSkillCatalog()[skillName];
  if (cat && Array.isArray(cat.levels) && cat.levels.length > 0) return cat.levels.length;
  return 1;
}

function cumulativeCharPointsForBaseStat(targetBase) {
  const t = Math.floor(Number(targetBase));
  if (!Number.isFinite(t) || t <= STAT_CHAR_ALLOC_FLOOR) return 0;
  let cost = 0;
  for (let v = STAT_CHAR_ALLOC_FLOOR; v < t; v++) {
    cost += v < 100 ? 1 : 2;
  }
  return cost;
}

function totalCharPointsAllocatedOnActor(actor) {
  if (!actor || typeof actor !== "object") return 0;
  const base = (key) => {
    const v = actor[key];
    return typeof v === "number" && Number.isFinite(v) ? Math.floor(v) : STAT_CHAR_ALLOC_FLOOR;
  };
  return (
    cumulativeCharPointsForBaseStat(base("str")) +
    cumulativeCharPointsForBaseStat(base("dex")) +
    cumulativeCharPointsForBaseStat(base("vit")) +
    cumulativeCharPointsForBaseStat(base("int"))
  );
}

function totalSkillPointsSpentOnActor(actor) {
  if (!actor?.classSkillLevels || typeof actor.classSkillLevels !== "object") return 0;
  let spent = 0;
  Object.entries(actor.classSkillLevels).forEach(([name, slv]) => {
    if (typeof slv === "number" && slv > 0) {
      spent += Math.max(0, Math.min(getClassSkillMaxRank(name), Math.floor(slv)));
    }
  });
  return spent;
}

function earnedCharPointsAtLevel(actor, level) {
  const lv = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
  return actor?.allocPoolsCharV2 === true ? Math.max(0, (lv - 1) * 5) : lv * 5;
}

function getMaxLevel() {
  const cfg = loadGameConfig();
  const max = cfg?.leveling?.maxLevel;
  return typeof max === "number" && max > 0 ? Math.floor(max) : MAX_LEVEL;
}

function getLevelingConfig() {
  const cfg = loadGameConfig();
  return cfg?.leveling && typeof cfg.leveling === "object" ? cfg.leveling : {};
}

export function xpToNextLevel(level) {
  const lv = Math.floor(typeof level === "number" && level > 0 ? level : 1);
  const maxLv = getMaxLevel();
  if (lv >= maxLv) return 0;
  const c = getLevelingConfig();
  const a = typeof c.xpConst === "number" && Number.isFinite(c.xpConst) ? c.xpConst : 250;
  const lin = typeof c.xpLinear === "number" && Number.isFinite(c.xpLinear) ? c.xpLinear : 55;
  const sq = typeof c.xpSquare === "number" && Number.isFinite(c.xpSquare) ? c.xpSquare : 10;
  const cub = typeof c.xpCubic === "number" && Number.isFinite(c.xpCubic) ? c.xpCubic : 0.35;
  return Math.max(1, Math.round(a + lv * lin + lv * lv * sq + lv * lv * lv * cub));
}

function recomputeAllocPoolsFromLevel(actor) {
  if (!actor || typeof actor !== "object") return;
  const lv = typeof actor.level === "number" && actor.level >= 1 ? Math.floor(actor.level) : 1;
  const earnedChars = earnedCharPointsAtLevel(actor, lv);
  actor.charPoints = Math.max(0, earnedChars - totalCharPointsAllocatedOnActor(actor));
  actor.skillPoints = Math.max(0, lv - totalSkillPointsSpentOnActor(actor));
}

/**
 * Apply as many level-ups as current XP allows.
 * @returns {number} levels gained
 */
export function levelUpActor(actor) {
  if (!actor || typeof actor !== "object") return 0;
  const maxLv = getMaxLevel();
  const startLevel = typeof actor.level === "number" && actor.level >= 1 ? Math.floor(actor.level) : 1;
  if (typeof actor.xp !== "number" || !Number.isFinite(actor.xp) || actor.xp < 0) actor.xp = 0;
  while (actor.level < maxLv) {
    const need = xpToNextLevel(actor.level);
    if (need <= 0 || actor.xp < need) break;
    actor.xp -= need;
    actor.level++;
    actor.baseAttack = 10 + Math.max(0, actor.level - 1) * 2;
    actor.maxHp = computeMaxHpFromActor(actor);
    actor.hp = actor.maxHp;
  }
  recomputeAllocPoolsFromLevel(actor);
  return Math.max(0, (typeof actor.level === "number" ? Math.floor(actor.level) : startLevel) - startLevel);
}

/** Reconcile level/alloc pools when XP was granted without leveling (legacy online saves). */
export function reconcileActorLevelFromXp(actor) {
  return levelUpActor(actor);
}
