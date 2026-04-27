/**
 * Lists GAME_CONFIG items with type "resource" that still use shared placeholder
 * art (same rule as game.js isGenericResourceImagePath). Also lists resources
 * with an empty image path (not counted as generic in game.js).
 *
 * Usage: node tools/list_resources_placeholder_images.js
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const cfgPath = path.join(root, "config.js");
let code = fs.readFileSync(cfgPath, "utf8");
code = code.replace(/^const GAME_CONFIG\s*=/m, "var GAME_CONFIG =");
eval(code);

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

function genericReason(imagePath) {
  const p = String(imagePath || "").trim().toLowerCase();
  if (!p) return "empty";
  if (p.includes("/materials/material_placeholder") || p.includes("\\materials\\material_placeholder"))
    return "material_placeholder";
  if (p.endsWith("/resources/energy-cell.svg") || p.endsWith("\\resources\\energy-cell.svg")) return "energy-cell.svg";
  if (p.endsWith("/resources/wolf-pelt.svg") || p.endsWith("\\resources\\wolf-pelt.svg")) return "wolf-pelt.svg";
  return null;
}

const items = GAME_CONFIG.items || {};
const generic = [];
const emptyImage = [];

for (const [name, def] of Object.entries(items)) {
  if (String(def.type || "").toLowerCase() !== "resource") continue;
  const img = def.image;
  if (!String(img || "").trim()) {
    emptyImage.push(name);
    continue;
  }
  if (isGenericResourceImagePath(img)) {
    generic.push({ name, image: img, reason: genericReason(img) });
  }
}

generic.sort((a, b) => a.name.localeCompare(b.name));
emptyImage.sort();

console.log(
  JSON.stringify(
    {
      rule: "Same as game.js isGenericResourceImagePath (placeholder PNG/SVG only; empty image listed separately)",
      resourceCountTotal: Object.values(items).filter((d) => String(d.type || "").toLowerCase() === "resource").length,
      resourcesWithGenericPlaceholderImage: generic.length,
      namesGeneric: generic.map((x) => x.name),
      resourcesWithEmptyImagePath: emptyImage.length,
      namesEmptyImage: emptyImage
    },
    null,
    2
  )
);
