/**
 * Server-authoritative world-map merge and combat outcome application (Phase 4A).
 */

import { loadGameConfig } from "../load_game_config.js";
import {
  applyDungeonCombatDefeat,
  applyDungeonCombatVictory,
  resolveAuthoritativeDungeonEncounter
} from "./dungeon.js";
import { isWorldMovementAllowed } from "./movement.js";
import { loadWorldMapData } from "../load_world_map.js";
import {
  ensureSharedMapCellSlotRolled,
  getSharedMapCell,
  isSharedDefeatedSlotOnCooldown
} from "../presence/map_cells.js";

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function worldMapKey(x, y) {
  return `${Math.floor(x)},${Math.floor(y)}`;
}

function getMapData() {
  return loadWorldMapData();
}

function getBiomeIndexAt(x, y) {
  const d = getMapData();
  if (!d || x < 0 || y < 0 || x >= d.width || y >= d.height) return 0;
  return d.biomeIndex[y * d.width + x] || 0;
}

export function getBiomeDefAt(x, y) {
  const cfg = loadGameConfig();
  const biomes = cfg?.worldMap?.biomes;
  if (!Array.isArray(biomes)) return null;
  const idx = getBiomeIndexAt(x, y);
  return biomes[idx] || biomes[0] || null;
}

export function canEnterMap(x, y) {
  const d = getMapData();
  if (!d || x < 0 || y < 0 || x >= d.width || y >= d.height) return false;
  const b = getBiomeDefAt(x, y);
  return !!(b && b.passable);
}

function getCityNameAt(x, y) {
  const d = getMapData();
  if (!d?.cityNames) return "";
  return d.cityNames[worldMapKey(x, y)] || "";
}

function normalizeCoordinateCellRaw(raw) {
  if (!raw || typeof raw !== "object") {
    return { kind: "encounters", encounterSlots: null };
  }
  if (raw.kind === "scene") {
    return {
      kind: "scene",
      title: typeof raw.title === "string" ? raw.title : "",
      description: typeof raw.description === "string" ? raw.description : "",
      elements: Array.isArray(raw.elements) ? raw.elements : []
    };
  }
  let encounterSlots = null;
  if (Object.prototype.hasOwnProperty.call(raw, "encounterSlots")) {
    const n = raw.encounterSlots;
    if (typeof n === "number" && Number.isFinite(n)) encounterSlots = Math.max(0, Math.floor(n));
  }
  return { kind: "encounters", encounterSlots };
}

function getCoordinateCellConfig(x, y) {
  const wm = loadGameConfig()?.worldMap;
  const raw =
    wm && wm.coordinateCells && typeof wm.coordinateCells === "object"
      ? wm.coordinateCells[worldMapKey(x, y)]
      : null;
  return normalizeCoordinateCellRaw(raw);
}

function getDefaultEncounterSlotCount() {
  const n = loadGameConfig()?.worldMap?.encounterSlotsPerTile;
  return typeof n === "number" && n >= 1 ? Math.floor(n) : 3;
}

export function getEncounterSlotCountForCell(x, y) {
  if (getCityNameAt(x, y)) return 0;
  const cfg = getCoordinateCellConfig(x, y);
  if (cfg.kind !== "encounters") return 0;
  if (cfg.encounterSlots != null) return cfg.encounterSlots;
  return getDefaultEncounterSlotCount();
}

function mergeDefeatedTimestamp(a, b) {
  if (a != null && a !== 0 && b != null && b !== 0) return Math.max(a, b);
  if (a != null && a !== 0) return a;
  if (b != null && b !== 0) return b;
  return null;
}

