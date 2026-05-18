import { getEnemyDefByName, loadGameConfig } from "../load_game_config.js";

const MOOD_XP_BONUS_MULT = 1.12;
const MOOD_LOOT_DROP_RATE_MULT = 1.1;
const COMPANION_LOOT_CHANCE_MULT = 0.75;

function getLootDropSettings() {
  const cfg = loadGameConfig();
  return cfg?.lootDropSettings && typeof cfg.lootDropSettings === "object" ? cfg.lootDropSettings : {};
}

function getMonsterLootDropTable(def) {
  const cfg = loadGameConfig();
  const tables = cfg?.monsterDropTables;
  if (!tables || !def?.name) return null;
  return tables[def.name] || null;
}

function hasActiveMood(foe) {
  return !!(foe && foe.moodId);
}

function rollItemDropEntry(rng, entry, dropRateMult) {
  if (typeof entry === "string") {
    const t = entry.trim();
    return t || null;
  }
  if (!entry || typeof entry.name !== "string") return null;
  const name = entry.name.trim();
  if (!name) return null;
  let pct = entry.dropRate;
  if (pct == null || pct === "") pct = 100;
  pct = Number(pct);
  if (!Number.isFinite(pct)) return null;
  const mult = Number.isFinite(dropRateMult) && dropRateMult > 0 ? dropRateMult : 1;
  pct = Math.max(0, Math.min(100, pct * mult));
  if (pct <= 0) return null;
  if (pct >= 100) return name;
  return rng.chance(pct) ? name : null;
}

function rollGoldDrop(rng, spec) {
  if (spec == null) return 0;
  if (typeof spec === "number" && Number.isFinite(spec)) return Math.max(0, Math.floor(spec));
  if (typeof spec === "object" && spec !== null) {
    const a = typeof spec.min === "number" ? spec.min : 0;
    const b = typeof spec.max === "number" ? spec.max : a;
    const lo = Math.max(0, Math.floor(Math.min(a, b)));
    const hi = Math.max(0, Math.floor(Math.max(a, b)));
    if (hi < lo) return lo;
    return rng.int(lo, hi);
  }
  return 0;
}

function getDefaultGoldSpec(def) {
  const s = getLootDropSettings();
  const byRarity = s.defaultGoldByRarity || {};
  const rarityId = def?.spawnRarity?.trim?.()?.toLowerCase?.() || "common";
  return byRarity[rarityId] || byRarity.common || { min: 10, max: 20 };
}

function getBaseGearDropChanceForMonsterLevel(level) {
  const lv = Math.max(1, Math.floor(level || 1));
  const rows = getLootDropSettings().gearBaseChanceByMaxLevel;
  if (!Array.isArray(rows) || !rows.length) {
    if (lv <= 10) return 0.1;
    if (lv <= 20) return 0.06;
    if (lv <= 30) return 0.03;
    if (lv <= 40) return 0.012;
    return 0.004;
  }
  for (const row of rows) {
    const cap = row?.maxLevel > 0 ? Math.floor(row.maxLevel) : 999;
    const ch = typeof row.chance === "number" ? row.chance : 0;
    if (lv <= cap) return Math.max(0, Math.min(1, ch));
  }
  return 0.004;
}

function rollLootGearRarityTier(rng) {
  const rw = getLootDropSettings().rarityWeights;
  if (!Array.isArray(rw) || !rw.length) return "common";
  let sum = 0;
  for (const row of rw) {
    sum += row?.weight > 0 ? row.weight : 0;
  }
  if (sum <= 0) return "common";
  let r = rng.next() * sum;
  for (const row of rw) {
    const w = row?.weight > 0 ? row.weight : 0;
    r -= w;
    if (r <= 0) return typeof row.id === "string" && row.id ? row.id : "common";
  }
  return "common";
}

function resolveGearItemFromDropEntry(entry, foeLevel) {
  const lv = Math.max(1, Math.floor(foeLevel || 1));
  if (entry?.item && typeof entry.item === "string") return entry.item.trim();
  const vars = entry?.v || entry?.variants;
  if (Array.isArray(vars) && vars.length) {
    const sorted = vars.slice().sort((a, b) => (a.maxLevel ?? 99) - (b.maxLevel ?? 99));
    for (const seg of sorted) {
      const cap = typeof seg.maxLevel === "number" ? seg.maxLevel : 99;
      if (lv <= cap) return String(seg.item || "").trim();
    }
    return String(sorted[sorted.length - 1].item || "").trim();
  }
  return null;
}

