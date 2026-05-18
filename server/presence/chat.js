import { byUserId, displayLabel, sendJsonToUser } from "./hub.js";

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

  const channel = opts.channel === "world" || opts.channel === "private" ? opts.channel : "local";
  const from = displayLabel(senderEntry);
  const base = { type: "chat", channel, from, fromUserId: senderEntry.userId, text, t: Date.now() };

  if (channel === "world") {
    broadcastJson({ ...base });
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

  // Local: same world map tile (adventure coordinates).
  if (senderEntry.page !== "adventure") {
    sendJsonToUser(senderEntry.userId, {
      type: "chat_error",
      message: "Local chat is only available while exploring the world map."
    });
    return;
  }
  const mapX = Math.floor(senderEntry.x);
  const mapY = Math.floor(senderEntry.y);
  const payload = { ...base, mapX, mapY };
  broadcastJson(payload, (entry) => {
    if (entry.page !== "adventure") return false;
    return Math.floor(entry.x) === mapX && Math.floor(entry.y) === mapY;
  });
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
