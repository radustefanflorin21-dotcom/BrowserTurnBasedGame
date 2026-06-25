/**
 * Tactical board state: placement, movement, turn resources.
 */

import { createRequire } from "node:module";
import { getEnemyDefByName } from "../load_game_config.js";
import { getEnemyCombatRoleKey } from "./monster_stats.js";

const require = createRequire(import.meta.url);
const TacticalGrid = require("../../shared/tactical_grid.js");

export { TacticalGrid };

export function ensureTacticalUnitFootprints(st) {
  if (!st) return;
  TacticalGrid.allCombatUnits(st).forEach((unit) => {
    if (!unit || unit.hp <= 0) return;
    if (Number.isFinite(unit.gridFootprintW) && Number.isFinite(unit.gridFootprintH)) return;
    const def = unit.name ? getEnemyDefByName(unit.name) : null;
    const fp = def?.tacticalFootprint;
    if (fp && typeof fp.w === "number" && typeof fp.h === "number") {
      unit.gridFootprintW = Math.max(1, Math.floor(fp.w));
      unit.gridFootprintH = Math.max(1, Math.floor(fp.h));
    }
  });
}

export function initTacticalState(st, { autoPlace = true } = {}) {
  if (!st) return;
  st.tactical = true;
  st.board = st.board || TacticalGrid.createBoard();
  st.combatRound = typeof st.combatRound === "number" ? st.combatRound : 1;
  ensureTacticalUnitFootprints(st);
  if (autoPlace) {
    TacticalGrid.autoPlaceAllies(st.party || []);
    TacticalGrid.autoPlaceEnemies(st.foes || [], (foe) => {
      const def = foe?.name ? getEnemyDefByName(foe.name) : null;
      return getEnemyCombatRoleKey(def);
    });
  }
  (st.party || []).forEach((m) => {
    if (m) initUnitTacticalFields(m, st, "ally");
  });
  (st.foes || []).forEach((f) => {
    if (f) initUnitTacticalFields(f, st, "foe");
  });
}

export function initUnitTacticalFields(unit, st, side) {
  if (!unit) return;
  if (typeof unit.movePoints !== "number") unit.movePoints = TacticalGrid.DEFAULT_MOVE_POINTS;
  if (typeof unit.maxMovePoints !== "number") unit.maxMovePoints = TacticalGrid.DEFAULT_MOVE_POINTS;
  if (typeof unit.gridX !== "number" || typeof unit.gridY !== "number") {
    const unitSide = side || (unit.kind === "hero" || unit.kind === "companion" ? "ally" : "foe");
    const cells = TacticalGrid.placementCellsForUnit(unit, unitSide);
    const occ = TacticalGrid.buildOccupancy(TacticalGrid.allCombatUnits(st));
    const { w, h } = TacticalGrid.getUnitFootprint(unit);
    const spot = TacticalGrid.firstFreeFootprintCell(cells, w, h, occ, unit.uid);
    if (spot) {
      unit.gridX = spot.x;
      unit.gridY = spot.y;
    }
  }
}

export function refreshUnitTurnResources(unit, member, maxStamina) {
  if (!unit) return;
  unit.movePoints = TacticalGrid.DEFAULT_MOVE_POINTS;
  unit.maxMovePoints = TacticalGrid.DEFAULT_MOVE_POINTS;
  if (member && typeof maxStamina === "number") {
    member.stamina = maxStamina;
    member.maxStamina = maxStamina;
  }
}

export function getUnitsOwnedByUser(st, userId) {
  const uid = Number(userId);
  return (st.party || []).filter(
    (m) => m && Number(m.controllerUserId) === uid && m.hp > 0
  );
}

export function isUnitPlacementLocked(st, session, userId) {
  const part = session?.participants?.get(userId);
  return !!(part && part.ready);
}

export function validatePlaceAction(st, session, userId, unitUid, x, y) {
  if (st.phase !== "prep") return { ok: false, message: "Fight has already started." };
  if (isUnitPlacementLocked(st, session, userId)) {
    return { ok: false, message: "Your positions are locked." };
  }
  const unit = TacticalGrid.findUnitByUid(st.party, unitUid);
  if (!unit) return { ok: false, message: "Invalid unit." };
  if (Number(unit.controllerUserId) !== Number(userId)) {
    return { ok: false, message: "You can only place your own fighters." };
  }
  if (!TacticalGrid.isAllyColumn(x) || !TacticalGrid.isInBounds(x, y)) {
    return { ok: false, message: "Allies must be placed in columns A or B." };
  }
  const occ = TacticalGrid.buildOccupancy(TacticalGrid.allCombatUnits(st));
  const key = TacticalGrid.coordKey(x, y);
  const cur = occ.get(key);
  if (cur != null && cur !== unit.uid) {
    return { ok: false, message: "That tile is occupied." };
  }
  return { ok: true, unit };
}

export function applyPlaceAction(st, unit, x, y) {
  unit.gridX = x;
  unit.gridY = y;
}

export function validateMoveAction(st, session, userId, unitUid, x, y) {
  if (st.phase !== "player") return { ok: false, message: "Not your turn." };
  ensureTacticalUnitFootprints(st);
  const unit = TacticalGrid.findUnitByUid(st.party, unitUid);
  if (!unit || unit.hp <= 0) return { ok: false, message: "Invalid unit." };
  if (Number(unit.controllerUserId) !== Number(userId)) {
    return { ok: false, message: "You can only move your own fighters." };
  }
  if (st.activePartyUid !== unit.uid) {
    return { ok: false, message: "It is not this unit's turn." };
  }
  if (!TacticalGrid.isInBounds(x, y)) return { ok: false, message: "Invalid tile." };
  const occ = TacticalGrid.buildOccupancy(TacticalGrid.allCombatUnits(st));
  const reachable = TacticalGrid.bfsReachable(
    unit.gridX,
    unit.gridY,
    unit.movePoints,
    st.board,
    occ,
    unit.uid,
    TacticalGrid.getUnitFootprint(unit).w,
    TacticalGrid.getUnitFootprint(unit).h
  );
  const dest = reachable.find((c) => c.x === x && c.y === y);
  if (!dest) return { ok: false, message: "That tile is out of movement range." };
  return { ok: true, unit, cost: dest.cost };
}

export function applyMoveAction(st, unit, x, y, cost) {
  unit.gridX = x;
  unit.gridY = y;
  unit.movePoints = Math.max(0, (unit.movePoints || 0) - Math.max(1, cost || 1));
}

export function findAdjacentFoeForMelee(st, ally) {
  if (!ally) return null;
  return (st.foes || []).find(
    (f) => f && f.hp > 0 && TacticalGrid.areUnitsOrthogonalAdjacent(ally, f)
  );
}

export function validateMeleeTarget(st, attacker, targetUid) {
  const foe = TacticalGrid.findUnitByUid(st.foes, targetUid);
  if (!foe || foe.hp <= 0) return { ok: false, message: "Invalid target." };
  if (!TacticalGrid.areUnitsOrthogonalAdjacent(attacker, foe)) {
    return { ok: false, message: "Target is not adjacent." };
  }
  return { ok: true, foe };
}

export function ensureAllAlliesPlaced(st) {
  for (const m of st.party || []) {
    if (!m) continue;
    if (typeof m.gridX !== "number" || typeof m.gridY !== "number") {
      return false;
    }
  }
  return true;
}
