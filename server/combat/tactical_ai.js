/**
 * Role-aware tactical AI (move toward focus target with melee/ranged positioning).
 */

import { createRequire } from "node:module";
import { getEnemyDefByName } from "../load_game_config.js";
import { getEnemyCombatRoleKey } from "./monster_stats.js";
import { applyMoveAction } from "./tactical.js";

const require = createRequire(import.meta.url);
const TacticalEnemyAi = require("../../shared/tactical_enemy_ai.js");

/** @returns {{ moved: boolean }} */
export function runTacticalEnemyMove(foe, st, appendLog, rng = null) {
  if (!foe || foe.hp <= 0 || !st?.tactical) return { moved: false };

  const def = foe?.name ? getEnemyDefByName(foe.name) : null;
  const scriptId = def?.combatScript?.trim?.() || foe.combat?.script || "";
  const role = getEnemyCombatRoleKey(def) || "bruiser";

  const plan = TacticalEnemyAi.planTacticalEnemyMove(st, foe, { role, scriptId, rng });
  if (!plan.moved) return { moved: false };

  applyMoveAction(st, foe, plan.x, plan.y, plan.cost);
  return { moved: true };
}

export function pickTacticalMeleeTarget(foe, st) {
  const TacticalGrid = require("../../shared/tactical_grid.js");
  const allies = (st.party || []).filter((m) => m && m.hp > 0 && typeof m.gridX === "number");
  return allies.find((a) =>
    TacticalGrid.areOrthogonalAdjacent(foe.gridX, foe.gridY, a.gridX, a.gridY)
  );
}

export function getEnemyRoleKey(foe) {
  const def = foe?.name ? getEnemyDefByName(foe.name) : null;
  return getEnemyCombatRoleKey(def);
}
