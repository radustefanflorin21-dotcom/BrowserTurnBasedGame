import { requireAuth } from "./auth.js";
import { getRosterJson } from "./db.js";
import {
  startCoopSession,
  joinCoopSession,
  runAction,
  persistCoopResults,
  persistLeaveResult,
  endSession,
  getSession,
  snapshotCombatStart,
  isSessionParticipant,
  notifyPartyOfFight,
  findOpenPrepSessionForUser,
  findActiveCombatSessionForUser,
  resumeCoopSession,
} from "./combat/sessions.js";
import { broadcastCoopCombat, broadcastCoopCombatFinished } from "./combat/broadcast.js";
import { publicParticipantsList } from "./combat/coop.js";
import { preparePlayerForCombat } from "./combat/player_prep.js";
import { applyCombatWorldMapOutcome, resolveAuthoritativeEncounter } from "./progression/world_map.js";
import { syncPresenceDungeonRun } from "./progression/dungeon.js";
import { setSharedDefeat } from "./presence/map_cells.js";
import { broadcastMapCellToTile } from "./presence/hub.js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const MMO_CONSTANTS = require("../shared/mmo_constants.js");
const SLOT_COUNT = MMO_CONSTANTS.CHARACTER_SLOT_COUNT;

function parseRoster(raw) {
  if (!raw) return { version: 1, slots: Array(SLOT_COUNT).fill(null) };
  try {
    const p = JSON.parse(raw);
    if (p && Array.isArray(p.slots)) {
      while (p.slots.length < SLOT_COUNT) p.slots.push(null);
      return p;
    }
  } catch {
    /* ignore */
  }
  return { version: 1, slots: Array(SLOT_COUNT).fill(null) };
}

function getPlayerFromRoster(userId, slotIndex) {
  const roster = parseRoster(getRosterJson(userId));
  const idx = Number(slotIndex);
  if (!Number.isFinite(idx) || idx < 0 || idx >= SLOT_COUNT) return null;
  if (!roster.slots[idx]) return null;
  const copy = JSON.parse(JSON.stringify(roster.slots[idx]));
  return preparePlayerForCombat(copy);
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
  if (mapCell) broadcastMapCellToTile(x, y, mapCell);
}