function rollWeightedGearFromMonsterTable(rng, gearEntries, foeLevel) {
  if (!Array.isArray(gearEntries) || !gearEntries.length) return null;
  let sum = 0;
  const weights = gearEntries.map((g) => {
    const w = typeof g.w === "number" ? g.w : typeof g.weight === "number" ? g.weight : 0;
    const ww = Math.max(0, w);
    sum += ww;
    return ww;
  });
  if (sum <= 0) return null;
  let r = rng.next() * sum;
  for (let i = 0; i < gearEntries.length; i++) {
    r -= weights[i];
    if (r <= 0) return resolveGearItemFromDropEntry(gearEntries[i], foeLevel);
  }
  return resolveGearItemFromDropEntry(gearEntries[gearEntries.length - 1], foeLevel);
}

function rollMaterialPassCount(rng) {
  const s = getLootDropSettings();
  const lo = typeof s.materialPassesMin === "number" ? Math.max(1, Math.floor(s.materialPassesMin)) : 1;
  const hi = typeof s.materialPassesMax === "number" ? Math.max(lo, Math.floor(s.materialPassesMax)) : 2;
  if (hi <= lo) return lo;
  return rng.int(lo, hi);
}

function makeRarityItemInstanceName(baseName, rarityId) {
  const base = String(baseName || "").trim();
  if (!base) return "";
  const rarity = String(rarityId || "common").trim().toLowerCase() || "common";
  return `${base}@@${rarity}`;
}

function getMonsterMaterialCondition(mat) {
  if (!mat || typeof mat !== "object") return "";
  const raw =
    typeof mat.condition === "string"
      ? mat.condition
      : typeof mat.requiredProfession === "string"
        ? mat.requiredProfession
        : "";
  return raw.trim().toLowerCase();
}

function canRollConditionedMonsterMaterial(mat, player) {
  const cond = getMonsterMaterialCondition(mat);
  if (!cond || cond === "none" || cond === "any") return true;
  const selected = [];
  const profs = player?.professions?.selected;
  if (Array.isArray(profs)) profs.forEach((id) => selected.push(String(id || "").trim().toLowerCase()));
  return selected.includes(cond);
}

function collectMonsterTableLootForFoe(rng, foe, def, moodLootMult, companionEntries, player) {
  const table = getMonsterLootDropTable(def);
  const hero = [];
  const companionBySlot = {};
  if (!table) return { hero, companionBySlot };

  const ml = Math.max(1, Math.floor(foe?.level || 1));
  const mult = moodLootMult > 0 ? moodLootMult : 1;
  companionEntries.forEach(({ slotIndex }) => {
    if (Number.isFinite(slotIndex)) companionBySlot[slotIndex] = [];
  });

  const pGear = Math.min(0.999999, getBaseGearDropChanceForMonsterLevel(ml) * mult);
  if (rng.chance(pGear * 100)) {
    const picked = rollWeightedGearFromMonsterTable(rng, table.gear, ml);
    if (picked) hero.push(makeRarityItemInstanceName(picked, rollLootGearRarityTier(rng)));
  }

  const passMaterials = [];
  const perKillMaterials = [];
  (table.materials || []).forEach((mat) => {
    if (!mat?.name) return;
    const isConditioned = getMonsterMaterialCondition(mat);
    if (mat.perKill || isConditioned) perKillMaterials.push(mat);
    else passMaterials.push(mat);
  });

  const passes = rollMaterialPassCount(rng);
  for (let p = 0; p < passes; p++) {
    passMaterials.forEach((mat) => {
      const rolled = rollItemDropEntry(rng, { name: mat.name.trim(), dropRate: mat.dropRate }, mult);
      if (rolled) hero.push(rolled);
    });
  }
  perKillMaterials.forEach((mat) => {
    if (!canRollConditionedMonsterMaterial(mat, player)) return;
    const rolled = rollItemDropEntry(rng, { name: mat.name.trim(), dropRate: mat.dropRate }, mult);
    if (rolled) hero.push(rolled);
  });

  companionEntries.forEach(({ slotIndex }) => {
    const bucket = companionBySlot[slotIndex] || (companionBySlot[slotIndex] = []);
    const companionMult = mult * COMPANION_LOOT_CHANCE_MULT;
    const companionGearChance = Math.min(0.999999, getBaseGearDropChanceForMonsterLevel(ml) * companionMult);
    if (rng.chance(companionGearChance * 100)) {
      const picked = rollWeightedGearFromMonsterTable(rng, table.gear, ml);
      if (picked) bucket.push(makeRarityItemInstanceName(picked, rollLootGearRarityTier(rng)));
    }
    const companionPasses = rollMaterialPassCount(rng);
    for (let p = 0; p < companionPasses; p++) {
      passMaterials.forEach((mat) => {
        const rolled = rollItemDropEntry(rng, { name: mat.name.trim(), dropRate: mat.dropRate }, companionMult);
        if (rolled) bucket.push(rolled);
      });
    }
    perKillMaterials.forEach((mat) => {
      const cond = getMonsterMaterialCondition(mat);
      if (cond && cond !== "none" && cond !== "any") return;
      const rolled = rollItemDropEntry(rng, { name: mat.name.trim(), dropRate: mat.dropRate }, companionMult);
      if (rolled) bucket.push(rolled);
    });
  });

  if ((foe?.isBoss || def?.isBoss) && !hero.length && Array.isArray(table.materials) && table.materials.length) {
    let sig = table.materials[0];
    for (const mat of table.materials) {
      if (!mat?.name) continue;
      const rate = Number(mat.dropRate) || 0;
      const bestRate = Number(sig?.dropRate) || 0;
      if (rate > bestRate) sig = mat;
    }
    if (sig?.name) hero.push(String(sig.name).trim());
  }

  return { hero, companionBySlot };
}

