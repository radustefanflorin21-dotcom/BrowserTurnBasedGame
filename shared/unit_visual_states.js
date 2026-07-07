/**
 * Tactical unit visual animation states (3D GLB clips + 2D sprite/image states).
 * Clip names in GLB files are resolved via aliases then per-unit config overrides.
 */
(function (global) {
  const STATES = Object.freeze({
    IDLE: "idle",
    WALK: "walk",
    ATTACK: "attack",
    SKILL: "skill",
    FALL: "fall"
  });

  /** Default GLB animation clip names tried in order when config omits a mapping. */
  const CLIP_ALIASES = Object.freeze({
    idle: ["Idle", "idle", "IDLE", "Breathing Idle", "Armature|Idle"],
    walk: ["Walk", "Walking", "walk", "Run", "Running", "Armature|Walk"],
    attack: ["Attack", "attack", "Melee", "Hit", "Armature|Attack"],
    skill: ["Skill", "skill", "Cast", "cast", "Spell", "Magic", "Armature|Skill"],
    fall: ["Fall", "Death", "Die", "Dying", "fall", "death", "Armature|Death"]
  });

  const DEFAULT_FALLBACK_MS = Object.freeze({
    attack: 1000,
    skill: 1000,
    walk: 0,
    fall: 1000,
    idle: 0
  });

  /** Target playback length for one-shot combat attack/skill clips on the tactical board. */
  const COMBAT_MODEL_ACTION_MS = 1000;
  const COMBAT_MODEL_FALL_MS = 1000;
  const COMBAT_MODEL_FALL_HOLD_MS = 1000;
  const COMBAT_MODEL_FALL_FADE_MS = 1000;

  const BUFF_SKILL_PATTERNS = new Set([
    "brace",
    "flow_step",
    "smoke_step",
    "overload",
    "spell_preparation",
    "blood_price",
    "heal_ally",
    "heal_all",
    "ward_shield",
    "encourage",
    "regrowth",
    "cleanse",
    "rev_pulse",
    "sanctuary_party",
    "guard_ally",
    "taunt_all",
    "all_foes_debuff",
    "crippling_mixture",
    "spread_contagion"
  ]);

  const ENEMY_DAMAGE_SKILL_RE =
    /bite|strike|slash|crush|slam|rend|impale|bolt|spit|claw|pounce|lunge|attack|smash|hammer|quake|scratch|devour|backstab|lash|flourish|rush|storm_collapse|ember|scorch|jawbreaker|ash_touch|smother|acid_spit|rootlash|haunting/i;
  const ENEMY_BUFF_DEBUFF_SKILL_RE =
    /dust|curse|bind|blind|chill|mark|weaken|terror|instinct|veil|fade|hide|ward|mend|guard|barkskin|fortitude|barrier|fortify|regenerat|reflect|summon|aura|prayer|fortitude|decay_aura|heat_skin|obsidian|burrow|drag|pull|flick|taunt|static_barrier|tempest_bind|soul_chill|banner_curse|root_bind|thorn_prayer|nature_guard|corrosive_pool|dead_flesh|grave_fortitude|ash_mark|feint|foam/i;

  function getSkillCatalogEntry(skillName) {
    if (!skillName || typeof skillName !== "string") return null;
    const cat = typeof SKILL_CATALOG !== "undefined" && SKILL_CATALOG ? SKILL_CATALOG[skillName] : null;
    return cat || null;
  }

  function getSkillConfigEntry(skillName) {
    if (!skillName) return null;
    if (typeof getSkillDef === "function") return getSkillDef(skillName);
    if (global && typeof global.getSkillDef === "function") return global.getSkillDef(skillName);
    return null;
  }

  function getSkillVisualMeta(skillName) {
    if (!skillName) return { visualAnim: null, visualClip: null };
    const cat = getSkillCatalogEntry(skillName);
    const cfg = getSkillConfigEntry(skillName);
    return {
      visualAnim: cat?.visualAnim || cfg?.visualAnim || null,
      visualClip: cat?.visualClip || cfg?.visualClip || null
    };
  }

  function skillCatalogDealsDamage(cat) {
    if (!cat || cat.passiveOnly) return false;
    const row = cat.levels && cat.levels[0] ? cat.levels[0] : null;
    if (row && (Number(row.strPct) > 0 || Number(row.intPct) > 0)) return true;
    const pattern = cat.pattern;
    if (
      pattern === "basic" ||
      pattern === "strike" ||
      pattern === "twin_jab" ||
      pattern === "spark" ||
      pattern === "aoe_mag_adj" ||
      pattern === "aoe_phys_adj" ||
      pattern === "burning_field" ||
      pattern === "arcane_collapse" ||
      pattern === "event_horizon" ||
      pattern === "steady_shot" ||
      pattern === "piercing_shot" ||
      pattern === "reflex_volley" ||
      pattern === "vanishing_shot" ||
      pattern === "bleeding_flourish" ||
      pattern === "deep_lunge" ||
      pattern === "final_measure" ||
      pattern === "earthbreaker" ||
      pattern === "brutal_rush" ||
      pattern === "bloodstorm" ||
      pattern === "execute_skill" ||
      pattern === "toxin_dart"
    ) {
      return true;
    }
    if (pattern === "strike_debuff" && row && (Number(row.strPct) > 0 || Number(row.intPct) > 0)) {
      return true;
    }
    return false;
  }

  function skillCatalogIsBuffDebuff(cat) {
    if (!cat || cat.passiveOnly) return true;
    if (BUFF_SKILL_PATTERNS.has(cat.pattern)) return true;
    if (skillCatalogDealsDamage(cat)) return false;
    if (cat.pattern === "strike_debuff") return true;
    return true;
  }

  function resolveEnemySkillVisualAnim(scriptId, skillKey) {
    const key = skillKey && scriptId ? `${scriptId}:${skillKey}` : "";
    const table =
      typeof EnemyTacticalSkillsData !== "undefined" && EnemyTacticalSkillsData
        ? EnemyTacticalSkillsData.ENEMY_TACTICAL_SKILLS
        : null;
    const cfg = table && key ? table[key] : null;

    if (cfg) {
      if (cfg.target === "self" && cfg.aoe === "none") return STATES.SKILL;
      if (cfg.targetSelfOrAlly || cfg.target === "foe_ally") return STATES.SKILL;
      if (cfg.reflect || cfg.summonAdjacent) return STATES.SKILL;
    }

    const sk = String(skillKey || "");
    if (ENEMY_DAMAGE_SKILL_RE.test(sk)) return STATES.ATTACK;
    if (ENEMY_BUFF_DEBUFF_SKILL_RE.test(sk)) return STATES.SKILL;

    if (cfg && (cfg.target === "player" || cfg.target === "global_players" || cfg.target === "players_in_range")) {
      return STATES.ATTACK;
    }

    return STATES.SKILL;
  }

  /**
   * Pick attack vs skill visual state for a combat action.
   * @param {"attack"|"skill"|string} kind
   * @param {string|null} skillName
   * @param {{ scriptId?: string }} [opts]
   */
  function resolveCombatVisualAnim(kind, skillName, opts) {
    if (kind === STATES.ATTACK || kind === "basic") return STATES.ATTACK;
    if (!skillName) return kind === STATES.SKILL ? STATES.SKILL : STATES.ATTACK;

    const meta = getSkillVisualMeta(skillName);
    if (meta.visualAnim === STATES.ATTACK || meta.visualAnim === STATES.SKILL) return meta.visualAnim;

    const cat = getSkillCatalogEntry(skillName);
    if (cat) {
      if (skillCatalogIsBuffDebuff(cat)) return STATES.SKILL;
      if (skillCatalogDealsDamage(cat)) return STATES.ATTACK;
      return STATES.SKILL;
    }

    if (opts && opts.scriptId) {
      return resolveEnemySkillVisualAnim(opts.scriptId, skillName);
    }

    return kind === STATES.SKILL ? STATES.SKILL : STATES.ATTACK;
  }

  function resolveSkillVisualClip(skillName, model3dDef) {
    if (!skillName) return null;
    const meta = getSkillVisualMeta(skillName);
    if (typeof meta.visualClip === "string" && meta.visualClip.trim()) return meta.visualClip.trim();
    const skillClips = model3dDef && model3dDef.skillClips;
    if (skillClips && typeof skillClips[skillName] === "string" && skillClips[skillName].trim()) {
      return skillClips[skillName].trim();
    }
    return null;
  }

  global.UNIT_VISUAL = {
    STATES,
    CLIP_ALIASES,
    DEFAULT_FALLBACK_MS,
    COMBAT_MODEL_ACTION_MS,
    COMBAT_MODEL_FALL_MS,
    COMBAT_MODEL_FALL_HOLD_MS,
    COMBAT_MODEL_FALL_FADE_MS,
    getSkillVisualMeta,
    resolveCombatVisualAnim,
    resolveEnemySkillVisualAnim,
    resolveSkillVisualClip
  };
})(typeof window !== "undefined" ? window : globalThis);
