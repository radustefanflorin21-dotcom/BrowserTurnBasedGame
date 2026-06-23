/**
 * Cooperative online combat: prep phase, merged party, per-participant loot.
 */

import { createRequire } from "node:module";
import {
  buildFoeFromUnit,
  buildPartyFromPlayer
} from "./formulas.js";
import {
  computeVictoryRewards,
  applyRewardsToPlayer
} from "./loot.js";
import { ensureClassState } from "./class_state.js";
import { initCombatPassives } from "./combat_passives.js";
import { initFoeCombatRuntime } from "./enemy_ai.js";
import { ensureCombatStatus } from "./status.js";
import { byUserId } from "../presence/hub.js";
import { presenceMatchesWorldMapContext } from "../presence/location.js";
import { preparePlayerForCombat } from "./player_prep.js";
import { getActorCombatMaxStamina, syncGlobalStaminaFromMember } from "./stamina.js";

const require = createRequire(import.meta.url);
const { createCombatRng } = require("../../shared/combat_rng.js");

export const MAX_COOP_PARTY_UNITS = 8;
export const COOP_PREP_MS = 30_000;
const COMBAT_FOES_MAX = 6;

function cloneState(st) {
  return JSON.parse(JSON.stringify(st));
}

export function buildPartyFromPlayerCapped(player, maxUnits) {
  const full = buildPartyFromPlayer(player);
  const cap = Math.max(0, Math.floor(maxUnits || 0));
  return cap > 0 ? full.slice(0, cap) : [];
}

function portraitGenderFromActor(actor) {
  if (!actor) return null;
  if (typeof actor.portraitGender === "string" && actor.portraitGender.trim()) {
    return actor.portraitGender.trim();
  }
  if (typeof actor.gender === "string" && actor.gender.trim()) return actor.gender.trim();
  return null;
}

function enrichMemberFromPlayer(member, player) {
  if (!member || !player) return member;
  if (member.kind === "hero") {
    member.ownerUserId = member.controllerUserId;
    const pg = portraitGenderFromActor(player);
    if (pg) member.portraitGender = pg;
    if (player.class) member.portraitClass = player.class;
    if (player.portraitImage) member.portraitImage = player.portraitImage;
    if (player.equipment) member.equipment = { ...player.equipment };
    return member;
  }
  if (member.kind === "companion" && Number.isFinite(member.companionSlotIndex)) {
    const comp = player.companions?.[member.companionSlotIndex];
    if (comp) {
      member.ownerUserId = member.controllerUserId;
      const pg = portraitGenderFromActor(comp);
      if (pg) member.portraitGender = pg;
      if (comp.class) member.portraitClass = comp.class;
      if (comp.portraitImage) member.portraitImage = comp.portraitImage;
      if (comp.equipment) member.equipment = { ...comp.equipment };
    }
  }
  return member;
}

export function tagPartyForUser(party, userId, uidStart, player) {
  let uid = uidStart;
  const tagged = [];
  for (const m of party) {
    if (!m) continue;
    let copy = { ...m, uid: uid++, controllerUserId: userId };
    copy = enrichMemberFromPlayer(copy, player);
    tagged.push(copy);
  }
  return { party: tagged, nextUid: uid };
}

export function buildFoesFromEncounter(encounter) {
  const units = Array.isArray(encounter?.units)
    ? encounter.units.slice(0, COMBAT_FOES_MAX)
    : Array.isArray(encounter?.enemies)
      ? encounter.enemies.map((name) => ({ name }))
      : [];
  const foes = units.map((u, i) => buildFoeFromUnit(u, i)).filter(Boolean);
  foes.forEach((f) => initFoeCombatRuntime(f));
  if (!foes.length) {
    const err = new Error("No valid enemies in encounter.");
    err.status = 400;
    throw err;
  }
  return foes;
}

/**
 * @param {object} session - coop session with participants Map
 */
export function getParticipantPlayer(session, userId) {
  const p = session.participants.get(userId);
  return p ? p.player : null;
}

export function getPlayerForMember(session, member) {
  if (!member || member.controllerUserId == null) return session.player || null;
  return getParticipantPlayer(session, member.controllerUserId);
}

