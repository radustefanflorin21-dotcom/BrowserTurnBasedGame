import { totalStat } from "./formulas.js";
import {
  getSanctuaryDamageReductionPct,
  tickClassStateEndOfRound,
  tickRegrowthAtPlayerTurnStart
} from "./class_state.js";
import { getCombatPassiveBonuses } from "./passives.js";
import {
  getFlowSmokeEvasionPct,
  getPlagueEnginePoisonBonus,
  incrementPlagueStacks,
  tickUnbrokenStacks
} from "./combat_passives.js";

const CAPS = { accuracyDown: 40, damageDown: 35 };

export function ensureCombatStatus(st) {
  if (!st.status || typeof st.status !== "object") {
    st.status = {
      playerBleed: null,
      playerPoison: null,
      playerBurn: null,
      playerAccuracyDownPct: 0,
      playerAccuracyDownTurns: 0,
      playerOutgoingAccuracyDownPct: 0,
      playerOutgoingAccuracyDownTurns: 0,
      playerCrippleTurns: 0,
      playerPhysDamageDownPct: 0,
      playerPhysDamageDownTurns: 0,
      playerMagicDamageDownPct: 0,
      playerMagicDamageDownTurns: 0,
      playerDamageReductionPct: 0,
      playerDamageReductionTurns: 0,
      playerFragileTurns: 0,
      playerEvasionUpPct: 0,
      playerEvasionUpTurns: 0,
      playerStaminaCostUpTurns: 0
    };
  }
}

function heroMember(st) {
  return (st.party || []).find((m) => m?.kind === "hero") || null;
}

function heroActorFromPlayer(st, player) {
  return player;
}

function formulaVitDotReductionPct(vit) {
  return Math.min(45, Math.max(0, Math.floor((Number(vit) || 0) * 0.8)));
}

export function getPlayerAccuracyPenaltyPct(st) {
  ensureCombatStatus(st);
  const s = st.status;
  if ((s.playerAccuracyDownTurns || 0) <= 0) return 0;
  return Math.max(0, Math.min(CAPS.accuracyDown, Number(s.playerAccuracyDownPct) || 0));
}

export function getPlayerDamageDownPct(st, kind) {
  ensureCombatStatus(st);
  const s = st.status;
  if (kind === "magic") {
    if ((s.playerMagicDamageDownTurns || 0) <= 0) return 0;
    return Math.max(0, Math.min(CAPS.damageDown, Number(s.playerMagicDamageDownPct) || 0));
  }
  if ((s.playerPhysDamageDownTurns || 0) <= 0) return 0;
  return Math.max(0, Math.min(CAPS.damageDown, Number(s.playerPhysDamageDownPct) || 0));
}

export function getPlayerDamageReductionPct(st) {
  ensureCombatStatus(st);
  const s = st.status;
  let dr = 0;
  if ((s.playerDamageReductionTurns || 0) > 0) {
    dr = Math.max(0, Math.min(50, Number(s.playerDamageReductionPct) || 0));
  }
  dr += getSanctuaryDamageReductionPct(st);
  return Math.max(0, Math.min(50, dr));
}

export function getFoePhysResist(foe) {
  let res = typeof foe.physResist === "number" ? foe.physResist : 0;
  const c = foe.combat;
  if (c && (c.physResDownTurns || 0) > 0) res = Math.max(0, res - (c.physResDownPct || 0));
  if (c && (c.bothResDownTurns || 0) > 0) res = Math.max(0, res - (c.bothResDownPct || 0));
  return res;
}

export function getFoeMagicResist(foe) {
  let res = typeof foe.magicResist === "number" ? foe.magicResist : 0;
  const c = foe.combat;
  if (c && (c.magResDownTurns || 0) > 0) res = Math.max(0, res - (c.magResDownPct || 0));
  if (c && (c.bothResDownTurns || 0) > 0) res = Math.max(0, res - (c.bothResDownPct || 0));
  return res;
}

