/**
 * Online party invites, roster, and fight invitations.
 */

import { byUserId, displayLabel, sendJsonToUser } from "./hub.js";
import { findUserIdByCharacterName } from "./chat.js";
import { presenceMatchesWorldMapContext } from "./location.js";

/** @type {Map<number, string>} userId -> partyId */
const userParty = new Map();
/** @type {Map<string, { leaderId: number, memberIds: Set<number> }>} */
const parties = new Map();
/** @type {Map<number, { fromUserId: number, fromName: string, partyId: string | null, t: number }>} */
const pendingInvites = new Map();
/** @type {Map<number, { hostUserId: number, hostName: string, sessionId: string, region: object, mob: object, worldMapContext: object | null, prepEndsAt: number, expires: number }>} */
const pendingFightInvites = new Map();

const INVITE_TTL_MS = 120_000;
const FIGHT_INVITE_TTL_MS = 30_000;

function newPartyId() {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function getPartySnapshot(partyId) {
  const party = parties.get(partyId);
  if (!party) return null;
  const members = [];
  for (const uid of party.memberIds) {
    const entry = byUserId.get(uid);
    const member = {
      userId: uid,
      name: entry ? displayLabel(entry) : `Player ${uid}`
    };
    if (entry) {
      member.x = Math.floor(entry.x);
      member.y = Math.floor(entry.y);
      member.page = entry.page || "menu";
      if (entry.dungeonId) {
        member.dungeonId = entry.dungeonId;
        member.dungeonRoomIndex =
          typeof entry.dungeonRoomIndex === "number" ? Math.floor(entry.dungeonRoomIndex) : 0;
      }
    }
    members.push(member);
  }
  return { partyId, leaderId: party.leaderId, members };
}

function broadcastPartyState(partyId) {
  const snap = getPartySnapshot(partyId);
  if (!snap) return;
  const party = parties.get(partyId);
  for (const uid of party.memberIds) {
    sendJsonToUser(uid, { type: "party_state", party: snap });
  }
}

function removeUserFromParty(userId) {
  const partyId = userParty.get(userId);
  if (!partyId) return;
  const party = parties.get(partyId);
  if (!party) {
    userParty.delete(userId);
    return;
  }
  party.memberIds.delete(userId);
  userParty.delete(userId);
  if (party.memberIds.size === 0) {
    parties.delete(partyId);
    return;
  }
  if (party.leaderId === userId) {
    party.leaderId = [...party.memberIds][0];
  }
  broadcastPartyState(partyId);
}

export function getPartyMemberIds(userId) {
  const partyId = userParty.get(userId);
  if (!partyId) return [userId];
  const party = parties.get(partyId);
  if (!party) return [userId];
  return [...party.memberIds];
}

function normalizePresenceName(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\u2019/g, "'")
    .replace(/\s+/g, " ");
}

export function sendPartyInviteToUser(fromUserId, targetUserId, targetNameHint) {
  const fromEntry = byUserId.get(fromUserId);
  if (!fromEntry) return { ok: false, message: "You are not connected." };
  const targetId = Number(targetUserId);
  if (!Number.isFinite(targetId)) return { ok: false, message: "Invalid player." };
  const targetEntry = byUserId.get(targetId);
  if (!targetEntry) {
    return { ok: false, message: "That player is not online." };
  }
  return finishPartyInvite(fromUserId, fromEntry, targetId, targetEntry, targetNameHint);
}

export function sendPartyInvite(fromUserId, targetName) {
  const fromEntry = byUserId.get(fromUserId);
  if (!fromEntry) return { ok: false, message: "You are not connected." };
  const q = normalizePresenceName(targetName);
  if (!q) return { ok: false, message: "Enter a player name to invite." };
  let targetId = null;
  for (const entry of byUserId.values()) {
    if (normalizePresenceName(displayLabel(entry)) === q) {
      targetId = entry.userId;
      break;
    }
  }
  if (!targetId) return { ok: false, message: `Player "${targetName}" is not online.` };
  const targetEntry = byUserId.get(targetId);
  if (!targetEntry) return { ok: false, message: `Player "${targetName}" is not online.` };
  return finishPartyInvite(fromUserId, fromEntry, targetId, targetEntry, targetName);
}

