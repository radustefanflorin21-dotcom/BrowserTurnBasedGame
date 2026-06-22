/**
 * Out-of-combat full heal (hero + enabled companions).
 */

import { computeMaxHpFromActor } from "./stat_actions.js";

function healActorToFull(actor) {
  if (!actor || typeof actor !== "object") return 0;
  const prevMax = typeof actor.maxHp === "number" ? actor.maxHp : 0;
  actor.maxHp = computeMaxHpFromActor(actor);
  const before =
    typeof actor.hp === "number" && Number.isFinite(actor.hp) && actor.hp > 0
      ? Math.floor(actor.hp)
      : actor.maxHp;
  actor.hp = actor.maxHp;
  const gained = actor.maxHp - before;
  if (prevMax > 0 && actor.maxHp < prevMax && before > actor.maxHp) {
    actor.hp = actor.maxHp;
  }
  return Math.max(0, gained);
}

export function applyOutOfCombatFullHeal(player) {
  if (!player || typeof player !== "object") {
    const err = new Error("Invalid character.");
    err.status = 400;
    throw err;
  }
  const heroHealed = healActorToFull(player);
  const companions = [];
  if (Array.isArray(player.companions)) {
    player.companions.forEach((comp, slotIndex) => {
      if (!comp || !comp.enabled) return;
      const healed = healActorToFull(comp);
      if (healed > 0) companions.push({ slotIndex, healed });
    });
  }
  return {
    heroHp: player.hp,
    heroMaxHp: player.maxHp,
    heroHealed,
    companions
  };
}
