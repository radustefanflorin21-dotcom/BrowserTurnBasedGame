import { processCombatAction } from "./engine.js";
import { getRosterJson, upsertRosterJson } from "../db.js";
import { buildPendingGrantsFromCombatResult } from "../progression/snapshot.js";
import { upsertSnapshot } from "../progression/store.js";
import {
  createCoopPrepState,
  appendParticipantToState,
  beginCoopFromPrep,
  COOP_PREP_MS,
  sameTileForJoin,
  canAddParticipantParty
} from "./coop.js";
import { preparePlayerForCombat } from "./player_prep.js";
import { broadcastCoopCombat, broadcastCoopCombatFinished } from "./broadcast.js";
import { getPartyMemberIds, notifyPartyFightStarted } from "../presence/party.js";

const sessions = new Map();
/** @type {Map<number, string>} hostUserId -> sessionId while in prep */
const prepSessionsByHost = new Map();

function parseRoster(raw) {
  if (!raw) return { version: 1, slots: Array(5).fill(null) };
  try {
    const p = JSON.parse(raw);
    if (p && Array.isArray(p.slots)) return p;
  } catch {
    /* ignore */
  }
  return { version: 1, slots: Array(5).fill(null) };
}

export function getSession(sessionId) {
  return sessions.get(sessionId) || null;
}

/** Open prep-phase fight any party member (or host) can join. */
export function findOpenPrepSessionForUser(userId) {
  const partyIds = getPartyMemberIds(userId);
  for (const uid of partyIds) {
    const sessionId = prepSessionsByHost.get(uid);
    if (!sessionId) continue;
    const session = sessions.get(sessionId);
    if (
      session &&
      session.coop &&
      !session.locked &&
      session.state?.phase === "prep" &&
      Date.now() <= session.prepEndsAt
    ) {
      return session;
    }
    prepSessionsByHost.delete(uid);
  }
  return null;
}

export function isSessionParticipant(session, userId) {
  if (!session) return false;
  if (session.coop) return session.participants.has(userId);
  return session.userId === userId;
}

/** Baseline snapshot when a fight starts (blocks save drift during combat). */
export function snapshotCombatStart(userId, slotIndex, player) {
  if (!player || slotIndex < 0) return;
  upsertSnapshot(userId, slotIndex, player, null);
}

function clearPrepTimer(session) {
  if (session.prepTimer) {
    clearTimeout(session.prepTimer);
    session.prepTimer = null;
  }
}

function lockCoopSession(session) {
  if (session.locked) return;
  clearPrepTimer(session);
  session.locked = true;
  if (session.state.phase === "prep") {
    beginCoopFromPrep(session);
    broadcastCoopCombat(session, { began: true });
  }
}

function schedulePrepTimeout(session) {
  const remaining = Math.max(500, session.prepEndsAt - Date.now());
  session.prepTimer = setTimeout(() => {
    if (!sessions.has(session.sessionId)) return;
    if (session.locked) return;
    lockCoopSession(session);
  }, remaining);
  session.prepTimer.unref?.();
}

