/**
 * Server-authoritative crafting with profession levels, batch qty, and craft XP.
 */

import { loadGameConfig } from "../load_game_config.js";
import {
  getItemBaseName,
  inventoryBaseCounts,
  isEquippableItemDef,
  makeRarityItemInstanceName,
  resolveItemDef,
  rollLootGearRarityTier
} from "./item_helpers.js";
import { computeCraftXp, getRecipeItemLevel, normalizeProfessionProgress, ProfessionProgression } from "./craft_helpers.js";

function getCraftingConfig() {
  const cfg = loadGameConfig();
  return cfg?.crafting && typeof cfg.crafting === "object" ? cfg.crafting : {};
}

function getAllCraftingRecipes() {
  const cfg = getCraftingConfig();
  const tiers = Array.isArray(cfg.recipeTiers) ? cfg.recipeTiers : [];
  const out = [];
  tiers.forEach((tier) => {
    const tierLabel = tier && typeof tier.label === "string" ? tier.label.trim() : "";
    const recipes = tier && Array.isArray(tier.recipes) ? tier.recipes : [];
    recipes.forEach((r) => {
      if (!r || typeof r.resultItem !== "string") return;
      out.push({ ...r, tierLabel });
    });
  });
  return out;
}

export function getCraftRecipeById(recipeId) {
  const id = String(recipeId || "").trim();
  if (!id) return null;
  return getAllCraftingRecipes().find((r) => r && typeof r.id === "string" && r.id === id) || null;
}

function getItemEquipCategory(def) {
  if (!def || typeof def !== "object") return "";
  const rawCategory =
    (typeof def.equipCategory === "string" && def.equipCategory) ||
    (typeof def.weaponCategory === "string" && def.weaponCategory) ||
    "";
  return rawCategory.trim().toLowerCase();
}

export function getCraftingProfessionIdForRecipe(recipe) {
  const def = resolveItemDef(recipe?.resultItem);
  if (!def) return "armor_smith";
  if (def.type === "consumable" || String(def.category || "").trim().toLowerCase() === "key") return "provisioner";
  if (def.type === "weapon") return "weapon_smith";
  const cat = getItemEquipCategory(def);
  if (cat === "ring" || cat === "amulet" || cat === "bracelet" || cat === "wristband") return "jeweller";
  return "armor_smith";
}

function getProfessionDefs() {
  const cfg = loadGameConfig();
  const prof = cfg?.professions;
  return Array.isArray(prof?.available) ? prof.available.filter((d) => d && typeof d.id === "string") : [];
}

function getActorCraftingProfessionIds(actor) {
  const defs = new Map(getProfessionDefs().map((d) => [d.id, d]));
  const selected = Array.isArray(actor?.professions) ? actor.professions.slice() : [];
  return selected.filter((id) => defs.get(id)?.kind === "crafting");
}

export function evaluateCraftRecipeAvailability(recipe, invCounts, actor, quantity = 1) {
  const qty = Math.max(1, Math.min(999, Math.floor(Number(quantity) || 1)));
  const professionId = getCraftingProfessionIdForRecipe(recipe);
  const requiredLevel = getRecipeItemLevel(recipe);
  normalizeProfessionProgress(actor);
  const profLevel = ProfessionProgression.getProfessionLevel(actor, professionId);
  const levelOk = profLevel >= requiredLevel;
  const ingredients = recipe && Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const missing = [];
  ingredients.forEach((ing) => {
    const itemName = ing && typeof ing.item === "string" ? ing.item.trim() : "";
    if (!itemName) return;
    const perCraft =
      ing && typeof ing.qty === "number" && Number.isFinite(ing.qty) ? Math.max(1, Math.floor(ing.qty)) : 1;
    const need = perCraft * qty;
    const have = invCounts.get(itemName) || 0;
    if (have < need) missing.push({ item: itemName, need, have });
  });
  return {
    levelOk,
    requiredLevel,
    professionId,
    professionLevel: profLevel,
    missing,
    craftable: levelOk && missing.length === 0,
    quantity: qty
  };
}

