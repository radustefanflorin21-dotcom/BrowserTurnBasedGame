const fs = require("fs");
const path = require("path");

const gamePath = path.join(__dirname, "..", "game.js");
const src = fs.readFileSync(gamePath, "utf8");

const m = src.match(/const DEFAULT_PORTRAIT_LAYOUT = (\{[\s\S]*?\n\});/);
const h = src.match(/const HERO_PORTRAITS = (\{[\s\S]*?\n\});/);
const o = src.match(/const HERO_WEAPON_OCCLUSION_BY_BASE_IMAGE = (\{[\s\S]*?\n\});/);
const baseFn = src.match(/function getDefaultPortraitBaseLayout\(\) \{\s*return (\{[\s\S]*?\n  \});/);
const hudFn = src.match(/function getDefaultBottomHudPortraitLayout\(\) \{\s*return (\{[\s\S]*?\n  \});/);

if (!m || !h || !o || !baseFn || !hudFn) {
  console.error("Failed to extract portrait constants from game.js");
  process.exit(1);
}

// eslint-disable-next-line no-eval
const equipment = eval(`(${m[1]})`);
// eslint-disable-next-line no-eval
const heroPortraits = eval(`(${h[1]})`);
// eslint-disable-next-line no-eval
const weaponOcclusion = eval(`(${o[1]})`);
// eslint-disable-next-line no-eval
const baseLayout = eval(`(${baseFn[1]})`);
// eslint-disable-next-line no-eval
const bottomHudLayout = eval(`(${hudFn[1]})`);

const femaleHero = {
  idle: "Assets/Character/female_character.png",
  walk: "Assets/Character/female_character.png",
  attack: "Assets/Character/female_character.png"
};

const femaleOcclusion = {};
const maleOcc = weaponOcclusion["Assets/Character/male_character.png"];
if (maleOcc) {
  femaleOcclusion["Assets/Character/female_character.png"] = JSON.parse(JSON.stringify(maleOcc));
}

const presets = {
  male: {
    label: "Male",
    heroPortraits,
    baseLayout,
    bottomHudLayout,
    weaponOcclusion,
    equipment
  },
  female: {
    label: "Female",
    heroPortraits: femaleHero,
    baseLayout: JSON.parse(JSON.stringify(baseLayout)),
    bottomHudLayout: JSON.parse(JSON.stringify(bottomHudLayout)),
    weaponOcclusion: femaleOcclusion,
    equipment: JSON.parse(JSON.stringify(equipment))
  }
};

const outPath = path.join(__dirname, "..", "portrait_character_presets.js");
const body =
  "/** Portrait equipment positions, base transforms, and hero art per character gender.\n" +
  " * Edit female layouts in Edit Mode (switch to Female), reposition gear, then Export equip layout.\n" +
  " * Paste exported JSON into portraitCharacterPresets.female in this file or config.\n" +
  " */\n" +
  "(function () {\n" +
  "  const presets = " +
  JSON.stringify(presets, null, 2) +
  ";\n" +
  "  if (typeof GAME_CONFIG !== \"undefined\" && GAME_CONFIG) {\n" +
  "    GAME_CONFIG.portraitCharacterPresets = presets;\n" +
  "  }\n" +
  "})();\n";

fs.writeFileSync(outPath, body);
console.log("Wrote", outPath, `(${(body.length / 1024).toFixed(1)} KB)`);