function finishPartyInvite(fromUserId, fromEntry, targetId, targetEntry, targetNameHint) {
  if (targetId === fromUserId) return { ok: false, message: "You cannot invite yourself." };

  const targetPartyId = userParty.get(targetId);
  const fromPartyId = userParty.get(fromUserId);
  if (targetPartyId && fromPartyId && targetPartyId === fromPartyId) {
    return { ok: false, message: "That player is already in your party." };
  }
  if (targetPartyId && (!fromPartyId || targetPartyId !== fromPartyId)) {
    return { ok: false, message: "That player is already in another party." };
  }

  const partyId = fromPartyId || null;
  pendingInvites.set(targetId, {
    fromUserId,
    fromName: displayLabel(fromEntry),
    partyId,
    t: Date.now()
  });

  sendJsonToUser(targetId, {
    type: "party_invite",
    fromUserId,
    fromName: displayLabel(fromEntry),
    partyId
  });

  const label = displayLabel(targetEntry);
  const hint = typeof targetNameHint === "string" && targetNameHint.trim() ? targetNameHint.trim() : label;
  return { ok: true, message: `Invite sent to ${label || hint}.` };
}

export function acceptPartyInvite(userId) {
  const invite = pendingInvites.get(userId);
  if (!invite || Date.now() - invite.t > INVITE_TTL_MS) {
    pendingInvites.delete(userId);
    return { ok: false, message: "No pending party invite." };
  }
  pendingInvites.delete(userId);

  const fromId = invite.fromUserId;
  let partyId = invite.partyId || userParty.get(fromId);

  if (!partyId) {
    partyId = newPartyId();
    parties.set(partyId, { leaderId: fromId, memberIds: new Set([fromId]) });
    userParty.set(fromId, partyId);
  }

  const party = parties.get(partyId);
  if (!party) return { ok: false, message: "Party no longer exists." };

  if (userParty.get(userId) && userParty.get(userId) !== partyId) {
    return { ok: false, message: "Leave your current party first." };
  }

  party.memberIds.add(userId);
  userParty.set(userId, partyId);
  broadcastPartyState(partyId);
  return { ok: true };
}

export function declinePartyInvite(userId) {
  pendingInvites.delete(userId);
  return { ok: true };
}

export function leaveParty(userId) {
  removeUserFromParty(userId);
  sendJsonToUser(userId, { type: "party_state", party: null });
  return { ok: true };
}

function isEligibleForPartyFightInvite(userId, worldMapContext) {
  const entry = byUserId.get(userId);
  if (!entry) return false;
  if (!worldMapContext || typeof worldMapContext !== "object") return true;
  return presenceMatchesWorldMapContext(entry, worldMapContext);
}

export function notifyPartyFightStarted(hostUserId, payload) {
  const memberIds = getPartyMemberIds(hostUserId);
  const hostEntry = byUserId.get(hostUserId);
  const hostName = hostEntry ? displayLabel(hostEntry) : "Party member";
  const expires = Date.now() + FIGHT_INVITE_TTL_MS;
  const wmc = payload.worldMapContext || null;

  for (const uid of memberIds) {
    if (uid === hostUserId) continue;
    if (!isEligibleForPartyFightInvite(uid, wmc)) continue;
    const invite = {
      hostUserId,
      hostName,
      sessionId: payload.sessionId || null,
      region: payload.region,
      mob: payload.mob,
      worldMapContext: payload.worldMapContext || null,
      prepEndsAt: payload.prepEndsAt || null,
      expires
    };
    pendingFightInvites.set(uid, invite);
    sendJsonToUser(uid, { type: "fight_invite", ...invite });
  }
}

export function getPendingFightInvite(userId) {
  const inv = pendingFightInvites.get(userId);
  if (!inv) return null;
  if (Date.now() > inv.expires) {
    pendingFightInvites.delete(userId);
    return null;
  }
  return inv;
}

export function clearFightInvite(userId) {
  pendingFightInvites.delete(userId);
}

export function onUserDisconnected(userId) {
  pendingInvites.delete(userId);
  pendingFightInvites.delete(userId);
  void import("./commission_craft.js")
    .then((m) => m.clearCraftInvitesForUser(userId))
    .catch(() => {});
  removeUserFromParty(userId);
}
