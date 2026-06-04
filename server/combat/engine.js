import { createRequire } from "node:module";
import {
  buildFoeFromUnit,
  buildPartyFromPlayer,
  applyDamageToFoe,
  resolveIncomingToMember,
  resolveOutgoingAttack
} from "./formulas.js";
import { computeVictoryRewards, applyRewardsToPlayer } from "./loot.js";
import {
  validateAndResolveSkill,
  initCombatResources,
  tickSkillCooldowns,
  skillTargetMode,
  getSkillDef
} from "./skills.js";
import { tryProcGranitehornPhysResDown } from "./set_procs.js";
import { ensureClassState } from "./class_state.js";
import { applyClassSkillOnHit } from "./class_skills.js";
import {
  initCombatPassives,
  onFoeKilledPassives,
  tryDuelistMomentumOnCrit,
  trySecondBreath
} from "./combat_passives.js";
import { applyDungeonMechanicsEndOfEnemyPhase } from "./dungeon_mechanics.js";
import { initFoeCombatRuntime, runSingleEnemyTurn } from "./enemy_ai.js";
import {
  ensureCombatStatus,
  tickEffectsAtStartOfPlayerTurn,
  tickFoeDebuffs,
  tickFoeDots,
  tickPlayerDefenseAfterEnemyPhase,
  tickPlayerTurnEndBuffs
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
  if (member && session?.coop && coopHeroTurnsOnly(session) && member.kind !== "hero") {
    member = null;
  }
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

function runEnemyPhase(st, player, rng, enemyHits, session = null) {
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

  for (const foe of livingFoes) {
    if (!isPartyAlive(st)) break;
    if (foe.hp <= 0) continue;
    runSingleEnemyTurn(foe, st, rng, (line) => appendLog(st, line), player, enemyHits);
  }

  if (!isPartyAlive(st)) return { outcome: "defeat" };
  if (!st.foes.some((f) => f.hp > 0)) return { outcome: "victory" };

  applyDungeonMechanicsEndOfEnemyPhase(st, rng, (line) => appendLog(st, line));

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
  tickEffectsAtStartOfPlayerTurn(st, player, (line) => appendLog(st, line));
  if (st.selectedUid == null || !st.foes.some((f) => f.uid === st.selectedUid && f.hp > 0)) {
    const firstFoe = st.foes.find((f) => f.hp > 0);
    st.selectedUid = firstFoe ? firstFoe.uid : null;
  }
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
    .map((u, i) => buildFoeFromUnit(u, i))
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
  const rewards = computeVictoryRewards(st.foes, st.party, player, rng);
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
  const enemyOutcome = runEnemyPhase(st, enemyPlayer, rng, enemyHits, session);
  const withEnemyHits = (out) =>
    enemyHits.length ? { ...out, lastEnemyHits: enemyHits } : out;
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
    if (userId !== session.hostUserId) {
      const err = new Error("Only the fight host can ready up.");
      err.status = 403;
      throw err;
    }
    if (session.locked) {
      const err = new Error("Fight already started.");
      err.status = 400;
      throw err;
    }
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
    const targetUid =
      typeof action.targetUid === "number"
        ? action.targetUid
        : mode === "ally"
          ? st.selectedAllyUid
          : mode === "enemy"
            ? st.selectedUid
            : member.uid;
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
      }
    }
    for (const line of resolved.debuffLogs || []) {
      if (line) appendLog(st, line);
    }
    if (member.kind === "hero") syncStateToActiveHeroCombat(st, member);
    const out = afterPlayerAction(session, rng, member);
    return { ...out, lastHits: resolved.hits || [], actorPartyUid: member.uid };
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
    const targetUid =
      typeof action.targetUid === "number" ? action.targetUid : st.selectedUid;
    const foe = st.foes.find((f) => f.uid === targetUid && f.hp > 0);
    if (!foe) {
      const err = new Error("Invalid target.");
      err.status = 400;
      throw err;
    }
    st.selectedUid = foe.uid;
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
