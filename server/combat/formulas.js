import { getEnemyDefByName, loadGameConfig } from "../load_game_config.js";
import { sumEquippedBonusStats } from "../progression/equipment_stats.js";
import { buildEnemySpawnStats } from "./monster_stats.js";
import {
  getFoeEvasionPenalty,
  getFoeMagicResist,
  getFoePhysResist,
  getPlayerAccuracyPenaltyPct,
  getPlayerDamageDownPct
} from "./status.js";
import { isCompanionEnabledForCombat } from "./player_prep.js";

export { sumEquippedBonusStats };

function getStatSystem() {
  const cfg = loadGameConfig();
  return cfg && cfg.statSystem && typeof cfg.statSystem === "object" ? cfg.statSystem : {};
}

function attribBonusPer10(val) {
  const n = Math.max(0, Number(val) || 0);
  return Math.floor(n / 10);
}

function formulaStrPhysicalDamageBonusPct(str) {
  return Math.max(0, Math.floor((Number(str) || 0) * 0.8));
}

function formulaDexCritChancePct(dex) {
  return Math.min(50, Math.max(0, Math.floor((Number(dex) || 0) * 0.35)));
}

function formulaDexCritDamageBonusPct(dex) {
  return Math.min(80, Math.max(0, Math.floor((Number(dex) || 0) * 0.25)));
}

export function totalStat(actor, key) {
  const base = typeof actor[key] === "number" ? actor[key] : 10;
  const gear = sumEquippedBonusStats(actor.equipment);
  return base + (gear[key] || 0);
}


export function getActorDamage(actor) {
  const str = totalStat(actor, "str");
  const gear = sumEquippedBonusStats(actor.equipment);
  let atk = (typeof actor.baseAttack === "number" ? actor.baseAttack : 10) + Math.floor(str / 2);
  atk += gear.physDamage || 0;
  return Math.max(1, Math.floor(atk));
}

export function getFoeEvasionPct(foe) {
  const dex = typeof foe.dex === "number" ? foe.dex : 0;
  return Math.min(40, attribBonusPer10(dex) * 2);
}

export function resolveOutgoingMagic(actor, foe, rng, baseDamage) {
  const sys = getStatSystem();
  const minH = typeof sys.minHitChancePct === "number" ? sys.minHitChancePct : 15;
  const maxH = typeof sys.maxHitChancePct === "number" ? sys.maxHitChancePct : 100;
  const dex = totalStat(actor, "dex");
  const int = totalStat(actor, "int");
  const gear = sumEquippedBonusStats(actor.equipment);
  const acc = attribBonusPer10(dex) + attribBonusPer10(int) + (gear.accuracy || 0);
  const hitPct = Math.min(maxH, Math.max(minH, acc - getFoeEvasionPct(foe)));
  if (!rng.chance(hitPct)) return { damage: 0, missed: true, crit: false };

  let d1 = Math.max(1, baseDamage);
  d1 *= 1 + (Math.floor(int * 0.5) + (gear.skillPower || 0)) / 100;

  const critChance = formulaDexCritChancePct(dex) + (gear.crit || 0);
  const crit = rng.chance(critChance);
  const baseCrit = typeof sys.baseCritMultiplierPct === "number" ? sys.baseCritMultiplierPct : 150;
  let d2 = crit ? d1 * ((baseCrit + formulaDexCritDamageBonusPct(dex)) / 100) : d1;
  const mr = typeof foe.magicResist === "number" ? foe.magicResist : 0;
  let fin = Math.max(1, Math.floor(d2 * (1 - mr / 100)));
  return { damage: fin, missed: false, crit };
}

function getActorAccuracyBonus(actor, member) {
  const fromMember = member?.buffAccTurns > 0 ? Math.max(0, Math.floor(member.buffAccPct || 0)) : 0;
  return fromMember;
}

