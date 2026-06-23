import { byUserId, displayLabel, sendJsonToUser } from "./hub.js";
import { getPartyMemberIds } from "./party.js";
import { canReceiveLocalChatFrom, normalizeDungeonId } from "./location.js";

const MAX_CHAT_LEN = 500;

function sanitizeText(text) {
  if (typeof text !== "string") return "";
  return text.replace(/\s+/g, " ").trim().slice(0, MAX_CHAT_LEN);
}

function broadcastJson(payload, filterFn) {
  const raw = JSON.stringify(payload);
  for (const entry of byUserId.values()) {
    if (filterFn && !filterFn(entry)) continue;
    for (const socket of entry.sockets) {
      if (socket.readyState === 1) {
        try {
          socket.send(raw);
        } catch {
          /* ignore */
        }
      }
    }
  }
}

/**
 * @param {import("./hub.js").PresenceEntry & { sockets: Set<object> }} senderEntry
 * @param {{ channel: string, text: string, targetName?: string }} opts
 */
export function deliverChatMessage(senderEntry, opts) {
  const text = sanitizeText(opts.text);
  if (!text) {
    sendJsonToUser(senderEntry.userId, { type: "chat_error", message: "Message cannot be empty." });
    return;
  }

  const channel =
    opts.channel === "world" || opts.channel === "private" || opts.channel === "party"
      ? opts.channel
      : "local";
  const from = displayLabel(senderEntry);
  const base = { type: "chat", channel, from, fromUserId: senderEntry.userId, text, t: Date.now() };

  if (channel === "world") {
    broadcastJson({ ...base });
    return;
  }

  if (channel === "party") {
    const memberIds = getPartyMemberIds(senderEntry.userId);
    if (memberIds.length <= 1) {
      sendJsonToUser(senderEntry.userId, {
        type: "chat_error",
        message: "Party chat is only available while you are in a party."
      });
      return;
    }
    const payload = { ...base };
    for (const uid of memberIds) {
      sendJsonToUser(uid, payload);
    }
    return;
  }

  if (channel === "private") {
    const targetName = typeof opts.targetName === "string" ? opts.targetName.trim() : "";
    if (!targetName) {
      sendJsonToUser(senderEntry.userId, {
        type: "chat_error",
        message: "Private messages require a recipient: /p Name your message"
      });
      return;
    }
    const targetId = findUserIdByCharacterName(targetName);
    if (!targetId || targetId === senderEntry.userId) {
      sendJsonToUser(senderEntry.userId, {
        type: "chat_error",
        message: targetId === senderEntry.userId ? "You cannot message yourself." : `Player "${targetName}" is not online.`
      });
      return;
    }
    const targetEntry = byUserId.get(targetId);
    const toLabel = targetEntry ? displayLabel(targetEntry) : targetName;
    const payload = { ...base, to: toLabel, toUserId: targetId };
    sendJsonToUser(senderEntry.userId, payload);
    sendJsonToUser(targetId, payload);
    return;
  }

  // Local: same overworld tile or same dungeon chamber.
  if (channel !== "local") return;
  if (senderEntry.page !== "adventure") {
    sendJsonToUser(senderEntry.userId, {
      type: "chat_error",
      message: "Local chat is only available while exploring or in a dungeon."
    });
    return;
  }
  const mapX = Math.floor(senderEntry.x);
  const mapY = Math.floor(senderEntry.y);
  const dungeonId = normalizeDungeonId(senderEntry.dungeonId);
  const payload = {
    ...base,
    mapX,
    mapY,
    ...(dungeonId
      ? { dungeonId, dungeonRoomIndex: Math.max(0, Math.floor(senderEntry.dungeonRoomIndex || 0)) }
      : {})
  };
  broadcastJson(payload, (entry) => canReceiveLocalChatFrom(senderEntry, entry));
}

/**
 * @param {string} name
 * @returns {number | null}
 */
export function findUserIdByCharacterName(name) {
  const q = name.trim().toLowerCase();
  if (!q) return null;
  for (const entry of byUserId.values()) {
    if (displayLabel(entry).toLowerCase() === q) return entry.userId;
  }
  return null;
}