export function getFoeEvasionPenalty(foe) {
  const c = foe.combat;
  if (!c) return 0;
  let p = 0;
  if ((c.evaDownTurns || 0) > 0) p += c.evasionDownPct || 0;
  if ((c.blindTurns || 0) > 0) p += c.blindAccDownPct || 0;
  return p;
}

function ensureFoeCombat(foe) {
  if (!foe.combat) foe.combat = { skillCd: {} };
}

function debuffLandPct(actor, foe, baseChance) {
  const dex = totalStat(actor, "dex");
  const int = totalStat(actor, "int");
  const pass = getCombatPassiveBonuses(actor);
  const acc = Math.floor(dex / 10) + Math.floor(int / 10) + (pass.debuffAccuracy || 0);
  const sr = Math.floor((foe.int || 0) / 12);
  return Math.min(100, Math.max(0, baseChance + acc - sr));
}

/** @returns {string|null} log line if applied */
export function tryRollFoeDebuff(st, foe, deb, actor, rng) {
  if (!deb || typeof deb.chance !== "number") return null;
  if (!rng.chance(debuffLandPct(actor, foe, deb.chance))) return null;
  ensureFoeCombat(foe);
  const c = foe.combat;
  const t = Math.max(1, Math.floor(deb.turns || 1));
  const name = foe.name;

  switch (deb.type) {
    case "physDmgDown":
      c.physDmgDownTurns = Math.max(c.physDmgDownTurns || 0, t);
      c.physDmgDownPct = Math.max(c.physDmgDownPct || 0, deb.value || 0);
      return `${name} suffers reduced physical damage output.`;
    case "magDmgDown":
      c.magDmgDownTurns = Math.max(c.magDmgDownTurns || 0, t);
      c.magDmgDownPct = Math.max(c.magDmgDownPct || 0, deb.value || 0);
      return `${name}'s magic damage is suppressed.`;
    case "physResDown":
      c.physResDownTurns = Math.max(c.physResDownTurns || 0, t);
      c.physResDownPct = Math.max(c.physResDownPct || 0, deb.value || 0);
      return `${name}'s physical resist is lowered.`;
    case "magResDown":
      c.magResDownTurns = Math.max(c.magResDownTurns || 0, t);
      c.magResDownPct = Math.max(c.magResDownPct || 0, deb.value || 0);
      return `${name}'s magic resist is lowered.`;
    case "bothResDown":
      c.bothResDownTurns = Math.max(c.bothResDownTurns || 0, t);
      c.bothResDownPct = Math.max(c.bothResDownPct || 0, deb.value || 0);
      return `${name}'s resistances are shattered.`;
    case "evaDown":
      c.evaDownTurns = Math.max(c.evaDownTurns || 0, t);
      c.evasionDownPct = Math.max(c.evasionDownPct || 0, deb.value || 0);
      return `${name}'s evasion drops.`;
    case "blind":
      c.blindTurns = Math.max(c.blindTurns || 0, t);
      c.blindAccDownPct = Math.max(c.blindAccDownPct || 0, deb.accDown || 0);
      return `${name} is blinded.`;
    case "stun":
      c.staggerLockedTurns = Math.max(c.staggerLockedTurns || 0, t);
      return `${name} is stunned!`;
    case "playerTaunt":
      c.tauntedByVanguardTurns = Math.max(c.tauntedByVanguardTurns || 0, t);
      c.tauntedByVanguardDamageDownPct = Math.max(
        c.tauntedByVanguardDamageDownPct || 0,
        deb.enemyDmgDownPct || 0
      );
      if (actor && typeof actor.uid === "number") {
        c.tauntedByVanguardTargetUid = actor.uid;
      }
      return `${name} is taunted.`;
    case "allyPressure":
      c.allyPressureTurns = Math.max(c.allyPressureTurns || 0, t);
      c.allyPressurePct = Math.max(c.allyPressurePct || 0, deb.value || 0);
      return `${name} is pressured and hits harder.`;
    case "cripple":
      c.staggerSkillTaxTurns = Math.max(c.staggerSkillTaxTurns || 0, t);
      return `${name} is crippled (skills cost +1 stamina).`;
    case "bothDmgDown":
      c.physDmgDownTurns = Math.max(c.physDmgDownTurns || 0, t);
      c.physDmgDownPct = Math.max(c.physDmgDownPct || 0, deb.value || 0);
      c.magDmgDownTurns = Math.max(c.magDmgDownTurns || 0, t);
      c.magDmgDownPct = Math.max(c.magDmgDownPct || 0, deb.value || 0);
      return `${name}'s damage is suppressed.`;
    case "statusResDown":
      c.statusResDownTurns = Math.max(c.statusResDownTurns || 0, t);
      c.statusResDownPct = Math.max(c.statusResDownPct || 0, deb.value || 0);
      return `${name}'s status resist is lowered.`;
    case "bleed":
    case "burn":
    case "poisonDot": {
      const dotKey = deb.type === "burn" ? "burn" : deb.type === "poisonDot" ? "poison" : "bleed";
      const turnsKey = `${dotKey}Turns`;
      const dmgKey = `${dotKey}Damage`;
      c[turnsKey] = Math.max(c[turnsKey] || 0, t);
      const pass = getCombatPassiveBonuses(actor);
      const dotMult = 1 + (pass.dotDamagePct || 0) / 100;
      let tick = Math.max(1, Math.floor(((deb.dotPct || 10) * (foe.maxHp || 100)) / 1000) * dotMult);
      if (dotKey === "poison" && st) {
        incrementPlagueStacks(st, actor);
        tick += getPlagueEnginePoisonBonus(st, actor);
      }
      c[dmgKey] = Math.max(c[dmgKey] || 0, tick);
      return `${name} suffers ${dotKey}.`;
    }
    default:
      return null;
  }
}