export function countPartyUnits(party) {
  return (party || []).filter(Boolean).length;
}

export function canAddParticipantParty(session, player) {
  const remaining = MAX_COOP_PARTY_UNITS - countPartyUnits(session.state.party);
  if (remaining <= 0) {
    return { ok: false, message: `Party is full (max ${MAX_COOP_PARTY_UNITS} fighters).` };
  }
  const incoming = buildPartyFromPlayerCapped(player, remaining).length;
  if (incoming <= 0) {
    return { ok: false, message: "No fighters available to add." };
  }
  return { ok: true, remaining, incoming };
}

export function appendParticipantToState(session, userId, player) {
  const check = canAddParticipantParty(session, player);
  if (!check.ok) {
    const err = new Error(check.message);
    err.status = 400;
    throw err;
  }
  const st = session.state;
  let nextUid = 0;
  for (const m of st.party) {
    if (m && typeof m.uid === "number" && m.uid >= nextUid) nextUid = m.uid + 1;
  }
  const remaining = MAX_COOP_PARTY_UNITS - countPartyUnits(st.party);
  const built = buildPartyFromPlayerCapped(player, remaining);
  const { party: tagged } = tagPartyForUser(built, userId, nextUid, player);
  st.party.push(...tagged);
  st.fightLog.push(`— ${player.name || "Hero"} joins the fight —`);
  return tagged;
}

export function createCoopPrepState(hostUserId, player, encounter, rngSeed) {
  const rng = createCombatRng(rngSeed);
  const foes = buildFoesFromEncounter(encounter);
  preparePlayerForCombat(player);
  const built = buildPartyFromPlayerCapped(player, MAX_COOP_PARTY_UNITS);
  const { party } = tagPartyForUser(built, hostUserId, 0, player);
  const prepEndsAt = Date.now() + COOP_PREP_MS;
  const st = {
    phase: "prep",
    prepEndsAt,
    foes,
    party,
    playerHp: party[0]?.hp ?? player.hp,
    playerMax: party[0]?.maxHp ?? player.maxHp,
    selectedUid: foes[0]?.uid ?? null,
    selectedAllyUid: party[0]?.uid ?? null,
    activePartyUid: null,
    fightLog: ["— Fight forming — waiting for party to join —"],
    enemyNames: foes.map((f) => f.name),
    worldMapContext: encounter?.worldMapContext || null,
    endOutcome: null,
    hostUserId
  };
  return { state: st, rngSeed: rng.seed, rng, prepEndsAt };
}

function initHeroCombatOnMember(member, player) {
  member.skillCooldowns = {};
  member.classState = {
    divineAegisShield: 0,
    skillCooldowns: {},
    spellPrepCharges: 0,
    spellPrepMagPct: 0,
    spellPrepMaxTurns: 0,
    spellPrepAgeTurns: 0,
    overloadMagPct: 0,
    overloadAcc: 0,
    overloadTurns: 0,
    bloodPricePhysPct: 0,
    bloodPriceTurns: 0,
    sanctuaryTurns: 0,
    sanctuaryDrPct: 0,
    sanctuarySrPct: 0,
    regenTurns: 0,
    regenAmt: 0,
    regenTargetUid: null,
    flowStepEva: 0,
    flowStepAcc: 0,
    killMomentumPhysPct: 0,
    killMomentumPendingPct: 0
  };
}

/** Per-fighter stamina pools for co-op (each hero/companion uses their owner's stats). */
export function initCoopCombatStamina(session) {
  const st = session.state;
  for (const m of st.party || []) {
    if (!m) continue;
    const owner = getPlayerForMember(session, m);
    if (!owner) continue;
    if (m.kind === "hero") {
      const max = getActorCombatMaxStamina(owner);
      m.stamina = max;
      m.maxStamina = max;
    } else if (m.kind === "companion" && Number.isFinite(m.companionSlotIndex)) {
      const comp = owner.companions?.[m.companionSlotIndex];
      const compMax = comp ? getActorCombatMaxStamina(comp) : getActorCombatMaxStamina(owner);
      m.stamina = compMax;
      m.maxStamina = compMax;
    }
  }
  const first =
    firstActingMember(session, st) || (st.party || []).find((m) => m && m.kind === "hero");
  if (first) syncGlobalStaminaFromMember(st, first);
}

