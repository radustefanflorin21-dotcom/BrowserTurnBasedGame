/**
 * Normalize roster player snapshot before building combat party (server-side).
 */

export function isCompanionEnabledForCombat(comp, _slotIdx) {
  if (!comp || typeof comp !== "object") return false;
  return comp.enabled === true;
}

export function preparePlayerForCombat(player) {
  if (!player || typeof player !== "object") return player;
  if (!Array.isArray(player.companions)) player.companions = [];
  return player;
}
