import { sendJsonToUser } from "../presence/hub.js";
import { publicParticipantsList } from "./coop.js";

export function broadcastCoopCombat(session, extra = {}, excludeUserId = null) {
  if (!session?.coop) return;
  const payload = {
    type: "combat_state",
    sessionId: session.sessionId,
    state: session.state,
    locked: !!session.locked,
    prepEndsAt: session.prepEndsAt,
    hostUserId: session.hostUserId,
    participants: publicParticipantsList(session),
    participantCount: session.participants ? session.participants.size : 0,
    ...extra
  };
  for (const p of session.participants.values()) {
    if (excludeUserId != null && p.userId === excludeUserId) continue;
    sendJsonToUser(p.userId, payload);
  }
}

/** Notify every participant that the shared fight ended (before session is deleted). */
export function broadcastCoopCombatFinished(
  session,
  participantResults,
  rostersByUser = {},
  hitExtra = {}
) {
  if (!session?.coop) return;
  const extra =
    hitExtra && typeof hitExtra === "object"
      ? {
          ...(Array.isArray(hitExtra.lastHits) && hitExtra.lastHits.length
            ? { lastHits: hitExtra.lastHits, actorPartyUid: hitExtra.actorPartyUid }
            : {}),
          ...(Array.isArray(hitExtra.lastEnemyHits)
            ? { lastEnemyHits: hitExtra.lastEnemyHits }
            : {})
        }
      : {};
  for (const [uid, result] of Object.entries(participantResults || {})) {
    const userId = Number(uid);
    const part = session.participants.get(userId);
    if (!part) continue;
    sendJsonToUser(userId, {
      type: "combat_state",
      sessionId: session.sessionId,
      state: session.state,
      finished: true,
      result,
      player: part.player,
      roster: rostersByUser[userId] || rostersByUser[uid] || null,
      hostUserId: session.hostUserId,
      participants: publicParticipantsList(session),
      ...extra
    });
  }
}
