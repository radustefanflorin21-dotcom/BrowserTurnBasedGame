import { createRequire } from "node:module";
import { getPartyMemberIds } from "../presence/party.js";
import { sendJsonToUser, byUserId, displayLabel } from "../presence/hub.js";
import { getRosterJson } from "../db.js";
import { preparePlayerForCombat } from "../combat/player_prep.js";
import { getArenaProfile, publicArenaProfile } from "./arena_db.js";
import { startArenaPvpSession } from "./pvp_session.js";
import { ensureArenaUnitsPlaced } from "./pvp_units.js";
import { beginFightFromPrepSession } from "../combat/engine.js";
import { broadcastCoopCombat } from "../combat/broadcast.js";
import { snapshotCombatStart } from "../combat/sessions.js";

const require = createRequire(import.meta.url);
const ArenaConfig = require("../../shared/arena_config.js");
const MMO_CONSTANTS = require("../../shared/mmo_constants.js");

const SLOT_COUNT = MMO_CONSTANTS.CHARACTER_SLOT_COUNT;

/** @type {Map<number, object>} */
const queueByUser = new Map();
/** @type {Map<string, object>} */
const pendingMatches = new Map();
/** @type {Map<number, string>} userId -> matchId while in pending accept */
const userPendingMatch = new Map();

let combatSessionsRef = null;
let prepSessionsByHostRef = null;
let schedulePrepRef = null;

export function bindArenaCombatSessionRefs({ sessions, prepSessionsByHost, schedulePrepTimeout }) {
  combatSessionsRef = sessions;
  prepSessionsByHostRef = prepSessionsByHost;
  schedulePrepRef = schedulePrepTimeout;
}

function parseRoster(raw) {
  if (!raw) return { slots: Array(SLOT_COUNT).fill(null) };
  try {
    const p = JSON.parse(raw);
    if (p?.slots) return p;
  } catch {
    /* ignore */
  }
  return { slots: Array(SLOT_COUNT).fill(null) };
}

function getPlayerFromRoster(userId, slotIndex) {
  const roster = parseRoster(getRosterJson(userId));
  const idx = Number(slotIndex);
  if (!Number.isFinite(idx) || idx < 0 || idx >= SLOT_COUNT || !roster.slots[idx]) return null;
  return JSON.parse(JSON.stringify(roster.slots[idx]));
}

function queueGroupKey(entry) {
  return `${entry.modeId}|${entry.bracketId}|${entry.partyId || `solo_${entry.leaderUserId}`}`;
}

