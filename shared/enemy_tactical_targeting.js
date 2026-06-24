/**
 * Per-enemy-skill tactical targeting (range, AoE, target side).
 * Keys: "scriptId:skillKey" (skillKey = internal cooldown id from combat scripts).
 */
(function (root) {
  /** @typedef {'none'|'single'|'cross1'|'3x3'|'line'|'self_radius'|'global_players'|'global_foes'} EnemyAoe */
  /** @typedef {'self'|'player'|'foe_ally'|'global_players'|'global_foes'} EnemyTargetSide */

  const BASIC_BY_ROLE = {
    tank: { rangeMin: 1, rangeMax: 1, aoe: "single", target: "player", requireUnitOnTile: true },
    bruiser: { rangeMin: 1, rangeMax: 1, aoe: "single", target: "player", requireUnitOnTile: true },
    assassin: { rangeMin: 1, rangeMax: 1, aoe: "single", target: "player", requireUnitOnTile: true },
    mage: { rangeMin: 1, rangeMax: 4, aoe: "single", target: "player", requireUnitOnTile: true },
    controller: { rangeMin: 1, rangeMax: 4, aoe: "single", target: "player", requireUnitOnTile: true },
    support: { rangeMin: 1, rangeMax: 4, aoe: "single", target: "player", requireUnitOnTile: true },
    summoner: { rangeMin: 1, rangeMax: 4, aoe: "single", target: "player", requireUnitOnTile: true },
    harasser: { rangeMin: 1, rangeMax: 4, aoe: "single", target: "player", requireUnitOnTile: true },
    buffer: { rangeMin: 1, rangeMax: 4, aoe: "single", target: "player", requireUnitOnTile: true }
  };

  function S(rangeMax, aoe, target, extra) {
    return {
      rangeMin: rangeMax === 0 ? 0 : 1,
      rangeMax,
      aoe: aoe || "single",
      target: target || "player",
      requireUnitOnTile: aoe === "single" && target === "player",
      ...extra
    };
  }

  const SELF = S(0, "none", "self", { requireUnitOnTile: false });
  const MELEE = S(1, "single", "player");
  const GLOBAL_P = S(0, "global_players", "global_players", { requireUnitOnTile: false });
  const GLOBAL_F = S(0, "global_foes", "global_foes", { requireUnitOnTile: false });

  /** @type {Record<string, object>} */
  const SKILL = {
    // --- Mismatch fixes (design doc authoritative) ---
    "gorilla:ground_rupture": { ...S(3, "line", "player"), lineMax: 3, stopAtOccupied: true },
    "primordial_silverback:ground_roar": { ...S(0, "self_radius", "player"), selfRadius: 2 },
    "field_wolf:pack_howl": { ...S(0, "self_radius", "global_foes"), selfRadius: 3, buffOnly: true },
    "tide_hopper:dragging_current": { ...S(4, "single", "player"), pull: 1 },
    "tide_hopper:foam_feint": S(3, "single", "player"),
    "inferno_oracle:flameveil_ward": { ...S(4, "single", "foe_ally"), targetSelfOrAlly: true },
    "the_riftforge_tyrant:forgefire_decree": GLOBAL_P,

    // Tank samples
    "cinder_husk:dead_flesh": SELF,
    "cinder_husk:grave_fortitude": SELF,
    "tusk_boar:thick_hide": SELF,
    "tusk_boar:war_boar_taunt": S(4, "global_players", "global_players"),
    "tusk_boar:gore_charge": { ...S(3, "single", "player"), charge: true, straightLine: true },
    "thornback_graveguard:thorn_challenge": GLOBAL_P,
    "hermit_crab:anchoring_taunt": S(4, "global_players", "global_players"),
    "hermit_crab:crushing_clamp": MELEE,

    // Bruiser samples
    "plains_raptor:pounce": { ...S(3, "single", "player"), leap: true },
    "plains_raptor:claw_rend": MELEE,
    "ashmaw_titan:ashmaw_crush": MELEE,
    "ashmaw_titan:slagquake_slam": { ...MELEE, aoe: "cross1" },
    "stormwake_leviathan:endless_maelstrom": GLOBAL_P,
    "stormwake_leviathan:tempest_roar": GLOBAL_P,
    "stormwake_leviathan:cataclysm_strike": MELEE,
    "the_last_warmaster:ruststorm_slash": { ...MELEE, aoe: "cross1" },
    "the_last_warmaster:final_order": GLOBAL_P,

    // Controller samples
    "burrow_hare:burrow_instinct": SELF,
    "burrow_hare:dust_flick": S(3, "single", "player"),
    "burrow_hare:bleed_scratch": MELEE,
    "mirage_maw:thirsting_haze": { ...S(4, "3x3", "player"), allowEmptyTile: true },

    // Support samples
    "bramblehorn_matriarch:rootmend": { ...S(4, "single", "foe_ally"), targetSelfOrAlly: true },
    "bramblehorn_matriarch:thorn_prayer": GLOBAL_P,
    "whitebark_matron:frozen_prayer": GLOBAL_F
  };

  function getBasicAttackForRole(role) {
    const r = String(role || "bruiser").toLowerCase();
    return { ...(BASIC_BY_ROLE[r] || BASIC_BY_ROLE.bruiser) };
  }

  function getEnemySkillTargeting(scriptId, skillKey, role) {
    const sid = typeof scriptId === "string" ? scriptId.trim() : "";
    const key = typeof skillKey === "string" ? skillKey.trim() : "";
    if (sid && key && SKILL[`${sid}:${key}`]) {
      return { ...SKILL[`${sid}:${key}`] };
    }
    return getBasicAttackForRole(role);
  }

  function listConfiguredSkillKeys() {
    return Object.keys(SKILL);
  }

  const api = Object.freeze({
    BASIC_BY_ROLE,
    SKILL,
    getBasicAttackForRole,
    getEnemySkillTargeting,
    listConfiguredSkillKeys
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.EnemyTacticalTargeting = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : global);
