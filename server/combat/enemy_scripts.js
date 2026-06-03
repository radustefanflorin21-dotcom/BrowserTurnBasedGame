import { createRequire } from "node:module";
import { getEnemyCombatRoleKey } from "./monster_stats.js";
import { getEnemyDefByName } from "../load_game_config.js";
import {
  applyPartyMemberBlind,
  applyPartyMemberCripple,
  applyPlayerAccuracyDown,
  applyPlayerBleed,
  applyPlayerPoison,
  applyPlayerBurn,
  extendPlayerDebuffDurations,
  ensureCombatStatus
} from "./status.js";
import { spawnMirageRemnantUncapped, spawnReinforcement } from "./dungeon_mechanics.js";

const require = createRequire(import.meta.url);
const { inferMonsterCombatRole } = require("../../shared/monster_roles.js");

/** @returns {boolean} true if a script handled the turn */
export function runEnemyScriptTurn(scriptId, foe, st, ctx) {
  const fn = SCRIPT_HANDLERS[scriptId];
  if (fn) return fn(foe, st, ctx);
  return runRoleFallbackTurn(scriptId, foe, st, ctx);
}

function countMirageRemnants(st) {
  return (st.foes || []).filter((f) => f && f.hp > 0 && f.name === "Mirage Remnant").length;
}

function lowestHpAlly(st, excludeUid) {
  const allies = (st.foes || []).filter((f) => f && f.hp > 0 && f.uid !== excludeUid);
  if (!allies.length) return null;
  return allies.reduce((a, b) => (a.hp / Math.max(1, a.maxHp) <= b.hp / Math.max(1, b.maxHp) ? a : b));
}

function grantFoeAbsorb(foe, amount, turns) {
  if (!foe.combat) return;
  foe.combat.absorbHp = Math.max(foe.combat.absorbHp || 0, Math.max(1, Math.floor(amount)));
  foe.combat.absorbTurns = Math.max(foe.combat.absorbTurns || 0, Math.max(1, Math.floor(turns)));
}

function setFoeMitigation(foe, turns, mult) {
  if (!foe.combat) return;
  foe.combat.mitigationTurns = Math.max(foe.combat.mitigationTurns || 0, turns);
  foe.combat.mitigationMult = mult;
}

function setFoeReflect(foe, turns, frac) {
  if (!foe.combat) return;
  foe.combat.reflectTurns = Math.max(foe.combat.reflectTurns || 0, turns);
  foe.combat.reflectFrac = frac;
}

function rollBlindAll(st, ctx, chance, pct, turns) {
  for (const m of (st.party || []).filter((x) => x && x.hp > 0)) {
    if (ctx.rng.chance(chance)) applyPartyMemberBlind(st, m, pct, turns);
  }
}

function isMemberBlinded(st, member) {
  if (!member) return false;
  if (member.kind === "hero") return (st.status?.playerOutgoingAccuracyDownTurns || 0) > 0;
  return (member.outgoingAccuracyDownTurns || 0) > 0;
}

function runRoleFallbackTurn(scriptId, foe, st, ctx) {
  const def = getEnemyDefByName(foe.name);
  const role = getEnemyCombatRoleKey(def) || inferMonsterCombatRole(scriptId);
  const member = ctx.pickTarget(role === "tank" || role === "bruiser" ? "bruiser" : role);
  if (!member) return true;

  const hpFrac = ctx.foeHpFrac();
  const specials = ROLE_ROTATIONS[role] || ROLE_ROTATIONS.bruiser;

  for (const ab of specials) {
    if (!ctx.ready(ab.key)) continue;
    if (ab.hpBelow != null && hpFrac >= ab.hpBelow) continue;
    if (ab.hpAbove != null && hpFrac <= ab.hpAbove) continue;
    if (ab.minAct != null && (foe.combat.actCount || 0) < ab.minAct) continue;

    ctx.setCd(ab.key, ab.cd || 2);
    if (ab.type === "log") {
      ctx.log(`${foe.name} uses ${ab.label || "a special ability"}.`);
      return true;
    }
    if (ab.type === "heal") {
      ctx.healSelf(ab.healPct || 0.12);
      ctx.log(`${foe.name} uses ${ab.label || "Recovery"}.`);
      return true;
    }
    const mult = ab.mult ?? 0.85;
    const verb = ab.verb || "strikes";
    ctx.hit(member, ctx.atk * mult * ctx.outMult, verb);
    return true;
  }

  ctx.hit(member, ctx.atk * (role === "assassin" ? 0.95 : 0.8) * ctx.outMult, "hits");
  return true;
}

