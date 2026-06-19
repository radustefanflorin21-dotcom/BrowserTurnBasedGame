/**
 * Server-authoritative world move + scene pickup (Phase B).
 */

import { loadGameConfig } from "../load_game_config.js";
import { canEnterMap, worldMapKey } from "./world_map.js";
import { isWorldMovementAllowed } from "./movement.js";
import { isKnownItemName } from "./snapshot.js";

function scenePickupKey(x, y, elId) {
  return `${worldMapKey(x, y)}|${elId}`;
}

function getCoordinateCellConfig(x, y) {
  const wm = loadGameConfig()?.worldMap;
  const raw = wm?.coordinateCells?.[worldMapKey(x, y)] || null;
  if (!raw || typeof raw !== "object") return { kind: "encounters", elements: [] };
  if (raw.kind === "scene") {
    return {
      kind: "scene",
      elements: Array.isArray(raw.elements) ? raw.elements : []
    };
  }
  return { kind: "encounters", elements: [] };
}

function findScenePickupElement(x, y, elementId) {
  const cfg = getCoordinateCellConfig(x, y);
  if (cfg.kind !== "scene" || !Array.isArray(cfg.elements)) return null;
  const want = typeof elementId === "string" ? elementId.trim() : "";
  return cfg.elements.find((el) => el && (el.type === "pickup" || el.type === "usable") && el.id === want) || null;
}

export function applyWorldMove(player, { x, y, reason = "step" }) {
  if (!player.worldMap || typeof player.worldMap !== "object") {
    const st = loadGameConfig()?.worldMap?.defaultStart || { x: 0, y: 0 };
    player.worldMap = { x: st.x, y: st.y, cells: {}, scenePickups: {} };
  }
  const wm = player.worldMap;
  const ax = typeof wm.x === "number" ? Math.floor(wm.x) : 0;
  const ay = typeof wm.y === "number" ? Math.floor(wm.y) : 0;
  const ix = Math.floor(Number(x));
  const iy = Math.floor(Number(y));
  if (!Number.isFinite(ix) || !Number.isFinite(iy)) {
    const err = new Error("Invalid coordinates.");
    err.status = 400;
    throw err;
  }
  if (!canEnterMap(ix, iy)) {
    const err = new Error("You cannot move there.");
    err.status = 400;
    throw err;
  }
  const run = wm.dungeonRun;
  if (run && typeof run.id === "string" && run.id.trim() && !run.epilogue) {
    const err = new Error("Leave the dungeon before moving on the world map.");
    err.status = 400;
    throw err;
  }
  if (!isWorldMovementAllowed(wm, wm, ix, iy, ax, ay)) {
    const err = new Error("Invalid movement.");
    err.status = 400;
    throw err;
  }
  wm.x = ix;
  wm.y = iy;
  return { x: ix, y: iy, reason: typeof reason === "string" ? reason : "step" };
}

export function applyScenePickup(player, { x, y, elementId, itemName }) {
  if (!player.worldMap || typeof player.worldMap !== "object") {
    const err = new Error("World map not initialized.");
    err.status = 400;
    throw err;
  }
  const wm = player.worldMap;
  const px = typeof wm.x === "number" ? Math.floor(wm.x) : NaN;
  const py = typeof wm.y === "number" ? Math.floor(wm.y) : NaN;
  const tx = Math.floor(Number(x));
  const ty = Math.floor(Number(y));
  if (px !== tx || py !== ty) {
    const err = new Error("You must be on this tile to pick up items.");
    err.status = 400;
    throw err;
  }
  const elId = typeof elementId === "string" ? elementId.trim() : "";
  const wantItem = typeof itemName === "string" ? itemName.trim() : "";
  if (!elId || !wantItem) {
    const err = new Error("Invalid pickup request.");
    err.status = 400;
    throw err;
  }
  if (!isKnownItemName(wantItem)) {
    const err = new Error("Unknown item.");
    err.status = 400;
    throw err;
  }
  const el = findScenePickupElement(tx, ty, elId);
  if (!el) {
    const err = new Error("Pickup not found on this tile.");
    err.status = 400;
    throw err;
  }
  const cfgItem = typeof el.itemName === "string" ? el.itemName.trim() : "";
  if (cfgItem && cfgItem !== wantItem) {
    const err = new Error("Pickup item mismatch.");
    err.status = 400;
    throw err;
  }
  const once = el.once !== false;
  if (!wm.scenePickups || typeof wm.scenePickups !== "object") wm.scenePickups = {};
  const key = scenePickupKey(tx, ty, elId);
  if (once && wm.scenePickups[key]) {
    const err = new Error("Already picked up.");
    err.status = 400;
    throw err;
  }
  if (!Array.isArray(player.inventory)) player.inventory = [];
  player.inventory.push(wantItem);
  if (once) wm.scenePickups[key] = true;
  return { itemName: wantItem, elementId: elId, x: tx, y: ty };
}
