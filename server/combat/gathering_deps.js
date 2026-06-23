/**
 * Shared gathering dependencies for server combat loot.
 */

import { createRequire } from "node:module";
import { loadGameConfig } from "../load_game_config.js";

const require = createRequire(import.meta.url);
const ProfessionProgression = require("../../shared/profession_progression.js");
const GatherXp = require("../../shared/gather_xp.js");
const GatheringTables = require("../../shared/gathering_tables.js");
const GatheringLoot = require("../../shared/gathering_loot.js");

export function getGatheringDeps() {
  return {
    config: loadGameConfig(),
    PP: ProfessionProgression,
    GatherXp,
    tables: GatheringTables.PROFESSION_GATHERING_TABLES,
    GatheringLoot
  };
}

export { ProfessionProgression, GatherXp, GatheringLoot };
