/**
 * Monster spawn HP curve (client + server). Reads `monsterScaling.hpCurve` from game config.
 */
(function (root) {
  const DEFAULT_HP_CURVE = {
    trash: { levelCoeff: 10, vitCoeff: 4 },
    elite: {
      default: { levelCoeff: 17, vitCoeff: 7 },
      byRole: {
        tank: { levelCoeff: 17, vitCoeff: 9 }
      }
    },
    boss: {
      default: { levelCoeff: 36, vitCoeff: 10 },
      byRole: {
        bruiser: { levelCoeff: 36, vitCoeff: 10 },
        tank: { levelCoeff: 34, vitCoeff: 11 },
        assassin: { levelCoeff: 32, vitCoeff: 8 },
        mage: { levelCoeff: 38, vitCoeff: 7 },
        controller: { levelCoeff: 36, vitCoeff: 7 },
        support: { levelCoeff: 38, vitCoeff: 7 },
        summoner: { levelCoeff: 58, vitCoeff: 12 }
      }
    },
    summon: { levelCoeff: 5, vitCoeff: 2.5 }
  };

  const SUMMON_COMBAT_SCRIPTS = new Set([
    "pale_rime_wisp",
    "ember_forgeling",
    "frostroot_seedling",
    "fallen_echo",
    "verdant_sprout",
    "mirage_remnant"
  ]);

  function rarityTier(def) {
    const raw = (def?.spawnRarity || "common").trim().toLowerCase();
    if (raw === "rare" || raw === "epic" || raw === "myth" || raw === "ancient") return raw;
    return "common";
  }

  function rarityHpMultiplier(def, monsterScaling) {
    const map = monsterScaling?.rarityHpMultipliers || {};
    const v = map[rarityTier(def)];
    return typeof v === "number" && v > 0 ? v : 1;
  }

  function isBossSpawn(def, opts) {
    return def?.isBoss === true || opts?.isBoss === true;
  }

  function isEliteSpawn(def, opts) {
    if (isBossSpawn(def, opts)) return false;
    const tier = rarityTier(def);
    return tier === "epic" || tier === "ancient";
  }

  function isSummonSpawn(def) {
    const script = def?.combatScript?.trim?.()?.toLowerCase?.() || "";
    return SUMMON_COMBAT_SCRIPTS.has(script);
  }

  function getHpCurveTier(def, opts) {
    if (isBossSpawn(def, opts)) return "boss";
    if (isSummonSpawn(def)) return "summon";
    if (isEliteSpawn(def, opts)) return "elite";
    return "trash";
  }

  function getHpCurveCoeffs(monsterScaling, tier, roleKey) {
    const curve = monsterScaling?.hpCurve || DEFAULT_HP_CURVE;
    const role = typeof roleKey === "string" && roleKey.trim() ? roleKey.trim().toLowerCase() : "bruiser";
    if (tier === "summon") {
      return curve.summon || DEFAULT_HP_CURVE.summon;
    }
    if (tier === "boss") {
      const boss = curve.boss || DEFAULT_HP_CURVE.boss;
      return (boss.byRole && boss.byRole[role]) || boss.default || DEFAULT_HP_CURVE.boss.default;
    }
    if (tier === "elite") {
      const elite = curve.elite || DEFAULT_HP_CURVE.elite;
      if (elite.byRole && elite.byRole[role]) return elite.byRole[role];
      return elite.default || DEFAULT_HP_CURVE.elite.default;
    }
    return curve.trash || DEFAULT_HP_CURVE.trash;
  }

  /**
   * @param {number} level
   * @param {{ vit?: number }} stats
   * @param {object} def enemy def
   * @param {object} monsterScaling GAME_CONFIG.monsterScaling
   * @param {{ isBoss?: boolean, roleKey?: string, regionScale?: number, moodHpMult?: number }} opts
   */
  function resolveSpawnHp(level, stats, def, monsterScaling, opts) {
    if (def && typeof def.baseHp === "number" && Number.isFinite(def.baseHp)) {
      return Math.max(1, Math.floor(def.baseHp));
    }
    const lvl = Math.max(1, Math.floor(level || 1));
    const vit = typeof stats?.vit === "number" && Number.isFinite(stats.vit) ? stats.vit : 0;
    const tier = getHpCurveTier(def, opts || {});
    const roleKey = opts?.roleKey || def?.combatRole || "bruiser";
    const coeffs = getHpCurveCoeffs(monsterScaling, tier, roleKey);
    const levelCoeff = typeof coeffs.levelCoeff === "number" ? coeffs.levelCoeff : 10;
    const vitCoeff = typeof coeffs.vitCoeff === "number" ? coeffs.vitCoeff : 4;
    const coreHp = Math.round(lvl * levelCoeff + vit * vitCoeff);
    const rarityMult = rarityHpMultiplier(def, monsterScaling);
    const scale = typeof opts?.regionScale === "number" && opts.regionScale > 0 ? opts.regionScale : 1;
    const hpMult = typeof opts?.moodHpMult === "number" && opts.moodHpMult > 0 ? opts.moodHpMult : 1;
    return Math.max(1, Math.round(coreHp * rarityMult * scale * hpMult));
  }

  const api = {
    DEFAULT_HP_CURVE,
    rarityTier,
    rarityHpMultiplier,
    getHpCurveTier,
    getHpCurveCoeffs,
    resolveSpawnHp
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.MONSTER_HP = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : global);
