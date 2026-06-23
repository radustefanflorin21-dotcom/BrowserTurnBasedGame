import { createRequire } from "node:module";
import {
  buildFoeFromUnit,
  buildPartyFromPlayer,
  applyDamageToFoe,
  resolveIncomingToMember,
  resolveOutgoingAttack
} from "./formulas.js";
import { pickMoodIdFromEnemyDef } from "./enemy_moods.js";
import { getEnemyDefByName } from "../load_game_config.js";
import { computeVictoryRewards, applyRewardsToPlayer } from "./loot.js";
import {
  validateAndResolveSkill,
  initCombatResources,
  tickSkillCooldowns,
  skillTargetMode,
  getSkillDef
} from "./skills.js";
import { tryProcGranitehornPhysResDown, tryProcWarmasterBothDmgDownOnHit, tryProcSilverbackPhysResDownOnHit, tryProcAshmawPhysResDownOnHit, tryProcRimeboundCrippleOnPhysHit } from "./set_procs.js";
import { ensureClassState } from "./class_state.js";
import { applyClassSkillOnHit } from "./class_skills.js";
import {
  initCombatPassives,
  onFoeKilledPassives,
  tryDuelistMomentumOnCrit,
  trySecondBreath
} from "./combat_passives.js";
import { createEnemyPhaseStepRecorder } from "./enemy_phase_replay.js";
import { applyDungeonMechanicsEndOfEnemyPhase } from "./dungeon_mechanics.js";
import { initFoeCombatRuntime, runSingleEnemyTurn, tryEmberForgelingMeltdown, tryPaleRimeWispFadeCold } from "./enemy_ai.js";
import {
  ensureCombatStatus,
  tickEffectsAtStartOfPlayerTurn,
  tickFoeDebuffs,
  tickFoeDots,
  tickPlayerDefenseAfterEnemyPhase,
  tickPlayerTurnEndBuffs,
  isHeroStunned
} from "./status.js";
import {
  getPlayerForMember,
  getParticipantPlayer,
  finishCoopVictory,
  finishCoopDefeat,
  leaveCoopParticipant,
  syncAllHeroHpToPlayers,
  beginCoopFromPrep,
  findNextActingMember,
  markCompanionsSkippedForCoopHeroTurns,
  markCoopHeroActedIfNeeded,
  firstActingMember,
  ensureActivePartyUidInState,
  coopHeroTurnsOnly
} from "./coop.js";
import {
  isCoopMultiHeroStamina,
  syncGlobalStaminaFromMember,
  refillMemberCombatStamina
} from "./stamina.js";

const require = createRequire(import.meta.url);
const { createCombatRng } = require("../../shared/combat_rng.js");

const COMBAT_FOES_MAX = 6;

function cloneState(st) {
  return JSON.parse(JSON.stringify(st));
}

function resolveActionTargetUid(action, fallback) {
  const n = Number(action?.targetUid);
  return Number.isFinite(n) ? n : fallback;
}

function setSelectedFoeUid(st, uid) {
  const n = Number(uid);
  if (!Number.isFinite(n)) return false;
  const foe = (st.foes || []).find((f) => f && f.uid === n && f.hp > 0);
  if (!foe) return false;
  st.selectedUid = foe.uid;
  return true;
}

function appendLog(st, line) {
  st.fightLog.push(String(line));
}

function syncHeroHp(st) {
  const hero = st.party.find((m) => m.kind === "hero");
  if (hero) {
    st.playerHp = hero.hp;
    st.playerMax = hero.maxHp;
  }
}

function isPartyAlive(st) {
  return st.party.some((m) => m && m.hp > 0);
}

function getActiveMember(st, session = null) {
  let member = st.party.find((m) => m && m.uid === st.activePartyUid && m.hp > 0 && !m.acted) || null;
  if (!member && session?.coop) {
    member = findNextActingMember(session, st);
    if (member) {
      st.activePartyUid = member.uid;
      st.selectedAllyUid = member.uid;
    }
  }
  return member;
}

/** Co-op: the fighter whose turn it is, only if that user may act now. */
function getCoopMemberForUser(st, session, userId) {
  if (!session?.coop || userId == null) return getActiveMember(st, session);
  const active = getActiveMember(st, session);
  if (active && Number(active.controllerUserId) === Number(userId)) return active;
  return null;
}