function newPartyId() {
  return `aq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildQueueStatus(entry) {
  const mode = ArenaConfig.getMode(entry.modeId);
  const sameMode = [...queueByUser.values()].filter((q) => q.modeId === entry.modeId);
  const bracketCount = sameMode.filter((q) => q.bracketId === entry.bracketId).length;
  const teamSize = mode?.teamSize || 1;
  const playersFound = Math.min(teamSize * 2, bracketCount);
  return {
    modeId: entry.modeId,
    modeLabel: mode?.label || entry.modeId,
    bracketId: entry.bracketId,
    bracketLabel: ArenaConfig.getLevelBracket(entry.level).label,
    estimatedWaitSec: Math.max(15, 90 - Math.floor((Date.now() - entry.queuedAt) / 1000)),
    playersFound,
    playersNeeded: teamSize * 2,
    region: "Global",
    rewardsPreview: {
      honorWin: mode?.honorWin || 0,
      honorLoss: mode?.honorLoss || 0,
      warMedalsNote: "First ranked win today + daily objectives"
    }
  };
}

function notifyQueueStatus(userId) {
  const entry = queueByUser.get(userId);
  if (!entry) {
    sendJsonToUser(userId, { type: "arena_queue_status", inQueue: false });
    return;
  }
  sendJsonToUser(userId, {
    type: "arena_queue_status",
    inQueue: true,
    ...buildQueueStatus(entry)
  });
}

export function getQueueEntry(userId) {
  return queueByUser.get(userId) || null;
}

export function leaveQueue(userId) {
  const entry = queueByUser.get(userId);
  if (!entry) return { ok: true, wasQueued: false };
  if (entry.partyId) {
    for (const [uid, q] of queueByUser.entries()) {
      if (q.partyId === entry.partyId) {
        queueByUser.delete(uid);
        sendJsonToUser(uid, { type: "arena_queue_status", inQueue: false });
      }
    }
  } else {
    queueByUser.delete(userId);
    sendJsonToUser(userId, { type: "arena_queue_status", inQueue: false });
  }
  return { ok: true, wasQueued: true };
}

export function joinQueue(userId, { modeId, slotIndex }) {
  const mode = ArenaConfig.getMode(modeId);
  if (!mode?.enabled) {
    const err = new Error("This arena mode is not available yet.");
    err.status = 400;
    throw err;
  }
  if (userPendingMatch.has(userId)) {
    const err = new Error("You have a pending arena match.");
    err.status = 409;
    throw err;
  }
  const player = getPlayerFromRoster(userId, slotIndex);
  if (!player) {
    const err = new Error("No character in that slot.");
    err.status = 400;
    throw err;
  }
  preparePlayerForCombat(player);
  const level = typeof player.level === "number" ? player.level : 1;
  const bracket = ArenaConfig.getLevelBracket(level);
  const profile = getArenaProfile(userId, slotIndex);
  const partyIds = getPartyMemberIds(userId);
  const partyId = partyIds.length > 1 ? `party_${partyIds.sort((a, b) => a - b).join("_")}` : null;
  const leaderUserId = partyIds[0] || userId;

  if (partyId) {
    for (const pid of partyIds) {
      if (pid !== userId && !queueByUser.has(pid)) {
        const err = new Error("All party members must confirm queue together.");
        err.status = 400;
        throw err;
      }
    }
  }

  const entry = {
    userId,
    slotIndex,
    modeId,
    level,
    bracketId: bracket.id,
    rating: profile.rating,
    queuedAt: Date.now(),
    partyId,
    leaderUserId,
    playerName: player.name || "Hero",
    locked: true
  };
  queueByUser.set(userId, entry);
  notifyQueueStatus(userId);
  tryMatchmake();
  return { ok: true, queue: buildQueueStatus(entry) };
}

function ratingInRange(a, b, range) {
  return Math.abs(a.rating - b.rating) <= range;
}

function tryMatchmake() {
  const modes = ArenaConfig.listEnabledModes();
  for (const mode of modes) {
    const teamSize = mode.teamSize || 1;
    const entries = [...queueByUser.values()].filter((e) => e.modeId === mode.id);
    const byBracket = new Map();
    for (const e of entries) {
      if (!byBracket.has(e.bracketId)) byBracket.set(e.bracketId, []);
      byBracket.get(e.bracketId).push(e);
    }
    for (const [, pool] of byBracket) {
      if (teamSize === 1) {
        pool.sort((a, b) => a.queuedAt - b.queuedAt);
        for (let i = 0; i + 1 < pool.length; i += 2) {
          const a = pool[i];
          const b = pool[i + 1];
          const wait = Math.min(Date.now() - a.queuedAt, Date.now() - b.queuedAt);
          const range =
            ArenaConfig.QUEUE_INITIAL_RATING_RANGE +
            Math.floor(wait / ArenaConfig.QUEUE_EXPAND_RATING_EVERY_MS) * 50;
          const maxRange = ArenaConfig.QUEUE_MAX_RATING_RANGE;
          if (!ratingInRange(a, b, Math.min(maxRange, range))) continue;
          createPendingMatch(mode.id, [a], [b]);
          return;
        }
      } else {
        matchTeamMode(mode, pool, teamSize);
      }
    }
  }
}

function matchTeamMode(mode, pool, teamSize) {
  const parties = new Map();
  const solos = [];
  for (const e of pool) {
    if (e.partyId) {
      if (!parties.has(e.partyId)) parties.set(e.partyId, []);
      parties.get(e.partyId).push(e);
    } else {
      solos.push(e);
    }
  }
  const teams = [];
  for (const [, members] of parties) {
    if (members.length === teamSize) teams.push(members);
    else if (members.length < teamSize) {
      const need = teamSize - members.length;
      if (solos.length >= need) {
        teams.push([...members, ...solos.splice(0, need)]);
      }
    }
  }
  while (solos.length >= teamSize) {
    teams.push(solos.splice(0, teamSize));
  }
  if (teams.length >= 2) {
    createPendingMatch(mode.id, teams[0], teams[1]);
  }
}

function createPendingMatch(modeId, teamA, teamB) {
  const matchId = `m_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const acceptEndsAt = Date.now() + ArenaConfig.MATCH_ACCEPT_MS;
  const all = [...teamA, ...teamB];
  for (const e of all) queueByUser.delete(e.userId);
  const match = {
    matchId,
    modeId,
    teamA,
    teamB,
    acceptEndsAt,
    accepted: new Set(),
    declined: new Set()
  };
  pendingMatches.set(matchId, match);
  for (const e of all) userPendingMatch.set(e.userId, matchId);
  const mode = ArenaConfig.getMode(modeId);
  const payload = {
    type: "arena_match_found",
    matchId,
    modeId,
    modeLabel: mode?.label || modeId,
    boardSize: 8,
    turnTimerSec: mode?.turnTimerSec || 45,
    placementPhase: true,
    acceptEndsAt,
    allies: teamA.map((t) => ({ userId: t.userId, name: t.playerName, ready: false })),
    opponents: teamB.map((t) => ({ userId: t.userId, name: t.playerName, ready: false }))
  };
  for (const e of all) {
    const isAlly = teamA.some((t) => t.userId === e.userId);
    sendJsonToUser(e.userId, {
      ...payload,
      perspective: isAlly ? "teamA" : "teamB"
    });
  }
  setTimeout(() => expirePendingMatch(matchId), ArenaConfig.MATCH_ACCEPT_MS + 500);
}

