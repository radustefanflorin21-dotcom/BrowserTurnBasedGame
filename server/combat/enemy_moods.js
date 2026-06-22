import { loadGameConfig } from "../load_game_config.js";

export const ENEMY_MOOD_SPAWN_CHANCE = 0.1;

function randomFrom(arr, rng) {
  if (!arr || !arr.length) return null;
  const roll = typeof rng?.next === "function" ? rng.next() : Math.random();
  return arr[Math.floor(roll * arr.length)];
}

/** Roll whether an enemy spawns with a mood (same 10% chance as overworld). */
export function pickMoodIdFromEnemyDef(def, rng) {
  const roll = typeof rng?.next === "function" ? rng.next() : Math.random();
  if (roll >= ENEMY_MOOD_SPAWN_CHANCE) return null;
  const cfg = loadGameConfig();
  const moods = cfg?.enemyMoods;
  const ids = def && def.possibleMoods;
  if (Array.isArray(ids) && ids.length) {
    const id = randomFrom(ids, rng);
    if (typeof id === "string" && id.trim()) {
      const found = Array.isArray(moods) ? moods.find((m) => m.id === id.trim()) : null;
      if (found) return found.id;
    }
  }
  const picked = randomFrom(Array.isArray(moods) ? moods : [], rng);
  return picked && typeof picked.id === "string" && picked.id.trim() ? picked.id.trim() : null;
}
