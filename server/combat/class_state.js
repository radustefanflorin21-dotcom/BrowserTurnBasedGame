/** Class combat buffs / shield state for online fights. */

import { getActorDamage } from "./formulas.js";

export function ensureClassState(st) {

  if (!st.classState || typeof st.classState !== "object") {

    st.classState = {

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
      flowStepTurns: 0,
      smokeEva: 0,
      smokeTurns: 0,
      braceTurns: 0,
      braceReductionPct: 0,
      fortressTurns: 0,
      fortressReductionPct: 0,
      fortressDamagePenaltyPct: 0,
      lastBastionTurns: 0,
      lastBastionLowHpReductionPct: 0,
      lastBastionHighHpReductionPct: 0,
      lastBastionHealingReceivedBonusPct: 0,
      lastBastionDamagePenaltyPct: 0,
      riposteTurns: 0,
      flowStateTurns: 0,
      exposeWeaknessTurns: 0,
      manaSurgeTurns: 0,
      focusFireTurns: 0,
      rageTurns: 0,
      guardAllyTurns: 0,
      revitalizeTurns: 0,
      catalystReadyTurns: 0,
      unbrokenStacks: 0,
      unbrokenStackTurns: 0,
      unbrokenPhysResPerStack: 0,
      unbrokenMagResPerStack: 0,
      unbrokenStatusResPerStack: 0,
      secondBreathUsed: false,
      plagueStacks: 0,
      killMomentumPhysPct: 0,
      killMomentumPendingPct: 0
    };

  }

  const cs = st.classState;

  if (typeof cs.divineAegisShield !== "number") cs.divineAegisShield = 0;

  if (!cs.skillCooldowns || typeof cs.skillCooldowns !== "object") cs.skillCooldowns = {};

  return cs;

}



export function absorbDamageWithShield(st, rawDamage) {

  const cs = ensureClassState(st);

  let taken = Math.max(0, Math.floor(rawDamage));

  let blocked = 0;

  if (cs.divineAegisShield > 0 && taken > 0) {

    blocked = Math.min(cs.divineAegisShield, taken);

    cs.divineAegisShield -= blocked;

    taken -= blocked;

  }

  const log = blocked > 0 ? `Ward absorbs ${blocked} damage.` : null;

  return { damage: taken, blocked, log };

}



export function addDivineAegisShield(st, amount) {

  const cs = ensureClassState(st);

  const add = Math.max(0, Math.floor(amount));

  cs.divineAegisShield = Math.max(cs.divineAegisShield || 0, add);

  return cs.divineAegisShield;

}



export function applySpellPreparation(st, row) {

  const cs = ensureClassState(st);

  const self = row?.self || {};

  cs.spellPrepCharges = Math.max(cs.spellPrepCharges || 0, Math.max(1, Math.floor(self.nextMagical || 1)));

  cs.spellPrepMagPct = Math.max(cs.spellPrepMagPct || 0, self.magDmg || 0);

  cs.spellPrepMaxTurns = Math.max(cs.spellPrepMaxTurns || 0, Math.max(1, Math.floor(self.maxTurns || 2)));

  cs.spellPrepAgeTurns = 0;

}



export function applyOverload(st, row) {

  const cs = ensureClassState(st);

  const self = row?.self || {};

  cs.overloadMagPct = Math.max(cs.overloadMagPct || 0, self.magDmg || 0);

  cs.overloadAcc = Math.max(cs.overloadAcc || 0, self.acc || 0);

  cs.overloadTurns = Math.max(cs.overloadTurns || 0, Math.max(1, Math.floor(self.turns || 2)));

}



export function applyBloodPrice(st, member, row) {

  const cs = ensureClassState(st);

  const self = row?.self || {};

  const pct = typeof self.hpCostPct === "number" ? self.hpCostPct : 8;

  if (member && member.hp > 0) {

    const loss = Math.max(1, Math.floor((member.hp * pct) / 100));

    member.hp = Math.max(1, member.hp - loss);

    if (member.kind === "hero") st.playerHp = member.hp;

  }

  cs.bloodPricePhysPct = Math.max(cs.bloodPricePhysPct || 0, self.physDmg || 0);

  cs.bloodPriceTurns = Math.max(cs.bloodPriceTurns || 0, Math.max(1, Math.floor(self.turns || 2)));

}



