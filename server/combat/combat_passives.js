/**
 * Combat passive procs and fight-start modifiers (online).
 */

import { totalStat } from "./formulas.js";
import { ensureClassState } from "./class_state.js";
import { cleansePlayerDebuffs, ensureCombatStatus } from "./status.js";
import { getCombatPassiveBonuses } from "./passives.js";
import {
  getMemberCombatStamina,
  setMemberCombatStamina,
  isCoopMultiHeroStamina
} from "./stamina.js";

function getCatalog() {
  return typeof global.SKILL_CATALOG === "object" && global.SKILL_CATALOG ? global.SKILL_CATALOG : {};
}

function passiveRow(actor, skillName) {
  const def = getCatalog()[skillName];
  if (!def?.levels?.length) return null;
  const map = actor?.classSkillLevels && typeof actor.classSkillLevels === "object" ? actor.classSkillLevels : {};
  const lv = Math.max(1, Math.min(5, Math.floor(map[skillName] || 1)));
  return def.levels[lv - 1] || def.levels[0];
}

function hasPassive(actor, skillName) {
  const map = actor?.classSkillLevels;
  return map && typeof map[skillName] === "number" && map[skillName] > 0;
}

/** Apply fight-start passive modifiers to hero party member. */
export function initCombatPassives(st, player) {
  if (!st || !player) return;
  const hero = (st.party || []).find((m) => m?.kind === "hero");
  if (!hero) return;

  const cs = ensureClassState(st);
  cs.unbrokenStacks = 0;
  cs.unbrokenStackTurns = 0;
  cs.secondBreathUsed = false;
  cs.plagueStacks = cs.plagueStacks || 0;
  cs.killMomentumPhysPct = 0;

  if (hasPassive(player, "Iron Wall")) {
    const row = passiveRow(player, "Iron Wall");
    const vitBonus = row?.passiveVit || 0;
    const hpBonus = row?.passiveHp || 0;
    if (vitBonus > 0) {
      hero.maxHp = Math.max(hero.maxHp, hero.maxHp + vitBonus * 3);
      hero.hp = Math.min(hero.maxHp, hero.hp + vitBonus * 3);
    }
    if (hpBonus > 0) {
      hero.maxHp += hpBonus;
      hero.hp = Math.min(hero.maxHp, hero.hp + hpBonus);
    }
    st.playerMax = hero.maxHp;
    st.playerHp = hero.hp;
  }
}

/** Evasion from Flow Step / Smoke Step class buffs. */
export function getFlowSmokeEvasionPct(st) {
  const cs = st?.classState;
  if (!cs) return 0;
  let eva = 0;
  if ((cs.flowStepTurns || 0) > 0) eva += cs.flowStepEva || 0;
  if ((cs.smokeTurns || 0) > 0) eva += cs.smokeEva || 0;
  return Math.max(0, Math.min(50, eva));
}

/** Accuracy from Flow Step. */
export function getFlowStepAccuracyPct(st) {
  const cs = st?.classState;
  if (!cs || (cs.flowStepTurns || 0) <= 0) return 0;
  return Math.max(0, Math.min(30, cs.flowStepAcc || 0));
}

/** Unbroken Line resist stacks as % DR. */
export function getUnbrokenLineDamageReductionPct(st) {
  const cs = st?.classState;
  if (!cs || (cs.unbrokenStackTurns || 0) <= 0 || (cs.unbrokenStacks || 0) <= 0) return 0;
  const stacks = cs.unbrokenStacks || 0;
  const per = cs.unbrokenPhysResPerStack || 2;
  return Math.min(20, stacks * per);
}

/** Call when casting Brace / Fortress / Guard Ally / Last Bastion. */
export function onDefensiveSkillCast(st, player, skillName) {
  if (!hasPassive(player, "Unbroken Line")) return null;
  const row = passiveRow(player, "Unbroken Line");
  const pr = row?.passive;
  if (!pr) return null;
  const defensive = new Set([
    "Brace",
    "Fortress",
    "Fortress Stance",
    "Guard Ally",
    "Last Bastion",
    "Sanctuary",
    "Riposte"
  ]);
  if (!defensive.has(skillName)) return null;

  const cs = ensureClassState(st);
  const maxStacks = pr.maxStacks || 2;
  const duration = pr.duration || 2;
  if ((cs.unbrokenStacks || 0) < maxStacks) cs.unbrokenStacks = (cs.unbrokenStacks || 0) + 1;
  cs.unbrokenStackTurns = Math.max(cs.unbrokenStackTurns || 0, duration);
  cs.unbrokenPhysResPerStack = pr.physResPerStack || 2;
  cs.unbrokenMagResPerStack = pr.magResPerStack || 2;
  cs.unbrokenStatusResPerStack = pr.statusResPerStack || 0;
  return `Unbroken Line (${cs.unbrokenStacks}/${maxStacks} stacks, ${duration}t).`;
}

