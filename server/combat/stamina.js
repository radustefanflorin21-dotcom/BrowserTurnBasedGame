/**
 * Combat stamina pool (matches client getPlayerCombatMaxStamina / getActorCombatMaxStamina).
 */

function sumStaminaFromGear(actor) {
  if (!actor?.equipment) return 0;
  let total = 0;
  Object.values(actor.equipment).forEach((name) => {
    if (!name) return;
    const def = global.GAME_CONFIG?.items?.[name];
    if (def?.stats?.stamina) total += def.stats.stamina;
  });
  return total;
}

export function getCombatStaminaBaseMax() {
  const sys = global.GAME_CONFIG?.statSystem;
  return typeof sys?.staminaPerTurn === "number" && sys.staminaPerTurn > 0
    ? Math.floor(sys.staminaPerTurn)
    : 6;
}

export function getActorCombatMaxStamina(actor) {
  return Math.max(1, getCombatStaminaBaseMax() + sumStaminaFromGear(actor));
}

/** True when multiple human heroes share one fight (per-hero stamina pools). */
export function isCoopMultiHeroStamina(st) {
  const heroes = (st?.party || []).filter(
    (m) => m && m.kind === "hero" && m.controllerUserId != null
  );
  return heroes.length > 1;
}

export function getMemberCombatStamina(st, member) {
  if (!member) return 0;
  if (typeof member.stamina === "number") return member.stamina;
  if (member.kind === "hero" && !isCoopMultiHeroStamina(st) && typeof st?.stamina === "number") {
    return st.stamina;
  }
  return 0;
}

export function setMemberCombatStamina(st, member, value) {
  if (!member || !st) return;
  let v = Math.max(0, Math.floor(value));
  if (typeof member.maxStamina === "number") v = Math.min(member.maxStamina, v);
  member.stamina = v;
  if (member.kind === "hero" && !isCoopMultiHeroStamina(st)) {
    st.stamina = v;
  }
}

/** Mirror the active hero's pool into legacy top-level fields for clients. */
export function syncGlobalStaminaFromMember(st, member) {
  if (!st || !member || member.kind !== "hero") return;
  if (typeof member.stamina === "number") st.stamina = member.stamina;
  if (typeof member.maxStamina === "number") st.maxStamina = member.maxStamina;
  if (member.skillCooldowns) st.skillCooldowns = member.skillCooldowns;
}

/** Refill one fighter's pool at the start of their turn (matches staminaPerTurn). */
export function refillMemberCombatStamina(member) {
  if (!member || typeof member.maxStamina !== "number") return;
  const bonus = typeof member.staminaBonusNextTurn === "number" ? member.staminaBonusNextTurn : 0;
  member.stamina = Math.min(member.maxStamina, member.maxStamina + (bonus > 0 ? bonus : 0));
  member.staminaBonusNextTurn = 0;
}
