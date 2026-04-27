/**
 * Resources (type "resource") still using shared placeholder art, and which
 * enemies can drop them — matching game.js victory loot:
 * - If monsterDropTables[enemy.name] exists, only `materials` are rolled (not drops.items).
 * - Otherwise `drops.items` are rolled.
 *
 * Usage: node tools/list_placeholder_resources_by_monster.js
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const cfgPath = path.join(root, "config.js");
const dropPath = path.join(root, "monster_drop_tables.js");

let cfg = fs.readFileSync(cfgPath, "utf8").replace(/^const GAME_CONFIG\s*=/m, "global.GAME_CONFIG =");
eval(cfg);

eval(fs.readFileSync(dropPath, "utf8"));

function isGenericResourceImagePath(imagePath) {
  const p = String(imagePath || "").trim().toLowerCase();
  if (!p) return false;
  return (
    p.includes("/materials/material_placeholder") ||
    p.includes("\\materials\\material_placeholder") ||
    p.endsWith("/resources/energy-cell.svg") ||
    p.endsWith("\\resources\\energy-cell.svg") ||
    p.endsWith("/resources/wolf-pelt.svg") ||
    p.endsWith("\\resources\\wolf-pelt.svg")
  );
}

const items = global.GAME_CONFIG.items || {};
const tables = global.GAME_CONFIG.monsterDropTables || {};
const enemies = global.GAME_CONFIG.enemies || [];

const placeholderResourceNames = new Set();
for (const [name, def] of Object.entries(items)) {
  if (String(def.type || "").toLowerCase() !== "resource") continue;
  if (isGenericResourceImagePath(def.image)) placeholderResourceNames.add(name);
}

/** @type {Map<string, Set<string>>} */
const resourceToMonsters = new Map();
for (const name of placeholderResourceNames) resourceToMonsters.set(name, new Set());

function addDrop(monsterName, itemName) {
  const n = typeof itemName === "string" ? itemName.trim() : "";
  if (!n || !resourceToMonsters.has(n)) return;
  resourceToMonsters.get(n).add(monsterName);
}

for (const enemy of enemies) {
  if (!enemy || typeof enemy.name !== "string") continue;
  const monsterName = enemy.name;
  const table = tables[monsterName];
  if (table && typeof table === "object") {
    const mats = Array.isArray(table.materials) ? table.materials : [];
    for (const row of mats) {
      if (row && typeof row.name === "string") addDrop(monsterName, row.name);
    }
  } else {
    const list = enemy.drops && Array.isArray(enemy.drops.items) ? enemy.drops.items : [];
    for (const row of list) {
      if (row && typeof row.name === "string") addDrop(monsterName, row.name);
    }
  }
}

const byResource = [...placeholderResourceNames]
  .sort()
  .map((resource) => ({
    resource,
    monsters: [...resourceToMonsters.get(resource)].sort()
  }));

const onlyNoMonster = byResource.filter((x) => x.monsters.length === 0).map((x) => x.resource);

console.log(
  JSON.stringify(
    {
      rule: "type===resource AND isGenericResourceImagePath; drops from monsterDropTables.materials OR else enemies[].drops.items",
      placeholderResourceCount: placeholderResourceNames.size,
      resourcesWithNoListedMonsterDrop: onlyNoMonster,
      byResource
    },
    null,
    2
  )
);
