import { getItemDef } from "../load_game_config.js";

export function countEquippedSetPieces(equipment, setName) {
  const want = typeof setName === "string" ? setName.trim() : "";
  if (!want || !equipment || typeof equipment !== "object") return 0;
  let count = 0;
  Object.values(equipment).forEach((itemName) => {
    if (!itemName) return;
    const def = getItemDef(itemName);
    if (def?.set === want) count += 1;
  });
  return count;
}

function ensureFoeCombat(foe) {
  if (!foe.combat || typeof foe.combat !== "object") {
    foe.combat = { skillCd: {}, actCount: 0 };
  }
}

export function applyFoePhysResDown(foe, pct, turns) {
  if (!foe) return;
  ensureFoeCombat(foe);
  const c = foe.combat;
  c.physResDownPct = Math.max(c.physResDownPct || 0, Math.max(0, pct));
  c.physResDownTurns = Math.max(c.physResDownTurns || 0, Math.max(1, Math.floor(turns)));
}

export function applyFoeCrippleFromSet(foe, turns) {
  if (!foe) return;
  ensureFoeCombat(foe);
  foe.combat.staggerSkillTaxTurns = Math.max(foe.combat.staggerSkillTaxTurns || 0, Math.max(1, Math.floor(turns)));
}

/**
 * Granitehorn 2pc: physical hits may lower foe phys resist.
 * @returns {string|null} log line
 */
export function tryProcGranitehornPhysResDown(equipment, foe, rng, damageKind) {
  if (!foe || foe.hp <= 0) return null;
  if (damageKind !== "physical") return null;
  if (countEquippedSetPieces(equipment, "Granitehorn") < 2) return null;
  if (!rng?.chance?.(15)) return null;
  applyFoePhysResDown(foe, 5, 2);
  return `${foe.name}'s physical resist is lowered (Granitehorn).`;
}

/**
 * Held Colossus 4pc: when struck, may cripple the attacker (+1 skill stamina tax).
 * @returns {string|null} log line
 */
export function tryProcHeldColossusCrippleOnHit(equipment, foe, rng, damageTaken) {
  if (!foe || foe.hp <= 0) return null;
  if (!damageTaken || damageTaken <= 0) return null;
  if (countEquippedSetPieces(equipment, "Held Colossus") < 4) return null;
  if (!rng?.chance?.(15)) return null;
  applyFoeCrippleFromSet(foe, 1);
  return `${foe.name} is crippled by stillstone backlash (+1 stamina per action).`;
}
