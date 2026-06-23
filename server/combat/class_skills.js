/**
 * Class-only buff skills (not in SKILL_CATALOG) for online combat.
 * Mirrors applyPlayerClassSkillCast in game.js.
 */

import { totalStat, getActorDamage } from "./formulas.js";
import {
  addDivineAegisShield,
  ensureClassState,
  resolveSkillStaminaCost
} from "./class_state.js";
import { cleansePlayerDebuffs } from "./status.js";
import { getCombatPassiveBonuses } from "./passives.js";
import {
  getPlagueEnginePoisonBonus,
  incrementPlagueStacks,
  onDefensiveSkillCast
} from "./combat_passives.js";
import {
  getMemberCombatStamina,
  setMemberCombatStamina,
  isCoopMultiHeroStamina
} from "./stamina.js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const SkillBar = require("../../shared/skill_bar.js");

const CLASS_ONLY_BUFF_SKILLS = new Set([
  "Fortress",
  "Fortress Stance",
  "Last Bastion",
  "Riposte",
  "Flow State",
  "Expose Weakness",
  "Mana Surge",
  "Focus Fire",
  "Rage",
  "Regeneration",
  "Divine Aegis",
  "Revitalize",
  "Catalyst",
  "Purify",
  "Heal"
]);

const DEFAULT_STAMINA = {
  "Fortress Stance": 4,
  "Last Bastion": 5,
  Riposte: 3,
  "Flow State": 3,
  "Expose Weakness": 3,
  "Mana Surge": 3,
  "Focus Fire": 3,
  Rage: 3,
  Regeneration: 3,
  "Divine Aegis": 4,
  Revitalize: 3,
  Catalyst: 3,
  Purify: 3,
  Heal: 3
};

function getSkillCatalog() {
  return typeof global.SKILL_CATALOG === "object" && global.SKILL_CATALOG ? global.SKILL_CATALOG : {};
}

function clampNumber(min, max, value) {
  return Math.max(min, Math.min(max, value));
}

function attribBonusPer10(stat) {
  return Math.floor(Math.max(0, Number(stat) || 0) / 10);
}

function statusResistPctFromStrAndVit(str, vit) {
  return attribBonusPer10(str) + attribBonusPer10(vit);
}

function formulaVitFlatDamageReduction(vit) {
  return Math.floor(Math.max(0, Number(vit) || 0) / 40);
}

function formulaStrStaggerChancePct(str) {
  str = Math.max(0, Number(str) || 0);
  return (20 * str) / (str + 250);
}

function formulaStrArmorPenetrationPct(str) {
  str = Math.max(0, Number(str) || 0);
  return (25 * str) / (str + 180);
}

function getActorSkillLevel(actor, skillName) {
  const map = actor?.classSkillLevels && typeof actor.classSkillLevels === "object" ? actor.classSkillLevels : {};
  const lv = map[skillName];
  return typeof lv === "number" && lv > 0 ? Math.min(5, Math.floor(lv)) : 0;
}

function getSkillBarDeps() {
  const catalog = getSkillCatalog();
  const skillOrder = Array.isArray(global.UNIFIED_SKILL_ORDER)
    ? global.UNIFIED_SKILL_ORDER
    : Object.keys(catalog);
  return { catalog, skillOrder };
}

function isSkillSlotted(actor, skillName) {
  const { catalog, skillOrder } = getSkillBarDeps();
  if (CLASS_ONLY_BUFF_SKILLS.has(skillName)) {
    SkillBar.ensureActorSkillBar(actor, catalog, skillOrder);
    return (actor?.skillBarSlots || []).includes(skillName);
  }
  return SkillBar.isSkillSlottedOnBar(actor, skillName, catalog, skillOrder);
}

function scaleTurns(actor, skillName, base) {
  const lv = getActorSkillLevel(actor, skillName) || 1;
  let bonus = 0;
  if (skillName === "Fortress Stance" && lv >= 4) bonus = 1;
  else if (skillName === "Last Bastion") {
    if (lv >= 5) bonus = 2;
    else if (lv >= 3) bonus = 1;
  } else if (lv >= 5) bonus = 1;
  return Math.max(1, base + bonus);
}

function getCooldownRemaining(st, skillName) {
  const cd = st.skillCooldowns && typeof st.skillCooldowns === "object" ? st.skillCooldowns : {};
  const left = cd[skillName];
  return typeof left === "number" && left > 0 ? left : 0;
}

function setSkillCooldown(st, skillName, turns) {
  if (!st.skillCooldowns) st.skillCooldowns = {};
  if (turns > 0) st.skillCooldowns[skillName] = turns;
}

function getMemberStamina(st, member) {
  return getMemberCombatStamina(st, member);
}

function setMemberStamina(st, member, value) {
  setMemberCombatStamina(st, member, value);
}