function getVictoryXpConfig() {
  const cfg = loadGameConfig();
  return cfg?.victoryXp && typeof cfg.victoryXp === "object" ? cfg.victoryXp : {};
}

function getMonsterXpForFoe(foe, def) {
  const level = Math.max(1, Math.floor(foe?.level || 1));
  const cfg = getVictoryXpConfig();
  const baseXP = 8 + level * 2.2 + level * level * 0.045;
  let mult;
  if (foe?.isBoss || def?.isBoss) {
    mult = cfg.bossMultiplier > 0 ? cfg.bossMultiplier : 4;
  } else {
    const rarityId = def?.spawnRarity?.trim?.()?.toLowerCase?.() || "common";
    const byRarity = cfg.rarityMultipliers || {};
    mult = byRarity[rarityId] > 0 ? byRarity[rarityId] : 1;
  }
  let xp = Math.round(baseXP * mult);
  if (hasActiveMood(foe)) xp = Math.round(xp * MOOD_XP_BONUS_MULT);
  return Math.max(0, xp);
}

function getPartyXpMultiplier(partySize) {
  const size = Math.max(1, Math.min(8, Math.floor(partySize || 1)));
  const table = getVictoryXpConfig().partyMultipliers || {};
  const mult = table[size];
  return mult > 0 ? mult : 1;
}

function getVictoryXpLevelMultiplier(fighterLevel, averageEnemyLevel) {
  const fl = Math.max(1, Math.floor(fighterLevel || 1));
  const avg = Math.max(1, averageEnemyLevel || 1);
  if (fl <= avg) return 1;
  const ratio = avg / fl;
  if (ratio >= 0.85) return 1;
  if (ratio >= 0.7) return 0.9;
  if (ratio >= 0.5) return 0.75;
  if (ratio >= 0.35) return 0.6;
  if (ratio >= 0.2) return 0.45;
  if (ratio >= 0.1) return 0.3;
  return 0.2;
}

function buildMemberRows(party, player) {
  const rows = [];
  (party || []).forEach((m) => {
    if (!m) return;
    if (m.kind === "hero") {
      rows.push({
        key: "hero",
        kind: "hero",
        name: m.name || player.name || "Hero",
        level: Math.max(1, Math.floor(player.level || 1))
      });
    } else if (m.kind === "companion" && Number.isFinite(m.companionSlotIndex)) {
      const comp = player.companions?.[m.companionSlotIndex];
      if (!comp?.enabled) return;
      rows.push({
        key: `c${m.companionSlotIndex}`,
        kind: "companion",
        name: m.name || comp.name || "Companion",
        level: Math.max(1, Math.floor(comp.level || 1)),
        companionSlotIndex: m.companionSlotIndex
      });
    }
  });
  return rows;
}

