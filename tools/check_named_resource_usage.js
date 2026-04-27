/**
 * Checks whether specific item names are referenced outside their own
 * `GAME_CONFIG.items` definition key in config.js.
 *
 * Usage: node tools/check_named_resource_usage.js
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const targets = [
  "Abyss Fragment",
  "Ash Core",
  "Basilisk Eye Fragment",
  "Bone Fragment",
  "Bound Essence",
  "Core Fragment",
  "Devourer Jaw",
  "Dust Core",
  "Earth Core",
  "Earth Rune",
  "Flame Fragment",
  "Fluid Core",
  "Forest Essence",
  "Frost Essence",
  "Heat Crystal",
  "Lava Fragment",
  "Magma Core",
  "Metal Fragment",
  "Minor Essence",
  "Molten Core",
  "Petrify Scale",
  "Raptor Talon",
  "Rock Core",
  "Rust Core",
  "Salt Core",
  "Spirit Dust",
  "Stone Essence",
  "Tide Core",
  "Tusk Fragment",
  "Water Rune"
];

const includeExt = new Set([".js", ".json", ".html", ".md", ".css", ".txt"]);
const skipDirs = new Set([".git", "node_modules", ".cursor", "tools"]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name)) continue;
      walk(full, out);
      continue;
    }
    if (includeExt.has(path.extname(entry.name).toLowerCase())) out.push(full);
  }
  return out;
}

function isConfigItemDefLine(fileRel, lineText) {
  if (fileRel !== "config.js") return false;
  return /^\s*"[^"]+"\s*:\s*\{/.test(lineText);
}

const files = walk(root);
const results = [];

for (const name of targets) {
  const refs = [];
  for (const abs of files) {
    const rel = path.relative(root, abs).replace(/\\/g, "/");
    const txt = fs.readFileSync(abs, "utf8");
    if (!txt.includes(name)) continue;
    const lines = txt.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.includes(name)) continue;
      refs.push({
        file: rel,
        line: i + 1,
        text: line.trim(),
        isDefLine: isConfigItemDefLine(rel, line)
      });
    }
  }
  const usedOutsideOwnDef = refs.some((r) => !r.isDefLine);
  results.push({
    name,
    usedOutsideOwnDef,
    refCountTotal: refs.length,
    refsOutsideDef: refs.filter((r) => !r.isDefLine).slice(0, 10)
  });
}

console.log(JSON.stringify(results, null, 2));
