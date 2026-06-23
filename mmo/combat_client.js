/**
 * Online combat bridge: server-authoritative co-op fights when ?mmo=online.
 */
(function (root) {
  let sessionId = null;
  let pending = false;
  let myUserId = null;
  let hostUserId = null;
  let prepEndsAt = null;
  let combatLocked = false;

  function isOnlineCombat() {
    return !!(
      root.GameStorage &&
      root.GameStorage.isOnlineMode() &&
      typeof inGameSession !== "undefined" &&
      inGameSession &&
      activeCharacterSlotIndex != null
    );
  }

  function resolveMyUserId() {
    if (typeof myUserId === "number") return myUserId;
    if (root.MMOPresence && typeof root.MMOPresence.getMyUserId === "function") {
      myUserId = root.MMOPresence.getMyUserId();
    }
    return myUserId;
  }

  async function api(path, body, method) {
    const base = root.GameStorage.getApiBaseUrl();
    const token = root.GameStorage.getAuthToken();
    const res = await fetch(`${base}${path}`, {
      method: method || "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body != null ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    let data = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
    }
    if (!res.ok) {
      const err = new Error((data && data.error) || `Combat API error (${res.status})`);
      err.status = res.status;
      if (data && typeof data === "object") {
        if (data.sessionId) err.sessionId = data.sessionId;
        if (data.shouldJoin) err.shouldJoin = data.shouldJoin;
      }
      throw err;
    }
    return data;
  }

  async function fetchPartySession() {
    if (!isOnlineCombat()) return null;
    try {
      return await api("/api/combat/party-session", null, "GET");
    } catch {
      return null;
    }
  }

  function syncParticipantCountFromPayload(data) {
    if (!combatState || !data) return;
    if (typeof data.participantCount === "number") {
      combatState.participantCount = data.participantCount;
    } else if (Array.isArray(data.participants)) {
      combatState.participantCount = data.participants.length;
    }
  }

  function applyServerMeta(data) {
    if (typeof data.hostUserId === "number") hostUserId = data.hostUserId;
    if (typeof data.prepEndsAt === "number") prepEndsAt = data.prepEndsAt;
    if (typeof data.locked === "boolean") combatLocked = data.locked;
    if (data.state?.prepEndsAt) prepEndsAt = data.state.prepEndsAt;
    if (data.state?.hostUserId) hostUserId = data.state.hostUserId;
    if (data.began) combatLocked = true;
    syncParticipantCountFromPayload(data);
  }

  function resolveSelectedFoeUid(prevState, serverState, foes) {
    const alive = (foes || []).filter((f) => f && f.hp > 0);
    if (!alive.length) return null;
    const pick = (uid) => {
      const n = Number(uid);
      return Number.isFinite(n) && alive.some((f) => f.uid === n) ? n : null;
    };
    return pick(serverState?.selectedUid) ?? pick(prevState?.selectedUid) ?? alive[0].uid;
  }

  function applyServerStateToCombat(serverState, region, mob, worldMapContext, extra = {}) {
    const st = serverState;
    const prevParticipants = combatState?.participants;
    const prevSelectedUid = combatState?.selectedUid;
    combatState = {
      region: region || null,
      mob: mob || null,
      enemyNames: st.enemyNames || [],
      foes: st.foes || [],
      party: Array.isArray(st.party)
        ? st.party.map((m) => (m && typeof m === "object" ? { ...m } : m))
        : [],
      playerHp: st.playerHp,
      playerMax: st.playerMax,
      phase: st.phase === "prep" ? "prep" : st.phase || "player",
      endOutcome: typeof st.endOutcome === "string" ? st.endOutcome : null,
      prepEndsAt: st.prepEndsAt || prepEndsAt,
      hostUserId: st.hostUserId || hostUserId,
      participantCount: Array.isArray(st.participants)
        ? st.participants.length
        : typeof st.participantCount === "number"
          ? st.participantCount
          : typeof extra.participantCount === "number"
            ? extra.participantCount
            : prevParticipants?.length || 0,
      participants: Array.isArray(extra.participants)
        ? extra.participants.slice()
        : Array.isArray(st.participants)
          ? st.participants.slice()
          : Array.isArray(prevParticipants)
            ? prevParticipants.slice()
            : [],
      selectedUid: resolveSelectedFoeUid(
        prevSelectedUid != null ? { selectedUid: prevSelectedUid } : null,
        st,
        st.foes
      ),
      selectedAllyUid: st.selectedAllyUid,
      activePartyUid: st.activePartyUid,
      fightLog: Array.isArray(st.fightLog) ? st.fightLog.slice() : [],
      worldMapContext: worldMapContext || st.worldMapContext || null,
      stamina: typeof st.stamina === "number" ? st.stamina : undefined,
      maxStamina: typeof st.maxStamina === "number" ? st.maxStamina : undefined,
      skillCooldowns:
        st.skillCooldowns && typeof st.skillCooldowns === "object" ? { ...st.skillCooldowns } : {},
      status:
        st.status && typeof st.status === "object" ? JSON.parse(JSON.stringify(st.status)) : null,
      classState:
        st.classState && typeof st.classState === "object"
          ? JSON.parse(JSON.stringify(st.classState))
          : null,
      serverAuthoritative: true,
      coopSessionId: sessionId
    };
    ensureCombatStatus(combatState);
    if (typeof combatState.stamina !== "number") {
      initCombatStamina(combatState);
    } else if (typeof combatState.maxStamina !== "number") {
      combatState.maxStamina = combatState.stamina;
    }
    const cs = ensurePlayerClassCombatState(combatState);
    if (combatState.classState && typeof combatState.classState === "object") {
      const src = combatState.classState;
      Object.keys(src).forEach((k) => {
        if (src[k] != null) cs[k] = src[k];
      });
    }
    if (combatState.skillCooldowns && typeof combatState.skillCooldowns === "object") {
      cs.skillCooldowns = { ...combatState.skillCooldowns };
    }
    if (combatState.phase !== "prep") {
      ensureActivePartyUid(combatState);
      if (typeof syncCombatStaminaUiForServerState === "function") {
        syncCombatStaminaUiForServerState(combatState);
      } else {
        const active =
          typeof getCombatUiPartyMember === "function"
            ? getCombatUiPartyMember(combatState)
            : typeof getActivePartyMember === "function"
              ? getActivePartyMember(combatState)
              : null;
        if (active && active.kind === "hero") {
          if (typeof active.stamina === "number") combatState.stamina = active.stamina;
          if (typeof active.maxStamina === "number") combatState.maxStamina = active.maxStamina;
        }
      }
      clearCombatVisualTimer();
      ensureCombatTarget();
      ensureCombatAllyTarget(combatState);
    }
  }

  function mergeServerPlayer(serverPlayer, roster) {
    if (roster && Array.isArray(roster.slots)) {
      const slots = roster.slots.slice(0, CHARACTER_SLOT_COUNT);
      while (slots.length < CHARACTER_SLOT_COUNT) slots.push(null);
      characterRoster = {
        version: roster.version || 1,
        slots: slots.map((entry) =>
          typeof hydrateRosterSlot === "function" ? hydrateRosterSlot(entry) : entry
        )
      };
      if (activeCharacterSlotIndex != null && characterRoster.slots[activeCharacterSlotIndex]) {
        player = characterRoster.slots[activeCharacterSlotIndex];
        migratePlayer(player);
      }
    } else if (serverPlayer && typeof serverPlayer === "object") {
      player = serverPlayer;
      migratePlayer(player);
      if (activeCharacterSlotIndex != null && characterRoster && characterRoster.slots) {
        characterRoster.slots[activeCharacterSlotIndex] = player;
      }
    }
  }

  function openFightUi() {
    const overlay = document.getElementById("fightOverlay");
    const logEl = document.getElementById("fightLog");
    if (!overlay || !logEl) return;
    overlay.classList.remove("hidden");
    overlay.classList.add("fight-active");
    syncFightSceneBackdropFromAdventure();
    hideFightResults();
    logEl.innerHTML = "";
    renderTurnBattle();
  }

  function isPrepPhase() {
    return combatState && combatState.phase === "prep";
  }

  function isFightHost() {
    const uid = resolveMyUserId();
    const hid =
      typeof hostUserId === "number"
        ? hostUserId
        : typeof combatState?.hostUserId === "number"
          ? combatState.hostUserId
          : null;
    if (typeof uid === "number" && typeof hid === "number") return uid === hid;
    return false;
  }

  function coopHeroTurnsOnlyClient(st) {
    if (!st?.serverAuthoritative) return false;
    if (typeof st.participantCount === "number" && st.participantCount > 1) return true;
    const heroControllers = new Set();
    let heroCount = 0;
    (st.party || []).forEach((m) => {
      if (!m || m.kind !== "hero" || m.hp <= 0) return;
      heroCount += 1;
      if (typeof m.controllerUserId === "number") heroControllers.add(m.controllerUserId);
    });
    return heroControllers.size > 1 || heroCount > 1;
  }

  function canControlActiveMember() {
    if (!combatState || combatState.phase !== "player") return false;
    const uid = resolveMyUserId();
    if (typeof uid !== "number") return false;
    if (!combatState.serverAuthoritative) {
      const active =
        typeof getActivePartyMember === "function" ? getActivePartyMember(combatState) : null;
      return !!active;
    }
    const myUid = Number(uid);
    const active =
      typeof getActivePartyMember === "function" ? getActivePartyMember(combatState) : null;
    if (active && Number(active.controllerUserId) === myUid) return true;
    const heroesOnly = coopHeroTurnsOnlyClient(combatState);
    return (combatState.party || []).some(
      (m) =>
        m &&
        m.hp > 0 &&
        !m.acted &&
        (!heroesOnly || m.kind === "hero") &&
        Number(m.controllerUserId) === myUid
    );
  }

  async function start(region, mob, worldMapContext) {
    if (!isOnlineCombat()) return false;

    const maxFoes = typeof COMBAT_FOES_MAX !== "undefined" ? COMBAT_FOES_MAX : 6;
    const units = mob?.units
      ? mob.units.slice(0, maxFoes)
      : mob?.enemies
        ? mob.enemies.map((name) => ({ name }))
        : [];
    let data;
    try {
      data = await api("/api/combat/start", {
        slotIndex: activeCharacterSlotIndex,
        encounter: { units, worldMapContext: worldMapContext || null },
        region: region ? { name: region.name, enemyScale: region.enemyScale } : null,
        rngSeed: (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0
      });
    } catch (err) {
      if (err.shouldJoin && err.sessionId) {
        const joinErr = new Error(
          "Your party already has a fight preparing. Use the Join fight invite — do not start a new encounter."
        );
        joinErr.sessionId = err.sessionId;
        throw joinErr;
      }
      throw err;
    }
    sessionId = data.sessionId;
    applyServerMeta(data);
    if (typeof data.hostUserId === "number") hostUserId = data.hostUserId;
    applyServerStateToCombat(data.state, region, mob, worldMapContext, {
      participants: data.participants,
      participantCount: data.participantCount
    });
    openFightUi();
    return true;
  }

  async function resume(slotIndex) {
    if (!isOnlineCombat()) return false;
    const idx = Number(slotIndex);
    if (!Number.isFinite(idx)) return false;
    try {
      const data = await api("/api/combat/resume", { slotIndex: idx });
      if (!data?.sessionId || !data.state) return false;
      sessionId = data.sessionId;
      applyServerMeta(data);
      if (typeof data.hostUserId === "number") hostUserId = data.hostUserId;
      const wmc = data.state.worldMapContext || null;
      applyServerStateToCombat(data.state, null, null, wmc, {
        participants: data.participants,
        participantCount: data.participantCount
      });
      if (data.player && typeof mergeServerPlayer === "function") {
        mergeServerPlayer(data.player, null);
      }
      openFightUi();
      return true;
    } catch (err) {
      console.warn("Combat resume failed:", err);
      if (err && err.status === 400 && err.message && typeof showCombatError === "function") {
        showCombatError(err.message);
      }
      return false;
    }
  }

  async function join(existingSessionId, region, mob, worldMapContext) {
    if (!isOnlineCombat() || !existingSessionId) return false;
    const data = await api("/api/combat/join", {
      sessionId: existingSessionId,
      slotIndex: activeCharacterSlotIndex
    });
    sessionId = data.sessionId;
    applyServerMeta(data);
    applyServerStateToCombat(data.state, region, mob, worldMapContext, {
      participants: data.participants,
      participantCount: data.participantCount
    });
    openFightUi();
    return true;
  }

  function applyRemoteCombatState(msg) {
    if (!msg || !msg.state) return;
    if (sessionId && msg.sessionId && msg.sessionId !== sessionId) return;
    if (!sessionId && msg.sessionId) sessionId = msg.sessionId;
    applyServerMeta(msg);

    if (msg.finished && msg.result) {
      applyServerStateToCombat(
        msg.state,
        combatState?.region,
        combatState?.mob,
        combatState?.worldMapContext,
        { participants: msg.participants, participantCount: msg.participantCount }
      );
      if (typeof renderTurnBattle === "function") renderTurnBattle();
      playCombatHitsFromPayload(msg);
      clearServerSession();
      mergeServerPlayer(msg.player, msg.roster);
      if (typeof applyServerFightResult === "function") {
        applyServerFightResult(msg.result);
      }
      return;
    }

    applyServerStateToCombat(
      msg.state,
      combatState?.region,
      combatState?.mob,
      combatState?.worldMapContext,
      { participants: msg.participants, participantCount: msg.participantCount }
    );
    const logEl = document.getElementById("fightLog");
    if (logEl && combatState && Array.isArray(combatState.fightLog)) {
      logEl.innerHTML = "";
      combatState.fightLog.forEach((line) => {
        const row = document.createElement("div");
        row.className = "fight-log-line";
        if (typeof formatFightLogPlainTextToHtml === "function") {
          row.innerHTML = formatFightLogPlainTextToHtml(String(line || ""));
        } else {
          row.textContent = String(line || "");
        }
        logEl.appendChild(row);
      });
      logEl.scrollTop = logEl.scrollHeight;
    }
    renderTurnBattle();
    playCombatHitsFromPayload(msg);
  }

  function playServerEnemyHitEffects(hits) {
    if (!hits || !hits.length || typeof playCombatStrikeEffect !== "function") return;
    const st = combatState;
    if (!st) return;
    hits.forEach((hit) => {
      if (hit.targetPartyUid == null || hit.foeUid == null) return;
      playCombatStrikeEffect({
        attackerSide: "foe",
        attackerUid: hit.foeUid,
        targetSide: "ally",
        targetUid: hit.targetPartyUid,
        dmgKind: hit.dmgKind === "magic" ? "magic" : "physical",
        damage: hit.damage,
        crit: false,
        missed: !!hit.missed
      });
    });
  }

  function playCombatHitsFromPayload(payload, fallbackActor) {
    if (!payload) return;
    const st = combatState;
    if (!st) return;
    const allyHits = Array.isArray(payload.lastHits) ? payload.lastHits : [];
    const enemyHits = Array.isArray(payload.lastEnemyHits) ? payload.lastEnemyHits : [];
    if (!allyHits.length && !enemyHits.length) return;

    let actor = fallbackActor || null;
    if (payload.actorPartyUid != null) {
      actor =
        (st.party || []).find((m) => m && m.uid === payload.actorPartyUid) || actor;
    }
    const actorRef = actor;

    requestAnimationFrame(() => {
      if (allyHits.length) playServerHitEffects(allyHits, actorRef);
      const enemyDelay = allyHits.length ? 420 : 0;
      enemyHits.forEach((hit, i) => {
        setTimeout(() => playServerEnemyHitEffects([hit]), enemyDelay + i * 320);
      });
    });
  }

  function setFightUiPending(isPending) {
    const overlay = document.getElementById("fightOverlay");
    if (overlay) overlay.classList.toggle("fight-overlay--pending", !!isPending);
    const actions = document.getElementById("fightPlayerActions");
    if (actions) {
      actions.querySelectorAll("button").forEach((btn) => {
        btn.disabled = !!isPending;
      });
    }
  }

  function playServerHitEffects(hits, actorMember) {
    if (!hits || !hits.length || typeof playCombatStrikeEffect !== "function") return;
    const st = combatState;
    if (!st) return;
    const attackerUid = actorMember?.uid ?? st.activePartyUid;
    hits.forEach((hit) => {
      if (hit.missed) return;
      const foe = (st.foes || []).find((f) => f && f.uid === hit.foeUid);
      if (!foe) return;
      playCombatStrikeEffect({
        attackerSide: "ally",
        attackerUid,
        targetSide: "foe",
        targetUid: foe.uid,
        dmgKind: hit.dmgKind === "magic" ? "magic" : "physical",
        damage: hit.damage,
        crit: !!hit.crit,
        missed: false
      });
    });
  }

  function showCombatError(message) {
    const msg = String(message || "Combat action failed.");
    if (typeof appendFightLog === "function") {
      appendFightLog(msg);
      const logEl = document.getElementById("fightLog");
      if (logEl) logEl.scrollTop = logEl.scrollHeight;
    } else if (typeof showToast === "function") {
      showToast(msg);
    }
  }

  async function submitAction(action) {
    if (!sessionId || pending) return null;
    const isLeave = action?.type === "forfeit" || action?.type === "leave";
    if (isPrepPhase() && action?.type !== "ready" && !isLeave) return null;
    if (
      !isPrepPhase() &&
      !isLeave &&
      combatState?.phase === "player" &&
      !canControlActiveMember()
    ) {
      return null;
    }
    pending = true;
    setFightUiPending(true);
    const actorUid = combatState?.activePartyUid;
    const actorMember = (combatState?.party || []).find((m) => m && m.uid === actorUid);
    try {
      const data = await api("/api/combat/action", { sessionId, action });
      applyServerMeta(data);

      function clearServerSession() {
        sessionId = null;
        hostUserId = null;
        prepEndsAt = null;
        combatLocked = false;
      }

      function applyFinishedFightResult(data) {
        if (data.state) {
          applyServerStateToCombat(
            data.state,
            combatState?.region,
            combatState?.mob,
            combatState?.worldMapContext,
            { participants: data.participants, participantCount: data.participantCount }
          );
        }
        renderTurnBattle();
        playCombatHitsFromPayload(data);
        clearServerSession();
        mergeServerPlayer(data.player, data.roster);
        if (typeof applyServerFightResult === "function") {
          applyServerFightResult(data.result);
        }
      }

      if (data.finished && data.result) {
        applyFinishedFightResult(data);
        return data;
      }

      if (data.state) {
        applyServerStateToCombat(
          data.state,
          combatState?.region,
          combatState?.mob,
          combatState?.worldMapContext,
          { participants: data.participants, participantCount: data.participantCount }
        );
        const logEl = document.getElementById("fightLog");
        if (logEl && combatState && Array.isArray(combatState.fightLog)) {
          logEl.innerHTML = "";
          combatState.fightLog.forEach((line) => {
            const row = document.createElement("div");
            row.className = "fight-log-line";
            if (typeof formatFightLogPlainTextToHtml === "function") {
              row.innerHTML = formatFightLogPlainTextToHtml(String(line || ""));
            } else {
              row.textContent = String(line || "");
            }
            logEl.appendChild(row);
          });
          logEl.scrollTop = logEl.scrollHeight;
        }
      }
      renderTurnBattle();
      playCombatHitsFromPayload(data, actorMember);
      return data;
    } catch (err) {
      const msg = err && err.message ? err.message : "Combat action failed.";
      if (err && err.status === 404) {
        sessionId = null;
        hostUserId = null;
        prepEndsAt = null;
        combatLocked = false;
        if (typeof closeFightOverlay === "function") closeFightOverlay();
        showCombatError("This fight has ended on the server.");
      } else {
        showCombatError(msg);
      }
      return null;
    } finally {
      pending = false;
      setFightUiPending(false);
    }
  }

  function isActive() {
    return isOnlineCombat();
  }

  function hasSession() {
    return !!sessionId;
  }

  function clearSession() {
    sessionId = null;
    hostUserId = null;
    prepEndsAt = null;
    combatLocked = false;
    pending = false;
  }

  root.ServerCombat = {
    isActive,
    hasSession,
    isPending: () => pending,
    isPrepPhase,
    isFightHost,
    canControlActiveMember,
    getSessionId: () => sessionId,
    getMyUserId: resolveMyUserId,
    fetchPartySession,
    start,
    join,
    resume,
    submitAction,
    applyRemoteCombatState,
    clearSession,
    setMyUserId: (id) => {
      myUserId = id;
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