function resolveBuffStaminaCost(st, skillName) {
  const cat = getSkillCatalog()[skillName];
  if (cat && typeof cat.stamina === "number") {
    return resolveSkillStaminaCost(st, cat);
  }
  return DEFAULT_STAMINA[skillName] ?? 3;
}

export function isClassOnlyBuffSkill(skillName) {
  return CLASS_ONLY_BUFF_SKILLS.has(skillName) && !getSkillCatalog()[skillName];
}

/**
 * @returns {{ ok: boolean, error?: string, supportLogs?: string[], heals?: Array<{ memberUid: number, amount: number }> }}
 */
export function validateAndResolveClassBuffSkill(st, member, actor, skillName, targetUid, rng) {
  if (!isClassOnlyBuffSkill(skillName)) {
    return { ok: false, error: "Unknown skill." };
  }
  if (!isSkillSlotted(actor, skillName)) {
    return { ok: false, error: "Skill is not on your skill bar." };
  }
  const lv = getActorSkillLevel(actor, skillName);
  if (lv <= 0) return { ok: false, error: "Skill is not learned." };

  const cdLeft = getCooldownRemaining(st, skillName);
  if (cdLeft > 0) {
    return { ok: false, error: `${skillName} is on cooldown (${cdLeft} turn${cdLeft === 1 ? "" : "s"}).` };
  }

  const cost = resolveBuffStaminaCost(st, skillName);
  const stam = getMemberStamina(st, member);
  if (stam < cost) return { ok: false, error: `Not enough stamina (need ${cost}, have ${stam}).` };

  setMemberStamina(st, member, stam - cost);

  const cs = ensureClassState(st);
  const str = totalStat(actor, "str");
  const vit = totalStat(actor, "vit");
  const statusRes = statusResistPctFromStrAndVit(str, vit);
  const healScale = 1 + Math.floor(vit / 80) * 0.05;
  const supportLogs = [];
  const heals = [];

  const key = skillName === "Fortress" ? "Fortress Stance" : skillName;

  switch (key) {
    case "Fortress Stance": {
      const red = clampNumber(22, 38, 18 + statusRes * 0.25 + Math.floor(vit / 90) + lv * 2);
      const turns = scaleTurns(actor, key, 2);
      cs.fortressTurns = Math.max(cs.fortressTurns || 0, turns);
      cs.fortressReductionPct = Math.max(cs.fortressReductionPct || 0, red);
      cs.fortressDamagePenaltyPct = Math.max(cs.fortressDamagePenaltyPct || 0, 10);
      supportLogs.push(
        `${member.name} raises Fortress (−${Math.round(red)}% damage taken, −10% dealt, ${turns}t).`
      );
      const ub = onDefensiveSkillCast(st, actor, key);
      if (ub) supportLogs.push(ub);
      break;
    }
    case "Last Bastion": {
      const bonus = Math.min(10, Math.floor(vit / 120) + lv);
      const low = clampNumber(35, 50, 35 + bonus);
      const high = clampNumber(18, 28, 18 + bonus);
      const turns = scaleTurns(actor, key, 1);
      cs.lastBastionTurns = Math.max(cs.lastBastionTurns || 0, turns);
      cs.lastBastionLowHpReductionPct = Math.max(cs.lastBastionLowHpReductionPct || 0, low);
      cs.lastBastionHighHpReductionPct = Math.max(cs.lastBastionHighHpReductionPct || 0, high);
      cs.lastBastionHealingReceivedBonusPct = Math.max(cs.lastBastionHealingReceivedBonusPct || 0, 10);
      cs.lastBastionDamagePenaltyPct = Math.max(cs.lastBastionDamagePenaltyPct || 0, 15);
      supportLogs.push(`${member.name} enters Last Bastion (${turns}t).`);
      const ubLb = onDefensiveSkillCast(st, actor, key);
      if (ubLb) supportLogs.push(ubLb);
      break;
    }
    case "Riposte": {
      const turns = scaleTurns(actor, key, 1);
      cs.riposteTurns = Math.max(cs.riposteTurns || 0, turns);
      supportLogs.push(`${member.name} primes Riposte (${turns}t).`);
      break;
    }
    case "Flow State": {
      const turns = scaleTurns(actor, key, 2);
      cs.flowStateTurns = Math.max(cs.flowStateTurns || 0, turns);
      supportLogs.push(`${member.name} enters Flow State (+8% damage, ${turns}t).`);
      break;
    }
    case "Expose Weakness": {
      const turns = scaleTurns(actor, key, 2);
      cs.exposeWeaknessTurns = Math.max(cs.exposeWeaknessTurns || 0, turns);
      supportLogs.push(`${member.name} exposes weaknesses (+18% vs foes under 50% HP, ${turns}t).`);
      break;
    }
    case "Mana Surge": {
      const turns = scaleTurns(actor, key, 2);
      cs.manaSurgeTurns = Math.max(cs.manaSurgeTurns || 0, turns);
      supportLogs.push(`${member.name} surges with mana (+10% damage, ${turns}t).`);
      break;
    }
    case "Focus Fire": {
      const turns = scaleTurns(actor, key, 2);
      cs.focusFireTurns = Math.max(cs.focusFireTurns || 0, turns);
      supportLogs.push(`${member.name} focuses fire (+12% damage, ${turns}t).`);
      break;
    }
    case "Rage": {
      const turns = scaleTurns(actor, key, 2);
      cs.rageTurns = Math.max(cs.rageTurns || 0, turns);
      supportLogs.push(`${member.name} rages (+15% damage, ${turns}t).`);
      break;
    }
    case "Regeneration": {
      const turns = scaleTurns(actor, key, 3);
      const amt = Math.max(2, Math.floor((4 + vit * 0.11) * healScale));
      cs.regenTurns = Math.max(cs.regenTurns || 0, turns);
      cs.regenAmt = Math.max(cs.regenAmt || 0, amt);
      cs.regenTargetUid = null;
      supportLogs.push(`${member.name} regenerates (+${amt} HP/start of turn, ${turns}t).`);
      break;
    }
    case "Divine Aegis": {
      const shield = Math.floor((14 + vit * 0.45) * healScale);
      const total = addDivineAegisShield(st, shield);
      supportLogs.push(`${member.name} gains Divine Aegis (${shield} absorb, ${total} total).`);
      break;
    }
    case "Revitalize": {
      const turns = scaleTurns(actor, key, 2);
      cs.revitalizeTurns = Math.max(cs.revitalizeTurns || 0, turns);
      supportLogs.push(`${member.name} revitalizes (+25% healing, ${turns}t).`);
      break;
    }
    case "Catalyst": {
      const turns = scaleTurns(actor, key, 2);
      cs.catalystReadyTurns = Math.max(cs.catalystReadyTurns || 0, turns);
      supportLogs.push(`${member.name} primes Catalyst (${turns}t).`);
      break;
    }
    case "Purify": {
      cleansePlayerDebuffs(st, 99);
      supportLogs.push(`${member.name} purifies harmful effects.`);
      break;
    }
    case "Heal": {
      const pass = getCombatPassiveBonuses(actor);
      const bonus = (cs.revitalizeTurns || 0) > 0 ? 1.25 : 1;
      const heal = Math.max(
        6,
        Math.floor((14 + vit * 0.36) * healScale * bonus * (1 + (pass.healingPct || 0) / 100))
      );
      const before = member.hp;
      member.hp = Math.min(member.maxHp, member.hp + heal);
      if (member.kind === "hero") st.playerHp = member.hp;
      const actual = member.hp - before;
      heals.push({ memberUid: member.uid, amount: actual });
      supportLogs.push(`${member.name} heals for ${actual} HP.`);
      break;
    }
    default:
      return { ok: false, error: "Unknown class skill." };
  }

  setSkillCooldown(st, skillName, 0);
  return { ok: true, supportLogs, heals };
}

