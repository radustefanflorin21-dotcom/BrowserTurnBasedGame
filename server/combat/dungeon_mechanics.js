/**
 * Shared dungeon combat mechanics (Rootwarren pressure, boss reinforcements).
 */

import { loadGameConfig, getEnemyDefByName } from "../load_game_config.js";
import { buildFoeFromUnit } from "./formulas.js";
import { initFoeCombatRuntime } from "./enemy_ai.js";

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

function spawnReinforcement(st, name, rng) {
  if ((st.foes || []).filter((f) => f && f.hp > 0).length >= 8) return false;
  const level = maxLevelForEnemyName(name);
  const moodId = randomMoodIdForEnemy(name, rng);
  const foe = buildFoeFromUnit({ name, level, moodId }, nextFoeUid(st));
  if (!foe) return false;
  initFoeCombatRuntime(foe);
  st.foes.push(foe);
  return true;
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
        pick.crippleTurns = Math.max(pick.crippleTurns || 0, 1);
        log(`Root Pressure cripples ${pick.name || "a hero"} (+1 stamina per skill).`);
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
}