export function beginCoopFromPrep(session) {
  const st = session.state;
  if (st.phase !== "prep") return;
  session.locked = true;
  st.phase = "player";
  st.fightLog.push("— Fight start —");

  ensureCombatStatus(st);
  ensureClassState(st);

  for (const { userId, player } of session.participants.values()) {
    const hero = st.party.find((m) => m && m.kind === "hero" && m.controllerUserId === userId);
    if (hero) initHeroCombatOnMember(hero, player);
    initCombatPassives(st, player);
  }
  initCoopCombatStamina(session);

  st.party.forEach((m) => {
    if (m) m.acted = false;
  });
  const first = firstActingMember(session, st) || st.party.find((m) => m && m.hp > 0);
  st.activePartyUid = first ? first.uid : null;
  st.selectedAllyUid = st.activePartyUid;
}

export function syncAllHeroHpToPlayers(session) {
  const st = session.state;
  for (const { userId, player } of session.participants.values()) {
    const hero = st.party.find((m) => m && m.kind === "hero" && m.controllerUserId === userId);
    if (hero && player) {
      player.hp = Math.max(0, hero.hp);
    }
  }
  const hostHero = st.party.find(
    (m) => m && m.kind === "hero" && m.controllerUserId === session.hostUserId
  );
  if (hostHero) {
    st.playerHp = hostHero.hp;
    st.playerMax = hostHero.maxHp;
  }
}

/** One action per hero turn when multiple human players share a fight. */
export function markCoopHeroActedIfNeeded(member, session) {
  if (!session?.coop || !coopHeroTurnsOnly(session)) return;
  if (member?.kind === "hero") member.acted = true;
}

export function finishCoopVictory(session, rng) {
  const st = session.state;
  st.phase = "ended";
  st.endOutcome = "victory";
  syncAllHeroHpToPlayers(session);

  const participantResults = {};
  for (const [userId, part] of session.participants.entries()) {
    const subset = st.party.filter((m) => m && m.controllerUserId === userId);
    const rollSeed =
      ((Math.floor(rng.next() * 0xffffffff) ^ (Number(userId) * 2654435761)) >>> 0) || 1;
    const rollRng = createCombatRng(rollSeed);
    const rewards = computeVictoryRewards(st.foes, subset, part.player, rollRng, st.worldMapContext);
    const result = {
      victory: true,
      finalPlayerHp: Math.max(0, part.player.hp),
      gold: rewards.gold,
      xp: rewards.xp,
      items: rewards.items,
      memberRewards: rewards.memberRewards
    };
    applyRewardsToPlayer(part.player, result);
    participantResults[userId] = result;
  }
  return { participantResults, state: cloneState(st), finished: true };
}

/** Human hero slots in party (one per co-op player). */
export function countCoopHumanHeroes(st) {
  return (st.party || []).filter(
    (m) => m && m.kind === "hero" && m.controllerUserId != null
  ).length;
}

/** Companions always take manual turns in co-op. */
export function coopHeroTurnsOnly(_session) {
  return false;
}

export function markCompanionsSkippedForCoopHeroTurns(st, session) {
  if (!coopHeroTurnsOnly(session)) return;
  (st.party || []).forEach((m) => {
    if (m?.kind === "companion") m.acted = true;
  });
}

export function eligibleActingMembers(session, st) {
  const heroesOnly = coopHeroTurnsOnly(session);
  return (st.party || []).filter((m) => {
    if (!m || m.hp <= 0 || m.acted) return false;
    if (heroesOnly && m.kind !== "hero") return false;
    return true;
  });
}

export function findNextActingMember(session, st) {
  return eligibleActingMembers(session, st)[0] || null;
}

export function firstActingMember(session, st) {
  return findNextActingMember(session, st);
}

export function ensureActivePartyUidInState(st, session = null) {
  if (!st || !Array.isArray(st.party)) return;
  const elig = session ? eligibleActingMembers(session, st) : st.party.filter((m) => m && m.hp > 0 && !m.acted);
  if (!elig.length) {
    st.activePartyUid = null;
    return;
  }
  if (st.activePartyUid == null || !elig.some((m) => m.uid === st.activePartyUid)) {
    st.activePartyUid = elig[0].uid;
    st.selectedAllyUid = elig[0].uid;
  }
}