export function applySanctuaryParty(st, row) {

  const cs = ensureClassState(st);

  const party = row?.party || {};

  const turns = Math.max(1, Math.floor(party.turns || 2));

  cs.sanctuaryTurns = Math.max(cs.sanctuaryTurns || 0, turns);

  cs.sanctuaryDrPct = Math.max(cs.sanctuaryDrPct || 0, party.dr || 10);

  cs.sanctuarySrPct = Math.max(cs.sanctuarySrPct || 0, party.sr || 0);

}



export function getSanctuaryDamageReductionPct(st) {

  const cs = st?.classState;

  if (!cs || (cs.sanctuaryTurns || 0) <= 0) return 0;

  return Math.max(0, Math.min(40, Number(cs.sanctuaryDrPct) || 14));

}



export function getPlayerOutgoingDamageBonusPct(st, kind) {

  const cs = st?.classState;

  if (!cs) return 0;

  let pct = 0;

  if (kind === "magic") {

    if ((cs.overloadTurns || 0) > 0) pct += Number(cs.overloadMagPct) || 0;

    if ((cs.spellPrepCharges || 0) > 0) pct += Number(cs.spellPrepMagPct) || 0;

  }

  if (kind === "physical" && (cs.bloodPriceTurns || 0) > 0) {

    pct += Number(cs.bloodPricePhysPct) || 0;

  }

  return Math.max(0, Math.min(80, pct));

}



export function getOverloadAccuracyBonus(st) {

  const cs = st?.classState;

  if (!cs || (cs.overloadTurns || 0) <= 0) return 0;

  return Math.max(0, Math.floor(cs.overloadAcc || 0));

}



function clampNumber(min, max, value) {
  return Math.max(min, Math.min(max, value));
}

/** Multiplier on outgoing skill/attack damage from class buffs. */
export function getActorClassOutgoingDamageMult(st, skillName, foe, actor, member) {
  const cs = st?.classState;
  if (!cs) return 1;
  let mult = 1;
  if ((cs.flowStateTurns || 0) > 0) mult *= 1.08;
  if ((cs.focusFireTurns || 0) > 0) mult *= 1.12;
  if ((cs.rageTurns || 0) > 0) mult *= 1.15;
  if ((cs.manaSurgeTurns || 0) > 0) mult *= 1.1;
  if ((cs.fortressTurns || 0) > 0 && (cs.fortressDamagePenaltyPct || 0) > 0) {
    mult *= 1 - cs.fortressDamagePenaltyPct / 100;
  }
  if ((cs.lastBastionTurns || 0) > 0 && (cs.lastBastionDamagePenaltyPct || 0) > 0) {
    mult *= 1 - cs.lastBastionDamagePenaltyPct / 100;
  }
  if ((cs.exposeWeaknessTurns || 0) > 0 && foe?.maxHp > 0 && foe.hp / foe.maxHp <= 0.5) mult *= 1.18;
  if ((cs.killMomentumPhysPct || 0) > 0) mult *= 1 + cs.killMomentumPhysPct / 100;
  const memberMax = member?.maxHp > 0 ? member.maxHp : 0;
  const memberHp = member?.hp > 0 ? member.hp : 0;
  if (actor?.classId === "reaver" && memberMax > 0 && memberHp / memberMax <= 0.5) mult *= 1.12;
  if (skillName === "Execution" && foe?.maxHp > 0 && foe.hp / foe.maxHp <= 0.35) mult *= 1.38;
  if (skillName === "Execution Rush" && foe?.maxHp > 0 && foe.hp / foe.maxHp <= 0.4) mult *= 1.3;
  return mult;
}

