import { getEnemyDefByName, loadGameConfig } from "../load_game_config.js";
import { getFoeTauntDamageMult } from "./status.js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { inferMonsterCombatRole } = require("../../shared/monster_roles.js");
const { resolveSpawnHp } = require("../../shared/monster_hp.js");

function getMonsterScaling() {
  const cfg = loadGameConfig();
  return cfg?.monsterScaling && typeof cfg.monsterScaling === "object" ? cfg.monsterScaling : {};
}

function getMonsterRarityTier(def) {
  const raw = def?.spawnRarity?.trim?.()?.toLowerCase?.() || "";
  if (raw === "rare" || raw === "epic" || raw === "myth" || raw === "ancient") return raw;
  return "common";
}

function getMonsterStatRarityMultiplier(def) {
  const ms = getMonsterScaling();
  const map = ms.rarityStatBudgetMultipliers || ms.rarityDifficultyModifiers || {};
  const v = map[getMonsterRarityTier(def)];
  return typeof v === "number" && v > 0 ? v : 1;
}

export function getMonsterRarityHpMultiplier(def) {
  const ms = getMonsterScaling();
  const map = ms.rarityHpMultipliers || {};
  const v = map[getMonsterRarityTier(def)];
  return typeof v === "number" && v > 0 ? v : 1;
}

function computeMonsterStatBudget(level, def) {
  const lv = Math.max(1, Math.floor(level || 1));
  const customMult =
    def?.statBudgetMultiplier > 0 && Number.isFinite(def.statBudgetMultiplier) ? def.statBudgetMultiplier : 1;
  const rarityMult = getMonsterStatRarityMultiplier(def || { spawnRarity: "common" });
  return Math.max(4, Math.round((6 + lv * 8) * rarityMult * customMult));
}

export function getEnemyCombatRoleKey(def) {
  if (def?.combatRole?.trim) {
    let k = def.combatRole.trim().toLowerCase();
    if (k === "heart_harasser") k = "harasser";
    if (k === "heart_buffer") k = "buffer";
    const cfg = loadGameConfig();
    const roles = cfg?.enemyRoles;
    if (roles && roles[k]) return k;
  }
  const sid = def?.combatScript?.trim?.() || "";
  return inferMonsterCombatRole(sid);
}

export function buildMonsterCharacteristics(level, roleKey, def) {
  const budget = computeMonsterStatBudget(level, def);
  const cfg = loadGameConfig();
  const roles = cfg?.enemyRoles && typeof cfg.enemyRoles === "object" ? cfg.enemyRoles : {};
  const w = roles[roleKey] || roles.bruiser || { STR: 0.4, DEX: 0.2, VIT: 0.3, INT: 0.1 };
  const out = {
    str: Math.round(budget * (w.STR ?? 0)),
    dex: Math.round(budget * (w.DEX ?? 0)),
    vit: Math.round(budget * (w.VIT ?? 0)),
    int: Math.round(budget * (w.INT ?? 0))
  };
  const diff = budget - (out.str + out.dex + out.vit + out.int);
  if (diff !== 0) {
    const primary =
      roleKey === "tank"
        ? "vit"
        : roleKey === "assassin" || roleKey === "harasser"
          ? "dex"
          : roleKey === "mage" || roleKey === "controller" || roleKey === "support" || roleKey === "summoner" || roleKey === "buffer"
            ? "int"
            : "str";
    out[primary] = Math.max(0, out[primary] + diff);
  }
  return out;
}

function applyEnemyBaseStatOverrides(stats, def) {
  const statOverride = def?.baseStats && typeof def.baseStats === "object" ? def.baseStats : null;
  if (!statOverride) return stats;
  const out = { ...stats };
  for (const key of ["str", "dex", "vit", "int"]) {
    if (typeof statOverride[key] === "number" && Number.isFinite(statOverride[key])) {
      out[key] = Math.max(1, Math.floor(statOverride[key]));
    }
  }
  return out;
}

/** HP from level + VIT tier curve, rarity, optional region scale and mood mult; optional def.baseHp override. */
export function resolveEnemySpawnHp(level, stats, def, opts = {}) {
  const ms = getMonsterScaling();
  const roleKey = opts.roleKey || getEnemyCombatRoleKey(def);
  return resolveSpawnHp(level, stats, def, ms, { ...opts, roleKey });
}

