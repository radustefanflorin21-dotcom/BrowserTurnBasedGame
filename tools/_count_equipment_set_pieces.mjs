/**
 * Prints set-name → piece counts from config.js `set: "..."` on item definitions.
 * Usage: node tools/_count_equipment_set_pieces.mjs
 */
import fs from "fs";
const t = fs.readFileSync(new URL("../config.js", import.meta.url), "utf8");
const re = /set:\s*"([^"]*)"/g;
const m = new Map();
let x;
while ((x = re.exec(t))) {
  const s = x[1];
  if (!s) continue;
  m.set(s, (m.get(s) || 0) + 1);
}
for (const [k, v] of [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  const key = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(k) ? k : JSON.stringify(k);
  console.log(`    ${key}: ${v},`);
}