/**
 * Once per fight: when hero drops below 30% HP, heal and optionally cleanse.
 * @returns {string|null}
 */
export function trySecondBreath(st, player, member) {
  if (!member || member.kind !== "hero" || !player) return null;
  if (!hasPassive(player, "Second Breath")) return null;
  const cs = ensureClassState(st);
  if (cs.secondBreathUsed) return null;
  const frac = member.maxHp > 0 ? member.hp / member.maxHp : 1;
  if (frac > 0.3) return null;

  const row = passiveRow(player, "Second Breath");
  const pr = row?.passive;
  if (!pr) return null;

  cs.secondBreathUsed = true;
  const vit = totalStat(player, "vit");
  const healPct = typeof pr.healVitPct === "number" ? pr.healVitPct : 50;
  const heal = Math.max(1, Math.floor((vit * healPct) / 100));
  const before = member.hp;
  member.hp = Math.min(member.maxHp, member.hp + heal);
  st.playerHp = member.hp;

  const cleanseDepth = typeof pr.cleanse === "number" ? pr.cleanse : 0;
  if (cleanseDepth > 0) cleansePlayerDebuffs(st, cleanseDepth);

  const actual = member.hp - before;
  return `Second Breath restores ${actual} HP${cleanseDepth > 0 ? " and cleanses debuffs" : ""}.`;
}

/** After killing a foe: stamina + optional next-turn phys damage from Kill Momentum. */
export function onFoeKilledPassives(st, player, member = null) {
  const logs = [];
  if (!player) return logs;

  if (hasPassive(player, "Kill Momentum")) {
    const row = passiveRow(player, "Kill Momentum");
    const pr = row?.passive;
    const add = pr?.staminaOnKill;
    if (add > 0) {
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
      const next = Math.min(maxS + 4, cur + add);
      if (member && isCoopMultiHeroStamina(st)) {
        setMemberCombatStamina(st, member, next);
      } else {
        st.stamina = next;
      }
      logs.push(`Kill Momentum: +${add} stamina.`);
    }
    const physNext = pr?.physDamageNextTurn;
    if (physNext > 0) {
      const cs = ensureClassState(st);
      cs.killMomentumPendingPct = Math.max(cs.killMomentumPendingPct || 0, physNext);
      logs.push(`Kill Momentum: +${physNext}% physical damage next turn.`);
    }
  }
  return logs;
}

/** Crit proc: Duelist Momentum stamina refund chance. */
export function tryDuelistMomentumOnCrit(st, actor, rng, member = null) {
  if (!actor || !rng || !hasPassive(actor, "Duelist Momentum")) return null;
  const row = passiveRow(actor, "Duelist Momentum");
  const chance = row?.passive?.critStaminaChancePct || 0;
  if (chance <= 0 || !rng.chance(chance)) return null;
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
  const next = Math.min(maxS + 2, cur + 1);
  if (member && isCoopMultiHeroStamina(st)) {
    setMemberCombatStamina(st, member, next);
  } else {
    st.stamina = next;
  }
  return "Duelist Momentum: +1 stamina.";
}

/** Tick unbroken stacks down at end of round. */
export function tickUnbrokenStacks(st) {
  const cs = st?.classState;
  if (!cs || (cs.unbrokenStackTurns || 0) <= 0) return;
  cs.unbrokenStackTurns -= 1;
  if (cs.unbrokenStackTurns <= 0) {
    cs.unbrokenStackTurns = 0;
    cs.unbrokenStacks = 0;
  }
}

/** Plague Engine: bonus poison damage from stacks when applying poison. */
export function getPlagueEnginePoisonBonus(st, actor) {
  if (!hasPassive(actor, "Plague Engine")) return 0;
  const cs = st?.classState;
  const stacks = cs?.plagueStacks || 0;
  const row = passiveRow(actor, "Plague Engine");
  const base = row?.passive?.dotDamage ? Math.floor(row.passive.dotDamage / 5) : 0;
  return base + Math.floor(stacks / 2);
}

export function incrementPlagueStacks(st, actor) {
  if (!hasPassive(actor, "Plague Engine")) return;
  const cs = ensureClassState(st);
  const row = passiveRow(actor, "Plague Engine");
  const max = row?.passive?.poisonStacks2 ? 6 : 4;
  cs.plagueStacks = Math.min(max, (cs.plagueStacks || 0) + 1);
}
