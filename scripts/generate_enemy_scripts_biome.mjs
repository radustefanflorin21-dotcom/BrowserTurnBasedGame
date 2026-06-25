/**
 * Generates server/combat/enemy_scripts_biome.js from curated specs (parity with game.js).
 * Run: node scripts/generate_enemy_scripts_biome.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

/** @type {Record<string, { rule?: string, basic?: number, init?: string, steps: object[] }>} */
const SPECS = {
  abyssal_tempest_caller: {
    rule: "controller",
    basic: 0.55,
    steps: [
      { key: "tempest_bind", cd: 2, mult: 0.7, verb: "casts Tempest Bind at", accuracy: 15 },
      { key: "static_barrier", cd: 3, evadeAllies: 0.12, log: "raises a Static Barrier" },
      { key: "storm_collapse", cd: 4, mult: 0.65, verb: "collapses the storm on", aoe: true, stamina: 15 }
    ]
  },
  ash_horror: {
    rule: "mage",
    basic: 0.5,
    steps: [
      { key: "smother", cd: 2, mult: 0.5, verb: "Suffocates" },
      { key: "decay_aura", cd: 3, log: "spreads Decay Aura", incomingUp: 8 },
      { key: "ash_touch", cd: 1, mult: 0.5, verb: "Ash Touches", burn: 10 }
    ]
  },
  ash_lizard: {
    rule: "bruiser",
    basic: 0.48,
    steps: [
      { key: "heat_skin", cd: 3, mitigate: 0.75, hpBelow: 0.7, log: "uses Heat Skin" },
      { key: "scorch_trail", cd: 3, mult: 0.65, verb: "Scorch Trails", aoe: true, partyMin: 2 },
      { key: "ember_bite", cd: 1, mult: 0.52, verb: "Ember Bites", burn: 10 }
    ]
  },
  ash_skulker: {
    rule: "assassin",
    basic: 0.52,
    steps: [
      { key: "fade", cd: 3, evade: 0.4, log: "Fades" },
      { key: "ash_mark", cd: 3, mult: 0.45, verb: "Ash Marks", incomingUp: 10 },
      { key: "backstab", cd: 2, mult: 0.98, verb: "Backstabs" }
    ]
  },
  barkhide_spriggan: {
    rule: "controller",
    basic: 0.5,
    steps: [
      { key: "nature_guard", cd: 3, healAlly: 0.2, hpBelow: 0.6, log: "Nature Guards" },
      { key: "barkskin", cd: 3, allyMitigate: 0.75, log: "casts Barkskin" },
      { key: "root_bind_sg", cd: 2, mult: 0.58, verb: "Root Binds", stamina: 12 }
    ]
  },
  brinegullet_spitter: {
    rule: "mage",
    basic: 0.58,
    steps: [
      { key: "corrosive_pool", cd: 3, mult: 0.55, verb: "Corrosive Pools", aoe: true, incomingUp: 8 },
      { key: "acid_spit", cd: 2, mult: 0.62, verb: "spits acid at", bleed: 12 }
    ]
  },
  cinder_husk: {
    rule: "tank",
    basic: 0.62,
    steps: [
      { key: "dead_flesh", cd: 3, mitigate: 0.7, hpBelow: 0.55, log: "hardens Dead Flesh" },
      { key: "grave_fortitude", cd: 3, healSelf: 0.12, log: "channels Grave Fortitude" }
    ]
  },
  cinder_stalker: {
    rule: "assassin",
    basic: 0.55,
    steps: [
      { key: "smoke_veil", cd: 3, evade: 0.42, hpBelow: 0.55, log: "uses Smoke Veil" },
      { key: "blazing_pounce", cd: 2, mult: 0.95, verb: "Blazing Pounces", tactical: true },
      { key: "cinder_claw", cd: 2, mult: 0.68, verb: "Cinder Claws", burn: 10 }
    ]
  },
  cliff_lurker: {
    rule: "assassin",
    basic: 0.55,
    steps: [
      { key: "rock_skip", cd: 3, evade: 0.38, log: "uses Rock Skip" },
      { key: "ambush_drop", cd: 2, mult: 0.98, verb: "Ambush Drops on", tactical: true, playerHpBelow: 0.5 },
      { key: "grip_strike", cd: 2, mult: 0.72, verb: "Grip Strikes", stamina: 10 }
    ]
  },
  coastal_horror: {
    rule: "highest_damage",
    basic: 0.6,
    steps: [
      { key: "abyss_grip", cd: 3, debuffAll: 12, log: "uses Abyss Grip" },
      { key: "terror_pulse", cd: 4, extendDebuffs: true, log: "extends your debuffs" }
    ]
  },
  desert_thornback_crawler: {
    rule: "tank",
    basic: 0.92,
    steps: [
      { key: "dry_carapace", cd: 3, mitigate: 0.8, hpBelow: 0.6, log: "raises Dry Carapace" },
      { key: "spiked_shell", cd: 3, reflect: 0.1, log: "raises Spiked Shell" },
      { key: "defensive_taunt", cd: 4, log: "Defensive Taunts", taunt: true },
      { key: "impale", cd: 2, mult: 1.05, verb: "Impales" }
    ]
  },
  driftling: {
    rule: "bruiser",
    basic: 0.55,
    steps: [
      { key: "tidal_mend", cd: 3, healAlly: 0.2, allyHpBelow: 0.45, log: "casts Tidal Mend" },
      { key: "mist_veil", cd: 3, evadeAllies: 0.1, alliesMin: 2, log: "casts Mist Veil" }
    ]
  },
  dune_devourer: {
    rule: "bruiser",
    basic: 0.65,
    steps: [
      { key: "sand_devour", cd: 3, mult: 0.88, verb: "Sand Devours", healSelfPct: 0.2, hpBelow: 0.5, tactical: true },
      { key: "grinding_maw", cd: 2, mult: 0.72, verb: "Grinding Maws", fragile: true, tactical: true },
      { key: "burrow_ambush", cd: 3, mult: 1.05, verb: "Burrow Ambushes", tactical: true },
      { key: "sand_devour", cd: 3, mult: 0.88, verb: "Sand Devours", healSelfPct: 0.2, tactical: true }
    ]
  },
  dust_carver: {
    rule: "assassin",
    basic: 0.82,
    steps: [
      { key: "drystep", cd: 3, evade: 0.35, log: "uses Drystep" },
      { key: "blind_dust", cd: 3, blindAll: 45, log: "throws Blind Dust" },
      { key: "sand_slash", cd: 2, mult: 0.85, verb: "Sand Slashes" }
    ]
  },
  ember_scuttler: {
    rule: "controller",
    basic: 0.45,
    steps: [
      { key: "fire_web", cd: 2, mult: 0.45, verb: "Fire Webs", stamina: 10 },
      { key: "ignite", cd: 2, mult: 0.5, verb: "Ignites", burn: 11 },
      { key: "scuttle_burst", cd: 2, mult: 0.32, verb: "Scuttle Bursts", hits: 2 }
    ]
  },
  faded_war_wraith: {
    rule: "weakest",
    basic: 0.58,
    steps: [
      { key: "call_fallen", cd: 4, summon: "Fallen Echo", foesMax: 8 },
      { key: "soul_chill", cd: 3, mult: 0.4, verb: "Soul Chills", tactical: true, intMult: 0.45 },
      { key: "haunt", cd: 2, mult: 0.55, verb: "Haunts", tactical: true, intMult: 0.5 }
    ]
  },
  frost_skitter: {
    rule: "controller",
    basic: 0.45,
    steps: [
      { key: "crystal_nerves", cd: 3, evade: 0.15, log: "sharpens Crystal Nerves" },
      { key: "absolute_zero", cd: 4, mult: 0.55, verb: "Absolute Zero chills", aoe: true },
      { key: "ice_web", cd: 2, mult: 0.48, verb: "Ice Webs", cripple: 45 }
    ]
  },
  frozen_pinecone: {
    rule: "controller",
    basic: 0.35,
    steps: [
      { key: "needle_scatter", cd: 2, mult: 0.42, verb: "Needle Scatters", tactical: true },
      { key: "freeze_burst", cd: 3, mult: 0.5, verb: "Freeze Burst hits", tactical: true },
      { key: "drop_strike", cd: 2, mult: 0.75, verb: "Drop Strikes", tactical: true }
    ]
  },
  frozen_stalker: {
    rule: "assassin",
    basic: 0.58,
    steps: [
      { key: "whiteout_veil", cd: 3, evade: 0.4, log: "uses Whiteout Veil" },
      { key: "chill_mark", cd: 2, mult: 0.55, verb: "Chill Marks", tactical: true },
      { key: "frozen_ambush", cd: 2, mult: 0.95, verb: "Frozen Ambushes", tactical: true }
    ]
  },
  glacier_turtoise: {
    rule: "tank",
    basic: 0.55,
    steps: [
      { key: "ice_shell", cd: 3, mitigate: 0.78, log: "raises Ice Shell" },
      { key: "glacier_hard_shell", cd: 4, mitigate: 0.65, reflect: 0.08, hpBelow: 0.5, log: "uses Glacier Hard Shell" },
      { key: "slow_crush", cd: 2, mult: 0.85, verb: "Slow Crushes" }
    ]
  },
  greenleaf_fox: {
    rule: "assassin",
    basic: 0.52,
    steps: [
      { key: "fade_step", cd: 3, evade: 0.38, log: "uses Fade Step" },
      { key: "rending_snap", cd: 2, mult: 0.82, verb: "Rending Snaps", bleed: 12 },
      { key: "ambush_bite", cd: 2, mult: 0.92, verb: "Ambush Bites", tactical: true }
    ]
  },
  greenleaf_parrot: {
    rule: "controller",
    basic: 0.5,
    steps: [
      { key: "echo_cry", cd: 4, buffAllies: true, log: "uses Echo Cry" },
      { key: "distracting_screech", cd: 3, mult: 0.55, verb: "Distracting Screeches", accuracy: 12 }
    ]
  },
  greenleaf_stag: {
    rule: "support",
    basic: 0.55,
    steps: [
      { key: "natures_blessing", cd: 3, healAlly: 0.18, log: "casts Nature's Blessing" },
      { key: "verdant_ward", cd: 3, allyAbsorb: 0.15, log: "casts Verdant Ward" },
      { key: "root_bind", cd: 2, mult: 0.62, verb: "Root Binds", stamina: 10 }
    ]
  },
  ice_tusked_boar: {
    rule: "bruiser",
    basic: 0.62,
    steps: [
      { key: "ice_armor", cd: 3, mitigate: 0.55, hpBelow: 0.6, log: "uses Ice Armor" },
      { key: "cold_rage", cd: 3, ramp: true, log: "enters Cold Rage" },
      { key: "frost_charge", cd: 2, mult: 1, verb: "Frost Charges", tactical: true }
    ]
  },
  icy_mink: {
    rule: "assassin",
    basic: 0.55,
    steps: [
      { key: "slipstep", cd: 3, evade: 0.42, hpBelow: 0.5, log: "uses Slipstep" },
      { key: "shiver_cut", cd: 2, mult: 0.9, verb: "Shiver Cuts", weakTarget: true },
      { key: "frost_bite", cd: 1, mult: 0.72, verb: "Frost Bites", cripple: 40 }
    ]
  },
  icy_serpent: {
    rule: "mage",
    basic: 0.55,
    steps: [
      { key: "freeze_skin", cd: 3, mitigate: 0.8, hpBelow: 0.55, log: "raises Freeze Skin" },
      { key: "constriction_chill", cd: 3, mult: 0.65, verb: "Constriction Chills", stamina: 12 },
      { key: "cold_venom", cd: 2, mult: 0.58, verb: "Cold Venom strikes", poison: 8 }
    ]
  },
  lava_basilisk: {
    rule: "controller",
    basic: 0.52,
    steps: [
      { key: "molten_sheen", cd: 3, mitigate: 0.72, hpBelow: 0.6, log: "uses Molten Sheen" },
      { key: "petrifying_heat", cd: 3, mult: 0.85, verb: "Petrifying Heats", stun: 0.2 },
      { key: "inferno_gaze", cd: 2, mult: 0.9, verb: "Inferno Gaze brands", burn: 12 }
    ]
  },
  magma_boar: {
    rule: "bruiser",
    basic: 0.65,
    init: "foe.combat.magmaRot = (foe.combat.magmaRot || 0) + 1;\n    const tank = foe.combat.magmaRot % 2 === 1;",
    steps: [
      { key: "lava_armor", cd: 4, mitigate: 0.55, reflect: 0.12, ifTankOrHurt: true, log: "uses Lava Armor" },
      { key: "boiling_rage", cd: 3, ramp: true, log: "enters Boiling Rage" },
      { key: "molten_charge", cd: 2, mult: 1.08, verb: "Molten Charges", tactical: true, notTank: true }
    ]
  },
  mirage_lurker: {
    rule: "controller",
    basic: 0.52,
    steps: [
      { key: "mirage_shift", cd: 3, evade: 0.35, log: "Mirage Shifts" },
      { key: "heat_haze", cd: 3, blindAll: 40, log: "spreads Heat Haze" },
      { key: "illusion_strike", cd: 2, mult: 0.78, verb: "Illusion Strikes", debuffAll: 10 }
    ]
  },
  pinebound_fawn: {
    rule: "support",
    basic: 0.45,
    steps: [
      { key: "gentle_heal", cd: 3, healAlly: 0.22, log: "casts Gentle Heal" },
      { key: "winter_grace", cd: 4, allyMitigate: 0.85, log: "casts Winter Grace" }
    ]
  },
  remnant_of_rust: {
    rule: "controller",
    basic: 0.5,
    steps: [
      { key: "corrode_armor", cd: 3, incomingUp: 10, log: "Corrodes armor" },
      { key: "rust_strike", cd: 2, mult: 0.72, verb: "Rust Strikes" },
      { key: "grinding_lock", cd: 2, mult: 0.65, verb: "Grinding Locks", cripple: 45 }
    ]
  },
  rock_ibex: {
    rule: "bruiser",
    basic: 0.58,
    steps: [
      { key: "stone_skin", cd: 3, mitigate: 0.82, log: "uses Stone Skin" },
      { key: "headbutt", cd: 2, mult: 0.95, verb: "Headbutts" }
    ]
  },
  rock_lizard: {
    rule: "tank",
    basic: 0.65,
    steps: [
      { key: "bask_in_dust", cd: 3, healSelf: 0.1, log: "Basks in Dust" },
      { key: "harden", cd: 4, mitigate: 0.7, log: "Hardens" },
      { key: "stone_challenge", cd: 4, taunt: true, log: "Stone Challenges" },
      { key: "tail_slam", cd: 2, mult: 1.02, verb: "Tail Slams" }
    ]
  },
  rock_lynx: {
    rule: "assassin",
    basic: 0.55,
    steps: [
      { key: "agile_reflex", cd: 3, evade: 0.3, log: "uses Agile Reflex" },
      { key: "cliff_strike", cd: 2, mult: 0.88, verb: "Cliff Strikes", tactical: true }
    ]
  },
  rock_serpent: {
    rule: "controller",
    basic: 0.6,
    steps: [
      { key: "stone_slither", cd: 3, evade: 0.2, log: "Stone Slithers" },
      { key: "petrify_gaze", cd: 4, mult: 0.55, verb: "Petrify Gaze locks onto", blind: 45 },
      { key: "debilitating_venom", cd: 2, mult: 0.62, verb: "Debilitating Venom bites", poison: 8 },
      { key: "crush_coil", cd: 3, mult: 0.78, verb: "Crushing Coil constricts", cripple: 40 }
    ]
  },
  saltwind_skimmer: {
    rule: "assassin",
    basic: 0.52,
    steps: [
      { key: "glide", cd: 3, evade: 0.35, log: "Glides away" },
      { key: "salt_peck", cd: 2, mult: 0.58, verb: "Salt Pecks" },
      { key: "wind_slice", cd: 2, mult: 0.72, verb: "Wind Slices", tactical: true }
    ]
  },
  stone_marmot: {
    rule: "tank",
    basic: 0.55,
    steps: [
      { key: "burrow_guard", cd: 3, mitigate: 0.75, hpBelow: 0.5, log: "Burrow Guards" },
      { key: "stone_nerves", cd: 3, healSelf: 0.1, log: "channels Stone Nerves" }
    ]
  },
  stormfang_ravager: {
    rule: "assassin",
    basic: 0.75,
    steps: [
      { key: "thunder_leap", cd: 2, mult: 1.25, verb: "Thunder Leaps into", tactical: true },
      { key: "static_pulse", cd: 3, mult: 0.65, verb: "releases Static Pulse", aoe: true, tactical: true, intMult: 0.4 }
    ]
  },
  tidebound_crusher: {
    rule: "highest_damage",
    basic: 0.75,
    steps: [
      { key: "drown_grip", cd: 3, stamina: 12, pull: true, tactical: true, mult: 0.55, verb: "Drown Grips" },
      { key: "crushing_wave", cd: 2, mult: 1.1, verb: "Crushing Wave slams", tactical: true, stun: 0.18 }
    ]
  },
  tideharrow: {
    rule: "controller",
    basic: 0.55,
    steps: [
      { key: "brine_shackles", cd: 2, mult: 0.52, verb: "Brine Shackles", stamina: 12, tactical: true },
      { key: "drown_pulse", cd: 2, mult: 0.88, verb: "Drown Pulses", aoe: true, tactical: true },
      { key: "riptide_pull", cd: 3, mult: 0.58, verb: "Riptide Pulls", pull: true, tactical: true, incomingUp: 8 }
    ]
  },
  tidemeld_revenant: {
    rule: "bruiser",
    basic: 0.55,
    init: "const echoes = (st.foes || []).filter((f) => f && f.hp > 0 && f.name === 'Tide Echo' && f.combat && f.combat.summonerUid === foe.uid);\n    const activeSummons = echoes.length;",
    steps: [
      { key: "summon_tide_echo", cd: 4, summon: "Tide Echo", if: "activeSummons < 2", after: "runTideEchoStrikes(st, foe, ctx);" },
      { key: "soul_current", cd: 2, mult: 0.65, verb: "Soul Currents", healSelfPct: 0.15, hpBelow: 0.5, tactical: true, after: "runTideEchoStrikes(st, foe, ctx);" }
    ]
  },
  wavebreaker_idol: {
    rule: "tank",
    basic: 0.58,
    steps: [
      { key: "stone_guard", cd: 3, mitigate: 0.8, log: "raises Stone Guard" },
      { key: "sea_ward", cd: 3, healAlly: 0.15, log: "casts Sea Ward" },
      { key: "wave_slam", cd: 2, mult: 0.98, verb: "Wave Slams", tactical: true }
    ]
  },
  winter_guardian: {
    rule: "tank",
    basic: 0.65,
    steps: [
      { key: "shield_wall", cd: 4, mitigate: 0.7, hpBelow: 0.65, log: "raises Shield Wall" },
      { key: "ice_ward", cd: 3, allyMitigate: 0.8, log: "casts Ice Ward" },
      { key: "frozen_slam", cd: 2, mult: 1.05, verb: "Frozen Slams", tactical: true }
    ]
  },
  witherling: {
    rule: "mage",
    basic: 0.5,
    steps: [
      { key: "life_drain", cd: 3, mult: 0.55, verb: "Life Drains", healSelfPct: 0.25, intMult: 0.45 },
      { key: "brittle_breath", cd: 3, mult: 0.45, verb: "Brittle Breath chills", fragile: true, aoe: true },
      { key: "decay_bite", cd: 2, mult: 0.62, verb: "Decay Bites", poison: 8 }
    ]
  }
};

