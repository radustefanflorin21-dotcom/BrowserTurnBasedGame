/**
 * Biome enemy scripts — server/client parity with game.js runExtendedBiomeEnemyScripts.
 * Regenerate: node scripts/generate_enemy_scripts_biome.mjs
 */
import {
  applyPartyMemberBlind,
  applyPartyMemberCripple,
  applyPartyMemberIncomingDamageUp,
  applyPartyMemberSuppressedDamageDownBoth,
  applyPlayerAccuracyDown,
  applyPlayerBleed,
  applyPlayerBurn,
  applyPlayerPoison,
  ensureCombatStatus,
  extendPlayerDebuffDurations,
  tryPartyMemberStun
} from "./status.js";

function livingPartyCount(st) {
  return (st.party || []).filter((m) => m && m.hp > 0).length;
}

function lowestHpAlly(st, excludeUid) {
  const allies = (st.foes || []).filter((f) => f && f.hp > 0 && f.uid !== excludeUid);
  if (!allies.length) return null;
  return allies.reduce((a, b) => (a.hp / Math.max(1, a.maxHp) <= b.hp / Math.max(1, b.maxHp) ? a : b));
}

function applyBurnFromHit(st, member, hit, dotPct, turns, rng) {
  if (!rng.chance(dotPct)) return;
  applyPlayerBurn(st, Math.max(1, Math.floor(hit * (dotPct / 100))), turns);
}