function expirePendingMatch(matchId) {
  const match = pendingMatches.get(matchId);
  if (!match || match.started) return;
  const all = [...match.teamA, ...match.teamB];
  const acceptedAll = all.every((e) => match.accepted.has(e.userId));
  if (acceptedAll) return;
  pendingMatches.delete(matchId);
  for (const e of all) {
    userPendingMatch.delete(e.userId);
    if (!match.declined.has(e.userId) && !match.accepted.has(e.userId)) {
      sendJsonToUser(e.userId, { type: "arena_match_canceled", matchId, reason: "timeout" });
    }
    if (match.accepted.has(e.userId)) {
      queueByUser.set(e.userId, { ...e, queuedAt: Date.now() - 5000 });
      notifyQueueStatus(e.userId);
    }
  }
}

export function respondToMatch(userId, { matchId, accept }) {
  const mid = matchId || userPendingMatch.get(userId);
  const match = mid ? pendingMatches.get(mid) : null;
  if (!match) {
    const err = new Error("No pending arena match.");
    err.status = 404;
    throw err;
  }
  const all = [...match.teamA, ...match.teamB];
  if (!all.some((e) => e.userId === userId)) {
    const err = new Error("You are not in this match.");
    err.status = 403;
    throw err;
  }
  if (accept) {
    match.accepted.add(userId);
  } else {
    match.declined.add(userId);
    pendingMatches.delete(match.matchId);
    for (const e of all) {
      userPendingMatch.delete(e.userId);
      sendJsonToUser(e.userId, {
        type: "arena_match_canceled",
        matchId: match.matchId,
        reason: "declined"
      });
      if (e.userId !== userId && match.accepted.has(e.userId)) {
        queueByUser.set(e.userId, { ...e, queuedAt: Date.now() - 5000 });
        notifyQueueStatus(e.userId);
      }
    }
    return { ok: true, started: false };
  }
  const everyoneAccepted = all.every((e) => match.accepted.has(e.userId));
  if (!everyoneAccepted) {
    for (const e of all) {
      sendJsonToUser(e.userId, {
        type: "arena_match_ready",
        matchId: match.matchId,
        accepted: [...match.accepted]
      });
    }
    return { ok: true, started: false };
  }
  startAcceptedMatch(match);
  return { ok: true, started: true, matchId: match.matchId };
}