function condLines(step) {
  const parts = [];
  if (step.hpBelow != null) parts.push(`ctx.foeHpFrac() < ${step.hpBelow}`);
  if (step.playerHpBelow != null) parts.push(`(st.playerMax > 0 ? st.playerHp / st.playerMax : 1) < ${step.playerHpBelow}`);
  if (step.alliesMin != null) parts.push(`(st.foes || []).filter((f) => f && f.hp > 0).length >= ${step.alliesMin}`);
  if (step.partyMin != null) parts.push(`livingPartyCount(st) >= ${step.partyMin}`);
  if (step.foesMax != null) parts.push(`(st.foes || []).filter((f) => f && f.hp > 0).length < ${step.foesMax}`);
  if (step.weakTarget) parts.push(`(st.party || []).some((m) => m && m.hp > 0 && m.maxHp > 0 && m.hp / m.maxHp < 0.45)`);
  if (step.allyHpBelow != null)
    parts.push(`(() => { const a = lowestHpAlly(st, foe.uid); return a && a.maxHp > 0 && a.hp / a.maxHp < ${step.allyHpBelow}; })()`);
  if (step.ifTankOrHurt) parts.push(`(typeof tank !== "undefined" && tank) || ctx.foeHpFrac() < 0.6`);
  if (step.notTank) parts.push(`typeof tank === "undefined" || !tank`);
  if (step.if) parts.push(step.if);
  if (!parts.length) return `if (ctx.ready("${step.key}"))`;
  return `if (${parts.join(" && ")} && ctx.ready("${step.key}"))`;
}

