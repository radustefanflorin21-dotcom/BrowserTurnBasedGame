/**
 * Class skill upgrades (Phase B).
 */

import { loadGameConfig } from "../load_game_config.js";

function getSkillCatalog() {
  return typeof globalThis.SKILL_CATALOG === "object" && globalThis.SKILL_CATALOG ? globalThis.SKILL_CATALOG : {};
}

function getClassSkillMaxRank(skillName) {
  const cat = getSkillCatalog()[skillName];
  if (cat && Array.isArray(cat.levels) && cat.levels.length > 0) return cat.levels.length;
  return 5;
}

function getSkillCatalogUnlockLevel(skillName) {
  const cat = getSkillCatalog()[skillName];
  return cat && typeof cat.unlock === "number" && cat.unlock > 0 ? Math.floor(cat.unlock) : 1;
}

function getSkillRankStepByUnlockLevelBands() {
  const cfg = loadGameConfig();
  const bands = cfg?.leveling?.skillRankStepByUnlockLevel;
  return Array.isArray(bands) && bands.length
    ? bands
    : [
        { maxUnlockLevel: 10, step: 5 },
        { maxUnlockLevel: 20, step: 4 },
        { maxUnlockLevel: 30, step: 3 },
        { maxUnlockLevel: 40, step: 2 },
        { maxUnlockLevel: 55, step: 1 },
        { maxUnlockLevel: 60, step: 0 }
      ];
}

function getRankStepForSkillUnlockLevel(unlockLevel) {
  const lv = Math.max(1, Math.floor(typeof unlockLevel === "number" && unlockLevel > 0 ? unlockLevel : 1));
  const bands = getSkillRankStepByUnlockLevelBands();
  for (const band of bands) {
    const maxLv =
      typeof band.maxUnlockLevel === "number" && band.maxUnlockLevel > 0
        ? Math.floor(band.maxUnlockLevel)
        : 60;
    if (lv <= maxLv) {
      return typeof band.step === "number" && Number.isFinite(band.step) ? Math.max(0, band.step) : 5;
    }
  }
  return 0;
}

function getMinCharacterLevelForSkillAtRank(skillName, targetRank) {
  const r = Math.max(1, Math.floor(typeof targetRank === "number" && targetRank > 0 ? targetRank : 1));
  const unlockLv = getSkillCatalogUnlockLevel(skillName);
  const step = getRankStepForSkillUnlockLevel(unlockLv);
  if (r <= 1) return unlockLv;
  return unlockLv + (r - 1) * step;
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

function recomputeSkillPoints(actor) {
  const lv = typeof actor.level === "number" && actor.level >= 1 ? Math.floor(actor.level) : 1;
  actor.skillPoints = Math.max(0, lv - totalSkillPointsSpentOnActor(actor));
}

function getActorSkillLevel(actor, skillName) {
  if (!actor) return 0;
  if (skillName === "Basic Physical Attack" || skillName === "Basic Magical Attack") return 1;
  const map = actor.classSkillLevels && typeof actor.classSkillLevels === "object" ? actor.classSkillLevels : {};
  const lv = map[skillName];
  if (typeof lv !== "number" || !Number.isFinite(lv) || lv <= 0) return 0;
  return Math.max(0, Math.min(getClassSkillMaxRank(skillName), Math.floor(lv)));
}

function isClassSkill(skillName) {
  return !!(skillName && getSkillCatalog()[skillName]);
}

export function resolveSkillTarget(player, { target = "hero", companionSlotIndex = null }) {
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

export function applyUpgradeClassSkill(player, { skillName, target = "hero", companionSlotIndex = null }) {
  const name = typeof skillName === "string" ? skillName.trim() : "";
  if (!name || name === "Basic Physical Attack" || name === "Basic Magical Attack") {
    const err = new Error("Invalid skill.");
    err.status = 400;
    throw err;
  }
  if (!isClassSkill(name)) {
    const err = new Error("Unknown class skill.");
    err.status = 400;
    throw err;
  }
  const actor = resolveSkillTarget(player, { target, companionSlotIndex });
  if (!actor.classSkillLevels || typeof actor.classSkillLevels !== "object") actor.classSkillLevels = {};
  const cur = getActorSkillLevel(actor, name);
  const maxRank = getClassSkillMaxRank(name);
  const nextRank = cur + 1;
  if (nextRank > maxRank) {
    const err = new Error("Skill is already at max rank.");
    err.status = 400;
    throw err;
  }
  const actorLv = typeof actor.level === "number" && actor.level > 0 ? Math.floor(actor.level) : 1;
  const rankReq = getMinCharacterLevelForSkillAtRank(name, nextRank);
  if (actorLv < rankReq) {
    const err = new Error(`Requires character level ${rankReq}.`);
    err.status = 400;
    throw err;
  }
  if (typeof actor.skillPoints !== "number" || actor.skillPoints < 1) {
    const err = new Error("Not enough skill points.");
    err.status = 400;
    throw err;
  }
  actor.classSkillLevels[name] = nextRank;
  recomputeSkillPoints(actor);
  return { skillName: name, rank: nextRank };
}
