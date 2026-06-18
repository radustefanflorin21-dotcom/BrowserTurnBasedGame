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

export function applyFoeAccuracyDown(foe, pct, turns) {
  if (!foe) return;
  ensureFoeCombat(foe);
  const c = foe.combat;
  c.accDownPct = Math.max(c.accDownPct || 0, Math.max(0, pct));
  c.accDownTurns = Math.max(c.accDownTurns || 0, Math.max(1, Math.floor(turns)));
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

/**
 * Frosthorn 3pc: when struck by physical damage, may cripple the attacker.
 * @returns {string|null} log line
 */
export function tryProcFrosthornCrippleOnHit(equipment, foe, rng, damageTaken, damageKind) {
  if (!foe || foe.hp <= 0) return null;
  if (!damageTaken || damageTaken <= 0 || damageKind !== "physical") return null;
  if (countEquippedSetPieces(equipment, "Frosthorn") < 3) return null;
  if (!rng?.chance?.(12)) return null;
  applyFoeCrippleFromSet(foe, 1);
  return `${foe.name} is crippled by frosthorn backlash (+1 stamina per action).`;
}

/**
 * Sleeping Winter 4pc: when applying cripple, may lower foe accuracy.
 * @returns {string|null} log line
 */
export function tryProcSleepingWinterAccuracyOnCripple(equipment, foe, rng) {
  if (!foe || foe.hp <= 0) return null;
  if (countEquippedSetPieces(equipment, "Sleeping Winter") < 4) return null;
  if (!rng?.chance?.(20)) return null;
  applyFoeAccuracyDown(foe, 6, 1);
  return `${foe.name}'s accuracy falters (Sleeping Winter).`;
}

export function applyFoeMagResDown(foe, pct, turns) {
  if (!foe) return;
  ensureFoeCombat(foe);
  const c = foe.combat;
  c.magResDownPct = Math.max(c.magResDownPct || 0, Math.max(0, pct));
  c.magResDownTurns = Math.max(c.magResDownTurns || 0, Math.max(1, Math.floor(turns)));
}

export function applyFoeBothDmgDown(foe, pct, turns) {
  if (!foe) return;
  ensureFoeCombat(foe);
  const c = foe.combat;
  c.bothDmgDownPct = Math.max(c.bothDmgDownPct || 0, Math.max(0, pct));
  c.bothDmgDownTurns = Math.max(c.bothDmgDownTurns || 0, Math.max(1, Math.floor(turns)));
}

export function tryProcBannerlessMagResOnAccuracyDebuff(equipment, foe, rng) {
  if (!foe || foe.hp <= 0) return null;
  if (countEquippedSetPieces(equipment, "Bannerless") < 2) return null;
  if (!rng?.chance?.(15)) return null;
  applyFoeMagResDown(foe, 5, 1);
  return `${foe.name}'s magic resist falters (Bannerless).`;
}

export function tryProcWarmasterBothDmgDownOnHit(equipment, foe, rng, damageKind) {
  if (!foe || foe.hp <= 0 || damageKind !== "physical") return null;
  if (countEquippedSetPieces(equipment, "Warmaster") < 4) return null;
  if (!rng?.chance?.(20)) return null;
  applyFoeBothDmgDown(foe, 5, 1);
  return `${foe.name} is suppressed by war echo (Warmaster).`;
}

export function tryProcSilverbackPhysResDownOnHit(equipment, foe, rng, damageKind) {
  if (!foe || foe.hp <= 0 || damageKind !== "physical") return null;
  if (countEquippedSetPieces(equipment, "Silverback") < 2) return null;
  if (!rng?.chance?.(15)) return null;
  applyFoePhysResDown(foe, 5, 2);
  return `${foe.name}'s physical resist falters (Silverback).`;
}

export function tryProcHeartbloomMagResOnPoison(equipment, foe, rng) {
  if (!foe || foe.hp <= 0) return null;
  if (countEquippedSetPieces(equipment, "Heartbloom") < 4) return null;
  if (!rng?.chance?.(20)) return null;
  applyFoeMagResDown(foe, 6, 1);
  return `${foe.name}'s magic resist falters (Heartbloom).`;
}
