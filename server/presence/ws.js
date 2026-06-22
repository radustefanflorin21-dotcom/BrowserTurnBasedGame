import { WebSocketServer } from "ws";
import { verifyToken } from "../auth.js";
import {
  attachSocket,
  detachSocket,
  updatePresence,
  scheduleBroadcastPresence,
  getNearbyForViewer,
  getSameMapPlayers,
  byUserId
} from "./hub.js";
import { deliverChatMessage } from "./chat.js";
import {
  getSharedMapCell,
  ensureSharedMapCellRolled,
  ensureSharedMapCellSlotRolled
} from "./map_cells.js";
import { broadcastMapCellToTile } from "./hub.js";
import {
  sendPartyInvite,
  sendPartyInviteToUser,
  acceptPartyInvite,
  declinePartyInvite,
  notifyPartyFightStarted
} from "./party.js";
import { sendCraftInvite, acceptCraftInvite, declineCraftInvite } from "./commission_craft.js";
import { getWorldShardInfo } from "../world/shard.js";

const WS_PATH = "/presence";

/**
 * @param {import("http").Server} httpServer
 */
export function attachPresenceWebSocket(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: WS_PATH });

  wss.on("connection", (socket) => {
    let authedUser = null;

    const failAuth = (message) => {
      try {
        socket.send(JSON.stringify({ type: "error", message: message || "Authentication required." }));
      } catch {
        /* ignore */
      }
      socket.close(4401, "Unauthorized");
    };

    const authTimer = setTimeout(() => {
      if (!authedUser) failAuth("Authentication timeout.");
    }, 10_000);

    socket.on("message", (raw) => {
      let msg;
      try {
        msg = JSON.parse(String(raw));
      } catch {
        return;
      }
      if (!msg || typeof msg !== "object") return;

      if (msg.type === "auth") {
        if (authedUser) return;
        const token = typeof msg.token === "string" ? msg.token.trim() : "";
        const user = token ? verifyToken(token) : null;
        if (!user) {
          failAuth("Invalid or expired session.");
          return;
        }
        authedUser = user;
        clearTimeout(authTimer);
        const { userId, label } = attachSocket(user, socket);
        const entry = byUserId.get(userId);
        const px = entry ? entry.x : 0;
        const py = entry ? entry.y : 0;
        const nearby = getNearbyForViewer(userId, px, py);
        const sameMap = entry && entry.page === "adventure" ? getSameMapPlayers(userId, px, py) : [];
        const rolled =
          entry && entry.page === "adventure" ? ensureSharedMapCellRolled(px, py) : null;
        const mapCell = rolled?.mapCell || (entry && entry.page === "adventure" ? getSharedMapCell(px, py) : null);
        socket.send(
          JSON.stringify({
            type: "welcome",
            userId,
            label,
            players: nearby,
            sameMap,
            mapCell,
            ...getWorldShardInfo()
          })
        );
        return;
      }

      if (!authedUser) return;

      if (msg.type === "chat") {
        const entry = byUserId.get(authedUser.id);
        if (!entry) return;
        const channel =
          msg.channel === "world" || msg.channel === "private" ? msg.channel : "local";
        deliverChatMessage(entry, {
          channel,
          text: msg.text,
          targetName: msg.targetName
        });
        return;
      }

      if (msg.type === "map_cell_roll") {
        const entry = byUserId.get(authedUser.id);
        if (!entry || entry.page !== "adventure") return;
        const x = typeof msg.x === "number" ? Math.floor(msg.x) : entry.x;
        const y = typeof msg.y === "number" ? Math.floor(msg.y) : entry.y;
        if (Math.floor(entry.x) !== x || Math.floor(entry.y) !== y) return;
        const si = typeof msg.slotIndex === "number" ? Math.floor(msg.slotIndex) : 0;
        const rolled = ensureSharedMapCellSlotRolled(x, y, si);
        if (rolled?.mapCell) {
          socket.send(JSON.stringify({ type: "map_cell", mapCell: rolled.mapCell }));
          if (rolled.changed) broadcastMapCellToTile(x, y, rolled.mapCell);
        }
        return;
      }

      if (msg.type === "map_cell_sync") {
        const entry = byUserId.get(authedUser.id);
        if (!entry) return;
        const x = typeof msg.x === "number" ? Math.floor(msg.x) : entry.x;
        const y = typeof msg.y === "number" ? Math.floor(msg.y) : entry.y;
        const rolled = ensureSharedMapCellRolled(x, y);
        const mapCell = rolled?.mapCell || getSharedMapCell(x, y);
        if (mapCell) {
          socket.send(JSON.stringify({ type: "map_cell", mapCell }));
          if (rolled?.changed) broadcastMapCellToTile(x, y, mapCell);
        }
        return;
      }

      if (msg.type === "party_invite") {
        const targetUserId = Number(msg.targetUserId);
        const targetName = typeof msg.targetName === "string" ? msg.targetName : "";
        const result =
          Number.isFinite(targetUserId) && targetUserId > 0
            ? sendPartyInviteToUser(authedUser.id, targetUserId, targetName)
            : sendPartyInvite(authedUser.id, targetName);
        socket.send(JSON.stringify({ type: "party_result", ...result }));
        return;
      }

      if (msg.type === "party_accept") {
        const result = acceptPartyInvite(authedUser.id);
        socket.send(JSON.stringify({ type: "party_result", ...result }));
        return;
      }

      if (msg.type === "party_decline") {
        declinePartyInvite(authedUser.id);
        return;
      }

      if (msg.type === "craft_invite") {
        const result = sendCraftInvite(authedUser.id, {
          targetUserId: msg.targetUserId,
          requesterSlotIndex: msg.requesterSlotIndex,
          recipeId: msg.recipeId,
          quantity: msg.quantity,
          goldOffer: msg.goldOffer
        });
        socket.send(JSON.stringify({ type: "craft_result", ...result }));
        return;
      }

      if (msg.type === "craft_accept") {
        const result = acceptCraftInvite(authedUser.id, {
          crafterTarget: msg.crafterTarget,
          companionSlotIndex: msg.companionSlotIndex
        });
        socket.send(JSON.stringify({ type: "craft_result", ...result }));
        return;
      }

      if (msg.type === "craft_decline") {
        declineCraftInvite(authedUser.id);
        return;
      }

      if (msg.type === "party_fight_started") {
        // Fight invites are sent from POST /api/combat/start (includes sessionId).
        // Ignore legacy client messages without a session id to avoid parallel fights.
        if (typeof msg.sessionId === "string" && msg.sessionId.trim()) {
          notifyPartyFightStarted(authedUser.id, {
            sessionId: msg.sessionId.trim(),
            region: msg.region,
            mob: msg.mob,
            worldMapContext: msg.worldMapContext,
            prepEndsAt: msg.prepEndsAt
          });
        }
        return;
      }

      if (msg.type === "update" || msg.type === "presence") {
        updatePresence(authedUser.id, {
          slotIndex: msg.slotIndex,
          x: msg.x,
          y: msg.y,
          name: msg.name,
          page: msg.page,
          dungeonId: msg.dungeonId,
          dungeonRoomIndex: msg.dungeonRoomIndex
        });
        scheduleBroadcastPresence();
        return;
      }

      if (msg.type === "ping") {
        socket.send(JSON.stringify({ type: "pong", t: Date.now() }));
      }
    });

    socket.on("close", () => {
      clearTimeout(authTimer);
      if (authedUser) {
        detachSocket(socket);
        scheduleBroadcastPresence();
      }
    });

    socket.on("error", () => {
      clearTimeout(authTimer);
      detachSocket(socket);
    });
  });

  return wss;
}

export { WS_PATH };
