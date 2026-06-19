/**
 * Server-authoritative crafting (Phase B).
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

function getCraftRecipeById(recipeId) {
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

function getCraftingProfessionIdForRecipe(recipe) {
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

function getActorSelectedProfessions(actor) {
  return Array.isArray(actor?.professions) ? actor.professions.slice() : [];
}

function getActorCraftingProfessionIds(actor) {
  const defs = new Map(getProfessionDefs().map((d) => [d.id, d]));
  return getActorSelectedProfessions(actor).filter((id) => defs.get(id)?.kind === "crafting");
}

function evaluateCraftRecipeAvailability(recipe, invCounts, actor) {
  const requiredLevel =
    recipe && typeof recipe.resultLevel === "number" && Number.isFinite(recipe.resultLevel)
      ? Math.max(1, Math.floor(recipe.resultLevel))
      : 1;
  const crafterLevel =
    typeof actor?.level === "number" && Number.isFinite(actor.level) ? Math.max(1, Math.floor(actor.level)) : 1;
  const levelOk = crafterLevel >= requiredLevel;
  const ingredients = recipe && Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const missing = [];
  ingredients.forEach((ing) => {
    const itemName = ing && typeof ing.item === "string" ? ing.item.trim() : "";
    if (!itemName) return;
    const need = ing && typeof ing.qty === "number" && Number.isFinite(ing.qty) ? Math.max(1, Math.floor(ing.qty)) : 1;
    const have = invCounts.get(itemName) || 0;
    if (have < need) missing.push({ item: itemName, need, have });
  });
  return { levelOk, requiredLevel, missing, craftable: levelOk && missing.length === 0 };
}

function removeIngredientsForRecipe(player, recipe) {
  if (!Array.isArray(player.inventory)) player.inventory = [];
  const ingredients = recipe && Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  for (const ing of ingredients) {
    const itemName = ing && typeof ing.item === "string" ? ing.item.trim() : "";
    if (!itemName) continue;
    const need = ing && typeof ing.qty === "number" && Number.isFinite(ing.qty) ? Math.max(1, Math.floor(ing.qty)) : 1;
    let left = need;
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
    return comp;
  }
  return player;
}

export function applyCraftRecipe(player, { recipeId, crafterTarget = "hero", companionSlotIndex = null }) {
  const recipe = getCraftRecipeById(recipeId);
  if (!recipe) {
    const err = new Error("Unknown recipe.");
    err.status = 400;
    throw err;
  }
  const crafter = resolveCrafter(player, { crafterTarget, companionSlotIndex });
  const requiredProfId = getCraftingProfessionIdForRecipe(recipe);
  if (!getActorCraftingProfessionIds(crafter).includes(requiredProfId)) {
    const err = new Error("Crafter does not have the required profession.");
    err.status = 400;
    throw err;
  }
  const invCounts = inventoryBaseCounts(player.inventory);
  const avail = evaluateCraftRecipeAvailability(recipe, invCounts, crafter);
  if (!avail.craftable) {
    const err = new Error(
      !avail.levelOk ? `Requires crafter level ${avail.requiredLevel}.` : "Missing crafting ingredients."
    );
    err.status = 400;
    throw err;
  }
  removeIngredientsForRecipe(player, recipe);
  const resultBaseName = recipe.resultItem;
  const resultDef = resolveItemDef(resultBaseName);
  let craftedName = resultBaseName;
  if (resultDef && isEquippableItemDef(resultDef)) {
    craftedName = makeRarityItemInstanceName(resultBaseName, rollLootGearRarityTier());
  }
  if (!Array.isArray(player.inventory)) player.inventory = [];
  player.inventory.push(craftedName);
  return { recipeId: recipe.id, itemName: craftedName };
}