/** Extra % damage reduction from class defensive buffs (hero). */
export function getClassBuffDamageReductionPct(st, member, actor) {
  const cs = st?.classState;
  if (!cs || member?.kind !== "hero" || !actor) return 0;
  let pct = 0;
  const vit = typeof actor.vit === "number" ? actor.vit : 10;
  const flatVit = clampNumber(0, 12, Math.max(0, Math.floor(vit / 50)));
  if ((cs.braceTurns || 0) > 0 && (cs.braceReductionPct || 0) > 0) pct += cs.braceReductionPct;
  if ((cs.fortressTurns || 0) > 0 && (cs.fortressReductionPct || 0) > 0) pct += cs.fortressReductionPct;
  if ((cs.lastBastionTurns || 0) > 0) {
    const hpFrac = member.maxHp > 0 ? member.hp / member.maxHp : 1;
    const red =
      hpFrac <= 0.4 ? cs.lastBastionLowHpReductionPct || 0 : cs.lastBastionHighHpReductionPct || 0;
    pct += red;
  }
  if ((cs.guardAllyTurns || 0) > 0) pct += 12;
  if (flatVit > 0) pct += Math.min(8, flatVit);
  if ((cs.unbrokenStackTurns || 0) > 0 && (cs.unbrokenStacks || 0) > 0) {
    pct += Math.min(20, (cs.unbrokenStacks || 0) * (cs.unbrokenPhysResPerStack || 2));
  }
  return Math.max(0, Math.min(60, pct));
}

/** Apply vanguard-style flat DR before shield/absorb. */
export function applyHeroIncomingDamageModifiers(st, member, actor, raw) {
  let rawD = Math.max(1, Math.floor(raw));
  if (member?.kind !== "hero" || !actor) return rawD;
  const vit = typeof actor.vit === "number" ? actor.vit : 10;
  const flat = clampNumber(0, 12, Math.max(0, Math.floor(vit / 50)));
  rawD = Math.max(1, rawD - flat);
  const dr = getClassBuffDamageReductionPct(st, member, actor);
  if (dr > 0) rawD = Math.max(1, Math.floor(rawD * (1 - dr / 100)));
  return rawD;
}

/** Riposte counter after hero takes damage. */
export function tryRiposteAfterHit(st, foe, member, actor) {
  const cs = st?.classState;
  if (!cs || (cs.riposteTurns || 0) <= 0 || member?.kind !== "hero" || !foe || foe.hp <= 0) {
    return null;
  }
  cs.riposteTurns = 0;
  const rip = Math.max(1, Math.floor(getActorDamage(actor) * 0.4));
  foe.hp = Math.max(0, foe.hp - rip);
  return { damage: rip, log: `Riposte deals ${rip} counter damage to ${foe.name}.` };
}

/** @returns {number} extra stamina cost from Overload etc. */

export function getPlayerStaminaCostPenalty(st) {

  if (!st?.status) return 0;

  if ((st.status.playerStaminaCostUpTurns || 0) <= 0) return 0;

  return 1;

}



export function applyOverloadStaminaTax(st, turns) {

  if (!st.status || typeof st.status !== "object") {

    st.status = {};

  }

  st.status.playerStaminaCostUpTurns = Math.max(st.status.playerStaminaCostUpTurns || 0, Math.max(1, turns));

}



export function resolveSkillStaminaCost(st, def) {

  let cost = typeof def.stamina === "number" ? Math.max(0, Math.floor(def.stamina)) : 2;

  cost += getPlayerStaminaCostPenalty(st);

  if (def.damageKind === "magic") {

    const cs = ensureClassState(st);

    if ((cs.spellPrepCharges || 0) > 0) cost = Math.max(2, cost - 1);

  }

  return cost;

}



export function consumeSpellPrepOnMagicalSkill(st, def) {

  if (def?.damageKind !== "magic") return;

  const cs = ensureClassState(st);

  if ((cs.spellPrepCharges || 0) <= 0) return;

  cs.spellPrepCharges -= 1;

  if (cs.spellPrepCharges <= 0) {

    cs.spellPrepMagPct = 0;

    cs.spellPrepAgeTurns = 0;

  }

}



