/**
 * Per-skill tactical tile targeting (range, AoE, target rules).
 * Used by client (range highlights) and server (validation).
 */
(function (root) {
  /** @typedef {'single'|'cross1_rank'|'cross1_cap2'|'3x3'|'all_enemies'|'all_allies'|'none'} TacticalAoe */
  /** @typedef {'enemy'|'ally'|'self'|'global_enemies'|'global_allies'} TacticalTargetKind */

  /**
   * @type {Record<string, {
   *   rangeMin?: number,
   *   rangeMax?: number,
   *   aoe?: TacticalAoe,
   *   target: TacticalTargetKind,
   *   allowEmptyTile?: boolean,
   *   requireUnitOnTile?: boolean,
   *   straightLine?: boolean,
   *   brutalRush?: boolean
   * }>}
   */
  const SKILL_TARGETING = {
    "Basic Physical Attack": { rangeMin: 1, rangeMax: 1, aoe: "single", target: "enemy", requireUnitOnTile: true },
    "Basic Magical Attack": { rangeMin: 1, rangeMax: 4, aoe: "single", target: "enemy", requireUnitOnTile: true },

    "Shield Bash": { rangeMin: 1, rangeMax: 1, aoe: "single", target: "enemy", requireUnitOnTile: true },
    Brace: { target: "self" },
    "Heavy Strike": { rangeMin: 1, rangeMax: 1, aoe: "single", target: "enemy", requireUnitOnTile: true },
    "Guarding Shout": { target: "global_enemies" },
    "Iron Wall": { target: "self" },
    Taunt: { target: "global_enemies" },
    "Guard Ally": { rangeMin: 1, rangeMax: 3, aoe: "single", target: "ally", requireUnitOnTile: true },
    "Shield Slam": { rangeMin: 1, rangeMax: 1, aoe: "single", target: "enemy", requireUnitOnTile: true },
    Earthbreaker: { rangeMin: 1, rangeMax: 1, aoe: "cross1_rank", target: "enemy", allowEmptyTile: true },
    "Unbroken Line": { target: "self" },

    "Precise Cut": { rangeMin: 1, rangeMax: 1, aoe: "single", target: "enemy", requireUnitOnTile: true },
    Footwork: { target: "self" },
    "Twin Jab": { rangeMin: 1, rangeMax: 1, aoe: "single", target: "enemy", requireUnitOnTile: true },
    Feint: { rangeMin: 1, rangeMax: 1, aoe: "single", target: "enemy", requireUnitOnTile: true },
    "Flow Step": { target: "self" },
    "Expose Weakness": { rangeMin: 1, rangeMax: 1, aoe: "single", target: "enemy", requireUnitOnTile: true },
    "Duelist Momentum": { target: "self" },
    "Bleeding Flourish": { rangeMin: 1, rangeMax: 1, aoe: "cross1_rank", target: "enemy", allowEmptyTile: true },
    "Deep Lunge": { rangeMin: 1, rangeMax: 2, aoe: "single", target: "enemy", requireUnitOnTile: true, straightLine: true },
    "Final Measure": { rangeMin: 1, rangeMax: 1, aoe: "single", target: "enemy", requireUnitOnTile: true },

    "Arcane Bolt": { rangeMin: 1, rangeMax: 5, aoe: "single", target: "enemy", requireUnitOnTile: true },
    Spark: { rangeMin: 1, rangeMax: 4, aoe: "single", target: "enemy", requireUnitOnTile: true },
    "Focused Casting": { target: "self" },
    "Spell Preparation": { target: "self" },
    "Arcane Wave": { rangeMin: 1, rangeMax: 4, aoe: "cross1_rank", target: "enemy", allowEmptyTile: true },
    "Burning Field": { rangeMin: 1, rangeMax: 4, aoe: "3x3", target: "enemy", allowEmptyTile: true },
    "Spell Fracture": { rangeMin: 1, rangeMax: 5, aoe: "single", target: "enemy", requireUnitOnTile: true },
    Overload: { target: "self" },
    "Arcane Collapse": { rangeMin: 1, rangeMax: 5, aoe: "cross1_rank", target: "enemy", allowEmptyTile: true },
    "Event Horizon": { rangeMin: 1, rangeMax: 5, aoe: "single", target: "enemy", requireUnitOnTile: true },

    "Quick Shot": { rangeMin: 2, rangeMax: 5, aoe: "single", target: "enemy", requireUnitOnTile: true },
    "Smoke Step": { target: "self" },
    "Mark Target": { rangeMin: 2, rangeMax: 6, aoe: "single", target: "enemy", requireUnitOnTile: true },
    "Steady Shot": { rangeMin: 2, rangeMax: 6, aoe: "single", target: "enemy", requireUnitOnTile: true },
    "Scatter Shot": { rangeMin: 2, rangeMax: 5, aoe: "cross1_rank", target: "enemy", allowEmptyTile: true },
    "Pinning Shot": { rangeMin: 2, rangeMax: 5, aoe: "single", target: "enemy", requireUnitOnTile: true },
    "Keen Eye": { target: "self" },
    "Piercing Shot": { rangeMin: 2, rangeMax: 6, aoe: "single", target: "enemy", requireUnitOnTile: true },
    "Reflex Volley": { rangeMin: 2, rangeMax: 5, aoe: "single", target: "enemy", requireUnitOnTile: true },
    "Vanishing Shot": { rangeMin: 2, rangeMax: 5, aoe: "single", target: "enemy", requireUnitOnTile: true },

    Cleave: { rangeMin: 1, rangeMax: 1, aoe: "cross1_cap2", target: "enemy", allowEmptyTile: true },
    "Blood Price": { target: "self" },
    "Heavy Cut": { rangeMin: 1, rangeMax: 1, aoe: "single", target: "enemy", requireUnitOnTile: true },
    "War Hunger": { target: "self" },
    Rupture: { rangeMin: 1, rangeMax: 1, aoe: "single", target: "enemy", requireUnitOnTile: true },
    "Brutal Rush": { rangeMin: 1, rangeMax: 3, aoe: "single", target: "enemy", requireUnitOnTile: true, straightLine: true, brutalRush: true },
    Bonebreaker: { rangeMin: 1, rangeMax: 1, aoe: "single", target: "enemy", requireUnitOnTile: true },
    "Kill Momentum": { target: "self" },
    Bloodstorm: { target: "global_enemies" },
    Execute: { rangeMin: 1, rangeMax: 1, aoe: "single", target: "enemy", requireUnitOnTile: true },

    Mend: { rangeMin: 1, rangeMax: 4, aoe: "single", target: "ally", requireUnitOnTile: true },
    "Protective Ward": { rangeMin: 1, rangeMax: 4, aoe: "single", target: "ally", requireUnitOnTile: true },
    Encourage: { rangeMin: 1, rangeMax: 5, aoe: "single", target: "ally", requireUnitOnTile: true },
    Regrowth: { rangeMin: 1, rangeMax: 4, aoe: "single", target: "ally", requireUnitOnTile: true },
    Cleanse: { rangeMin: 1, rangeMax: 4, aoe: "single", target: "ally", requireUnitOnTile: true },
    "Steady Heart": { target: "self" },
    "Group Mend": { target: "global_allies" },
    "Revitalizing Pulse": { target: "global_allies" },
    Sanctuary: { target: "global_allies" },
    "Second Breath": { target: "self" },

    "Toxin Dart": { rangeMin: 1, rangeMax: 5, aoe: "single", target: "enemy", requireUnitOnTile: true },
    "Irritating Powder": { rangeMin: 1, rangeMax: 3, aoe: "single", target: "enemy", requireUnitOnTile: true },
    "Weakening Flask": { rangeMin: 1, rangeMax: 4, aoe: "single", target: "enemy", requireUnitOnTile: true },
    "Poison Dart": { rangeMin: 1, rangeMax: 5, aoe: "single", target: "enemy", requireUnitOnTile: true },
    "Toxic Study": { target: "self" },
    "Acid Vial": { rangeMin: 1, rangeMax: 4, aoe: "single", target: "enemy", requireUnitOnTile: true },
    "Crippling Mixture": { rangeMin: 1, rangeMax: 4, aoe: "cross1_rank", target: "enemy", allowEmptyTile: true },
    "Spread Contagion": { rangeMin: 1, rangeMax: 5, aoe: "cross1_rank", target: "enemy", requireUnitOnTile: true },
    "Collapse Immunity": { rangeMin: 1, rangeMax: 5, aoe: "single", target: "enemy", requireUnitOnTile: true },
    "Plague Engine": { target: "self" }
  };

  /** Arcane Collapse R5 hits all enemies — handled via rank in resolveAoeType. */
  SKILL_TARGETING["Arcane Collapse"].aoeRankOverride = { 5: "all_enemies" };

  function getSkillTargeting(skillName) {
    if (!skillName || typeof skillName !== "string") return null;
    return SKILL_TARGETING[skillName] || null;
  }

  function needsTileTarget(skillName) {
    const cfg = getSkillTargeting(skillName);
    if (!cfg) return true;
    const t = cfg.target;
    if (t === "self" || t === "global_enemies" || t === "global_allies") return false;
    return true;
  }

  function cross1ExtraCountForRank(skillRank) {
    const r = Math.max(1, Math.min(5, skillRank || 1));
    if (r <= 2) return 1;
    if (r <= 4) return 2;
    return 3;
  }

  function resolveAoeType(cfg, skillRank, skillName) {
    if (!cfg) return "single";
    const ov = cfg.aoeRankOverride && cfg.aoeRankOverride[skillRank];
    if (ov) return ov;
    return cfg.aoe || "single";
  }

  function isMultiTileAoeType(aoeType) {
    return (
      aoeType !== "single" &&
      aoeType !== "none" &&
      aoeType !== "all_enemies" &&
      aoeType !== "all_allies"
    );
  }

  /** True when the skill is aimed at a board tile (center may be empty). */
  function allowsEmptyCenterTile(cfg, skillRank, skillName) {
    if (!cfg) return false;
    const t = cfg.target;
    if (t === "self" || t === "global_enemies" || t === "global_allies") return false;
    return true;
  }

  const api = Object.freeze({
    SKILL_TARGETING,
    getSkillTargeting,
    needsTileTarget,
    cross1ExtraCountForRank,
    resolveAoeType,
    isMultiTileAoeType,
    allowsEmptyCenterTile
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.TacticalSkillTargeting = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : global);
