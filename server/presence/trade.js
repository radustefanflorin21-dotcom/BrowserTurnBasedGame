/**
 * Player-to-player trade: invite → session → dual confirm → atomic exchange.
 */

import { getItemBaseName } from "../progression/item_helpers.js";
import { getMarketItemMeta } from "../progression/market_catalog.js";
import { loadPlayerForSlot, savePlayerForSlot, validateSlotIndex } from "../progression/roster_ops.js";
import { logEconomyEvent } from "../economy/audit.js";
import { byUserId, displayLabel, sendJsonToUser } from "./hub.js";

const INVITE_TTL_MS = 120_000;
const SESSION_TTL_MS = 600_000;
const TRADE_SLOTS = 8;

/** @type {Map<number, object>} targetUserId -> invite */
const pendingInvites = new Map();
/** @type {Map<string, object>} sessionId -> session */
const activeSessions = new Map();
/** @type {Map<number, string>} userId -> sessionId */
const userSession = new Map();

function newSessionId() {
  return `t_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeGold(raw) {
  return Math.max(0, Math.min(999_999_999, Math.floor(Number(raw) || 0)));
}

function normalizeTradeItems(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const entry of raw.slice(0, TRADE_SLOTS)) {
    if (typeof entry === "string" && entry.trim()) {
      out.push({ name: entry.trim(), quantity: 1 });
      continue;
    }
    if (entry && typeof entry.name === "string" && entry.name.trim()) {
      out.push({
        name: entry.name.trim(),
        quantity: Math.max(1, Math.min(999, Math.floor(Number(entry.quantity) || 1)))
      });
    }
  }
  return out;
}

function collectItemsFromInventory(inventory, items) {
  let inv = Array.isArray(inventory) ? inventory.slice() : [];
  const picked = [];
  for (const entry of items) {
    const itemName = entry.name;
    const qty = entry.quantity || 1;
    const meta = getMarketItemMeta(itemName);
    if (!meta) {
      const err = new Error(`Unknown item: ${itemName}`);
      err.status = 400;
      throw err;
    }
    if (meta.stackable) {
      const base = getItemBaseName(itemName);
      const stack = [];
      for (let i = inv.length - 1; i >= 0 && stack.length < qty; i--) {
        if (getItemBaseName(inv[i]) === base) {
          stack.push(inv[i]);
          inv.splice(i, 1);
        }
      }
      if (stack.length < qty) {
        const err = new Error(`Not enough ${itemName} (need ${qty}).`);
        err.status = 400;
        throw err;
      }
      picked.push(...stack.reverse());
    } else {
      if (qty !== 1) {
        const err = new Error(`${itemName} cannot be traded in stacks.`);
        err.status = 400;
        throw err;
      }
      const want = String(itemName).trim();
      let idx = inv.indexOf(want);
      if (idx === -1) idx = inv.findIndex((e) => typeof e === "string" && e.trim() === want);
      if (idx === -1) {
        const err = new Error(`${itemName} not in inventory.`);
        err.status = 400;
        throw err;
      }
      picked.push(inv[idx]);
      inv.splice(idx, 1);
    }
  }
  return { inventory: inv, picked };
}

function addItemsToInventory(inventory, items) {
  const inv = Array.isArray(inventory) ? inventory.slice() : [];
  (Array.isArray(items) ? items : []).forEach((it) => {
    if (typeof it === "string" && it.trim()) inv.push(it);
  });
  return inv;
}

function sideFromSession(session, userId) {
  if (session.sideA.userId === userId) return session.sideA;
  if (session.sideB.userId === userId) return session.sideB;
  return null;
}

function otherSide(session, userId) {
  return session.sideA.userId === userId ? session.sideB : session.sideA;
}

function publicTradeState(session, viewerUserId) {
  const me = sideFromSession(session, viewerUserId);
  const them = otherSide(session, viewerUserId);
  if (!me || !them) return null;
  return {
    sessionId: session.sessionId,
    partnerUserId: them.userId,
    partnerName: them.name,
    myOffer: { gold: me.gold, items: me.items.slice(), confirmed: me.confirmed },
    theirOffer: { gold: them.gold, items: them.items.slice(), confirmed: them.confirmed },
    expiresAt: session.expiresAt
  };
}

function broadcastTradeState(session) {
  for (const uid of [session.sideA.userId, session.sideB.userId]) {
    const state = publicTradeState(session, uid);
    if (state) sendJsonToUser(uid, { type: "trade_state", trade: state });
  }
}

function endSession(sessionId, reason) {
  const session = activeSessions.get(sessionId);
  if (!session) return;
  activeSessions.delete(sessionId);
  userSession.delete(session.sideA.userId);
  userSession.delete(session.sideB.userId);
  for (const uid of [session.sideA.userId, session.sideB.userId]) {
    sendJsonToUser(uid, { type: "trade_closed", sessionId, reason: reason || "closed" });
  }
}

export function sendTradeRequest(fromUserId, payload) {
  const fromEntry = byUserId.get(fromUserId);
  if (!fromEntry) return { ok: false, message: "You are not connected." };

  const targetUserId = Number(payload?.targetUserId);
  if (!Number.isFinite(targetUserId) || targetUserId <= 0) {
    return { ok: false, message: "Invalid player." };
  }
  if (targetUserId === fromUserId) return { ok: false, message: "You cannot trade with yourself." };
  if (userSession.has(fromUserId) || userSession.has(targetUserId)) {
    return { ok: false, message: "A trade is already in progress." };
  }

  const targetEntry = byUserId.get(targetUserId);
  if (!targetEntry) return { ok: false, message: "That player is not online." };

  const slotIndex = validateSlotIndex(Number(payload?.slotIndex ?? fromEntry.slotIndex));

  pendingInvites.set(targetUserId, {
    fromUserId,
    fromName: displayLabel(fromEntry),
    fromSlotIndex: slotIndex,
    t: Date.now()
  });

  sendJsonToUser(targetUserId, {
    type: "trade_invite",
    fromUserId,
    fromName: displayLabel(fromEntry)
  });

  return { ok: true, message: `Trade request sent to ${displayLabel(targetEntry)}.` };
}

export function acceptTradeInvite(targetUserId, payload) {
  const invite = pendingInvites.get(targetUserId);
  if (!invite || Date.now() - invite.t > INVITE_TTL_MS) {
    pendingInvites.delete(targetUserId);
    return { ok: false, message: "No pending trade request." };
  }
  pendingInvites.delete(targetUserId);

  const fromUserId = invite.fromUserId;
  if (userSession.has(fromUserId) || userSession.has(targetUserId)) {
    return { ok: false, message: "A trade is already in progress." };
  }

  const fromEntry = byUserId.get(fromUserId);
  const targetEntry = byUserId.get(targetUserId);
  if (!fromEntry || !targetEntry) {
    return { ok: false, message: "Player went offline." };
  }

  const targetSlotIndex = validateSlotIndex(Number(payload?.slotIndex ?? targetEntry.slotIndex));
  const sessionId = newSessionId();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const session = {
    sessionId,
    expiresAt,
    sideA: {
      userId: fromUserId,
      name: displayLabel(fromEntry),
      slotIndex: invite.fromSlotIndex,
      gold: 0,
      items: [],
      confirmed: false
    },
    sideB: {
      userId: targetUserId,
      name: displayLabel(targetEntry),
      slotIndex: targetSlotIndex,
      gold: 0,
      items: [],
      confirmed: false
    }
  };
  activeSessions.set(sessionId, session);
  userSession.set(fromUserId, sessionId);
  userSession.set(targetUserId, sessionId);

  broadcastTradeState(session);
  return { ok: true, message: "Trade session started.", sessionId };
}

export function declineTradeInvite(targetUserId) {
  const invite = pendingInvites.get(targetUserId);
  pendingInvites.delete(targetUserId);
  if (invite) {
    sendJsonToUser(invite.fromUserId, {
      type: "trade_result",
      ok: false,
      message: "Trade request declined."
    });
  }
  return { ok: true };
}

export function updateTradeOffer(userId, payload) {
  const sessionId = userSession.get(userId);
  const session = sessionId ? activeSessions.get(sessionId) : null;
  if (!session || Date.now() > session.expiresAt) {
    if (sessionId) endSession(sessionId, "expired");
    return { ok: false, message: "No active trade session." };
  }

  const side = sideFromSession(session, userId);
  if (!side) return { ok: false, message: "Not in this trade." };

  side.gold = normalizeGold(payload?.gold);
  side.items = normalizeTradeItems(payload?.items);
  side.confirmed = false;
  otherSide(session, userId).confirmed = false;

  broadcastTradeState(session);
  return { ok: true, message: "Offer updated." };
}

function executeTrade(session) {
  const a = session.sideA;
  const b = session.sideB;
  const loadA = loadPlayerForSlot(a.userId, a.slotIndex);
  const loadB = loadPlayerForSlot(b.userId, b.slotIndex);

  const goldA = typeof loadA.player.gold === "number" ? Math.max(0, Math.floor(loadA.player.gold)) : 0;
  const goldB = typeof loadB.player.gold === "number" ? Math.max(0, Math.floor(loadB.player.gold)) : 0;
  if (a.gold > goldA) throw Object.assign(new Error("Not enough gold."), { status: 400 });
  if (b.gold > goldB) throw Object.assign(new Error("Partner does not have enough gold."), { status: 400 });

  const pickA = collectItemsFromInventory(loadA.player.inventory, a.items);
  const pickB = collectItemsFromInventory(loadB.player.inventory, b.items);

  loadA.player.inventory = pickA.inventory;
  loadB.player.inventory = pickB.inventory;
  loadA.player.gold = goldA - a.gold + b.gold;
  loadB.player.gold = goldB - b.gold + a.gold;
  loadA.player.inventory = addItemsToInventory(loadA.player.inventory, pickB.picked);
  loadB.player.inventory = addItemsToInventory(loadB.player.inventory, pickA.picked);

  const rosterA = savePlayerForSlot(a.userId, loadA.roster, a.slotIndex, loadA.player);
  const rosterB = savePlayerForSlot(b.userId, loadB.roster, b.slotIndex, loadB.player);

  logEconomyEvent(a.userId, {
    kind: "trade_complete",
    slotIndex: a.slotIndex,
    meta: { sessionId: session.sessionId, partnerUserId: b.userId, gaveGold: a.gold, receivedGold: b.gold }
  });
  logEconomyEvent(b.userId, {
    kind: "trade_complete",
    slotIndex: b.slotIndex,
    meta: { sessionId: session.sessionId, partnerUserId: a.userId, gaveGold: b.gold, receivedGold: a.gold }
  });

  return { rosterA, rosterB, playerA: loadA.player, playerB: loadB.player };
}

export function confirmTrade(userId) {
  const sessionId = userSession.get(userId);
  const session = sessionId ? activeSessions.get(sessionId) : null;
  if (!session || Date.now() > session.expiresAt) {
    if (sessionId) endSession(sessionId, "expired");
    return { ok: false, message: "No active trade session." };
  }

  const side = sideFromSession(session, userId);
  if (!side) return { ok: false, message: "Not in this trade." };
  side.confirmed = true;

  const other = otherSide(session, userId);
  if (!other.confirmed) {
    broadcastTradeState(session);
    return { ok: true, message: "Waiting for partner to confirm.", waiting: true };
  }

  try {
    const result = executeTrade(session);
    endSession(sessionId, "complete");
    sendJsonToUser(session.sideA.userId, {
      type: "trade_complete",
      sessionId,
      roster: result.rosterA.roster,
      revision: result.rosterA.revision
    });
    sendJsonToUser(session.sideB.userId, {
      type: "trade_complete",
      sessionId,
      roster: result.rosterB.roster,
      revision: result.rosterB.revision
    });
    return { ok: true, message: "Trade complete!", complete: true };
  } catch (err) {
    session.sideA.confirmed = false;
    session.sideB.confirmed = false;
    broadcastTradeState(session);
    return { ok: false, message: err.message || "Trade failed." };
  }
}

export function cancelTrade(userId) {
  const sessionId = userSession.get(userId);
  if (sessionId) endSession(sessionId, "cancelled");
  pendingInvites.delete(userId);
  for (const [targetId, inv] of pendingInvites.entries()) {
    if (inv.fromUserId === userId) pendingInvites.delete(targetId);
  }
  return { ok: true, message: "Trade cancelled." };
}

export function onUserDisconnected(userId) {
  cancelTrade(userId);
  for (const [targetId, inv] of pendingInvites.entries()) {
    if (inv.fromUserId === userId) {
      pendingInvites.delete(targetId);
      sendJsonToUser(targetId, { type: "trade_result", ok: false, message: "Trade request cancelled." });
    }
  }
}
