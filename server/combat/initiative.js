/**
 * Fight-start initiative (computed once) and turn-order setup.
 */

import { createRequire } from "node:module";
import { totalStat, sumEquippedBonusStats } from "./formulas.js";
import { getCombatPassiveBonuses } from "./passives.js";
import { getActorCombatMaxStamina, getCombatStaminaBaseMax } from "./stamina.js";
import { getPlayerForMember } from "./coop.js";
import { initTurnOrder } from "./turn_order.js";

const require = createRequire(import.meta.url);
const CombatInitiative = require("../../shared/initiative.js");

function attribBonusPer10(val) {
  return Math.floor(Math.max(0, Number(val) || 0) / 10);
}

function formulaDexCritChancePct(dex) {
  return Math.min(50, Math.max(0, Math.floor((Number(dex) || 0) * 0.35)));
}

function formulaDexEvasionPct(dex) {
  return attribBonusPer10(dex);
}

function formulaStrPhysicalDamageBonusPct(str) {
  return Math.max(0, Math.floor((Number(str) || 0) * 0.8));
}

function formulaIntSkillPowerBonusPct(int_) {
  return attribBonusPer10(int_);
}

function formulaStrPhysicalResistPct(str) {
  return attribBonusPer10(str);
}

function formulaIntMagicResistPct(int_) {
  return attribBonusPer10(int_);
}

function formulaVitHealingReceivedBonusPct(vit) {
  return attribBonusPer10(vit);
}

function statusResistPctFromStrAndVit(str, vit) {
  return Math.floor(Math.max(0, Number(str) || 0) / 10) + Math.floor(Math.max(0, Number(vit) || 0) / 10);
}

function resolveActorForMember(member, session, fallbackPlayer) {
  if (!member) return null;
  const owner = session?.coop ? getPlayerForMember(session, member) : fallbackPlayer;
  if (member.kind === "companion" && Number.isFinite(member.companionSlotIndex)) {
    return owner?.companions?.[member.companionSlotIndex] || null;
  }
  return owner || fallbackPlayer;
}

function buildInitiativeEntryFromActor(actor, member) {
  if (!actor || !member) return null;
  const str = totalStat(actor, "str");
  const dex = totalStat(actor, "dex");
  const vit = totalStat(actor, "vit");
  const int_ = totalStat(actor, "int");
  const gear = sumEquippedBonusStats(actor.equipment);
  const passives = getCombatPassiveBonuses(actor);
  const critPct = formulaDexCritChancePct(dex) + (gear.crit || 0) + (passives.crit || 0);
  const evasionPct = formulaDexEvasionPct(dex) + (gear.evasion || 0) + (passives.evasion || 0);
  const accuracyPct =
    attribBonusPer10(dex) + attribBonusPer10(int_) + (gear.accuracy || 0) + (passives.accuracy || 0);
  const physDmgPct =
    formulaStrPhysicalDamageBonusPct(str) + (gear.physDamage || 0) + (passives.physDamagePct || 0);
  const magicDmgPct =
    formulaIntSkillPowerBonusPct(int_) + (gear.skillPower || 0) + (passives.magicDamagePct || 0);
  const physResPct = formulaStrPhysicalResistPct(str) + (gear.physicalResist || 0);
  const magicResPct = formulaIntMagicResistPct(int_) + (gear.magicResist || 0);
  const healingPct =
    formulaVitHealingReceivedBonusPct(vit) + (gear.healingReceived || 0) + (passives.healingPct || 0);
  const statusResistPct = statusResistPctFromStrAndVit(str, vit) + (gear.statusResist || 0);
  const stamina =
    typeof member.maxStamina === "number" && member.maxStamina > 0
      ? member.maxStamina
      : getActorCombatMaxStamina(actor);
  const hp = typeof member.hp === "number" ? member.hp : typeof actor.hp === "number" ? actor.hp : 0;
  const initiative = CombatInitiative.computeInitiativeScore({
    str,
    dex,
    vit,
    int: int_,
    hp,
    critPct,
    evasionPct,
    accuracyPct,
    physDmgPct,
    magicDmgPct,
    physResPct,
    magicResPct,
    healingPct,
    statusResistPct,
    stamina
  });
  return { initiative, dex, accuracyPct, stamina };
}

function buildInitiativeEntryFromFoe(foe) {
  if (!foe) return null;
  const str = typeof foe.str === "number" ? foe.str : 10;
  const dex = typeof foe.dex === "number" ? foe.dex : 10;
  const vit = typeof foe.vit === "number" ? foe.vit : 10;
  const int_ = typeof foe.int === "number" ? foe.int : 10;
  const hp = typeof foe.hp === "number" ? foe.hp : 0;
  const critPct = formulaDexCritChancePct(dex);
  const evasionPct = formulaDexEvasionPct(dex);
  const accuracyPct = attribBonusPer10(dex) + attribBonusPer10(int_);
  const physDmgPct = formulaStrPhysicalDamageBonusPct(str);
  const magicDmgPct = formulaIntSkillPowerBonusPct(int_);
  const physResPct = formulaStrPhysicalResistPct(str);
  const magicResPct = formulaIntMagicResistPct(int_);
  const healingPct = formulaVitHealingReceivedBonusPct(vit);
  const statusResistPct = statusResistPctFromStrAndVit(str, vit);
  const stamina = getCombatStaminaBaseMax();
  const initiative = CombatInitiative.computeInitiativeScore({
    str,
    dex,
    vit,
    int: int_,
    hp,
    critPct,
    evasionPct,
    accuracyPct,
    physDmgPct,
    magicDmgPct,
    physResPct,
    magicResPct,
    healingPct,
    statusResistPct,
    stamina
  });
  return { initiative, dex, accuracyPct, stamina };
}

/**
 * Compute initiative once at fight start and store fixed turn order for all rounds.
 * @param {object} st
 * @param {{ session?: object, player?: object, rng?: object }} ctx
 */
export function setupFightTurnOrder(st, ctx = {}) {
  const session = ctx.session || null;
  const player = ctx.player || session?.player || null;
  const rng = ctx.rng || session?.rng || null;

  const allyEntries = (st.party || [])
    .filter((m) => m && m.hp > 0)
    .map((member) => {
      const actor = resolveActorForMember(member, session, player);
      const stats = buildInitiativeEntryFromActor(actor, member);
      if (!stats) return null;
      return { uid: member.uid, ...stats };
    })
    .filter(Boolean);

  const foeEntries = (st.foes || [])
    .filter((f) => f && f.hp > 0)
    .map((foe) => {
      const stats = buildInitiativeEntryFromFoe(foe);
      if (!stats) return null;
      return { uid: foe.uid, ...stats };
    })
    .filter(Boolean);

  const sortedAllies = CombatInitiative.sortInitiativeEntries(allyEntries, rng);
  const sortedFoes = CombatInitiative.sortInitiativeEntries(foeEntries, rng);

  st.turnOrderAllies = sortedAllies.map((e) => e.uid);
  st.turnOrderFoes = sortedFoes.map((e) => e.uid);
  const topAlly = sortedAllies[0]?.initiative ?? -Infinity;
  const topFoe = sortedFoes[0]?.initiative ?? -Infinity;
  st.alliesStartFirst = topAlly >= topFoe;

  sortedAllies.forEach((e) => {
    const m = (st.party || []).find((x) => x && x.uid === e.uid);
    if (m) m.initiative = e.initiative;
  });
  sortedFoes.forEach((e) => {
    const f = (st.foes || []).find((x) => x && x.uid === e.uid);
    if (f) f.initiative = e.initiative;
  });

  initTurnOrder(st);
}