function getCompanionLootEntries(party, player) {
  const out = [];
  const seen = new Set();
  (party || []).forEach((m) => {
    if (m?.kind !== "companion" || !Number.isFinite(m.companionSlotIndex)) return;
    if (seen.has(m.companionSlotIndex)) return;
    const comp = player.companions?.[m.companionSlotIndex];
    if (!comp?.enabled) return;
    seen.add(m.companionSlotIndex);
    out.push({ comp, slotIndex: m.companionSlotIndex });
  });
  return out;
}

/**
 * Full victory loot (XP, gold, items) using seeded RNG.
 */
export function computeVictoryRewards(foes, party, player, rng) {
  const memberRows = buildMemberRows(party, player);
  let totalMonsterXP = 0;
  let totalMonsterLevels = 0;
  let defeatedCount = 0;
  (foes || []).forEach((foe) => {
    if (!foe?.name) return;
    const def = getEnemyDefByName(foe.name);
    if (!def) return;
    totalMonsterLevels += Math.max(1, Math.floor(foe.level || 1));
    totalMonsterXP += getMonsterXpForFoe(foe, def);
    defeatedCount += 1;
  });
  const averageEnemyLevel = defeatedCount > 0 ? totalMonsterLevels / defeatedCount : 1;
  const partyMult = getPartyXpMultiplier(memberRows.length);

  const byKey = {};
  memberRows.forEach((row) => {
    const levelMult = getVictoryXpLevelMultiplier(row.level, averageEnemyLevel);
    const xp = Math.max(1, Math.round(totalMonsterXP * levelMult * partyMult));
    byKey[row.key] = { ...row, xp, gold: 0, items: [] };
  });

  const companionEntries = getCompanionLootEntries(party, player);
  (foes || []).forEach((foe) => {
    if (!foe?.name) return;
    if (foe.combat && typeof foe.combat.summonerUid === "number") return;
    const def = getEnemyDefByName(foe.name);
    if (!def) return;
    const moodLootMult = hasActiveMood(foe) ? MOOD_LOOT_DROP_RATE_MULT : 1;
    const table = getMonsterLootDropTable(def);
    const goldSpec = table?.gold != null ? table.gold : getDefaultGoldSpec(def);
    if (byKey.hero) byKey.hero.gold += rollGoldDrop(rng, goldSpec);
    companionEntries.forEach(({ slotIndex }) => {
      const key = `c${slotIndex}`;
      if (byKey[key] && rng.chance(COMPANION_LOOT_CHANCE_MULT * 100)) {
        byKey[key].gold += rollGoldDrop(rng, goldSpec);
      }
    });
    if (table) {
      const { hero, companionBySlot } = collectMonsterTableLootForFoe(
        rng,
        foe,
        def,
        moodLootMult,
        companionEntries,
        player
      );
      if (byKey.hero) byKey.hero.items.push(...hero);
      Object.keys(companionBySlot).forEach((slot) => {
        const key = `c${slot}`;
        if (byKey[key]) byKey[key].items.push(...(companionBySlot[slot] || []));
      });
    }
  });

  const memberRewards = memberRows.map((row) => byKey[row.key] || row);
  const gold = memberRewards.reduce((s, m) => s + (m.gold || 0), 0);
  const xp = memberRewards.reduce((s, m) => s + (m.xp || 0), 0);
  const items = memberRewards.flatMap((m) => m.items || []);
  return { gold, xp, items, memberRewards };
}

export function applyRewardsToPlayer(player, result) {
  if (!player || !result) return player;
  if (result.victory) {
    player.hp = Math.min(player.maxHp, result.finalPlayerHp);
    player.gold = (player.gold || 0) + (result.gold || 0);
    if (!Array.isArray(player.inventory)) player.inventory = [];
    (result.items || []).forEach((it) => player.inventory.push(it));
    (result.memberRewards || []).forEach((row) => {
      if (row.kind === "hero") player.xp = (player.xp || 0) + (row.xp || 0);
      else if (row.kind === "companion" && Number.isFinite(row.companionSlotIndex)) {
        const c = player.companions?.[row.companionSlotIndex];
        if (c) c.xp = (c.xp || 0) + (row.xp || 0);
      }
    });
  } else {
    player.hp = Math.max(1, result.finalPlayerHp);
  }
  return player;
}
