import { getActorDamage, resolveOutgoingAttack, totalStat } from "./formulas.js";
import {
  applyEncourageToMember,
  applyGuardToAlly,
  applyPlayerBrace,
  applyPlayerEvasionUp,
  cleansePlayerDebuffs,
  getFoeEvasionPenalty,
  getFoeMagicResist,
  getFoePhysResist,
  getPlayerAccuracyPenaltyPct,
  getPlayerDamageDownPct,
  tryRollFoeDebuff
} from "./status.js";
import {
  addDivineAegisShield,
  applyBloodPrice,
  applyOverload,
  applyOverloadStaminaTax,
  applyRegrowth,
  applySanctuaryParty,
  applySpellPreparation,
  consumeSpellPrepOnMagicalSkill,
  getOverloadAccuracyBonus,
  getPlayerOutgoingDamageBonusPct,
  resolveSkillStaminaCost
} from "./class_state.js";
import { getCombatPassiveBonuses } from "./passives.js";
import { applySelfHpCost, collectAoeFoes } from "./skill_helpers.js";
import {
  isClassOnlyBuffSkill,
  validateAndResolveClassBuffSkill
} from "./class_skills.js";
import { ensureClassState, getActorClassOutgoingDamageMult } from "./class_state.js";
import { onDefensiveSkillCast } from "./combat_passives.js";
import { getFlowStepAccuracyPct } from "./combat_passives.js";
import {
  getActorCombatMaxStamina,
  getMemberCombatStamina,
  setMemberCombatStamina,
  isCoopMultiHeroStamina
} from "./stamina.js";

function getSkillCatalog() {
  return typeof global.SKILL_CATALOG === "object" && global.SKILL_CATALOG ? global.SKILL_CATALOG : {};
}

function getSkillDef(name) {
  return getSkillCatalog()[name] || null;
}

function getActorSkillLevel(actor, skillName) {
  if (skillName === "Basic Physical Attack" || skillName === "Basic Magical Attack") return 1;
  const map = actor?.classSkillLevels && typeof actor.classSkillLevels === "object" ? actor.classSkillLevels : {};
  const lv = map[skillName];
  return typeof lv === "number" && lv > 0 ? Math.min(5, Math.floor(lv)) : 0;
}

function isSkillSlotted(actor, skillName) {
  if (skillName === "Basic Physical Attack" || skillName === "Basic Magical Attack") return true;
  const slots = Array.isArray(actor?.skillBarSlots) ? actor.skillBarSlots : [];
  if (slots.includes(skillName)) return true;
  const bar = Array.isArray(actor?.skillBar) ? actor.skillBar : [];
  if (bar.includes(skillName)) return true;
  const skills = Array.isArray(actor?.skills) ? actor.skills : [];
  return skills.includes(skillName);
}

function getLevelRow(def, skillName, actor) {
  if (!def?.levels?.length) return null;
  const lv = Math.max(1, Math.min(5, getActorSkillLevel(actor, skillName) || 1));
  return def.levels[lv - 1] || def.levels[0];
}

function computeStrikeSkillBaseDamage(actor, def, row) {
  const str = totalStat(actor, "str");
  const int = totalStat(actor, "int");
  const kind = def.damageKind === "magic" ? "magic" : "physical";
  if (kind === "magic") {
    const pct = typeof row.intPct === "number" ? row.intPct : 0.55;
    return Math.max(1, Math.floor(int * pct + totalStat(actor, "int") * 0.1));
  }
  const pct = typeof row.strPct === "number" ? row.strPct : 0.55;
  return Math.max(1, Math.floor(str * pct + getActorDamage(actor) * 0.25));
}

