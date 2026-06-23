import { getEnemyDefByName, loadGameConfig } from "../load_game_config.js";
import { levelUpActor } from "../progression/leveling.js";
import { getGatheringDeps } from "./gathering_deps.js";

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
  const { GatheringLoot } = getGatheringDeps();
  return GatheringLoot.rollItemDropEntry(rng, entry, dropRateMult);
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

function rollMaterialPassCount(rng) {
  const s = getLootDropSettings();
  const lo = typeof s.materialPassesMin === "number" ? Math.max(1, Math.floor(s.materialPassesMin)) : 1;
  const hi = typeof s.materialPassesMax === "number" ? Math.max(lo, Math.floor(s.materialPassesMax)) : 2;
  if (hi <= lo) return lo;
  return rng.int(lo, hi);
}

function getActorSelectedProfessions(actor) {
  const { GatheringLoot } = getGatheringDeps();
  return GatheringLoot.getActorSelectedProfessions(actor);
}

function canRollLegacyConditionedMaterial(mat, actor) {
  const { GatheringLoot } = getGatheringDeps();
  const cond = GatheringLoot.getMaterialCondition(mat);
  if (!cond || cond === "none" || cond === "any") return true;
  if (GatheringLoot.isGatheringProfessionCondition(cond)) return false;
  const selected = getActorSelectedProfessions(actor).map((id) => id.toLowerCase());
  return selected.includes(cond);
}

function collectNormalMonsterMaterials(rng, table, moodLootMult, companionEntries, player) {
  const hero = [];
  const companionBySlot = {};
  if (!table) return { hero, companionBySlot };

  const mult = moodLootMult > 0 ? moodLootMult : 1;
  const { GatheringLoot } = getGatheringDeps();
  const { normal } = GatheringLoot.splitMonsterMaterials(table);

  companionEntries.forEach(({ slotIndex }) => {
    if (Number.isFinite(slotIndex)) companionBySlot[slotIndex] = [];
  });

  const passMaterials = [];
  const perKillMaterials = [];
  normal.forEach((mat) => {
    if (mat.perKill) perKillMaterials.push(mat);
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
    if (!canRollLegacyConditionedMaterial(mat, player)) return;
    const rolled = rollItemDropEntry(rng, { name: mat.name.trim(), dropRate: mat.dropRate }, mult);
    if (rolled) hero.push(rolled);
  });

  companionEntries.forEach(({ slotIndex, comp }) => {
    const bucket = companionBySlot[slotIndex] || (companionBySlot[slotIndex] = []);
    const companionMult = mult * COMPANION_LOOT_CHANCE_MULT;
    const companionPasses = rollMaterialPassCount(rng);
    for (let p = 0; p < companionPasses; p++) {
      passMaterials.forEach((mat) => {
        const rolled = rollItemDropEntry(rng, { name: mat.name.trim(), dropRate: mat.dropRate }, companionMult);
        if (rolled) bucket.push(rolled);
      });
    }
    perKillMaterials.forEach((mat) => {
      const cond = GatheringLoot.getMaterialCondition(mat);
      if (cond && cond !== "none" && cond !== "any") return;
      const rolled = rollItemDropEntry(rng, { name: mat.name.trim(), dropRate: mat.dropRate }, companionMult);
      if (rolled) bucket.push(rolled);
    });
  });

  return { hero, companionBySlot };
}

