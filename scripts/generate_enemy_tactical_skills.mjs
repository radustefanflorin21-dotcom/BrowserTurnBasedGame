/**
 * Generates shared/enemy_tactical_skills_data.js from the locked enemy targeting table.
 * Run: node scripts/generate_enemy_tactical_skills.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outPath = path.join(root, "shared", "enemy_tactical_skills_data.js");

/** @typedef {[string, string, number, string, string, object?]} Row */

const SELF = [0, "none", "self"];
const MELEE = [1, "single", "player"];
const GLOBAL_P = [0, "global_players", "global_players"];
const GLOBAL_F = [0, "global_foes", "global_foes"];

function R(script, key, range, aoe, target, extra) {
  return [script, key, range, aoe, target, extra || null];
}

/** Compact rows: [scriptId, skillKey, rangeMax, aoe, target, extras?] */
/** @type {Row[]} */
const ROWS = [
  // --- Tank ---
  R("cinder_husk", "dead_flesh", ...SELF),
  R("cinder_husk", "grave_fortitude", ...SELF),
  R("desert_thornback_crawler", "dry_carapace", ...SELF),
  R("desert_thornback_crawler", "spiked_shell", ...SELF, { reflect: true }),
  R("desert_thornback_crawler", "defensive_taunt", 4, "single", "players_in_range"),
  R("desert_thornback_crawler", "impale", ...MELEE),
  R("frosthorn_bulwark", "icehorn_challenge", 4, "single", "players_in_range"),
  R("frosthorn_bulwark", "frozen_guard", ...SELF),
  R("frosthorn_bulwark", "tuskbreaker_slam", ...MELEE),
  R("frosthorn_bulwark", "frost_stagger", ...MELEE),
  R("glacier_turtoise", "ice_shell", ...SELF),
  R("glacier_turtoise", "glacier_hard_shell", ...SELF),
  R("glacier_turtoise", "slow_crush", ...MELEE),
  R("hermit_crab", "anchoring_taunt", 4, "single", "players_in_range"),
  R("hermit_crab", "shell_guard", ...SELF),
  R("hermit_crab", "crushing_clamp", ...MELEE),
  R("hermit_crab", "shell_up", ...SELF),
  R("hermit_crab", "pinch", ...MELEE),
  R("ice_tusked_boar", "ice_armor", ...SELF),
  R("ice_tusked_boar", "cold_rage", ...SELF),
  R("ice_tusked_boar", "frost_charge", 3, "single", "player", { charge: true, straightLine: true }),
  R("rock_lizard", "bask_in_dust", 3, "single", "foe_ally", { targetSelfOrAlly: true }),
  R("rock_lizard", "harden", ...SELF),
  R("rock_lizard", "stone_challenge", 4, "single", "players_in_range"),
  R("rock_lizard", "tail_slam", ...MELEE),
  R("stone_marmot", "burrow_guard", ...SELF),
  R("stone_marmot", "stone_nerves", ...SELF),
  R("rock_marmot", "burrow", ...SELF),
  R("rock_marmot", "stone_hurl", 4, "single", "player"),
  R("thornback_graveguard", "grave_shell", ...SELF, { reflect: true }),
  R("thornback_graveguard", "thorn_challenge", ...GLOBAL_P),
  R("thornback_graveguard", "splinter_guard", 4, "single", "foe_ally"),
  R("thornback_graveguard", "bone_impale", ...MELEE),
  R("tusk_boar", "thick_hide", ...SELF),
  R("tusk_boar", "war_boar_taunt", 4, "single", "players_in_range"),
  R("tusk_boar", "gore_charge", 3, "single", "player", { charge: true, straightLine: true }),
  R("wavebreaker_idol", "stone_guard", ...SELF),
  R("wavebreaker_idol", "sea_ward", 3, "single", "foe_ally", { targetSelfOrAlly: true }),
  R("wavebreaker_idol", "wave_slam", ...MELEE),
  R("winter_guardian", "shield_wall", ...SELF),
  R("winter_guardian", "ice_ward", 4, "single", "foe_ally", { targetSelfOrAlly: true }),
  R("winter_guardian", "frozen_slam", ...MELEE),

  // --- Bruiser ---
  R("ash_lizard", "heat_skin", ...SELF, { reflect: true }),
  R("ash_lizard", "scorch_trail", 0, "cross1", "player", { anchorSelf: true }),
  R("ash_lizard", "ember_bite", ...MELEE),
  R("ashmaw_titan", "obsidian_hide", ...SELF),
  R("ashmaw_titan", "burning_rampage", ...SELF),
  R("ashmaw_titan", "ashmaw_crush", ...MELEE),
  R("ashmaw_titan", "slagquake_slam", 1, "cross1", "player"),
  R("ashmaw_titan", "jawbreaker_impact", ...MELEE),
  R("dune_devourer", "sand_devour", ...MELEE, { selfHealAfter: true }),
  R("dune_devourer", "grinding_maw", ...MELEE),
  R("dune_devourer", "burrow_ambush", 3, "single", "player", { leap: true, ignorePathBlock: true }),
  R("fallen_echo", "echo_strike", ...MELEE),
  R("fallen_echo", "broken_march", 2, "line", "player", { lineMax: 2 }),
  R("gaiahide_behemoth", "gaiahide_slams", ...MELEE),
  R("gaiahide_behemoth", "rootquake", 3, "cross1", "player"),
  R("gorilla", "ground_rupture", 3, "line", "player", { lineMax: 3, stopAtOccupied: true }),
  R("gorilla", "rage_roar", ...SELF),
  R("gorilla", "crushing_slam", ...MELEE),
  R("granitehorn_breaker", "hornbreaker_charge", 4, "single", "player", { charge: true, straightLine: true }),
  R("granitehorn_breaker", "staggering_headbutt", ...MELEE),
  R("granitehorn_breaker", "stonehide_rage", ...SELF),
  R("granitehorn_breaker", "faultline_kick", 1, "cross1", "player"),
  R("magma_boar", "lava_armor", ...SELF),
  R("magma_boar", "boiling_rage", ...SELF),
  R("magma_boar", "molten_charge", 4, "single", "player", { charge: true, straightLine: true }),
  R("plains_raptor", "pounce", 3, "single", "player", { leap: true }),
  R("plains_raptor", "claw_rend", ...MELEE),
  R("plains_raptor", "predator_focus", ...SELF),
  R("primordial_silverback", "canopy_breaker", ...MELEE),
  R("primordial_silverback", "ground_roar", 0, "self_radius", "player", { selfRadius: 2 }),
  R("primordial_silverback", "primal_guard", ...SELF),
  R("primordial_silverback", "rootknuckle_slam", ...MELEE),
  R("rimebound_undertaker", "rimehide_burden", ...SELF),
  R("rimebound_undertaker", "funeral_weight", 3, "cross1", "player"),
  R("rimebound_undertaker", "coffin_breaker", ...MELEE),
  R("rimebound_undertaker", "gravehook_drag", 3, "single", "player", { pull: true }),
  R("rimebound_undertaker", "last_procession", 4, "line", "player", { lineMax: 4 }),
  R("rock_ibex", "stone_skin", ...SELF),
  R("rock_ibex", "headbutt", ...MELEE),
  R("stormfang_ravager", "thunder_leap", 4, "single", "player", { leap: true }),
  R("stormfang_ravager", "static_pulse", 0, "self_radius", "player", { selfRadius: 2 }),
  R("held_colossus", "colossus_slam", ...MELEE),
  R("held_colossus", "faultquake", 3, "cross1", "player"),
  R("held_colossus", "stone_breath", 4, "line", "player", { lineMax: 4 }),
  R("held_colossus", "mountainhide", ...SELF),
  R("held_colossus", "stillness_crush", ...MELEE),
  R("the_last_warmaster", "raise_the_fallen", ...SELF, { summonAdjacent: true }),
  R("the_last_warmaster", "commanding_ruin", ...GLOBAL_P),
  R("the_last_warmaster", "warmasters_execution", ...MELEE),
  R("the_last_warmaster", "ruststorm_slash", 1, "cross1", "player"),
  R("the_last_warmaster", "no_retreat", ...SELF),
  R("the_last_warmaster", "final_order", ...GLOBAL_P),
  R("the_riftforge_tyrant", "tyrant_blackguard", ...SELF),
  R("the_riftforge_tyrant", "worldhate_judgment", ...GLOBAL_P),
  R("the_riftforge_tyrant", "riftforge_eruption", 4, "3x3", "player", { allowEmptyTile: true }),
  R("the_riftforge_tyrant", "forgefire_decree", ...GLOBAL_F, { includeSelf: true, buffOnly: true }),
  R("the_riftforge_tyrant", "chain_of_hatred", 4, "single", "player", { pull: true }),
  R("the_riftforge_tyrant", "riftblade_cleave", 1, "cross1", "player"),
  R("stormwake_leviathan", "endless_maelstrom", ...GLOBAL_P),
  R("stormwake_leviathan", "cataclysm_strike", ...MELEE),
  R("stormwake_leviathan", "tempest_roar", ...GLOBAL_P),
  R("stormwake_leviathan", "maelstrom", ...GLOBAL_P),
  R("stormwake_leviathan", "storm_lash", ...MELEE),
  R("tidebound_crusher", "drown_grip", 3, "single", "player", { pull: true }),
  R("tidebound_crusher", "crushing_wave", 1, "cross1", "player"),

  // --- Assassin ---
  R("ash_skulker", "fade", ...SELF),
  R("ash_skulker", "ash_mark", 4, "single", "player"),
  R("ash_skulker", "backstab", ...MELEE),
  R("cinder_stalker", "smoke_veil", ...SELF),
  R("cinder_stalker", "blazing_pounce", 3, "single", "player", { leap: true }),
  R("cinder_stalker", "cinder_claw", ...MELEE),
  R("cliff_lurker", "rock_skip", ...SELF),
  R("cliff_lurker", "ambush_drop", 3, "single", "player", { leap: true }),
  R("cliff_lurker", "grip_strike", ...MELEE),
  R("dust_carver", "drystep", ...SELF),
  R("dust_carver", "blind_dust", 3, "cross1", "player"),
  R("dust_carver", "sand_slash", ...MELEE),
  R("fangroot_alpha", "alpha_lunge", 3, "single", "player", { leap: true }),
  R("fangroot_alpha", "rootfang_rend", ...MELEE),
  R("field_wolf", "execution_bite", ...MELEE),
  R("field_wolf", "bloodhunt_bite", ...MELEE),
  R("field_wolf", "savage_bite", ...MELEE),
  R("field_wolf", "pack_howl", 0, "self_radius", "global_foes", { selfRadius: 3, buffOnly: true }),
  R("frozen_stalker", "whiteout_veil", ...SELF),
  R("frozen_stalker", "chill_mark", 4, "single", "player"),
  R("frozen_stalker", "frozen_ambush", 3, "single", "player", { leap: true }),
  R("greenleaf_fox", "fade_step", ...SELF),
  R("greenleaf_fox", "rending_snap", ...MELEE),
  R("greenleaf_fox", "ambush_bite", 3, "single", "player", { leap: true }),
  R("icy_mink", "slipstep", ...SELF),
  R("icy_mink", "shiver_cut", ...MELEE),
  R("icy_mink", "frost_bite", ...MELEE),
  R("rock_lynx", "agile_reflex", ...SELF),
  R("rock_lynx", "cliff_strike", 3, "single", "player", { leap: true }),
  R("saltwind_skimmer", "glide", ...SELF),
  R("saltwind_skimmer", "salt_peck", ...MELEE),
  R("saltwind_skimmer", "wind_slice", 2, "single", "player"),

  // --- Mage ---
  R("ash_horror", "smother", 4, "single", "player"),
  R("ash_horror", "decay_aura", 0, "self_radius", "player", { selfRadius: 2 }),
  R("ash_horror", "ash_touch", ...MELEE),
  R("brinegullet_spitter", "corrosive_pool", 4, "3x3", "player", { allowEmptyTile: true }),
  R("brinegullet_spitter", "acid_spit", 4, "single", "player"),
  R("grass_snake", "shed_skin", ...SELF),
  R("grass_snake", "constriction", ...MELEE),
  R("grass_snake", "venom_burst", 3, "cross1", "player"),
  R("hollowglass_siren", "hollow_reflection", ...SELF),
  R("hollowglass_siren", "silent_aria", ...GLOBAL_P),
  R("hollowglass_siren", "rime_lament", 4, "3x3", "player", { allowEmptyTile: true }),
  R("hollowglass_siren", "shatter_focus", 5, "single", "player"),
  R("hollowglass_siren", "glass_needle", 5, "line", "player", { lineMax: 5 }),
  R("icy_serpent", "freeze_skin", ...SELF, { reflect: true }),
  R("icy_serpent", "constriction_chill", ...MELEE),
  R("icy_serpent", "cold_venom", 4, "single", "player"),
  R("inferno_oracle", "flameveil_ward", 4, "single", "foe_ally", { targetSelfOrAlly: true }),
  R("inferno_oracle", "cinder_prophecy", ...GLOBAL_F, { buffOnly: true }),
  R("inferno_oracle", "inferno_gaze", 5, "single", "player"),
  R("inferno_oracle", "firethread_lash", 4, "line", "player", { lineMax: 3 }),
  R("the_stillness_below", "absolute_zero_pulse", ...GLOBAL_P),
  R("the_stillness_below", "fracture_the_surface", 5, "3x3", "player", { allowEmptyTile: true }),
  R("the_stillness_below", "glacial_carapace", ...SELF),
  R("the_stillness_below", "silence_wave", ...GLOBAL_P),
  R("the_stillness_below", "abyssal_rime", 5, "cross1", "player"),
  R("the_stillness_below", "eye_beneath", 5, "single", "player"),
  R("the_stillness_below", "pressure_under_ice", 4, "single", "player"),
  R("witherling", "life_drain", 4, "single", "player", { selfHealAfter: true }),
  R("witherling", "brittle_breath", 3, "line", "player", { lineMax: 3 }),
  R("witherling", "decay_bite", ...MELEE),

  // --- Controller ---
  R("abyssal_tempest_caller", "tempest_bind", 5, "single", "player"),
  R("abyssal_tempest_caller", "static_barrier", 4, "single", "foe_ally", { targetSelfOrAlly: true }),
  R("abyssal_tempest_caller", "storm_collapse", 4, "cross1", "player"),
  R("burrow_hare", "burrow_instinct", ...SELF),
  R("burrow_hare", "dust_flick", 3, "single", "player"),
  R("burrow_hare", "bleed_scratch", ...MELEE),
  R("coastal_horror", "abyss_grip", 4, "single", "player"),
  R("coastal_horror", "terror_pulse", ...GLOBAL_P, { filterDebuffed: true }),
  R("drowned_channeler", "abyss_bind", 5, "single", "player"),
  R("drowned_channeler", "tidal_surge", 4, "cross1", "player"),
  R("ember_forgeling", "spark_spray", 3, "cross1", "player"),
  R("ember_scuttler", "fire_web", 4, "single", "player"),
  R("ember_scuttler", "ignite", 4, "single", "player"),
  R("ember_scuttler", "scuttle_burst", 0, "cross1", "player", { anchorSelf: true }),
  R("frost_skitter", "crystal_nerves", ...SELF),
  R("frost_skitter", "absolute_zero", 4, "single", "player"),
  R("frost_skitter", "ice_web", 4, "single", "player"),
  R("frozen_pinecone", "needle_scatter", 4, "cross1", "player"),
  R("frozen_pinecone", "freeze_burst", 3, "cross1", "player"),
  R("frozen_pinecone", "drop_strike", 3, "single", "player", { leap: true }),
  R("lava_basilisk", "molten_sheen", ...SELF),
  R("lava_basilisk", "petrifying_heat", 5, "single", "player"),
  R("lava_basilisk", "inferno_gaze", 5, "single", "player"),
  R("mirage_lurker", "mirage_shift", ...SELF),
  R("mirage_lurker", "heat_haze", 4, "cross1", "player"),
  R("mirage_lurker", "illusion_strike", 3, "single", "player"),
  R("mirage_maw", "splitting_mirage", ...SELF),
  R("mirage_maw", "thirsting_haze", 4, "3x3", "player", { allowEmptyTile: true }),
  R("mirage_maw", "mirage_lock", 4, "single", "player"),
  R("mirage_maw", "false_wound", 4, "single", "player"),
  R("mirage_remnant", "vanish", ...SELF),
  R("pale_rime_wisp", "wisp_veil", 2, "single", "foe_ally", { targetSelfOrAlly: true }),
  R("petrified_coilwarden", "petrifying_stare", 5, "single", "player"),
  R("petrified_coilwarden", "stone_venom", ...MELEE),
  R("petrified_coilwarden", "crushing_coil", ...MELEE),
  R("petrified_coilwarden", "mineral_haze", 0, "self_radius", "player", { selfRadius: 3 }),
  R("remnant_of_rust", "corrode_armor", 4, "single", "player"),
  R("remnant_of_rust", "rust_strike", ...MELEE),
  R("remnant_of_rust", "grinding_lock", ...MELEE),
  R("rock_serpent", "stone_slither", ...SELF),
  R("rock_serpent", "petrify_gaze", 5, "single", "player"),
  R("rock_serpent", "debilitating_venom", 4, "single", "player"),
  R("rock_serpent", "crush_coil", ...MELEE),
  R("rustbound_marshal", "corrode_command", 5, "single", "player"),
  R("rustbound_marshal", "rusted_guard", ...SELF),
  R("rustbound_marshal", "marshals_cleave", 1, "cross1", "player"),
  R("rustbound_marshal", "chain_order", 4, "single", "player"),
  R("tide_hopper", "foam_feint", 3, "single", "player"),
  R("tide_hopper", "dragging_current", 4, "single", "player", { pull: true }),
  R("tideharrow", "brine_shackles", 4, "single", "player"),
  R("tideharrow", "drown_pulse", 0, "self_radius", "player", { selfRadius: 2 }),
  R("tideharrow", "riptide_pull", 4, "single", "player", { pull: true }),

  // --- Support ---
  R("barkhide_spriggan", "nature_guard", 4, "single", "foe_ally", { targetSelfOrAlly: true }),
  R("barkhide_spriggan", "barkskin", 4, "single", "foe_ally", { targetSelfOrAlly: true }),
  R("barkhide_spriggan", "root_bind_sg", 4, "single", "player"),
  R("bramblehorn_matriarch", "rootmend", 4, "single", "foe_ally", { targetSelfOrAlly: true }),
  R("bramblehorn_matriarch", "thorn_prayer", ...GLOBAL_P),
  R("bramblehorn_matriarch", "rootlash", 4, "single", "player"),
  R("driftling", "tidal_mend", 4, "single", "foe_ally", { targetSelfOrAlly: true }),
  R("driftling", "mist_veil", 4, "single", "foe_ally", { targetSelfOrAlly: true }),
  R("frostroot_seedling", "seedling_mend", 4, "single", "foe_ally", { targetSelfOrAlly: true }),
  R("frostroot_seedling", "frost_needle", 4, "single", "player"),
  R("greenleaf_stag", "natures_blessing", 4, "single", "foe_ally", { targetSelfOrAlly: true }),
  R("greenleaf_stag", "verdant_ward", 4, "single", "foe_ally", { targetSelfOrAlly: true }),
  R("greenleaf_stag", "root_bind", 4, "single", "player"),
  R("pinebound_fawn", "gentle_heal", 4, "single", "foe_ally", { targetSelfOrAlly: true }),
  R("pinebound_fawn", "winter_grace", 4, "single", "foe_ally", { targetSelfOrAlly: true }),
  R("the_heartbloom_ancient", "heartroot_pulse", ...GLOBAL_F, { buffOnly: true }),
  R("the_heartbloom_ancient", "vinecrush", ...MELEE),
  R("the_heartbloom_ancient", "sporefall", 5, "3x3", "player", { allowEmptyTile: true }),
  R("the_heartbloom_ancient", "ancient_barkskin", ...SELF),
  R("the_heartbloom_ancient", "blooming_rupture", 4, "cross1", "player"),
  R("the_heartbloom_ancient", "gaia_heartbreak", ...GLOBAL_P),
  R("sleeping_child_of_winter", "frozen_heart_pulse", ...GLOBAL_P),
  R("sleeping_child_of_winter", "winters_mercy", ...GLOBAL_F, { buffOnly: true }),
  R("sleeping_child_of_winter", "lullaby_of_snow", ...GLOBAL_P),
  R("sleeping_child_of_winter", "frostroot_cradle", 4, "single", "foe_ally", { targetSelfOrAlly: true }),
  R("sleeping_child_of_winter", "shiver_bloom", 4, "cross1", "player"),
  R("sleeping_child_of_winter", "innocent_grasp", 4, "single", "player"),
  R("verdant_bloomseer", "bloom_mend", 4, "single", "foe_ally", { targetSelfOrAlly: true }),
  R("verdant_bloomseer", "pollen_blind", 4, "cross1", "player"),
  R("verdant_bloomseer", "thorned_bloom", 4, "single", "player"),
  R("verdant_bloomseer", "greenward_song", ...GLOBAL_F, { buffOnly: true }),
  R("verdant_sprout", "sprout_mend", 4, "single", "foe_ally", { targetSelfOrAlly: true }),
  R("whitebark_matron", "frozen_prayer", ...GLOBAL_F, { buffOnly: true }),
  R("whitebark_matron", "whitebark_mend", 4, "single", "foe_ally", { targetSelfOrAlly: true }),
  R("whitebark_matron", "snowveil_grace", 4, "single", "foe_ally", { targetSelfOrAlly: true }),
  R("whitebark_matron", "frostroot_bind", 4, "single", "player"),

  // --- Summoner ---
  R("bannerless_wraithlord", "call_fallen", ...SELF, { summonAdjacent: true }),
  R("bannerless_wraithlord", "soul_chill", 5, "cross1", "player"),
  R("bannerless_wraithlord", "banner_curse", 5, "single", "player"),
  R("bannerless_wraithlord", "haunting_bolt", 5, "single", "player"),
  R("faded_war_wraith", "call_fallen", ...SELF, { summonAdjacent: true }),
  R("faded_war_wraith", "soul_chill", 5, "cross1", "player"),
  R("faded_war_wraith", "haunt", 5, "single", "player"),
  R("dune_mourner", "open_the_maw", ...SELF, { summonAdjacent: true }),
  R("dune_mourner", "mirage_burial", 5, "3x3", "player", { allowEmptyTile: true }),
  R("dune_mourner", "withering_cry", ...GLOBAL_P),
  R("dune_mourner", "drought_curse", 5, "single", "player"),
  R("dune_mourner", "sand_hunger", 5, "single", "player", { selfHealAfter: true }),
  R("tidemeld_revenant", "summon_tide_echo", ...SELF, { summonAdjacent: true }),
  R("tidemeld_revenant", "soul_current", 4, "single", "foe_ally", { targetSelfOrAlly: true }),
  R("tidemother_aberration", "spawn_tide_echo", ...SELF, { summonAdjacent: true }),
  R("tidemother_aberration", "crushing_undertow", 4, "cross1", "player"),

  // --- Harasser / Buffer ---
  R("greenleaf_squirrel", "scurry_shift", ...SELF),
  R("greenleaf_squirrel", "forest_gift", 4, "single", "foe_ally", { targetSelfOrAlly: true }),
  R("greenleaf_squirrel", "nut_barrage", 4, "single", "player"),
  R("greenleaf_parrot", "echo_cry", ...GLOBAL_F, { buffOnly: true }),
  R("greenleaf_parrot", "distracting_screech", 5, "cross1", "player")
];