function mergeDefeatedCells(authCells, incomingCells) {
  const out = authCells && typeof authCells === "object" ? deepClone(authCells) : {};
  if (!incomingCells || typeof incomingCells !== "object") return out;
  Object.entries(incomingCells).forEach(([key, incCell]) => {
    if (!incCell || typeof incCell !== "object") return;
    const prev = out[key] && typeof out[key] === "object" ? out[key] : {};
    const authDef = Array.isArray(prev.defeated) ? prev.defeated : [];
    const incDef = Array.isArray(incCell.defeated) ? incCell.defeated : [];
    const len = Math.max(authDef.length, incDef.length, 1);
    const defeated = [];
    const defeatedUnits = [];
    const mobPreviews = [];
    for (let i = 0; i < len; i++) {
      defeated[i] = mergeDefeatedTimestamp(authDef[i], incDef[i]);
      defeatedUnits[i] =
        defeated[i] != null
          ? (Array.isArray(incCell.defeatedUnits) && incCell.defeatedUnits[i]) ||
            (Array.isArray(prev.defeatedUnits) && prev.defeatedUnits[i]) ||
            null
          : null;
      mobPreviews[i] = defeated[i] != null ? null : null;
    }
    out[key] = { defeated, defeatedUnits, mobPreviews };
  });
  return out;
}

function mergeScenePickups(auth, incoming) {
  const out = auth && typeof auth === "object" ? { ...auth } : {};
  if (!incoming || typeof incoming !== "object") return out;
  Object.entries(incoming).forEach(([k, v]) => {
    if (v) out[k] = true;
  });
  return out;
}

function mergeShallowRecords(auth, incoming) {
  const base = auth && typeof auth === "object" ? { ...auth } : {};
  if (!incoming || typeof incoming !== "object") return base;
  return { ...base, ...incoming };
}

function mergeDungeonRun(authRun, incomingRun, incomingWm, violations = []) {
  const wm = incomingWm && typeof incomingWm === "object" ? incomingWm : {};
  const incomingClearedRun = !("dungeonRun" in wm);

  if (!incomingRun || typeof incomingRun !== "object" || typeof incomingRun.id !== "string") {
    if (incomingClearedRun && authRun?.epilogue) return undefined;
    return authRun && typeof authRun === "object" ? deepClone(authRun) : undefined;
  }

  // Dungeon runs may only start via POST /api/dungeon/enter (key consumed server-side).
  if (!authRun || typeof authRun !== "object") {
    violations.push({
      severity: "clamp",
      code: "DUNGEON_RUN",
      message: "Dungeon entry must use the entrance NPC."
    });
    return undefined;
  }
  if (incomingRun.id !== authRun.id) {
    violations.push({
      severity: "clamp",
      code: "DUNGEON_RUN",
      message: "Cannot switch dungeons via save."
    });
    return deepClone(authRun);
  }
  const authRi = typeof authRun.roomIndex === "number" ? authRun.roomIndex : 0;
  const incRi = typeof incomingRun.roomIndex === "number" ? incomingRun.roomIndex : 0;
  if (incRi >= authRi) return deepClone(incomingRun);
  return deepClone(authRun);
}

function mergeWorldMapPosition(authWm, incomingWm, violations) {
  const ax = authWm?.x;
  const ay = authWm?.y;
  let ix = incomingWm?.x;
  let iy = incomingWm?.y;
  if (typeof ix !== "number" || typeof iy !== "number" || !Number.isFinite(ix) || !Number.isFinite(iy)) {
    return { x: ax, y: ay };
  }
  ix = Math.floor(ix);
  iy = Math.floor(iy);
  if (!canEnterMap(ix, iy)) {
    violations.push({
      severity: "clamp",
      code: "WORLD_POSITION",
      message: "Invalid world-map position was reverted to the last saved tile."
    });
    return { x: typeof ax === "number" ? ax : ix, y: typeof ay === "number" ? ay : iy };
  }
  if (
    typeof ax === "number" &&
    typeof ay === "number" &&
    Number.isFinite(ax) &&
    Number.isFinite(ay) &&
    !isWorldMovementAllowed(authWm, incomingWm, ix, iy, ax, ay)
  ) {
    violations.push({
      severity: "clamp",
      code: "WORLD_MOVEMENT",
      message: "World-map movement must be one adjacent step or a valid travel destination."
    });
    return { x: Math.floor(ax), y: Math.floor(ay) };
  }
  return { x: ix, y: iy };
}

