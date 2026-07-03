import { createRequire } from "node:module";
import { createCombatRng } from "../../shared/combat_rng.js";
import { COOP_PREP_MS } from "../combat/coop.js";
import { initTacticalState } from "../combat/tactical.js";
import { snapshotCombatStart } from "../combat/sessions.js";
import { broadcastCoopCombat } from "../combat/broadcast.js";
import { preparePlayerForCombat } from "../combat/player_prep.js";
import { buildArenaTeamParty, ensureArenaUnitsPlaced } from "./pvp_units.js";
import { getArenaModePrepMs } from "./pvp_finish.js";

const require = createRequire(import.meta.url);
const ArenaConfig = require("../../shared/arena_config.js");
const TacticalGrid = require("../../shared/tactical_grid.js");

/** @type {Map<string, object>} */
export const arenaSessions = new Map();

export function startArenaPvpSession({
  matchId,
  modeId,
  teamAEntries,
  teamBEntries,
  rngSeed
}) {
  const mode = ArenaConfig.getMode(modeId);
  if (!mode?.enabled) {
    const err = new Error("Arena mode is not available.");
    err.status = 400;
    throw err;
  }
  const rng = createCombatRng(rngSeed);
  const party = buildArenaTeamParty(teamAEntries, "ally", 0);
  const foeUidStart = party.length;
  const foes = buildArenaTeamParty(teamBEntries, "foe", foeUidStart);
  const prepMs = getArenaModePrepMs(modeId);
  const prepEndsAt = Date.now() + prepMs;
  const sessionId = `a_${matchId}`;
  const st = {
    phase: "prep",
    prepEndsAt,
    foes,
    party,
    playerHp: party[0]?.hp ?? 100,
    playerMax: party[0]?.maxHp ?? 100,
    selectedUid: foes[0]?.uid ?? null,
    selectedAllyUid: party[0]?.uid ?? null,
    activePartyUid: null,
    activePvpFoeUid: null,
    fightLog: [`— Arena ${mode.label} — place your fighter —`],
    enemyNames: foes.map((f) => f.name),
    worldMapContext: null,
    endOutcome: null,
    arena: {
      matchId,
      modeId,
      turnTimerSec: mode.turnTimerSec || 45
    }
  };
  initTacticalState(st, { autoPlace: false });
  ensureArenaUnitsPlaced(st);

  const participants = new Map();
  const teamA = [];
  const teamB = [];
  for (const entry of teamAEntries) {
    preparePlayerForCombat(entry.player);
    snapshotCombatStart(entry.userId, entry.slotIndex, entry.player);
    participants.set(entry.userId, {
      userId: entry.userId,
      slotIndex: entry.slotIndex,
      player: entry.player,
      ready: false,
      connected: true,
      arenaTeam: "teamA"
    });
    teamA.push(entry.userId);
  }
  for (const entry of teamBEntries) {
    preparePlayerForCombat(entry.player);
    snapshotCombatStart(entry.userId, entry.slotIndex, entry.player);
    participants.set(entry.userId, {
      userId: entry.userId,
      slotIndex: entry.slotIndex,
      player: entry.player,
      ready: false,
      connected: true,
      arenaTeam: "teamB"
    });
    teamB.push(entry.userId);
  }

  const hostUserId = teamA[0];
  const session = {
    sessionId,
    matchId,
    mode: "arena_pvp",
    arenaModeId: modeId,
    coop: true,
    hostUserId,
    userId: hostUserId,
    slotIndex: participants.get(hostUserId)?.slotIndex ?? 0,
    player: participants.get(hostUserId)?.player,
    participants,
    arenaTeams: { teamA, teamB },
    locked: false,
    prepEndsAt,
    state: st,
    rng,
    rngSeed: rng.seed,
    createdAt: Date.now(),
    prepTimer: null,
    arenaCombatStats: {}
  };

  arenaSessions.set(sessionId, session);
  return session;
}

export function registerArenaSessionInCombatMap(session, combatSessionsMap, prepSessionsByHost) {
  combatSessionsMap.set(session.sessionId, session);
}

export function scheduleArenaPrepTimeout(session, onTimeout) {
  if (session.prepTimer) clearTimeout(session.prepTimer);
  const ms = Math.max(0, (session.prepEndsAt || 0) - Date.now());
  session.prepTimer = setTimeout(() => {
    session.prepTimer = null;
    onTimeout(session);
  }, ms);
}

export function isArenaSession(session) {
  return session?.mode === "arena_pvp";
}

export function getArenaWinningTeamKey(session) {
  const st = session.state;
  const partyAlive = (st.party || []).some((m) => m && m.hp > 0);
  const foesAlive = (st.foes || []).some((f) => f && f.hp > 0);
  if (!foesAlive && partyAlive) return "teamA";
  if (!partyAlive && foesAlive) return "teamB";
  return null;
}