function ensureActivePartyUid(st) {
  const elig = st.party.filter((m) => m && m.hp > 0 && !m.acted);
  if (!elig.length) {
    st.activePartyUid = null;
    return;
  }
  if (st.activePartyUid == null || !elig.some((m) => m.uid === st.activePartyUid)) {
    st.activePartyUid = elig[0].uid;
  }
}

function startPlayerPhase(st, session = null) {
  st.party.forEach((m) => {
    if (m) m.acted = false;
  });
  if (session) markCompanionsSkippedForCoopHeroTurns(st, session);
  const first = session
    ? firstActingMember(session, st)
    : null;
  const active = first || st.party.find((m) => m && m.hp > 0);
  st.activePartyUid = active ? active.uid : null;
  st.selectedAllyUid = st.activePartyUid;
}

function runEnemyPhase(st, player, rng, enemyHits, session = null, replayOut = null) {
  const cs = st.classState;
  if (cs) {
    if (cs.killMomentumPendingPct) {
      cs.killMomentumPhysPct = cs.killMomentumPendingPct;
      cs.killMomentumPendingPct = 0;
    } else if (cs.killMomentumPhysPct) {
      cs.killMomentumPhysPct = 0;
    }
  }
  st.phase = "enemy";
  const livingFoes = st.foes.filter((f) => f.hp > 0);
  if (!livingFoes.length) return { outcome: "victory" };
  if (!isPartyAlive(st)) return { outcome: "defeat" };

  const recorder =
    replayOut && replayOut.__recorder
      ? replayOut.__recorder
      : replayOut
        ? (() => {
            const rec = createEnemyPhaseStepRecorder(st);
            replayOut.__recorder = rec;
            replayOut.preEnemySnapshot = rec.preEnemySnapshot;
            return rec;
          })()
        : null;
  const append = recorder
    ? recorder.wrapAppendLog((line) => appendLog(st, line))
    : (line) => appendLog(st, line);

  const finalizeReplay = () => {
    if (!recorder || !replayOut) return;
    const finished = recorder.finish();
    replayOut.enemyActionSteps = finished.steps;
    replayOut.preEnemySnapshot = finished.preEnemySnapshot;
    delete replayOut.__recorder;
  };

  for (const foe of livingFoes) {
    if (!isPartyAlive(st)) break;
    if (foe.hp <= 0) continue;
    runSingleEnemyTurn(foe, st, rng, append, player, enemyHits, recorder);
  }

  if (!isPartyAlive(st)) {
    finalizeReplay();
    return { outcome: "defeat" };
  }
  if (!st.foes.some((f) => f.hp > 0)) {
    finalizeReplay();
    return { outcome: "victory" };
  }

  applyDungeonMechanicsEndOfEnemyPhase(st, rng, append);

  tickSkillCooldowns(st);
  tickFoeDebuffs(st);
  st.phase = "player";
  startPlayerPhase(st, session);
  (st.party || []).forEach((m) => {
    if (m) refillMemberCombatStamina(m);
  });
  const firstHero =
    (session ? firstActingMember(session, st) : null) ||
    (st.party || []).find((m) => m && m.kind === "hero");
  if (firstHero) syncGlobalStaminaFromMember(st, firstHero);
  ensureCombatStatus(st);
  tickEffectsAtStartOfPlayerTurn(st, player, append);
  const stunnedHero = (st.party || []).find((m) => m?.kind === "hero" && m.hp > 0);
  if (stunnedHero && isHeroStunned(st)) {
    st.status.playerStunTurns = Math.max(0, (st.status.playerStunTurns || 0) - 1);
    append("You are stunned and lose your turn!");
    (st.party || []).forEach((m) => {
      if (m) m.acted = true;
    });
    tickFoeDots(st, append);
    tickPlayerTurnEndBuffs(st);
    tickPlayerDefenseAfterEnemyPhase(st);
    if (!isPartyAlive(st)) {
      finalizeReplay();
      return { outcome: "defeat" };
    }
    return runEnemyPhase(st, player, rng, enemyHits, session, replayOut);
  }
  if (st.selectedUid == null || !st.foes.some((f) => f.uid === st.selectedUid && f.hp > 0)) {
    const firstFoe = st.foes.find((f) => f.hp > 0);
    st.selectedUid = firstFoe ? firstFoe.uid : null;
  }
  finalizeReplay();
  return { outcome: null };
}