export function extendPlayerDebuffDurations(st, extraTurns) {
  ensureCombatStatus(st);
  const n = Math.max(1, Math.floor(extraTurns || 1));
  const s = st.status;
  const bump = (key) => {
    if ((s[key] || 0) > 0) s[key] += n;
  };
  bump("playerAccuracyDownTurns");
  bump("playerPhysDamageDownTurns");
  bump("playerMagicDamageDownTurns");
  bump("playerDamageReductionTurns");
  bump("playerEvasionUpTurns");
  bump("playerFragileTurns");
  bump("playerStaminaCostUpTurns");
  if (s.playerBleed?.turns > 0) s.playerBleed.turns += n;
  if (s.playerPoison?.turns > 0) s.playerPoison.turns += n;
  if (s.playerBurn?.turns > 0) s.playerBurn.turns += n;
}

export function applyPlayerAccuracyDown(st, pct, turns) {
  ensureCombatStatus(st);
  st.status.playerAccuracyDownPct = Math.max(
    st.status.playerAccuracyDownPct || 0,
    Math.max(0, Math.min(CAPS.accuracyDown, pct))
  );
  st.status.playerAccuracyDownTurns = Math.max(st.status.playerAccuracyDownTurns || 0, Math.max(1, turns));
}

export function applyPlayerOutgoingAccuracyDown(st, pct, turns) {
  ensureCombatStatus(st);
  st.status.playerOutgoingAccuracyDownPct = Math.max(
    st.status.playerOutgoingAccuracyDownPct || 0,
    Math.max(0, Math.min(CAPS.accuracyDown, pct))
  );
  st.status.playerOutgoingAccuracyDownTurns = Math.max(
    st.status.playerOutgoingAccuracyDownTurns || 0,
    Math.max(1, Math.floor(turns))
  );
}