function resolveSkillHit(actor, foe, def, row, rng, st, member, skillOpts) {
  const opts = skillOpts && typeof skillOpts === "object" ? skillOpts : {};
  const sys =
    typeof global.GAME_CONFIG?.statSystem === "object" ? global.GAME_CONFIG.statSystem : {};
  const minH = sys.minHitChancePct ?? 15;
  const maxH = sys.maxHitChancePct ?? 100;
  const baseHit = typeof def.baseHit === "number" ? def.baseHit : 88;
  const baseCrit = typeof def.baseCrit === "number" ? def.baseCrit : 3;
  const dex = totalStat(actor, "dex");
  const int = totalStat(actor, "int");
  const pass = getCombatPassiveBonuses(actor);
  const memberAcc = member?.buffAccTurns > 0 ? Math.max(0, Math.floor(member.buffAccPct || 0)) : 0;
  const acc =
    Math.floor(dex / 10) +
    Math.floor(int / 10) +
    (pass.accuracy || 0) +
    (st ? getFlowStepAccuracyPct(st) : 0) +
    (typeof row.hitBonus === "number" ? row.hitBonus : 0) +
    memberAcc +
    (st ? getOverloadAccuracyBonus(st) : 0) -
    (st ? getPlayerAccuracyPenaltyPct(st) : 0) +
    getFoeEvasionPenalty(foe);
  const ev = Math.min(40, Math.floor((foe.dex || 0) / 10) * 2);
  const hitPct = Math.min(maxH, Math.max(minH, baseHit + acc - ev));
  if (!rng.chance(hitPct)) return { damage: 0, missed: true, crit: false };

  let dmg = computeStrikeSkillBaseDamage(actor, def, row);
  const kind = def.damageKind === "magic" ? "magic" : "physical";
  if (kind === "physical") dmg = Math.floor(dmg * (1 + (pass.physDamagePct || 0) / 100));
  else dmg = Math.floor(dmg * (1 + (pass.magicDamagePct || 0) / 100));

  let mul = 1;
  if (kind === "physical" && foe?.combat && (foe.combat.physResDownTurns || 0) > 0 && row?.vsPhysResDownBonusPct) {
    mul *= 1 + row.vsPhysResDownBonusPct / 100;
  }
  if (kind === "magic" && foe?.combat && (foe.combat.burnTurns || 0) > 0 && row?.vsBurnBonusPct) {
    mul *= 1 + row.vsBurnBonusPct / 100;
  }
  if (foe?.maxHp > 0 && row?.strPctLow && row?.strPct > 0) {
    const frac = foe.hp / foe.maxHp;
    const thr = opts.execute ? 0.3 : 0.35;
    if (frac < thr) mul *= row.strPctLow / row.strPct;
  }
  dmg = Math.floor(dmg * mul);

  const critChance = Math.min(50, Math.floor(dex * 0.35) + baseCrit + (pass.crit || 0));
  const crit = rng.chance(critChance);
  if (crit) dmg = Math.floor(dmg * 1.5);

  let res = kind === "magic" ? getFoeMagicResist(foe) : getFoePhysResist(foe);
  if (kind === "physical" && row?.ignorePhysResPct) {
    res = Math.max(0, res - row.ignorePhysResPct);
  }
  const dmgDown = st ? getPlayerDamageDownPct(st, kind) : 0;
  const dmgUp = st ? getPlayerOutgoingDamageBonusPct(st, kind) : 0;
  const classMult =
    st && skillOpts?.skillName
      ? getActorClassOutgoingDamageMult(st, skillOpts.skillName, foe, actor, member)
      : 1;
  dmg = Math.max(
    1,
    Math.floor(dmg * (1 - res / 100) * (1 - dmgDown / 100) * (1 + dmgUp / 100) * classMult)
  );
  return { damage: dmg, missed: false, crit };
}

const DAMAGE_PATTERNS = new Set([
  "basic",
  "strike",
  "strike_debuff",
  "twin_jab",
  "deep_lunge",
  "final_measure",
  "execute_skill",
  "steady_shot",
  "piercing_shot",
  "brutal_rush",
  "spark",
  "heavy_strike",
  "precise_cut",
  "bleeding_flourish",
  "rupture",
  "toxin_dart",
  "poison_dart",
  "acid_vial",
  "spell_fracture",
  "expose_weakness",
  "shield_bash",
  "shield_slam",
  "earthbreaker"
]);

const AOE_PATTERNS = new Set([
  "aoe_phys_adj",
  "aoe_mag_adj",
  "burning_field",
  "bloodstorm",
  "cleave",
  "scatter_shot",
  "arcane_wave",
  "guarding_shout",
  "all_foes_debuff",
  "crippling_mixture"
]);

const HEAL_PATTERNS = new Set(["heal_ally", "heal_all", "regrowth"]);

const ALLY_SUPPORT_PATTERNS = new Set(["ward_shield", "encourage", "cleanse"]);

const BUFF_PATTERNS = new Set(["brace", "flow_step", "smoke_step"]);

const SELF_BUFF_PATTERNS = new Set([
  "flow_step",
  "smoke_step",
  "spell_preparation",
  "overload",
  "blood_price"
]);

const SKIP_PATTERNS = new Set([
  "passive_iron_wall",
  "passive_unbroken",
  "passive_footwork",
  "passive_duelist_momentum",
  "passive_focused_casting",
  "passive_keen_eye",
  "passive_war_hunger",
  "passive_kill_momentum",
  "passive_steady_heart",
  "passive_second_breath",
  "passive_toxic_study",
  "passive_plague_engine"
]);

function getSkillStaminaCost(def) {
  return typeof def.stamina === "number" ? Math.max(0, Math.floor(def.stamina)) : 2;
}