export function createCombatSession(player, encounter, rngSeed) {
  const rng = createCombatRng(rngSeed);
  const units = Array.isArray(encounter?.units)
    ? encounter.units.slice(0, COMBAT_FOES_MAX)
    : Array.isArray(encounter?.enemies)
      ? encounter.enemies.map((name) => ({ name }))
      : [];
  const foes = units
    .map((u, i) => {
      if (!u || typeof u.name !== "string") return null;
      const def = getEnemyDefByName(u.name);
      const moodId =
        typeof u.moodId === "string" && u.moodId.trim()
          ? u.moodId.trim()
          : pickMoodIdFromEnemyDef(def, rng);
      return buildFoeFromUnit({ ...u, moodId: moodId || null }, i);
    })
    .filter(Boolean);
  foes.forEach((f) => initFoeCombatRuntime(f));
  if (!foes.length) {
    const err = new Error("No valid enemies in encounter.");
    err.status = 400;
    throw err;
  }
  const party = buildPartyFromPlayer(player);
  const st = {
    phase: "player",
    foes,
    party,
    playerHp: party[0]?.hp ?? player.hp,
    playerMax: party[0]?.maxHp ?? player.maxHp,
    selectedUid: foes[0]?.uid ?? null,
    selectedAllyUid: party[0]?.uid ?? null,
    activePartyUid: party[0]?.uid ?? null,
    fightLog: ["— Fight start (server) —"],
    enemyNames: foes.map((f) => f.name),
    worldMapContext: encounter?.worldMapContext || null,
    endOutcome: null
  };
  startPlayerPhase(st);
  initCombatResources(st, player);
  ensureCombatStatus(st);
  ensureClassState(st);
  initCombatPassives(st, player);
  return { state: st, rngSeed: rng.seed, rng };
}

function getActorForMember(st, member, player) {
  if (member.kind === "hero") return player;
  if (member.kind === "companion" && Number.isFinite(member.companionSlotIndex)) {
    return player.companions?.[member.companionSlotIndex] || null;
  }
  return null;
}

function resolveActorPlayer(session, member) {
  if (session.coop && member) return getPlayerForMember(session, member);
  return session.player;
}

function syncActiveHeroCombatToState(st, member) {
  if (!member || member.kind !== "hero") return;
  syncGlobalStaminaFromMember(st, member);
  if (member.classState) st.classState = member.classState;
}

function syncStateToActiveHeroCombat(st, member) {
  if (!member || member.kind !== "hero") return;
  if (isCoopMultiHeroStamina(st)) {
    syncGlobalStaminaFromMember(st, member);
    return;
  }
  if (typeof st.stamina === "number") member.stamina = st.stamina;
  if (typeof st.maxStamina === "number") member.maxStamina = st.maxStamina;
  member.skillCooldowns = st.skillCooldowns || {};
  member.classState = st.classState;
}

function primaryPlayerForEnemyPhase(session) {
  if (!session.coop) return session.player;
  return (
    getParticipantPlayer(session, session.hostUserId) ||
    [...session.participants.values()][0]?.player ||
    session.player
  );
}

function syncHpAfterAction(session) {
  if (session.coop) syncAllHeroHpToPlayers(session);
  else syncHeroHp(session.state);
}

function finishVictory(st, player, rng) {
  st.phase = "ended";
  st.endOutcome = "victory";
  syncHeroHp(st);
  const rewards = computeVictoryRewards(st.foes, st.party, player, rng, st.worldMapContext);
  const result = {
    victory: true,
    finalPlayerHp: Math.max(0, st.playerHp),
    gold: rewards.gold,
    xp: rewards.xp,
    items: rewards.items,
    memberRewards: rewards.memberRewards
  };
  applyRewardsToPlayer(player, result);
  return result;
}

