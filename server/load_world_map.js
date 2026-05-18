import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
let loaded = false;

/** Load WORLD_MAP_DATA from world_map_data.js (same grid as the browser client). */
export function loadWorldMapData() {
  if (loaded && global.WORLD_MAP_DATA) return global.WORLD_MAP_DATA;
  const context = vm.createContext({ WORLD_MAP_DATA: undefined, console });
  context.window = context;
  context.globalThis = context;
  const code = fs.readFileSync(path.join(rootDir, "world_map_data.js"), "utf8");
  vm.runInContext(code, context, { filename: "world_map_data.js" });
  const data = vm.runInContext("WORLD_MAP_DATA", context);
  if (!data || typeof data.width !== "number") {
    throw new Error("Failed to load WORLD_MAP_DATA from world_map_data.js");
  }
  global.WORLD_MAP_DATA = data;
  loaded = true;
  return data;
}
