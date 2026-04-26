/**
 * Reports how many unique monster-drop material/resource names still use
 * shared placeholder art (same rule as game.js isGenericResourceImagePath).
 *
 * Usage: node tools/monster_loot_image_stats.js
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const cfgPath = path.join(root, "config.js");
const tblPath = path.join(root, "monster_drop_tables.js");

const code = fs.readFileSync(cfgPath, "utf8").replace(/^const GAME_CONFIG\s*=/m, "var GAME_CONFIG =");
eval(code);

const tblSrc = fs.readFileSync(tblPath, "utf8");
const names = new Set();
const re = /\{\s*name:\s*"([^"]+)"/g;
let m;
while ((m = re.exec(tblSrc))) names.add(m[1]);

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

const items = GAME_CONFIG.items || {};
let total = 0;
let generic = 0;
let missingDef = 0;
let notMatOrRes = 0;
const missingList = [];
const genericList = [];
const weirdList = [];

for (const n of [...names].sort()) {
  const def = items[n];
  if (!def) {
    missingDef += 1;
    missingList.push(n);
    continue;
  }
  const t = String(def.type || "").toLowerCase();
  if (t !== "resource" && t !== "material") {
    notMatOrRes += 1;
    weirdList.push({ name: n, type: t });
    continue;
  }
  total += 1;
  if (isGenericResourceImagePath(def.image)) {
    generic += 1;
    genericList.push(n);
  }
}

function pct(a, b) {
  if (!b) return "n/a";
  return `${((100 * a) / b).toFixed(1)}%`;
}

const resOnlyNames = [...names].filter((n) => {
  const d = items[n];
  return d && String(d.type || "").toLowerCase() === "resource";
});
let rTot = 0;
let rGen = 0;
for (const n of resOnlyNames) {
  const d = items[n];
  rTot += 1;
  if (isGenericResourceImagePath(d.image)) rGen += 1;
}

console.log(
  JSON.stringify(
    {
      uniqueLootMaterialNamesParsed: names.size,
      definitionsMissingInGAME_CONFIG_items: missingDef,
      lootNamesWhoseDefIsNotMaterialOrResource: notMatOrRes,
      materialOrResourceLootNames: total,
      materialOrResource_withGenericImage: generic,
      pct_materialOrResource_generic: pct(generic, total),
      type_resource_only: { total: rTot, generic: rGen, pct_generic: pct(rGen, rTot) },
      rule:
        "Generic = material_placeholder OR energy-cell.svg OR wolf-pelt.svg (matches game.js isGenericResourceImagePath; empty image is not generic)",
      sampleGeneric: genericList.slice(0, 60),
      sampleMissingDef: missingList.slice(0, 40),
      sampleWeirdType: weirdList.slice(0, 20)
    },
    null,
    2
  )
);