export function applyRegrowth(st, member, regenVitPct, turns) {
  const cs = ensureClassState(st);
  const vit = typeof member?.maxHp === "number" ? member.maxHp : 100;
  const amt = Math.max(1, Math.floor((Number(regenVitPct) || 0.2) * vit * 0.1));
  cs.regenTurns = Math.max(cs.regenTurns || 0, Math.max(1, Math.floor(turns || 3)));
  cs.regenAmt = Math.max(cs.regenAmt || 0, amt);
  cs.regenTargetUid = member && typeof member.uid === "number" ? member.uid : null;
}

export function tickRegrowthAtPlayerTurnStart(st) {
  const cs = st?.classState;
  if (!cs || (cs.regenTurns || 0) <= 0 || (cs.regenAmt || 0) <= 0) return null;
  let m = null;
  if (cs.regenTargetUid != null) {
    m = (st.party || []).find((x) => x && x.uid === cs.regenTargetUid && x.hp > 0);
  } else {
    m = (st.party || []).find((x) => x && x.kind === "hero" && x.hp > 0);
  }
  if (!m) {
    cs.regenTurns = 0;
    cs.regenAmt = 0;
    cs.regenTargetUid = null;
    return null;
  }
  const isClassRegen = cs.regenTargetUid == null;
  const before = m.hp;
  m.hp = Math.min(m.maxHp, m.hp + cs.regenAmt);
  if (m.kind === "hero") st.playerHp = m.hp;
  cs.regenTurns -= 1;
  if (cs.regenTurns <= 0) {
    cs.regenTurns = 0;
    cs.regenAmt = 0;
    if (isClassRegen) cs.regenTargetUid = null;
  }
  return {
    memberUid: m.uid,
    amount: m.hp - before,
    source: isClassRegen ? "regeneration" : "regrowth"
  };
}

export function tickClassStateEndOfRound(st) {

  const cs = ensureClassState(st);

  const decTurns = (key, ...clearKeys) => {

    if ((cs[key] || 0) <= 0) return;

    cs[key] -= 1;

    if (cs[key] <= 0) {

      cs[key] = 0;

      clearKeys.forEach((k) => {

        if (k) cs[k] = 0;

      });

    }

  };

  decTurns("overloadTurns", "overloadMagPct", "overloadAcc");

  decTurns("bloodPriceTurns", "bloodPricePhysPct");

  decTurns("sanctuaryTurns", "sanctuaryDrPct", "sanctuarySrPct");
  decTurns("flowStepTurns", "flowStepEva", "flowStepAcc");
  decTurns("smokeTurns", "smokeEva");
  decTurns("fortressTurns", "fortressReductionPct", "fortressDamagePenaltyPct");
  decTurns("lastBastionTurns", "lastBastionLowHpReductionPct", "lastBastionHighHpReductionPct", "lastBastionHealingReceivedBonusPct", "lastBastionDamagePenaltyPct");
  decTurns("flowStateTurns");
  decTurns("exposeWeaknessTurns");
  decTurns("manaSurgeTurns");
  decTurns("focusFireTurns");
  decTurns("rageTurns");
  decTurns("guardAllyTurns");
  decTurns("revitalizeTurns");
  decTurns("catalystReadyTurns");



  if ((cs.spellPrepCharges || 0) > 0) {

    cs.spellPrepAgeTurns = (cs.spellPrepAgeTurns || 0) + 1;

    if (cs.spellPrepAgeTurns >= (cs.spellPrepMaxTurns || 2)) {

      cs.spellPrepCharges = 0;

      cs.spellPrepMagPct = 0;

      cs.spellPrepAgeTurns = 0;

    }

  }



  if (st.status && (st.status.playerStaminaCostUpTurns || 0) > 0) {

    st.status.playerStaminaCostUpTurns -= 1;

  }

}