export function applyPartyMemberBlind(st, member, pct, turns) {
  if (!member) return;
  if (member.kind === "hero") {
    applyPlayerOutgoingAccuracyDown(st, pct, turns);
    return;
  }
  member.outgoingAccuracyDownPct = Math.max(
    member.outgoingAccuracyDownPct || 0,
    Math.max(0, Math.min(CAPS.accuracyDown, pct))
  );
  member.outgoingAccuracyDownTurns = Math.max(member.outgoingAccuracyDownTurns || 0, Math.max(1, Math.floor(turns)));
}

export function applyPartyMemberCripple(st, member, turns) {
  if (!member) return;
  const t = Math.max(1, Math.floor(turns));
  if (member.kind === "hero") {
    ensureCombatStatus(st);
    st.status.playerCrippleTurns = Math.max(st.status.playerCrippleTurns || 0, t);
  }
  member.crippleTurns = Math.max(member.crippleTurns || 0, t);
}

export function applyPlayerBleed(st, dmgPerTurn, turns) {
  ensureCombatStatus(st);
  const prev = st.status.playerBleed;
  st.status.playerBleed = {
    dmg: Math.max(prev?.dmg || 0, Math.max(1, Math.floor(dmgPerTurn))),
    turns: Math.max(prev?.turns || 0, Math.max(1, turns))
  };
}

export function applyPlayerPoison(st, dmgPerTurn, turns) {
  ensureCombatStatus(st);
  const prev = st.status.playerPoison;
  st.status.playerPoison = {
    dmg: Math.max(prev?.dmg || 0, Math.max(1, Math.floor(dmgPerTurn))),
    turns: Math.max(prev?.turns || 0, Math.max(1, turns))
  };
}

export function applyPlayerBurn(st, dmgPerTurn, turns) {
  ensureCombatStatus(st);
  const prev = st.status.playerBurn;
  st.status.playerBurn = {
    dmg: Math.max(prev?.dmg || 0, Math.max(1, Math.floor(dmgPerTurn))),
    turns: Math.max(prev?.turns || 0, Math.max(1, turns))
  };
}

export function applyPlayerBrace(st, drPct, turns) {
  ensureCombatStatus(st);
  st.status.playerDamageReductionPct = Math.max(st.status.playerDamageReductionPct || 0, drPct);
  st.status.playerDamageReductionTurns = Math.max(
    st.status.playerDamageReductionTurns || 0,
    Math.max(1, Math.floor(turns))
  );
}

/** DoTs when player phase begins. @returns {string[]} log lines */
export function tickEffectsAtStartOfPlayerTurn(st, player, appendLog) {
  ensureCombatStatus(st);
  const s = st.status;
  const hero = heroMember(st);
  const vit = totalStat(heroActorFromPlayer(st, player), "vit");
  const dotRed = formulaVitDotReductionPct(vit) / 100;
  const lines = [];

  const tickDot = (key, label) => {
    const dot = s[key];
    if (!dot || dot.turns <= 0 || dot.dmg <= 0) return;
    const d = Math.max(1, Math.floor(dot.dmg * (1 - dotRed)));
    if (hero) {
      hero.hp = Math.max(0, hero.hp - d);
      st.playerHp = hero.hp;
    }
    lines.push(`${label} deals ${d} damage.`);
    dot.turns -= 1;
    if (dot.turns <= 0) s[key] = null;
  };

  tickDot("playerPoison", "Poison");
  tickDot("playerBleed", "Bleeding");
  tickDot("playerBurn", "Burn");

  const regen = tickRegrowthAtPlayerTurnStart(st);
  if (regen && regen.amount > 0) {
    const label = regen.source === "regeneration" ? "Regeneration" : "Regrowth";
    lines.push(`${label} restores ${regen.amount} HP.`);
  }

  lines.forEach((l) => appendLog(l));
  return lines;
}