function removeIngredientsForRecipe(player, recipe, quantity = 1) {
  if (!Array.isArray(player.inventory)) player.inventory = [];
  const qty = Math.max(1, Math.min(999, Math.floor(Number(quantity) || 1)));
  const ingredients = recipe && Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  for (const ing of ingredients) {
    const itemName = ing && typeof ing.item === "string" ? ing.item.trim() : "";
    if (!itemName) continue;
    const perCraft =
      ing && typeof ing.qty === "number" && Number.isFinite(ing.qty) ? Math.max(1, Math.floor(ing.qty)) : 1;
    let left = perCraft * qty;
    for (let i = player.inventory.length - 1; i >= 0 && left > 0; i--) {
      if (getItemBaseName(player.inventory[i]) !== itemName) continue;
      player.inventory.splice(i, 1);
      left--;
    }
    if (left > 0) {
      const err = new Error(`Missing ingredient: ${itemName}.`);
      err.status = 400;
      throw err;
    }
  }
}

function craftOneResultItem(recipe) {
  const resultBaseName = recipe.resultItem;
  const resultDef = resolveItemDef(resultBaseName);
  if (resultDef && isEquippableItemDef(resultDef)) {
    return makeRarityItemInstanceName(resultBaseName, rollLootGearRarityTier());
  }
  return resultBaseName;
}

export function resolveCrafter(player, { crafterTarget = "hero", companionSlotIndex = null }) {
  if (crafterTarget === "companion") {
    const idx = Number(companionSlotIndex);
    if (!Number.isFinite(idx) || idx < 0 || !Array.isArray(player.companions) || !player.companions[idx]) {
      const err = new Error("Invalid companion slot.");
      err.status = 400;
      throw err;
    }
    const comp = player.companions[idx];
    if (!comp.enabled) {
      const err = new Error("That companion is not enabled.");
      err.status = 400;
      throw err;
    }
    normalizeProfessionProgress(comp);
    return comp;
  }
  normalizeProfessionProgress(player);
  return player;
}

/**
 * Craft from inventoryOwner (ingredients removed) to resultOwner (items added). XP goes to crafter.
 */
export function executeCraftBatch({
  recipe,
  quantity = 1,
  inventoryOwner,
  resultOwner,
  crafter
}) {
  const qty = Math.max(1, Math.min(999, Math.floor(Number(quantity) || 1)));
  const professionId = getCraftingProfessionIdForRecipe(recipe);
  if (!getActorCraftingProfessionIds(crafter).includes(professionId)) {
    const err = new Error("Crafter does not have the required profession.");
    err.status = 400;
    throw err;
  }
  const invCounts = inventoryBaseCounts(inventoryOwner.inventory);
  const avail = evaluateCraftRecipeAvailability(recipe, invCounts, crafter, qty);
  if (!avail.craftable) {
    const err = new Error(
      !avail.levelOk
        ? `Requires ${professionId.replace(/_/g, " ")} level ${avail.requiredLevel} (you have ${avail.professionLevel}).`
        : "Missing crafting ingredients."
    );
    err.status = 400;
    throw err;
  }
  removeIngredientsForRecipe(inventoryOwner, recipe, qty);
  if (!Array.isArray(resultOwner.inventory)) resultOwner.inventory = [];
  const craftedItems = [];
  let totalXp = 0;
  let levelsGained = 0;
  for (let i = 0; i < qty; i++) {
    const itemName = craftOneResultItem(recipe);
    resultOwner.inventory.push(itemName);
    craftedItems.push(itemName);
    const profLevel = ProfessionProgression.getProfessionLevel(crafter, professionId);
    const xpGain = computeCraftXp(recipe, profLevel);
    if (xpGain > 0) {
      const res = ProfessionProgression.addProfessionXp(crafter, professionId, xpGain);
      totalXp += res.xpGained;
      levelsGained += res.levelsGained;
    }
  }
  return {
    recipeId: recipe.id,
    quantity: qty,
    items: craftedItems,
    itemName: craftedItems[craftedItems.length - 1] || recipe.resultItem,
    professionId,
    xpGained: totalXp,
    professionLevelsGained: levelsGained,
    professionLevel: ProfessionProgression.getProfessionLevel(crafter, professionId)
  };
}

export function applyCraftRecipe(
  player,
  { recipeId, crafterTarget = "hero", companionSlotIndex = null, quantity = 1 }
) {
  const recipe = getCraftRecipeById(recipeId);
  if (!recipe) {
    const err = new Error("Unknown recipe.");
    err.status = 400;
    throw err;
  }
  const crafter = resolveCrafter(player, { crafterTarget, companionSlotIndex });
  return executeCraftBatch({
    recipe,
    quantity,
    inventoryOwner: player,
    resultOwner: player,
    crafter
  });
}