function startAcceptedMatch(match) {
  if (match.started) return;
  match.started = true;
  pendingMatches.delete(match.matchId);
  const teamAEntries = match.teamA.map((e) => ({
    userId: e.userId,
    slotIndex: e.slotIndex,
    player: getPlayerFromRoster(e.userId, e.slotIndex)
  }));
  const teamBEntries = match.teamB.map((e) => ({
    userId: e.userId,
    slotIndex: e.slotIndex,
    player: getPlayerFromRoster(e.userId, e.slotIndex)
  }));
  const rngSeed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
  const session = startArenaPvpSession({
    matchId: match.matchId,
    modeId: match.modeId,
    teamAEntries,
    teamBEntries,
    rngSeed
  });
  if (combatSessionsRef) {
    combatSessionsRef.set(session.sessionId, session);
    if (prepSessionsByHostRef) prepSessionsByHostRef.set(session.hostUserId, session.sessionId);
  }
  if (schedulePrepRef) {
    schedulePrepRef(session, (s) => {
      if (s.state?.phase !== "prep") return;
      ensurePrepAutoReady(s);
      const out = beginFightFromPrepSession(s);
      broadcastCoopCombat(s, { began: true, arena: true });
      if (out.finished) {
        /* finished handled via participantResults in runAction path */
      }
    });
  }
  for (const e of [...match.teamA, ...match.teamB]) {
    userPendingMatch.delete(e.userId);
    const part = session.participants.get(e.userId);
    sendJsonToUser(e.userId, {
      type: "arena_match_start",
      matchId: match.matchId,
      sessionId: session.sessionId,
      prepEndsAt: session.prepEndsAt,
      state: session.state,
      rngSeed: session.rngSeed,
      player: part?.player,
      participants: [...session.participants.values()].map((p) => ({
        userId: p.userId,
        name: p.player?.name || "Hero",
        ready: p.ready,
        arenaTeam: p.arenaTeam
      }))
    });
  }
}

function ensurePrepAutoReady(session) {
  ensureArenaUnitsPlaced(session.state);
  for (const part of session.participants.values()) {
    part.ready = true;
  }
}

export function getArenaHubPayload(userId, slotIndex) {
  return {
    profile: publicArenaProfile(userId, slotIndex),
    modes: Object.values(ArenaConfig.MODES).map((m) => ({
      id: m.id,
      label: m.label,
      description: m.description,
      enabled: !!m.enabled,
      comingSoon: !!m.comingSoon,
      teamSize: m.teamSize,
      honorWin: m.honorWin,
      honorLoss: m.honorLoss,
      turnTimerSec: m.turnTimerSec,
      placementPhase: m.placementPhase,
      consumables: m.consumables,
      pets: m.pets,
      gear: m.gear,
      rating: m.rating
    })),
    inQueue: !!queueByUser.get(userId),
    pendingMatchId: userPendingMatch.get(userId) || null,
    seasonLabel: ArenaConfig.ARENA_SEASON_LABEL
  };
}

setInterval(() => {
  tryMatchmake();
  for (const [userId] of queueByUser) notifyQueueStatus(userId);
}, 5000);
