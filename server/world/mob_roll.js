/**
 * Deterministic overworld mob composition rolls (server-authoritative).
 */
import { createRequire } from "node:module";
import { loadGameConfig, getEnemyDefByName } from "../load_game_config.js";
import { getBiomeDefAt } from "../progression/world_map.js";

const require = createRequire(import.meta.url);
const { createCombatRng } = require("../../shared/combat_rng.js");

const MOB_SIZE_MIN = 1;
const MOB_SIZE_MAX = 8;
const MOB_DIFFICULTY_LEVEL_VARIANCE = 0.25;
const MOB_DIFFICULTY_TIER_LABELS = ["easy", "medium", "hard"];
const ENEMY_MOOD_SPAWN_CHANCE = 0.1;
const ENEMY_SPAWN_RARITY_ORDER = ["common", "rare", "epic", "myth", "ancient"];

function cellSlotSeed(x, y, slotIndex) {
  const s = `${Math.floor(x)}|${Math.floor(y)}|${Math.floor(slotIndex)}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function normalizeEnemySpawnRarity(raw) {
  const s = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (ENEMY_SPAWN_RARITY_ORDER.includes(s)) return s;
  return "common";
}

function getWorldMapEncounterGroupSizeBounds(slotIndex) {
  const si = typeof slotIndex === "number" && Number.isFinite(slotIndex) ? Math.floor(slotIndex) : 0;
  const s = ((si % 3) + 3) % 3;
  if (s === 0) return { minC: 1, maxC: 3 };
  if (s === 1) return { minC: 3, maxC: 6 };
  return { minC: 5, maxC: 8 };
}

function getDifficultyAnchorForSlot(biomeLike, slotIndex) {
  const md = biomeLike && biomeLike.mobDifficulty;
  if (!md || typeof md !== "object") return null;
  const easy = typeof md.easy === "number" ? md.easy : NaN;
  const med = typeof md.medium === "number" ? md.medium : NaN;
  const hard = typeof md.hard === "number" ? md.hard : NaN;
  if (![easy, med, hard].every((n) => Number.isFinite(n) && n > 0)) return null;
  return [easy, med, hard][slotIndex % 3];
}

function difficultyTotalLevelRangeFromAnchor(d) {
  if (!Number.isFinite(d) || d <= 0) return { minL: 1, maxL: 1 };
  const lo = d * (1 - MOB_DIFFICULTY_LEVEL_VARIANCE);
  const hi = d * (1 + MOB_DIFFICULTY_LEVEL_VARIANCE);
  const minL = Math.max(1, Math.ceil(lo));
  const maxL = Math.max(minL, Math.floor(hi));
  return { minL, maxL };
}

function getNumericLevelsForDef(def) {
  const levels = def && def.possibleLevels;
  if (!Array.isArray(levels) || !levels.length) return null;
  const nums = [
    ...new Set(
      levels
        .filter((lv) => typeof lv === "number" && Number.isFinite(lv) && lv >= 1)
        .map((x) => Math.floor(x))
    )
  ].sort((a, b) => a - b);
  return nums.length ? nums : null;
}

function minLevelDef(def) {
  const ch = getNumericLevelsForDef(def);
  return ch ? ch[0] : 1;
}

function maxLevelDef(def) {
  const ch = getNumericLevelsForDef(def);
  return ch ? ch[ch.length - 1] : 200;
}

function minSumForDefs(defs) {
  return defs.reduce((s, d) => s + minLevelDef(d), 0);
}

function maxSumForDefs(defs) {
  return defs.reduce((s, d) => s + maxLevelDef(d), 0);
}

function createRoller(rng, gameConfig) {
  function randomFrom(arr) {
    if (!arr || !arr.length) return null;
    return arr[rng.int(0, arr.length - 1)];
  }

  function pickRandomCountInRange(minC, maxC) {
    return rng.int(Math.max(1, Math.floor(minC)), Math.max(Math.floor(minC), Math.floor(maxC)));
  }

  function getNeutralEnemyMood() {
    return { id: null, name: "", attackBonus: 0, attackMult: 1, hpMult: 1, damageTakenMult: 1, description: "" };
  }

  function pickMoodFromEnemyDef(def) {
    if (!rng.chance(ENEMY_MOOD_SPAWN_CHANCE * 100)) return getNeutralEnemyMood();
    const moods = gameConfig.enemyMoods;
    const ids = def && def.possibleMoods;
    if (Array.isArray(ids) && ids.length) {
      const id = randomFrom(ids);
      const m = Array.isArray(moods) ? moods.find((x) => x.id === id) : null;
      if (m) return m;
    }
    if (Array.isArray(moods) && moods.length) return randomFrom(moods);
    return getNeutralEnemyMood();
  }

  function pickLevelFromEnemyDef(def) {
    const levels = def && def.possibleLevels;
    if (Array.isArray(levels) && levels.length) {
      const lv = randomFrom(levels);
      if (typeof lv === "number" && Number.isFinite(lv)) return Math.max(1, Math.floor(lv));
    }
    return 1;
  }

  function pickRandomEnemyNameFromPool(pool) {
    if (!pool || !pool.length) return null;
    const cfg = gameConfig.enemySpawnRarityWeights;
    const weighted = [];
    let sum = 0;
    for (const name of pool) {
      const def = getEnemyDefByName(name);
      const tier = normalizeEnemySpawnRarity(def && def.spawnRarity);
      const baseWeight =
        cfg && typeof cfg === "object" && typeof cfg[tier] === "number" && Number.isFinite(cfg[tier])
          ? Math.max(0, cfg[tier])
          : 0;
      const w = Math.max(0, baseWeight > 0 ? baseWeight : 1);
      weighted.push({ name, w });
      sum += w;
    }
    if (sum <= 0) return randomFrom(pool);
    let r = rng.next() * sum;
    for (const entry of weighted) {
      r -= entry.w;
      if (r <= 0) return entry.name;
    }
    return weighted[weighted.length - 1] ? weighted[weighted.length - 1].name : randomFrom(pool);
  }

  function shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = rng.int(0, i);
      const t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  function candidateLevelsForDefSlot(def, minLv, maxLv) {
    const choices = getNumericLevelsForDef(def);
    if (choices) {
      const pool = choices.filter((lv) => lv >= minLv && lv <= maxLv);
      shuffleInPlace(pool);
      return pool;
    }
    const span = maxLv - minLv + 1;
    if (span <= 48) {
      const order = [];
      for (let lv = minLv; lv <= maxLv; lv++) order.push(lv);
      shuffleInPlace(order);
      return order;
    }
    const order = [];
    for (let t = 0; t < 48; t++) order.push(minLv + rng.int(0, span - 1));
    return order;
  }

  function assignLevelsToTargetSum(defs, target) {
    const n = defs.length;
    if (n === 0) return null;
    if (target < minSumForDefs(defs) || target > maxSumForDefs(defs)) return null;

    function dfs(i, remaining) {
      if (i === n) return remaining === 0 ? [] : null;
      const def = defs[i];
      const rest = defs.slice(i + 1);
      const minRest = minSumForDefs(rest);
      const maxRest = maxSumForDefs(rest);
      const minLv = Math.max(minLevelDef(def), remaining - maxRest);
      const maxLv = Math.min(maxLevelDef(def), remaining - minRest);
      if (minLv > maxLv) return null;
      const candidates = candidateLevelsForDefSlot(def, minLv, maxLv);
      for (const lv of candidates) {
        const sub = dfs(i + 1, remaining - lv);
        if (sub) return [lv, ...sub];
      }
      return null;
    }

    return dfs(0, target);
  }

  function pickTargetTotalLevel(minT, maxT, defs) {
    const minS = minSumForDefs(defs);
    const maxS = maxSumForDefs(defs);
    const lo = Math.max(minT, minS);
    const hi = Math.min(maxT, maxS);
    if (lo > hi) {
      const mid = Math.floor((minT + maxT) / 2);
      return Math.max(minS, Math.min(maxS, mid));
    }
    return rng.int(lo, hi);
  }

  function rollWorldMapMobCompositionNoAnchor(pool, slotIndex) {
    const { minC, maxC } = getWorldMapEncounterGroupSizeBounds(slotIndex);
    const count = pickRandomCountInRange(minC, maxC);
    const units = [];
    for (let i = 0; i < count; i++) {
      const name = pickRandomEnemyNameFromPool(pool) || randomFrom(pool);
      const def = getEnemyDefByName(name);
      if (!def) continue;
      const mood = pickMoodFromEnemyDef(def);
      const level = pickLevelFromEnemyDef(def);
      units.push({ name: def.name, level, moodId: mood.id, moodName: mood.name });
    }
    if (!units.length && pool.length) {
      const name = pickRandomEnemyNameFromPool(pool) || randomFrom(pool);
      const def = getEnemyDefByName(name);
      if (def) {
        const mood = pickMoodFromEnemyDef(def);
        const level = pickLevelFromEnemyDef(def);
        units.push({ name: def.name, level, moodId: mood.id, moodName: mood.name });
      }
    }
    const mobTotalLevel = units.reduce((s, u) => s + (typeof u.level === "number" ? u.level : 0), 0);
    const si = typeof slotIndex === "number" && Number.isFinite(slotIndex) ? Math.floor(slotIndex) : 0;
    const tier = MOB_DIFFICULTY_TIER_LABELS[((si % 3) + 3) % 3];
    return { units, mobTotalLevel, difficultyTier: tier, difficultyAnchor: null };
  }

  function rollMobCompositionFallback(pool, anchor, tier, minTotal, maxTotal, slotIndex) {
    const { minC, maxC } = getWorldMapEncounterGroupSizeBounds(slotIndex);
    for (let count = maxC; count >= minC; count--) {
      const defs = [];
      for (let i = 0; i < count; i++) {
        const name = pickRandomEnemyNameFromPool(pool) || randomFrom(pool);
        const def = getEnemyDefByName(name);
        if (def) defs.push(def);
      }
      if (!defs.length) continue;
      const targetTotal = pickTargetTotalLevel(minTotal, maxTotal, defs);
      const levels = assignLevelsToTargetSum(defs, targetTotal);
      if (!levels) continue;
      const units = [];
      let sum = 0;
      for (let i = 0; i < defs.length; i++) {
        const def = defs[i];
        const mood = pickMoodFromEnemyDef(def);
        const level = levels[i];
        sum += level;
        units.push({ name: def.name, level, moodId: mood.id, moodName: mood.name });
      }
      return { units, mobTotalLevel: sum, difficultyTier: tier, difficultyAnchor: anchor };
    }
    const name = pickRandomEnemyNameFromPool(pool) || randomFrom(pool);
    const def = getEnemyDefByName(name);
    if (!def) return { units: [], mobTotalLevel: 0, difficultyTier: tier, difficultyAnchor: anchor };
    const mood = pickMoodFromEnemyDef(def);
    const ch = getNumericLevelsForDef(def);
    let level;
    if (ch) {
      const valid = ch.filter((l) => l >= minTotal && l <= maxTotal);
      if (valid.length) level = randomFrom(valid);
      else
        level = ch.reduce((best, l) => {
          const da = Math.abs(l - anchor);
          const db = Math.abs(best - anchor);
          return da < db ? l : best;
        }, ch[0]);
    } else {
      level = rng.int(minTotal, maxTotal);
    }
    return {
      units: [{ name, level, moodId: mood.id, moodName: mood.name }],
      mobTotalLevel: level,
      difficultyTier: tier,
      difficultyAnchor: anchor
    };
  }

  function rollMobComposition(pool, slotIndex, biomeLike) {
    const anchor =
      biomeLike != null && typeof slotIndex === "number"
        ? getDifficultyAnchorForSlot(biomeLike, slotIndex)
        : null;

    if (anchor == null) {
      return rollWorldMapMobCompositionNoAnchor(pool, slotIndex);
    }

    const { minL: minTotal, maxL: maxTotal } = difficultyTotalLevelRangeFromAnchor(anchor);
    const tier = MOB_DIFFICULTY_TIER_LABELS[slotIndex % 3];
    const sizeBounds = getWorldMapEncounterGroupSizeBounds(slotIndex);

    for (let attempt = 0; attempt < 40; attempt++) {
      const count = pickRandomCountInRange(sizeBounds.minC, sizeBounds.maxC);
      const defs = [];
      for (let i = 0; i < count; i++) {
        const name = pickRandomEnemyNameFromPool(pool) || randomFrom(pool);
        const def = getEnemyDefByName(name);
        if (def) defs.push(def);
      }
      if (!defs.length) continue;
      const targetTotal = pickTargetTotalLevel(minTotal, maxTotal, defs);
      const levels = assignLevelsToTargetSum(defs, targetTotal);
      if (!levels) continue;
      const units = [];
      let sum = 0;
      for (let i = 0; i < defs.length; i++) {
        const def = defs[i];
        const mood = pickMoodFromEnemyDef(def);
        const level = levels[i];
        sum += level;
        units.push({ name: def.name, level, moodId: mood.id, moodName: mood.name });
      }
      return { units, mobTotalLevel: sum, difficultyTier: tier, difficultyAnchor: anchor };
    }
    return rollMobCompositionFallback(pool, anchor, tier, minTotal, maxTotal, slotIndex);
  }

  return { rollMobComposition };
}

/**
 * Roll mob preview for a map cell slot (deterministic per tile + slot).
 */
export function rollSharedMobPreview(x, y, slotIndex) {
  const biome = getBiomeDefAt(x, y);
  const pool = biome && Array.isArray(biome.possibleEnemies) ? biome.possibleEnemies : [];
  if (!pool.length) return null;
  loadGameConfig();
  const rng = createCombatRng(cellSlotSeed(x, y, slotIndex));
  const roller = createRoller(rng, global.GAME_CONFIG);
  const roll = roller.rollMobComposition(pool, slotIndex, biome);
  if (!roll || !Array.isArray(roll.units) || !roll.units.length) return null;
  return roll;
}