function dmgExpr(step) {
  if (step.intMult != null) {
    return `Math.max(1, Math.floor((foe.int || 20) * ${step.intMult} * ctx.outMult))`;
  }
  const m = step.mult != null ? step.mult : 0.65;
  return `Math.max(1, Math.floor(ctx.atk * ${m} * ctx.outMult))`;
}

function emitStep(step) {
  const lines = [];
  lines.push(`    ${condLines(step)} {`);
  lines.push(`      ctx.setCd("${step.key}", ${step.cd || 2});`);

  if (step.summon) {
    lines.push(`      ctx.summonAdjacent("${step.summon}");`);
  } else if (step.log && !step.mult && !step.tactical) {
    lines.push(`      ctx.log(\`\${foe.name} ${step.log}.\`);`);
  }

  if (step.evade != null) {
    lines.push(`      foe.combat.evadeNextChance = Math.max(foe.combat.evadeNextChance || 0, ${step.evade});`);
    if (step.log) lines.push(`      ctx.log(\`\${foe.name} ${step.log}.\`);`);
  }
  if (step.evadeAllies != null) {
    lines.push(`      for (const f of (st.foes || []).filter((x) => x && x.hp > 0)) {`);
    lines.push(`        if (!f.combat) f.combat = { skillCd: {} };`);
    lines.push(`        f.combat.evadeNextChance = Math.max(f.combat.evadeNextChance || 0, ${step.evadeAllies});`);
    lines.push(`      }`);
    if (step.log) lines.push(`      ctx.log(\`\${foe.name} ${step.log}.\`);`);
  }
  if (step.mitigate != null) {
    lines.push(`      setFoeMitigation(foe, 2, ${step.mitigate});`);
    if (step.reflect != null) lines.push(`      setFoeReflect(foe, 1, ${step.reflect});`);
    if (step.log) lines.push(`      ctx.log(\`\${foe.name} ${step.log}.\`);`);
  }
  if (step.allyMitigate != null) {
    lines.push(`      const ally = lowestHpAlly(st, foe.uid);`);
    lines.push(
      `      if (ally) { setFoeMitigation(ally, 2, ${step.allyMitigate}); ctx.log(\`\${foe.name} shields \${ally.name}.\`); }` +
        (step.log ? ` else ctx.log(\`\${foe.name} ${step.log}.\`);` : "")
    );
  }
  if (step.healAlly != null) {
    lines.push(`      const ally = lowestHpAlly(st, foe.uid);`);
    lines.push(`      if (ally) {`);
    lines.push(`        const amt = Math.max(1, Math.floor(ally.maxHp * ${step.healAlly}));`);
    lines.push(`        ally.hp = Math.min(ally.maxHp, ally.hp + amt);`);
    lines.push(`        ctx.log(\`\${foe.name} heals \${ally.name} for \${amt}.\`);`);
    lines.push(`      }`);
  }
  if (step.healSelf != null) {
    lines.push(`      ctx.healSelf(${step.healSelf});`);
    if (step.log) lines.push(`      ctx.log(\`\${foe.name} ${step.log}.\`);`);
  }
  if (step.ramp) {
    lines.push(`      foe.combat.outgoingDamageBonusPct = Math.max(foe.combat.outgoingDamageBonusPct || 0, 8);`);
    lines.push(`      foe.combat.outgoingDamageBonusTurns = Math.max(foe.combat.outgoingDamageBonusTurns || 0, 2);`);
    if (step.log) lines.push(`      ctx.log(\`\${foe.name} ${step.log}.\`);`);
  }
  if (step.taunt) {
    lines.push(`      foe.combat.tauntPlayerTurns = Math.max(foe.combat.tauntPlayerTurns || 0, 1);`);
    if (step.log) lines.push(`      ctx.log(\`\${foe.name} ${step.log}.\`);`);
  }
  if (step.debuffAll != null) {
    lines.push(`      for (const m of (st.party || []).filter((x) => x && x.hp > 0)) applyPartyMemberSuppressedDamageDownBoth(st, m, ${step.debuffAll}, 2);`);
    if (step.log) lines.push(`      ctx.log(\`\${foe.name} ${step.log}.\`);`);
  }
  if (step.extendDebuffs) {
    lines.push(`      extendPlayerDebuffDurations(st, 1);`);
    if (step.log) lines.push(`      ctx.log(\`\${foe.name} ${step.log}.\`);`);
  }
  if (step.blindAll != null) {
    lines.push(`      rollBlindAll(st, ctx, ${step.blindAll}, 8, 2);`);
    if (step.log) lines.push(`      ctx.log(\`\${foe.name} ${step.log}.\`);`);
  }
  if (step.accuracy != null) {
    lines.push(`      applyPlayerAccuracyDown(st, ${step.accuracy}, 2);`);
  }
  if (step.stamina != null) {
    lines.push(`      ensureCombatStatus(st);`);
    lines.push(`      st.status.playerStaminaCostUpPct = Math.max(st.status.playerStaminaCostUpPct || 0, ${step.stamina});`);
    lines.push(`      st.status.playerStaminaCostUpTurns = Math.max(st.status.playerStaminaCostUpTurns || 0, 2);`);
  }
  if (step.incomingUp != null && step.mult != null && !step.tactical) {
    lines.push(`      applyPartyMemberIncomingDamageUp(st, member, ${step.incomingUp}, 2);`);
  }
  if (step.fragile) {
    lines.push(`      ensureCombatStatus(st);`);
    lines.push(`      st.status.playerFragileTurns = Math.max(st.status.playerFragileTurns || 0, 1);`);
  }

  const verb = step.verb || "strikes";
  if (step.tactical && (step.mult != null || step.pull)) {
    const pull = step.pull ? ",\n        pull: true" : "";
    lines.push(`      ctx.applySkill("${step.key}", {`);
    lines.push(`        member,`);
    lines.push(`        raw: ${dmgExpr(step)},`);
    lines.push(`        verb: "${verb}"${pull}`);
    lines.push(`      });`);
    if (step.healSelfPct != null) {
      lines.push(`      ctx.healSelf(${step.healSelfPct});`);
    }
    if (step.incomingUp != null) {
      lines.push(`      applyPartyMemberIncomingDamageUp(st, member, ${step.incomingUp}, 1);`);
    }
  } else if (step.aoe) {
    lines.push(`      const hit = ${dmgExpr(step)};`);
    lines.push(`      for (const m of (st.party || []).filter((x) => x && x.hp > 0)) ctx.hit(m, hit, "${verb}");`);
    if (step.stamina) {
      /* already applied */
    }
  } else if (step.hits === 2) {
    lines.push(`      const hit = ${dmgExpr(step)};`);
    lines.push(`      ctx.hit(member, hit, "${verb}");`);
    lines.push(`      ctx.hit(member, hit, "${verb}");`);
  } else if (step.mult != null) {
    lines.push(`      const hit = ${dmgExpr(step)};`);
    lines.push(`      ctx.hit(member, hit, "${verb}");`);
    if (step.burn != null) lines.push(`      applyBurnFromHit(st, member, hit, ${step.burn}, 2, ctx.rng);`);
    if (step.bleed != null) lines.push(`      applyPlayerBleed(st, Math.max(1, Math.floor(hit * 0.${step.bleed})), 2);`);
    if (step.poison != null) lines.push(`      applyPlayerPoison(st, Math.max(1, Math.floor(hit * 0.08)), 2);`);
    if (step.cripple != null) lines.push(`      if (ctx.rng.chance(${step.cripple})) applyPartyMemberCripple(st, member, 2);`);
    if (step.blind != null) lines.push(`      if (ctx.rng.chance(${step.blind})) applyPartyMemberBlind(st, member, 8, 2);`);
    if (step.stun != null) lines.push(`      tryPartyMemberStun(st, member, ctx.rng, ${step.stun}, ctx.player, ctx.log);`);
    if (step.healSelfPct != null) {
      lines.push(`      const healed = Math.max(1, Math.floor(hit * ${step.healSelfPct}));`);
      lines.push(`      foe.hp = Math.min(foe.maxHp, foe.hp + healed);`);
      lines.push(`      ctx.log(\`\${foe.name} recovers \${healed} HP.\`);`);
    }
  }

  if (step.after) lines.push(`      ${step.after}`);
  lines.push(`      return true;`);
  lines.push(`    }`);
  return lines.join("\n");
}

function emitHandler(id, spec) {
  const rule = spec.rule || "bruiser";
  const basic = spec.basic != null ? spec.basic : 0.6;
  const lines = [`  ${id}(foe, st, ctx) {`];
  if (spec.init) lines.push(`    ${spec.init.replace(/\n/g, "\n    ")}`);
  lines.push(`    const member = ctx.pickTarget("${rule}");`);
  for (const step of spec.steps) lines.push(emitStep(step));
  lines.push(`    ctx.hit(member, Math.max(1, Math.floor(ctx.atk * ${basic} * ctx.outMult)), "hits");`);
  lines.push(`    return true;`);
  lines.push(`  }`);
  return lines.join("\n");
}

const handlers = Object.keys(SPECS)
  .sort()
  .map((id) => emitHandler(id, SPECS[id]))
  .join(",\n\n");

const out = `/**
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
${handlers}
};
`;

fs.writeFileSync(path.join(ROOT, "server/combat/enemy_scripts_biome.js"), out);
console.log("Wrote", Object.keys(SPECS).length, "biome handlers");