export function registerCombatRoutes(app) {
  app.post("/api/combat/resume", requireAuth, (req, res) => {
    try {
      const idx = Number(req.body?.slotIndex);
      if (!Number.isFinite(idx) || idx < 0 || idx >= SLOT_COUNT) {
        res.status(400).json({ error: "Invalid character slot." });
        return;
      }
      const session = findActiveCombatSessionForUser(req.user.id);
      if (!session) {
        res.json({ sessionId: null, resumed: false });
        return;
      }
      const playerCopy = getPlayerFromRoster(req.user.id, idx);
      if (!playerCopy) {
        res.status(400).json({ error: "No character in that slot." });
        return;
      }
      const part = session.participants.get(req.user.id);
      if (part && part.slotIndex !== idx) {
        res.status(400).json({
          error: "This character was not in that fight. Select the slot you used for this combat."
        });
        return;
      }
      resumeCoopSession(session.sessionId, req.user.id, {
        player: playerCopy,
        slotIndex: idx
      });
      broadcastCoopCombat(session);
      const myPart = session.participants.get(req.user.id);
      res.json({
        sessionId: session.sessionId,
        resumed: true,
        rngSeed: session.rngSeed,
        state: session.state,
        prepEndsAt: session.prepEndsAt,
        hostUserId: session.hostUserId,
        locked: session.locked,
        player: myPart?.player,
        participants: publicParticipantsList(session),
        participantCount: session.participants.size
      });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Failed to resume combat." });
    }
  });

  app.get("/api/combat/party-session", requireAuth, (req, res) => {
    const session = findOpenPrepSessionForUser(req.user.id);
    if (!session) {
      res.json({ sessionId: null });
      return;
    }
    res.json({
      sessionId: session.sessionId,
      hostUserId: session.hostUserId,
      prepEndsAt: session.prepEndsAt,
      locked: session.locked,
      isHost: session.hostUserId === req.user.id
    });
  });

  app.post("/api/combat/start", requireAuth, (req, res) => {
    try {
      const { slotIndex, encounter, rngSeed } = req.body || {};
      const idx = Number(slotIndex);
      if (!Number.isFinite(idx) || idx < 0 || idx >= SLOT_COUNT) {
        res.status(400).json({ error: "Invalid character slot." });
        return;
      }
      const existing = findOpenPrepSessionForUser(req.user.id);
      if (existing) {
        if (existing.hostUserId !== req.user.id) {
          res.status(409).json({
            error: "Your party already has a fight preparing. Join that fight instead of starting a new one.",
            sessionId: existing.sessionId,
            shouldJoin: true,
            prepEndsAt: existing.prepEndsAt,
            hostUserId: existing.hostUserId
          });
          return;
        }
        res.json({
          sessionId: existing.sessionId,
          rngSeed: existing.rngSeed,
          state: existing.state,
          prepEndsAt: existing.prepEndsAt,
          hostUserId: existing.hostUserId,
          locked: existing.locked,
          resumed: true
        });
        return;
      }
      const playerCopy = getPlayerFromRoster(req.user.id, idx);
      if (!playerCopy) {
        res.status(400).json({ error: "No character in that slot." });
        return;
      }
      snapshotCombatStart(req.user.id, idx, playerCopy);
      const resolvedEncounter = resolveAuthoritativeEncounter(playerCopy, encounter || {});
      const session = startCoopSession(req.user.id, {
        player: playerCopy,
        slotIndex: idx,
        encounter: resolvedEncounter,
        rngSeed
      });
      notifyPartyOfFight(session, {
        region: req.body?.region || null,
        mob: resolvedEncounter?.units ? { units: resolvedEncounter.units } : resolvedEncounter
      });
      res.json({
        sessionId: session.sessionId,
        rngSeed: session.rngSeed,
        state: session.state,
        prepEndsAt: session.prepEndsAt,
        hostUserId: session.hostUserId,
        locked: session.locked
      });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Failed to start combat." });
    }
  });

  app.post("/api/combat/join", requireAuth, (req, res) => {
    try {
      const { sessionId, slotIndex } = req.body || {};
      if (!sessionId || typeof sessionId !== "string") {
        res.status(400).json({ error: "sessionId required." });
        return;
      }
      const idx = Number(slotIndex);
      if (!Number.isFinite(idx) || idx < 0 || idx >= SLOT_COUNT) {
        res.status(400).json({ error: "Invalid character slot." });
        return;
      }
      const playerCopy = getPlayerFromRoster(req.user.id, idx);
      if (!playerCopy) {
        res.status(400).json({ error: "No character in that slot." });
        return;
      }
      const session = joinCoopSession(sessionId, req.user.id, {
        player: playerCopy,
        slotIndex: idx
      });
      res.json({
        sessionId: session.sessionId,
        rngSeed: session.rngSeed,
        state: session.state,
        prepEndsAt: session.prepEndsAt,
        hostUserId: session.hostUserId,
        locked: session.locked
      });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Failed to join combat." });
    }
  });

  app.post("/api/combat/action", requireAuth, async (req, res) => {
    try {
      const { sessionId, action } = req.body || {};
      if (!sessionId || typeof sessionId !== "string") {
        res.status(400).json({ error: "sessionId required." });
        return;
      }
      const session = getSession(sessionId);
      if (!isSessionParticipant(session, req.user.id)) {
        res.status(404).json({ error: "Combat session not found." });
        return;
      }
      const out = runAction(sessionId, action || {}, req.user.id);

      if (out.finished && out.abandoned) {
        let roster = null;
        if (out.leaverPlayer && out.result) {
          roster = await persistLeaveResult(
            req.user.id,
            out.leaverSlotIndex,
            out.leaverPlayer,
            out.result
          );
        }
        endSession(sessionId);
        res.json({
          state: out.state,
          finished: true,
          abandoned: true,
          result: out.result || undefined,
          player: out.leaverPlayer || undefined,
          roster
        });
        return;
      }

      if (out.finished && out.left && out.result && out.leaverPlayer) {
        applyCombatWorldMapOutcome(out.leaverPlayer, session.state, out.result);
        syncPresenceDungeonRun(req.user.id, out.leaverPlayer);
        const roster = await persistLeaveResult(
          req.user.id,
          out.leaverSlotIndex,
          out.leaverPlayer,
          out.result
        );
        res.json({
          state: out.state,
          finished: true,
          left: true,
          result: out.result,
          player: out.leaverPlayer,
          roster
        });
        return;
      }

      const coopResults = out.participantResults;
      if (out.finished && coopResults && Object.keys(coopResults).length > 0) {
        const victoryResult = Object.values(coopResults).find((r) => r?.victory);
        if (victoryResult) applyWorldMapVictory(session, victoryResult);
        for (const [userId, result] of Object.entries(coopResults)) {
          const part = session.participants.get(Number(userId)) || session.participants.get(userId);
          if (part?.player) {
            applyCombatWorldMapOutcome(part.player, session.state, result);
            syncPresenceDungeonRun(Number(userId), part.player);
          }
        }
        const rosters = await persistCoopResults(session, out.participantResults);
        broadcastCoopCombatFinished(session, out.participantResults, rosters, {
          lastHits: out.lastHits,
          lastEnemyHits: out.lastEnemyHits,
          actorPartyUid: out.actorPartyUid
        });
        endSession(sessionId);
        const myResult = coopResults[req.user.id];
        const myPart = session.participants.get(req.user.id);
        res.json({
          state: out.state,
          finished: true,
          result: myResult,
          participantResults: coopResults,
          lastHits: out.lastHits || undefined,
          lastEnemyHits: out.lastEnemyHits || undefined,
          actorPartyUid: out.actorPartyUid,
          player: myPart?.player,
          roster: rosters[req.user.id]
        });
        return;
      }

      if (out.finished && out.result) {
        applyCombatWorldMapOutcome(session.player, session.state, out.result);
        syncPresenceDungeonRun(req.user.id, session.player);
        applyWorldMapVictory(session, out.result);
        const rosterPayload = await persistCoopResults(session, {
          [req.user.id]: out.result
        });
        endSession(sessionId);
        res.json({
          state: out.state,
          finished: true,
          result: out.result,
          lastHits: out.lastHits || undefined,
          player: session.player,
          roster: rosterPayload[req.user.id]
        });
        return;
      }

      const myPart = session.participants.get(req.user.id);
      res.json({
        state: out.state,
        finished: !!out.finished,
        result: out.result || undefined,
        lastHits: out.lastHits || undefined,
        lastEnemyHits: out.lastEnemyHits || undefined,
        actorPartyUid: out.actorPartyUid,
        player: myPart?.player,
        began: !!out.began,
        prepEndsAt: session.prepEndsAt,
        locked: session.locked,
        participants: session.coop ? publicParticipantsList(session) : undefined,
        participantCount: session.coop ? session.participants.size : undefined
      });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || "Combat action failed." });
    }
  });

  app.get("/api/combat/:sessionId", requireAuth, (req, res) => {
    const session = getSession(req.params.sessionId);
    if (!isSessionParticipant(session, req.user.id)) {
      res.status(404).json({ error: "Combat session not found." });
      return;
    }
    res.json({
      sessionId: session.sessionId,
      rngSeed: session.rngSeed,
      state: session.state,
      prepEndsAt: session.prepEndsAt,
      hostUserId: session.hostUserId,
      locked: session.locked
    });
  });
}
