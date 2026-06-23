/**
 * Craft XP calculation (client + server).
 */
(function (root) {
  const COMPLEXITY_BY_DISTINCT = Object.freeze({
    1: 0.5,
    2: 0.65,
    3: 0.8,
    4: 1.0,
    5: 1.25,
    6: 1.55,
    7: 2.1,
    8: 2.7
  });

  function roundXpToNearest5(value) {
    const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
    if (n <= 0) return 0;
    return Math.max(5, Math.round(n / 5) * 5);
  }

  function computeBaseItemXp(itemLevel) {
    const lv = Math.max(1, Math.floor(itemLevel));
    return 20 + lv * 4 + Math.pow(lv, 1.45);
  }

  function getRecipeDistinctIngredientCount(recipe) {
    const names = new Set();
    const ingredients = recipe && Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
    ingredients.forEach((ing) => {
      const itemName = ing && typeof ing.item === "string" ? ing.item.trim() : "";
      if (itemName) names.add(itemName);
    });
    return Math.max(1, Math.min(8, names.size));
  }

  function getRecipeComplexityMultiplier(recipe) {
    const count = getRecipeDistinctIngredientCount(recipe);
    return COMPLEXITY_BY_DISTINCT[count] || COMPLEXITY_BY_DISTINCT[8];
  }

  function getLevelRelevanceMultiplier(itemLevel, professionLevel) {
    const itemLv = Math.max(1, Math.floor(itemLevel));
    const profLv = Math.max(1, Math.floor(professionLevel));
    const gap = profLv - itemLv;
    if (gap <= 0) return 1.0;
    if (gap <= 3) return 1.0;
    if (gap <= 7) return 0.8;
    if (gap <= 12) return 0.55;
    if (gap <= 20) return 0.25;
    if (gap <= 29) return 0.05;
    return 0;
  }

  /**
   * @param {object} deps - { ProfessionProgression, CraftMaterialTier, getItemDef(recipe.resultItem) }
   */
  function computeCraftXpForRecipe(recipe, professionLevel, deps) {
    const PP = deps?.ProfessionProgression;
    const CMT = deps?.CraftMaterialTier;
    const itemDef = typeof deps?.getItemDef === "function" ? deps.getItemDef(recipe?.resultItem) : null;
    const itemLevel = PP ? PP.getRecipeItemLevel(recipe, itemDef) : 1;
    const relevance = getLevelRelevanceMultiplier(itemLevel, professionLevel);
    if (relevance <= 0) return 0;
    if (recipe && typeof recipe.craftXp === "number" && Number.isFinite(recipe.craftXp) && recipe.craftXp > 0) {
      return roundXpToNearest5(recipe.craftXp);
    }
    const base = computeBaseItemXp(itemLevel);
    const complexity = getRecipeComplexityMultiplier(recipe);
    const material =
      CMT && deps?.materialIndex
        ? CMT.getRecipeMaterialDifficultyMultiplier(recipe, deps.materialIndex)
        : 1.0;
    return roundXpToNearest5(base * complexity * material * relevance);
  }

  const api = Object.freeze({
    COMPLEXITY_BY_DISTINCT,
    roundXpToNearest5,
    computeBaseItemXp,
    getRecipeDistinctIngredientCount,
    getRecipeComplexityMultiplier,
    getLevelRelevanceMultiplier,
    computeCraftXpForRecipe
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.CraftXp = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : global);
