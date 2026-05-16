const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "..", "config.js"), "utf8");
const fn = new Function(`${src}\nreturn typeof GAME_CONFIG !== "undefined" ? GAME_CONFIG : null;`);
const cfg = fn();
if (!cfg || !cfg.items) {
  console.error("GAME_CONFIG.items not found");
  process.exit(1);
}

const rows = [];
for (const [name, def] of Object.entries(cfg.items)) {
  if (!def || typeof def !== "object") continue;
  if (def.type === "consumable" || def.type === "resource") continue;
  const equippable =
    def.type === "weapon" ||
    def.type === "armor" ||
    (typeof def.equipCategory === "string" && def.equipCategory.trim()) ||
    (typeof def.slot === "string" && def.slot.trim() && def.slot !== "none");
  if (!equippable) continue;

  rows.push({
    name,
    level: typeof def.itemLevel === "number" ? def.itemLevel : null,
    slot: def.slot || "",
    category: def.equipCategory || def.weaponCategory || "",
    rarity: def.rarity || "",
    set: def.set || ""
  });
}

rows.sort((a, b) => {
  const la = a.level == null ? 9999 : a.level;
  const lb = b.level == null ? 9999 : b.level;
  if (la !== lb) return la - lb;
  return a.name.localeCompare(b.name);
});

const byLevel = new Map();
for (const row of rows) {
  const key = row.level == null ? "?" : String(row.level);
  if (!byLevel.has(key)) byLevel.set(key, []);
  byLevel.get(key).push(row);
}

const levels = [...byLevel.keys()].sort((a, b) => {
  if (a === "?") return 1;
  if (b === "?") return -1;
  return Number(a) - Number(b);
});

console.log(`Total equippable items: ${rows.length}\n`);
for (const lv of levels) {
  console.log(`### Level ${lv}`);
  const list = byLevel.get(lv).sort((a, b) => a.name.localeCompare(b.name));
  for (const r of list) {
    const parts = [r.slot, r.category, r.rarity].filter(Boolean).join(", ");
    const setPart = r.set ? `, set: ${r.set}` : "";
    console.log(`- ${r.name} (${parts}${setPart})`);
  }
  console.log("");
}