function rowToConfig([script, key, rangeMax, aoe, target, extra]) {
  const cfg = {
    rangeMin: rangeMax === 0 && aoe === "none" ? 0 : 1,
    rangeMax,
    aoe,
    target,
    requireUnitOnTile: aoe === "single" && target === "player" && !extra?.allowEmptyTile
  };
  if (extra) Object.assign(cfg, extra);
  return cfg;
}

function buildSkillMap() {
  /** @type {Record<string, object>} */
  const skill = {};
  for (const row of ROWS) {
    const [script, key] = row;
    skill[`${script}:${key}`] = rowToConfig(row);
  }
  return skill;
}

function emit() {
  const skill = buildSkillMap();
  const keys = Object.keys(skill).sort();
  const lines = keys.map((k) => `  "${k}": ${JSON.stringify(skill[k])}`);
  const body = `/**
 * AUTO-GENERATED by scripts/generate_enemy_tactical_skills.mjs — do not edit by hand.
 * Per-enemy-skill tactical targeting overrides (scriptId:skillKey).
 */
(function (root) {
  const ENEMY_TACTICAL_SKILLS = Object.freeze({
${lines.join(",\n")}
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { ENEMY_TACTICAL_SKILLS };
  } else {
    root.EnemyTacticalSkillsData = Object.freeze({ ENEMY_TACTICAL_SKILLS });
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : global);
`;
  fs.writeFileSync(outPath, body, "utf8");
  console.log(`Wrote ${keys.length} skill entries to ${outPath}`);
}

emit();
