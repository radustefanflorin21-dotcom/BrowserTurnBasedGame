/**
 * Online shared presence, chat, party, and map cell sync via /presence WebSocket.
 */
(function (root) {
  const PUBLISH_INTERVAL_MS = 1200;
  const RECONNECT_MS = 4000;

  let socket = null;
  let connected = false;
  let authed = false;
  let reconnectTimer = null;
  let publishTimer = null;
  let myUserId = null;
  let nearbyPlayers = [];
  let sameMapPlayers = [];
  /** @type {Map<string, object>} */
  const mapCellCache = new Map();
  /** @type {Map<string, Set<(cell: object) => void>>} */
  const mapCellWaiters = new Map();
  let stateProvider = null;
  let currentParty = null;
  let worldShardId = "default";
  let worldShardLabel = "Main World";
  /** @type {{ x: number, y: number }[]} */
  let pendingMapCellSyncs = [];

  function isOnlinePresence() {
    return !!(
      root.GameStorage &&
      root.GameStorage.isOnlineMode &&
      root.GameStorage.isOnlineMode() &&
      root.GameStorage.getAuthToken &&
      root.GameStorage.getAuthToken()
    );
  }

  function getWsUrl() {
    if (root.MMO_RUNTIME && root.MMO_RUNTIME.wsBaseUrl) return root.MMO_RUNTIME.wsBaseUrl;
    const base = root.GameStorage.getApiBaseUrl();
    if (base.startsWith("https://")) return base.replace(/^https:/, "wss:") + "/presence";
    return base.replace(/^http:/, "ws:") + "/presence";
  }

  function buildUpdatePayload() {
    if (typeof stateProvider === "function") {
      const st = stateProvider();
      if (st && typeof st === "object") {
        const payload = {
          type: "update",
          page: st.page || "menu",
          slotIndex: typeof st.slotIndex === "number" ? st.slotIndex : 0,
          name: typeof st.name === "string" ? st.name.slice(0, 32) : "",
          x: typeof st.x === "number" ? Math.floor(st.x) : 0,
          y: typeof st.y === "number" ? Math.floor(st.y) : 0
        };
        if (typeof st.dungeonId === "string" && st.dungeonId.trim()) {
          payload.dungeonId = st.dungeonId.trim();
          payload.dungeonRoomIndex =
            typeof st.dungeonRoomIndex === "number" ? Math.floor(st.dungeonRoomIndex) : 0;
        } else if (st.dungeonId === null) {
          payload.dungeonId = null;
          payload.dungeonRoomIndex = 0;
        }
        return payload;
      }
    }
    return { type: "update", page: "menu", slotIndex: 0, name: "", x: 0, y: 0 };
  }

  function mapCellSignature(mapCell) {
    if (!mapCell || !mapCell.key) return "";
    try {
      return JSON.stringify({
        key: mapCell.key,
        defeated: mapCell.defeated,
        mobPreviews: mapCell.mobPreviews
      });
    } catch {
      return String(mapCell.key);
    }
  }

  /** @returns {boolean} true if mob/defeat data changed (not a duplicate push) */
  function cacheMapCell(mapCell) {
    if (!mapCell || !mapCell.key) return false;
    const prev = mapCellCache.get(mapCell.key);
    const changed = !prev || mapCellSignature(prev) !== mapCellSignature(mapCell);
    mapCellCache.set(mapCell.key, mapCell);
    const waiters = mapCellWaiters.get(mapCell.key);
    if (waiters && waiters.size) {
      waiters.forEach((fn) => {
        try {
          fn(mapCell);
        } catch {
          /* ignore */
        }
      });
      mapCellWaiters.delete(mapCell.key);
    }
    return changed;
  }

  function waitForMapCell(key, timeoutMs) {
    const cached = mapCellCache.get(key);
    if (cached) return Promise.resolve(cached);
    const ms = typeof timeoutMs === "number" && timeoutMs > 0 ? timeoutMs : 3000;
    return new Promise((resolve) => {
      let settled = false;
      const finish = (cell) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        const set = mapCellWaiters.get(key);
        if (set) {
          set.delete(onCell);
          if (!set.size) mapCellWaiters.delete(key);
        }
        resolve(cell || null);
      };
      const onCell = (cell) => finish(cell);
      if (!mapCellWaiters.has(key)) mapCellWaiters.set(key, new Set());
      mapCellWaiters.get(key).add(onCell);
      const timer = setTimeout(() => finish(null), ms);
    });
  }

  function publishPresence() {
    if (!socket || socket.readyState !== WebSocket.OPEN || !authed) return;
    try {
      socket.send(JSON.stringify(buildUpdatePayload()));
    } catch {
      /* ignore */
    }
  }

  function publishMapCellRoll(x, y, slotIndex, preview) {
    if (!socket || socket.readyState !== WebSocket.OPEN || !authed) return;
    try {
      socket.send(
        JSON.stringify({
          type: "map_cell_roll",
          x: Math.floor(x),
          y: Math.floor(y),
          slotIndex: Math.floor(slotIndex),
          preview
        })
      );
    } catch {
      /* ignore */
    }
  }

  function flushPendingMapCellSyncs() {
    if (!pendingMapCellSyncs.length) return;
    const pending = pendingMapCellSyncs.slice();
    pendingMapCellSyncs = [];
    const seen = new Set();
    pending.forEach(({ x, y }) => {
      const key = `${x},${y}`;
      if (seen.has(key)) return;
      seen.add(key);
      requestMapCellSync(x, y, true);
    });
  }

  function requestMapCellSync(x, y, skipQueue) {
    const fx = Math.floor(x);
    const fy = Math.floor(y);
    if (!socket || socket.readyState !== WebSocket.OPEN || !authed) {
      if (!skipQueue) {
        const key = `${fx},${fy}`;
        if (!pendingMapCellSyncs.some((p) => `${p.x},${p.y}` === key)) {
          pendingMapCellSyncs.push({ x: fx, y: fy });
        }
      }
      return;
    }
    try {
      socket.send(JSON.stringify({ type: "map_cell_sync", x: fx, y: fy }));
    } catch {
      /* ignore */
    }
  }

  function sendChat({ channel, text, targetName }) {
    if (!socket || socket.readyState !== WebSocket.OPEN || !authed) return;
    try {
      socket.send(
        JSON.stringify({
          type: "chat",
          channel: channel || "local",
          text: typeof text === "string" ? text : "",
          targetName: typeof targetName === "string" ? targetName : undefined
        })
      );
    } catch {
      /* ignore */
    }
  }

  function sendPartyInvite(targetNameOrOpts, targetUserId) {
    if (!socket || socket.readyState !== WebSocket.OPEN || !authed) return;
    let targetName = "";
    let uid = targetUserId;
    if (targetNameOrOpts && typeof targetNameOrOpts === "object") {
      targetName = String(targetNameOrOpts.targetName || targetNameOrOpts.name || "").trim();
      uid = targetNameOrOpts.targetUserId ?? targetNameOrOpts.userId;
    } else {
      targetName = String(targetNameOrOpts || "").trim();
    }
    try {
      const payload = { type: "party_invite", targetName };
      if (typeof uid === "number" && Number.isFinite(uid)) payload.targetUserId = uid;
      socket.send(JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }

  function acceptPartyInvite() {
    if (!socket || socket.readyState !== WebSocket.OPEN || !authed) return;
    try {
      socket.send(JSON.stringify({ type: "party_accept" }));
    } catch {
      /* ignore */
    }
  }

  function declinePartyInvite() {
    if (!socket || socket.readyState !== WebSocket.OPEN || !authed) return;
    try {
      socket.send(JSON.stringify({ type: "party_decline" }));
    } catch {
      /* ignore */
    }
  }

  function publishPartyFightStarted(payload) {
    if (!socket || socket.readyState !== WebSocket.OPEN || !authed) return;
    try {
      socket.send(JSON.stringify({ type: "party_fight_started", ...payload }));
    } catch {
      /* ignore */
    }
  }

  function sendCraftInvite(payload) {
    if (!socket || socket.readyState !== WebSocket.OPEN || !authed) return;
    if (!payload || typeof payload !== "object") return;
    try {
      socket.send(
        JSON.stringify({
          type: "craft_invite",
          targetUserId: payload.targetUserId,
          requesterSlotIndex: payload.requesterSlotIndex,
          recipeId: payload.recipeId,
          quantity: payload.quantity,
          goldOffer: payload.goldOffer
        })
      );
    } catch {
      /* ignore */
    }
  }

  function acceptCraftInvite(payload) {
    if (!socket || socket.readyState !== WebSocket.OPEN || !authed) return;
    try {
      socket.send(
        JSON.stringify({
          type: "craft_accept",
          crafterTarget: payload?.crafterTarget,
          companionSlotIndex: payload?.companionSlotIndex
        })
      );
    } catch {
      /* ignore */
    }
  }

  function declineCraftInvite() {
    if (!socket || socket.readyState !== WebSocket.OPEN || !authed) return;
    try {
      socket.send(JSON.stringify({ type: "craft_decline" }));
    } catch {
      /* ignore */
    }
  }

  function schedulePublishLoop() {
    if (publishTimer) return;
    publishTimer = setInterval(() => publishPresence(), PUBLISH_INTERVAL_MS);
  }

  function clearPublishLoop() {
    if (publishTimer) {
      clearInterval(publishTimer);
      publishTimer = null;
    }
  }

  function onPresenceMessage(msg) {
    if (!msg || typeof msg !== "object") return;
    if (msg.type === "party_invite" && typeof root.onPartyInvite === "function") {
      root.onPartyInvite(msg);
      return;
    }
    if (msg.type === "craft_invite" && typeof root.onCraftInvite === "function") {
      root.onCraftInvite(msg);
      return;
    }
    if (msg.type === "craft_commission_complete" && typeof root.onCraftCommissionComplete === "function") {
      root.onCraftCommissionComplete(msg);
      return;
    }
    if (msg.type === "fight_invite" && typeof root.onFightInvite === "function") {
      root.onFightInvite(msg);
      return;
    }
    if (msg.type === "dungeon_enter_invite" && typeof root.onDungeonEnterInvite === "function") {
      root.onDungeonEnterInvite(msg);
      return;
    }
    if (msg.type === "combat_state" && typeof root.onCombatState === "function") {
      root.onCombatState(msg);
      return;
    }
    if (msg.type === "presence") {
      if (Array.isArray(msg.players)) nearbyPlayers = msg.players;
      if (Array.isArray(msg.sameMap)) sameMapPlayers = msg.sameMap;
      if (msg.mapCell && cacheMapCell(msg.mapCell)) {
        if (typeof root.onMapCellUpdated === "function") root.onMapCellUpdated(msg.mapCell);
      }
      if (typeof root.onPresenceUpdated === "function") root.onPresenceUpdated(nearbyPlayers);
      return;
    }
    if (msg.type === "welcome") {
      if (typeof msg.userId === "number") myUserId = msg.userId;
      if (Array.isArray(msg.players)) nearbyPlayers = msg.players;
      if (Array.isArray(msg.sameMap)) sameMapPlayers = msg.sameMap;
      if (msg.mapCell && cacheMapCell(msg.mapCell)) {
        if (typeof root.onMapCellUpdated === "function") root.onMapCellUpdated(msg.mapCell);
      }
      if (typeof root.onPresenceWelcome === "function") root.onPresenceWelcome(msg);
      if (typeof root.onPresenceUpdated === "function") root.onPresenceUpdated(nearbyPlayers);
    }
    if (msg.type === "map_cell" && msg.mapCell && cacheMapCell(msg.mapCell)) {
      if (typeof root.onMapCellUpdated === "function") root.onMapCellUpdated(msg.mapCell);
    }
    if (msg.type === "chat" && typeof root.onChatMessage === "function") root.onChatMessage(msg);
    if (msg.type === "chat_error" && typeof root.onChatError === "function") root.onChatError(msg);
    if (msg.type === "party_state") {
      currentParty = msg.party || null;
      if (typeof root.onPartyState === "function") root.onPartyState(currentParty);
    }
    if (msg.type === "party_result" && typeof root.onPartyResult === "function") root.onPartyResult(msg);
    if (msg.type === "craft_result" && typeof root.onCraftResult === "function") root.onCraftResult(msg);
  }

  function connect() {
    if (!isOnlinePresence()) return;
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;
    const token = root.GameStorage.getAuthToken();
    if (!token) return;
    try {
      socket = new WebSocket(getWsUrl());
    } catch {
      scheduleReconnect();
      return;
    }
    socket.addEventListener("open", () => {
      connected = true;
      authed = false;
      try {
        socket.send(JSON.stringify({ type: "auth", token }));
      } catch {
        /* ignore */
      }
    });
    socket.addEventListener("message", (ev) => {
      let msg;
      try {
        msg = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      if (msg.type === "welcome") {
        authed = true;
        if (typeof msg.userId === "number") myUserId = msg.userId;
        if (typeof msg.worldId === "string" && msg.worldId.trim()) worldShardId = msg.worldId.trim();
        if (typeof msg.worldLabel === "string" && msg.worldLabel.trim()) worldShardLabel = msg.worldLabel.trim();
        if (root.ServerCombat && typeof root.ServerCombat.setMyUserId === "function") {
          root.ServerCombat.setMyUserId(myUserId);
        }
        schedulePublishLoop();
        publishPresence();
        flushPendingMapCellSyncs();
        if (typeof root.onPresenceWelcome === "function") root.onPresenceWelcome(msg);
      }
      onPresenceMessage(msg);
    });
    socket.addEventListener("close", () => {
      connected = false;
      authed = false;
      clearPublishLoop();
      scheduleReconnect();
    });
    socket.addEventListener("error", () => {
      connected = false;
      authed = false;
    });
  }

  function scheduleReconnect() {
    if (!isOnlinePresence()) return;
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, RECONNECT_MS);
  }

  function disconnect() {
    clearPublishLoop();
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    nearbyPlayers = [];
    sameMapPlayers = [];
    mapCellCache.clear();
    pendingMapCellSyncs = [];
    myUserId = null;
    currentParty = null;
    connected = false;
    authed = false;
    if (socket) {
      try {
        socket.close();
      } catch {
        /* ignore */
      }
      socket = null;
    }
    if (typeof root.onPresenceUpdated === "function") root.onPresenceUpdated([]);
    if (root.MMOChat && typeof root.MMOChat.refreshOnlineState === "function") root.MMOChat.refreshOnlineState();
  }

  function getNearby() {
    return nearbyPlayers.slice();
  }

  function getSameMap() {
    return sameMapPlayers.slice();
  }

  function getOnSameTile() {
    return sameMapPlayers.slice();
  }

  function getMapCellCache(key) {
    return mapCellCache.get(key) || null;
  }

  function getParty() {
    return currentParty;
  }

  function getMyUserId() {
    return myUserId;
  }

  function isConnected() {
    return connected && authed;
  }

  function getWorldShard() {
    return { worldId: worldShardId, worldLabel: worldShardLabel };
  }

  function setStateProvider(fn) {
    stateProvider = typeof fn === "function" ? fn : null;
  }

  root.MMOPresence = {
    connect,
    disconnect,
    publishPresence,
    publishMapCellRoll,
    requestMapCellSync,
    sendChat,
    sendPartyInvite,
    acceptPartyInvite,
    declinePartyInvite,
    sendCraftInvite,
    acceptCraftInvite,
    declineCraftInvite,
    publishPartyFightStarted,
    getNearby,
    getSameMap,
    getOnSameTile,
    getMapCellCache,
    waitForMapCell,
    getParty,
    getMyUserId,
    getWorldShard,
    isConnected,
    setStateProvider
  };
})(typeof window !== "undefined" ? window : globalThis);
