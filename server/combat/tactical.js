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

function enemyRoleForFoe(foe) {
  const def = foe?.name ? getEnemyDefByName(foe.name) : null;
  return getEnemyCombatRoleKey(def);
}

/** Fix units still on legacy/wrong spawn columns after grid resize (e.g. foes at x=6–7 on 12-wide board). */
export function repositionTacticalSpawns(st) {
  if (!st?.tactical) return;
  ensureTacticalUnitFootprints(st);
  if (!st.board || typeof st.board !== "object") {
    st.board = TacticalGrid.createBoard();
  } else {
    st.board.width = TacticalGrid.GRID_WIDTH;
    st.board.height = TacticalGrid.GRID_HEIGHT;
  }

  const livingFoes = (st.foes || []).filter((f) => f && f.hp > 0);
  const foeNeedsReposition = (f) => {
    if (typeof f.gridX !== "number" || typeof f.gridY !== "number") return true;
    // Legacy 8-column board used enemy spawn cols 6–7; on 12-wide that's between the zones.
    if (f.gridX > TacticalGrid.ALLY_COL_MAX && f.gridX < TacticalGrid.ENEMY_COL_MIN) return true;
    if (st.phase === "prep") {
      return (
        !TacticalGrid.isUnitOnEnemySide(f) || !TacticalGrid.isUnitAnchorOnPlacementCells(f, "foe")
      );
    }
    return !TacticalGrid.isUnitOnEnemySide(f);
  };
  if (livingFoes.some(foeNeedsReposition)) {
    TacticalGrid.autoPlaceEnemies(livingFoes, enemyRoleForFoe);
  }

  if (st.phase === "prep") {
    const livingAllies = (st.party || []).filter((m) => m && m.hp > 0);
    const allyNeedsReposition = (m) => {
      if (typeof m.gridX !== "number" || typeof m.gridY !== "number") return true;
      if (m.gridX > TacticalGrid.ALLY_COL_MAX && m.gridX < TacticalGrid.ENEMY_COL_MIN) return true;
      return (
        !TacticalGrid.isUnitOnAllySide(m) || !TacticalGrid.isUnitAnchorOnPlacementCells(m, "ally")
      );
    };
    if (livingAllies.some(allyNeedsReposition)) {
      TacticalGrid.autoPlaceAllies(livingAllies);
    }
  }
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
  repositionTacticalSpawns(st);
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

/** BFS check: can this unit reach (x,y) with its current move points? */
export function checkTacticalMoveDestination(st, unit, x, y) {
  if (!st?.tactical || !unit || unit.hp <= 0) return { ok: false };
  if (typeof unit.gridX !== "number" || typeof unit.gridY !== "number") return { ok: false };
  if (!TacticalGrid.isInBounds(x, y)) return { ok: false };
  ensureTacticalUnitFootprints(st);
  const fp = TacticalGrid.getUnitFootprint(unit);
  const mp = typeof unit.movePoints === "number" ? unit.movePoints : TacticalGrid.DEFAULT_MOVE_POINTS;
  const occ = TacticalGrid.buildOccupancy(TacticalGrid.allCombatUnits(st));
  const reachable = TacticalGrid.bfsReachable(
    unit.gridX,
    unit.gridY,
    mp,
    st.board,
    occ,
    unit.uid,
    fp.w,
    fp.h
  );
  const dest = reachable.find((c) => c.x === x && c.y === y);
  if (!dest) return { ok: false };
  return { ok: true, cost: dest.cost };
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
  const check = checkTacticalMoveDestination(st, unit, x, y);
  if (!check.ok) return { ok: false, message: "That tile is out of movement range." };
  return { ok: true, unit, cost: check.cost };
}

export function applyMoveAction(st, unit, x, y, _cost) {
  const check = checkTacticalMoveDestination(st, unit, x, y);
  if (!check.ok) return false;
  unit.gridX = x;
  unit.gridY = y;
  unit.movePoints = Math.max(0, (unit.movePoints || 0) - check.cost);
  return true;
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

function findArenaUnitForUser(st, userId, unitUid) {
  const uid = Number(userId);
  const inParty = TacticalGrid.findUnitByUid(st.party, unitUid);
  if (inParty && Number(inParty.controllerUserId) === uid) return inParty;
  const inFoe = TacticalGrid.findUnitByUid(st.foes, unitUid);
  if (inFoe?.isPvpUnit && Number(inFoe.pvpControllerUserId) === uid) return inFoe;
  return null;
}

export function validateArenaPlaceAction(st, session, userId, unitUid, x, y) {
  if (st.phase !== "prep") return { ok: false, message: "Fight has already started." };
  if (isUnitPlacementLocked(st, session, userId)) {
    return { ok: false, message: "Your positions are locked." };
  }
  const unit = findArenaUnitForUser(st, userId, unitUid);
  if (!unit) return { ok: false, message: "Invalid unit." };
  if (!TacticalGrid.isInBounds(x, y)) return { ok: false, message: "Invalid tile." };
  const isFoeSide = !!unit.isPvpUnit;
  const { w, h } = TacticalGrid.getUnitFootprint(unit);
  const cells = TacticalGrid.footprintCells(x, y, w, h);
  if (isFoeSide) {
    if (!cells.every((c) => TacticalGrid.isEnemyColumn(c.x))) {
      return { ok: false, message: "Place your fighter in columns K or L." };
    }
  } else if (!cells.every((c) => TacticalGrid.isAllyColumn(c.x))) {
    return { ok: false, message: "Allies must be placed in columns A or B." };
  }
  const occ = TacticalGrid.buildOccupancy(TacticalGrid.allCombatUnits(st));
  for (const c of cells) {
    const key = TacticalGrid.coordKey(c.x, c.y);
    const cur = occ.get(key);
    if (cur != null && cur !== unit.uid) {
      return { ok: false, message: "That tile is occupied." };
    }
  }
  return { ok: true, unit };
}

export function validateArenaMoveAction(st, session, userId, unitUid, x, y) {
  if (st.phase !== "player") return { ok: false, message: "Not your turn." };
  ensureTacticalUnitFootprints(st);
  let unit = TacticalGrid.findUnitByUid(st.party, unitUid);
  let isPvpFoe = false;
  if (!unit) {
    unit = TacticalGrid.findUnitByUid(st.foes, unitUid);
    isPvpFoe = !!(unit?.isPvpUnit);
  }
  if (!unit || unit.hp <= 0) return { ok: false, message: "Invalid unit." };
  const uid = Number(userId);
  if (isPvpFoe) {
    if (Number(unit.pvpControllerUserId) !== uid) {
      return { ok: false, message: "You can only move your own fighters." };
    }
    if (st.activePvpFoeUid !== unit.uid) {
      return { ok: false, message: "It is not this unit's turn." };
    }
  } else {
    if (Number(unit.controllerUserId) !== uid) {
      return { ok: false, message: "You can only move your own fighters." };
    }
    if (st.activePartyUid !== unit.uid) {
      return { ok: false, message: "It is not this unit's turn." };
    }
  }
  if (!TacticalGrid.isInBounds(x, y)) return { ok: false, message: "Invalid tile." };
  const check = checkTacticalMoveDestination(st, unit, x, y);
  if (!check.ok) return { ok: false, message: "That tile is out of movement range." };
  return { ok: true, unit, cost: check.cost };
}

export function validateArenaMeleeTarget(st, attacker, targetUid) {
  if (attacker?.isPvpUnit) {
    const ally = TacticalGrid.findUnitByUid(st.party, targetUid);
    if (!ally || ally.hp <= 0) return { ok: false, message: "Invalid target." };
    if (!TacticalGrid.areUnitsOrthogonalAdjacent(attacker, ally)) {
      return { ok: false, message: "Target is not adjacent." };
    }
    return { ok: true, target: ally };
  }
  return validateMeleeTarget(st, attacker, targetUid);
}
