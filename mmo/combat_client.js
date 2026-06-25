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
  let enemyPhaseUiUntil = 0;
  let enemyPhaseUiTimer = null;
  let enemyReplayStepTimer = null;
  let pendingFinalCombatApply = null;

  const ENEMY_PHASE_MIN_MS = 2000;
  const ENEMY_ACTION_STEP_MS = 1000;

  function clearServerSession() {
    sessionId = null;
    hostUserId = null;
    prepEndsAt = null;
    combatLocked = false;
  }

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
  const prevTacticalPrepUnitUid = combatState?.tacticalPrepUnitUid;
  const prevTacticalInspectUid = combatState?.tacticalInspectUid;
  const prevTacticalInspectSide = combatState?.tacticalInspectSide;
  const prevTacticalPendingSkill = combatState?.tacticalPendingSkill;
  const prevTacticalSkillHoverX = combatState?.tacticalSkillHoverX;
  const prevTacticalSkillHoverY = combatState?.tacticalSkillHoverY;
  if (
    combatState?.tactical &&
    typeof noteTacticalGridBeforeStateUpdate === "function"
  ) {
    noteTacticalGridBeforeStateUpdate();
  }
  combatState = {
      region: region || null,
      mob: mob || null,
      enemyNames: st.enemyNames || [],
      party: Array.isArray(st.party)
        ? st.party.map((m) => {
            if (!m || typeof m !== "object") return m;
            const copy = { ...m };
            if (copy.gridX != null) copy.gridX = Number(copy.gridX);
            if (copy.gridY != null) copy.gridY = Number(copy.gridY);
            if (!Number.isFinite(copy.gridX)) delete copy.gridX;
            if (!Number.isFinite(copy.gridY)) delete copy.gridY;
            return copy;
          })
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
      coopSessionId: sessionId,
      tactical: !!st.tactical,
      board: st.board && typeof st.board === "object" ? JSON.parse(JSON.stringify(st.board)) : null,
      turnQueue: Array.isArray(st.turnQueue) ? st.turnQueue.slice() : [],
      turnQueueIndex: typeof st.turnQueueIndex === "number" ? st.turnQueueIndex : 0,
      combatRound: typeof st.combatRound === "number" ? st.combatRound : 1,
      tacticalPrepUnitUid: prevTacticalPrepUnitUid,
      tacticalInspectUid:
        typeof prevTacticalInspectUid === "number" ? prevTacticalInspectUid : null,
      tacticalInspectSide:
        prevTacticalInspectSide === "ally" || prevTacticalInspectSide === "foe"
          ? prevTacticalInspectSide
          : null,
      tacticalPendingSkill:
        typeof prevTacticalPendingSkill === "string" ? prevTacticalPendingSkill : null,
      tacticalSkillHoverX:
        typeof prevTacticalSkillHoverX === "number" ? prevTacticalSkillHoverX : null,
      tacticalSkillHoverY:
        typeof prevTacticalSkillHoverY === "number" ? prevTacticalSkillHoverY : null,
      foes: Array.isArray(st.foes)
        ? st.foes.map((f) => {
            if (!f || typeof f !== "object") return f;
            const copy = { ...f };
            if (copy.gridX != null) copy.gridX = Number(copy.gridX);
            if (copy.gridY != null) copy.gridY = Number(copy.gridY);
            if (!Number.isFinite(copy.gridX)) delete copy.gridX;
            if (!Number.isFinite(copy.gridY)) delete copy.gridY;
            return copy;
          })
        : []
    };
    if (combatState.tactical && typeof ensureTacticalUnitsPlaced === "function") {
      ensureTacticalUnitsPlaced(combatState);
    }
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
    if (typeof rehydrateWorldMapMobPreviewsFromPresenceCache === "function") {
      rehydrateWorldMapMobPreviewsFromPresenceCache();
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
    if (typeof syncBottomQuickslotsVisibility === "function") syncBottomQuickslotsVisibility();
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

  function coopHeroTurnsOnlyClient(_st) {
    return false;
  }

  function isEnemyPhaseUiActive() {
    return Date.now() < enemyPhaseUiUntil;
  }

  function clearEnemyPhaseUi() {
    enemyPhaseUiUntil = 0;
    if (enemyPhaseUiTimer) {
      clearTimeout(enemyPhaseUiTimer);
      enemyPhaseUiTimer = null;
    }
    if (enemyPhaseSafetyTimer) {
      clearTimeout(enemyPhaseSafetyTimer);
      enemyPhaseSafetyTimer = null;
    }
    if (enemyReplayStepTimer) {
      clearTimeout(enemyReplayStepTimer);
      enemyReplayStepTimer = null;
    }
    pendingFinalCombatApply = null;
    if (combatState && combatState.uiPhaseOverride === "enemy") {
      delete combatState.uiPhaseOverride;
    }
  }

  let enemyPhaseSafetyTimer = null;

  function beginEnemyPhaseUi(totalMs, autoFinish) {
    const ms = Math.max(ENEMY_PHASE_MIN_MS, totalMs || ENEMY_PHASE_MIN_MS);
    enemyPhaseUiUntil = Date.now() + ms;
    if (combatState) combatState.uiPhaseOverride = "enemy";
    setFightUiPending(true);
    if (typeof renderTurnBattle === "function") renderTurnBattle();
    if (enemyPhaseUiTimer) clearTimeout(enemyPhaseUiTimer);
    if (enemyPhaseSafetyTimer) clearTimeout(enemyPhaseSafetyTimer);
    if (autoFinish !== false) {
      enemyPhaseUiTimer = setTimeout(() => {
        enemyPhaseUiTimer = null;
        clearEnemyPhaseUi();
        setFightUiPending(false);
        if (typeof renderTurnBattle === "function") renderTurnBattle();
      }, ms);
    }
    enemyPhaseSafetyTimer = setTimeout(() => {
      enemyPhaseSafetyTimer = null;
      if (isEnemyPhaseUiActive()) {
        if (pendingFinalCombatApply) finishPendingCombatApply();
        else {
          clearEnemyPhaseUi();
          setFightUiPending(false);
          if (typeof renderTurnBattle === "function") renderTurnBattle();
        }
      }
    }, ms + 800);
  }

  function applyCombatVisualSnapshot(st, snap, opts) {
    if (!st || !snap) return;
    const skipGrid = !!(opts && opts.skipGrid);
    if (Array.isArray(snap.party)) {
      snap.party.forEach((p) => {
        if (!p) return;
        const m = (st.party || []).find((x) => x && x.uid === p.uid);
        if (m) {
          m.hp = p.hp;
          if (typeof p.maxHp === "number") m.maxHp = p.maxHp;
          if (!skipGrid && typeof p.gridX === "number") m.gridX = p.gridX;
          if (!skipGrid && typeof p.gridY === "number") m.gridY = p.gridY;
        }
      });
    }
    if (Array.isArray(snap.foes)) {
      snap.foes.forEach((f) => {
        if (!f) return;
        const foe = (st.foes || []).find((x) => x && x.uid === f.uid);
        if (foe) {
          foe.hp = f.hp;
          if (typeof f.maxHp === "number") foe.maxHp = f.maxHp;
          if (!skipGrid && typeof f.gridX === "number") foe.gridX = f.gridX;
          if (!skipGrid && typeof f.gridY === "number") foe.gridY = f.gridY;
        }
      });
    }
    if (typeof snap.playerHp === "number") st.playerHp = snap.playerHp;
    if (snap.status) st.status = JSON.parse(JSON.stringify(snap.status));
  }

  function restorePreEnemyVisualState(preEnemySnapshot, opts) {
    if (!combatState || !preEnemySnapshot) return;
    if (Array.isArray(preEnemySnapshot.fightLog)) {
      combatState.fightLog = preEnemySnapshot.fightLog.slice();
    }
    applyCombatVisualSnapshot(combatState, preEnemySnapshot, opts);
    if (typeof syncFightLogFromCombatState === "function") syncFightLogFromCombatState();
  }

  function applyEnemyActionStep(step) {
    const st = combatState;
    if (!st || !step) return;
    (step.logLines || []).forEach((line) => {
      if (typeof appendFightLog === "function") appendFightLog(String(line || ""));
      else st.fightLog.push(String(line || ""));
    });
    applyCombatVisualSnapshot(st, step);
    if (typeof renderTurnBattle === "function") renderTurnBattle();
    const hits = step.hits && step.hits.length ? step.hits : null;
    const heals = step.heals && step.heals.length ? step.heals : null;
    if (hits || heals) {
      requestAnimationFrame(() => {
        if (hits) playServerEnemyHitEffects(hits);
        if (heals) playServerHealEffects(heals);
      });
    }
    if (typeof shakeFightOverlay === "function") shakeFightOverlay();
  }

  function finishPendingCombatApply() {
    const pending = pendingFinalCombatApply;
    pendingFinalCombatApply = null;
    clearEnemyPhaseUi();
    setFightUiPending(false);
    if (!pending) {
      if (typeof renderTurnBattle === "function") renderTurnBattle();
      return;
    }
    applyServerStateToCombat(
      pending.state,
      pending.region,
      pending.mob,
      pending.worldMapContext,
      pending.extra || {}
    );
    if (typeof syncFightLogFromCombatState === "function") syncFightLogFromCombatState();
    if (typeof renderTurnBattle === "function") renderTurnBattle();
    if (pending.onApplied) pending.onApplied();
  }

  function playEnemyPhaseReplay(payload, ctx) {
    const steps = Array.isArray(payload.enemyActionSteps) ? payload.enemyActionSteps : [];
    const preEnemy = payload.preEnemySnapshot;
    if (!preEnemy || !steps.length) return false;

    pendingFinalCombatApply = {
      state: payload.state,
      region: ctx.region,
      mob: ctx.mob,
      worldMapContext: ctx.worldMapContext,
      extra: ctx.extra,
      onApplied: ctx.onApplied
    };

    applyServerStateToCombat(
      payload.state,
      ctx.region,
      ctx.mob,
      ctx.worldMapContext,
      ctx.extra || {}
    );
    if (typeof setTacticalGridBeforeEnemyPhase === "function") {
      setTacticalGridBeforeEnemyPhase(preEnemy);
    }
    restorePreEnemyVisualState(preEnemy, { skipGrid: !!combatState?.tactical });
    combatState.uiPhaseOverride = "enemy";
    if (typeof renderTurnBattle === "function") renderTurnBattle();

    const allyHits = Array.isArray(payload.lastHits) ? payload.lastHits : [];
    const allyHeals = Array.isArray(payload.lastHeals) ? payload.lastHeals : [];
    const allyLeadMs = allyHits.length || allyHeals.length ? 420 : 0;
    if (allyHits.length || allyHeals.length) {
      requestAnimationFrame(() => {
        if (allyHits.length) playServerHitEffects(allyHits, ctx.actorMember);
        if (allyHeals.length) playServerHealEffects(allyHeals);
      });
    }

    const totalMs = allyLeadMs + steps.length * ENEMY_ACTION_STEP_MS + 300;
    beginEnemyPhaseUi(totalMs, false);

    let stepIndex = 0;
    const playNext = () => {
      try {
        if (!combatState || stepIndex >= steps.length) {
          finishPendingCombatApply();
          return;
        }
        const step = steps[stepIndex++];
        applyEnemyActionStep(step);
        enemyReplayStepTimer = setTimeout(playNext, ENEMY_ACTION_STEP_MS);
      } catch (err) {
        console.error("Enemy phase replay step failed:", err);
        finishPendingCombatApply();
      }
    };
    const startReplaySteps = () => {
      enemyReplayStepTimer = setTimeout(playNext, allyLeadMs + 120);
    };
    if (typeof whenTacticalMoveAnimationsSettled === "function") {
      whenTacticalMoveAnimationsSettled().then(startReplaySteps);
    } else {
      startReplaySteps();
    }
    return true;
  }

  function canControlActiveMember() {
    if (!combatState || combatState.phase !== "player") return false;
    if (isEnemyPhaseUiActive()) return false;
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
    return (combatState.party || []).some(
      (m) =>
        m &&
        m.hp > 0 &&
        !m.acted &&
        Number(m.controllerUserId) === myUid
    );
  }

  function getCombatSkillBarPayload() {
    const payload = {};
    if (typeof player === "undefined" || !player) return payload;
    if (typeof ensureActorSkillBar === "function") ensureActorSkillBar(player);
    if (Array.isArray(player.skillBarSlots)) {
      payload.skillBarSlots = player.skillBarSlots.slice();
    }
    if (Array.isArray(player.companions)) {
      payload.companionSkillBars = player.companions.map((c) => {
        if (!c) return null;
        if (typeof ensureActorSkillBar === "function") ensureActorSkillBar(c);
        return Array.isArray(c.skillBarSlots) ? { skillBarSlots: c.skillBarSlots.slice() } : null;
      });
    }
    return payload;
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
        rngSeed: (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0,
        ...getCombatSkillBarPayload()
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
      const data = await api("/api/combat/resume", {
        slotIndex: idx,
        ...getCombatSkillBarPayload()
      });
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
      slotIndex: activeCharacterSlotIndex,
      ...getCombatSkillBarPayload()
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

  function syncFightLogFromCombatState() {
    const logEl = document.getElementById("fightLog");
    if (!logEl || !combatState || !Array.isArray(combatState.fightLog)) return;
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

  function applyRemoteCombatState(msg) {
    if (!msg || !msg.state) return;
    if (sessionId && msg.sessionId && msg.sessionId !== sessionId) return;
    if (!sessionId && msg.sessionId) sessionId = msg.sessionId;
    applyServerMeta(msg);

    if (msg.finished && msg.result) {
      processCombatPayload(msg, {
        region: combatState?.region,
        mob: combatState?.mob,
        worldMapContext: combatState?.worldMapContext,
        onApplied: () => {
          clearServerSession();
          mergeServerPlayer(msg.player, msg.roster);
          if (typeof applyServerFightResult === "function") {
            applyServerFightResult(msg.result);
          }
        }
      });
      return;
    }

    processCombatPayload(msg, {
      region: combatState?.region,
      mob: combatState?.mob,
      worldMapContext: combatState?.worldMapContext
    });
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
    const allyHeals = Array.isArray(payload.lastHeals) ? payload.lastHeals : [];
    const enemyPhaseRan =
      Array.isArray(payload.enemyActionSteps) &&
      payload.enemyActionSteps.length > 0 &&
      payload.preEnemySnapshot;

    if (enemyPhaseRan) return;

    let actor = fallbackActor || null;
    if (payload.actorPartyUid != null) {
      actor =
        (st.party || []).find((m) => m && m.uid === payload.actorPartyUid) || actor;
    }

    const enemyHits = Array.isArray(payload.lastEnemyHits) ? payload.lastEnemyHits : [];
    if (enemyHits.length > 0) {
      const hitCount = enemyHits.length;
      const animMs = Math.max(ENEMY_PHASE_MIN_MS, hitCount * ENEMY_ACTION_STEP_MS);
      const allyLeadMs = allyHits.length || allyHeals.length ? 420 : 0;
      beginEnemyPhaseUi(allyLeadMs + animMs);
    }

    requestAnimationFrame(() => {
      if (allyHits.length) playServerHitEffects(allyHits, actor);
      if (allyHeals.length) playServerHealEffects(allyHeals);
      const allyLeadMs = allyHits.length || allyHeals.length ? 420 : 0;
      if (enemyHits.length) {
        enemyHits.forEach((hit, i) => {
          setTimeout(() => playServerEnemyHitEffects([hit]), allyLeadMs + i * ENEMY_ACTION_STEP_MS);
        });
      }
    });
  }

  function processCombatPayload(payload, ctx) {
    if (!payload || !payload.state) return;
    const extra = {
      participants: payload.participants,
      participantCount: payload.participantCount,
      ...(ctx.extra || {})
    };
    const replayCtx = {
      region: ctx.region,
      mob: ctx.mob,
      worldMapContext: ctx.worldMapContext,
      extra,
      actorMember: ctx.actorMember,
      onApplied: ctx.onApplied
    };

    if (
      playEnemyPhaseReplay(payload, replayCtx)
    ) {
      return;
    }

    applyServerStateToCombat(
      payload.state,
      ctx.region,
      ctx.mob,
      ctx.worldMapContext,
      extra
    );
    syncFightLogFromCombatState();
    if (typeof renderTurnBattle === "function") renderTurnBattle();
    playCombatHitsFromPayload(payload, ctx.actorMember);
    if (ctx.onApplied) ctx.onApplied();
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

  function playServerHealEffects(heals) {
    if (!heals || !heals.length || typeof playCombatCardStatusEffect !== "function") return;
    heals.forEach((heal) => {
      if (!heal) return;
      const amount = Math.max(0, Math.floor(Number(heal.amount) || 0));
      if (amount <= 0) return;
      if (heal.foeUid != null) {
        playCombatCardStatusEffect({
          targetSide: "foe",
          targetUid: heal.foeUid,
          effectType: "heal",
          damage: amount,
          heal: true
        });
      } else if (heal.memberUid != null) {
        playCombatCardStatusEffect({
          targetSide: "ally",
          targetUid: heal.memberUid,
          effectType: "heal",
          damage: amount,
          heal: true
        });
      }
    });
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
    if (isPrepPhase() && action?.type !== "ready" && action?.type !== "place" && !isLeave) return null;
    if (
      !isPrepPhase() &&
      !isLeave &&
      combatState?.phase === "player" &&
      (isEnemyPhaseUiActive() || !canControlActiveMember())
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

      function clearServerSessionLocal() {
        clearServerSession();
      }

      const payloadCtx = {
        region: combatState?.region,
        mob: combatState?.mob,
        worldMapContext: combatState?.worldMapContext,
        actorMember
      };

      if (data.finished && data.result) {
        processCombatPayload(data, {
          ...payloadCtx,
          onApplied: () => {
            clearServerSessionLocal();
            mergeServerPlayer(data.player, data.roster);
            if (typeof applyServerFightResult === "function") {
              applyServerFightResult(data.result);
            }
          }
        });
        return data;
      }

      processCombatPayload(data, payloadCtx);
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
      if (!isEnemyPhaseUiActive() && !pendingFinalCombatApply) {
        setFightUiPending(false);
      }
    }
  }

  function isActive() {
    return isOnlineCombat();
  }

  function hasSession() {
    return !!sessionId;
  }

  function clearSession() {
    clearServerSession();
    pending = false;
    clearEnemyPhaseUi();
  }

  root.ServerCombat = {
    isActive,
    hasSession,
    isPending: () => pending,
    isPrepPhase,
    isFightHost,
    canControlActiveMember,
    isEnemyPhaseUiActive,
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