/** Debuffs that expire at end of your round (before enemies act). */
export function tickPlayerDebuffsBeforeEnemyPhase(st) {
  tickPartyBuffs(st);
  ensureCombatStatus(st);
  const s = st.status;
  const dec = (turnKey, pctKey) => {
    if ((s[turnKey] || 0) > 0) {
      s[turnKey] -= 1;
      if (s[turnKey] <= 0 && pctKey) s[pctKey] = 0;
    }
  };
  dec("playerAccuracyDownTurns", "playerAccuracyDownPct");
  dec("playerOutgoingAccuracyDownTurns", "playerOutgoingAccuracyDownPct");
  if ((s.playerCrippleTurns || 0) > 0) s.playerCrippleTurns -= 1;
  dec("playerPhysDamageDownTurns", "playerPhysDamageDownPct");
  dec("playerMagicDamageDownTurns", "playerMagicDamageDownPct");
  if ((s.playerFragileTurns || 0) > 0) s.playerFragileTurns -= 1;
  dec("playerEvasionUpTurns", "playerEvasionUpPct");
}

/** Brace / DR lasts through one enemy phase; call after enemies finish acting. */
export function tickPlayerDefenseAfterEnemyPhase(st) {
  ensureCombatStatus(st);
  const s = st.status;
  if ((s.playerDamageReductionTurns || 0) > 0) {
    s.playerDamageReductionTurns -= 1;
    if (s.playerDamageReductionTurns <= 0) s.playerDamageReductionPct = 0;
  }
  tickClassStateEndOfRound(st);
  tickUnbrokenStacks(st);
}

export function tickPlayerTurnEndBuffs(st) {
  (st.party || []).forEach((m) => {
    if (!m) return;
    if (typeof m.crippleTurns === "number" && m.crippleTurns > 0) m.crippleTurns -= 1;
    if (typeof m.outgoingAccuracyDownTurns === "number" && m.outgoingAccuracyDownTurns > 0) {
      m.outgoingAccuracyDownTurns -= 1;
      if (m.outgoingAccuracyDownTurns <= 0) m.outgoingAccuracyDownPct = 0;
    }
  });
  tickPlayerDebuffsBeforeEnemyPhase(st);
}

export function tickFoeDebuffs(st) {
  for (const foe of st.foes || []) {
    if (!foe?.combat) continue;
    const c = foe.combat;
    const dec = (k) => {
      if ((c[k] || 0) > 0) {
        c[k] -= 1;
        if (c[k] <= 0) delete c[k];
      }
    };
    [
      "physResDownTurns",
      "magResDownTurns",
      "bothResDownTurns",
      "physDmgDownTurns",
      "magDmgDownTurns",
      "evaDownTurns",
      "blindTurns",
      "bleedTurns",
      "burnTurns",
      "poisonTurns",
      "staggerLockedTurns",
      "tauntedByVanguardTurns",
      "allyPressureTurns",
      "statusResDownTurns"
    ].forEach(dec);
    if ((c.statusResDownTurns || 0) <= 0) c.statusResDownPct = 0;
    if ((c.allyPressureTurns || 0) <= 0) c.allyPressurePct = 0;
    if ((c.tauntedByVanguardTurns || 0) <= 0) {
      c.tauntedByVanguardDamageDownPct = 0;
      delete c.tauntedByVanguardTargetUid;
    }
  }
}

/** Tick foe DoTs at end of player turn; @returns log lines */
export function tickFoeDots(st, appendLog) {
  const lines = [];
  for (const foe of st.foes || []) {
    if (!foe || foe.hp <= 0 || !foe.combat) continue;
    const c = foe.combat;
    const tickOne = (turnsKey, dmgKey, label) => {
      if ((c[turnsKey] || 0) <= 0 || (c[dmgKey] || 0) <= 0) return;
      const d = Math.max(1, Math.floor(c[dmgKey]));
      foe.hp = Math.max(0, foe.hp - d);
      lines.push(`${label} deals ${d} damage to ${foe.name}.`);
      c[turnsKey] -= 1;
      if (c[turnsKey] <= 0) {
        delete c[turnsKey];
        delete c[dmgKey];
      }
    };
    tickOne("bleedTurns", "bleedDamage", "Bleed");
    tickOne("burnTurns", "burnDamage", "Burn");
    tickOne("poisonTurns", "poisonDamage", "Poison");
  }
  lines.forEach((l) => appendLog(l));
}

