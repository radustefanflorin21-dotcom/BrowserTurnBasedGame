const fs = require("fs");
const p = require("path").join(__dirname, "..", "game.js");
let s = fs.readFileSync(p, "utf8");
const start = s.indexOf('const DEFAULT_CLASS_ID = "vanguard";');
const end = s.indexOf("function getSkillDef(skillName)");
if (start < 0 || end < 0) throw new Error("markers not found " + start + " " + end);
const insert = `const DEFAULT_CLASS_ID = "adventurer";
const CLASS_TIER_MIN_LEVEL = { early: 1, mid: 15, late: 30 };

const ADVENTURER_UI_CLASS = {
  id: "adventurer",
  label: "Hero",
  role: "",
  passive: "",
  primaryStats: ["STR", "DEX", "VIT", "INT"],
  starterSkills: [],
  skills: []
};

let CLASS_SKILL_MAP = {};

function rebuildClassSkillMapFromCatalog() {
  const m = {};
  if (typeof SKILL_CATALOG === "object" && SKILL_CATALOG) {
    Object.keys(SKILL_CATALOG).forEach((name) => {
      const c = SKILL_CATALOG[name];
      const stam = typeof c.stamina === "number" ? c.stamina : 2;
      const passiveOnly = !!c.passiveOnly;
      const lastLv = c.levels && c.levels[4] ? c.levels[4] : null;
      const aoeAll = c.pattern === "event_horizon" || (c.pattern === "arcane_collapse" && lastLv && lastLv.aoeAdj >= 99);
      const dk = passiveOnly ? undefined : c.damageKind === "magic" ? "magic" : "physical";
      m[name] = {
        name,
        classId: "adventurer",
        tier: "early",
        staminaCost: stam,
        combatMultiplier: passiveOnly ? undefined : 1,
        damageKind: dk,
        combatAoe: aoeAll ? "all_enemies" : undefined,
        combatTags: [],
        passiveOnly,
        description: ""
      };
    });
  }
  CLASS_SKILL_MAP = m;
}

function injectClassSkillsIntoConfig() {
  rebuildClassSkillMapFromCatalog();
  const skillArr = Array.isArray(GAME_CONFIG.skills) ? GAME_CONFIG.skills : [];
  const existingByName = new Map();
  skillArr.forEach((srow, i) => {
    const n = srow && typeof srow.name === "string" ? srow.name : "";
    if (n) existingByName.set(n, i);
  });
  Object.values(CLASS_SKILL_MAP).forEach((sk) => {
    const next = {
      name: sk.name,
      bonus: 0,
      combatMultiplier: typeof sk.combatMultiplier === "number" ? sk.combatMultiplier : undefined,
      staminaCost: sk.staminaCost,
      damageKind: sk.damageKind || "physical",
      combatAoe: sk.combatAoe,
      combatTags: Array.isArray(sk.combatTags) ? sk.combatTags : [],
      image: getSkillImage(sk.name),
      description: sk.description
    };
    if (existingByName.has(sk.name)) {
      const idx = existingByName.get(sk.name);
      const prev = skillArr[idx] && typeof skillArr[idx] === "object" ? skillArr[idx] : {};
      skillArr[idx] = { ...prev, ...next };
      return;
    }
    skillArr.push(next);
  });
  GAME_CONFIG.skills = skillArr;
}

injectClassSkillsIntoConfig();

function getClassDef(classId) {
  return ADVENTURER_UI_CLASS;
}

function getClassSkillDefByName(skillName) {
  return CLASS_SKILL_MAP[skillName] || null;
}

`;
s = s.slice(0, start) + insert + s.slice(end);
fs.writeFileSync(p, s);
console.log("spliced", start, end);