/**
 * Merge client world-map onto authoritative snapshot.
 * @param {object|null} authWm
 * @param {object|null} incomingWm
 * @param {Array} violations
 */
export function mergeWorldMap(authWm, incomingWm, violations = []) {
  if (!incomingWm || typeof incomingWm !== "object") {
    return authWm && typeof authWm === "object" ? deepClone(authWm) : {};
  }
  const auth = authWm && typeof authWm === "object" ? authWm : {};
  const pos = mergeWorldMapPosition(auth, incomingWm, violations);
  const out = {
    ...deepClone(incomingWm),
    x: pos.x,
    y: pos.y,
    cells: mergeDefeatedCells(auth.cells, incomingWm.cells),
    scenePickups: mergeScenePickups(auth.scenePickups, incomingWm.scenePickups),
    sceneLayout: mergeShallowRecords(auth.sceneLayout, incomingWm.sceneLayout),
    sceneEdits: mergeShallowRecords(auth.sceneEdits, incomingWm.sceneEdits),
    portalWorldById: mergeShallowRecords(auth.portalWorldById, incomingWm.portalWorldById),
    spawnPressure: mergeShallowRecords(auth.spawnPressure, incomingWm.spawnPressure)
  };
  const mergedRun = mergeDungeonRun(auth.dungeonRun, incomingWm.dungeonRun, incomingWm, violations);
  if (mergedRun) out.dungeonRun = mergedRun;
  else delete out.dungeonRun;
  if (incomingWm.dungeonPostCombat && typeof incomingWm.dungeonPostCombat === "object") {
    out.dungeonPostCombat = { ...incomingWm.dungeonPostCombat };
  } else if (!mergedRun) {
    delete out.dungeonPostCombat;
  } else if (auth.dungeonPostCombat) {
    out.dungeonPostCombat = { ...auth.dungeonPostCombat };
  }
  if (typeof incomingWm.mobPreviewGeneration === "number") {
    out.mobPreviewGeneration = incomingWm.mobPreviewGeneration;
  } else if (typeof auth.mobPreviewGeneration === "number") {
    out.mobPreviewGeneration = auth.mobPreviewGeneration;
  }
  if (typeof out.editMode === "boolean") delete out.editMode;
  return out;
}

function ensureWorldMapCell(player, x, y) {
  if (!player.worldMap) player.worldMap = { x, y, cells: {} };
  if (!player.worldMap.cells || typeof player.worldMap.cells !== "object") {
    player.worldMap.cells = {};
  }
  const key = worldMapKey(x, y);
  if (!player.worldMap.cells[key] || typeof player.worldMap.cells[key] !== "object") {
    player.worldMap.cells[key] = { defeated: [], defeatedUnits: [], mobPreviews: [] };
  }
  const c = player.worldMap.cells[key];
  if (!Array.isArray(c.defeated)) c.defeated = [];
  if (!Array.isArray(c.defeatedUnits)) c.defeatedUnits = [];
  if (!Array.isArray(c.mobPreviews)) c.mobPreviews = [];
  return c;
}

/**
 * Apply world-map consequences of a finished combat (mirrors client applyServerFightResult).
 */
