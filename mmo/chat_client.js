/**
 * Online chat (Local / World / Private) over the presence WebSocket.
 */
(function (root) {
  const MAX_LOG_LINES = 200;
  const TABS = ["local", "world", "private"];

  /** @type {"local"|"world"|"private"} */
  let activeTab = "local";
  /** @type {Array<object>} */
  let history = [];
  let myUserId = null;

  function isOnline() {
    return !!(root.GameStorage?.isOnlineMode?.() && root.GameStorage.getAuthToken?.());
  }

  function getInputs() {
    return Array.from(root.document.querySelectorAll(".bottom-chat-input, .fight-chat-input"));
  }

  function getLogs() {
    return Array.from(root.document.querySelectorAll("#bottomChatLog, #fightChatLog"));
  }

  function setInputEnabled(on) {
    const ph =
      activeTab === "world"
        ? "World message… (/w text)"
        : activeTab === "private"
          ? "Private… (/p Name message)"
          : "Local message… (same map tile)";
    for (const el of getInputs()) {
      el.disabled = !on;
      el.placeholder = on ? ph : "Sign in to chat";
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function channelLabel(ch) {
    if (ch === "world") return "World";
    if (ch === "private") return "Private";
    return "Local";
  }

  function formatLine(entry) {
    if (entry.system) {
      return `<p class="chat-line chat-line--system">${escapeHtml(entry.text || "")}</p>`;
    }
    const ch = channelLabel(entry.channel);
    let who = escapeHtml(entry.from || "Unknown");
    if (entry.channel === "private") {
      if (entry.outgoing) {
        who = `You → ${escapeHtml(entry.to || "?")}`;
      } else if (entry.fromUserId !== myUserId) {
        who = `${who} → You`;
      }
    }
    const text = escapeHtml(entry.text || "");
    return `<p class="chat-line chat-line--${entry.channel}"><strong>[${ch}] ${who}:</strong> ${text}</p>`;
  }

  function visibleForTab(entry, tab) {
    if (entry.system) return true;
    if (tab === "local") return true;
    if (tab === "world") return entry.channel === "world" || entry.channel === "private";
    if (tab === "private") return entry.channel === "private";
    return entry.channel === tab;
  }

  function renderLog() {
    const lines = history.filter((e) => visibleForTab(e, activeTab)).slice(-MAX_LOG_LINES);
    const html = lines.map(formatLine).join("");
    for (const log of getLogs()) {
      log.innerHTML = html || `<p class="chat-line chat-line--system muted">No ${channelLabel(activeTab)} messages yet.</p>`;
      log.scrollTop = log.scrollHeight;
    }
  }

  function appendEntry(entry) {
    history.push(entry);
    if (history.length > MAX_LOG_LINES * 3) history = history.slice(-MAX_LOG_LINES * 2);
    renderLog();
  }

  function appendSystem(text) {
    appendEntry({ channel: "system", from: "System", text, t: Date.now(), system: true });
  }

  /**
   * @param {string} raw
   * @returns {{ channel: string, text: string, targetName?: string }}
   */
  function parseOutgoing(raw) {
    const trimmed = raw.trim();
    if (!trimmed) return { channel: activeTab, text: "" };

    if (/^\/w(?:\s+|$)/i.test(trimmed)) {
      const text = trimmed.replace(/^\/w\s*/i, "").trim();
      return { channel: "world", text };
    }
    if (/^\/p(?:\s+|$)/i.test(trimmed)) {
      const rest = trimmed.replace(/^\/p\s*/i, "").trim();
      const space = rest.indexOf(" ");
      if (space < 1) return { channel: "private", text: rest, targetName: "" };
      return {
        channel: "private",
        targetName: rest.slice(0, space).trim(),
        text: rest.slice(space + 1).trim()
      };
    }
    if (/^\/invite(?:\s+|$)/i.test(trimmed)) {
      const name = trimmed.replace(/^\/invite\s*/i, "").trim();
      return { channel: "system", text: "", inviteName: name };
    }
    return { channel: activeTab, text: trimmed };
  }

  function sendMessage(raw) {
    if (!isOnline()) return;
    const parsed = parseOutgoing(raw);
    if (parsed.inviteName) {
      if (root.MMOPresence?.sendPartyInvite) {
        root.MMOPresence.sendPartyInvite(parsed.inviteName);
        appendSystem(`Party invite sent to ${parsed.inviteName}.`);
      }
      return;
    }
    if (!parsed.text || !root.MMOPresence?.sendChat) return;
    root.MMOPresence.sendChat({
      channel: parsed.channel,
      text: parsed.text,
      targetName: parsed.targetName
    });
  }

  function startPrivateMessage(targetName) {
    setActiveTab("private");
    const name = String(targetName || "").trim();
    for (const input of getInputs()) {
      input.value = name ? `/p ${name} ` : "";
      input.focus();
    }
  }

  function onIncoming(msg) {
    if (!msg || msg.type !== "chat") return;
    const outgoing = myUserId != null && msg.fromUserId === myUserId;
    appendEntry({
      channel: msg.channel || "local",
      from: msg.from,
      fromUserId: msg.fromUserId,
      to: msg.to,
      toUserId: msg.toUserId,
      text: msg.text,
      t: msg.t,
      outgoing
    });
  }

  function onChatError(msg) {
    if (!msg || msg.type !== "chat_error") return;
    appendSystem(msg.message || "Could not send message.");
  }

  function setActiveTab(tab) {
    if (!TABS.includes(tab)) return;
    activeTab = tab;
    for (const btn of root.document.querySelectorAll("[data-chat-tab]")) {
      btn.classList.toggle("is-active", btn.getAttribute("data-chat-tab") === tab);
    }
    setInputEnabled(isOnline());
    renderLog();
  }

  function bindUi() {
    for (const btn of root.document.querySelectorAll("[data-chat-tab]")) {
      btn.addEventListener("click", () => {
        setActiveTab(btn.getAttribute("data-chat-tab") || "local");
      });
    }
    for (const input of getInputs()) {
      input.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" || e.shiftKey) return;
        e.preventDefault();
        const val = input.value;
        input.value = "";
        for (const other of getInputs()) {
          if (other !== input) other.value = "";
        }
        sendMessage(val);
      });
    }
  }

  function init() {
    bindUi();
    setInputEnabled(isOnline());
    renderLog();

    root.onChatMessage = onIncoming;
    root.onChatError = onChatError;
    root.onPresenceWelcome = (msg) => {
      if (msg && typeof msg.userId === "number") myUserId = msg.userId;
      refreshOnlineState();
    };
  }

  function clearHistory() {
    history = [];
    renderLog();
  }

  function refreshOnlineState() {
    setInputEnabled(isOnline());
  }

  root.MMOChat = {
    init,
    setActiveTab,
    clearHistory,
    appendSystem,
    renderLog,
    refreshOnlineState,
    startPrivateMessage
  };
})(typeof window !== "undefined" ? window : globalThis);
