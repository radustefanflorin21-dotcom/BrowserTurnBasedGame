import { createRequire } from "node:module";
import { applyArenaMatchResult } from "./arena_db.js";
import { getParticipantPlayer } from "../combat/coop.js";

const require = createRequire(import.meta.url);
const ArenaConfig = require("../../shared/arena_config.js");

function cloneState(st) {
  return JSON.parse(JSON.stringify(st));
}

function teamUserIds(session, teamKey) {
  const ids = session.arenaTeams?.[teamKey] || [];
  return ids.map(Number);
}

function opponentForUser(session, userId) {
  const uid = Number(userId);
  const teamA = teamUserIds(session, "teamA");
  const teamB = teamUserIds(session, "teamB");
  const inA = teamA.includes(uid);
  const opponents = inA ? teamB : teamA;
  const oppId = opponents[0];
  if (oppId == null) return { opponentUserId: null, opponentName: "Opponent" };
  const part = session.participants.get(oppId);
  return {
    opponentUserId: oppId,
    opponentName: part?.player?.name || "Opponent"
  };
}

export function finishArenaPvpMatch(session, winningTeamKey) {
  const st = session.state;
  st.phase = "ended";
  st.endOutcome = winningTeamKey === "teamA" ? "victory" : "defeat";
  const rounds = typeof st.combatRound === "number" ? st.combatRound : 1;
  const modeId = session.arenaModeId || "ranked_1v1";
  const participantResults = {};
  const arenaResults = {};

  for (const [userId, part] of session.participants.entries()) {
    const uid = Number(userId);
    const teamA = teamUserIds(session, "teamA").includes(uid);
    const victory = (winningTeamKey === "teamA" && teamA) || (winningTeamKey === "teamB" && !teamA);
    const { opponentUserId, opponentName } = opponentForUser(session, uid);
    const stats = session.arenaCombatStats?.[uid] || {};
    const arenaOutcome = applyArenaMatchResult({
      userId: uid,
      slotIndex: part.slotIndex,
      modeId,
      victory,
      opponentUserId,
      opponentName,
      rounds,
      stats
    });
    arenaResults[uid] = arenaOutcome;
    participantResults[uid] = {
      victory,
      arena: true,
      modeId,
      finalPlayerHp: Math.max(0, part.player?.hp || 0),
      gold: 0,
      xp: 0,
      items: [],
      memberRewards: [],
      arenaOutcome
    };
  }

  session.arenaResults = arenaResults;
  return { participantResults, state: cloneState(st), finished: true, arenaResults };
}

export function recordArenaCombatStat(session, userId, patch) {
  if (!session.arenaCombatStats) session.arenaCombatStats = {};
  const key = Number(userId);
  if (!session.arenaCombatStats[key]) {
    session.arenaCombatStats[key] = {
      damageDealt: 0,
      healingDone: 0,
      damageBlocked: 0,
      debuffsApplied: 0
    };
  }
  const row = session.arenaCombatStats[key];
  for (const [k, v] of Object.entries(patch || {})) {
    if (typeof v === "number" && Number.isFinite(v)) row[k] = (row[k] || 0) + v;
  }
}

export function computeArenaMvpUserId(session) {
  let bestId = null;
  let bestScore = -1;
  for (const [userId, stats] of Object.entries(session.arenaCombatStats || {})) {
    const s =
      (stats.damageDealt || 0) +
      (stats.healingDone || 0) * 0.6 +
      (stats.damageBlocked || 0) * 0.4 +
      (stats.debuffsApplied || 0) * 10;
    if (s > bestScore) {
      bestScore = s;
      bestId = Number(userId);
    }
  }
  return bestId;
}

export function getArenaModePrepMs(modeId) {
  const mode = ArenaConfig.getMode(modeId);
  return (mode?.placementTimerSec || 30) * 1000;
}