function collectMonsterTableLootForFoe(rng, foe, def, moodLootMult, companionEntries, player) {
  const table = getMonsterLootDropTable(def);
  const empty = { hero: [], companionBySlot: {}, heroGatherEvents: [], companionGatherEventsBySlot: {} };
  if (!table) return empty;

  const { GatheringLoot } = getGatheringDeps();
  const deps = getGatheringDeps();
  const { gathering } = GatheringLoot.splitMonsterMaterials(table);
  const mult = moodLootMult > 0 ? moodLootMult : 1;

  const normal = collectNormalMonsterMaterials(rng, table, moodLootMult, companionEntries, player);
  const heroGather = GatheringLoot.collectGatheringLootForActor(rng, foe, def, player, gathering, deps, mult);
  normal.hero.push(...heroGather.items);

  const companionGatherEventsBySlot = {};
  companionEntries.forEach(({ slotIndex, comp }) => {
    if (!Number.isFinite(slotIndex) || !comp) return;
    const bucket = normal.companionBySlot[slotIndex] || (normal.companionBySlot[slotIndex] = []);
    const compGather = GatheringLoot.collectGatheringLootForActor(
      rng,
      foe,
      def,
      comp,
      gathering,
      deps,
      mult * COMPANION_LOOT_CHANCE_MULT
    );
    bucket.push(...compGather.items);
    if (compGather.gatherEvents.length) {
      companionGatherEventsBySlot[slotIndex] = compGather.gatherEvents;
    }
  });

  if ((foe?.isBoss || def?.isBoss) && !normal.hero.length && Array.isArray(table.materials) && table.materials.length) {
    let sig = table.materials[0];
    for (const mat of table.materials) {
      if (!mat?.name) continue;
      const rate = Number(mat.dropRate) || 0;
      const bestRate = Number(sig?.dropRate) || 0;
      if (rate > bestRate) sig = mat;
    }
    if (sig?.name) normal.hero.push(String(sig.name).trim());
  }

  return {
    hero: normal.hero,
    companionBySlot: normal.companionBySlot,
    heroGatherEvents: heroGather.gatherEvents,
    companionGatherEventsBySlot
  };
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

function buildLootContextFromWorldMapContext(wmc) {
  if (!wmc || typeof wmc !== "object") return {};
  if (typeof wmc.dungeonId === "string" && wmc.dungeonId.trim()) {
    return { dungeonId: wmc.dungeonId.trim() };
  }
  if (typeof wmc.biomeName === "string" && wmc.biomeName.trim()) {
    return { biomeName: wmc.biomeName.trim() };
  }
  return {};
}

function rollPetEggDropForFoe(lootContext, foe, def, rng) {
  const eggs = global.PET_EGG_DROPS;
  if (!eggs || typeof eggs.tryRollEggDrop !== "function") return null;
  return eggs.tryRollEggDrop(lootContext, foe, def, () => rng.next());
}

/**
 * Full victory loot (XP, gold, items, gathering profession XP) using seeded RNG.
 */
export function computeVictoryRewards(foes, party, player, rng, lootContext) {
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
    byKey[row.key] = { ...row, xp, gold: 0, items: [], gatherEvents: [] };
  });

  const companionEntries = getCompanionLootEntries(party, player);
  const eggCtx = buildLootContextFromWorldMapContext(lootContext);
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
      const loot = collectMonsterTableLootForFoe(
        rng,
        foe,
        def,
        moodLootMult,
        companionEntries,
        player
      );
      if (byKey.hero) {
        byKey.hero.items.push(...loot.hero);
        if (loot.heroGatherEvents?.length) {
          byKey.hero.gatherEvents.push(...loot.heroGatherEvents);
        }
      }
      Object.keys(loot.companionBySlot || {}).forEach((slot) => {
        const key = `c${slot}`;
        if (byKey[key]) {
          byKey[key].items.push(...(loot.companionBySlot[slot] || []));
          const evts = loot.companionGatherEventsBySlot?.[slot];
          if (evts?.length) byKey[key].gatherEvents.push(...evts);
        }
      });
    }
    const eggDrop = rollPetEggDropForFoe(eggCtx, foe, def, rng);
    if (eggDrop && byKey.hero) byKey.hero.items.push(eggDrop);
  });

  const memberRewards = memberRows.map((row) => byKey[row.key] || row);
  const gold = memberRewards.reduce((s, m) => s + (m.gold || 0), 0);
  const xp = memberRewards.reduce((s, m) => s + (m.xp || 0), 0);
  const items = memberRewards.flatMap((m) => m.items || []);
  return { gold, xp, items, memberRewards };
}

function applyGatherProfessionXp(player, memberRewards) {
  const { GatheringLoot, PP } = getGatheringDeps();
  (memberRewards || []).forEach((row) => {
    if (!row?.gatherEvents?.length) return;
    let actor = player;
    if (row.kind === "companion" && Number.isFinite(row.companionSlotIndex)) {
      actor = player.companions?.[row.companionSlotIndex];
    }
    if (actor) GatheringLoot.applyGatherEventsToActor(actor, row.gatherEvents, PP);
  });
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
    applyGatherProfessionXp(player, result.memberRewards);
    levelUpActor(player);
    if (Array.isArray(player.companions)) {
      player.companions.forEach((c) => {
        if (c) levelUpActor(c);
      });
    }
  } else {
    player.hp = Math.max(1, result.finalPlayerHp);
  }
  return player;
}