export function resolveOutgoingAttack(actor, foe, rng, st, member) {
  const sys = getStatSystem();
  const minH = typeof sys.minHitChancePct === "number" ? sys.minHitChancePct : 15;
  const maxH = typeof sys.maxHitChancePct === "number" ? sys.maxHitChancePct : 100;
  const dex = totalStat(actor, "dex");
  const int = totalStat(actor, "int");
  const gear = sumEquippedBonusStats(actor.equipment);
  const acc =
    attribBonusPer10(dex) +
    attribBonusPer10(int) +
    (gear.accuracy || 0) +
    getActorAccuracyBonus(actor, member);
  const accPenalty = st ? getPlayerAccuracyPenaltyPct(st) : 0;
  const evaPenalty = getFoeEvasionPenalty(foe);
  const hitPct = Math.min(maxH, Math.max(minH, acc - getFoeEvasionPct(foe) - accPenalty + evaPenalty));
  if (!rng.chance(hitPct)) return { damage: 0, missed: true, crit: false };

  const str = totalStat(actor, "str");
  let d1 = getActorDamage(actor);
  d1 *= 1 + (formulaStrPhysicalDamageBonusPct(str) + (gear.physDamage || 0)) / 100;

  const critChance = formulaDexCritChancePct(dex) + (gear.crit || 0);
  const crit = rng.chance(critChance);
  const baseCrit = typeof sys.baseCritMultiplierPct === "number" ? sys.baseCritMultiplierPct : 150;
  let d2 = d1;
  if (crit) {
    d2 = d1 * ((baseCrit + formulaDexCritDamageBonusPct(dex) + (gear.critDamage || 0)) / 100);
  }
  const pen = Math.min(50, Math.floor(str * 0.4));
  const res = getFoePhysResist(foe);
  const effRes = Math.max(0, res - pen);
  const dmgDown = st ? getPlayerDamageDownPct(st, "physical") : 0;
  let fin = Math.max(1, Math.floor(d2 * (1 - effRes / 100) * (1 - dmgDown / 100)));
  return { damage: fin, missed: false, crit };
}

export function getFoeAttackDamage(foe) {
  const level = typeof foe.level === "number" && foe.level > 0 ? Math.floor(foe.level) : 1;
  const str = typeof foe.str === "number" ? foe.str : 10;
  const mult = typeof foe.moodAttackMult === "number" ? foe.moodAttackMult : 1;
  const taken = typeof foe.damageTakenMult === "number" ? foe.damageTakenMult : 1;
  return Math.max(1, Math.floor((level * 2.5 + str * 0.5) * mult));
}

export function applyDamageToFoe(foe, rawDamage) {
  const taken = typeof foe.damageTakenMult === "number" ? foe.damageTakenMult : 1;
  const dmg = Math.max(0, Math.floor(rawDamage * taken));
  foe.hp = Math.max(0, foe.hp - dmg);
  return dmg;
}

export function resolveIncomingToMember(rawDamage, member) {
  const armor = typeof member.flatArmor === "number" ? member.flatArmor : 0;
  const mitigated = Math.max(1, Math.floor(rawDamage - armor * 0.35));
  return mitigated;
}

export function buildFoeFromUnit(unit, uid) {
  const def = getEnemyDefByName(unit.name);
  if (!def) return null;
  const level = typeof unit.level === "number" && unit.level > 0 ? Math.floor(unit.level) : 5;
  const isBoss = unit.isBoss === true || def.isBoss === true;
  const { stats, hp } = buildEnemySpawnStats(level, def, { isBoss });
  const moodAttackMult = unit.moodId ? 1.08 : 1;
  const foe = {
    uid,
    name: unit.name,
    level,
    hp,
    maxHp: hp,
    str: stats.str,
    dex: stats.dex,
    int: stats.int,
    vit: stats.vit,
    physResist: 0,
    magicResist: 0,
    moodId: unit.moodId || null,
    moodAttackMult,
    damageTakenMult: 1,
    isBoss: unit.isBoss === true || def.isBoss === true,
    image: unit.portraitImage || def.image || "",
    combatScript: def.combatScript || null
  };
  return foe;
}

export function buildPartyFromPlayer(player) {
  const party = [
    {
      uid: 0,
      kind: "hero",
      name: player.name || "Hero",
      hp: Math.min(player.hp, player.maxHp),
      maxHp: player.maxHp,
      dex: totalStat(player, "dex"),
      flatArmor: 0,
      acted: false,
      companionSlotIndex: null
    }
  ];
  let uid = 1;
  if (Array.isArray(player.companions)) {
    player.companions.forEach((comp, slotIdx) => {
      if (!isCompanionEnabledForCombat(comp, slotIdx)) return;
      const maxHp = typeof comp.maxHp === "number" ? comp.maxHp : 80;
      party.push({
        uid: uid++,
        kind: "companion",
        name: comp.name || `Companion ${slotIdx + 1}`,
        hp: Math.max(1, Math.min(maxHp, comp.hp || maxHp)),
        maxHp,
        dex: totalStat(comp, "dex"),
        flatArmor: 0,
        acted: false,
        companionSlotIndex: slotIdx
      });
    });
  }
  return party;
}