function rollBlindAll(st, ctx, chance, pct, turns) {
  for (const m of (st.party || []).filter((x) => x && x.hp > 0)) {
    if (ctx.rng.chance(chance)) applyPartyMemberBlind(st, m, pct, turns);
  }
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

function runTideEchoStrikes(st, summoner, ctx) {
  const echoes = (st.foes || []).filter(
    (f) => f && f.hp > 0 && f.name === "Tide Echo" && f.combat && f.combat.summonerUid === summoner.uid
  );
  for (const echo of echoes) {
    const target = ctx.pickTarget("weakest");
    if (!target) continue;
    const dmg = Math.max(1, Math.floor((echo.attack || echo.str || 10) * 0.7 * ctx.outMult));
    ctx.hit(target, dmg, "Echo Strikes");
    applyPlayerAccuracyDown(st, 5, 1);
  }
}

export const BIOME_SCRIPT_HANDLERS = {
  abyssal_tempest_caller(foe, st, ctx) {
    const member = ctx.pickTarget("controller");
    if (ctx.ready("tempest_bind")) {
      ctx.setCd("tempest_bind", 2);
      applyPlayerAccuracyDown(st, 15, 2);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.7 * ctx.outMult));
      ctx.hit(member, hit, "casts Tempest Bind at");
      return true;
    }
    if (ctx.ready("static_barrier")) {
      ctx.setCd("static_barrier", 3);
      ctx.log(`${foe.name} raises a Static Barrier.`);
      for (const f of (st.foes || []).filter((x) => x && x.hp > 0)) {
        if (!f.combat) f.combat = { skillCd: {} };
        f.combat.evadeNextChance = Math.max(f.combat.evadeNextChance || 0, 0.12);
      }
      ctx.log(`${foe.name} raises a Static Barrier.`);
      return true;
    }
    if (ctx.ready("storm_collapse")) {
      ctx.setCd("storm_collapse", 4);
      ensureCombatStatus(st);
      st.status.playerStaminaCostUpPct = Math.max(st.status.playerStaminaCostUpPct || 0, 15);
      st.status.playerStaminaCostUpTurns = Math.max(st.status.playerStaminaCostUpTurns || 0, 2);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.65 * ctx.outMult));
      for (const m of (st.party || []).filter((x) => x && x.hp > 0)) ctx.hit(m, hit, "collapses the storm on");
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.55 * ctx.outMult)), "hits");
    return true;
  },

  ash_horror(foe, st, ctx) {
    const member = ctx.pickTarget("mage");
    if (ctx.ready("smother")) {
      ctx.setCd("smother", 2);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.5 * ctx.outMult));
      ctx.hit(member, hit, "Suffocates");
      return true;
    }
    if (ctx.ready("decay_aura")) {
      ctx.setCd("decay_aura", 3);
      ctx.log(`${foe.name} spreads Decay Aura.`);
      return true;
    }
    if (ctx.ready("ash_touch")) {
      ctx.setCd("ash_touch", 1);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.5 * ctx.outMult));
      ctx.hit(member, hit, "Ash Touches");
      applyBurnFromHit(st, member, hit, 10, 2, ctx.rng);
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.5 * ctx.outMult)), "hits");
    return true;
  },

  ash_lizard(foe, st, ctx) {
    const member = ctx.pickTarget("bruiser");
    if (ctx.foeHpFrac() < 0.7 && ctx.ready("heat_skin")) {
      ctx.setCd("heat_skin", 3);
      ctx.log(`${foe.name} uses Heat Skin.`);
      setFoeMitigation(foe, 2, 0.75);
      ctx.log(`${foe.name} uses Heat Skin.`);
      return true;
    }
    if (livingPartyCount(st) >= 2 && ctx.ready("scorch_trail")) {
      ctx.setCd("scorch_trail", 3);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.65 * ctx.outMult));
      for (const m of (st.party || []).filter((x) => x && x.hp > 0)) ctx.hit(m, hit, "Scorch Trails");
      return true;
    }
    if (ctx.ready("ember_bite")) {
      ctx.setCd("ember_bite", 1);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.52 * ctx.outMult));
      ctx.hit(member, hit, "Ember Bites");
      applyBurnFromHit(st, member, hit, 10, 2, ctx.rng);
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.48 * ctx.outMult)), "hits");
    return true;
  },

  ash_skulker(foe, st, ctx) {
    const member = ctx.pickTarget("assassin");
    if (ctx.ready("fade")) {
      ctx.setCd("fade", 3);
      ctx.log(`${foe.name} Fades.`);
      foe.combat.evadeNextChance = Math.max(foe.combat.evadeNextChance || 0, 0.4);
      ctx.log(`${foe.name} Fades.`);
      return true;
    }
    if (ctx.ready("ash_mark")) {
      ctx.setCd("ash_mark", 3);
      applyPartyMemberIncomingDamageUp(st, member, 10, 2);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.45 * ctx.outMult));
      ctx.hit(member, hit, "Ash Marks");
      return true;
    }
    if (ctx.ready("backstab")) {
      ctx.setCd("backstab", 2);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.98 * ctx.outMult));
      ctx.hit(member, hit, "Backstabs");
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.52 * ctx.outMult)), "hits");
    return true;
  },

  barkhide_spriggan(foe, st, ctx) {
    const member = ctx.pickTarget("controller");
    if (ctx.foeHpFrac() < 0.6 && ctx.ready("nature_guard")) {
      ctx.setCd("nature_guard", 3);
      ctx.log(`${foe.name} Nature Guards.`);
      const ally = lowestHpAlly(st, foe.uid);
      if (ally) {
        const amt = Math.max(1, Math.floor(ally.maxHp * 0.2));
        ally.hp = Math.min(ally.maxHp, ally.hp + amt);
        ctx.log(`${foe.name} heals ${ally.name} for ${amt}.`);
      }
      return true;
    }
    if (ctx.ready("barkskin")) {
      ctx.setCd("barkskin", 3);
      ctx.log(`${foe.name} casts Barkskin.`);
      const ally = lowestHpAlly(st, foe.uid);
      if (ally) { setFoeMitigation(ally, 2, 0.75); ctx.log(`${foe.name} shields ${ally.name}.`); } else ctx.log(`${foe.name} casts Barkskin.`);
      return true;
    }
    if (ctx.ready("root_bind_sg")) {
      ctx.setCd("root_bind_sg", 2);
      ensureCombatStatus(st);
      st.status.playerStaminaCostUpPct = Math.max(st.status.playerStaminaCostUpPct || 0, 12);
      st.status.playerStaminaCostUpTurns = Math.max(st.status.playerStaminaCostUpTurns || 0, 2);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.58 * ctx.outMult));
      ctx.hit(member, hit, "Root Binds");
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.5 * ctx.outMult)), "hits");
    return true;
  },

  brinegullet_spitter(foe, st, ctx) {
    const member = ctx.pickTarget("mage");
    if (ctx.ready("corrosive_pool")) {
      ctx.setCd("corrosive_pool", 3);
      applyPartyMemberIncomingDamageUp(st, member, 8, 2);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.55 * ctx.outMult));
      for (const m of (st.party || []).filter((x) => x && x.hp > 0)) ctx.hit(m, hit, "Corrosive Pools");
      return true;
    }
    if (ctx.ready("acid_spit")) {
      ctx.setCd("acid_spit", 2);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.62 * ctx.outMult));
      ctx.hit(member, hit, "spits acid at");
      applyPlayerBleed(st, Math.max(1, Math.floor(hit * 0.12)), 2);
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.58 * ctx.outMult)), "hits");
    return true;
  },

  cinder_husk(foe, st, ctx) {
    const member = ctx.pickTarget("tank");
    if (ctx.foeHpFrac() < 0.55 && ctx.ready("dead_flesh")) {
      ctx.setCd("dead_flesh", 3);
      ctx.log(`${foe.name} hardens Dead Flesh.`);
      setFoeMitigation(foe, 2, 0.7);
      ctx.log(`${foe.name} hardens Dead Flesh.`);
      return true;
    }
    if (ctx.ready("grave_fortitude")) {
      ctx.setCd("grave_fortitude", 3);
      ctx.log(`${foe.name} channels Grave Fortitude.`);
      ctx.healSelf(0.12);
      ctx.log(`${foe.name} channels Grave Fortitude.`);
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.62 * ctx.outMult)), "hits");
    return true;
  },

  cinder_stalker(foe, st, ctx) {
    const member = ctx.pickTarget("assassin");
    if (ctx.foeHpFrac() < 0.55 && ctx.ready("smoke_veil")) {
      ctx.setCd("smoke_veil", 3);
      ctx.log(`${foe.name} uses Smoke Veil.`);
      foe.combat.evadeNextChance = Math.max(foe.combat.evadeNextChance || 0, 0.42);
      ctx.log(`${foe.name} uses Smoke Veil.`);
      return true;
    }
    if (ctx.ready("blazing_pounce")) {
      ctx.setCd("blazing_pounce", 2);
      ctx.applySkill("blazing_pounce", {
        member,
        raw: Math.max(1, Math.floor(ctx.atk * 0.95 * ctx.outMult)),
        verb: "Blazing Pounces"
      });
      return true;
    }
    if (ctx.ready("cinder_claw")) {
      ctx.setCd("cinder_claw", 2);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.68 * ctx.outMult));
      ctx.hit(member, hit, "Cinder Claws");
      applyBurnFromHit(st, member, hit, 10, 2, ctx.rng);
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.55 * ctx.outMult)), "hits");
    return true;
  },

  cliff_lurker(foe, st, ctx) {
    const member = ctx.pickTarget("assassin");
    if (ctx.ready("rock_skip")) {
      ctx.setCd("rock_skip", 3);
      ctx.log(`${foe.name} uses Rock Skip.`);
      foe.combat.evadeNextChance = Math.max(foe.combat.evadeNextChance || 0, 0.38);
      ctx.log(`${foe.name} uses Rock Skip.`);
      return true;
    }
    if ((st.playerMax > 0 ? st.playerHp / st.playerMax : 1) < 0.5 && ctx.ready("ambush_drop")) {
      ctx.setCd("ambush_drop", 2);
      ctx.applySkill("ambush_drop", {
        member,
        raw: Math.max(1, Math.floor(ctx.atk * 0.98 * ctx.outMult)),
        verb: "Ambush Drops on"
      });
      return true;
    }
    if (ctx.ready("grip_strike")) {
      ctx.setCd("grip_strike", 2);
      ensureCombatStatus(st);
      st.status.playerStaminaCostUpPct = Math.max(st.status.playerStaminaCostUpPct || 0, 10);
      st.status.playerStaminaCostUpTurns = Math.max(st.status.playerStaminaCostUpTurns || 0, 2);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.72 * ctx.outMult));
      ctx.hit(member, hit, "Grip Strikes");
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.55 * ctx.outMult)), "hits");
    return true;
  },

  coastal_horror(foe, st, ctx) {
    const member = ctx.pickTarget("highest_damage");
    if (ctx.ready("abyss_grip")) {
      ctx.setCd("abyss_grip", 3);
      ctx.log(`${foe.name} uses Abyss Grip.`);
      for (const m of (st.party || []).filter((x) => x && x.hp > 0)) applyPartyMemberSuppressedDamageDownBoth(st, m, 12, 2);
      ctx.log(`${foe.name} uses Abyss Grip.`);
      return true;
    }
    if (ctx.ready("terror_pulse")) {
      ctx.setCd("terror_pulse", 4);
      ctx.log(`${foe.name} extends your debuffs.`);
      extendPlayerDebuffDurations(st, 1);
      ctx.log(`${foe.name} extends your debuffs.`);
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.6 * ctx.outMult)), "hits");
    return true;
  },

  desert_thornback_crawler(foe, st, ctx) {
    const member = ctx.pickTarget("tank");
    if (ctx.foeHpFrac() < 0.6 && ctx.ready("dry_carapace")) {
      ctx.setCd("dry_carapace", 3);
      ctx.log(`${foe.name} raises Dry Carapace.`);
      setFoeMitigation(foe, 2, 0.8);
      ctx.log(`${foe.name} raises Dry Carapace.`);
      return true;
    }
    if (ctx.ready("spiked_shell")) {
      ctx.setCd("spiked_shell", 3);
      ctx.log(`${foe.name} raises Spiked Shell.`);
      return true;
    }
    if (ctx.ready("defensive_taunt")) {
      ctx.setCd("defensive_taunt", 4);
      ctx.log(`${foe.name} Defensive Taunts.`);
      foe.combat.tauntPlayerTurns = Math.max(foe.combat.tauntPlayerTurns || 0, 1);
      ctx.log(`${foe.name} Defensive Taunts.`);
      return true;
    }
    if (ctx.ready("impale")) {
      ctx.setCd("impale", 2);
      const hit = Math.max(1, Math.floor(ctx.atk * 1.05 * ctx.outMult));
      ctx.hit(member, hit, "Impales");
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.92 * ctx.outMult)), "hits");
    return true;
  },

  driftling(foe, st, ctx) {
    const member = ctx.pickTarget("bruiser");
    if ((() => { const a = lowestHpAlly(st, foe.uid); return a && a.maxHp > 0 && a.hp / a.maxHp < 0.45; })() && ctx.ready("tidal_mend")) {
      ctx.setCd("tidal_mend", 3);
      ctx.log(`${foe.name} casts Tidal Mend.`);
      const ally = lowestHpAlly(st, foe.uid);
      if (ally) {
        const amt = Math.max(1, Math.floor(ally.maxHp * 0.2));
        ally.hp = Math.min(ally.maxHp, ally.hp + amt);
        ctx.log(`${foe.name} heals ${ally.name} for ${amt}.`);
      }
      return true;
    }
    if ((st.foes || []).filter((f) => f && f.hp > 0).length >= 2 && ctx.ready("mist_veil")) {
      ctx.setCd("mist_veil", 3);
      ctx.log(`${foe.name} casts Mist Veil.`);
      for (const f of (st.foes || []).filter((x) => x && x.hp > 0)) {
        if (!f.combat) f.combat = { skillCd: {} };
        f.combat.evadeNextChance = Math.max(f.combat.evadeNextChance || 0, 0.1);
      }
      ctx.log(`${foe.name} casts Mist Veil.`);
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.55 * ctx.outMult)), "hits");
    return true;
  },

  dune_devourer(foe, st, ctx) {
    const member = ctx.pickTarget("bruiser");
    if (ctx.foeHpFrac() < 0.5 && ctx.ready("sand_devour")) {
      ctx.setCd("sand_devour", 3);
      ctx.applySkill("sand_devour", {
        member,
        raw: Math.max(1, Math.floor(ctx.atk * 0.88 * ctx.outMult)),
        verb: "Sand Devours"
      });
      ctx.healSelf(0.2);
      return true;
    }
    if (ctx.ready("grinding_maw")) {
      ctx.setCd("grinding_maw", 2);
      ensureCombatStatus(st);
      st.status.playerFragileTurns = Math.max(st.status.playerFragileTurns || 0, 1);
      ctx.applySkill("grinding_maw", {
        member,
        raw: Math.max(1, Math.floor(ctx.atk * 0.72 * ctx.outMult)),
        verb: "Grinding Maws"
      });
      return true;
    }
    if (ctx.ready("burrow_ambush")) {
      ctx.setCd("burrow_ambush", 3);
      ctx.applySkill("burrow_ambush", {
        member,
        raw: Math.max(1, Math.floor(ctx.atk * 1.05 * ctx.outMult)),
        verb: "Burrow Ambushes"
      });
      return true;
    }
    if (ctx.ready("sand_devour")) {
      ctx.setCd("sand_devour", 3);
      ctx.applySkill("sand_devour", {
        member,
        raw: Math.max(1, Math.floor(ctx.atk * 0.88 * ctx.outMult)),
        verb: "Sand Devours"
      });
      ctx.healSelf(0.2);
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.65 * ctx.outMult)), "hits");
    return true;
  },

  dust_carver(foe, st, ctx) {
    const member = ctx.pickTarget("assassin");
    if (ctx.ready("drystep")) {
      ctx.setCd("drystep", 3);
      ctx.log(`${foe.name} uses Drystep.`);
      foe.combat.evadeNextChance = Math.max(foe.combat.evadeNextChance || 0, 0.35);
      ctx.log(`${foe.name} uses Drystep.`);
      return true;
    }
    if (ctx.ready("blind_dust")) {
      ctx.setCd("blind_dust", 3);
      ctx.log(`${foe.name} throws Blind Dust.`);
      rollBlindAll(st, ctx, 45, 8, 2);
      ctx.log(`${foe.name} throws Blind Dust.`);
      return true;
    }
    if (ctx.ready("sand_slash")) {
      ctx.setCd("sand_slash", 2);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.85 * ctx.outMult));
      ctx.hit(member, hit, "Sand Slashes");
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.82 * ctx.outMult)), "hits");
    return true;
  },

  ember_scuttler(foe, st, ctx) {
    const member = ctx.pickTarget("controller");
    if (ctx.ready("fire_web")) {
      ctx.setCd("fire_web", 2);
      ensureCombatStatus(st);
      st.status.playerStaminaCostUpPct = Math.max(st.status.playerStaminaCostUpPct || 0, 10);
      st.status.playerStaminaCostUpTurns = Math.max(st.status.playerStaminaCostUpTurns || 0, 2);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.45 * ctx.outMult));
      ctx.hit(member, hit, "Fire Webs");
      return true;
    }
    if (ctx.ready("ignite")) {
      ctx.setCd("ignite", 2);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.5 * ctx.outMult));
      ctx.hit(member, hit, "Ignites");
      applyBurnFromHit(st, member, hit, 11, 2, ctx.rng);
      return true;
    }
    if (ctx.ready("scuttle_burst")) {
      ctx.setCd("scuttle_burst", 2);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.32 * ctx.outMult));
      ctx.hit(member, hit, "Scuttle Bursts");
      ctx.hit(member, hit, "Scuttle Bursts");
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.45 * ctx.outMult)), "hits");
    return true;
  },

  faded_war_wraith(foe, st, ctx) {
    const member = ctx.pickTarget("weakest");
    if ((st.foes || []).filter((f) => f && f.hp > 0).length < 8 && ctx.ready("call_fallen")) {
      ctx.setCd("call_fallen", 4);
      ctx.summonAdjacent("Fallen Echo");
      return true;
    }
    if (ctx.ready("soul_chill")) {
      ctx.setCd("soul_chill", 3);
      ctx.applySkill("soul_chill", {
        member,
        raw: Math.max(1, Math.floor((foe.int || 20) * 0.45 * ctx.outMult)),
        verb: "Soul Chills"
      });
      return true;
    }
    if (ctx.ready("haunt")) {
      ctx.setCd("haunt", 2);
      ctx.applySkill("haunt", {
        member,
        raw: Math.max(1, Math.floor((foe.int || 20) * 0.5 * ctx.outMult)),
        verb: "Haunts"
      });
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.58 * ctx.outMult)), "hits");
    return true;
  },

  frost_skitter(foe, st, ctx) {
    const member = ctx.pickTarget("controller");
    if (ctx.ready("crystal_nerves")) {
      ctx.setCd("crystal_nerves", 3);
      ctx.log(`${foe.name} sharpens Crystal Nerves.`);
      foe.combat.evadeNextChance = Math.max(foe.combat.evadeNextChance || 0, 0.15);
      ctx.log(`${foe.name} sharpens Crystal Nerves.`);
      return true;
    }
    if (ctx.ready("absolute_zero")) {
      ctx.setCd("absolute_zero", 4);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.55 * ctx.outMult));
      for (const m of (st.party || []).filter((x) => x && x.hp > 0)) ctx.hit(m, hit, "Absolute Zero chills");
      return true;
    }
    if (ctx.ready("ice_web")) {
      ctx.setCd("ice_web", 2);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.48 * ctx.outMult));
      ctx.hit(member, hit, "Ice Webs");
      if (ctx.rng.chance(45)) applyPartyMemberCripple(st, member, 2);
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.45 * ctx.outMult)), "hits");
    return true;
  },

  frozen_pinecone(foe, st, ctx) {
    const member = ctx.pickTarget("controller");
    if (ctx.ready("needle_scatter")) {
      ctx.setCd("needle_scatter", 2);
      ctx.applySkill("needle_scatter", {
        member,
        raw: Math.max(1, Math.floor(ctx.atk * 0.42 * ctx.outMult)),
        verb: "Needle Scatters"
      });
      return true;
    }
    if (ctx.ready("freeze_burst")) {
      ctx.setCd("freeze_burst", 3);
      ctx.applySkill("freeze_burst", {
        member,
        raw: Math.max(1, Math.floor(ctx.atk * 0.5 * ctx.outMult)),
        verb: "Freeze Burst hits"
      });
      return true;
    }
    if (ctx.ready("drop_strike")) {
      ctx.setCd("drop_strike", 2);
      ctx.applySkill("drop_strike", {
        member,
        raw: Math.max(1, Math.floor(ctx.atk * 0.75 * ctx.outMult)),
        verb: "Drop Strikes"
      });
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.35 * ctx.outMult)), "hits");
    return true;
  },

  frozen_stalker(foe, st, ctx) {
    const member = ctx.pickTarget("assassin");
    if (ctx.ready("whiteout_veil")) {
      ctx.setCd("whiteout_veil", 3);
      ctx.log(`${foe.name} uses Whiteout Veil.`);
      foe.combat.evadeNextChance = Math.max(foe.combat.evadeNextChance || 0, 0.4);
      ctx.log(`${foe.name} uses Whiteout Veil.`);
      return true;
    }
    if (ctx.ready("chill_mark")) {
      ctx.setCd("chill_mark", 2);
      ctx.applySkill("chill_mark", {
        member,
        raw: Math.max(1, Math.floor(ctx.atk * 0.55 * ctx.outMult)),
        verb: "Chill Marks"
      });
      return true;
    }
    if (ctx.ready("frozen_ambush")) {
      ctx.setCd("frozen_ambush", 2);
      ctx.applySkill("frozen_ambush", {
        member,
        raw: Math.max(1, Math.floor(ctx.atk * 0.95 * ctx.outMult)),
        verb: "Frozen Ambushes"
      });
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.58 * ctx.outMult)), "hits");
    return true;
  },

  glacier_turtoise(foe, st, ctx) {
    const member = ctx.pickTarget("tank");
    if (ctx.ready("ice_shell")) {
      ctx.setCd("ice_shell", 3);
      ctx.log(`${foe.name} raises Ice Shell.`);
      setFoeMitigation(foe, 2, 0.78);
      ctx.log(`${foe.name} raises Ice Shell.`);
      return true;
    }
    if (ctx.foeHpFrac() < 0.5 && ctx.ready("glacier_hard_shell")) {
      ctx.setCd("glacier_hard_shell", 4);
      ctx.log(`${foe.name} uses Glacier Hard Shell.`);
      setFoeMitigation(foe, 2, 0.65);
      setFoeReflect(foe, 1, 0.08);
      ctx.log(`${foe.name} uses Glacier Hard Shell.`);
      return true;
    }
    if (ctx.ready("slow_crush")) {
      ctx.setCd("slow_crush", 2);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.85 * ctx.outMult));
      ctx.hit(member, hit, "Slow Crushes");
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.55 * ctx.outMult)), "hits");
    return true;
  },

  greenleaf_fox(foe, st, ctx) {
    const member = ctx.pickTarget("assassin");
    if (ctx.ready("fade_step")) {
      ctx.setCd("fade_step", 3);
      ctx.log(`${foe.name} uses Fade Step.`);
      foe.combat.evadeNextChance = Math.max(foe.combat.evadeNextChance || 0, 0.38);
      ctx.log(`${foe.name} uses Fade Step.`);
      return true;
    }
    if (ctx.ready("rending_snap")) {
      ctx.setCd("rending_snap", 2);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.82 * ctx.outMult));
      ctx.hit(member, hit, "Rending Snaps");
      applyPlayerBleed(st, Math.max(1, Math.floor(hit * 0.12)), 2);
      return true;
    }
    if (ctx.ready("ambush_bite")) {
      ctx.setCd("ambush_bite", 2);
      ctx.applySkill("ambush_bite", {
        member,
        raw: Math.max(1, Math.floor(ctx.atk * 0.92 * ctx.outMult)),
        verb: "Ambush Bites"
      });
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.52 * ctx.outMult)), "hits");
    return true;
  },

  greenleaf_parrot(foe, st, ctx) {
    const member = ctx.pickTarget("controller");
    if (ctx.ready("echo_cry")) {
      ctx.setCd("echo_cry", 4);
      ctx.log(`${foe.name} uses Echo Cry.`);
      return true;
    }
    if (ctx.ready("distracting_screech")) {
      ctx.setCd("distracting_screech", 3);
      applyPlayerAccuracyDown(st, 12, 2);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.55 * ctx.outMult));
      ctx.hit(member, hit, "Distracting Screeches");
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.5 * ctx.outMult)), "hits");
    return true;
  },

  greenleaf_stag(foe, st, ctx) {
    const member = ctx.pickTarget("support");
    if (ctx.ready("natures_blessing")) {
      ctx.setCd("natures_blessing", 3);
      ctx.log(`${foe.name} casts Nature's Blessing.`);
      const ally = lowestHpAlly(st, foe.uid);
      if (ally) {
        const amt = Math.max(1, Math.floor(ally.maxHp * 0.18));
        ally.hp = Math.min(ally.maxHp, ally.hp + amt);
        ctx.log(`${foe.name} heals ${ally.name} for ${amt}.`);
      }
      return true;
    }
    if (ctx.ready("verdant_ward")) {
      ctx.setCd("verdant_ward", 3);
      ctx.log(`${foe.name} casts Verdant Ward.`);
      return true;
    }
    if (ctx.ready("root_bind")) {
      ctx.setCd("root_bind", 2);
      ensureCombatStatus(st);
      st.status.playerStaminaCostUpPct = Math.max(st.status.playerStaminaCostUpPct || 0, 10);
      st.status.playerStaminaCostUpTurns = Math.max(st.status.playerStaminaCostUpTurns || 0, 2);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.62 * ctx.outMult));
      ctx.hit(member, hit, "Root Binds");
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.55 * ctx.outMult)), "hits");
    return true;
  },

  ice_tusked_boar(foe, st, ctx) {
    const member = ctx.pickTarget("bruiser");
    if (ctx.foeHpFrac() < 0.6 && ctx.ready("ice_armor")) {
      ctx.setCd("ice_armor", 3);
      ctx.log(`${foe.name} uses Ice Armor.`);
      setFoeMitigation(foe, 2, 0.55);
      ctx.log(`${foe.name} uses Ice Armor.`);
      return true;
    }
    if (ctx.ready("cold_rage")) {
      ctx.setCd("cold_rage", 3);
      ctx.log(`${foe.name} enters Cold Rage.`);
      foe.combat.outgoingDamageBonusPct = Math.max(foe.combat.outgoingDamageBonusPct || 0, 8);
      foe.combat.outgoingDamageBonusTurns = Math.max(foe.combat.outgoingDamageBonusTurns || 0, 2);
      ctx.log(`${foe.name} enters Cold Rage.`);
      return true;
    }
    if (ctx.ready("frost_charge")) {
      ctx.setCd("frost_charge", 2);
      ctx.applySkill("frost_charge", {
        member,
        raw: Math.max(1, Math.floor(ctx.atk * 1 * ctx.outMult)),
        verb: "Frost Charges"
      });
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.62 * ctx.outMult)), "hits");
    return true;
  },

  icy_mink(foe, st, ctx) {
    const member = ctx.pickTarget("assassin");
    if (ctx.foeHpFrac() < 0.5 && ctx.ready("slipstep")) {
      ctx.setCd("slipstep", 3);
      ctx.log(`${foe.name} uses Slipstep.`);
      foe.combat.evadeNextChance = Math.max(foe.combat.evadeNextChance || 0, 0.42);
      ctx.log(`${foe.name} uses Slipstep.`);
      return true;
    }
    if ((st.party || []).some((m) => m && m.hp > 0 && m.maxHp > 0 && m.hp / m.maxHp < 0.45) && ctx.ready("shiver_cut")) {
      ctx.setCd("shiver_cut", 2);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.9 * ctx.outMult));
      ctx.hit(member, hit, "Shiver Cuts");
      return true;
    }
    if (ctx.ready("frost_bite")) {
      ctx.setCd("frost_bite", 1);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.72 * ctx.outMult));
      ctx.hit(member, hit, "Frost Bites");
      if (ctx.rng.chance(40)) applyPartyMemberCripple(st, member, 2);
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.55 * ctx.outMult)), "hits");
    return true;
  },

  icy_serpent(foe, st, ctx) {
    const member = ctx.pickTarget("mage");
    if (ctx.foeHpFrac() < 0.55 && ctx.ready("freeze_skin")) {
      ctx.setCd("freeze_skin", 3);
      ctx.log(`${foe.name} raises Freeze Skin.`);
      setFoeMitigation(foe, 2, 0.8);
      ctx.log(`${foe.name} raises Freeze Skin.`);
      return true;
    }
    if (ctx.ready("constriction_chill")) {
      ctx.setCd("constriction_chill", 3);
      ensureCombatStatus(st);
      st.status.playerStaminaCostUpPct = Math.max(st.status.playerStaminaCostUpPct || 0, 12);
      st.status.playerStaminaCostUpTurns = Math.max(st.status.playerStaminaCostUpTurns || 0, 2);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.65 * ctx.outMult));
      ctx.hit(member, hit, "Constriction Chills");
      return true;
    }
    if (ctx.ready("cold_venom")) {
      ctx.setCd("cold_venom", 2);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.58 * ctx.outMult));
      ctx.hit(member, hit, "Cold Venom strikes");
      applyPlayerPoison(st, Math.max(1, Math.floor(hit * 0.08)), 2);
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.55 * ctx.outMult)), "hits");
    return true;
  },

  lava_basilisk(foe, st, ctx) {
    const member = ctx.pickTarget("controller");
    if (ctx.foeHpFrac() < 0.6 && ctx.ready("molten_sheen")) {
      ctx.setCd("molten_sheen", 3);
      ctx.log(`${foe.name} uses Molten Sheen.`);
      setFoeMitigation(foe, 2, 0.72);
      ctx.log(`${foe.name} uses Molten Sheen.`);
      return true;
    }
    if (ctx.ready("petrifying_heat")) {
      ctx.setCd("petrifying_heat", 3);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.85 * ctx.outMult));
      ctx.hit(member, hit, "Petrifying Heats");
      tryPartyMemberStun(st, member, ctx.rng, 0.2, ctx.player, ctx.log);
      return true;
    }
    if (ctx.ready("inferno_gaze")) {
      ctx.setCd("inferno_gaze", 2);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.9 * ctx.outMult));
      ctx.hit(member, hit, "Inferno Gaze brands");
      applyBurnFromHit(st, member, hit, 12, 2, ctx.rng);
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.52 * ctx.outMult)), "hits");
    return true;
  },

  magma_boar(foe, st, ctx) {
    foe.combat.magmaRot = (foe.combat.magmaRot || 0) + 1;
        const tank = foe.combat.magmaRot % 2 === 1;
    const member = ctx.pickTarget("bruiser");
    if ((typeof tank !== "undefined" && tank) || ctx.foeHpFrac() < 0.6 && ctx.ready("lava_armor")) {
      ctx.setCd("lava_armor", 4);
      ctx.log(`${foe.name} uses Lava Armor.`);
      setFoeMitigation(foe, 2, 0.55);
      setFoeReflect(foe, 1, 0.12);
      ctx.log(`${foe.name} uses Lava Armor.`);
      return true;
    }
    if (ctx.ready("boiling_rage")) {
      ctx.setCd("boiling_rage", 3);
      ctx.log(`${foe.name} enters Boiling Rage.`);
      foe.combat.outgoingDamageBonusPct = Math.max(foe.combat.outgoingDamageBonusPct || 0, 8);
      foe.combat.outgoingDamageBonusTurns = Math.max(foe.combat.outgoingDamageBonusTurns || 0, 2);
      ctx.log(`${foe.name} enters Boiling Rage.`);
      return true;
    }
    if (typeof tank === "undefined" || !tank && ctx.ready("molten_charge")) {
      ctx.setCd("molten_charge", 2);
      ctx.applySkill("molten_charge", {
        member,
        raw: Math.max(1, Math.floor(ctx.atk * 1.08 * ctx.outMult)),
        verb: "Molten Charges"
      });
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.65 * ctx.outMult)), "hits");
    return true;
  },

  mirage_lurker(foe, st, ctx) {
    const member = ctx.pickTarget("controller");
    if (ctx.ready("mirage_shift")) {
      ctx.setCd("mirage_shift", 3);
      ctx.log(`${foe.name} Mirage Shifts.`);
      foe.combat.evadeNextChance = Math.max(foe.combat.evadeNextChance || 0, 0.35);
      ctx.log(`${foe.name} Mirage Shifts.`);
      return true;
    }
    if (ctx.ready("heat_haze")) {
      ctx.setCd("heat_haze", 3);
      ctx.log(`${foe.name} spreads Heat Haze.`);
      rollBlindAll(st, ctx, 40, 8, 2);
      ctx.log(`${foe.name} spreads Heat Haze.`);
      return true;
    }
    if (ctx.ready("illusion_strike")) {
      ctx.setCd("illusion_strike", 2);
      for (const m of (st.party || []).filter((x) => x && x.hp > 0)) applyPartyMemberSuppressedDamageDownBoth(st, m, 10, 2);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.78 * ctx.outMult));
      ctx.hit(member, hit, "Illusion Strikes");
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.52 * ctx.outMult)), "hits");
    return true;
  },

  pinebound_fawn(foe, st, ctx) {
    const member = ctx.pickTarget("support");
    if (ctx.ready("gentle_heal")) {
      ctx.setCd("gentle_heal", 3);
      ctx.log(`${foe.name} casts Gentle Heal.`);
      const ally = lowestHpAlly(st, foe.uid);
      if (ally) {
        const amt = Math.max(1, Math.floor(ally.maxHp * 0.22));
        ally.hp = Math.min(ally.maxHp, ally.hp + amt);
        ctx.log(`${foe.name} heals ${ally.name} for ${amt}.`);
      }
      return true;
    }
    if (ctx.ready("winter_grace")) {
      ctx.setCd("winter_grace", 4);
      ctx.log(`${foe.name} casts Winter Grace.`);
      const ally = lowestHpAlly(st, foe.uid);
      if (ally) { setFoeMitigation(ally, 2, 0.85); ctx.log(`${foe.name} shields ${ally.name}.`); } else ctx.log(`${foe.name} casts Winter Grace.`);
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.45 * ctx.outMult)), "hits");
    return true;
  },

  remnant_of_rust(foe, st, ctx) {
    const member = ctx.pickTarget("controller");
    if (ctx.ready("corrode_armor")) {
      ctx.setCd("corrode_armor", 3);
      ctx.log(`${foe.name} Corrodes armor.`);
      return true;
    }
    if (ctx.ready("rust_strike")) {
      ctx.setCd("rust_strike", 2);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.72 * ctx.outMult));
      ctx.hit(member, hit, "Rust Strikes");
      return true;
    }
    if (ctx.ready("grinding_lock")) {
      ctx.setCd("grinding_lock", 2);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.65 * ctx.outMult));
      ctx.hit(member, hit, "Grinding Locks");
      if (ctx.rng.chance(45)) applyPartyMemberCripple(st, member, 2);
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.5 * ctx.outMult)), "hits");
    return true;
  },

  rock_ibex(foe, st, ctx) {
    const member = ctx.pickTarget("bruiser");
    if (ctx.ready("stone_skin")) {
      ctx.setCd("stone_skin", 3);
      ctx.log(`${foe.name} uses Stone Skin.`);
      setFoeMitigation(foe, 2, 0.82);
      ctx.log(`${foe.name} uses Stone Skin.`);
      return true;
    }
    if (ctx.ready("headbutt")) {
      ctx.setCd("headbutt", 2);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.95 * ctx.outMult));
      ctx.hit(member, hit, "Headbutts");
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.58 * ctx.outMult)), "hits");
    return true;
  },

  rock_lizard(foe, st, ctx) {
    const member = ctx.pickTarget("tank");
    if (ctx.ready("bask_in_dust")) {
      ctx.setCd("bask_in_dust", 3);
      ctx.log(`${foe.name} Basks in Dust.`);
      ctx.healSelf(0.1);
      ctx.log(`${foe.name} Basks in Dust.`);
      return true;
    }
    if (ctx.ready("harden")) {
      ctx.setCd("harden", 4);
      ctx.log(`${foe.name} Hardens.`);
      setFoeMitigation(foe, 2, 0.7);
      ctx.log(`${foe.name} Hardens.`);
      return true;
    }
    if (ctx.ready("stone_challenge")) {
      ctx.setCd("stone_challenge", 4);
      ctx.log(`${foe.name} Stone Challenges.`);
      foe.combat.tauntPlayerTurns = Math.max(foe.combat.tauntPlayerTurns || 0, 1);
      ctx.log(`${foe.name} Stone Challenges.`);
      return true;
    }
    if (ctx.ready("tail_slam")) {
      ctx.setCd("tail_slam", 2);
      const hit = Math.max(1, Math.floor(ctx.atk * 1.02 * ctx.outMult));
      ctx.hit(member, hit, "Tail Slams");
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.65 * ctx.outMult)), "hits");
    return true;
  },

  rock_lynx(foe, st, ctx) {
    const member = ctx.pickTarget("assassin");
    if (ctx.ready("agile_reflex")) {
      ctx.setCd("agile_reflex", 3);
      ctx.log(`${foe.name} uses Agile Reflex.`);
      foe.combat.evadeNextChance = Math.max(foe.combat.evadeNextChance || 0, 0.3);
      ctx.log(`${foe.name} uses Agile Reflex.`);
      return true;
    }
    if (ctx.ready("cliff_strike")) {
      ctx.setCd("cliff_strike", 2);
      ctx.applySkill("cliff_strike", {
        member,
        raw: Math.max(1, Math.floor(ctx.atk * 0.88 * ctx.outMult)),
        verb: "Cliff Strikes"
      });
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.55 * ctx.outMult)), "hits");
    return true;
  },

  rock_serpent(foe, st, ctx) {
    const member = ctx.pickTarget("controller");
    if (ctx.ready("stone_slither")) {
      ctx.setCd("stone_slither", 3);
      ctx.log(`${foe.name} Stone Slithers.`);
      foe.combat.evadeNextChance = Math.max(foe.combat.evadeNextChance || 0, 0.2);
      ctx.log(`${foe.name} Stone Slithers.`);
      return true;
    }
    if (ctx.ready("petrify_gaze")) {
      ctx.setCd("petrify_gaze", 4);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.55 * ctx.outMult));
      ctx.hit(member, hit, "Petrify Gaze locks onto");
      if (ctx.rng.chance(45)) applyPartyMemberBlind(st, member, 8, 2);
      return true;
    }
    if (ctx.ready("debilitating_venom")) {
      ctx.setCd("debilitating_venom", 2);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.62 * ctx.outMult));
      ctx.hit(member, hit, "Debilitating Venom bites");
      applyPlayerPoison(st, Math.max(1, Math.floor(hit * 0.08)), 2);
      return true;
    }
    if (ctx.ready("crush_coil")) {
      ctx.setCd("crush_coil", 3);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.78 * ctx.outMult));
      ctx.hit(member, hit, "Crushing Coil constricts");
      if (ctx.rng.chance(40)) applyPartyMemberCripple(st, member, 2);
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.6 * ctx.outMult)), "hits");
    return true;
  },

  saltwind_skimmer(foe, st, ctx) {
    const member = ctx.pickTarget("assassin");
    if (ctx.ready("glide")) {
      ctx.setCd("glide", 3);
      ctx.log(`${foe.name} Glides away.`);
      foe.combat.evadeNextChance = Math.max(foe.combat.evadeNextChance || 0, 0.35);
      ctx.log(`${foe.name} Glides away.`);
      return true;
    }
    if (ctx.ready("salt_peck")) {
      ctx.setCd("salt_peck", 2);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.58 * ctx.outMult));
      ctx.hit(member, hit, "Salt Pecks");
      return true;
    }
    if (ctx.ready("wind_slice")) {
      ctx.setCd("wind_slice", 2);
      ctx.applySkill("wind_slice", {
        member,
        raw: Math.max(1, Math.floor(ctx.atk * 0.72 * ctx.outMult)),
        verb: "Wind Slices"
      });
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.52 * ctx.outMult)), "hits");
    return true;
  },

  stone_marmot(foe, st, ctx) {
    const member = ctx.pickTarget("tank");
    if (ctx.foeHpFrac() < 0.5 && ctx.ready("burrow_guard")) {
      ctx.setCd("burrow_guard", 3);
      ctx.log(`${foe.name} Burrow Guards.`);
      setFoeMitigation(foe, 2, 0.75);
      ctx.log(`${foe.name} Burrow Guards.`);
      return true;
    }
    if (ctx.ready("stone_nerves")) {
      ctx.setCd("stone_nerves", 3);
      ctx.log(`${foe.name} channels Stone Nerves.`);
      ctx.healSelf(0.1);
      ctx.log(`${foe.name} channels Stone Nerves.`);
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.55 * ctx.outMult)), "hits");
    return true;
  },

  stormfang_ravager(foe, st, ctx) {
    const member = ctx.pickTarget("assassin");
    if (ctx.ready("thunder_leap")) {
      ctx.setCd("thunder_leap", 2);
      ctx.applySkill("thunder_leap", {
        member,
        raw: Math.max(1, Math.floor(ctx.atk * 1.25 * ctx.outMult)),
        verb: "Thunder Leaps into"
      });
      return true;
    }
    if (ctx.ready("static_pulse")) {
      ctx.setCd("static_pulse", 3);
      ctx.applySkill("static_pulse", {
        member,
        raw: Math.max(1, Math.floor((foe.int || 20) * 0.4 * ctx.outMult)),
        verb: "releases Static Pulse"
      });
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.75 * ctx.outMult)), "hits");
    return true;
  },

  tidebound_crusher(foe, st, ctx) {
    const member = ctx.pickTarget("highest_damage");
    if (ctx.ready("drown_grip")) {
      ctx.setCd("drown_grip", 3);
      ensureCombatStatus(st);
      st.status.playerStaminaCostUpPct = Math.max(st.status.playerStaminaCostUpPct || 0, 12);
      st.status.playerStaminaCostUpTurns = Math.max(st.status.playerStaminaCostUpTurns || 0, 2);
      ctx.applySkill("drown_grip", {
        member,
        raw: Math.max(1, Math.floor(ctx.atk * 0.55 * ctx.outMult)),
        verb: "Drown Grips",
        pull: true
      });
      return true;
    }
    if (ctx.ready("crushing_wave")) {
      ctx.setCd("crushing_wave", 2);
      ctx.applySkill("crushing_wave", {
        member,
        raw: Math.max(1, Math.floor(ctx.atk * 1.1 * ctx.outMult)),
        verb: "Crushing Wave slams"
      });
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.75 * ctx.outMult)), "hits");
    return true;
  },

  tideharrow(foe, st, ctx) {
    const member = ctx.pickTarget("controller");
    if (ctx.ready("brine_shackles")) {
      ctx.setCd("brine_shackles", 2);
      ensureCombatStatus(st);
      st.status.playerStaminaCostUpPct = Math.max(st.status.playerStaminaCostUpPct || 0, 12);
      st.status.playerStaminaCostUpTurns = Math.max(st.status.playerStaminaCostUpTurns || 0, 2);
      ctx.applySkill("brine_shackles", {
        member,
        raw: Math.max(1, Math.floor(ctx.atk * 0.52 * ctx.outMult)),
        verb: "Brine Shackles"
      });
      return true;
    }
    if (ctx.ready("drown_pulse")) {
      ctx.setCd("drown_pulse", 2);
      ctx.applySkill("drown_pulse", {
        member,
        raw: Math.max(1, Math.floor(ctx.atk * 0.88 * ctx.outMult)),
        verb: "Drown Pulses"
      });
      return true;
    }
    if (ctx.ready("riptide_pull")) {
      ctx.setCd("riptide_pull", 3);
      ctx.applySkill("riptide_pull", {
        member,
        raw: Math.max(1, Math.floor(ctx.atk * 0.58 * ctx.outMult)),
        verb: "Riptide Pulls",
        pull: true
      });
      applyPartyMemberIncomingDamageUp(st, member, 8, 1);
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.55 * ctx.outMult)), "hits");
    return true;
  },

  tidemeld_revenant(foe, st, ctx) {
    const echoes = (st.foes || []).filter((f) => f && f.hp > 0 && f.name === 'Tide Echo' && f.combat && f.combat.summonerUid === foe.uid);
        const activeSummons = echoes.length;
    const member = ctx.pickTarget("bruiser");
    if (activeSummons < 2 && ctx.ready("summon_tide_echo")) {
      ctx.setCd("summon_tide_echo", 4);
      ctx.summonAdjacent("Tide Echo");
      runTideEchoStrikes(st, foe, ctx);
      return true;
    }
    if (ctx.foeHpFrac() < 0.5 && ctx.ready("soul_current")) {
      ctx.setCd("soul_current", 2);
      ctx.applySkill("soul_current", {
        member,
        raw: Math.max(1, Math.floor(ctx.atk * 0.65 * ctx.outMult)),
        verb: "Soul Currents"
      });
      ctx.healSelf(0.15);
      runTideEchoStrikes(st, foe, ctx);
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.55 * ctx.outMult)), "hits");
    return true;
  },

  wavebreaker_idol(foe, st, ctx) {
    const member = ctx.pickTarget("tank");
    if (ctx.ready("stone_guard")) {
      ctx.setCd("stone_guard", 3);
      ctx.log(`${foe.name} raises Stone Guard.`);
      setFoeMitigation(foe, 2, 0.8);
      ctx.log(`${foe.name} raises Stone Guard.`);
      return true;
    }
    if (ctx.ready("sea_ward")) {
      ctx.setCd("sea_ward", 3);
      ctx.log(`${foe.name} casts Sea Ward.`);
      const ally = lowestHpAlly(st, foe.uid);
      if (ally) {
        const amt = Math.max(1, Math.floor(ally.maxHp * 0.15));
        ally.hp = Math.min(ally.maxHp, ally.hp + amt);
        ctx.log(`${foe.name} heals ${ally.name} for ${amt}.`);
      }
      return true;
    }
    if (ctx.ready("wave_slam")) {
      ctx.setCd("wave_slam", 2);
      ctx.applySkill("wave_slam", {
        member,
        raw: Math.max(1, Math.floor(ctx.atk * 0.98 * ctx.outMult)),
        verb: "Wave Slams"
      });
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.58 * ctx.outMult)), "hits");
    return true;
  },

  winter_guardian(foe, st, ctx) {
    const member = ctx.pickTarget("tank");
    if (ctx.foeHpFrac() < 0.65 && ctx.ready("shield_wall")) {
      ctx.setCd("shield_wall", 4);
      ctx.log(`${foe.name} raises Shield Wall.`);
      setFoeMitigation(foe, 2, 0.7);
      ctx.log(`${foe.name} raises Shield Wall.`);
      return true;
    }
    if (ctx.ready("ice_ward")) {
      ctx.setCd("ice_ward", 3);
      ctx.log(`${foe.name} casts Ice Ward.`);
      const ally = lowestHpAlly(st, foe.uid);
      if (ally) { setFoeMitigation(ally, 2, 0.8); ctx.log(`${foe.name} shields ${ally.name}.`); } else ctx.log(`${foe.name} casts Ice Ward.`);
      return true;
    }
    if (ctx.ready("frozen_slam")) {
      ctx.setCd("frozen_slam", 2);
      ctx.applySkill("frozen_slam", {
        member,
        raw: Math.max(1, Math.floor(ctx.atk * 1.05 * ctx.outMult)),
        verb: "Frozen Slams"
      });
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.65 * ctx.outMult)), "hits");
    return true;
  },

  witherling(foe, st, ctx) {
    const member = ctx.pickTarget("mage");
    if (ctx.ready("life_drain")) {
      ctx.setCd("life_drain", 3);
      const hit = Math.max(1, Math.floor((foe.int || 20) * 0.45 * ctx.outMult));
      ctx.hit(member, hit, "Life Drains");
      const healed = Math.max(1, Math.floor(hit * 0.25));
      foe.hp = Math.min(foe.maxHp, foe.hp + healed);
      ctx.log(`${foe.name} recovers ${healed} HP.`);
      return true;
    }
    if (ctx.ready("brittle_breath")) {
      ctx.setCd("brittle_breath", 3);
      ensureCombatStatus(st);
      st.status.playerFragileTurns = Math.max(st.status.playerFragileTurns || 0, 1);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.45 * ctx.outMult));
      for (const m of (st.party || []).filter((x) => x && x.hp > 0)) ctx.hit(m, hit, "Brittle Breath chills");
      return true;
    }
    if (ctx.ready("decay_bite")) {
      ctx.setCd("decay_bite", 2);
      const hit = Math.max(1, Math.floor(ctx.atk * 0.62 * ctx.outMult));
      ctx.hit(member, hit, "Decay Bites");
      applyPlayerPoison(st, Math.max(1, Math.floor(hit * 0.08)), 2);
      return true;
    }
    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * 0.5 * ctx.outMult)), "hits");
    return true;
  }
};