function afterPlayerAction(session, rng, actingMember = null) {
  const st = session.state;
  syncHpAfterAction(session);
  if (!st.foes.some((f) => f.hp > 0)) {
    if (session.coop) return finishCoopVictory(session, rng);
    const result = finishVictory(st, session.player, rng);
    return { state: cloneState(st), result, finished: true };
  }
  if (!isPartyAlive(st)) {
    if (session.coop) return finishCoopDefeat(session);
    const result = finishDefeat(st, session.player);
    return { state: cloneState(st), result, finished: true };
  }
  if (session.coop) markCompanionsSkippedForCoopHeroTurns(st, session);
  const next = session.coop
    ? findNextActingMember(session, st)
    : st.party.find((m) => m && m.hp > 0 && !m.acted);
  if (next) {
    const prevUid = actingMember?.uid ?? null;
    if (prevUid == null || next.uid !== prevUid) {
      refillMemberCombatStamina(next);
    }
    st.activePartyUid = next.uid;
    st.selectedAllyUid = next.uid;
    if (session.coop) {
      ensureActivePartyUidInState(st, session);
      if (next.kind === "hero") syncGlobalStaminaFromMember(st, next);
    } else if (next.kind === "hero") {
      syncGlobalStaminaFromMember(st, next);
    }
    return { state: cloneState(st), result: null, finished: false };
  }
  tickFoeDots(st, (line) => appendLog(st, line));
  tickPlayerTurnEndBuffs(st);
  if (!isPartyAlive(st)) {
    if (session.coop) return finishCoopDefeat(session);
    const result = finishDefeat(st, session.player);
    return { state: cloneState(st), result, finished: true };
  }
  const enemyPlayer = primaryPlayerForEnemyPhase(session);
  const enemyHits = [];
  const replayOut = {};
  const enemyOutcome = runEnemyPhase(st, enemyPlayer, rng, enemyHits, session, replayOut);
  const withEnemyHits = (out) => ({
    ...out,
    lastEnemyHits: enemyHits,
    ...(replayOut.preEnemySnapshot
      ? {
          preEnemySnapshot: replayOut.preEnemySnapshot,
          enemyActionSteps: replayOut.enemyActionSteps || []
        }
      : {})
  });
  if (enemyOutcome.outcome === "victory") {
    if (session.coop) return withEnemyHits(finishCoopVictory(session, rng));
    const result = finishVictory(st, session.player, rng);
    return withEnemyHits({ state: cloneState(st), result, finished: true });
  }
  if (enemyOutcome.outcome === "defeat") {
    if (session.coop) return withEnemyHits(finishCoopDefeat(session));
    const result = finishDefeat(st, session.player);
    return withEnemyHits({ state: cloneState(st), result, finished: true });
  }
  return withEnemyHits({ state: cloneState(st), result: null, finished: false });
}

function finishDefeat(st, player) {
  st.phase = "ended";
  st.endOutcome = "defeat";
  syncHeroHp(st);
  const result = {
    victory: false,
    finalPlayerHp: Math.max(1, st.playerHp),
    gold: 0,
    xp: 0,
    items: [],
    memberRewards: []
  };
  applyRewardsToPlayer(player, result);
  return result;
}

/**
 * @param {object} session
 * @param {{ type: string, targetUid?: number, skillName?: string }} action
 * @param {number} [actingUserId]
 */
