import { processCombatAction } from "./engine.js";
import { getRosterJson } from "../db.js";
import { buildPendingGrantsFromCombatResult } from "../progression/snapshot.js";
import { upsertSnapshot } from "../progression/store.js";
import { saveRosterDocument } from "../progression/roster_save.js";
import { logEconomyEvent } from "../economy/audit.js";
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
import { applyCombatWorldMapOutcome } from "../progression/world_map.js";
import { syncPresenceDungeonRun } from "../progression/dungeon.js";
import { setSharedDefeat } from "../presence/map_cells.js";

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
  clearPrepTimer(session);
  const ms = Math.max(0, (session.prepEndsAt || 0) - Date.now());
  session.prepTimer = setTimeout(() => {
    session.prepTimer = null;
    lockCoopSession(session);
  }, ms);
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
    ready: false,
    connected: true
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
  broadcastCoopCombat(session);
  schedulePrepTimeout(session);
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
  session.participants.set(userId, { userId, slotIndex, player, ready: false, connected: true });
  appendParticipantToState(session, userId, player);
  broadcastCoopCombat(session);
  return session;
}

/** In-progress coop fight this user can resume (prep or combat, not ended). */
export function findActiveCombatSessionForUser(userId) {
  for (const session of sessions.values()) {
    if (!session.coop) continue;
    if (!session.participants.has(userId)) continue;
    const phase = session.state?.phase;
    if (phase === "ended") continue;
    return session;
  }
  return null;
}

function syncParticipantPlayerFromCombatHero(session, userId, player) {
  const hero = (session.state?.party || []).find(
    (m) => m && m.kind === "hero" && m.controllerUserId === userId
  );
  if (!hero || !player) return player;
  const copy = JSON.parse(JSON.stringify(player));
  copy.hp = Math.max(0, Math.floor(hero.hp));
  if (typeof hero.maxHp === "number") copy.maxHp = hero.maxHp;
  return copy;
}

/**
 * Reattach after refresh: refresh roster snapshot, keep fight state.
 */
export function resumeCoopSession(sessionId, userId, { player, slotIndex }) {
  const session = sessions.get(sessionId);
  if (!session || !session.coop) {
    const err = new Error("Combat session not found.");
    err.status = 404;
    throw err;
  }
  const part = session.participants.get(userId);
  if (!part) {
    const err = new Error("Combat session not found.");
    err.status = 404;
    throw err;
  }
  if (session.state?.phase === "ended") {
    const err = new Error("This fight has already ended.");
    err.status = 400;
    throw err;
  }
  preparePlayerForCombat(player);
  part.player = syncParticipantPlayerFromCombatHero(session, userId, player);
  part.slotIndex = slotIndex;
  part.connected = true;
  session.state.fightLog.push(`— ${part.player?.name || "Hero"} rejoined the fight —`);
  return session;
}

function applyWorldMapVictory(session, result) {
  if (!result?.victory) return;
  const wmc = session.state?.worldMapContext;
  if (!wmc || typeof wmc.x !== "number" || typeof wmc.y !== "number") return;
  const x = Math.floor(wmc.x);
  const y = Math.floor(wmc.y);
  const setIndex = typeof wmc.setIndex === "number" ? Math.floor(wmc.setIndex) : 0;
  const killed = Array.isArray(session.state.enemyNames) ? session.state.enemyNames.slice() : [];
  const mapCell = setSharedDefeat(x, y, setIndex, Date.now(), killed);
  if (mapCell) {
    import("../presence/hub.js").then(({ broadcastMapCellToTile }) => {
      broadcastMapCellToTile(x, y, mapCell);
    });
  }
}

/** Persist/broadcast when a disconnect auto-pass ends the fight (rare). */
async function finalizeCoopVictoryFromOut(session, out) {
  const coopResults = out.participantResults;
  if (!coopResults || !Object.keys(coopResults).length) return;
  const victoryResult = Object.values(coopResults).find((r) => r?.victory);
  if (victoryResult) applyWorldMapVictory(session, victoryResult);
  for (const [userId, result] of Object.entries(coopResults)) {
    const part = session.participants.get(Number(userId)) || session.participants.get(userId);
    if (part?.player) {
      applyCombatWorldMapOutcome(part.player, session.state, result);
      syncPresenceDungeonRun(Number(userId), part.player);
    }
  }
  const rosters = await persistCoopResults(session, coopResults);
  broadcastCoopCombatFinished(session, coopResults, rosters, {
    lastHits: out.lastHits,
    lastEnemyHits: out.lastEnemyHits,
    actorPartyUid: out.actorPartyUid,
    enemyActionSteps: out.enemyActionSteps,
    preEnemySnapshot: out.preEnemySnapshot
  });
  endSession(session.sessionId);
}

/**
 * When a player closes the tab, end their turn so others are not stuck.
 */
export function handleCombatUserDisconnect(userId) {
  for (const session of sessions.values()) {
    if (!session.coop || session.state?.phase === "ended") continue;
    const part = session.participants.get(userId);
    if (!part) continue;
    part.connected = false;
    if (session.state.phase !== "player") continue;
    const activeUid = session.state.activePartyUid;
    const active = (session.state.party || []).find(
      (m) => m && m.uid === activeUid && m.hp > 0 && !m.acted
    );
    if (!active || Number(active.controllerUserId) !== Number(userId)) continue;
    try {
      const out = runAction(session.sessionId, { type: "pass" }, userId);
      if (out.participantResults && Object.keys(out.participantResults).length > 0) {
        void finalizeCoopVictoryFromOut(session, out);
      }
    } catch (err) {
      console.error("Combat disconnect auto-pass failed:", err);
    }
  }
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
    if (Array.isArray(out.lastEnemyHits)) {
      extra.lastEnemyHits = out.lastEnemyHits;
    }
    if (Array.isArray(out.enemyActionSteps)) {
      extra.enemyActionSteps = out.enemyActionSteps;
    }
    if (out.preEnemySnapshot) {
      extra.preEnemySnapshot = out.preEnemySnapshot;
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
  const grants = combatResult ? buildPendingGrantsFromCombatResult(combatResult) : null;
  upsertSnapshot(userId, slotIndex, player, grants);
  const { roster: saved, revision } = saveRosterDocument(userId, roster);
  if (combatResult) {
    logEconomyEvent(userId, {
      kind: combatResult.victory ? "combat_victory" : "combat_defeat",
      slotIndex,
      meta: {
        gold: combatResult.gold || 0,
        xp: combatResult.memberRewards || null,
        items: grants?.items || []
      }
    });
  }
  return { roster: saved, revision };
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