export function startCoopSession(hostUserId, { player, slotIndex, encounter, rngSeed }) {
  const { state, rngSeed: seed, rng, prepEndsAt } = createCoopPrepState(
    hostUserId,
    player,
    encounter,
    rngSeed
  );
  const sessionId = `c_${hostUserId}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const participants = new Map();
  participants.set(hostUserId, {
    userId: hostUserId,
    slotIndex,
    player,
    ready: false
  });
  const session = {
    sessionId,
    coop: true,
    hostUserId,
    userId: hostUserId,
    slotIndex,
    player,
    participants,
    locked: false,
    prepEndsAt,
    state,
    rng,
    rngSeed: seed,
    createdAt: Date.now(),
    prepTimer: null
  };
  sessions.set(sessionId, session);
  prepSessionsByHost.set(hostUserId, sessionId);
  schedulePrepTimeout(session);
  broadcastCoopCombat(session);
  return session;
}

export function joinCoopSession(sessionId, userId, { player, slotIndex }) {
  const session = sessions.get(sessionId);
  if (!session || !session.coop) {
    const err = new Error("Combat session not found.");
    err.status = 404;
    throw err;
  }
  if (session.locked || session.state.phase !== "prep") {
    const err = new Error("This fight has already started.");
    err.status = 400;
    throw err;
  }
  if (Date.now() > session.prepEndsAt) {
    const err = new Error("Preparation time has expired.");
    err.status = 400;
    throw err;
  }
  if (session.participants.has(userId)) {
    const err = new Error("You are already in this fight.");
    err.status = 400;
    throw err;
  }
  const partyIds = getPartyMemberIds(session.hostUserId);
  if (!partyIds.includes(userId)) {
    const err = new Error("You must be in the host's party to join.");
    err.status = 403;
    throw err;
  }
  if (!sameTileForJoin(session, userId)) {
    const err = new Error("You must be on the same map tile as the host.");
    err.status = 403;
    throw err;
  }
  const check = canAddParticipantParty(session, player);
  if (!check.ok) {
    const err = new Error(check.message);
    err.status = 400;
    throw err;
  }
  preparePlayerForCombat(player);
  snapshotCombatStart(userId, slotIndex, player);
  session.participants.set(userId, { userId, slotIndex, player, ready: false });
  appendParticipantToState(session, userId, player);
  broadcastCoopCombat(session);
  return session;
}

/** @deprecated use startCoopSession */
export function startSession(userId, opts) {
  return startCoopSession(userId, opts);
}

export function runAction(sessionId, action, actingUserId) {
  const session = sessions.get(sessionId);
  if (!session) {
    const err = new Error("Combat session not found.");
    err.status = 404;
    throw err;
  }
  const uid = actingUserId != null ? actingUserId : session.userId;
  if (!isSessionParticipant(session, uid)) {
    const err = new Error("Combat session not found.");
    err.status = 404;
    throw err;
  }
  const out = processCombatAction(session, action, uid);
  if (out.hostTransferred) {
    prepSessionsByHost.delete(out.hostTransferred.from);
    prepSessionsByHost.set(out.hostTransferred.to, session.sessionId);
    session.hostUserId = out.hostTransferred.to;
    if (session.state) session.state.hostUserId = out.hostTransferred.to;
  } else if (uid === session.hostUserId && !session.participants.has(uid)) {
    prepSessionsByHost.delete(uid);
  }
  if (out.began) {
    clearPrepTimer(session);
    session.locked = true;
  }
  const hasCoopResults =
    out.participantResults && Object.keys(out.participantResults).length > 0;
  if (session.coop && !hasCoopResults && !out.abandoned) {
    const extra = {};
    if (out.began) extra.began = true;
    if (Array.isArray(out.lastEnemyHits) && out.lastEnemyHits.length) {
      extra.lastEnemyHits = out.lastEnemyHits;
    }
    if (Array.isArray(out.lastHits) && out.lastHits.length) {
      extra.lastHits = out.lastHits;
      if (out.actorPartyUid != null) extra.actorPartyUid = out.actorPartyUid;
    }
    broadcastCoopCombat(session, extra, uid);
  }
  return { session, ...out };
}

export async function persistPlayerToRoster(userId, slotIndex, player, combatResult = null) {
  const raw = getRosterJson(userId);
  const roster = parseRoster(raw);
  if (slotIndex >= 0 && slotIndex < roster.slots.length) {
    roster.slots[slotIndex] = player;
  }
  upsertRosterJson(userId, JSON.stringify(roster));
  const grants = combatResult ? buildPendingGrantsFromCombatResult(combatResult) : null;
  upsertSnapshot(userId, slotIndex, player, grants);
  return roster;
}

export async function persistCoopResults(session, participantResults) {
  const rosters = {};
  for (const [userId, result] of Object.entries(participantResults)) {
    const part = session.participants.get(Number(userId)) || session.participants.get(userId);
    if (!part) continue;
    rosters[userId] = await persistPlayerToRoster(part.userId, part.slotIndex, part.player, result);
  }
  return rosters;
}

/** Persist roster for a player who left the coop session (no longer in participants). */
export async function persistLeaveResult(userId, slotIndex, player, result) {
  return persistPlayerToRoster(userId, slotIndex, player, result);
}

export function notifyPartyOfFight(session, encounterMeta) {
  notifyPartyFightStarted(session.hostUserId, {
    sessionId: session.sessionId,
    region: encounterMeta?.region || null,
    mob: encounterMeta?.mob || null,
    worldMapContext: session.state?.worldMapContext || null,
    prepEndsAt: session.prepEndsAt
  });
}

/** Slot indices with an in-progress online combat session. */
export function getActiveCombatSlotsForUser(userId) {
  const set = new Set();
  for (const session of sessions.values()) {
    if (session.coop) {
      const part = session.participants.get(userId);
      if (part && typeof part.slotIndex === "number" && session.state?.phase !== "ended") {
        set.add(part.slotIndex);
      }
    } else if (session.userId === userId && typeof session.slotIndex === "number") {
      set.add(session.slotIndex);
    }
  }
  return set;
}

export function endSession(sessionId) {
  const session = sessions.get(sessionId);
  if (session) {
    clearPrepTimer(session);
    if (session.hostUserId != null) prepSessionsByHost.delete(session.hostUserId);
  }
  sessions.delete(sessionId);
}

/** Remove stale sessions (> 2 hours). */
export function pruneSessions() {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [id, s] of sessions) {
    if (s.createdAt < cutoff) {
      clearPrepTimer(s);
      sessions.delete(id);
    }
  }
}

setInterval(pruneSessions, 15 * 60 * 1000).unref?.();
