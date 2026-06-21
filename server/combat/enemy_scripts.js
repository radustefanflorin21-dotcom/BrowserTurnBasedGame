import { createRequire } from "node:module";
import { getEnemyCombatRoleKey } from "./monster_stats.js";
import { getEnemyDefByName } from "../load_game_config.js";
import {
  applyPartyMemberBlind,
  applyPartyMemberCripple,
  applyPartyMemberIncomingDamageUp,
  applyPartyMemberMagicDamageDown,
  applyPartyMemberSuppressedDamageDownBoth,
  applyPartyMemberStatusResistDown,
  applyPlayerAccuracyDown,
  applyPlayerBleed,
  applyPlayerPoison,
  applyPlayerBurn,
  extendPlayerDebuffDurations,
  ensureCombatStatus,
  tryPartyMemberStun
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

function isMemberBurned(st, member) {
  if (!member) return false;
  if (member.kind === "hero") return (st.status?.playerBurn?.turns || 0) > 0;
  return (member.burnTurns || 0) > 0;
}

function applyBurnFromHit(st, member, hit, dotPct, turns, rng) {
  if (!member || !rng.chance(dotPct)) return;
  const dot = Math.max(1, Math.floor(hit * (dotPct / 100)));
  applyPlayerBurn(st, dot, turns);
}

function livingPartyCount(st) {
  return (st.party || []).filter((m) => m && m.hp > 0).length;
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
      if (ctx.rng.chance(55)) {
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
      if (ctx.rng.chance(45)) applyPlayerBleed(st, Math.max(1, Math.floor(hit * 0.12)), 2);
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
      rollBlindAll(st, ctx, 50, 8, 2);
      ctx.log(`${foe.name} spreads Thirsting Haze.`);
      return true;
    }
    if (ctx.ready("mirage_lock")) {
      ctx.setCd("mirage_lock", 4);
      const dur = isMemberBlinded(st, member) ? 3 : 2;
      if (ctx.rng.chance(45)) applyPartyMemberCripple(st, member, dur);
      ctx.log(`${foe.name} locks ${member?.name || "a fighter"} in mirage sand.`);
      return true;
    }
    if (ctx.ready("false_wound")) {
      ctx.setCd("false_wound", 2);
      const hit = Math.max(1, Math.floor((foe.int || 20) * 0.55 * ctx.outMult));
      ctx.hit(member, hit, "False Wounds");
      if (ctx.rng.chance(45)) applyPartyMemberCripple(st, member, 1);
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
    if (ctx.rng.chance(35)) applyPartyMemberBlind(st, member, 5, 1);
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
        if (ctx.rng.chance(35)) applyPartyMemberCripple(st, m, 1);
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
        if (ctx.rng.chance(45)) applyPartyMemberBlind(st, t, 8, 2);
        if (ctx.rng.chance(40)) applyPartyMemberCripple(st, t, 1);
      }
      return true;
    }
    if (ctx.ready("withering_cry")) {
      ctx.setCd("withering_cry", 3);
      rollBlindAll(st, ctx, 50, 8, 2);
      const dmg = Math.max(1, Math.floor(intv * 0.45 * ctx.outMult * magicMult * accMult));
      for (const m of (st.party || []).filter((x) => x && x.hp > 0)) ctx.hit(m, dmg, "Withering Cries at");
      return true;
    }
    if (ctx.ready("drought_curse")) {
      ctx.setCd("drought_curse", 4);
      if (ctx.rng.chance(55)) applyPartyMemberCripple(st, member, 2);
      if (ctx.rng.chance(40)) applyPartyMemberBlind(st, member, 6, 2);
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
      if (ctx.rng.chance(20)) applyPartyMemberCripple(st, member, 1);
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
      if (ctx.rng.chance(45)) applyPartyMemberCripple(st, member, 2);
      return true;
    }
    if (ctx.ready("mineral_haze")) {
      ctx.setCd("mineral_haze", 4);
      rollBlindAll(st, ctx, 45, 8, 2);
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
      if (ctx.rng.chance(18)) applyPartyMemberCripple(st, member, 1);
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
      if (ctx.rng.chance(35)) applyPartyMemberCripple(st, member, 1);
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
      if (ctx.rng.chance(40)) applyPartyMemberCripple(st, member, 1);
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
      if (ctx.rng.chance(20)) applyPartyMemberCripple(st, member, 1);
      return true;
    }
    const basicMult = foe.combat.colossusPhase3 ? 0.55 : 0.65;
    ctx.hit(member, Math.max(1, Math.floor((foe.str || 20) * basicMult * ctx.outMult)), "strikes");
    return true;
  },

  whitebark_matron(foe, st, ctx) {
    const member = ctx.pickTarget("controller");
    const intv = foe.int || 20;
    if (ctx.ready("frozen_prayer")) {
      ctx.setCd("frozen_prayer", 4);
      for (const ally of (st.foes || []).filter((f) => f && f.hp > 0 && f.uid !== foe.uid)) {
        if (!ally.combat) ally.combat = { skillCd: {}, actCount: 0 };
        ally.combat.healReceivedBonusPct = Math.max(ally.combat.healReceivedBonusPct || 0, 8);
        ally.combat.healReceivedBonusTurns = Math.max(ally.combat.healReceivedBonusTurns || 0, 2);
        ally.combat.magicResBonusPct = Math.max(ally.combat.magicResBonusPct || 0, 5);
        ally.combat.magicResBonusTurns = Math.max(ally.combat.magicResBonusTurns || 0, 2);
      }
      ctx.log(`${foe.name} chants Frozen Prayer.`);
      return true;
    }
    if (ctx.ready("whitebark_mend")) {
      ctx.setCd("whitebark_mend", 3);
      const target = lowestHpAlly(st, foe.uid);
      if (target) {
        const bonus = 1 + (target.combat?.healReceivedBonusPct || 0) / 100;
        const amt = Math.max(1, Math.floor((foe.vit || 20) * 0.8 * bonus));
        target.hp = Math.min(target.maxHp, target.hp + amt);
        ctx.log(`${foe.name} Whitebark Mends ${target.name} for ${amt}.`);
      } else {
        ctx.healSelf(0.8);
        ctx.log(`${foe.name} Whitebark Mends itself.`);
      }
      return true;
    }
    if (ctx.ready("frostroot_bind")) {
      ctx.setCd("frostroot_bind", 3);
      ctx.hit(member, Math.max(1, Math.floor(intv * 0.45 * ctx.outMult)), "Frostroot Binds");
      if (ctx.rng.chance(45)) applyPartyMemberCripple(st, member, 2);
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(intv * 0.35 * ctx.outMult)), "prays-strikes");
    return true;
  },

  frosthorn_bulwark(foe, st, ctx) {
    const member = ctx.pickTarget("tank");
    if (ctx.ready("tuskbreaker_slam")) {
      ctx.setCd("tuskbreaker_slam", 2);
      ctx.hit(member, Math.max(1, Math.floor((foe.str || 20) * 0.9 * ctx.outMult)), "Tuskbreaker Slam crushes");
      if (ctx.rng.chance(40)) applyPartyMemberCripple(st, member, 1);
      return true;
    }
    if (ctx.ready("frozen_guard")) {
      ctx.setCd("frozen_guard", 3);
      foe.combat.physResBonusPct = Math.max(foe.combat.physResBonusPct || 0, 10);
      foe.combat.physResBonusTurns = Math.max(foe.combat.physResBonusTurns || 0, 2);
      ctx.log(`${foe.name} raises Frozen Guard.`);
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor((foe.str || 20) * 0.5 * ctx.outMult)), "strikes");
    return true;
  },

  frostroot_seedling(foe, st, ctx) {
    const member = ctx.pickTarget("support");
    if (ctx.ready("seedling_mend")) {
      ctx.setCd("seedling_mend", 3);
      const target = lowestHpAlly(st, foe.uid);
      if (target) {
        const amt = Math.max(1, Math.floor((foe.vit || 20) * 0.5));
        target.hp = Math.min(target.maxHp, target.hp + amt);
        ctx.log(`${foe.name} Seedling Mends ${target.name} for ${amt}.`);
      } else {
        ctx.healSelf(0.5);
      }
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor((foe.int || 20) * 0.3 * ctx.outMult)), "Frost Needles");
    return true;
  },

  sleeping_child_of_winter(foe, st, ctx) {
    const member = ctx.pickTarget("mage");
    const hpFrac = ctx.foeHpFrac();
    const intv = foe.int || 20;
    if (hpFrac <= 0.7 && !foe.combat.winterPhase2) {
      foe.combat.winterPhase2 = true;
      foe.combat.magicResBonusPct = (foe.combat.magicResBonusPct || 0) + 8;
      foe.combat.healReceivedBonusPct = (foe.combat.healReceivedBonusPct || 0) + 8;
      ctx.log(`${foe.name} wakes the forest.`);
      spawnReinforcement(st, "Pinebound Fawn", ctx.rng);
      spawnReinforcement(st, "Frozen Pinecone", ctx.rng);
      return true;
    }
    if (hpFrac <= 0.35 && !foe.combat.winterPhase3) {
      foe.combat.winterPhase3 = true;
      foe.combat.outgoingDamageBonusPct = (foe.combat.outgoingDamageBonusPct || 0) + 10;
      ctx.log(`${foe.name} opens its eyes.`);
      return true;
    }
    const magicMult = 1 + (foe.combat.outgoingDamageBonusPct || 0) / 100;
    if (ctx.ready("lullaby_of_snow")) {
      ctx.setCd("lullaby_of_snow", 3);
      const dmg = Math.max(1, Math.floor(intv * 0.45 * ctx.outMult * magicMult));
      for (const m of (st.party || []).filter((x) => x && x.hp > 0)) ctx.hit(m, dmg, "Lullaby of Snow drifts over");
      return true;
    }
    if (ctx.ready("innocent_grasp")) {
      ctx.setCd("innocent_grasp", 2);
      ctx.hit(member, Math.max(1, Math.floor(intv * 0.55 * ctx.outMult * magicMult)), "Innocent Grasp holds");
      if (ctx.rng.chance(45)) applyPartyMemberCripple(st, member, 2);
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(intv * 0.4 * ctx.outMult * magicMult)), "winter-touches");
    return true;
  },

  fallen_echo(foe, st, ctx) {
    const member = ctx.pickTarget("bruiser");
    if (ctx.ready("echo_strike")) {
      ctx.setCd("echo_strike", 2);
      ctx.hit(member, Math.max(1, Math.floor((foe.str || 20) * 0.45 * ctx.outMult)), "Echo Strike hits");
      return true;
    }
    if (ctx.ready("broken_march")) {
      ctx.setCd("broken_march", 3);
      ctx.hit(member, Math.max(1, Math.floor((foe.str || 20) * 0.4 * ctx.outMult)), "Broken March staggers");
      if (ctx.rng.chance(30)) applyPartyMemberCripple(st, member, 1);
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor((foe.str || 20) * 0.45 * ctx.outMult)), "strikes");
    return true;
  },

  rustbound_marshal(foe, st, ctx) {
    const member = ctx.pickTarget("tank");
    if (ctx.ready("corrode_command")) {
      ctx.setCd("corrode_command", 3);
      for (const m of (st.party || []).filter((x) => x && x.hp > 0)) {
        if (ctx.rng.chance(45)) {
          ensureCombatStatus(st);
          st.status.playerPhysDamageDownPct = Math.max(st.status.playerPhysDamageDownPct || 0, 6);
          st.status.playerMagicDamageDownPct = Math.max(st.status.playerMagicDamageDownPct || 0, 6);
          st.status.playerPhysDamageDownTurns = Math.max(st.status.playerPhysDamageDownTurns || 0, 2);
          st.status.playerMagicDamageDownTurns = Math.max(st.status.playerMagicDamageDownTurns || 0, 2);
        }
      }
      ctx.log(`${foe.name} issues Corrode Command.`);
      return true;
    }
    if (ctx.ready("rusted_guard")) {
      ctx.setCd("rusted_guard", 4);
      foe.combat.physResBonusPct = Math.max(foe.combat.physResBonusPct || 0, 10);
      foe.combat.statusResBonusPct = Math.max(foe.combat.statusResBonusPct || 0, 6);
      foe.combat.physResBonusTurns = Math.max(foe.combat.physResBonusTurns || 0, 2);
      foe.combat.statusResBonusTurns = Math.max(foe.combat.statusResBonusTurns || 0, 2);
      ctx.log(`${foe.name} raises Rusted Guard.`);
      return true;
    }
    if (ctx.ready("marshals_cleave")) {
      ctx.setCd("marshals_cleave", 2);
      ctx.hit(member, Math.max(1, Math.floor((foe.str || 20) * 0.85 * ctx.outMult)), "Marshal's Cleave cuts");
      return true;
    }
    if (ctx.ready("chain_order")) {
      ctx.setCd("chain_order", 4);
      ctx.hit(member, Math.max(1, Math.floor((foe.str || 20) * 0.55 * ctx.outMult)), "Chain Order binds");
      if (ctx.rng.chance(45)) applyPartyMemberCripple(st, member, 2);
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor((foe.str || 20) * 0.55 * ctx.outMult)), "strikes");
    return true;
  },

  bannerless_wraithlord(foe, st, ctx) {
    const member = ctx.pickTarget("mage");
    const intv = foe.int || 20;
    const livingFoes = (st.foes || []).filter((f) => f && f.hp > 0).length;
    if (ctx.ready("call_fallen") && livingFoes < 8) {
      ctx.setCd("call_fallen", 4);
      spawnReinforcement(st, "Fallen Echo", ctx.rng);
      return true;
    }
    if (ctx.ready("soul_chill")) {
      ctx.setCd("soul_chill", 3);
      const dmg = Math.max(1, Math.floor(intv * 0.4 * ctx.outMult));
      for (const m of (st.party || []).filter((x) => x && x.hp > 0)) ctx.hit(m, dmg, "Soul Chill washes over");
      return true;
    }
    if (ctx.ready("banner_curse")) {
      ctx.setCd("banner_curse", 3);
      ctx.hit(member, Math.max(1, Math.floor(intv * 0.35 * ctx.outMult)), "Banner Curse haunts");
      return true;
    }
    if (ctx.ready("haunting_bolt")) {
      ctx.setCd("haunting_bolt", 2);
      ctx.hit(member, Math.max(1, Math.floor(intv * 0.6 * ctx.outMult)), "Haunting Bolt strikes");
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(intv * 0.35 * ctx.outMult)), "chills");
    return true;
  },

  the_last_warmaster(foe, st, ctx) {
    const member = ctx.pickTarget("tank");
    const hpFrac = ctx.foeHpFrac();
    const strv = foe.str || 20;
    const dmgBonus = 1 + (foe.combat.outgoingDamageBonusPct || 0) / 100;
    const accBonus = 1 + (foe.combat.outgoingAccuracyBonusPct || 0) / 100;
    if (hpFrac <= 0.7 && !foe.combat.warmasterPhase2) {
      foe.combat.warmasterPhase2 = true;
      foe.combat.physResBonusPct = (foe.combat.physResBonusPct || 0) + 8;
      ctx.log(`${foe.name} enters The War Returns.`);
      spawnReinforcement(st, "Remnant of Rust", ctx.rng);
      spawnReinforcement(st, "Faded War Wraith", ctx.rng);
      return true;
    }
    if (hpFrac <= 0.35 && !foe.combat.warmasterPhase3) {
      foe.combat.warmasterPhase3 = true;
      foe.combat.outgoingDamageBonusPct = (foe.combat.outgoingDamageBonusPct || 0) + 10;
      foe.combat.outgoingAccuracyBonusPct = (foe.combat.outgoingAccuracyBonusPct || 0) + 8;
      ctx.log(`${foe.name} enters No Surrender.`);
      return true;
    }
    const fallenCount = (st.foes || []).filter((f) => f && f.hp > 0 && f.name === "Fallen Echo").length;
    if (ctx.ready("raise_the_fallen") && fallenCount < 3 && (st.foes || []).filter((f) => f && f.hp > 0).length < 8) {
      ctx.setCd("raise_the_fallen", 5);
      spawnReinforcement(st, "Fallen Echo", ctx.rng);
      return true;
    }
    if (ctx.ready("commanding_ruin")) {
      ctx.setCd("commanding_ruin", 3);
      for (const m of (st.party || []).filter((x) => x && x.hp > 0)) {
        if (ctx.rng.chance(45)) applyPartyMemberSuppressedDamageDownBoth(st, m, 8, 2);
      }
      ctx.log(`${foe.name} unleashes Commanding Ruin.`);
      return true;
    }
    if (ctx.ready("warmasters_execution")) {
      ctx.setCd("warmasters_execution", 2);
      let hit = Math.max(1, Math.floor(strv * 1.05 * ctx.outMult * dmgBonus * accBonus));
      if (member.maxHp > 0 && member.hp / member.maxHp < 0.4) hit = Math.max(1, Math.floor(hit * 1.2));
      ctx.hit(member, hit, "Warmaster's Execution falls");
      return true;
    }
    if (ctx.ready("ruststorm_slash")) {
      ctx.setCd("ruststorm_slash", 4);
      const hit = Math.max(1, Math.floor(strv * 0.7 * ctx.outMult * dmgBonus * accBonus));
      ctx.hitAdjacent(member, hit, "Ruststorm Slash tears through", 2, 1);
      for (const m of (st.party || []).filter((x) => x && x.hp > 0)) {
        if (ctx.rng.chance(40)) applyPartyMemberIncomingDamageUp(st, m, 8, 2);
      }
      return true;
    }
    if (ctx.ready("no_retreat")) {
      ctx.setCd("no_retreat", 4);
      foe.combat.outgoingDamageBonusPct = Math.max(foe.combat.outgoingDamageBonusPct || 0, 8);
      foe.combat.statusResBonusPct = Math.max(foe.combat.statusResBonusPct || 0, 8);
      foe.combat.outgoingDamageBonusTurns = Math.max(foe.combat.outgoingDamageBonusTurns || 0, 2);
      foe.combat.statusResBonusTurns = Math.max(foe.combat.statusResBonusTurns || 0, 2);
      ctx.log(`${foe.name} declares No Retreat.`);
      return true;
    }
    if (foe.combat.warmasterPhase3 && ctx.ready("final_order")) {
      ctx.setCd("final_order", 5);
      const hit = Math.max(1, Math.floor(strv * 0.55 * ctx.outMult * dmgBonus * accBonus));
      for (const m of (st.party || []).filter((x) => x && x.hp > 0)) {
        ctx.hit(m, hit, "Final Order shakes the chamber");
        tryPartyMemberStun(st, m, ctx.rng, 0.18, ctx.player, ctx.log);
      }
      return true;
    }
    const basicMult = foe.combat.warmasterPhase3 ? 0.55 : 0.65;
    const basicHit = Math.max(1, Math.floor(strv * basicMult * ctx.outMult * dmgBonus * accBonus));
    if (foe.combat.warmasterPhase3) {
      ctx.hitAdjacent(member, basicHit, "strikes", 1, 1);
    } else {
      ctx.hit(member, basicHit, "strikes");
    }
    return true;
  },

  verdant_sprout(foe, st, ctx) {
    const member = ctx.pickTarget("support");
    if (ctx.ready("sprout_mend")) {
      ctx.setCd("sprout_mend", 3);
      const target = lowestHpAlly(st, foe.uid);
      if (target) {
        const amt = Math.max(1, Math.floor((foe.vit || 20) * 0.45));
        target.hp = Math.min(target.maxHp, target.hp + amt);
        ctx.log(`${foe.name} Sprout Mends ${target.name} for ${amt}.`);
      } else {
        ctx.healSelf(0.45);
      }
      return true;
    }
    const intv = foe.int || 20;
    const hit = Math.max(1, Math.floor(intv * 0.3 * ctx.outMult));
    ctx.hit(member, hit, "Thorn Flick pricks");
    if (ctx.rng.chance(30)) applyPlayerPoison(st, Math.max(1, Math.floor(hit * 0.12)), 1);
    return true;
  },

  verdant_bloomseer(foe, st, ctx) {
    const member = ctx.pickTarget("mage");
    const intv = foe.int || 20;
    if (ctx.ready("bloom_mend")) {
      ctx.setCd("bloom_mend", 3);
      const target = lowestHpAlly(st, foe.uid);
      if (target) {
        const wasLow = target.maxHp > 0 && target.hp / target.maxHp < 0.35;
        const bonus = 1 + (target.combat?.healReceivedBonusPct || 0) / 100;
        const amt = Math.max(1, Math.floor((foe.vit || 20) * 0.85 * bonus));
        target.hp = Math.min(target.maxHp, target.hp + amt);
        if (wasLow) {
          if (!target.combat) target.combat = { skillCd: {}, actCount: 0 };
          target.combat.healReceivedBonusPct = Math.max(target.combat.healReceivedBonusPct || 0, 8);
          target.combat.healReceivedBonusTurns = Math.max(target.combat.healReceivedBonusTurns || 0, 2);
        }
        ctx.log(`${foe.name} Bloom Mends ${target.name} for ${amt}.`);
      }
      return true;
    }
    if (ctx.ready("pollen_blind")) {
      ctx.setCd("pollen_blind", 3);
      rollBlindAll(st, ctx, 45, 8, 2);
      ctx.log(`${foe.name} scatters Pollen Blind.`);
      return true;
    }
    if (ctx.ready("thorned_bloom")) {
      ctx.setCd("thorned_bloom", 2);
      const hit = Math.max(1, Math.floor(intv * 0.5 * ctx.outMult));
      ctx.hit(member, hit, "Thorned Bloom strikes");
      if (ctx.rng.chance(45)) applyPlayerPoison(st, Math.max(1, Math.floor(hit * 0.12)), 2);
      return true;
    }
    if (ctx.ready("greenward_song")) {
      ctx.setCd("greenward_song", 4);
      for (const ally of (st.foes || []).filter((f) => f && f.hp > 0 && f.uid !== foe.uid)) {
        if (!ally.combat) ally.combat = { skillCd: {}, actCount: 0 };
        ally.combat.magicResBonusPct = Math.max(ally.combat.magicResBonusPct || 0, 6);
        ally.combat.statusResBonusPct = Math.max(ally.combat.statusResBonusPct || 0, 5);
        ally.combat.magicResBonusTurns = Math.max(ally.combat.magicResBonusTurns || 0, 2);
        ally.combat.statusResBonusTurns = Math.max(ally.combat.statusResBonusTurns || 0, 2);
      }
      ctx.log(`${foe.name} sings Greenward Song.`);
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(intv * 0.35 * ctx.outMult)), "strikes");
    return true;
  },

  primordial_silverback(foe, st, ctx) {
    const member = ctx.pickTarget("tank");
    const strv = foe.str || 20;
    if (ctx.ready("canopy_breaker")) {
      ctx.setCd("canopy_breaker", 2);
      ctx.hit(member, Math.max(1, Math.floor(strv * 1.05 * ctx.outMult)), "Canopy Breaker smashes");
      if (ctx.rng.chance(40)) applyPartyMemberIncomingDamageUp(st, member, 8, 2);
      return true;
    }
    if (ctx.ready("ground_roar")) {
      ctx.setCd("ground_roar", 3);
      const hit = Math.max(1, Math.floor(strv * 0.65 * ctx.outMult));
      ctx.hitAdjacent(member, hit, "Ground Roar shakes", 1, 1);
      for (const m of (st.party || []).filter((x) => x && x.hp > 0)) {
        if (ctx.rng.chance(35)) applyPartyMemberCripple(st, m, 1);
      }
      return true;
    }
    if (ctx.ready("primal_guard")) {
      ctx.setCd("primal_guard", 4);
      foe.combat.physResBonusPct = Math.max(foe.combat.physResBonusPct || 0, 8);
      foe.combat.outgoingDamageBonusPct = Math.max(foe.combat.outgoingDamageBonusPct || 0, 8);
      foe.combat.physResBonusTurns = Math.max(foe.combat.physResBonusTurns || 0, 2);
      foe.combat.outgoingDamageBonusTurns = Math.max(foe.combat.outgoingDamageBonusTurns || 0, 2);
      ctx.log(`${foe.name} raises Primal Guard.`);
      return true;
    }
    if (ctx.ready("rootknuckle_slam")) {
      ctx.setCd("rootknuckle_slam", 4);
      ctx.hit(member, Math.max(1, Math.floor(strv * 0.85 * ctx.outMult)), "Rootknuckle Slam crushes");
      tryPartyMemberStun(st, member, ctx.rng, 0.18, ctx.player, ctx.log);
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(strv * 0.6 * ctx.outMult)), "strikes");
    return true;
  },

  the_heartbloom_ancient(foe, st, ctx) {
    const member = ctx.pickTarget("tank");
    const hpFrac = ctx.foeHpFrac();
    const strv = foe.str || 20;
    const intv = foe.int || 20;
    const dmgBonus = 1 + (foe.combat.outgoingDamageBonusPct || 0) / 100;
    const accBonus = 1 + (foe.combat.outgoingAccuracyBonusPct || 0) / 100;
    if (hpFrac <= 0.7 && !foe.combat.heartbloomPhase2) {
      foe.combat.heartbloomPhase2 = true;
      foe.combat.healReceivedBonusPct = (foe.combat.healReceivedBonusPct || 0) + 8;
      foe.combat.magicResBonusPct = (foe.combat.magicResBonusPct || 0) + 8;
      ctx.log(`${foe.name} enters The Jungle Closes.`);
      spawnReinforcement(st, "Canopy Screecher", ctx.rng);
      spawnReinforcement(st, "Jungle Stag", ctx.rng);
      return true;
    }
    if (hpFrac <= 0.35 && !foe.combat.heartbloomPhase3) {
      foe.combat.heartbloomPhase3 = true;
      foe.combat.outgoingDamageBonusPct = (foe.combat.outgoingDamageBonusPct || 0) + 10;
      foe.combat.outgoingAccuracyBonusPct = (foe.combat.outgoingAccuracyBonusPct || 0) + 8;
      ctx.log(`${foe.name} enters Gaia's Pulse.`);
      return true;
    }
    if (ctx.ready("heartroot_pulse")) {
      ctx.setCd("heartroot_pulse", 3);
      for (const ally of (st.foes || []).filter((f) => f && f.hp > 0)) {
        const bonus = 1 + (ally.combat?.healReceivedBonusPct || 0) / 100;
        const amt = Math.max(1, Math.floor((foe.vit || 20) * 0.55 * bonus));
        ally.hp = Math.min(ally.maxHp, ally.hp + amt);
        if (!ally.combat) ally.combat = { skillCd: {}, actCount: 0 };
        ally.combat.statusResBonusPct = Math.max(ally.combat.statusResBonusPct || 0, 5);
        ally.combat.statusResBonusTurns = Math.max(ally.combat.statusResBonusTurns || 0, 1);
      }
      ctx.log(`${foe.name} pulses Heartroot mend.`);
      return true;
    }
    if (ctx.ready("vinecrush")) {
      ctx.setCd("vinecrush", 2);
      let hit = Math.max(1, Math.floor(strv * 1.0 * ctx.outMult * dmgBonus * accBonus));
      const crippled =
        (member.crippleTurns || 0) > 0 ||
        (member.kind === "hero" && (st.status?.playerCrippleTurns || 0) > 0);
      if (crippled) hit = Math.max(1, Math.floor(hit * 1.15));
      ctx.hit(member, hit, "Vinecrush slams");
      return true;
    }
    if (ctx.ready("sporefall")) {
      ctx.setCd("sporefall", 4);
      const hit = Math.max(1, Math.floor(intv * 0.45 * ctx.outMult * dmgBonus));
      for (const m of (st.party || []).filter((x) => x && x.hp > 0)) {
        ctx.hit(m, hit, "Sporefall rains");
        if (ctx.rng.chance(45)) applyPlayerPoison(st, Math.max(1, Math.floor(hit * 0.12)), 2);
        if (ctx.rng.chance(35)) applyPartyMemberBlind(st, m, 6, 1);
      }
      return true;
    }
    if (ctx.ready("ancient_barkskin")) {
      ctx.setCd("ancient_barkskin", 4);
      setFoeMitigation(foe, 2, 0.85);
      foe.combat.statusResBonusPct = Math.max(foe.combat.statusResBonusPct || 0, 8);
      foe.combat.statusResBonusTurns = Math.max(foe.combat.statusResBonusTurns || 0, 2);
      ctx.log(`${foe.name} hardens Ancient Barkskin.`);
      return true;
    }
    if (foe.combat.heartbloomPhase2 && ctx.ready("blooming_rupture")) {
      ctx.setCd("blooming_rupture", 5);
      const hit = Math.max(1, Math.floor(intv * 0.55 * ctx.outMult * dmgBonus));
      ctx.hitAdjacent(member, hit, "Blooming Rupture bursts", 2, 1);
      if (ctx.rng.chance(40)) applyPartyMemberIncomingDamageUp(st, member, 8, 2);
      return true;
    }
    if (foe.combat.heartbloomPhase3 && ctx.ready("gaia_heartbreak")) {
      ctx.setCd("gaia_heartbreak", 5);
      const hit = Math.max(1, Math.floor(intv * 0.55 * ctx.outMult * dmgBonus * accBonus));
      for (const m of (st.party || []).filter((x) => x && x.hp > 0)) {
        ctx.hit(m, hit, "Gaia Heartbreak shatters");
        tryPartyMemberStun(st, m, ctx.rng, 0.18, ctx.player, ctx.log);
      }
      return true;
    }
    const basicMult = foe.combat.heartbloomPhase3 ? 0.55 : 0.65;
    const basicHit = Math.max(1, Math.floor(strv * basicMult * ctx.outMult * dmgBonus * accBonus));
    if (foe.combat.heartbloomPhase3) {
      ctx.hitAdjacent(member, basicHit, "strikes", 1, 1);
    } else {
      ctx.hit(member, basicHit, "strikes");
    }
    return true;
  },

  ember_forgeling(foe, st, ctx) {
    const member = ctx.pickTarget("mage");
    const strv = foe.str || 20;
    const intv = foe.int || 20;
    if (ctx.ready("spark_spray")) {
      ctx.setCd("spark_spray", 3);
      const hit = Math.max(1, Math.floor(intv * 0.35 * ctx.outMult));
      ctx.hitAdjacent(member, hit, "Spark Spray scorches", 1, 1);
      for (const m of [member, ...((st.party || []).filter((x) => x && x.hp > 0))].slice(0, 2)) {
        if (ctx.rng.chance(30)) applyBurnFromHit(st, m, hit, 10, 2, ctx.rng);
      }
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(strv * 0.45 * ctx.outMult)), "Slag Scratch claws");
    return true;
  },

  inferno_oracle(foe, st, ctx) {
    const member = ctx.pickTarget("mage");
    const intv = foe.int || 20;
    const hpFrac = foe.maxHp > 0 ? foe.hp / foe.maxHp : 1;
    if (ctx.ready("flameveil_ward") && hpFrac < 0.7 && (foe.combat.magicResBonusTurns || 0) <= 0) {
      ctx.setCd("flameveil_ward", 4);
      foe.combat.magicResBonusPct = Math.max(foe.combat.magicResBonusPct || 0, 10);
      foe.combat.magicResBonusTurns = Math.max(foe.combat.magicResBonusTurns || 0, 2);
      foe.combat.evasionBonusPct = Math.max(foe.combat.evasionBonusPct || 0, 8);
      foe.combat.evasionBonusTurns = Math.max(foe.combat.evasionBonusTurns || 0, 2);
      ctx.log(`${foe.name} raises Flameveil Ward.`);
      return true;
    }
    if (ctx.ready("cinder_prophecy") && livingPartyCount(st) >= 3) {
      ctx.setCd("cinder_prophecy", 4);
      for (const m of (st.party || []).filter((x) => x && x.hp > 0)) {
        if (ctx.rng.chance(45)) applyPartyMemberBlind(st, m, 8, 2);
        if (ctx.rng.chance(35)) applyPartyMemberStatusResistDown(st, m, 5, 2);
      }
      ctx.log(`${foe.name} speaks Cinder Prophecy.`);
      return true;
    }
    if (ctx.ready("inferno_gaze") && !isMemberBurned(st, member)) {
      ctx.setCd("inferno_gaze", 3);
      const hit = Math.max(1, Math.floor(intv * 0.8 * ctx.outMult));
      ctx.hit(member, hit, "Inferno Gaze brands");
      applyBurnFromHit(st, member, hit, 12, 3, ctx.rng);
      return true;
    }
    if (ctx.ready("firethread_lash")) {
      ctx.setCd("firethread_lash", 2);
      const hit = Math.max(1, Math.floor(intv * 0.55 * ctx.outMult));
      ctx.hitAdjacent(member, hit, "Firethread Lash whips", 1, 1);
      applyBurnFromHit(st, member, hit, 10, 2, ctx.rng);
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(intv * 0.4 * ctx.outMult)), "Ember Bolt strikes");
    return true;
  },

  ashmaw_titan(foe, st, ctx) {
    const member = ctx.pickTarget("tank");
    const strv = foe.str || 20;
    const hpFrac = foe.maxHp > 0 ? foe.hp / foe.maxHp : 1;
    if (ctx.ready("obsidian_hide") && hpFrac < 0.75 && (foe.combat.physResBonusTurns || 0) <= 0) {
      ctx.setCd("obsidian_hide", 4);
      foe.combat.physResBonusPct = Math.max(foe.combat.physResBonusPct || 0, 10);
      foe.combat.statusResBonusPct = Math.max(foe.combat.statusResBonusPct || 0, 6);
      foe.combat.physResBonusTurns = Math.max(foe.combat.physResBonusTurns || 0, 2);
      foe.combat.statusResBonusTurns = Math.max(foe.combat.statusResBonusTurns || 0, 2);
      ctx.log(`${foe.name} hardens Obsidian Hide.`);
      return true;
    }
    if (ctx.ready("burning_rampage") && hpFrac < 0.6 && (foe.combat.outgoingDamageBonusTurns || 0) <= 0) {
      ctx.setCd("burning_rampage", 4);
      foe.combat.outgoingDamageBonusPct = Math.max(foe.combat.outgoingDamageBonusPct || 0, 10);
      foe.combat.outgoingAccuracyBonusPct = Math.max(foe.combat.outgoingAccuracyBonusPct || 0, 6);
      foe.combat.outgoingDamageBonusTurns = Math.max(foe.combat.outgoingDamageBonusTurns || 0, 2);
      foe.combat.outgoingAccuracyBonusTurns = Math.max(foe.combat.outgoingAccuracyBonusTurns || 0, 2);
      ctx.log(`${foe.name} enters Burning Rampage.`);
      return true;
    }
    if (ctx.ready("ashmaw_crush")) {
      ctx.setCd("ashmaw_crush", 2);
      const hit = Math.max(1, Math.floor(strv * 1.1 * ctx.outMult));
      ctx.hit(member, hit, "Ashmaw Crush slams");
      if (ctx.rng.chance(40)) applyPartyMemberIncomingDamageUp(st, member, 8, 2);
      return true;
    }
    if (ctx.ready("slagquake_slam")) {
      ctx.setCd("slagquake_slam", 3);
      const hit = Math.max(1, Math.floor(strv * 0.7 * ctx.outMult));
      ctx.hitAdjacent(member, hit, "Slagquake Slam shakes", 1, 1);
      if (ctx.rng.chance(35)) applyPartyMemberCripple(st, member, 1);
      return true;
    }
    if (ctx.ready("jawbreaker_impact")) {
      ctx.setCd("jawbreaker_impact", 5);
      ctx.hit(member, Math.max(1, Math.floor(strv * 0.95 * ctx.outMult)), "Jawbreaker Impact crushes");
      tryPartyMemberStun(st, member, ctx.rng, 0.18, ctx.player, ctx.log);
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(strv * 0.6 * ctx.outMult)), "Slag Fist strikes");
    return true;
  },

  the_riftforge_tyrant(foe, st, ctx) {
    const member = ctx.pickTarget("tank");
    const hpFrac = ctx.foeHpFrac();
    const strv = foe.str || 20;
    const intv = foe.int || 20;
    const dmgBonus = 1 + (foe.combat.outgoingDamageBonusPct || 0) / 100;
    const accBonus = 1 + (foe.combat.outgoingAccuracyBonusPct || 0) / 100;
    const phase3 = !!foe.combat.riftforgePhase3;
    const phase2 = !!foe.combat.riftforgePhase2;

    if (hpFrac <= 0.7 && !foe.combat.riftforgePhase2) {
      foe.combat.riftforgePhase2 = true;
      foe.combat.outgoingDamageBonusPct = (foe.combat.outgoingDamageBonusPct || 0) + 8;
      foe.combat.magicResBonusPct = (foe.combat.magicResBonusPct || 0) + 8;
      ctx.log(`${foe.name} enters The Forge Opens.`);
      if ((st.foes || []).filter((f) => f && f.hp > 0).length < 8) {
        spawnReinforcement(st, "Ember Scuttler", ctx.rng);
      }
      if ((st.foes || []).filter((f) => f && f.hp > 0).length < 8) {
        spawnReinforcement(st, "Ash Lizard", ctx.rng);
      }
      return true;
    }
    if (hpFrac <= 0.35 && !foe.combat.riftforgePhase3) {
      foe.combat.riftforgePhase3 = true;
      foe.combat.outgoingAccuracyBonusPct = (foe.combat.outgoingAccuracyBonusPct || 0) + 8;
      foe.combat.outgoingMagicBonusPct = (foe.combat.outgoingMagicBonusPct || 0) + 10;
      ctx.log(`${foe.name} enters Hatred Unbound.`);
      return true;
    }
    if (ctx.ready("tyrant_blackguard") && hpFrac < 0.8 && (foe.combat.mitigationTurns || 0) <= 0) {
      ctx.setCd("tyrant_blackguard", 4);
      setFoeMitigation(foe, 2, 0.85);
      foe.combat.statusResBonusPct = Math.max(foe.combat.statusResBonusPct || 0, 8);
      foe.combat.statusResBonusTurns = Math.max(foe.combat.statusResBonusTurns || 0, 2);
      ctx.log(`${foe.name} raises Tyrant Blackguard.`);
      return true;
    }
    if (phase3 && ctx.ready("worldhate_judgment")) {
      ctx.setCd("worldhate_judgment", 5);
      const hit = Math.max(1, Math.floor(intv * 0.55 * ctx.outMult * dmgBonus * accBonus));
      for (const m of (st.party || []).filter((x) => x && x.hp > 0)) {
        ctx.hit(m, hit, "Worldhate Judgment blinds");
        tryPartyMemberStun(st, m, ctx.rng, 0.18, ctx.player, ctx.log);
      }
      return true;
    }
    if (phase2 && ctx.ready("riftforge_eruption")) {
      ctx.setCd("riftforge_eruption", 5);
      const hit = Math.max(1, Math.floor(intv * 0.6 * ctx.outMult * dmgBonus));
      ctx.hitAdjacent(member, hit, "Riftforge Eruption bursts", 2, 1);
      if (ctx.rng.chance(35)) applyPartyMemberIncomingDamageUp(st, member, 8, 2);
      return true;
    }
    if (ctx.ready("forgefire_decree") && livingPartyCount(st) >= 3) {
      ctx.setCd("forgefire_decree", 3);
      const hit = Math.max(1, Math.floor(intv * 0.45 * ctx.outMult * dmgBonus));
      for (const m of (st.party || []).filter((x) => x && x.hp > 0)) {
        ctx.hit(m, hit, "Forgefire Decree erupts under");
        applyBurnFromHit(st, m, hit, 10, 2, ctx.rng);
        if (ctx.rng.chance(35)) applyPartyMemberBlind(st, m, 6, 1);
      }
      return true;
    }
    if (ctx.ready("chain_of_hatred")) {
      ctx.setCd("chain_of_hatred", 3);
      ctx.hit(member, Math.max(1, Math.floor(strv * 0.75 * ctx.outMult * dmgBonus)), "Chain of Hatred lashes");
      if (ctx.rng.chance(45)) applyPartyMemberCripple(st, member, 2);
      return true;
    }
    if (ctx.ready("riftblade_cleave")) {
      ctx.setCd("riftblade_cleave", 2);
      const mult = phase3 ? 0.8 : 1.05;
      const hit = Math.max(1, Math.floor(strv * mult * ctx.outMult * dmgBonus * accBonus));
      if (phase3) {
        ctx.hitAdjacent(member, hit, "Riftblade Cleave burns", 1, 1);
      } else {
        ctx.hit(member, hit, "Riftblade Cleave burns");
      }
      applyBurnFromHit(st, member, hit, 10, 2, ctx.rng);
      return true;
    }
    const basicMult = phase3 ? 0.55 : 0.65;
    const basicHit = Math.max(1, Math.floor(strv * basicMult * ctx.outMult * dmgBonus * accBonus));
    if (phase3) {
      ctx.hitAdjacent(member, basicHit, "Tyrant Strike cleaves", 1, 1);
    } else {
      ctx.hit(member, basicHit, "Tyrant Strike hits");
    }
    return true;
  },

  hollowglass_siren(foe, st, ctx) {
    const intv = foe.int || 20;
    const hpFrac = ctx.foeHpFrac();
    const living = (st.party || []).filter((x) => x && x.hp > 0);
    if (ctx.ready("hollow_reflection") && hpFrac < 0.7 && (foe.combat.evasionBonusTurns || 0) <= 0) {
      ctx.setCd("hollow_reflection", 3);
      foe.combat.evasionBonusPct = Math.max(foe.combat.evasionBonusPct || 0, 18);
      foe.combat.evasionBonusTurns = Math.max(foe.combat.evasionBonusTurns || 0, 2);
      foe.combat.magicResBonusPct = Math.max(foe.combat.magicResBonusPct || 0, 8);
      foe.combat.magicResBonusTurns = Math.max(foe.combat.magicResBonusTurns || 0, 2);
      ctx.log(`${foe.name} raises Hollow Reflection.`);
      return true;
    }
    if (ctx.ready("silent_aria") && living.filter((m) => !isMemberBlinded(st, m)).length >= 2) {
      ctx.setCd("silent_aria", 3);
      const hit = Math.max(1, Math.floor(intv * 0.4 * ctx.outMult));
      for (const m of living) {
        ctx.hit(m, hit, "Silent Aria numbs");
        if (ctx.rng.chance(45)) applyPartyMemberBlind(st, m, 8, 2);
      }
      return true;
    }
    if (
      ctx.ready("rime_lament") &&
      living.filter((m) => (m.kind === "hero" ? (st.status?.playerMagicDamageDownTurns || 0) <= 0 : (m.magicDamageDownTurns || 0) <= 0))
        .length >= 2
    ) {
      ctx.setCd("rime_lament", 4);
      const hit = Math.max(1, Math.floor(intv * 0.35 * ctx.outMult));
      for (const m of living) {
        ctx.hit(m, hit, "Rime Lament chills");
        if (ctx.rng.chance(40)) applyPartyMemberMagicDamageDown(st, m, 8, 2);
      }
      return true;
    }
    if (ctx.ready("shatter_focus")) {
      ctx.setCd("shatter_focus", 4);
      const target = ctx.pickTarget("mage");
      if (ctx.rng.chance(55)) applyPartyMemberBlind(st, target, 10, 2);
      if (ctx.rng.chance(35)) applyPartyMemberStatusResistDown(st, target, 5, 2);
      ctx.log(`${foe.name} shatters ${target.name}'s focus.`);
      return true;
    }
    if (ctx.ready("glass_needle")) {
      ctx.setCd("glass_needle", 2);
      const target = ctx.pickTarget("assassin");
      const hit = Math.max(1, Math.floor(intv * 0.65 * ctx.outMult));
      ctx.hit(target, hit, "Glass Needle pierces");
      if (ctx.rng.chance(35)) applyPartyMemberCripple(st, target, 1);
      return true;
    }
    ctx.hit(ctx.pickTarget("mage"), Math.max(1, Math.floor(intv * 0.35 * ctx.outMult)), "Frost Note strikes");
    return true;
  },

  rimebound_undertaker(foe, st, ctx) {
    const member = ctx.pickTarget("tank");
    const strv = foe.str || 20;
    const hpFrac = ctx.foeHpFrac();
    if (ctx.ready("rimehide_burden") && hpFrac < 0.75 && (foe.combat.physResBonusTurns || 0) <= 0) {
      ctx.setCd("rimehide_burden", 4);
      foe.combat.physResBonusPct = Math.max(foe.combat.physResBonusPct || 0, 10);
      foe.combat.statusResBonusPct = Math.max(foe.combat.statusResBonusPct || 0, 6);
      setFoeMitigation(foe, 2, 0.92);
      foe.combat.physResBonusTurns = Math.max(foe.combat.physResBonusTurns || 0, 2);
      foe.combat.statusResBonusTurns = Math.max(foe.combat.statusResBonusTurns || 0, 2);
      ctx.log(`${foe.name} braces under Rimehide Burden.`);
      return true;
    }
    const living = (st.party || []).filter((x) => x && x.hp > 0);
    if (
      ctx.ready("funeral_weight") &&
      living.filter(
        (m) => (m.kind === "hero" && (st.status?.playerCrippleTurns || 0) <= 0) || (m.kind !== "hero" && (m.crippleTurns || 0) <= 0)
      ).length >= 2
    ) {
      ctx.setCd("funeral_weight", 4);
      for (const m of living) {
        if (ctx.rng.chance(45)) applyPartyMemberCripple(st, m, 1);
        if (ctx.rng.chance(35)) applyPartyMemberBlind(st, m, 6, 1);
      }
      ctx.log(`${foe.name} slams Funeral Weight into the ice.`);
      return true;
    }
    if (ctx.ready("coffin_breaker")) {
      ctx.setCd("coffin_breaker", 3);
      ctx.hit(member, Math.max(1, Math.floor(strv * 1.15 * ctx.outMult)), "Coffin Breaker crushes");
      tryPartyMemberStun(st, member, ctx.rng, 0.18, ctx.player, ctx.log);
      return true;
    }
    if (ctx.ready("gravehook_drag")) {
      ctx.setCd("gravehook_drag", 2);
      ctx.hit(member, Math.max(1, Math.floor(strv * 0.95 * ctx.outMult)), "Gravehook Drag hooks");
      if (ctx.rng.chance(45)) applyPartyMemberCripple(st, member, 2);
      return true;
    }
    if (ctx.ready("last_procession")) {
      ctx.setCd("last_procession", 5);
      const hit = Math.max(1, Math.floor(strv * 0.7 * ctx.outMult));
      const crippled =
        (member.kind === "hero" && (st.status?.playerCrippleTurns || 0) > 0) ||
        (member.kind !== "hero" && (member.crippleTurns || 0) > 0);
      ctx.hitAdjacent(member, Math.max(1, Math.floor(hit * (crippled ? 1.15 : 1))), "Last Procession sweeps", 1, 1);
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(strv * 0.6 * ctx.outMult)), "Ironbone Strike hits");
    return true;
  },

  pale_rime_wisp(foe, st, ctx) {
    const intv = foe.int || 20;
    const lowest = lowestHpAlly(st, foe.uid);
    if (ctx.ready("wisp_veil") && lowest && (lowest.combat?.absorbTurns || 0) <= 0) {
      ctx.setCd("wisp_veil", 3);
      grantFoeAbsorb(lowest, Math.max(1, Math.floor((lowest.vit || 30) * 0.6)), 1);
      ctx.log(`${foe.name} wraps ${lowest.name} in Wisp Veil.`);
      return true;
    }
    const member = ctx.pickTarget("mage");
    const hit = Math.max(1, Math.floor(intv * 0.35 * ctx.outMult));
    ctx.hit(member, hit, "Chill Flicker chills");
    if (ctx.rng.chance(30)) applyPartyMemberBlind(st, member, 5, 1);
    return true;
  },

  the_stillness_below(foe, st, ctx) {
    const member = ctx.pickTarget("tank");
    const hpFrac = ctx.foeHpFrac();
    const strv = foe.str || 20;
    const intv = foe.int || 20;
    const magicBonus = 1 + (foe.combat.outgoingMagicBonusPct || 0) / 100;
    const accBonus = 1 + (foe.combat.outgoingAccuracyBonusPct || 0) / 100;
    const phase3 = !!foe.combat.stillnessPhase3;
    const phase2 = !!foe.combat.stillnessPhase2;

    if (hpFrac <= 0.7 && !foe.combat.stillnessPhase2) {
      foe.combat.stillnessPhase2 = true;
      foe.combat.magicResBonusPct = Math.max(foe.combat.magicResBonusPct || 0, 8);
      foe.combat.statusResBonusPct = Math.max(foe.combat.statusResBonusPct || 0, 6);
      ctx.log(`${foe.name} enters The Glacier Opens.`);
      if ((st.foes || []).filter((f) => f && f.hp > 0).length < 8) {
        spawnReinforcement(st, "Frost Skitter", ctx.rng);
      }
      if ((st.foes || []).filter((f) => f && f.hp > 0).length < 8) {
        spawnReinforcement(st, "Glacier Turtoise", ctx.rng);
      }
      return true;
    }
    if (hpFrac <= 0.35 && !foe.combat.stillnessPhase3) {
      foe.combat.stillnessPhase3 = true;
      foe.combat.outgoingMagicBonusPct = Math.max(foe.combat.outgoingMagicBonusPct || 0, 10);
      foe.combat.outgoingAccuracyBonusPct = Math.max(foe.combat.outgoingAccuracyBonusPct || 0, 8);
      ctx.log(`${foe.name} enters Absolute Stillness.`);
      return true;
    }
    if (phase3 && ctx.ready("absolute_zero_pulse")) {
      ctx.setCd("absolute_zero_pulse", 6);
      const hit = Math.max(1, Math.floor(intv * 0.58 * ctx.outMult * magicBonus * accBonus));
      for (const m of (st.party || []).filter((x) => x && x.hp > 0)) {
        ctx.hit(m, hit, "Absolute Zero Pulse freezes");
        tryPartyMemberStun(st, m, ctx.rng, 0.2, ctx.player, ctx.log);
        if (ctx.rng.chance(45)) applyPartyMemberMagicDamageDown(st, m, 8, 2);
      }
      return true;
    }
    if (phase2 && ctx.ready("fracture_the_surface") && livingPartyCount(st) >= 3) {
      ctx.setCd("fracture_the_surface", 5);
      const hit = Math.max(1, Math.floor(strv * 0.5 * ctx.outMult));
      for (const m of (st.party || []).filter((x) => x && x.hp > 0)) {
        ctx.hit(m, hit, "Fracture the Surface shakes");
        tryPartyMemberStun(st, m, ctx.rng, 0.18, ctx.player, ctx.log);
        if (ctx.rng.chance(35)) applyPartyMemberCripple(st, m, 1);
      }
      return true;
    }
    if (ctx.ready("glacial_carapace") && hpFrac < 0.75 && (foe.combat.mitigationTurns || 0) <= 0) {
      ctx.setCd("glacial_carapace", 4);
      setFoeMitigation(foe, 2, 0.85);
      foe.combat.magicResBonusPct = Math.max(foe.combat.magicResBonusPct || 0, 8);
      foe.combat.statusResBonusPct = Math.max(foe.combat.statusResBonusPct || 0, 8);
      foe.combat.magicResBonusTurns = Math.max(foe.combat.magicResBonusTurns || 0, 2);
      foe.combat.statusResBonusTurns = Math.max(foe.combat.statusResBonusTurns || 0, 2);
      ctx.log(`${foe.name} raises Glacial Carapace.`);
      return true;
    }
    const living = (st.party || []).filter((x) => x && x.hp > 0);
    if (ctx.ready("silence_wave") && living.filter((m) => !isMemberBlinded(st, m)).length >= 2) {
      ctx.setCd("silence_wave", 3);
      const hit = Math.max(1, Math.floor(intv * 0.42 * ctx.outMult * magicBonus));
      for (const m of living) {
        ctx.hit(m, hit, "Silence Wave numbs");
        if (ctx.rng.chance(45)) applyPartyMemberBlind(st, m, 8, 2);
      }
      return true;
    }
    if (
      ctx.ready("abyssal_rime") &&
      living.filter((m) => (m.kind === "hero" ? (st.status?.playerMagicDamageDownTurns || 0) <= 0 : (m.magicDamageDownTurns || 0) <= 0))
        .length >= 2
    ) {
      ctx.setCd("abyssal_rime", 4);
      const hit = Math.max(1, Math.floor(intv * 0.55 * ctx.outMult * magicBonus));
      ctx.hitAdjacent(member, hit, "Abyssal Rime chills", 2, 1);
      if (ctx.rng.chance(40)) applyPartyMemberMagicDamageDown(st, member, 8, 2);
      return true;
    }
    if (ctx.ready("eye_beneath")) {
      ctx.setCd("eye_beneath", 5);
      const target = ctx.pickTarget("mage");
      const hit = Math.max(1, Math.floor(intv * 0.7 * ctx.outMult * magicBonus * accBonus));
      ctx.hit(target, hit, "Eye Beneath sees");
      if (ctx.rng.chance(50)) applyPartyMemberStatusResistDown(st, target, 6, 2);
      if (ctx.rng.chance(35)) applyPartyMemberBlind(st, target, 6, 2);
      return true;
    }
    if (ctx.ready("pressure_under_ice")) {
      ctx.setCd("pressure_under_ice", 2);
      const target = ctx.pickTarget("assassin");
      ctx.hit(target, Math.max(1, Math.floor(strv * 1.0 * ctx.outMult)), "Pressure Under Ice bulges");
      if (ctx.rng.chance(45)) applyPartyMemberCripple(st, target, 1);
      return true;
    }
    const basicHit = Math.max(1, Math.floor(intv * (phase3 ? 0.35 : 0.42) * ctx.outMult * magicBonus * accBonus));
    if (phase3) {
      ctx.hitAdjacent(member, basicHit, "Rime Pressure surges", 1, 1);
    } else {
      ctx.hit(member, basicHit, "Rime Pressure strikes");
    }
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
