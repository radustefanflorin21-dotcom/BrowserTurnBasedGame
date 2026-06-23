/**
 * Profession leveling (client + server). Max level 60, softened XP curve (296,060 total).
 */
(function (root) {
  const PROFESSION_MAX_LEVEL = 60;

  /** XP to advance from level L to L+1 (L = 1..59). Sum ≈ 296,060. */
  const PROFESSION_XP_TO_NEXT = Object.freeze([
    200, 250, 310, 380, 455, 540, 630, 725, 825, 935, 1050, 1170, 1295, 1425, 1565, 1710, 1860, 2015, 2175, 2340,
    2510, 2685, 2865, 3055, 3245, 3445, 3645, 3855, 4065, 4285, 4505, 4735, 4965, 5205, 5445, 5695, 5945, 6200, 6465,
    6730, 7000, 7275, 7555, 7845, 8130, 8425, 8725, 9030, 9340, 9650, 9970, 10290, 10620, 10950, 11285, 11625, 11970,
    12320, 12670
  ]);

  function xpToNextProfessionLevel(level) {
    const lv = Math.max(1, Math.min(PROFESSION_MAX_LEVEL, Math.floor(level)));
    if (lv >= PROFESSION_MAX_LEVEL) return 0;
    return PROFESSION_XP_TO_NEXT[lv - 1] || 0;
  }

  function ensureProfessionProgress(actor) {
    if (!actor || typeof actor !== "object") return {};
    if (!actor.professionProgress || typeof actor.professionProgress !== "object") {
      actor.professionProgress = {};
    }
    return actor.professionProgress;
  }

  function getProfessionProgressEntry(actor, professionId) {
    const id = String(professionId || "").trim();
    if (!id || !actor) return { level: 1, xp: 0 };
    const store = ensureProfessionProgress(actor);
    const raw = store[id];
    if (!raw || typeof raw !== "object") return { level: 1, xp: 0 };
    let level = typeof raw.level === "number" && Number.isFinite(raw.level) ? Math.floor(raw.level) : 1;
    let xp = typeof raw.xp === "number" && Number.isFinite(raw.xp) ? Math.max(0, Math.floor(raw.xp)) : 0;
    level = Math.max(1, Math.min(PROFESSION_MAX_LEVEL, level));
    if (level >= PROFESSION_MAX_LEVEL) {
      level = PROFESSION_MAX_LEVEL;
      xp = 0;
    }
    return { level, xp };
  }

  function setProfessionProgressEntry(actor, professionId, entry) {
    const id = String(professionId || "").trim();
    if (!id || !actor) return;
    const store = ensureProfessionProgress(actor);
    let level = typeof entry?.level === "number" ? Math.floor(entry.level) : 1;
    let xp = typeof entry?.xp === "number" ? Math.max(0, Math.floor(entry.xp)) : 0;
    level = Math.max(1, Math.min(PROFESSION_MAX_LEVEL, level));
    if (level >= PROFESSION_MAX_LEVEL) {
      store[id] = { level: PROFESSION_MAX_LEVEL, xp: 0 };
      return;
    }
    const need = xpToNextProfessionLevel(level);
    while (need > 0 && xp >= need && level < PROFESSION_MAX_LEVEL) {
      xp -= need;
      level++;
      if (level >= PROFESSION_MAX_LEVEL) {
        xp = 0;
        break;
      }
    }
    store[id] = { level, xp };
  }

  function getProfessionLevel(actor, professionId) {
    return getProfessionProgressEntry(actor, professionId).level;
  }

  function getRecipeItemLevel(recipe, itemDef) {
    if (itemDef && typeof itemDef.itemLevel === "number" && Number.isFinite(itemDef.itemLevel)) {
      return Math.max(1, Math.floor(itemDef.itemLevel));
    }
    if (recipe && typeof recipe.resultLevel === "number" && Number.isFinite(recipe.resultLevel)) {
      return Math.max(1, Math.floor(recipe.resultLevel));
    }
    return 1;
  }

  /**
   * Profession level required to craft/enhance an item of the given item level.
   * Tier gates: 1 → items 1–9, 10 → 10–19, 20 → 20–29, … 50 → 50–59, 60 → 60+.
   */
  function getRequiredProfessionLevelForItemLevel(itemLevel) {
    const lv = Math.max(1, Math.floor(itemLevel));
    if (lv < 10) return 1;
    return Math.floor(lv / 10) * 10;
  }

  function getRequiredProfessionLevelForRecipe(recipe, itemDef) {
    return getRequiredProfessionLevelForItemLevel(getRecipeItemLevel(recipe, itemDef));
  }

  function meetsProfessionLevelForItem(professionLevel, itemLevel) {
    const profLv = Math.max(1, Math.floor(professionLevel));
    return profLv >= getRequiredProfessionLevelForItemLevel(itemLevel);
  }

  /**
   * @returns {{ xpGained: number, levelsGained: number, level: number, xp: number }}
   */
  function addProfessionXp(actor, professionId, amount) {
    const id = String(professionId || "").trim();
    const gain = typeof amount === "number" && Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
    const before = getProfessionProgressEntry(actor, id);
    if (!gain || before.level >= PROFESSION_MAX_LEVEL) {
      return { xpGained: 0, levelsGained: 0, level: before.level, xp: before.xp };
    }
    let level = before.level;
    let xp = before.xp + gain;
    let levelsGained = 0;
    while (level < PROFESSION_MAX_LEVEL) {
      const need = xpToNextProfessionLevel(level);
      if (need <= 0 || xp < need) break;
      xp -= need;
      level++;
      levelsGained++;
    }
    if (level >= PROFESSION_MAX_LEVEL) {
      level = PROFESSION_MAX_LEVEL;
      xp = 0;
    }
    setProfessionProgressEntry(actor, id, { level, xp });
    return { xpGained: gain, levelsGained, level, xp };
  }

  const api = Object.freeze({
    PROFESSION_MAX_LEVEL,
    PROFESSION_XP_TO_NEXT,
    xpToNextProfessionLevel,
    ensureProfessionProgress,
    getProfessionProgressEntry,
    setProfessionProgressEntry,
    getProfessionLevel,
    getRecipeItemLevel,
    getRequiredProfessionLevelForItemLevel,
    getRequiredProfessionLevelForRecipe,
    meetsProfessionLevelForItem,
    addProfessionXp
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.ProfessionProgression = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : global);
