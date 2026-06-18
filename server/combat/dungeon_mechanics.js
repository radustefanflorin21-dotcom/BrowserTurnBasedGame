/**
 * Shared dungeon combat mechanics (Rootwarren pressure, Withered Maw sand/starvation, boss reinforcements).
 */

import { loadGameConfig, getEnemyDefByName } from "../load_game_config.js";
import { buildFoeFromUnit } from "./formulas.js";
import { initFoeCombatRuntime } from "./enemy_ai.js";
import { applyPartyMemberBlind, applyPartyMemberCripple, ensureCombatStatus } from "./status.js";

function getDungeonDef(dungeonId) {
  const cfg = loadGameConfig();
  return cfg?.worldMap?.dungeons?.[dungeonId] || null;
}

function nextFoeUid(st) {
  let m = 0;
  for (const f of st.foes || []) {
    if (typeof f.uid === "number" && f.uid > m) m = f.uid;
  }
  return m + 1;
}

function maxLevelForEnemyName(name) {
  const def = getEnemyDefByName(name);
  if (!def || !Array.isArray(def.possibleLevels) || !def.possibleLevels.length) return 1;
  return Math.max(...def.possibleLevels);
}

function randomMoodIdForEnemy(name, rng) {
  const def = getEnemyDefByName(name);
  const moods = Array.isArray(def?.possibleMoods) ? def.possibleMoods : ["berserk"];
  const idx = Math.floor((rng?.next?.() ?? Math.random()) * moods.length);
  return moods[Math.max(0, Math.min(moods.length - 1, idx))];
}

export function spawnReinforcement(st, name, rng) {
  if ((st.foes || []).filter((f) => f && f.hp > 0).length >= 8) return false;
  const level = maxLevelForEnemyName(name);
  const moodId = randomMoodIdForEnemy(name, rng);
  const foe = buildFoeFromUnit({ name, level, moodId }, nextFoeUid(st));
  if (!foe) return false;
  initFoeCombatRuntime(foe);
  st.foes.push(foe);
  return true;
}

/** Mirage Remnants ignore the normal 8-enemy cap. */
export function spawnMirageRemnantUncapped(st, rng, summonerUid) {
  const level = maxLevelForEnemyName("Mirage Remnant");
  const moodId = randomMoodIdForEnemy("Mirage Remnant", rng);
  const foe = buildFoeFromUnit({ name: "Mirage Remnant", level, moodId }, nextFoeUid(st));
  if (!foe) return null;
  initFoeCombatRuntime(foe);
  if (typeof summonerUid === "number") foe.combat.summonerUid = summonerUid;
  st.foes.push(foe);
  return foe;
}

function incrementGlobalCombatRound(st) {
  const wmc = st.worldMapContext;
  if (!wmc || typeof wmc !== "object") return 0;
  wmc.combatGlobalRound = (typeof wmc.combatGlobalRound === "number" ? wmc.combatGlobalRound : 0) + 1;
  return wmc.combatGlobalRound;
}

/**
 * @param {object} st
 * @param {object} rng
 * @param {(line: string) => void} log
 */
function pickJungleBloomHealTarget(st) {
  const living = (st.foes || []).filter((f) => f && f.hp > 0);
  if (!living.length) return null;
  const nonBoss = living.filter((f) => !f.isBoss && f.name !== "The Heartbloom Ancient");
  const pool = nonBoss.length ? nonBoss : living;
  return pool.reduce((a, b) => (a.hp / Math.max(1, a.maxHp) <= b.hp / Math.max(1, b.maxHp) ? a : b));
}

function isHeartbloomAncientPhase3(st) {
  return (st.foes || []).some(
    (f) =>
      f &&
      f.name === "The Heartbloom Ancient" &&
      f.hp > 0 &&
      f.maxHp > 0 &&
      f.hp / f.maxHp <= 0.35
  );
}

function isVerdantDeepFinalRoom(st, def) {
  const roomIndex = typeof st.worldMapContext?.roomIndex === "number" ? st.worldMapContext.roomIndex : 0;
  return Array.isArray(def?.rooms) && roomIndex === def.rooms.length - 1;
}

