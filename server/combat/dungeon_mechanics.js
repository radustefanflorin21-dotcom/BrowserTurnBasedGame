/**
 * Shared dungeon combat mechanics (Rootwarren pressure, Withered Maw sand/starvation, boss reinforcements).
 */

import { createRequire } from "node:module";
import { loadGameConfig, getEnemyDefByName } from "../load_game_config.js";
import { buildFoeFromUnit } from "./formulas.js";
import { initFoeCombatRuntime } from "./enemy_ai.js";
import { applyPartyMemberBlind, applyPartyMemberCripple, ensureCombatStatus, applyPlayerBurn } from "./status.js";
import { pickMoodIdFromEnemyDef } from "./enemy_moods.js";

const require = createRequire(import.meta.url);
const EnemyTacticalMovement = require("../../shared/enemy_tactical_movement.js");

function getDungeonDef(dungeonId) {
  const cfg = loadGameConfig();
  return cfg?.worldMap?.dungeons?.[dungeonId] || null;
}

function nextFoeUid(st) {
  let m = -1;
  for (const f of st.foes || []) {
    if (typeof f.uid === "number" && f.uid > m) m = f.uid;
  }
  for (const p of st.party || []) {
    if (typeof p.uid === "number" && p.uid > m) m = p.uid;
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
  return pickMoodIdFromEnemyDef(def, rng);
}

export function spawnReinforcement(st, name, rng, opts) {
  if ((st.foes || []).filter((f) => f && f.hp > 0).length >= 8) return false;
  const level = maxLevelForEnemyName(name);
  const moodId = randomMoodIdForEnemy(name, rng);
  const foe = buildFoeFromUnit({ name, level, moodId }, nextFoeUid(st));
  if (!foe) return false;
  initFoeCombatRuntime(foe);
  st.foes.push(foe);
  const anchor = opts && typeof opts === "object" ? opts.adjacentTo : null;
  if (anchor && typeof anchor.uid === "number") {
    if (!foe.combat) foe.combat = { skillCd: {} };
    foe.combat.summonerUid = anchor.uid;
  }
  if (st.tactical && anchor && typeof anchor.gridX === "number") {
    EnemyTacticalMovement.placeSummonAdjacent(st, foe, anchor);
  }
  return foe;
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
  if (st.tactical && typeof summonerUid === "number") {
    const summoner = (st.foes || []).find((f) => f && f.uid === summonerUid);
    if (summoner && typeof summoner.gridX === "number") {
      EnemyTacticalMovement.placeSummonAdjacent(st, foe, summoner);
    }
  }
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

function isRiftforgeTyrantPhase3(st) {
  return (st.foes || []).some(
    (f) =>
      f &&
      f.name === "The Riftforge Tyrant" &&
      f.hp > 0 &&
      f.maxHp > 0 &&
      f.hp / f.maxHp <= 0.35
  );
}

function isStillnessBelowPhase3(st) {
  return (st.foes || []).some(
    (f) =>
      f &&
      f.name === "The Stillness Below" &&
      f.hp > 0 &&
      f.maxHp > 0 &&
      f.hp / f.maxHp <= 0.35
  );
}

function isInfernalRiftforgeFinalRoom(st, def) {
  const roomIndex = typeof st.worldMapContext?.roomIndex === "number" ? st.worldMapContext.roomIndex : 0;
  return Array.isArray(def?.rooms) && roomIndex === def.rooms.length - 1;
}

function isSilentGlacierFinalRoom(st, def) {
  const roomIndex = typeof st.worldMapContext?.roomIndex === "number" ? st.worldMapContext.roomIndex : 0;
  return Array.isArray(def?.rooms) && roomIndex === def.rooms.length - 1;
}

function mechanicDueFromRound1(round, interval) {
  return (round - 1) % interval === 0;
}

function countPaleRimeWisps(st) {
  return (st.foes || []).filter((f) => f && f.hp > 0 && f.name === "Pale Rime Wisp").length;
}

export function spawnPaleRimeWisp(st, rng) {
  if ((st.foes || []).filter((f) => f && f.hp > 0).length >= 8) return false;
  if (countPaleRimeWisps(st) >= 2) return false;
  return spawnReinforcement(st, "Pale Rime Wisp", rng);
}

function countEmberForgelings(st) {
  return (st.foes || []).filter((f) => f && f.hp > 0 && f.name === "Ember Forgeling").length;
}

export function spawnEmberForgeling(st, rng) {
  if ((st.foes || []).filter((f) => f && f.hp > 0).length >= 8) return false;
  if (countEmberForgelings(st) >= 2) return false;
  return spawnReinforcement(st, "Ember Forgeling", rng);
}

function applyPartyMemberBurn(st, member, dmgPerTurn, turns) {
  if (!member) return;
  const d = Math.max(1, Math.floor(dmgPerTurn));
  const t = Math.max(1, Math.floor(turns));
  if (member.kind === "hero") {
    applyPlayerBurn(st, d, t);
    return;
  }
  member.burnDmg = Math.max(member.burnDmg || 0, d);
  member.burnTurns = Math.max(member.burnTurns || 0, t);
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

  if (def.heatSurge) {
    const phase3BossSurge =
      dungeonId === "infernal_riftforge" && isInfernalRiftforgeFinalRoom(st, def) && isRiftforgeTyrantPhase3(st);
    const interval = phase3BossSurge ? 2 : 3;
    const due = phase3BossSurge ? round % interval === 0 : roomIndex >= 2 && round % interval === 0;
    if (due) {
      const living = (st.party || []).filter((m) => m && m.hp > 0);
      if (living.length) {
        const pick = living[Math.floor(rng.next() * living.length)];
        if (rng.chance(0.35)) {
          const dot = Math.max(1, Math.floor(pick.maxHp * 0.04));
          applyPartyMemberBurn(st, pick, dot, 2);
          log(`Heat Surge brands ${pick.name || "a fighter"} with Burn (${dot} per turn).`);
        }
      }
    }
  }

  if (dungeonId === "infernal_riftforge" && Array.isArray(def.rooms) && roomIndex === def.rooms.length - 1) {
    if (round === 8 || round === 12) {
      if (spawnEmberForgeling(st, rng)) {
        log("The forge erupts — an Ember Forgeling crawls from the slag!");
      }
    }
  }

  if (def.numbingSilence) {
    const phase3BossSilence =
      dungeonId === "silent_glacier" && isSilentGlacierFinalRoom(st, def) && isStillnessBelowPhase3(st);
    const interval = phase3BossSilence ? 2 : 3;
    const due = phase3BossSilence
      ? mechanicDueFromRound1(round, interval)
      : roomIndex >= 2 && mechanicDueFromRound1(round, interval);
    if (due) {
      const living = (st.party || []).filter((m) => m && m.hp > 0);
      if (living.length) {
        const pick = living[Math.floor(rng.next() * living.length)];
        if (rng.chance(0.35)) {
          applyPartyMemberBlind(st, pick, 8, 2);
          log(`Numbing Silence dulls ${pick.name || "a fighter"} (−8% accuracy).`);
        }
      }
    }
  }

  if (def.glacialDrag && roomIndex >= 3 && mechanicDueFromRound1(round, 4)) {
    const living = (st.party || []).filter((m) => m && m.hp > 0);
    if (living.length) {
      const pick = living[Math.floor(rng.next() * living.length)];
      if (rng.chance(0.3)) {
        applyPartyMemberCripple(st, pick, 1);
        log(`Glacial Drag cripples ${pick.name || "a fighter"} (+1 stamina per action).`);
      }
    }
  }

  if (def.bitterCold && roomIndex >= 4 && mechanicDueFromRound1(round, 4)) {
    const living = (st.party || []).filter((m) => m && m.hp > 0);
    for (const m of living) {
      const dmg = Math.max(1, Math.floor(m.maxHp * 0.03));
      m.hp = Math.max(0, m.hp - dmg);
      log(`Bitter Cold saps ${m.name || "a fighter"} for ${dmg}.`);
    }
  }

  if (dungeonId === "silent_glacier" && Array.isArray(def.rooms) && roomIndex === def.rooms.length - 1) {
    if (round === 8 || round === 12) {
      if (spawnPaleRimeWisp(st, rng)) {
        log("A Pale Rime Wisp drifts from the still core!");
      }
    }
  }
}
