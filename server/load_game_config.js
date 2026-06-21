import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let loaded = false;

/** Load GAME_CONFIG (+ monster drop tables) into global for server combat. */
export function loadGameConfig() {
  if (loaded && global.GAME_CONFIG) return global.GAME_CONFIG;
  const context = vm.createContext({
    GAME_CONFIG: undefined,
    SKILL_CATALOG: undefined,
    console
  });
  context.window = context;
  context.globalThis = context;
  for (const file of [
    "config.js",
    "monster_drop_tables.js",
    "pets/pet_items.js",
    "pets/pet_progression.js",
    "pets/pets_catalog.js",
    "pets/egg_drops.js",
    "skills_catalog.js"
  ]) {
    const code = fs.readFileSync(path.join(rootDir, file), "utf8");
    vm.runInContext(code, context, { filename: file });
  }
  const cfg = vm.runInContext("GAME_CONFIG", context);
  if (!cfg) {
    throw new Error("Failed to load GAME_CONFIG from config.js");
  }
  global.GAME_CONFIG = cfg;
  global.SKILL_CATALOG = vm.runInContext(
    "typeof SKILL_CATALOG !== 'undefined' ? SKILL_CATALOG : null",
    context
  );
  global.PET_EGG_DROPS = vm.runInContext(
    "typeof PET_EGG_DROPS !== 'undefined' ? PET_EGG_DROPS : null",
    context
  );
  global.PETS_CATALOG = vm.runInContext(
    "typeof PETS_CATALOG !== 'undefined' ? PETS_CATALOG : null",
    context
  );
  loaded = true;
  return cfg;
}

export function getEnemyDefByName(name) {
  const cfg = loadGameConfig();
  if (!cfg || !Array.isArray(cfg.enemies)) return null;
  return cfg.enemies.find((e) => e && e.name === name) || null;
}

export function getItemDef(name) {
  const cfg = loadGameConfig();
  if (!cfg || !cfg.items || typeof cfg.items !== "object") return null;
  return cfg.items[name] || null;
}