function collectSpreadContagionTargets(st, centerUid, jumpCount) {
  const living = (st.foes || []).filter((f) => f && f.hp > 0);
  const idx = living.findIndex((f) => f.uid === centerUid);
  if (idx < 0) return [];
  const out = [];
  for (let d = 1; d <= jumpCount; d++) {
    if (living[idx - d]) out.push(living[idx - d]);
    if (living[idx + d]) out.push(living[idx + d]);
  }
  return out;
}

function spreadPoisonFromFoe(source, target, durationFracPct) {
  if (!source?.combat || !target?.combat) return false;
  const turns = source.combat.poisonTurns || 0;
  const dmg = source.combat.poisonDamage || 0;
  if (turns <= 0 || dmg <= 0) return false;
  const frac = Math.max(0.1, Math.min(1, (Number(durationFracPct) || 50) / 100));
  const spreadTurns = Math.max(1, Math.floor(turns * frac));
  target.combat.poisonTurns = Math.max(target.combat.poisonTurns || 0, spreadTurns);
  target.combat.poisonDamage = Math.max(target.combat.poisonDamage || 0, Math.max(1, Math.floor(dmg * frac)));
  return true;
}

function getSkillCooldown(def) {
  return typeof def.cooldown === "number" ? Math.max(0, Math.floor(def.cooldown)) : 0;
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

function tickSkillCooldowns(st) {
  if (!st.skillCooldowns) return;
  Object.keys(st.skillCooldowns).forEach((k) => {
    st.skillCooldowns[k] = Math.max(0, (st.skillCooldowns[k] || 0) - 1);
    if (st.skillCooldowns[k] <= 0) delete st.skillCooldowns[k];
  });
}

function getMemberStamina(st, member) {
  return getMemberCombatStamina(st, member);
}

function setMemberStamina(st, member, value) {
  setMemberCombatStamina(st, member, value);
}

/**
 * @returns {{ ok: boolean, error?: string, hits?: Array<{ foeUid: number, damage: number, missed: boolean, crit: boolean }> }}
 */
export function validateAndResolveSkill(st, member, actor, skillName, targetUid, rng) {
  if (isClassOnlyBuffSkill(skillName)) {
    return validateAndResolveClassBuffSkill(st, member, actor, skillName, targetUid, rng);
  }

  const def = getSkillDef(skillName);
  if (!def) return { ok: false, error: "Unknown skill." };
  if (def.passiveOnly) return { ok: false, error: "Passive skill cannot be used in combat." };
  if (!isSkillSlotted(actor, skillName)) return { ok: false, error: "Skill is not on your skill bar." };

  const cdLeft = getCooldownRemaining(st, skillName);
  if (cdLeft > 0) return { ok: false, error: `${skillName} is on cooldown (${cdLeft} turn${cdLeft === 1 ? "" : "s"}).` };

  const cost = resolveSkillStaminaCost(st, def);
  const stam = getMemberStamina(st, member);
  if (stam < cost) return { ok: false, error: `Not enough stamina (need ${cost}, have ${stam}).` };

  const pattern = def.pattern || "strike";
  if (SKIP_PATTERNS.has(pattern)) {
    return { ok: false, error: `${skillName} is not yet supported in online combat.` };
  }

  const row = getLevelRow(def, skillName, actor);
  if (
    !row &&
    !DAMAGE_PATTERNS.has(pattern) &&
    !AOE_PATTERNS.has(pattern) &&
    !HEAL_PATTERNS.has(pattern) &&
    !ALLY_SUPPORT_PATTERNS.has(pattern) &&
    !BUFF_PATTERNS.has(pattern) &&
    pattern !== "taunt_all" &&
    pattern !== "guard_ally" &&
    pattern !== "rev_pulse" &&
    pattern !== "sanctuary_party" &&
    pattern !== "spread_contagion" &&
    pattern !== "reflex_volley" &&
    pattern !== "vanishing_shot" &&
    pattern !== "arcane_collapse" &&
    pattern !== "event_horizon"
  ) {
    return { ok: false, error: `${skillName} is not yet supported in online combat.` };
  }

  setMemberStamina(st, member, stam - cost);
  const hits = [];
  const debuffLogs = [];

  if (ALLY_SUPPORT_PATTERNS.has(pattern)) {
    const allyUid = typeof targetUid === "number" ? targetUid : member.uid;
    const ally = (st.party || []).find((m) => m && m.uid === allyUid && m.hp > 0);
    if (!ally) return { ok: false, error: "Select a living ally." };
    const vit = totalStat(actor, "vit");
    const supportLogs = [];

    if (pattern === "ward_shield" && row?.shieldVitPct) {
      const shield = Math.max(1, Math.floor(vit * row.shieldVitPct));
      const total = addDivineAegisShield(st, shield);
      supportLogs.push(
        `${member.name} casts Protective Ward on ${ally.name} (${shield} absorb, ${total} total).`
      );
    } else if (pattern === "encourage" && row?.ally) {
      applyEncourageToMember(ally, row.ally);
      const healPct = row.ally.healPct || 0;
      if (healPct > 0) {
        const amt = Math.max(1, Math.floor(vit * (healPct / 100)));
        const before = ally.hp;
        ally.hp = Math.min(ally.maxHp, ally.hp + amt);
        supportLogs.push(
          `${member.name} encourages ${ally.name} (+${ally.hp - before} HP, +${row.ally.acc || 0}% accuracy).`
        );
      } else {
        supportLogs.push(
          `${member.name} encourages ${ally.name} (+${row.ally.acc || 0}% accuracy for ${row.ally.turns || 1} turn(s)).`
        );
      }
    } else if (pattern === "cleanse") {
      const depth = row.cleanse || 1;
      if (ally.kind === "hero") cleansePlayerDebuffs(st, depth);
      if (row.vitHealPct > 0) {
        const amt = Math.max(1, Math.floor(vit * row.vitHealPct));
        const before = ally.hp;
        ally.hp = Math.min(ally.maxHp, ally.hp + amt);
        supportLogs.push(
          `${member.name} cleanses ${ally.name} and restores ${ally.hp - before} HP.`
        );
      } else {
        supportLogs.push(`${member.name} cleanses ${ally.name}.`);
      }
    } else {
      return { ok: false, error: `${skillName} is not yet supported in online combat.` };
    }

    setSkillCooldown(st, skillName, getSkillCooldown(def));
    return { ok: true, heals: [], supportLogs };
  }

  if (pattern === "taunt_all" && row?.debuff) {
    const living = st.foes.filter((f) => f.hp > 0);
    if (!living.length) return { ok: false, error: "No enemies to taunt." };
    for (const foe of living) {
      const msg = tryRollFoeDebuff(st, foe, row.debuff, actor, rng);
      if (msg) debuffLogs.push(msg);
    }
    setSkillCooldown(st, skillName, getSkillCooldown(def));
    return { ok: true, hits: [], debuffLogs, supportLogs: [`${member.name} taunts all enemies.`] };
  }

  if (pattern === "guard_ally" && row?.ally) {
    const allyUid = typeof targetUid === "number" ? targetUid : member.uid;
    const ally = (st.party || []).find((m) => m && m.uid === allyUid && m.hp > 0);
    if (!ally) return { ok: false, error: "Select a living ally." };
    const redirect = typeof row.ally.redirect === "number" ? row.ally.redirect : 30;
    const turns = typeof row.ally.turns === "number" ? row.ally.turns : 1;
    applyGuardToAlly(ally, member.uid, redirect, turns);
    const cs = ensureClassState(st);
    cs.guardAllyTurns = Math.max(cs.guardAllyTurns || 0, turns);
    const ubLog = onDefensiveSkillCast(st, actor, skillName);
    setSkillCooldown(st, skillName, getSkillCooldown(def));
    return {
      ok: true,
      supportLogs: [
        `${member.name} guards ${ally.name} (${redirect}% redirect for ${turns} turn(s)).`,
        ...(ubLog ? [ubLog] : [])
      ]
    };
  }

  if (pattern === "rev_pulse" && row?.party) {
    const bonus = typeof row.party.nextStamina === "number" ? row.party.nextStamina : 1;
    st.staminaBonusNextTurn = Math.max(st.staminaBonusNextTurn || 0, bonus);
    (st.party || []).forEach((m) => {
      if (m && m.hp > 0 && typeof m.maxStamina === "number") {
        m.staminaBonusNextTurn = Math.max(m.staminaBonusNextTurn || 0, bonus);
      }
    });
    const healPct = row.party.healPct || 0;
    const heals = [];
    if (healPct > 0) {
      const vit = totalStat(actor, "vit");
      const living = (st.party || []).filter((m) => m && m.hp > 0);
      const amt = Math.max(1, Math.floor((vit * healPct) / 100 / Math.max(1, living.length)));
      for (const m of living) {
        const before = m.hp;
        m.hp = Math.min(m.maxHp, m.hp + amt);
        heals.push({ memberUid: m.uid, amount: m.hp - before });
      }
    }
    setSkillCooldown(st, skillName, getSkillCooldown(def));
    return {
      ok: true,
      heals,
      supportLogs: [`${member.name} pulses revitalizing energy (+${bonus} stamina next turn).`]
    };
  }

  if (SELF_BUFF_PATTERNS.has(pattern) && row?.self) {
    const supportLogs = [];
    if (pattern === "spell_preparation") {
      applySpellPreparation(st, row);
      supportLogs.push(
        `${member.name} prepares spells (next ${row.self.nextMagical || 1} magical skills cost −1 stamina, min 2).`
      );
    } else if (pattern === "overload") {
      applyOverload(st, row);
      applyOverloadStaminaTax(st, row.self.turns || 2);
      supportLogs.push(
        `${member.name} Overloads (+${row.self.magDmg || 0}% magic damage; skills cost +1 stamina for ${row.self.turns || 2}t).`
      );
    } else if (pattern === "blood_price") {
      applyBloodPrice(st, member, row);
      supportLogs.push(
        `${member.name} pays blood for +${row.self.physDmg || 0}% physical damage (${row.self.turns || 2}t).`
      );
    } else if (pattern === "flow_step" && row.self) {
      const cs = ensureClassState(st);
      cs.flowStepEva = Math.max(cs.flowStepEva || 0, row.self.eva || 0);
      cs.flowStepAcc = Math.max(cs.flowStepAcc || 0, row.self.acc || 0);
      cs.flowStepTurns = Math.max(cs.flowStepTurns || 0, row.self.turns || 1);
      supportLogs.push(
        `${member.name} uses Flow Step (+${row.self.eva || 0}% evasion, ${row.self.turns || 1}t).`
      );
    } else if (pattern === "smoke_step" && row.self) {
      const cs = ensureClassState(st);
      cs.smokeEva = Math.max(cs.smokeEva || 0, row.self.eva || 0);
      cs.smokeTurns = Math.max(cs.smokeTurns || 0, row.self.turns || 1);
      supportLogs.push(
        `${member.name} vanishes in smoke (+${row.self.eva || 0}% evasion, ${row.self.turns || 1}t).`
      );
    } else {
      const eva = typeof row.self.eva === "number" ? row.self.eva : 8;
      const turns = typeof row.self.turns === "number" ? row.self.turns : 1;
      applyPlayerEvasionUp(st, eva, turns);
      supportLogs.push(`${member.name} gains +${eva}% evasion for ${turns} turn(s).`);
    }
    setSkillCooldown(st, skillName, getSkillCooldown(def));
    consumeSpellPrepOnMagicalSkill(st, def);
    return { ok: true, supportLogs };
  }

  if (pattern === "sanctuary_party" && row?.party) {
    applySanctuaryParty(st, row);
    const turns = row.party.turns || 2;
    setSkillCooldown(st, skillName, getSkillCooldown(def));
    return {
      ok: true,
      supportLogs: [
        `${member.name} casts Sanctuary (−${row.party.dr || 10}% damage taken${row.party.sr ? `, +${row.party.sr}% status resist` : ""}, ${turns}t).`
      ]
    };
  }

  if (pattern === "spread_contagion") {
    const foe = st.foes.find((f) => f.uid === targetUid && f.hp > 0);
    if (!foe) return { ok: false, error: "Select a living enemy." };
    if (!(foe.combat?.poisonTurns > 0 && foe.combat?.poisonDamage > 0)) {
      return { ok: false, error: "Target must be poisoned." };
    }
    const jumps = Math.max(1, Math.floor(row.adj || 1));
    const chance = typeof row.chance === "number" ? row.chance : 50;
    const targets = collectSpreadContagionTargets(st, foe.uid, jumps);
    const debuffLogs = [];
    let spreadCount = 0;
    for (const t of targets) {
      if (!rng.chance(chance)) continue;
      if (spreadPoisonFromFoe(foe, t, row.durationFracPct)) {
        spreadCount += 1;
        debuffLogs.push(`Poison spreads to ${t.name}.`);
      }
    }
    setSkillCooldown(st, skillName, getSkillCooldown(def));
    return {
      ok: true,
      hits: [],
      debuffLogs,
      supportLogs: [
        spreadCount
          ? `${member.name} spreads contagion to ${spreadCount} foe(s).`
          : `${member.name} fails to spread contagion.`
      ]
    };
  }

  if (BUFF_PATTERNS.has(pattern) && pattern === "brace" && row?.self) {
    const dr = typeof row.self.dr === "number" ? row.self.dr : 12;
    const turns = typeof row.self.turns === "number" ? row.self.turns : 1;
    applyPlayerBrace(st, dr, turns);
    const cs = ensureClassState(st);
    cs.braceTurns = Math.max(cs.braceTurns || 0, turns);
    cs.braceReductionPct = Math.max(cs.braceReductionPct || 0, dr);
    cs.braceStatusResistBonusPct = Math.max(cs.braceStatusResistBonusPct || 0, row.self.sr || 0);
    const ubLog = onDefensiveSkillCast(st, actor, skillName);
    setSkillCooldown(st, skillName, getSkillCooldown(def));
  return {
      ok: true,
      buffs: [{ type: "brace", dr, turns }],
      supportLogs: [
        `${member.name} braces (−${dr}% damage, ${turns}t).`,
        ...(ubLog ? [ubLog] : [])
      ]
    };
  }

  if (HEAL_PATTERNS.has(pattern)) {
    const vit = totalStat(actor, "vit");
    const heals = [];
    if (pattern === "heal_all" && row?.vitHealPct) {
      const living = (st.party || []).filter((m) => m && m.hp > 0);
      const amt = Math.max(
        1,
        Math.floor((vit * row.vitHealPct) / Math.max(1, living.length))
      );
      for (const m of living) {
        const before = m.hp;
        m.hp = Math.min(m.maxHp, m.hp + amt);
        heals.push({ memberUid: m.uid, amount: m.hp - before });
      }
    } else if (pattern === "regrowth" && row?.regenVitPct) {
      const turns = 3;
      applyRegrowth(st, member, row.regenVitPct, turns);
      const amt = Math.max(1, Math.floor(vit * row.regenVitPct * 0.5));
      const before = member.hp;
      member.hp = Math.min(member.maxHp, member.hp + amt);
      heals.push({ memberUid: member.uid, amount: member.hp - before });
    } else if (row?.vitHealPct) {
      const allyUid = typeof targetUid === "number" ? targetUid : member.uid;
      const ally = (st.party || []).find((m) => m && m.uid === allyUid && m.hp > 0);
      if (!ally) return { ok: false, error: "Select a living ally." };
      const amt = Math.max(1, Math.floor(vit * row.vitHealPct));
      const before = ally.hp;
      ally.hp = Math.min(ally.maxHp, ally.hp + amt);
      heals.push({ memberUid: ally.uid, amount: ally.hp - before });
    } else {
      return { ok: false, error: `${skillName} is not yet supported in online combat.` };
    }
    setSkillCooldown(st, skillName, getSkillCooldown(def));
    const healMult = 1 + (getCombatPassiveBonuses(actor).healingPct || 0) / 100;
    if (healMult > 1) {
      heals.forEach((h) => {
        const m = st.party.find((x) => x && x.uid === h.memberUid);
        if (!m) return;
        const extra = Math.max(0, Math.floor(h.amount * (healMult - 1)));
        if (extra > 0) {
          m.hp = Math.min(m.maxHp, m.hp + extra);
          h.amount += extra;
          if (m.kind === "hero") st.playerHp = m.hp;
        }
      });
    }
    return { ok: true, heals };
  }

  if (pattern === "reflex_volley") {
    const foe = st.foes.find((f) => f.uid === targetUid && f.hp > 0);
    if (!foe) return { ok: false, error: "Select a living enemy." };
    const hitCount = row?.hits || def.twinHits || 3;
    for (let i = 0; i < hitCount; i++) {
      if (foe.hp <= 0) break;
      const res = resolveSkillHit(actor, foe, def, row || {}, rng, st, member, { skillName });
      hits.push({ foeUid: foe.uid, damage: res.missed ? 0 : res.damage, missed: res.missed, crit: res.crit });
    }
    setSkillCooldown(st, skillName, getSkillCooldown(def));
    consumeSpellPrepOnMagicalSkill(st, def);
    return { ok: true, hits, debuffLogs };
  }

  if (pattern === "vanishing_shot") {
    const foe = st.foes.find((f) => f.uid === targetUid && f.hp > 0);
    if (!foe) return { ok: false, error: "Select a living enemy." };
    const res = resolveSkillHit(actor, foe, def, row || {}, rng, st, member, { skillName });
    if (!res.missed && row?.debuff) {
      const msg = tryRollFoeDebuff(st, foe, row.debuff, actor, rng);
      if (msg) debuffLogs.push(msg);
    }
    hits.push({ foeUid: foe.uid, damage: res.missed ? 0 : res.damage, missed: res.missed, crit: res.crit });
    if (row?.self) {
      const eva = row.self.eva || 10;
      const turns = row.self.turns || 1;
      applyPlayerEvasionUp(st, eva, turns);
    }
    setSkillCooldown(st, skillName, getSkillCooldown(def));
    return { ok: true, hits, debuffLogs };
  }

  if (pattern === "brutal_rush" || pattern === "bloodstorm") {
    const centerUid = typeof targetUid === "number" ? targetUid : st.selectedUid;
    const adj = typeof row?.aoeAdj === "number" ? row.aoeAdj : pattern === "bloodstorm" ? 2 : 0;
    const targets =
      adj > 0 ? collectAoeFoes(st, centerUid, adj) : st.foes.filter((f) => f.hp > 0).slice(0, 1);
    if (!targets.length) return { ok: false, error: "No enemies to hit." };
    if (row?.selfDamageMaxHpPct) applySelfHpCost(member, st, row.selfDamageMaxHpPct);
    for (const foe of targets) {
      const res = resolveSkillHit(actor, foe, def, row || {}, rng, st, member, { skillName });
      let dmg = res.missed ? 0 : res.damage;
      if (!res.missed && adj > 0 && targets.length > 2) dmg = Math.max(1, Math.floor(dmg * 0.85));
      hits.push({ foeUid: foe.uid, damage: dmg, missed: res.missed, crit: res.crit });
    }
    setSkillCooldown(st, skillName, getSkillCooldown(def));
    consumeSpellPrepOnMagicalSkill(st, def);
    return { ok: true, hits, aoe: true, debuffLogs };
  }

  if (pattern === "bleeding_flourish" || pattern === "arcane_collapse" || pattern === "earthbreaker") {
    const centerUid = typeof targetUid === "number" ? targetUid : st.selectedUid;
    const adj = typeof row?.aoeAdj === "number" ? row.aoeAdj : 1;
    const targets = collectAoeFoes(st, centerUid, adj);
    if (!targets.length) return { ok: false, error: "No enemies to hit." };
    for (const foe of targets) {
      const res = resolveSkillHit(actor, foe, def, row || {}, rng, st, member, { skillName });
      let dmg = res.missed ? 0 : Math.max(1, Math.floor(res.damage * (0.85 + adj * 0.05)));
      hits.push({ foeUid: foe.uid, damage: dmg, missed: res.missed, crit: res.crit });
      if (!res.missed && row?.debuff) {
        const msg = tryRollFoeDebuff(st, foe, row.debuff, actor, rng);
        if (msg) debuffLogs.push(msg);
      }
      if (!res.missed && row?.debuff2) {
        const msg = tryRollFoeDebuff(st, foe, row.debuff2, actor, rng);
        if (msg) debuffLogs.push(msg);
      }
      if (!res.missed && row?.debuff3) {
        const msg = tryRollFoeDebuff(st, foe, row.debuff3, actor, rng);
        if (msg) debuffLogs.push(msg);
      }
    }
    setSkillCooldown(st, skillName, getSkillCooldown(def));
    consumeSpellPrepOnMagicalSkill(st, def);
    return { ok: true, hits, aoe: true, debuffLogs };
  }

  if (pattern === "event_horizon") {
    const living = st.foes.filter((f) => f.hp > 0);
    if (!living.length) return { ok: false, error: "No enemies to hit." };
    for (const foe of living) {
      const res = resolveSkillHit(actor, foe, def, row || {}, rng, st, member, { skillName });
      hits.push({ foeUid: foe.uid, damage: res.missed ? 0 : res.damage, missed: res.missed, crit: res.crit });
    }
    setSkillCooldown(st, skillName, getSkillCooldown(def));
    consumeSpellPrepOnMagicalSkill(st, def);
    return { ok: true, hits, aoe: true, debuffLogs };
  }

  if (pattern === "crippling_mixture") {
    const centerUid = typeof targetUid === "number" ? targetUid : st.selectedUid;
    const adj = typeof row?.aoeAdj === "number" ? row.aoeAdj : 0;
    const targets = adj > 0 ? collectAoeFoes(st, centerUid, adj) : [st.foes.find((f) => f.uid === centerUid && f.hp > 0)].filter(Boolean);
    if (!targets.length) return { ok: false, error: "No enemies to hit." };
    for (const foe of targets) {
      if (row?.debuff) {
        const msg = tryRollFoeDebuff(st, foe, row.debuff, actor, rng);
        if (msg) debuffLogs.push(msg);
      }
      if (row?.debuff2) {
        const msg = tryRollFoeDebuff(st, foe, row.debuff2, actor, rng);
        if (msg) debuffLogs.push(msg);
      }
    }
    setSkillCooldown(st, skillName, getSkillCooldown(def));
    return { ok: true, hits: [], debuffLogs, supportLogs: [`${member.name} throws a crippling mixture.`] };
  }

  if (pattern === "all_foes_debuff" && row?.debuff) {
    const living = st.foes.filter((f) => f.hp > 0);
    if (!living.length) return { ok: false, error: "No enemies to hit." };
    for (const foe of living) {
      const msg = tryRollFoeDebuff(st, foe, row.debuff, actor, rng);
      if (msg) debuffLogs.push(msg);
    }
    setSkillCooldown(st, skillName, getSkillCooldown(def));
    return { ok: true, hits: [], debuffLogs };
  }

  if (AOE_PATTERNS.has(pattern)) {
    const living = st.foes.filter((f) => f.hp > 0);
    if (!living.length) return { ok: false, error: "No enemies to hit." };
    const aoeAdj = typeof row?.aoeAdj === "number" ? row.aoeAdj : 1;
    for (const foe of living) {
      const res =
        DAMAGE_PATTERNS.has(pattern) || def.damageKind
          ? resolveSkillHit(actor, foe, def, row || {}, rng, st, member, { skillName })
          : resolveOutgoingAttack(actor, foe, rng, st, member);
      let dmg = res.missed ? 0 : Math.max(1, Math.floor(res.damage * (0.85 + aoeAdj * 0.05)));
      if (living.length > 2) dmg = Math.max(1, Math.floor(dmg * 0.85));
      hits.push({ foeUid: foe.uid, damage: dmg, missed: res.missed, crit: res.crit });
      if (!res.missed && row?.debuff) {
        const msg = tryRollFoeDebuff(st, foe, row.debuff, actor, rng);
        if (msg) debuffLogs.push(msg);
      }
    }
    setSkillCooldown(st, skillName, getSkillCooldown(def));
    consumeSpellPrepOnMagicalSkill(st, def);
    return { ok: true, hits, aoe: true, debuffLogs };
  }

  if (pattern === "twin_jab") {
    const foe = st.foes.find((f) => f.uid === targetUid && f.hp > 0);
    if (!foe) return { ok: false, error: "Select a living enemy." };
    const hitCount = def.twinHits || row?.hits || 2;
    for (let i = 0; i < hitCount; i++) {
      if (foe.hp <= 0) break;
      const res = resolveSkillHit(actor, foe, def, row || {}, rng, st, member, { skillName });
      hits.push({
        foeUid: foe.uid,
        damage: res.missed ? 0 : res.damage,
        missed: res.missed,
        crit: res.crit
      });
    }
    setSkillCooldown(st, skillName, getSkillCooldown(def));
    consumeSpellPrepOnMagicalSkill(st, def);
    return { ok: true, hits, debuffLogs };
  }

  if (DAMAGE_PATTERNS.has(pattern) || def.damageKind) {
    const foe = st.foes.find((f) => f.uid === targetUid && f.hp > 0);
    if (!foe) return { ok: false, error: "Select a living enemy." };
    const res = resolveSkillHit(actor, foe, def, row || {}, rng, st, member, {
      skillName,
      execute: pattern === "execute_skill" || pattern === "final_measure"
    });
    if (!res.missed && row?.debuff) {
      const msg = tryRollFoeDebuff(st, foe, row.debuff, actor, rng);
      if (msg) debuffLogs.push(msg);
    }
    hits.push({
      foeUid: foe.uid,
      damage: res.missed ? 0 : res.damage,
      missed: res.missed,
      crit: res.crit
    });
    setSkillCooldown(st, skillName, getSkillCooldown(def));
    consumeSpellPrepOnMagicalSkill(st, def);
    return { ok: true, hits, debuffLogs };
  }

  return { ok: false, error: `${skillName} is not yet supported in online combat.` };
}

export function initCombatResources(st, player) {
  st.skillCooldowns = {};
  if (isCoopMultiHeroStamina(st)) return;
  const heroMax = getActorCombatMaxStamina(player);
  st.stamina = heroMax;
  st.maxStamina = heroMax;
  st.party.forEach((m) => {
    if (!m) return;
    if (m.kind === "hero") {
      m.stamina = heroMax;
      m.maxStamina = heroMax;
      return;
    }
    const comp = Number.isFinite(m.companionSlotIndex) ? player.companions?.[m.companionSlotIndex] : null;
    const compMax = comp ? getActorCombatMaxStamina(comp) : heroMax;
    m.stamina = compMax;
    m.maxStamina = compMax;
  });
}

export function skillTargetMode(skillName) {
  if (isClassOnlyBuffSkill(skillName)) {
    if (skillName === "Heal") return "self";
    return "self";
  }
  const def = getSkillDef(skillName);
  const pattern = def?.pattern || "";
  if (
    ALLY_SUPPORT_PATTERNS.has(pattern) ||
    pattern === "heal_ally" ||
    pattern === "regrowth" ||
    pattern === "guard_ally"
  ) {
    return "ally";
  }
  if (pattern === "heal_all" || pattern === "rev_pulse" || pattern === "taunt_all") return "party";
  if (
    pattern === "brace" ||
    pattern === "flow_step" ||
    pattern === "smoke_step" ||
    pattern === "spell_preparation" ||
    pattern === "overload" ||
    pattern === "blood_price" ||
    pattern === "sanctuary_party"
  ) {
    return "self";
  }
  if (pattern === "spread_contagion") return "enemy";
  if (pattern === "arcane_collapse" || pattern === "earthbreaker" || pattern === "bleeding_flourish") {
    return "enemy";
  }
  if (pattern === "event_horizon") return "party";
  if (pattern === "crippling_mixture") return "enemy";
  return "enemy";
}

export { tickSkillCooldowns, getSkillStaminaCost, getSkillDef, isSkillSlotted };