const ROLE_ROTATIONS = {
  bruiser: [
    { key: "power", cd: 2, mult: 1.15, verb: "slams", type: "attack" },
    { key: "basic", cd: 0, mult: 0.85, verb: "hits", type: "attack" }
  ],
  assassin: [
    { key: "strike", cd: 2, mult: 1.1, verb: "strikes", type: "attack" },
    { key: "basic", cd: 0, mult: 0.75, verb: "hits", type: "attack" }
  ],
  mage: [
    { key: "blast", cd: 2, mult: 0.88, verb: "blasts", type: "attack" },
    { key: "basic", cd: 0, mult: 0.62, verb: "casts at", type: "attack" }
  ],
  controller: [
    { key: "disrupt", cd: 2, type: "log", label: "a disruptive technique" },
    { key: "jab", cd: 1, mult: 0.62, verb: "jabs", type: "attack" },
    { key: "basic", cd: 0, mult: 0.55, verb: "nips", type: "attack" }
  ],
  tank: [
    { key: "hide", cd: 3, hpBelow: 0.6, type: "log", label: "a defensive stance" },
    { key: "bash", cd: 2, mult: 0.9, verb: "rams", type: "attack" },
    { key: "basic", cd: 0, mult: 0.72, verb: "hits", type: "attack" }
  ],
  support: [
    { key: "mend", cd: 3, hpBelow: 0.55, type: "heal", healPct: 0.1, label: "Recovery" },
    { key: "poke", cd: 2, mult: 0.5, verb: "pokes", type: "attack" },
    { key: "basic", cd: 0, mult: 0.45, verb: "hits", type: "attack" }
  ],
  summoner: [
    { key: "chant", cd: 4, type: "log", label: "a summoning chant" },
    { key: "blast", cd: 2, mult: 0.7, verb: "strikes", type: "attack" },
    { key: "basic", cd: 0, mult: 0.6, verb: "hits", type: "attack" }
  ]
};

