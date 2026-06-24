/**
 * Simple role-aware tactical AI (move toward nearest ally, melee if adjacent).
 */

import { createRequire } from "node:module";
import { getEnemyDefByName } from "../load_game_config.js";
import { getEnemyCombatRoleKey } from "./monster_stats.js";
import { applyMoveAction } from "./tactical.js";

const require = createRequire(import.meta.url);
const TacticalGrid = require("../../shared/tactical_grid.js");

function livingAllies(st) {
  return (st.party || []).filter((m) => m && m.hp > 0 && typeof m.gridX === "number");
}

function nearestAlly(foe, allies) {
  let best = null;
  let bestD = Infinity;
  for (const a of allies) {
    const d = TacticalGrid.manhattan(foe.gridX, foe.gridY, a.gridX, a.gridY);
    if (d < bestD) {
      bestD = d;
      best = a;
    }
  }
  return best;
}

function stepToward(foe, target, st) {
  const occ = TacticalGrid.buildOccupancy(TacticalGrid.allCombatUnits(st));
  const reachable = TacticalGrid.bfsReachable(
    foe.gridX,
    foe.gridY,
    foe.movePoints,
    st.board,
    occ,
    foe.uid
  );
  if (!reachable.length) return null;
  let best = null;
  let bestD = TacticalGrid.manhattan(foe.gridX, foe.gridY, target.gridX, target.gridY);
  for (const cell of reachable) {
    const d = TacticalGrid.manhattan(cell.x, cell.y, target.gridX, target.gridY);
    if (d < bestD) {
      bestD = d;
      best = cell;
    }
  }
  return best;
}

/** @returns {{ moved: boolean, log?: string }} */
export function runTacticalEnemyMove(foe, st, appendLog) {
  if (!foe || foe.hp <= 0) return { moved: false };
  const allies = livingAllies(st);
  if (!allies.length) return { moved: false };
  const target = nearestAlly(foe, allies);
  if (!target) return { moved: false };
  if (TacticalGrid.areOrthogonalAdjacent(foe.gridX, foe.gridY, target.gridX, target.gridY)) {
    return { moved: false };
  }
  const step = stepToward(foe, target, st);
  if (!step) return { moved: false };
  applyMoveAction(st, foe, step.x, step.y, step.cost);
  const label = `${TacticalGrid.colToLetter(step.x)}${step.y + 1}`;
  const line = `${foe.name} moves to ${label}.`;
  if (appendLog) appendLog(line);
  return { moved: true, log: line };
}

export function pickTacticalMeleeTarget(foe, st) {
  const allies = livingAllies(st);
  return allies.find((a) =>
    TacticalGrid.areOrthogonalAdjacent(foe.gridX, foe.gridY, a.gridX, a.gridY)
  );
}

export function getEnemyRoleKey(foe) {
  const def = foe?.name ? getEnemyDefByName(foe.name) : null;
  return getEnemyCombatRoleKey(def);
}
