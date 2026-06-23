/**
 * Equipment enhancing (client + server).
 */
(function (root) {
  const RARITY_ORDER = Object.freeze(["common", "uncommon", "rare", "epic", "legendary"]);

  const DEFAULT_SUCCESS_BY_FROM = Object.freeze({
    common: 0.8,
    uncommon: 0.65,
    rare: 0.5,
    epic: 0.35
  });

  function normalizeRarityId(raw) {
    const id = String(raw || "common")
      .trim()
      .toLowerCase();
    return RARITY_ORDER.includes(id) ? id : "common";
  }

  function roundXpToNearest5(value) {
    const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
    if (n <= 0) return 0;
    return Math.max(5, Math.round(n / 5) * 5);
  }

  function getEnhancingConfig(cfg) {
    const crafting = cfg && cfg.crafting && typeof cfg.crafting === "object" ? cfg.crafting : {};
    const enhancing = crafting.enhancing && typeof crafting.enhancing === "object" ? crafting.enhancing : {};
    const successChanceByFromRarity =
      enhancing.successChanceByFromRarity && typeof enhancing.successChanceByFromRarity === "object"
        ? enhancing.successChanceByFromRarity
        : DEFAULT_SUCCESS_BY_FROM;
    const failureDowngradeChance =
      typeof enhancing.failureDowngradeChance === "number" && Number.isFinite(enhancing.failureDowngradeChance)
        ? Math.max(0, Math.min(1, enhancing.failureDowngradeChance))
        : 0.5;
    const runes = Array.isArray(enhancing.runes) ? enhancing.runes : [];
    return { successChanceByFromRarity, failureDowngradeChance, runes };
  }

  function getRarityIndex(rarityId) {
    return RARITY_ORDER.indexOf(normalizeRarityId(rarityId));
  }

  function getNextRarityId(rarityId) {
    const idx = getRarityIndex(rarityId);
    if (idx < 0 || idx >= RARITY_ORDER.length - 1) return null;
    return RARITY_ORDER[idx + 1];
  }

  function getPreviousRarityId(rarityId) {
    const idx = getRarityIndex(rarityId);
    if (idx <= 0) return null;
    return RARITY_ORDER[idx - 1];
  }

  function splitItemInstanceName(name) {
    const raw = typeof name === "string" ? name : "";
    if (!raw) return { baseName: "", rarityId: "common" };
    const sep = raw.lastIndexOf("@@");
    if (sep <= 0) return { baseName: raw, rarityId: "common" };
    return {
      baseName: raw.slice(0, sep),
      rarityId: normalizeRarityId(raw.slice(sep + 2))
    };
  }

  function makeRarityItemInstanceName(baseName, rarityId) {
    const base = String(baseName || "").trim();
    if (!base) return "";
    return `${base}@@${normalizeRarityId(rarityId)}`;
  }

  function getRuneLevelFromDef(def) {
    if (!def || typeof def !== "object") return 0;
    if (typeof def.enhancingRuneLevel === "number" && Number.isFinite(def.enhancingRuneLevel)) {
      return Math.max(1, Math.floor(def.enhancingRuneLevel));
    }
    if (typeof def.itemLevel === "number" && Number.isFinite(def.itemLevel)) {
      return Math.max(1, Math.floor(def.itemLevel));
    }
    return 0;
  }

  function getItemLevelForEnhance(itemDef, recipe) {
    const PP = root.ProfessionProgression;
    if (PP && typeof PP.getRecipeItemLevel === "function") {
      return PP.getRecipeItemLevel(recipe, itemDef);
    }
    if (itemDef && typeof itemDef.itemLevel === "number" && Number.isFinite(itemDef.itemLevel)) {
      return Math.max(1, Math.floor(itemDef.itemLevel));
    }
    if (recipe && typeof recipe.resultLevel === "number" && Number.isFinite(recipe.resultLevel)) {
      return Math.max(1, Math.floor(recipe.resultLevel));
    }
    return 1;
  }

  function getEnhanceSuccessChance(fromRarityId, cfg) {
    const enhancing = getEnhancingConfig(cfg);
    const key = normalizeRarityId(fromRarityId);
    const raw = enhancing.successChanceByFromRarity[key];
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return Math.max(0, Math.min(1, raw));
    }
    return 0;
  }

  function computeEnhanceXp(itemLevel, professionLevel, CraftXp) {
    const itemLv = Math.max(1, Math.floor(itemLevel));
    const profLv = Math.max(1, Math.floor(professionLevel));
    const base =
      CraftXp && typeof CraftXp.computeBaseItemXp === "function"
        ? CraftXp.computeBaseItemXp(itemLv)
        : 20 + itemLv * 4 + Math.pow(itemLv, 1.45);
    const relevance =
      CraftXp && typeof CraftXp.getLevelRelevanceMultiplier === "function"
        ? CraftXp.getLevelRelevanceMultiplier(itemLv, profLv)
        : 1;
    if (relevance <= 0) return 0;
    const rounded =
      CraftXp && typeof CraftXp.roundXpToNearest5 === "function"
        ? CraftXp.roundXpToNearest5(base * 0.35 * relevance)
        : roundXpToNearest5(base * 0.35 * relevance);
    return rounded;
  }

  function isEquipmentCraftingProfessionId(professionId) {
    const id = String(professionId || "").trim();
    return id === "weapon_smith" || id === "armor_smith" || id === "jeweller";
  }

  /**
   * @param {object} deps - { getItemDef, getRecipeForBaseName, getCraftingProfessionIdForRecipe, isEquippableItemDef }
   */
  function getCraftingProfessionIdForItemBase(baseName, deps) {
    const base = String(baseName || "").trim();
    if (!base) return null;
    const recipe =
      typeof deps?.getRecipeForBaseName === "function" ? deps.getRecipeForBaseName(base) : null;
    if (recipe && typeof deps?.getCraftingProfessionIdForRecipe === "function") {
      return deps.getCraftingProfessionIdForRecipe(recipe);
    }
    const def = typeof deps?.getItemDef === "function" ? deps.getItemDef(base) : null;
    if (!def) return null;
    if (def.type === "weapon") return "weapon_smith";
    const cat = String(def.equipCategory || def.weaponCategory || "")
      .trim()
      .toLowerCase();
    if (cat === "ring" || cat === "amulet" || cat === "bracelet" || cat === "wristband") return "jeweller";
    if (def.type === "armor" || def.type === "weapon") return "armor_smith";
    if (typeof deps?.isEquippableItemDef === "function" && deps.isEquippableItemDef(def)) {
      return "armor_smith";
    }
    return null;
  }

  /**
   * @returns {{ ok: boolean, message?: string, professionId?: string, itemLevel?: number, currentRarity?: string, nextRarity?: string|null, successChance?: number }}
   */
  function evaluateEnhanceAttempt({
    itemInstanceName,
    runeBaseName,
    professionId,
    crafterProfessionLevel,
    inventory,
    equippedNames,
    cfg,
    deps
  }) {
    const instance = typeof itemInstanceName === "string" ? itemInstanceName.trim() : "";
    const runeBase = typeof runeBaseName === "string" ? runeBaseName.trim() : "";
    if (!instance || !runeBase) return { ok: false, message: "Select equipment and a rune." };

    const equipped = equippedNames instanceof Set ? equippedNames : new Set();
    if (equipped.has(instance)) {
      return { ok: false, message: "Unequip the item before enhancing." };
    }

    const inv = Array.isArray(inventory) ? inventory : [];
    if (!inv.includes(instance)) return { ok: false, message: "That equipment is not in your inventory." };
    if (!inv.some((n) => splitItemInstanceName(n).baseName === runeBase || n === runeBase)) {
      return { ok: false, message: "You do not have that rune." };
    }

    const { baseName, rarityId } = splitItemInstanceName(instance);
    const def = typeof deps?.getItemDef === "function" ? deps.getItemDef(baseName) : null;
    if (!def || !(typeof deps?.isEquippableItemDef === "function" && deps.isEquippableItemDef(def))) {
      return { ok: false, message: "Only crafted equipment can be enhanced." };
    }

    const itemProfessionId = getCraftingProfessionIdForItemBase(baseName, deps);
    if (!itemProfessionId || !isEquipmentCraftingProfessionId(itemProfessionId)) {
      return { ok: false, message: "This item cannot be enhanced." };
    }
    if (String(professionId || "").trim() !== itemProfessionId) {
      return { ok: false, message: "Only the profession that crafts this item can enhance it." };
    }

    const recipe =
      typeof deps?.getRecipeForBaseName === "function" ? deps.getRecipeForBaseName(baseName) : null;
    const itemLevel = getItemLevelForEnhance(def, recipe);
    const runeDef = typeof deps?.getItemDef === "function" ? deps.getItemDef(runeBase) : null;
    const runeLevel = getRuneLevelFromDef(runeDef);
    if (!runeLevel) return { ok: false, message: "Invalid enhancing rune." };
    if (runeLevel < itemLevel) {
      return {
        ok: false,
        message: `This rune (level ${runeLevel}) cannot enhance level ${itemLevel} equipment.`
      };
    }

    const nextRarity = getNextRarityId(rarityId);
    if (!nextRarity) {
      return { ok: false, message: "This item is already at maximum quality." };
    }

    const PP = root.ProfessionProgression;
    const requiredProfLevel =
      PP && typeof PP.getRequiredProfessionLevelForItemLevel === "function"
        ? PP.getRequiredProfessionLevelForItemLevel(itemLevel)
        : itemLevel;
    const profLevel = Math.max(1, Math.floor(Number(crafterProfessionLevel) || 1));
    if (profLevel < requiredProfLevel) {
      return {
        ok: false,
        message: `Requires ${String(professionId).replace(/_/g, " ")} level ${requiredProfLevel} (you have ${profLevel}).`
      };
    }

    const successChance = getEnhanceSuccessChance(rarityId, cfg);
    if (successChance <= 0) {
      return { ok: false, message: "Cannot enhance from this quality tier." };
    }

    return {
      ok: true,
      professionId: itemProfessionId,
      itemLevel,
      currentRarity: rarityId,
      nextRarity,
      successChance
    };
  }

  /**
   * @param {() => number} rng - returns 0..1
   */
  function rollEnhanceOutcome({ itemInstanceName, cfg, rng }) {
    const { baseName, rarityId } = splitItemInstanceName(itemInstanceName);
    const nextRarity = getNextRarityId(rarityId);
    if (!nextRarity) {
      return { success: false, upgraded: false, downgraded: false, newItemName: itemInstanceName };
    }
    const enhancing = getEnhancingConfig(cfg);
    const successChance = getEnhanceSuccessChance(rarityId, cfg);
    const roll = typeof rng === "function" ? rng() : Math.random();
    if (roll < successChance) {
      return {
        success: true,
        upgraded: true,
        downgraded: false,
        newItemName: makeRarityItemInstanceName(baseName, nextRarity),
        fromRarity: rarityId,
        toRarity: nextRarity
      };
    }
    const downgradeRoll = typeof rng === "function" ? rng() : Math.random();
    if (downgradeRoll < enhancing.failureDowngradeChance) {
      const prev = getPreviousRarityId(rarityId);
      const newRarity = prev || rarityId;
      return {
        success: false,
        upgraded: false,
        downgraded: prev != null && prev !== rarityId,
        newItemName: makeRarityItemInstanceName(baseName, newRarity),
        fromRarity: rarityId,
        toRarity: newRarity
      };
    }
    return {
      success: false,
      upgraded: false,
      downgraded: false,
      newItemName: itemInstanceName,
      fromRarity: rarityId,
      toRarity: rarityId
    };
  }

  const api = Object.freeze({
    RARITY_ORDER,
    DEFAULT_SUCCESS_BY_FROM,
    normalizeRarityId,
    getEnhancingConfig,
    getRarityIndex,
    getNextRarityId,
    getPreviousRarityId,
    splitItemInstanceName,
    makeRarityItemInstanceName,
    getRuneLevelFromDef,
    getItemLevelForEnhance,
    getEnhanceSuccessChance,
    computeEnhanceXp,
    isEquipmentCraftingProfessionId,
    getCraftingProfessionIdForItemBase,
    evaluateEnhanceAttempt,
    rollEnhanceOutcome
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.Enhancing = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : global);