export function applyCombatWorldMapOutcome(player, combatState, result) {
  if (!player || !result || !combatState) return;
  const wmc = combatState.worldMapContext;
  if (!wmc || typeof wmc !== "object") return;

  if (!player.worldMap || typeof player.worldMap !== "object") {
    const st = loadGameConfig()?.worldMap?.defaultStart || { x: 0, y: 0 };
    player.worldMap = {
      x: st.x,
      y: st.y,
      cells: {},
      scenePickups: {},
      sceneLayout: {},
      sceneEdits: {},
      portalWorldById: {},
      spawnPressure: { monsters: {} }
    };
  }

  const killedNames = Array.isArray(combatState.enemyNames) ? combatState.enemyNames.slice() : [];

  if (result.victory) {
    if (typeof wmc.dungeonId === "string" && wmc.dungeonId.trim()) {
      const dungeonId = wmc.dungeonId.trim();
      const roomIndex = typeof wmc.roomIndex === "number" ? wmc.roomIndex : 0;
      applyDungeonCombatVictory(player, dungeonId, roomIndex);
      return;
    }
    if (typeof wmc.x === "number" && typeof wmc.y === "number") {
      const x = Math.floor(wmc.x);
      const y = Math.floor(wmc.y);
      const setIndex = typeof wmc.setIndex === "number" ? Math.max(0, Math.floor(wmc.setIndex)) : 0;
      const cell = ensureWorldMapCell(player, x, y);
      const slots = getEncounterSlotCountForCell(x, y);
      const len = Math.max(slots, setIndex + 1, 1);
      while (cell.defeated.length < len) cell.defeated.push(null);
      while (cell.defeatedUnits.length < len) cell.defeatedUnits.push(null);
      while (cell.mobPreviews.length < len) cell.mobPreviews.push(null);
      const now = Date.now();
      cell.defeated[setIndex] = now;
      cell.defeatedUnits[setIndex] = killedNames;
      cell.mobPreviews[setIndex] = null;
    }
    return;
  }

  if (typeof wmc.dungeonId === "string" && wmc.dungeonId.trim()) {
    applyDungeonCombatDefeat(player, wmc.dungeonId.trim());
  }
}

/**
 * For online overworld fights, resolve enemy units from shared map cell state.
 * @returns {object} encounter safe to pass into buildFoesFromEncounter
 */
export function resolveAuthoritativeOverworldEncounter(player, encounter) {
  const enc = encounter && typeof encounter === "object" ? { ...encounter } : {};
  const wmc =
    enc.worldMapContext && typeof enc.worldMapContext === "object" ? { ...enc.worldMapContext } : null;
  if (!wmc) return enc;
  if (typeof wmc.dungeonId === "string" && wmc.dungeonId.trim()) return enc;
  if (typeof wmc.x !== "number" || typeof wmc.y !== "number") return enc;

  const x = Math.floor(wmc.x);
  const y = Math.floor(wmc.y);
  const setIndex = typeof wmc.setIndex === "number" ? Math.max(0, Math.floor(wmc.setIndex)) : 0;
  const wm = player?.worldMap;
  const px = typeof wm?.x === "number" ? Math.floor(wm.x) : NaN;
  const py = typeof wm?.y === "number" ? Math.floor(wm.y) : NaN;

  if (px !== x || py !== y) {
    const err = new Error("You must be on this tile to start this fight.");
    err.status = 400;
    throw err;
  }

  const run = wm?.dungeonRun;
  if (run && typeof run.id === "string" && run.id.trim() && !run.epilogue) {
    const err = new Error("Leave the dungeon before starting overworld combat.");
    err.status = 400;
    throw err;
  }

  const slots = getEncounterSlotCountForCell(x, y);
  if (slots <= 0 || setIndex >= slots) {
    const err = new Error("Invalid encounter slot.");
    err.status = 400;
    throw err;
  }

  const rolled = ensureSharedMapCellSlotRolled(x, y, setIndex);
  const mapCell = rolled?.mapCell || getSharedMapCell(x, y);
  if (mapCell && isSharedDefeatedSlotOnCooldown(mapCell, setIndex)) {
    const err = new Error("This encounter was already cleared.");
    err.status = 400;
    throw err;
  }

  const preview = mapCell?.mobPreviews?.[setIndex];
  const units = preview?.units;
  if (!Array.isArray(units) || !units.length) {
    const err = new Error("Could not resolve overworld encounter.");
    err.status = 400;
    throw err;
  }

  return {
    ...enc,
    units: deepClone(units),
    worldMapContext: { x, y, setIndex }
  };
}

/** Resolve dungeon then overworld encounter payloads for online combat start. */
export function resolveAuthoritativeEncounter(player, encounter) {
  let enc = resolveAuthoritativeDungeonEncounter(player, encounter || {});
  enc = resolveAuthoritativeOverworldEncounter(player, enc);
  return enc;
}
