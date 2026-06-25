import fs from "node:fs";

const game = fs.readFileSync("game.js", "utf8");
const server = fs.readFileSync("server/combat/enemy_scripts.js", "utf8");
const serverIds = new Set([...server.matchAll(/^\s+(\w+)\(foe, st, ctx\)/gm)].map((m) => m[1]));
const ids = [...new Set([...game.matchAll(/if \(scriptId === "(\w+)"/g)].map((m) => m[1]))]
  .filter((id) => !serverIds.has(id))
  .sort();

function extractBlock(id) {
  const start = game.indexOf(`if (scriptId === "${id}")`);
  if (start < 0) return "";
  let depth = 0;
  for (let i = start; i < game.length; i++) {
    if (game[i] === "{") depth++;
    else if (game[i] === "}") {
      depth--;
      if (depth === 0) return game.slice(start, i + 1);
    }
  }
  return "";
}

for (const id of ids) {
  const block = extractBlock(id);
  const skills = [...block.matchAll(/ready\("([^"]+)"\)/g)].map((m) => m[1]);
  const rules = [...block.matchAll(/pickPartyTargetForMonsterTargetRule\(st,\s*"([^"]+)"/g)].map((m) => m[1]);
  const basic = block.match(/dealRawDamageToPlayer\(st,\s*Math\.max\(1,\s*Math\.floor\(atk\s*\*\s*([\d.]+)/);
  console.log(id, "rule:", rules[0] || "bruiser", "skills:", [...new Set(skills)].join(","), "basic:", basic?.[1] || "?");
}
