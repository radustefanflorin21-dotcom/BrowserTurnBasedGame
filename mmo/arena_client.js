/**
 * Arena PvP hub, queue HUD, and match accept flow.
 */
(function (root) {
  let hubData = null;
  let selectedModeId = "ranked_1v1";
  let pendingMatch = null;
  let acceptTimer = null;

  const ARENA_HUB_BANNER = "Assets/Biomes/Aftermath of War/The Rustfallen Bastion/6_2.png";
  const ARENA_MODE_ART = {
    ranked_1v1: "Assets/Biomes/Paradise North/Stormbreak Hollow/2.png",
    ranked_4v4: "Assets/Biomes/Hatred of the World/The Infernal Riftforge/3.png",
    war_arena_8v8: "Assets/Biomes/Aftermath of War/The Rustfallen Bastion/1.png",
    friendly_duel: "Assets/Biomes/Paradise North/4.png",
    custom_match: "Assets/Biomes/The held breath/The Stonevein Sanctum/3.png",
    practice_ai: "Assets/Biomes/Innocence of North/The Frostroot Nursery/4.png"
  };

  const RANK_EMBLEM_CLASS = {
    bronze: "arena-rank-emblem--bronze",
    silver: "arena-rank-emblem--silver",
    gold: "arena-rank-emblem--gold",
    platinum: "arena-rank-emblem--platinum",
    diamond: "arena-rank-emblem--diamond",
    champion: "arena-rank-emblem--champion"
  };

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function slotIndex() {
    return typeof activeCharacterSlotIndex !== "undefined" ? activeCharacterSlotIndex : 0;
  }

  function queueHudEl() {
    return document.getElementById("arenaQueueHud");
  }

  function queueHudTextEl() {
    return document.getElementById("arenaQueueHudText");
  }

  function updateQueueHud(status) {
    const bar = queueHudEl();
    const text = queueHudTextEl();
    if (!bar || !text) return;
    if (!status?.inQueue) {
      bar.classList.add("hidden");
      return;
    }
    bar.classList.remove("hidden");
    const label = status.modeLabel || "Arena";
    const found = status.playersFound ?? 0;
    const needed = status.playersNeeded ?? 2;
    text.textContent = `Searching ${label}… (${found}/${needed})`;
  }

  function clearAcceptTimer() {
    if (acceptTimer) {
      clearInterval(acceptTimer);
      acceptTimer = null;
    }
  }

  function closeMatchModal() {
    clearAcceptTimer();
    pendingMatch = null;
    const modal = document.getElementById("arenaMatchModal");
    if (modal) modal.classList.add("hidden");
  }

  function renderMatchModal(msg) {
    const modal = document.getElementById("arenaMatchModal");
    const body = document.getElementById("arenaMatchModalBody");
    const timerEl = document.getElementById("arenaMatchTimer");
    if (!modal || !body) return;
    pendingMatch = msg;
    modal.classList.remove("hidden");
    const allies = (msg.allies || []).map((a) => escapeHtml(a.name)).join(", ");
    const opponents = (msg.opponents || []).map((o) => escapeHtml(o.name)).join(", ");
    body.innerHTML = `
      <div class="arena-match-art" style="background-image:url('${escapeHtml(modeArt(msg.modeId || "ranked_1v1"))}')"></div>
      <p class="arena-match-lead"><strong>${escapeHtml(msg.modeLabel || "Arena")}</strong> match found.</p>
      <p class="arena-match-teams muted">Allies: ${allies || "—"}<br>Opponents: ${opponents || "—"}</p>
      <p class="arena-match-timer" id="arenaMatchTimer">Accept within ${Math.ceil((msg.acceptEndsAt - Date.now()) / 1000)}s</p>
    `;
    clearAcceptTimer();
    acceptTimer = setInterval(() => {
      const left = Math.max(0, Math.ceil((msg.acceptEndsAt - Date.now()) / 1000));
      if (timerEl) timerEl.textContent = left > 0 ? `Accept within ${left}s` : "Expiring…";
      if (left <= 0) clearAcceptTimer();
    }, 500);
  }

  async function refreshHub() {
    if (!root.GameStorage?.fetchArenaHub) return null;
    try {
      hubData = await root.GameStorage.fetchArenaHub(slotIndex());
      if (hubData?.inQueue && typeof hubData.queue === "object") {
        updateQueueHud({ inQueue: true, ...hubData.queue });
      } else if (hubData?.inQueue) {
        updateQueueHud({ inQueue: true, modeLabel: "Arena", playersFound: 1, playersNeeded: 2 });
      } else {
        updateQueueHud({ inQueue: false });
      }
      return hubData;
    } catch (err) {
      console.warn("Arena hub load failed:", err);
      return null;
    }
  }

  function rankEmblemClass(rating) {
    const tier = root.ArenaConfig?.getRankTier?.(rating);
    return RANK_EMBLEM_CLASS[tier?.id] || RANK_EMBLEM_CLASS.bronze;
  }

  function ratingProgressPct(rating) {
    const tier = root.ArenaConfig?.getRankTier?.(rating);
    if (!tier) return 0;
    const span = tier.maxRating - tier.minRating + 1;
    const offset = Math.max(0, Math.min(span - 1, Math.floor(Number(rating) || 0) - tier.minRating));
    return Math.round((offset / span) * 100);
  }

  function modeArt(modeId) {
    return ARENA_MODE_ART[modeId] || ARENA_HUB_BANNER;
  }

  function selectedMode() {
    const modes = Array.isArray(hubData?.modes) ? hubData.modes : [];
    return modes.find((m) => m.id === selectedModeId) || modes.find((m) => m.enabled) || null;
  }

  function buildModeDetailHtml(mode) {
    if (!mode) {
      return `<div class="arena-detail-panel arena-detail-panel--empty muted">Select a mode to view rules and rewards.</div>`;
    }
    const rules = [
      ["Team size", mode.teamSize ? `${mode.teamSize} vs ${mode.teamSize}` : "—"],
      ["Board", mode.boardSize ? `${mode.boardSize}×${mode.boardSize}` : "8×8"],
      ["Turn timer", mode.turnTimerSec ? `${mode.turnTimerSec}s` : "45s"],
      ["Placement", mode.placementPhase ? "Yes" : "No"],
      ["Gear", mode.gear ? "Enabled" : "Normalized"],
      ["Pets", mode.pets ? "Passive bonuses" : "Disabled"],
      ["Consumables", mode.consumables ? "Allowed" : "Disabled"],
      ["Rating", mode.rating ? "Ranked" : "Unrated"]
    ];
    const ruleRows = rules
      .map(
        ([label, value]) =>
          `<div class="arena-detail-rule"><span class="arena-detail-rule-label">${escapeHtml(label)}</span><span class="arena-detail-rule-value">${escapeHtml(value)}</span></div>`
      )
      .join("");
    const rewardLine = mode.enabled
      ? `Win <strong>+${mode.honorWin || 0} Honor</strong> · Loss <strong>+${mode.honorLoss || 0} Honor</strong>`
      : "Rewards unlock when this mode goes live.";
    const queueDisabled = !mode.enabled || !!hubData?.inQueue;
    const queueLabel = hubData?.inQueue ? "In queue…" : mode.enabled ? "Enter queue" : "Coming soon";
    return `<div class="arena-detail-panel">
      <div class="arena-detail-art" style="background-image:url('${escapeHtml(modeArt(mode.id))}')"></div>
      <div class="arena-detail-body">
        <h2 class="arena-detail-title">${escapeHtml(mode.label)}</h2>
        <p class="arena-detail-desc muted">${escapeHtml(mode.description || "")}</p>
        <div class="arena-detail-rules">${ruleRows}</div>
        <p class="arena-detail-rewards">${rewardLine}</p>
        <button type="button" class="btn arena-detail-queue-btn" id="arenaDetailQueueBtn" ${queueDisabled ? "disabled" : ""}>${escapeHtml(queueLabel)}</button>
      </div>
    </div>`;
  }

  function buildArenaPanelHtml() {
    const profile = hubData?.profile || {};
    const modes = Array.isArray(hubData?.modes) ? hubData.modes : [];
    const season = hubData?.seasonLabel || (root.ArenaConfig && root.ArenaConfig.ARENA_SEASON_LABEL) || "Season 1";
    const rating = profile.rating ?? 1000;
    const emblemClass = rankEmblemClass(rating);
    const progressPct = ratingProgressPct(rating);
    const mode = selectedMode();
    const modeCards = modes
      .map((m) => {
        const active = selectedModeId === m.id ? " is-active" : "";
        const disabled = !m.enabled ? " is-disabled" : "";
        const badge = m.comingSoon ? '<span class="arena-mode-badge">Soon</span>' : "";
        const art = modeArt(m.id);
        return `<button type="button" class="arena-mode-card${active}${disabled}" data-arena-mode="${escapeHtml(m.id)}" ${m.enabled ? "" : "disabled"}>
          <span class="arena-mode-card-art" style="background-image:url('${escapeHtml(art)}')"></span>
          <span class="arena-mode-card-body">
            <span class="arena-mode-title">${escapeHtml(m.label)}${badge}</span>
            <span class="arena-mode-desc muted">${escapeHtml(m.description || "")}</span>
            ${m.enabled ? `<span class="arena-mode-rewards">+${m.honorWin || 0} / +${m.honorLoss || 0} Honor</span>` : ""}
          </span>
        </button>`;
      })
      .join("");
    const inQueue = !!hubData?.inQueue;
    const queueBtn = inQueue
      ? `<button type="button" class="btn arena-queue-btn arena-queue-btn--cancel" id="arenaLeaveQueueBtn">Leave queue</button>`
      : `<button type="button" class="btn arena-queue-btn" id="arenaJoinQueueBtn">Find match</button>`;
    const objectives = (profile.dailyObjectives || [])
      .map((o) => {
        const pct = o.target ? Math.min(100, Math.round(((o.progress || 0) / o.target) * 100)) : 0;
        return `<li class="arena-objective${o.complete ? " is-complete" : ""}">
          <div class="arena-objective-head">
            <span>${escapeHtml(o.label)}</span>
            <span class="muted">${o.progress || 0}/${o.target}</span>
          </div>
          <div class="arena-objective-bar" aria-hidden="true"><span class="arena-objective-bar-fill" style="width:${pct}%"></span></div>
        </li>`;
      })
      .join("");
    return `<div class="game-page arena-panel arena-panel--hub">
      <div class="arena-hero-banner" style="background-image:url('${escapeHtml(ARENA_HUB_BANNER)}')">
        <div class="arena-hero-banner__veil"></div>
        <div class="arena-hero-banner__content">
          <div class="arena-hero-kicker">War Banner Arena</div>
          <h1 class="arena-hero-title">Arena</h1>
          <p class="arena-hero-season">${escapeHtml(season)}</p>
        </div>
        <img class="arena-hero-emblem-mark" src="Assets/UI/buttons/arena.png" alt="" aria-hidden="true" onerror="this.style.display='none'">
      </div>
      <div class="arena-hub-grid">
        <aside class="arena-sidebar" aria-label="Arena profile">
          <div class="arena-rank-emblem ${emblemClass}">
            <span class="arena-rank-emblem-tier">${escapeHtml(profile.rankLabel || "Bronze I")}</span>
            <span class="arena-rank-emblem-rating">${rating} RP</span>
          </div>
          <div class="arena-rank-progress" aria-label="Progress within rank">
            <div class="arena-rank-progress-fill" style="width:${progressPct}%"></div>
          </div>
          <div class="arena-stat-grid">
            <div class="arena-stat-chip"><span class="arena-stat-label">Honor</span><strong>${profile.honor ?? 0}</strong></div>
            <div class="arena-stat-chip"><span class="arena-stat-label">Medals</span><strong>${profile.warMedals ?? 0}</strong></div>
            <div class="arena-stat-chip"><span class="arena-stat-label">Wins</span><strong>${profile.wins ?? 0}</strong></div>
            <div class="arena-stat-chip"><span class="arena-stat-label">Losses</span><strong>${profile.losses ?? 0}</strong></div>
          </div>
          ${profile.winStreak > 0 ? `<p class="arena-streak">Win streak: <strong>${profile.winStreak}</strong></p>` : ""}
          <nav class="arena-hub-nav" aria-label="Arena services">
            <button type="button" class="arena-hub-nav-btn" disabled title="Coming soon">Honor Shop</button>
            <button type="button" class="arena-hub-nav-btn" disabled title="Coming soon">Leaderboard</button>
            <button type="button" class="arena-hub-nav-btn" disabled title="Coming soon">Season rewards</button>
          </nav>
        </aside>
        <main class="arena-main">
          <section class="arena-modes-section">
            <div class="arena-section-head">
              <h2 class="arena-section-title">Battle modes</h2>
              <div class="arena-actions">${queueBtn}</div>
            </div>
            <div class="arena-modes" role="list">${modeCards}</div>
          </section>
          ${buildModeDetailHtml(mode)}
          <section class="arena-daily">
            <h2 class="arena-section-title">Daily objectives</h2>
            <ul class="arena-objectives">${objectives || "<li class='muted'>No objectives loaded.</li>"}</ul>
          </section>
        </main>
      </div>
    </div>`;
  }

  function wireArenaPanelEvents() {
    document.querySelectorAll("[data-arena-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        selectedModeId = btn.getAttribute("data-arena-mode") || "ranked_1v1";
        if (typeof renderMenuPanelContent === "function") renderMenuPanelContent();
      });
    });
    const joinBtn = document.getElementById("arenaJoinQueueBtn");
    if (joinBtn) {
      joinBtn.addEventListener("click", () => {
        void joinQueue(selectedModeId);
      });
    }
    const detailQueueBtn = document.getElementById("arenaDetailQueueBtn");
    if (detailQueueBtn) {
      detailQueueBtn.addEventListener("click", () => {
        void joinQueue(selectedModeId);
      });
    }
    const leaveBtn = document.getElementById("arenaLeaveQueueBtn");
    if (leaveBtn) {
      leaveBtn.addEventListener("click", () => {
        void leaveQueue();
      });
    }
    const acceptBtn = document.getElementById("arenaMatchAcceptBtn");
    if (acceptBtn) {
      acceptBtn.onclick = () => void respondMatch(true);
    }
    const declineBtn = document.getElementById("arenaMatchDeclineBtn");
    if (declineBtn) {
      declineBtn.onclick = () => void respondMatch(false);
    }
    const cancelBtn = document.getElementById("arenaQueueCancelBtn");
    if (cancelBtn) {
      cancelBtn.onclick = () => void leaveQueue();
    }
  }

  async function joinQueue(modeId) {
    if (!root.GameStorage?.arenaJoinQueue) return;
    if (root.ServerCombat?.hasSession?.()) {
      if (typeof showCombatError === "function") {
        showCombatError("Finish or leave your current fight before queuing.");
      }
      return;
    }
    try {
      await root.GameStorage.arenaJoinQueue({ modeId: modeId || selectedModeId, slotIndex: slotIndex() });
      await refreshHub();
      if (typeof renderMenuPanelContent === "function") renderMenuPanelContent();
    } catch (err) {
      if (typeof showCombatError === "function") showCombatError(err.message || "Could not join queue.");
    }
  }

  async function leaveQueue() {
    if (!root.GameStorage?.arenaLeaveQueue) return;
    try {
      await root.GameStorage.arenaLeaveQueue({ slotIndex: slotIndex() });
      updateQueueHud({ inQueue: false });
      await refreshHub();
      if (typeof renderMenuPanelContent === "function") renderMenuPanelContent();
    } catch (err) {
      console.warn("Leave queue failed:", err);
    }
  }

  async function respondMatch(accept) {
    if (!pendingMatch?.matchId || !root.GameStorage?.arenaRespondMatch) return;
    try {
      await root.GameStorage.arenaRespondMatch({
        matchId: pendingMatch.matchId,
        accept
      });
      if (!accept) closeMatchModal();
    } catch (err) {
      if (typeof showCombatError === "function") showCombatError(err.message || "Match response failed.");
    }
  }

  function onQueueStatus(msg) {
    updateQueueHud(msg);
    if (hubData) hubData.inQueue = !!msg.inQueue;
  }

  function onMatchFound(msg) {
    renderMatchModal(msg);
    updateQueueHud({ inQueue: false });
    if (hubData) hubData.inQueue = false;
  }

  function onMatchCanceled(msg) {
    closeMatchModal();
    if (typeof showCombatError === "function" && msg?.reason) {
      const label =
        msg.reason === "declined"
          ? "Match declined."
          : msg.reason === "timeout"
            ? "Match accept timed out."
            : "Match canceled.";
      showCombatError(label);
    }
    void refreshHub();
  }

  function onMatchStart(msg) {
    closeMatchModal();
    updateQueueHud({ inQueue: false });
    if (root.ServerCombat?.startArena) {
      root.ServerCombat.startArena(msg);
    }
    if (typeof closeMenuPanel === "function") closeMenuPanel();
  }

  function onMatchResult(msg) {
    if (typeof showArenaResultToast === "function") showArenaResultToast(msg);
  }

  function showArenaResultToast(msg) {
    const outcome = msg.arenaOutcome;
    if (!outcome) return;
    const line = msg.victory
      ? `Victory! +${outcome.honorEarned || 0} Honor · ${outcome.rankLabel || ""}`
      : `Defeat. +${outcome.honorEarned || 0} Honor`;
    if (root.MMOChat?.appendSystem) root.MMOChat.appendSystem(line);
  }

  root.MMOArena = {
    refreshHub,
    buildArenaPanelHtml,
    wireArenaPanelEvents,
    joinQueue,
    leaveQueue,
    respondMatch,
    onQueueStatus,
    onMatchFound,
    onMatchCanceled,
    onMatchReady: () => {},
    onMatchStart,
    onMatchResult,
    getHubData: () => hubData,
    getSelectedModeId: () => selectedModeId
  };
})(typeof window !== "undefined" ? window : globalThis);