export function applyDungeonMechanicsEndOfEnemyPhase(st, rng, log) {
  if (!st?.worldMapContext || typeof st.worldMapContext.dungeonId !== "string") return;
  const dungeonId = st.worldMapContext.dungeonId.trim();
  const def = getDungeonDef(dungeonId);
  if (!def) return;

  const round = incrementGlobalCombatRound(st);
  const roomIndex = typeof st.worldMapContext.roomIndex === "number" ? st.worldMapContext.roomIndex : 0;

  if (def.rootPressure && roomIndex >= 2 && round % 3 === 0) {
    const living = (st.party || []).filter((m) => m && m.hp > 0);
    if (living.length) {
      const pick = living[Math.floor(rng.next() * living.length)];
      if (rng.chance(0.35)) {
        applyPartyMemberCripple(st, pick, 1);
        log(`Root Pressure cripples ${pick.name || "a hero"} (+1 stamina per skill).`);
      }
    }
  }

  if (def.thirstingSand && roomIndex >= 2 && round % 3 === 0) {
    const living = (st.party || []).filter((m) => m && m.hp > 0);
    if (living.length) {
      const pick = living[Math.floor(rng.next() * living.length)];
      if (rng.chance(0.35)) {
        applyPartyMemberBlind(st, pick, 6, 1);
        log(`Thirsting Sand blinds ${pick.name || "a fighter"} (−6% accuracy).`);
      }
    }
  }

  if (def.starvationPressure && roomIndex >= 3 && round % 4 === 0) {
    const living = (st.party || []).filter((m) => m && m.hp > 0);
    if (living.length) {
      const pick = living[Math.floor(rng.next() * living.length)];
      if (rng.chance(0.3)) {
        applyPartyMemberCripple(st, pick, 1);
        log(`Starvation Pressure cripples ${pick.name || "a fighter"} (+1 stamina per skill).`);
      }
    }
  }

  if (def.pressureCracks && roomIndex >= 2 && round % 3 === 0) {
    const living = (st.party || []).filter((m) => m && m.hp > 0);
    if (living.length) {
      const pick = living[Math.floor(rng.next() * living.length)];
      if (rng.chance(0.35)) {
        applyPartyMemberCripple(st, pick, 1);
        log(`Pressure Cracks cripple ${pick.name || "a fighter"} (+1 stamina per skill).`);
      }
    }
  }

  if (def.fallingStone && roomIndex >= 3) {
    const colossusPhase3 = (st.foes || []).some(
      (f) => f && f.name === "The Held Colossus" && f.hp > 0 && f.maxHp > 0 && f.hp / f.maxHp <= 0.35
    );
    const interval = colossusPhase3 ? 3 : 4;
    if (round % interval === 0) {
      const living = (st.party || []).filter((m) => m && m.hp > 0);
      if (living.length) {
        const pick = living[Math.floor(rng.next() * living.length)];
        log(`Falling Stone shifts above ${pick.name || "the party"}…`);
        if (rng.chance(0.15)) {
          applyPartyMemberCripple(st, pick, 1);
          log(`${pick.name || "A fighter"} is stunned by debris (+1 stamina per skill).`);
        }
      }
    }
  }

  if (def.frostrootSnare && roomIndex >= 2 && round % 3 === 0) {
    const living = (st.party || []).filter((m) => m && m.hp > 0);
    if (living.length) {
      const pick = living[Math.floor(rng.next() * living.length)];
      if (rng.chance(0.35)) {
        applyPartyMemberCripple(st, pick, 1);
        log(`Frostroot Snare cripples ${pick.name || "a fighter"} (+1 stamina per skill).`);
      }
    }
  }

  if (def.winterStillness && roomIndex >= 3) {
    const sleepingChildPhase3 = (st.foes || []).some(
      (f) =>
        f &&
        f.name === "The Sleeping Child of Winter" &&
        f.hp > 0 &&
        f.maxHp > 0 &&
        f.hp / f.maxHp <= 0.35
    );
    const interval = sleepingChildPhase3 ? 3 : 4;
    if (round % interval === 0) {
      const living = (st.party || []).filter((m) => m && m.hp > 0);
      if (living.length) {
        const pick = living[Math.floor(rng.next() * living.length)];
        if (rng.chance(0.3)) {
          applyPartyMemberBlind(st, pick, 6, 1);
          log(`Winter Stillness dulls ${pick.name || "a fighter"} (−6% accuracy).`);
        }
      }
    }
  }

  if (dungeonId === "rootwarren" && Array.isArray(def.rooms) && roomIndex === def.rooms.length - 1) {
    if (round === 8 || round === 12) {
      if (spawnReinforcement(st, "Burrow Hare", rng)) {
        log("Gaiahide Behemoth shakes the den — a Burrow Hare burrows into the fight!");
      }
    }
  }

  if (dungeonId === "withered_maw" && Array.isArray(def.rooms) && roomIndex === def.rooms.length - 1) {
    if (round === 7 || round === 11) {
      if (spawnMirageRemnantUncapped(st, rng)) {
        log("The sand shimmers — a Mirage Remnant claws its way into the fight!");
      }
    }
  }

  if (dungeonId === "frostroot_nursery" && Array.isArray(def.rooms) && roomIndex === def.rooms.length - 1) {
    if (round === 8 || round === 12) {
      if (spawnReinforcement(st, "Frostroot Seedling", rng)) {
        log("Frozen roots split — a Frostroot Seedling crawls into the fight!");
      }
    }
  }

  if (def.rustCloud && roomIndex >= 2 && round % 3 === 0) {
    const living = (st.party || []).filter((m) => m && m.hp > 0);
    if (living.length) {
      const pick = living[Math.floor(rng.next() * living.length)];
      if (rng.chance(0.35)) {
        ensureCombatStatus(st);
        st.status.playerPhysDamageDownPct = Math.max(st.status.playerPhysDamageDownPct || 0, 6);
        st.status.playerPhysDamageDownTurns = Math.max(st.status.playerPhysDamageDownTurns || 0, 1);
        log(`Rust Cloud weakens ${pick.name || "a fighter"} (−6% physical damage).`);
      }
    }
  }

  if (def.warEcho && roomIndex >= 3) {
    const warmasterPhase3 = (st.foes || []).some(
      (f) =>
        f &&
        f.name === "The Last Warmaster" &&
        f.hp > 0 &&
        f.maxHp > 0 &&
        f.hp / f.maxHp <= 0.35
    );
    const interval = warmasterPhase3 ? 3 : 4;
    if (round % interval === 0) {
      const living = (st.party || []).filter((m) => m && m.hp > 0);
      if (living.length) {
        const pick = living[Math.floor(rng.next() * living.length)];
        if (rng.chance(0.3)) {
          applyPartyMemberBlind(st, pick, 6, 1);
          log(`War Echo dulls ${pick.name || "a fighter"} (−6% accuracy).`);
        }
      }
    }
  }

  if (dungeonId === "rustfallen_bastion" && Array.isArray(def.rooms) && roomIndex === def.rooms.length - 1) {
    const warmasterPhase3 = (st.foes || []).some(
      (f) =>
        f &&
        f.name === "The Last Warmaster" &&
        f.hp > 0 &&
        f.maxHp > 0 &&
        f.hp / f.maxHp <= 0.35
    );
    const scheduled = round === 8 || round === 12;
    const phasePulse = warmasterPhase3 && round % 3 === 0;
    if (scheduled || phasePulse) {
      if (spawnReinforcement(st, "Fallen Echo", rng)) {
        log("Ash stirs — a Fallen Echo answers the Warmaster's command!");
      }
    }
  }

  if (def.overgrowthSnare) {
    const phase3BossSnare = dungeonId === "verdant_deep" && isVerdantDeepFinalRoom(st, def) && isHeartbloomAncientPhase3(st);
    const interval = phase3BossSnare ? 2 : 3;
    const due = phase3BossSnare ? round % interval === 0 : roomIndex >= 2 && round % interval === 0;
    if (due) {
      const living = (st.party || []).filter((m) => m && m.hp > 0);
      if (living.length) {
        const pick = living[Math.floor(rng.next() * living.length)];
        if (rng.chance(0.35)) {
          applyPartyMemberCripple(st, pick, 1);
          log(`Overgrowth Snare cripples ${pick.name || "a fighter"} (+1 stamina per action).`);
        }
      }
    }
  }

  if (def.jungleBloom && roomIndex >= 3 && round % 4 === 0) {
    const target = pickJungleBloomHealTarget(st);
    if (target) {
      const amt = Math.max(1, Math.floor(target.maxHp * 0.05));
      target.hp = Math.min(target.maxHp, target.hp + amt);
      log(`Jungle Bloom mends ${target.name} for ${amt}.`);
    }
  }

  if (dungeonId === "verdant_deep" && Array.isArray(def.rooms) && roomIndex === def.rooms.length - 1) {
    if (round === 8 || round === 12) {
      if (spawnReinforcement(st, "Verdant Sprout", rng)) {
        log("Roots split — a Verdant Sprout crawls into the fight!");
      }
    }
  }
}