function buildCoopLeaveResult(session, userId) {
  const st = session.state;
  const part = session.participants.get(userId);
  if (!part?.player) return null;
  const hero = (st.party || []).find(
    (m) => m && m.kind === "hero" && m.controllerUserId === userId
  );
  const hp = hero ? Math.max(1, Math.floor(hero.hp)) : Math.max(1, part.player.hp || 1);
  part.player.hp = hp;
  return {
    victory: false,
    leftFight: true,
    finalPlayerHp: hp,
    gold: 0,
    xp: 0,
    items: [],
    memberRewards: []
  };
}

/**
 * One participant leaves without ending the fight for everyone else.
 * Fight ends only when no fighters remain, all allies are down, or everyone has left.
 */
export function leaveCoopParticipant(session, userId) {
  const st = session.state;
  const part = session.participants.get(userId);
  if (!part) {
    return { state: cloneState(st), finished: false };
  }
  const name = part.player?.name || "A fighter";
  const leaveResult = buildCoopLeaveResult(session, userId);
  const leaverPlayer = part.player;
  const leaverSlotIndex = part.slotIndex;

  session.participants.delete(userId);
  st.party = (st.party || []).filter((m) => m && m.controllerUserId !== userId);
  st.fightLog.push(`— ${name} left the fight —`);

  let hostTransferred = null;
  if (userId === session.hostUserId) {
    if (session.participants.size > 0) {
      const newHost = session.participants.keys().next().value;
      hostTransferred = { from: userId, to: newHost };
      session.hostUserId = newHost;
      st.hostUserId = newHost;
    }
  }

  if (!st.foes.some((f) => f && f.hp > 0)) {
    return { ...finishCoopVictory(session, session.rng), hostTransferred };
  }

  if (session.participants.size === 0) {
    st.phase = "ended";
    st.endOutcome = "abandoned";
    return {
      state: cloneState(st),
      finished: true,
      abandoned: true,
      result: leaveResult,
      leaverPlayer,
      leaverSlotIndex,
      hostTransferred
    };
  }

  if (!st.party.some((m) => m && m.hp > 0)) {
    const out = finishCoopDefeat(session);
    return { ...out, hostTransferred };
  }

  if (st.phase === "player") {
    ensureActivePartyUidInState(st, session);
  }

  return {
    state: cloneState(st),
    finished: true,
    left: true,
    result: leaveResult,
    leaverPlayer,
    leaverSlotIndex,
    hostTransferred
  };
}

export function finishCoopDefeat(session) {
  const st = session.state;
  st.phase = "ended";
  st.endOutcome = "defeat";
  syncAllHeroHpToPlayers(session);

  const participantResults = {};
  for (const [userId, part] of session.participants.entries()) {
    const hero = st.party.find((m) => m && m.kind === "hero" && m.controllerUserId === userId);
    const hp = hero ? Math.max(1, hero.hp) : 1;
    if (part.player) part.player.hp = hp;
    const result = {
      victory: false,
      finalPlayerHp: hp,
      gold: 0,
      xp: 0,
      items: [],
      memberRewards: []
    };
    applyRewardsToPlayer(part.player, result);
    participantResults[userId] = result;
  }
  return { participantResults, state: cloneState(st), finished: true };
}

export function allParticipantsReady(session) {
  if (!session?.participants?.size) return false;
  for (const part of session.participants.values()) {
    if (!part?.ready) return false;
  }
  return true;
}

export function publicParticipantsList(session) {
  const list = [];
  for (const p of session.participants.values()) {
    list.push({
      userId: p.userId,
      name: p.player?.name || "Hero",
      slotIndex: p.slotIndex,
      ready: !!p.ready
    });
  }
  return list;
}

export function sameTileForJoin(session, joinerUserId) {
  const wmc = session.state?.worldMapContext;
  if (!wmc || typeof wmc !== "object") return true;
  const entry = byUserId.get(joinerUserId);
  if (!entry) return false;
  if (entry.page !== "adventure") return false;
  return presenceMatchesWorldMapContext(entry, wmc);
}