function grantStaminaRefund(st, amount, label, member = null) {
  const add = Math.max(0, Math.floor(amount));
  if (add <= 0) return null;
  const maxS =
    member && typeof member.maxStamina === "number"
      ? member.maxStamina
      : typeof st.maxStamina === "number"
        ? st.maxStamina
        : 10;
  const cur =
    member && isCoopMultiHeroStamina(st)
      ? getMemberCombatStamina(st, member)
      : typeof st.stamina === "number"
        ? st.stamina
        : 0;
  const next = Math.min(maxS + add, cur + add);
  if (member && isCoopMultiHeroStamina(st)) {
    setMemberCombatStamina(st, member, next);
  } else {
    st.stamina = next;
  }
  return `${label}: +${add} stamina.`;
}

function applyStagger(foe, turns) {
  if (!foe.combat) foe.combat = {};
  foe.combat.staggerDamageDownTurns = Math.max(foe.combat.staggerDamageDownTurns || 0, turns);
  foe.combat.staggerSkillTaxTurns = Math.max(foe.combat.staggerSkillTaxTurns || 0, 1);
}

/** Post-hit skill effects (stagger, follow-ups, poison stacks). */
export function applyClassSkillOnHit(st, actor, skillName, foe, damage, rng, member = null) {
  if (!skillName || !foe || !rng) return [];
  const logs = [];
  if (!foe.combat) foe.combat = {};
  const str = totalStat(actor, "str");
  const vit = totalStat(actor, "vit");
  const int = totalStat(actor, "int");
  const lv = getActorSkillLevel(actor, skillName) || 1;
  const killed = foe.hp <= 0;
  const actingMember = member || (st.party || []).find((m) => m?.kind === "hero");

  switch (skillName) {
    case "Shield Slam": {
      const strStagger = formulaStrStaggerChancePct(str);
      const vitFlatDr = formulaVitFlatDamageReduction(vit);
      const chancePct = clampNumber(20, 55, 18 + strStagger * 0.8 + vitFlatDr * 1.5 + lv * 3);
      if (rng.chance(chancePct)) {
        const staggerTurns = lv >= 5 ? 2 : 1;
        foe.combat.staggerDamageDownTurns = Math.max(foe.combat.staggerDamageDownTurns || 0, staggerTurns);
        foe.combat.staggerSkillTaxTurns = Math.max(foe.combat.staggerSkillTaxTurns || 0, 1);
        logs.push(`${foe.name} is staggered by Shield Slam.`);
      }
      break;
    }
    case "Crushing Blow": {
      const armorPen = formulaStrArmorPenetrationPct(str);
      const armorBreakPct = clampNumber(10, 28, 8 + armorPen * 0.6 + lv * 2);
      foe.combat.armorBreakTurns = Math.max(foe.combat.armorBreakTurns || 0, lv >= 5 ? 3 : 2);
      foe.combat.armorBreakPct = Math.max(foe.combat.armorBreakPct || 0, armorBreakPct);
      logs.push(`${foe.name}'s armor is broken.`);
      break;
    }
    case "Heavy Strike": {
      const chancePct = Math.min(18, formulaStrStaggerChancePct(str) * 0.6);
      if (rng.chance(chancePct)) {
        applyStagger(foe, 1);
        logs.push(`${foe.name} is staggered by Heavy Strike.`);
      }
      break;
    }
    case "Earthshatter":
    case "Earthbreaker": {
      const chancePct = clampNumber(15, 40, 12 + formulaStrStaggerChancePct(str) * 0.5 + lv * 2);
      if (rng.chance(chancePct)) {
        applyStagger(foe, 1);
        logs.push(`${foe.name} is staggered.`);
      }
      break;
    }
    case "Piercing Thrust":
    case "Bonebreaker": {
      if (skillName === "Bonebreaker" || skillName === "Piercing Thrust") {
        foe.combat.armorBreakTurns = Math.max(foe.combat.armorBreakTurns || 0, skillName === "Bonebreaker" ? 2 : 1);
        foe.combat.armorBreakPct = Math.max(foe.combat.armorBreakPct || 0, 8 + lv * 2);
        logs.push(`${foe.name}'s armor is broken.`);
      }
      break;
    }
    case "Combo Strike":
      if (rng.chance(38)) {
        const extra = Math.max(1, Math.floor(damage * 0.4));
        foe.hp = Math.max(0, foe.hp - extra);
        logs.push(`Combo Strike follow-up hits ${foe.name} for ${extra}.`);
      }
      break;
    case "Quick Slash":
    case "Flurry":
    case "Phantom Chain":
    case "Phantom": {
      const chance = skillName === "Flurry" ? 32 : 28;
      if (rng.chance(chance)) {
        const line = grantStaminaRefund(st, 1, skillName, actingMember);
        if (line) logs.push(line);
      }
      break;
    }
    case "Light Shot":
      if (rng.chance(28)) {
        const extra = Math.max(1, Math.floor(damage * 0.35));
        foe.hp = Math.max(0, foe.hp - extra);
        logs.push(`Light Shot bounces for ${extra} extra damage.`);
      }
      break;
    case "Blade Dance":
      if (rng.chance(28)) {
        const extra = Math.max(1, Math.floor(damage * 0.3));
        foe.hp = Math.max(0, foe.hp - extra);
        logs.push(`Blade Dance cuts again for ${extra}.`);
      }
      break;
    case "Poison Dart":
    case "Toxin Dart":
    case "Plague Storm":
    case "Plague": {
      incrementPlagueStacks(st, actor);
      const bonus = getPlagueEnginePoisonBonus(st, actor);
      if (bonus > 0 && foe.combat.poisonDamage) {
        foe.combat.poisonDamage += bonus;
      }
      break;
    }
    case "Execute":
    case "Savage Execution":
    case "Execution Rush":
    case "Frenzy Hit":
      if (killed) {
        const line = grantStaminaRefund(st, 1, "Execution surge", actingMember);
        if (line) logs.push(line);
      }
      break;
    case "Blood Frenzy":
    case "Blood Chain":
      if (killed && hero) {
        const heal = Math.max(4, Math.floor(hero.maxHp * 0.06));
        hero.hp = Math.min(hero.maxHp, hero.hp + heal);
        st.playerHp = hero.hp;
        logs.push(`Blood Frenzy restores ${heal} HP.`);
      }
      break;
    default:
      break;
  }
  return logs;
}
