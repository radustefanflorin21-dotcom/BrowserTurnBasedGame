/**
 * Server-authoritative equipment enhancing.
 */

import Enhancing from "../../shared/enhancing.js";
import CraftXp from "../../shared/craft_xp.js";
import { loadGameConfig } from "../load_game_config.js";
import {
  getCraftingProfessionIdForRecipe,
  resolveCrafter
} from "./craft_actions.js";
import { normalizeProfessionProgress, ProfessionProgression } from "./craft_helpers.js";
import {
  getItemBaseName,
  isEquippableItemDef,
  resolveItemDef
} from "./item_helpers.js";

function getCraftingConfig() {
  const cfg = loadGameConfig();
  return cfg?.crafting && typeof cfg.crafting === "object" ? cfg.crafting : {};
}

function getAllCraftingRecipes() {
  const cfg = getCraftingConfig();
  const tiers = Array.isArray(cfg.recipeTiers) ? cfg.recipeTiers : [];
  const out = [];
  tiers.forEach((tier) => {
    const recipes = tier && Array.isArray(tier.recipes) ? tier.recipes : [];
    recipes.forEach((r) => {
      if (!r || typeof r.resultItem !== "string") return;
      out.push(r);
    });
  });
  return out;
}

function getCraftRecipeForResultItem(baseName) {
  const want = String(baseName || "").trim();
  if (!want) return null;
  return getAllCraftingRecipes().find((r) => r && r.resultItem === want) || null;
}

function getEquippedItemNamesSet(player) {
  const out = new Set();
  const eq = player && player.equipment;
  if (eq && typeof eq === "object") {
    Object.values(eq).forEach((v) => {
      if (typeof v === "string" && v.trim()) out.add(v.trim());
    });
  }
  if (player && Array.isArray(player.companions)) {
    player.companions.forEach((c) => {
      if (!c || !c.equipment) return;
      Object.values(c.equipment).forEach((v) => {
        if (typeof v === "string" && v.trim()) out.add(v.trim());
      });
    });
  }
  return out;
}

function getEnhanceDeps() {
  return {
    getItemDef: (name) => resolveItemDef(name),
    getRecipeForBaseName: (baseName) => getCraftRecipeForResultItem(baseName),
    getCraftingProfessionIdForRecipe,
    isEquippableItemDef
  };
}

function removeOneInventoryEntry(inventory, matcher) {
  if (!Array.isArray(inventory)) return false;
  const idx = inventory.findIndex((entry) => matcher(entry));
  if (idx < 0) return false;
  inventory.splice(idx, 1);
  return true;
}

function replaceInventoryEntry(inventory, fromName, toName) {
  if (!Array.isArray(inventory)) return false;
  const idx = inventory.indexOf(fromName);
  if (idx < 0) return false;
  inventory[idx] = toName;
  return true;
}

export function evaluateEnhanceAvailability({
  itemInstanceName,
  runeBaseName,
  professionId,
  crafter,
  inventoryOwner
}) {
  const cfg = loadGameConfig();
  normalizeProfessionProgress(crafter);
  const profId = String(professionId || "").trim();
  const profLevel = ProfessionProgression.getProfessionLevel(crafter, profId);
  return Enhancing.evaluateEnhanceAttempt({
    itemInstanceName,
    runeBaseName,
    professionId: profId,
    crafterProfessionLevel: profLevel,
    inventory: inventoryOwner?.inventory,
    equippedNames: getEquippedItemNamesSet(inventoryOwner),
    cfg,
    deps: getEnhanceDeps()
  });
}

/**
 * Enhance equipment on inventoryOwner; XP goes to crafter. Rune removed from inventoryOwner.
 */
export function executeEnhance({
  itemInstanceName,
  runeBaseName,
  professionId,
  inventoryOwner,
  crafter
}) {
  const cfg = loadGameConfig();
  const profId = String(professionId || "").trim();
  const evalResult = evaluateEnhanceAvailability({
    itemInstanceName,
    runeBaseName,
    professionId: profId,
    crafter,
    inventoryOwner
  });
  if (!evalResult.ok) {
    const err = new Error(evalResult.message || "Cannot enhance this item.");
    err.status = 400;
    throw err;
  }

  if (!Array.isArray(inventoryOwner.inventory)) inventoryOwner.inventory = [];
  const runeRemoved = removeOneInventoryEntry(
    inventoryOwner.inventory,
    (entry) => getItemBaseName(entry) === runeBaseName
  );
  if (!runeRemoved) {
    const err = new Error("Missing enhancing rune.");
    err.status = 400;
    throw err;
  }

  const outcome = Enhancing.rollEnhanceOutcome({ itemInstanceName, cfg, rng: Math.random });
  if (outcome.newItemName !== itemInstanceName) {
    const replaced = replaceInventoryEntry(inventoryOwner.inventory, itemInstanceName, outcome.newItemName);
    if (!replaced) {
      const err = new Error("Equipment not found in inventory.");
      err.status = 400;
      throw err;
    }
  }

  const profLevel = ProfessionProgression.getProfessionLevel(crafter, profId);
  const xpGain = Enhancing.computeEnhanceXp(evalResult.itemLevel, profLevel, CraftXp);
  let levelsGained = 0;
  let totalXp = 0;
  if (xpGain > 0) {
    const res = ProfessionProgression.addProfessionXp(crafter, profId, xpGain);
    totalXp = res.xpGained;
    levelsGained = res.levelsGained;
  }

  return {
    itemInstanceName: outcome.newItemName,
    previousItemName: itemInstanceName,
    success: outcome.success,
    upgraded: outcome.upgraded,
    downgraded: outcome.downgraded,
    fromRarity: outcome.fromRarity,
    toRarity: outcome.toRarity,
    successChance: evalResult.successChance,
    professionId: profId,
    xpGained: totalXp,
    professionLevelsGained: levelsGained,
    professionLevel: ProfessionProgression.getProfessionLevel(crafter, profId)
  };
}

export function applyEnhance(
  player,
  { itemInstanceName, runeBaseName, professionId, crafterTarget = "hero", companionSlotIndex = null }
) {
  const crafter = resolveCrafter(player, { crafterTarget, companionSlotIndex });
  const profId = String(professionId || "").trim();
  if (!Enhancing.isEquipmentCraftingProfessionId(profId)) {
    const err = new Error("Invalid enhancing profession.");
    err.status = 400;
    throw err;
  }
  if (!Array.isArray(crafter.professions) || !crafter.professions.includes(profId)) {
    const err = new Error("Crafter does not have the required profession.");
    err.status = 400;
    throw err;
  }
  return executeEnhance({
    itemInstanceName,
    runeBaseName,
    professionId: profId,
    inventoryOwner: player,
    crafter
  });
}

export { getCraftRecipeForResultItem, getAllCraftingRecipes };