export function processCombatAction(session, action, actingUserId = null) {
  const st = session.state;
  const rng = session.rng;
  const coop = !!session.coop;
  const userId = coop ? actingUserId : session.userId;

  if (st.phase === "ended") {
    const err = new Error("Combat already ended.");
    err.status = 400;
    throw err;
  }

  const type = action?.type;

  if (coop && st.phase === "prep") {
    if (type !== "ready") {
      const err = new Error("Fight has not started yet.");
      err.status = 400;
      throw err;
    }
    if (session.locked) {
      const err = new Error("Fight already started.");
      err.status = 400;
      throw err;
    }
    if (userId !== session.hostUserId) {
      const err = new Error("Only the host can start the fight early.");
      err.status = 403;
      throw err;
    }
    if (session.prepTimer) {
      clearTimeout(session.prepTimer);
      session.prepTimer = null;
    }
    session.locked = true;
    beginCoopFromPrep(session);
    return { state: cloneState(st), result: null, finished: false, began: true };
  }

  const player = coop ? getParticipantPlayer(session, userId) : session.player;
  if (!player) {
    const err = new Error("Not a participant in this fight.");
    err.status = 403;
    throw err;
  }

  if (type === "forfeit" || type === "leave") {
    if (coop) return leaveCoopParticipant(session, userId);
    appendLog(st, `${player.name || "Hero"} forfeits.`);
    const result = finishDefeat(st, player);
    result.leftFight = true;
    st.playerHp = 1;
    syncHeroHp(st);
    return { state: cloneState(st), result, finished: true };
  }

  if (st.phase !== "player") {
    const err = new Error("Not player phase.");
    err.status = 400;
    throw err;
  }

  const activeForTurn = coop ? getCoopMemberForUser(st, session, userId) : getActiveMember(st, session);
  if (!activeForTurn) {
    const err = new Error("No active party member.");
    err.status = 400;
    throw err;
  }
  if (coop) {
    st.activePartyUid = activeForTurn.uid;
    st.selectedAllyUid = activeForTurn.uid;
    if (Number(activeForTurn.controllerUserId) !== Number(userId)) {
      const err = new Error("Not your turn.");
      err.status = 403;
      throw err;
    }
  }
  if (activeForTurn.kind === "hero") syncActiveHeroCombatToState(st, activeForTurn);

  if (type === "skill") {
    const skillName = typeof action.skillName === "string" ? action.skillName.trim() : "";
    if (!skillName) {
      const err = new Error("skillName required.");
      err.status = 400;
      throw err;
    }
    const member = activeForTurn;
    const actorPlayer = resolveActorPlayer(session, member);
    const actor = getActorForMember(st, member, actorPlayer);
    if (!actor) {
      const err = new Error("Invalid actor.");
      err.status = 400;
      throw err;
    }
    const mode = skillTargetMode(skillName);
    const targetUid = Number.isFinite(Number(action.targetUid))
      ? Number(action.targetUid)
      : mode === "ally"
        ? st.selectedAllyUid
        : mode === "enemy"
          ? st.selectedUid
          : member.uid;
    if (mode === "enemy") setSelectedFoeUid(st, targetUid);
    const resolved = validateAndResolveSkill(st, member, actor, skillName, targetUid, rng);
    if (!resolved.ok) {
      appendLog(st, resolved.error || "Skill failed.");
      return { state: cloneState(st), result: null, finished: false };
    }
    const label = skillName;
    for (const heal of resolved.heals || []) {
      const ally = st.party.find((m) => m && m.uid === heal.memberUid);
      if (!ally) continue;
      appendLog(st, `${member.name} uses ${label} on ${ally.name}, restoring ${heal.amount} HP.`);
    }
    for (const line of resolved.debuffLogs || []) {
      if (line) appendLog(st, line);
    }
    for (const line of resolved.supportLogs || []) {
      if (line) appendLog(st, line);
    }
    syncHeroHp(st);
    for (const hit of resolved.hits || []) {
      const foe = st.foes.find((f) => f.uid === hit.foeUid);
      if (!foe) continue;
      if (hit.missed) {
        appendLog(st, `${member.name} uses ${label} on ${foe.name} but misses.`);
        continue;
      }
      const dmg = applyDamageToFoe(foe, hit.damage);
      appendLog(
        st,
        `${member.name} uses ${label} on ${foe.name} for ${dmg} damage${hit.crit ? " (critical hit!)" : ""}.`
      );
      const skDef = getSkillDef(skillName);
      const dmgKind = skDef?.damageKind === "magic" ? "magic" : "physical";
      const graniteLog = tryProcGranitehornPhysResDown(actorPlayer?.equipment, foe, rng, dmgKind);
      if (graniteLog) appendLog(st, graniteLog);
      const warmasterLog = tryProcWarmasterBothDmgDownOnHit(actorPlayer?.equipment, foe, rng, dmgKind);
      if (warmasterLog) appendLog(st, warmasterLog);
      const silverbackLog = tryProcSilverbackPhysResDownOnHit(actorPlayer?.equipment, foe, rng, dmgKind);
      if (silverbackLog) appendLog(st, silverbackLog);
      const ashmawLog = tryProcAshmawPhysResDownOnHit(actorPlayer?.equipment, foe, rng, dmgKind);
      if (ashmawLog) appendLog(st, ashmawLog);
      const rimeboundLog = tryProcRimeboundCrippleOnPhysHit(actorPlayer?.equipment, foe, rng, dmgKind);
      if (rimeboundLog) appendLog(st, rimeboundLog);
      if (hit.crit) {
        const dm = tryDuelistMomentumOnCrit(st, actor, rng, member);
        if (dm) appendLog(st, dm);
      }
      for (const line of applyClassSkillOnHit(st, actor, skillName, foe, dmg, rng, member)) {
        if (line) appendLog(st, line);
      }
      if (foe.hp <= 0) {
        for (const line of onFoeKilledPassives(st, actor, member)) {
          if (line) appendLog(st, line);
        }
        const meltdownLog = tryEmberForgelingMeltdown(st, foe, rng, appendLog, actorPlayer);
        if (meltdownLog) appendLog(st, meltdownLog);
        const fadeColdLog = tryPaleRimeWispFadeCold(st, foe, rng, appendLog, actorPlayer);
        if (fadeColdLog) appendLog(st, fadeColdLog);
      }
    }
    for (const line of resolved.debuffLogs || []) {
      if (line) appendLog(st, line);
    }
    if (member.kind === "hero") syncStateToActiveHeroCombat(st, member);
    const out = afterPlayerAction(session, rng, member);
    return {
      ...out,
      lastHits: resolved.hits || [],
      lastHeals: resolved.heals || [],
      actorPartyUid: member.uid
    };
  }

  if (type === "pass") {
    activeForTurn.acted = true;
    appendLog(st, `${activeForTurn.name} ends their turn.`);
    if (activeForTurn.kind === "hero") syncStateToActiveHeroCombat(st, activeForTurn);
    return afterPlayerAction(session, rng, activeForTurn);
  }

  if (type === "attack") {
    const member = activeForTurn;
    const actorPlayer = resolveActorPlayer(session, member);
    const actor = getActorForMember(st, member, actorPlayer);
    if (!actor) {
      const err = new Error("Invalid actor.");
      err.status = 400;
      throw err;
    }
    const targetUid = resolveActionTargetUid(action, st.selectedUid);
    if (!setSelectedFoeUid(st, targetUid)) {
      const err = new Error("Invalid target.");
      err.status = 400;
      throw err;
    }
    const foe = st.foes.find((f) => f.uid === st.selectedUid && f.hp > 0);
    const res = resolveOutgoingAttack(actor, foe, rng, st, member);
    let dmg = 0;
    if (res.missed) {
      appendLog(st, `${member.name} attacks ${foe.name} but misses.`);
    } else {
      dmg = applyDamageToFoe(foe, res.damage);
      appendLog(
        st,
        `${member.name} attacks ${foe.name} for ${dmg} damage${res.crit ? " (critical hit!)" : ""}.`
      );
      const graniteLog = tryProcGranitehornPhysResDown(actorPlayer?.equipment, foe, rng, "physical");
      if (graniteLog) appendLog(st, graniteLog);
      const warmasterLog = tryProcWarmasterBothDmgDownOnHit(actorPlayer?.equipment, foe, rng, "physical");
      if (warmasterLog) appendLog(st, warmasterLog);
      const silverbackLog = tryProcSilverbackPhysResDownOnHit(actorPlayer?.equipment, foe, rng, "physical");
      if (silverbackLog) appendLog(st, silverbackLog);
      const ashmawLog = tryProcAshmawPhysResDownOnHit(actorPlayer?.equipment, foe, rng, "physical");
      if (ashmawLog) appendLog(st, ashmawLog);
      const rimeboundLog = tryProcRimeboundCrippleOnPhysHit(actorPlayer?.equipment, foe, rng, "physical");
      if (rimeboundLog) appendLog(st, rimeboundLog);
    }
    if (foe.hp <= 0) {
      const meltdownLog = tryEmberForgelingMeltdown(st, foe, rng, appendLog, actorPlayer);
      if (meltdownLog) appendLog(st, meltdownLog);
      const fadeColdLog = tryPaleRimeWispFadeCold(st, foe, rng, appendLog, actorPlayer);
      if (fadeColdLog) appendLog(st, fadeColdLog);
    }
    if (member.kind === "hero") syncStateToActiveHeroCombat(st, member);
    markCoopHeroActedIfNeeded(member, session);
    const out = afterPlayerAction(session, rng, member);
    return {
      ...out,
      lastHits: [{ foeUid: foe.uid, damage: dmg, missed: res.missed, crit: res.crit }],
      actorPartyUid: member.uid
    };
  }

  const err = new Error("Unknown combat action.");
  err.status = 400;
  throw err;
}