const SCRIPT_HANDLERS = {
  burrow_hare(foe, st, ctx) {
    const member = ctx.pickTarget("controller");
    const hpFrac = ctx.foeHpFrac();
    if (hpFrac < 0.5 && ctx.ready("burrow_instinct")) {
      ctx.setCd("burrow_instinct", 3);
      ctx.log(`${foe.name} uses Burrow Instinct (+20% evasion).`);
      return true;
    }
    if (ctx.ready("dust_flick")) {
      ctx.setCd("dust_flick", 2);
      applyPlayerAccuracyDown(st, 15, 2);
      ctx.log(`${foe.name} throws Dust Flick (-15% accuracy).`);
      return true;
    }
    if (ctx.ready("bleed_scratch")) {
      ctx.setCd("bleed_scratch", 2);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.62 * ctx.outMult));
      ctx.hit(member, hit, "Bleed Scratches");
      applyPlayerBleed(st, Math.max(1, Math.floor(hit * 0.3)), 2);
      ctx.log("Bleeding worsens.");
      return true;
    }
    ctx.hit(member, ctx.atk * 0.55 * ctx.outMult, "nips");
    return true;
  },

  plains_raptor(foe, st, ctx) {
    const member = ctx.pickTarget("bruiser");
    foe.combat.raptorActCount = (foe.combat.raptorActCount || 0) + 1;
    const hero = st.party?.find((m) => m?.kind === "hero");
    const fullHp = hero && hero.maxHp > 0 && hero.hp >= hero.maxHp * 0.99;

    if (ctx.ready("pounce") && foe.combat.raptorActCount === 1) {
      const mul = fullHp ? 1.5 : 1;
      ctx.setCd("pounce", 2);
      ctx.hit(member, ctx.atk * mul * ctx.outMult, "Pounces");
      return true;
    }
    if (ctx.ready("claw_rend")) {
      ctx.setCd("claw_rend", 1);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.82 * ctx.outMult));
      ctx.hit(member, hit, "Claw Rends");
      applyPlayerBleed(st, Math.max(1, Math.floor(ctx.atk * 0.12)), 2);
      ctx.log("You are bleeding.");
      return true;
    }
    if (ctx.ready("predator_focus") && foe.combat.raptorActCount >= 2) {
      ctx.setCd("predator_focus", 3);
      ctx.log(`${foe.name} uses Predator Focus.`);
      return true;
    }
    if (ctx.ready("pounce")) {
      const mul = fullHp ? 1.5 : 1;
      ctx.setCd("pounce", 2);
      ctx.hit(member, ctx.atk * mul * ctx.outMult, "Pounces");
      return true;
    }
    ctx.hit(member, ctx.atk * ctx.outMult, "hits");
    return true;
  },

  grass_snake(foe, st, ctx) {
    const member = ctx.pickTarget("mage");
    if (ctx.ready("constriction")) {
      ctx.setCd("constriction", 3);
      ctx.log(`${foe.name} Constricts you (-combo chance).`);
      return true;
    }
    if (ctx.ready("venom_burst")) {
      ctx.setCd("venom_burst", 2);
      const hero = st.party?.find((m) => m?.kind === "hero");
      const dot = hero ? Math.max(2, Math.floor((hero.maxHp * 0.08) / 3)) : 3;
      applyPlayerPoison(st, dot, 3);
      ctx.log(`${foe.name} uses Venom Burst.`);
      return true;
    }
    ctx.hit(member, ctx.atk * 0.65 * ctx.outMult, "bites");
    return true;
  },

  tusk_boar(foe, st, ctx) {
    const member = ctx.pickTarget("tank");
    const hpFrac = ctx.foeHpFrac();
    if (ctx.ready("thick_hide") && hpFrac < 0.6) {
      ctx.setCd("thick_hide", 3);
      ctx.log(`${foe.name} uses Thick Hide.`);
      return true;
    }
    if (ctx.ready("war_boar_taunt")) {
      ctx.setCd("war_boar_taunt", 4);
      ctx.log(`${foe.name} uses War Boar Taunt.`);
      return true;
    }
    if (ctx.ready("gore_charge")) {
      ctx.setCd("gore_charge", 2);
      ctx.hit(member, ctx.atk * 1.2 * ctx.outMult, "Gore Charges");
      ensureCombatStatus(st);
      st.status.playerFragileTurns = Math.max(st.status.playerFragileTurns || 0, 3);
      return true;
    }
    ctx.hit(member, ctx.atk * 0.75 * ctx.outMult, "charges");
    return true;
  },

  field_wolf(foe, st, ctx) {
    const member = ctx.pickTarget("assassin");
    if (!foe.combat.wolfHowlDone && ctx.ready("pack_howl")) {
      foe.combat.wolfHowlDone = true;
      ctx.setCd("pack_howl", 5);
      ctx.log(`${foe.name} howls (Pack Howl).`);
      return true;
    }
    if (ctx.ready("savage_bite")) {
      ctx.setCd("savage_bite", 2);
      ctx.hit(member, ctx.atk * 1.05 * ctx.outMult, "Savage Bites");
      return true;
    }
    ctx.hit(member, ctx.atk * 0.88 * ctx.outMult, "bites");
    return true;
  },

  tide_hopper(foe, st, ctx) {
    const member = ctx.pickTarget("controller");
    if (ctx.ready("splash")) {
      ctx.setCd("splash", 2);
      ctx.hit(member, ctx.atk * 0.7 * ctx.outMult, "Splashes");
      return true;
    }
    if (ctx.ready("hop_strike")) {
      ctx.setCd("hop_strike", 1);
      ctx.hit(member, ctx.atk * 0.95 * ctx.outMult, "Hops into");
      return true;
    }
    ctx.hit(member, ctx.atk * 0.6 * ctx.outMult, "nips");
    return true;
  },

  hermit_crab(foe, st, ctx) {
    const member = ctx.pickTarget("tank");
    if (ctx.foeHpFrac() < 0.5 && ctx.ready("shell_up")) {
      ctx.setCd("shell_up", 3);
      ctx.log(`${foe.name} retreats into its shell.`);
      return true;
    }
    if (ctx.ready("pinch")) {
      ctx.setCd("pinch", 2);
      ctx.hit(member, ctx.atk * 0.85 * ctx.outMult, "Pinches");
      return true;
    }
    ctx.hit(member, ctx.atk * 0.7 * ctx.outMult, "clacks at");
    return true;
  },

  drowned_channeler(foe, st, ctx) {
    const member = ctx.pickTarget("mage");
    if (ctx.ready("abyss_bind")) {
      ctx.setCd("abyss_bind", 3);
      const dur = Math.max(1, Math.round(2 + Math.floor((foe.int || 0) / 40)));
      applyPlayerAccuracyDown(st, 15, dur);
      ctx.log(`${foe.name} casts Abyss Bind (-15% accuracy, ${dur}t).`);
      return true;
    }
    if (ctx.ready("tidal_surge")) {
      ctx.setCd("tidal_surge", 2);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.9 * ctx.outMult));
      ctx.hit(member, hit, "Tidal Surge crashes over");
      extendPlayerDebuffDurations(st, 1);
      ctx.log(`${foe.name} extends your debuffs by 1 turn.`);
      return true;
    }
    ctx.hit(member, ctx.atk * 0.7 * ctx.outMult, "lashes");
    return true;
  },

  tidemother_aberration(foe, st, ctx) {
    ensureCombatStatus(st);
    st.status.playerStaminaCostUpTurns = Math.max(st.status.playerStaminaCostUpTurns || 0, 1);
    st.status.playerStaminaCostUpPct = Math.max(st.status.playerStaminaCostUpPct || 0, 6);
    const member = ctx.pickTarget("highest_damage");
    if (ctx.ready("crushing_undertow")) {
      ctx.setCd("crushing_undertow", 2);
      ctx.hit(member, ctx.atk * ctx.outMult, "Crushing Undertow engulfs");
      st.status.playerStaminaCostUpTurns = Math.max(st.status.playerStaminaCostUpTurns || 0, 2);
      st.status.playerStaminaCostUpPct = Math.max(st.status.playerStaminaCostUpPct || 0, 10);
      return true;
    }
    ctx.hit(member, ctx.atk * 0.9 * ctx.outMult, "batters");
    return true;
  },

  stormwake_leviathan(foe, st, ctx) {
    const member = ctx.pickTarget("tank");
    const hpFrac = ctx.foeHpFrac();
    if (hpFrac <= 0.3 && ctx.ready("maelstrom")) {
      ctx.setCd("maelstrom", 4);
      ctx.hit(member, ctx.atk * 1.2 * ctx.outMult, "Maelstrom strikes");
      applyPlayerBurn(st, Math.max(2, Math.floor((foe.int || 20) * 0.15)), 2);
      ctx.log("Searing storm burn!");
      return true;
    }
    if (hpFrac <= 0.6 && ctx.ready("storm_lash")) {
      ctx.setCd("storm_lash", 2);
      ctx.hit(member, ctx.atk * 1.05 * ctx.outMult, "Storm Lash cracks");
      return true;
    }
    ctx.hit(member, ctx.atk * 0.85 * ctx.outMult, "surges into");
    return true;
  },

  greenleaf_squirrel(foe, st, ctx) {
    const member = ctx.pickTarget("assassin");
    if (ctx.ready("nut_barrage")) {
      ctx.setCd("nut_barrage", 2);
      ctx.hit(member, ctx.atk * 0.55 * ctx.outMult, "Pelts you with nuts");
      return true;
    }
    ctx.hit(member, ctx.atk * 0.5 * ctx.outMult, "scratches");
    return true;
  },

  rock_marmot(foe, st, ctx) {
    const member = ctx.pickTarget("tank");
    if (ctx.foeHpFrac() < 0.5 && ctx.ready("burrow")) {
      ctx.setCd("burrow", 3);
      ctx.log(`${foe.name} burrows defensively.`);
      return true;
    }
    if (ctx.ready("stone_hurl")) {
      ctx.setCd("stone_hurl", 2);
      ctx.hit(member, ctx.atk * 0.95 * ctx.outMult, "Hurls a stone at");
      return true;
    }
    ctx.hit(member, ctx.atk * 0.72 * ctx.outMult, "bites");
    return true;
  },

  bramblehorn_matriarch(foe, st, ctx) {
    const allies = (st.foes || []).filter((f) => f && f.hp > 0 && f.uid !== foe.uid);
    const lowest = allies.reduce(
      (a, b) => (a && b && a.hp / a.maxHp <= b.hp / b.maxHp ? a : b),
      allies[0]
    );
    if (lowest && ctx.ready("rootmend")) {
      ctx.setCd("rootmend", 3);
      const heal = Math.max(1, Math.floor((foe.vit || 20) * 0.85));
      lowest.hp = Math.min(lowest.maxHp, lowest.hp + heal);
      ctx.log(`${foe.name} casts Rootmend on ${lowest.name}.`);
      return true;
    }
    const member = ctx.pickTarget("mage");
    if (ctx.ready("thorn_prayer")) {
      ctx.setCd("thorn_prayer", 4);
      applyPlayerAccuracyDown(st, 8, 2);
      ctx.log(`${foe.name} casts Thorn Prayer.`);
      return true;
    }
    if (ctx.ready("rootlash")) {
      ctx.setCd("rootlash", 1);
      ctx.hit(member, Math.max(1, Math.floor((foe.int || 20) * 0.4 * ctx.outMult)), "casts Rootlash at");
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor((foe.int || 20) * 0.35 * ctx.outMult)), "strikes");
    return true;
  },

  fangroot_alpha(foe, st, ctx) {
    const member = ctx.pickTarget("assassin");
    if (ctx.ready("alpha_lunge")) {
      ctx.setCd("alpha_lunge", 2);
      ctx.hit(member, ctx.atk * 1.1 * ctx.outMult, "Alpha Lunges at");
      return true;
    }
    if (ctx.ready("rootfang_rend")) {
      ctx.setCd("rootfang_rend", 2);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.75 * ctx.outMult));
      ctx.hit(member, hit, "Rootfang Rends");
      applyPlayerBleed(st, Math.max(1, Math.floor(hit * 0.14)), 2);
      return true;
    }
    ctx.hit(member, ctx.atk * 0.55 * ctx.outMult, "strikes");
    return true;
  },

  gaiahide_behemoth(foe, st, ctx) {
    const member = ctx.pickTarget("tank");
    const hpFrac = ctx.foeHpFrac();
    if (hpFrac <= 0.7 && !foe.combat.gaiaPhase2) {
      foe.combat.gaiaPhase2 = true;
      foe.combat.physResBonusPct = (foe.combat.physResBonusPct || 0) + 8;
      foe.combat.magResBonusPct = (foe.combat.magResBonusPct || 0) + 5;
      ctx.log(`${foe.name} gains Root Armor (+resist).`);
      return true;
    }
    if (hpFrac <= 0.35 && !foe.combat.gaiaPhase3) {
      foe.combat.gaiaPhase3 = true;
      foe.combat.outgoingDamageBonusPct = (foe.combat.outgoingDamageBonusPct || 0) + 10;
      ctx.log(`${foe.name} enters Gaia Fury!`);
      return true;
    }
    if (ctx.ready("gaiahide_slam")) {
      ctx.setCd("gaiahide_slam", 2);
      ctx.hit(member, ctx.atk * 1.05 * ctx.outMult, "Gaiahide Slams");
      return true;
    }
    if (ctx.ready("rootquake")) {
      ctx.setCd("rootquake", 3);
      ctx.hit(member, ctx.atk * 0.65 * ctx.outMult, "Rootquake shakes");
      return true;
    }
    ctx.hit(member, ctx.atk * 0.65 * ctx.outMult, "crushes");
    return true;
  },

  thornback_graveguard(foe, st, ctx) {
    const member = ctx.pickTarget("tank");
    if (ctx.ready("grave_shell")) {
      ctx.setCd("grave_shell", 3);
      setFoeMitigation(foe, 2, 0.88);
      setFoeReflect(foe, 2, 0.1);
      ctx.log(`${foe.name} raises Grave Shell (+resist, reflect).`);
      return true;
    }
    if (ctx.ready("thorn_challenge")) {
      ctx.setCd("thorn_challenge", 4);
      if (ctx.rng.chance(0.55)) {
        foe.combat.tauntPlayerTurns = Math.max(foe.combat.tauntPlayerTurns || 0, 1);
      }
      setFoeMitigation(foe, 1, 0.88);
      ctx.log(`${foe.name} issues Thorn Challenge.`);
      return true;
    }
    const lowest = lowestHpAlly(st, foe.uid);
    if (lowest && ctx.ready("splinter_guard")) {
      ctx.setCd("splinter_guard", 4);
      grantFoeAbsorb(lowest, Math.max(1, Math.floor((foe.vit || 20) * 0.65)), 2);
      ctx.log(`${foe.name} shields ${lowest.name} with Splinter Guard.`);
      return true;
    }
    if (ctx.ready("bone_impale")) {
      ctx.setCd("bone_impale", 2);
      const hit = Math.max(1, Math.floor((foe.str || 20) * 0.85 * ctx.outMult));
      ctx.hit(member, hit, "Bone Impales");
      if (ctx.rng.chance(0.45)) applyPlayerBleed(st, Math.max(1, Math.floor(hit * 0.12)), 2);
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor((foe.str || 20) * 0.45 * ctx.outMult)), "strikes");
    return true;
  },

  mirage_maw(foe, st, ctx) {
    const member = ctx.pickTarget("controller");
    if (ctx.ready("splitting_mirage")) {
      ctx.setCd("splitting_mirage", 3);
      foe.combat.evadeNextChance = Math.max(foe.combat.evadeNextChance || 0, 0.28);
      foe.combat.splitMirageBlindOnDodge = true;
      ctx.log(`${foe.name} splits into mirages (+evasion).`);
      return true;
    }
    if (ctx.ready("thirsting_haze")) {
      ctx.setCd("thirsting_haze", 3);
      rollBlindAll(st, ctx, 0.5, 8, 2);
      ctx.log(`${foe.name} spreads Thirsting Haze.`);
      return true;
    }
    if (ctx.ready("mirage_lock")) {
      ctx.setCd("mirage_lock", 4);
      const dur = isMemberBlinded(st, member) ? 3 : 2;
      if (ctx.rng.chance(0.45)) applyPartyMemberCripple(st, member, dur);
      ctx.log(`${foe.name} locks ${member?.name || "a fighter"} in mirage sand.`);
      return true;
    }
    if (ctx.ready("false_wound")) {
      ctx.setCd("false_wound", 2);
      const hit = Math.max(1, Math.floor((foe.int || 20) * 0.55 * ctx.outMult));
      ctx.hit(member, hit, "False Wounds");
      if (ctx.rng.chance(0.45)) applyPartyMemberCripple(st, member, 1);
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor((foe.int || 20) * 0.4 * ctx.outMult)), "mirage-strikes");
    return true;
  },

  mirage_remnant(foe, st, ctx) {
    const member = ctx.pickTarget("controller");
    if (ctx.ready("vanish")) {
      ctx.setCd("vanish", 3);
      foe.combat.evadeNextChance = Math.max(foe.combat.evadeNextChance || 0, 0.18);
      ctx.log(`${foe.name} Vanishes into heat haze.`);
      return true;
    }
    const hit = Math.max(1, Math.floor((foe.int || 20) * 0.35 * ctx.outMult));
    ctx.hit(member, hit, "Mirage Scratches");
    if (ctx.rng.chance(0.35)) applyPartyMemberBlind(st, member, 5, 1);
    return true;
  },

  dune_mourner(foe, st, ctx) {
    const member = ctx.pickTarget("mage");
    const hpFrac = ctx.foeHpFrac();
    if (hpFrac <= 0.7 && !foe.combat.dunePhase2) {
      foe.combat.dunePhase2 = true;
      foe.combat.duneMagicBonusPct = (foe.combat.duneMagicBonusPct || 0) + 8;
      ctx.log(`${foe.name} opens The Maw — Mirage Remnants answer.`);
      spawnMirageRemnantUncapped(st, ctx.rng, foe.uid);
      spawnMirageRemnantUncapped(st, ctx.rng, foe.uid);
      return true;
    }
    if (hpFrac <= 0.35 && !foe.combat.dunePhase3) {
      foe.combat.dunePhase3 = true;
      foe.combat.duneAccuracyBonusPct = (foe.combat.duneAccuracyBonusPct || 0) + 8;
      for (const m of (st.party || []).filter((x) => x && x.hp > 0)) {
        if (ctx.rng.chance(0.35)) applyPartyMemberCripple(st, m, 1);
      }
      ctx.log(`${foe.name} enters Nothing Left — starvation pulses through the party.`);
      return true;
    }
    const magicMult = 1 + (foe.combat.duneMagicBonusPct || 0) / 100;
    const accMult = 1 + (foe.combat.duneAccuracyBonusPct || 0) / 100;
    const intv = foe.int || 20;
    if (ctx.ready("open_the_maw")) {
      ctx.setCd("open_the_maw", 5);
      if (countMirageRemnants(st) >= 3) {
        (st.foes || []).forEach((f) => {
          if (!f || f.hp <= 0 || f.name !== "Mirage Remnant") return;
          if (!f.combat) return;
          f.combat.magicDmgBonusTurns = Math.max(f.combat.magicDmgBonusTurns || 0, 2);
          f.combat.magicDmgBonusPct = Math.max(f.combat.magicDmgBonusPct || 0, 10);
        });
        ctx.log(`${foe.name} empowers existing Mirage Remnants (+magic damage).`);
      } else {
        spawnMirageRemnantUncapped(st, ctx.rng, foe.uid);
        ctx.log(`${foe.name} opens the Maw — a Mirage Remnant emerges.`);
      }
      return true;
    }
    if (ctx.ready("mirage_burial")) {
      ctx.setCd("mirage_burial", 4);
      const living = (st.party || []).filter((m) => m && m.hp > 0);
      const primary = member || living[0];
      const others = living.filter((m) => m !== primary).slice(0, 2);
      const targets = primary ? [primary, ...others] : others;
      const dmg = Math.max(1, Math.floor(intv * 0.5 * ctx.outMult * magicMult * accMult));
      for (const t of targets) {
        ctx.hit(t, dmg, "Mirage Burials");
        if (ctx.rng.chance(0.45)) applyPartyMemberBlind(st, t, 8, 2);
        if (ctx.rng.chance(0.4)) applyPartyMemberCripple(st, t, 1);
      }
      return true;
    }
    if (ctx.ready("withering_cry")) {
      ctx.setCd("withering_cry", 3);
      rollBlindAll(st, ctx, 0.5, 8, 2);
      const dmg = Math.max(1, Math.floor(intv * 0.45 * ctx.outMult * magicMult * accMult));
      for (const m of (st.party || []).filter((x) => x && x.hp > 0)) ctx.hit(m, dmg, "Withering Cries at");
      return true;
    }
    if (ctx.ready("drought_curse")) {
      ctx.setCd("drought_curse", 4);
      if (ctx.rng.chance(0.55)) applyPartyMemberCripple(st, member, 2);
      if (ctx.rng.chance(0.4)) applyPartyMemberBlind(st, member, 6, 2);
      ctx.log(`${foe.name} curses ${member?.name || "a fighter"} with drought.`);
      return true;
    }
    if (ctx.ready("sand_hunger")) {
      ctx.setCd("sand_hunger", 2);
      const weak = (st.party || [])
        .filter((m) => m && m.hp > 0)
        .reduce((a, b) => (a.hp / Math.max(1, a.maxHp) <= b.hp / Math.max(1, b.maxHp) ? a : b), null);
      const target = weak || member;
      const dmg = Math.max(1, Math.floor(intv * 0.6 * ctx.outMult * magicMult * accMult));
      ctx.hit(target, dmg, "Sand Hungers");
      const dotActive =
        (st.status?.playerBleed?.turns || 0) > 0 ||
        (st.status?.playerBurn?.turns || 0) > 0;
      const healPct = dotActive ? 0.45 : 0.3;
      const healed = Math.max(1, Math.floor(dmg * healPct));
      foe.hp = Math.min(foe.maxHp, foe.hp + healed);
      ctx.log(`${foe.name} drinks ${healed} HP from the sand.`);
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(intv * 0.45 * ctx.outMult * magicMult * accMult)), "sand-lashes");
    return true;
  },

  petrified_coilwarden(foe, st, ctx) {
    const member = ctx.pickTarget("controller");
    const intv = foe.int || 20;
    if (ctx.ready("petrifying_stare")) {
      ctx.setCd("petrifying_stare", 4);
      const hit = Math.max(1, Math.floor(intv * 0.5 * ctx.outMult));
      ctx.hit(member, hit, "Petrifying Stare locks onto");
      if (ctx.rng.chance(0.2)) applyPartyMemberCripple(st, member, 1);
      return true;
    }
    if (ctx.ready("stone_venom")) {
      ctx.setCd("stone_venom", 2);
      const hit = Math.max(1, Math.floor(intv * 0.45 * ctx.outMult));
      ctx.hit(member, hit, "Stone Venom bites");
      applyPlayerPoison(st, Math.max(1, Math.floor(hit * 0.12)), 3);
      return true;
    }
    if (ctx.ready("crushing_coil")) {
      ctx.setCd("crushing_coil", 3);
      const hit = Math.max(1, Math.floor((foe.str || 20) * 0.8 * ctx.outMult));
      ctx.hit(member, hit, "Crushing Coil constricts");
      if (ctx.rng.chance(0.45)) applyPartyMemberCripple(st, member, 2);
      return true;
    }
    if (ctx.ready("mineral_haze")) {
      ctx.setCd("mineral_haze", 4);
      rollBlindAll(st, ctx, 0.45, 8, 2);
      ctx.log(`${foe.name} spreads Mineral Haze.`);
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(intv * 0.35 * ctx.outMult)), "strikes");
    return true;
  },

  granitehorn_breaker(foe, st, ctx) {
    const member = ctx.pickTarget("bruiser");
    if (ctx.ready("hornbreaker_charge")) {
      ctx.setCd("hornbreaker_charge", 2);
      ctx.hit(member, Math.max(1, Math.floor((foe.str || 20) * 1.1 * ctx.outMult)), "Hornbreaker Charge smashes");
      return true;
    }
    if (ctx.ready("staggering_headbutt")) {
      ctx.setCd("staggering_headbutt", 3);
      ctx.hit(member, Math.max(1, Math.floor((foe.str || 20) * 0.85 * ctx.outMult)), "Staggering Headbutt rocks");
      if (ctx.rng.chance(0.18)) applyPartyMemberCripple(st, member, 1);
      return true;
    }
    if (ctx.ready("stonehide_rage")) {
      ctx.setCd("stonehide_rage", 4);
      foe.combat.outgoingDamageBonusPct = Math.max(foe.combat.outgoingDamageBonusPct || 0, 8);
      foe.combat.physResBonusPct = Math.max(foe.combat.physResBonusPct || 0, 8);
      foe.combat.outgoingDamageBonusTurns = Math.max(foe.combat.outgoingDamageBonusTurns || 0, 2);
      foe.combat.physResBonusTurns = Math.max(foe.combat.physResBonusTurns || 0, 2);
      ctx.log(`${foe.name} enters Stonehide Rage.`);
      return true;
    }
    if (ctx.ready("faultline_kick")) {
      ctx.setCd("faultline_kick", 3);
      ctx.hit(member, Math.max(1, Math.floor((foe.str || 20) * 0.65 * ctx.outMult)), "Faultline Kick strikes");
      if (ctx.rng.chance(0.35)) applyPartyMemberCripple(st, member, 1);
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor((foe.str || 20) * 0.6 * ctx.outMult)), "strikes");
    return true;
  },

  held_colossus(foe, st, ctx) {
    const member = ctx.pickTarget("tank");
    const hpFrac = ctx.foeHpFrac();
    const intv = foe.int || 20;
    if (hpFrac <= 0.7 && !foe.combat.colossusPhase2) {
      foe.combat.colossusPhase2 = true;
      foe.combat.physResBonusPct = (foe.combat.physResBonusPct || 0) + 8;
      foe.combat.statusResBonusPct = (foe.combat.statusResBonusPct || 0) + 6;
      ctx.log(`${foe.name} enters The Mountain Shifts.`);
      spawnReinforcement(st, "Stone Marmot", ctx.rng);
      spawnReinforcement(st, "Rock Serpent", ctx.rng);
      return true;
    }
    if (hpFrac <= 0.35 && !foe.combat.colossusPhase3) {
      foe.combat.colossusPhase3 = true;
      foe.combat.outgoingDamageBonusPct = (foe.combat.outgoingDamageBonusPct || 0) + 10;
      ctx.log(`${foe.name} releases its held breath.`);
      return true;
    }
    if (ctx.ready("colossus_slam")) {
      ctx.setCd("colossus_slam", 2);
      ctx.hit(member, Math.max(1, Math.floor((foe.str || 20) * 1.1 * ctx.outMult)), "Colossus Slam crushes");
      if (ctx.rng.chance(0.4)) applyPartyMemberCripple(st, member, 1);
      return true;
    }
    if (ctx.ready("faultquake")) {
      ctx.setCd("faultquake", 3);
      ctx.hit(member, Math.max(1, Math.floor((foe.str || 20) * 0.7 * ctx.outMult)), "Faultquake shakes");
      return true;
    }
    if (ctx.ready("stone_breath")) {
      ctx.setCd("stone_breath", 4);
      const dmg = Math.max(1, Math.floor(intv * 0.65 * ctx.outMult));
      for (const m of (st.party || []).filter((x) => x && x.hp > 0)) ctx.hit(m, dmg, "Stone Breath washes over");
      return true;
    }
    if (ctx.ready("mountainhide")) {
      ctx.setCd("mountainhide", 4);
      setFoeMitigation(foe, 2, 0.84);
      ctx.log(`${foe.name} raises Mountainhide.`);
      return true;
    }
    if (foe.combat.colossusPhase2 && ctx.ready("stillness_crush")) {
      ctx.setCd("stillness_crush", 5);
      ctx.hit(member, Math.max(1, Math.floor((foe.str || 20) * 1.25 * ctx.outMult)), "Stillness Crush shatters");
      if (ctx.rng.chance(0.2)) applyPartyMemberCripple(st, member, 1);
      return true;
    }
    const basicMult = foe.combat.colossusPhase3 ? 0.55 : 0.65;
    ctx.hit(member, Math.max(1, Math.floor((foe.str || 20) * basicMult * ctx.outMult)), "strikes");
    return true;
  },

  gorilla(foe, st, ctx) {
    const member = ctx.pickTarget("bruiser");
    foe.combat.gorillaRampStacks = (foe.combat.gorillaRampStacks || 0) + 1;
    if (ctx.ready("chest_beat")) {
      ctx.setCd("chest_beat", 3);
      ctx.log(`${foe.name} beats its chest.`);
      return true;
    }
    if (ctx.ready("smash") && foe.combat.gorillaRampStacks >= 2) {
      ctx.setCd("smash", 2);
      ctx.hit(member, ctx.atk * 1.25 * ctx.outMult, "Smashes");
      return true;
    }
    ctx.hit(member, ctx.atk * 0.9 * ctx.outMult, "strikes");
    return true;
  }
};
