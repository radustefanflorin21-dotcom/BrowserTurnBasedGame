/**
 * Shared crafting helpers for server actions (profession XP, material tiers).
 */

import { createRequire } from "node:module";
import { loadGameConfig } from "../load_game_config.js";
import { resolveItemDef } from "./item_helpers.js";

const require = createRequire(import.meta.url);
const ProfessionProgression = require("../../shared/profession_progression.js");
const CraftXp = require("../../shared/craft_xp.js");
const CraftMaterialTier = require("../../shared/craft_material_tier.js");

let materialIndex = null;

export function getCraftSharedDeps() {
  loadGameConfig();
  if (!materialIndex) {
    materialIndex = CraftMaterialTier.buildMaterialDifficultyIndex(global.GAME_CONFIG);
  }
  return {
    ProfessionProgression,
    CraftXp,
    CraftMaterialTier,
    materialIndex,
    getItemDef: (name) => resolveItemDef(name)
  };
}

export function normalizeProfessionProgress(actor) {
  if (!actor || typeof actor !== "object") return;
  ProfessionProgression.ensureProfessionProgress(actor);
}

export function getRecipeItemLevel(recipe) {
  const def = resolveItemDef(recipe?.resultItem);
  return ProfessionProgression.getRecipeItemLevel(recipe, def);
}

export function computeCraftXp(recipe, professionLevel) {
  return CraftXp.computeCraftXpForRecipe(recipe, professionLevel, getCraftSharedDeps());
}

export { ProfessionProgression, CraftXp, CraftMaterialTier };
