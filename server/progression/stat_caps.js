/**
 * Server-side progression caps for roster merge (Phase A).
 * Validates characteristic / skill point spend and recomputes derived stats.
 */

import { loadGameConfig } from "../load_game_config.js";
import { sumEquippedBonusStats } from "../combat/formulas.js";

const STAT_CHAR_ALLOC_FLOOR = 5;
const STAT_CHAR_PREMIUM_THRESHOLD = 100;
const MAX_LEVEL = 60;

function getSkillCatalog() {
  return typeof globalThis.SKILL_CATALOG === "object" && globalThis.SKILL_CATALOG ? globalThis.SKILL_CATALOG : {};
}

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

function cumulativeCharPointsForBaseStat(targetBase) {
  const t = Math.floor(Number(targetBase));
  if (!Number.isFinite(t) || t <= STAT_CHAR_ALLOC_FLOOR) return 0;
  let cost = 0;
  for (let v = STAT_CHAR_ALLOC_FLOOR; v < t; v++) {
    cost += v < STAT_CHAR_PREMIUM_THRESHOLD ? 1 : 2;
  }
  return cost;
}

function totalCharPointsAllocatedOnActor(actor) {
  if (!actor || typeof actor !== "object") return 0;
  return (
    cumulativeCharPointsForBaseStat(getActorStatBase(actor, "str")) +
    cumulativeCharPointsForBaseStat(getActorStatBase(actor, "dex")) +
    cumulativeCharPointsForBaseStat(getActorStatBase(actor, "vit")) +
    cumulativeCharPointsForBaseStat(getActorStatBase(actor, "int"))
  );
}

function getClassSkillMaxRank(skillName) {
  const cat = getSkillCatalog()[skillName];
  if (cat && Array.isArray(cat.levels) && cat.levels.length > 0) return cat.levels.length;
  return 5;
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

function computeMaxHp(actor) {
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

function copyAuthBaseStats(actor, auth) {
  actor.str = getActorStatBase(auth, "str");
  actor.dex = getActorStatBase(auth, "dex");
  actor.vit = getActorStatBase(auth, "vit");
  actor.int = getActorStatBase(auth, "int");
}

function clampSkillLevels(actor, auth, level, violations) {
  const lv = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
  const authMap =
    auth?.classSkillLevels && typeof auth.classSkillLevels === "object" ? auth.classSkillLevels : {};
  const next = {};
  const incoming =
    actor?.classSkillLevels && typeof actor.classSkillLevels === "object" ? actor.classSkillLevels : {};

  Object.entries(incoming).forEach(([name, slv]) => {
    if (typeof slv !== "number" || slv <= 0) return;
    const cap = getClassSkillMaxRank(name);
    const rank = Math.max(0, Math.min(cap, Math.floor(slv)));
    const authRank =
      typeof authMap[name] === "number" && authMap[name] > 0 ? Math.floor(authMap[name]) : 0;
    if (rank >= authRank) next[name] = rank;
  });

  Object.entries(authMap).forEach(([name, slv]) => {
    if (typeof slv !== "number" || slv <= 0) return;
    if (next[name] == null) next[name] = Math.floor(slv);
  });

  let spent = totalSkillPointsSpentOnActor({ classSkillLevels: next });
  if (spent > lv) {
    actor.classSkillLevels =
      auth?.classSkillLevels && typeof auth.classSkillLevels === "object"
        ? JSON.parse(JSON.stringify(auth.classSkillLevels))
        : {};
    actor.skillPoints = Math.max(0, lv - totalSkillPointsSpentOnActor(actor));
    violations.push({
      severity: "clamp",
      code: "SKILL_POINTS",
      message: "Skill ranks capped to level allowance."
    });
    return;
  }

  actor.classSkillLevels = next;
  actor.skillPoints = Math.max(0, lv - spent);
}

/**
 * Clamp base stats, skill ranks, and maxHp to what level + spend curves allow.
 * @param {object} actor - merged player (mutated)
 * @param {object|null} auth - authoritative snapshot
 * @param {Array} violations
 */
export function sanitizePlayerProgressionStats(actor, auth, violations = []) {
  if (!actor || typeof actor !== "object") return;
  const level = Math.max(
    1,
    Math.min(MAX_LEVEL, Math.floor(Number(actor.level) || 1))
  );
  actor.level = level;

  const earnedChars = earnedCharPointsAtLevel(actor, level);
  let allocated = totalCharPointsAllocatedOnActor(actor);
  const authAllocated = auth ? totalCharPointsAllocatedOnActor(auth) : 0;

  if (allocated > earnedChars || allocated < authAllocated) {
    if (auth) copyAuthBaseStats(actor, auth);
    else {
      actor.str = STAT_CHAR_ALLOC_FLOOR;
      actor.dex = STAT_CHAR_ALLOC_FLOOR;
      actor.vit = STAT_CHAR_ALLOC_FLOOR;
      actor.int = STAT_CHAR_ALLOC_FLOOR;
    }
    violations.push({
      severity: "clamp",
      code: "CHAR_POINTS",
      message: "Base stats reverted to server allowance."
    });
    allocated = totalCharPointsAllocatedOnActor(actor);
  } else if (auth) {
    ["str", "dex", "vit", "int"].forEach((key) => {
      const floor = getActorStatBase(auth, key);
      const cur = getActorStatBase(actor, key);
      if (cur < floor) actor[key] = floor;
    });
    allocated = totalCharPointsAllocatedOnActor(actor);
  }

  actor.charPoints = Math.max(0, earnedChars - allocated);
  actor.baseAttack = 10 + Math.max(0, level - 1) * 2;

  clampSkillLevels(actor, auth, level, violations);

  const computedMaxHp = computeMaxHp(actor);
  if (typeof actor.maxHp !== "number" || actor.maxHp > computedMaxHp) {
    if (typeof actor.maxHp === "number" && actor.maxHp > computedMaxHp) {
      violations.push({
        severity: "clamp",
        code: "MAX_HP",
        message: "Max HP capped to server formula."
      });
    }
    actor.maxHp = computedMaxHp;
  } else {
    actor.maxHp = Math.max(1, Math.floor(actor.maxHp));
  }

  const hp = Math.floor(Number(actor.hp) || 0);
  actor.hp = Math.min(Math.max(1, hp), actor.maxHp);

  if (Array.isArray(actor.companions)) {
    actor.companions.forEach((comp, idx) => {
      if (!comp || typeof comp !== "object") return;
      const authComp = auth?.companions?.[idx];
      sanitizePlayerProgressionStats(comp, authComp || null, violations);
    });
  }
}
