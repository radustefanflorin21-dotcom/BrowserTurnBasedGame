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

  const DATA =
    typeof EnemyTacticalSkillsData !== "undefined"
      ? EnemyTacticalSkillsData.ENEMY_TACTICAL_SKILLS
      : typeof require !== "undefined"
        ? require("./enemy_tactical_skills_data.js").ENEMY_TACTICAL_SKILLS
        : {};

  /** @type {Record<string, object>} */
  const SKILL = { ...DATA };

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
