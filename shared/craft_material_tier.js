/**
 * Material difficulty from monster drop sources (client + server).
 */
(function (root) {
  const TIER_MULTIPLIERS = Object.freeze({
    common: 1.0,
    rare: 1.08,
    epic: 1.18,
    elite: 1.32,
    boss: 1.45
  });

  function enemyMaterialTier(enemy) {
    if (!enemy || typeof enemy !== "object") return "common";
    if (enemy.isBoss === true) return "boss";
    const role = String(enemy.role || enemy.combatRole || "").trim().toLowerCase();
    if (role === "elite" || enemy.spawnTier === "elite") return "elite";
    const rarity = String(enemy.spawnRarity || "common").trim().toLowerCase();
    if (rarity === "myth" || rarity === "ancient") return "elite";
    if (rarity === "epic") return "epic";
    if (rarity === "rare") return "rare";
    return "common";
  }

  function tierToMultiplier(tier) {
    return TIER_MULTIPLIERS[tier] || TIER_MULTIPLIERS.common;
  }

  /**
   * @param {object} gameConfig - GAME_CONFIG with enemies + monsterDropTables
   * @returns {Map<string, number>} base item name -> highest material difficulty multiplier
   */
  function buildMaterialDifficultyIndex(gameConfig) {
    const index = new Map();
    const cfg = gameConfig && typeof gameConfig === "object" ? gameConfig : null;
    const tables =
      cfg?.monsterDropTables && typeof cfg.monsterDropTables === "object" ? cfg.monsterDropTables : {};
    const enemies = Array.isArray(cfg?.enemies) ? cfg.enemies : [];
    const enemyByName = new Map();
    enemies.forEach((e) => {
      if (e && typeof e.name === "string" && e.name.trim()) enemyByName.set(e.name.trim(), e);
    });

    Object.entries(tables).forEach(([enemyName, table]) => {
      const enemy = enemyByName.get(enemyName) || null;
      const mult = tierToMultiplier(enemyMaterialTier(enemy));
      const materials = table && Array.isArray(table.materials) ? table.materials : [];
      materials.forEach((mat) => {
        const name = mat && typeof mat.name === "string" ? mat.name.trim() : "";
        if (!name) return;
        const prev = index.get(name) || TIER_MULTIPLIERS.common;
        if (mult > prev) index.set(name, mult);
      });
    });
    return index;
  }

  function getMaterialDifficultyMultiplier(itemName, index) {
    const name = String(itemName || "").trim();
    if (!name) return TIER_MULTIPLIERS.common;
    if (index && typeof index.get === "function") {
      return index.get(name) || TIER_MULTIPLIERS.common;
    }
    return TIER_MULTIPLIERS.common;
  }

  function getRecipeMaterialDifficultyMultiplier(recipe, index) {
    const ingredients = recipe && Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
    let max = TIER_MULTIPLIERS.common;
    ingredients.forEach((ing) => {
      const itemName = ing && typeof ing.item === "string" ? ing.item.trim() : "";
      if (!itemName) return;
      const mult = getMaterialDifficultyMultiplier(itemName, index);
      if (mult > max) max = mult;
    });
    return max;
  }

  const api = Object.freeze({
    TIER_MULTIPLIERS,
    enemyMaterialTier,
    tierToMultiplier,
    buildMaterialDifficultyIndex,
    getMaterialDifficultyMultiplier,
    getRecipeMaterialDifficultyMultiplier
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.CraftMaterialTier = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : global);
