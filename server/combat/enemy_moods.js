import { createRequire } from "node:module";
import { loadGameConfig } from "../load_game_config.js";

const require = createRequire(import.meta.url);
const { pickRandomEnemyMood, ENEMY_MOOD_SPAWN_CHANCE } = require("../../shared/enemy_moods.js");

export { ENEMY_MOOD_SPAWN_CHANCE };

/** Roll whether an enemy spawns with a mood (10% chance; full mood pool). */
export function pickMoodIdFromEnemyDef(_def, rng) {
  const cfg = loadGameConfig();
  const mood = pickRandomEnemyMood(cfg?.enemyMoods, rng);
  return mood.id || null;
}
