import fs from "node:fs";

const server = fs.readFileSync("server/combat/enemy_scripts.js", "utf8");
const biome = fs.readFileSync("server/combat/enemy_scripts_biome.js", "utf8");
const game = fs.readFileSync("game.js", "utf8");
const serverIds = new Set([
  ...server.matchAll(/^\s+(\w+)\(foe, st, ctx\)/gm),
  ...biome.matchAll(/^\s+(\w+)\(foe, st, ctx\)/gm)
].map((m) => m[1]));
const gameIds = [...new Set([...game.matchAll(/if \(scriptId === "(\w+)"/g)].map((m) => m[1]))];
const onlyGame = gameIds.filter((x) => !serverIds.has(x)).sort();
const onlyServer = [...serverIds].filter((x) => !gameIds.includes(x)).sort();
console.log("server handlers:", serverIds.size, "game handlers:", gameIds.length);
console.log("onlyGame:", onlyGame.length, onlyGame.join(", ") || "(none)");
console.log("onlyServer:", onlyServer.join(", ") || "(none)");