/** Stat budget + role split (+ optional overrides) and spawn HP for one enemy def. */
export function buildEnemySpawnStats(level, def, opts = {}) {
  const roleKey = getEnemyCombatRoleKey(def);
  const stats = applyEnemyBaseStatOverrides(buildMonsterCharacteristics(level, roleKey, def), def);
  const hp = resolveEnemySpawnHp(level, stats, def, { ...opts, roleKey });
  return { roleKey, stats, hp };
}

function inferMonsterAttackArchetype(roleKey) {
  if (roleKey === "mage" || roleKey === "summoner") return "magical";
  if (roleKey === "controller" || roleKey === "support") return "hybrid";
  return "physical";
}

/** Mirrors client getFoeEffectiveAttackForCombat (simplified). */
export function getFoeEffectiveAttack(foe) {
  const ms = getMonsterScaling();
  const def = foe?.name ? getEnemyDefByName(foe.name) : null;
  const overrideAtk =
    def?.attackOverride > 0 && Number.isFinite(def.attackOverride) ? def.attackOverride : null;
  const roleKey = getEnemyCombatRoleKey(def);
  const level = foe?.level > 0 ? Math.floor(foe.level) : 1;
  const basePerLevel = ms.attackLevelBasePerLevel ?? 3.4;
  const baseAttackMult = Math.max(0.5, ms.basicAttackGlobalMultiplier ?? 1.18);
  const str = foe.str ?? 0;
  const intv = foe.int ?? 0;
  const dex = foe.dex ?? 0;
  const atkType = inferMonsterAttackArchetype(roleKey);
  let base = basePerLevel * level;
  if (atkType === "physical") {
    base += str * (ms.physicalAtkStrCoeff ?? 0.62) + intv * (ms.physicalAtkIntCoeff ?? 0.22) + dex * (ms.physicalAtkDexCoeff ?? 0.14);
  } else if (atkType === "magical") {
    base += intv * (ms.magicalAtkIntCoeff ?? 0.62) + str * (ms.magicalAtkStrCoeff ?? 0.22) + dex * (ms.magicalAtkDexCoeff ?? 0.08);
  } else {
    base += str * (ms.hybridAtkStrCoeff ?? 0.44) + intv * (ms.hybridAtkIntCoeff ?? 0.44) + dex * (ms.hybridAtkDexCoeff ?? 0.11);
  }
  const moodAttackMult = foe.moodAttackMult > 0 ? foe.moodAttackMult : 1;
  const moodAttackBonus = Number.isFinite(foe.moodAttackBonus) ? foe.moodAttackBonus : 0;
  if (overrideAtk != null) return Math.max(1, Math.floor(overrideAtk));
  let a = Math.max(1, Math.floor(base * baseAttackMult * moodAttackMult + moodAttackBonus));
  if (foe.combat?.script === "tusk_boar" && foe.combat.rageStacks > 0) {
    a = Math.max(1, Math.floor(a * (1 + 0.05 * foe.combat.rageStacks)));
  }
  if (foe.combat?.script === "gorilla" && foe.combat.gorillaRampStacks > 0) {
    a = Math.max(1, Math.floor(a * (1 + 0.1 * Math.min(6, foe.combat.gorillaRampStacks))));
  }
  return a;
}

export function getFoeOutgoingDamageMult(st, foe) {
  let mult = 1;
  const wmc = st?.worldMapContext;
  if (wmc?.enemyDamageMult > 0 && Number.isFinite(wmc.enemyDamageMult)) {
    mult *= wmc.enemyDamageMult;
  }
  mult *= getFoeTauntDamageMult(foe);
  const c = foe?.combat;
  if (c && (c.allyPressureTurns || 0) > 0 && (c.allyPressurePct || 0) > 0) {
    mult *= 1 + Math.max(0, Math.min(50, c.allyPressurePct)) / 100;
  }
  if (c) {
    let down = 0;
    if ((c.physDmgDownTurns || 0) > 0) down = Math.max(down, c.physDmgDownPct || 0);
    if ((c.magDmgDownTurns || 0) > 0) down = Math.max(down, c.magDmgDownPct || 0);
    if (down > 0) mult *= Math.max(0.5, 1 - Math.min(50, down) / 100);
    if (typeof c.outgoingDamageBonusPct === "number" && c.outgoingDamageBonusPct > 0) {
      mult *= 1 + Math.max(0, Math.min(50, c.outgoingDamageBonusPct)) / 100;
    }
  }
  return mult;
}