export function isFoeStunned(foe) {
  return (foe.combat?.staggerLockedTurns || 0) > 0;
}

export function cleansePlayerDebuffs(st, depth) {
  ensureCombatStatus(st);
  const s = st.status;
  const n = Math.max(1, Math.floor(depth || 1));
  if (n >= 1) {
    s.playerBleed = null;
    s.playerPoison = null;
    s.playerBurn = null;
  }
  if (n >= 2) {
    s.playerAccuracyDownPct = 0;
    s.playerAccuracyDownTurns = 0;
    s.playerPhysDamageDownPct = 0;
    s.playerPhysDamageDownTurns = 0;
    s.playerMagicDamageDownPct = 0;
    s.playerMagicDamageDownTurns = 0;
    s.playerFragileTurns = 0;
  }
}

export function applyEncourageToMember(member, allyRow) {
  if (!member || !allyRow) return;
  const acc = typeof allyRow.acc === "number" ? allyRow.acc : 0;
  const turns = typeof allyRow.turns === "number" ? allyRow.turns : 1;
  member.buffAccPct = Math.max(member.buffAccPct || 0, acc);
  member.buffAccTurns = Math.max(member.buffAccTurns || 0, turns);
}

export function getMemberAccuracyBonus(member) {
  if (!member || (member.buffAccTurns || 0) <= 0) return 0;
  return Math.max(0, Math.floor(member.buffAccPct || 0));
}

export function applyPlayerEvasionUp(st, pct, turns) {
  ensureCombatStatus(st);
  st.status.playerEvasionUpPct = Math.max(st.status.playerEvasionUpPct || 0, Math.max(0, pct));
  st.status.playerEvasionUpTurns = Math.max(st.status.playerEvasionUpTurns || 0, Math.max(1, turns));
}

export function getPlayerEvasionUpPct(st) {
  ensureCombatStatus(st);
  let eva = getFlowSmokeEvasionPct(st);
  if ((st.status.playerEvasionUpTurns || 0) > 0) {
    eva += Math.max(0, Math.min(50, Number(st.status.playerEvasionUpPct) || 0));
  }
  return Math.max(0, Math.min(50, eva));
}

export function applyGuardToAlly(ally, guardianUid, redirectPct, turns) {
  if (!ally) return;
  ally.guardedRedirectPct = Math.max(ally.guardedRedirectPct || 0, redirectPct);
  ally.guardedTurns = Math.max(ally.guardedTurns || 0, Math.max(1, turns));
  ally.guardedByUid = guardianUid;
}

export function getFoeTauntDamageMult(foe) {
  const c = foe?.combat;
  if (!c || (c.tauntedByVanguardTurns || 0) <= 0) return 1;
  const pct = Math.max(0, Math.min(95, Number(c.tauntedByVanguardDamageDownPct) || 0));
  return 1 - pct / 100;
}

export function tickPartyBuffs(st) {
  for (const m of st.party || []) {
    if (!m) continue;
    if ((m.buffAccTurns || 0) > 0) {
      m.buffAccTurns -= 1;
      if (m.buffAccTurns <= 0) {
        m.buffAccTurns = 0;
        m.buffAccPct = 0;
      }
    }
    if ((m.guardedTurns || 0) > 0) {
      m.guardedTurns -= 1;
      if (m.guardedTurns <= 0) {
        m.guardedTurns = 0;
        m.guardedRedirectPct = 0;
        m.guardedByUid = null;
      }
    }
  }
}
