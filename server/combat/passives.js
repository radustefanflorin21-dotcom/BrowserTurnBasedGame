/** Aggregate passive skill bonuses for online combat (from SKILL_CATALOG). */

function getCatalog() {
  return typeof global.SKILL_CATALOG === "object" && global.SKILL_CATALOG ? global.SKILL_CATALOG : {};
}

function passiveRow(def, actor, skillName) {
  if (!def?.levels?.length) return null;
  const map = actor?.classSkillLevels && typeof actor.classSkillLevels === "object" ? actor.classSkillLevels : {};
  const lv = Math.max(1, Math.min(5, Math.floor(map[skillName] || 1)));
  return def.levels[lv - 1] || def.levels[0];
}

/**
 * @param {object} actor Player or companion actor record
 */
export function getCombatPassiveBonuses(actor) {
  const out = {
    magicDamagePct: 0,
    physDamagePct: 0,
    accuracy: 0,
    evasion: 0,
    crit: 0,
    healingPct: 0,
    dotDamagePct: 0,
    debuffAccuracy: 0
  };
  if (!actor) return out;
  const catalog = getCatalog();
  const levels = actor.classSkillLevels && typeof actor.classSkillLevels === "object" ? actor.classSkillLevels : {};
  Object.keys(levels).forEach((skillName) => {
    const def = catalog[skillName];
    if (!def?.passiveOnly) return;
    const row = passiveRow(def, actor, skillName);
    if (!row) return;
    const pr = row.passive && typeof row.passive === "object" ? row.passive : null;
    if (pr) {
      if (pr.magicDamage > 0) out.magicDamagePct += pr.magicDamage;
      if (pr.physDamage > 0) out.physDamagePct += pr.physDamage;
      if (pr.accuracy > 0) out.accuracy += pr.accuracy;
      if (pr.evasion > 0) out.evasion += pr.evasion;
      if (pr.crit > 0) out.crit += pr.crit;
      if (pr.healing > 0) out.healingPct += pr.healing;
      if (pr.dotDamage > 0) out.dotDamagePct += pr.dotDamage;
      if (pr.debuffAccuracy > 0) out.debuffAccuracy += pr.debuffAccuracy;
    }
    if (typeof row.passiveVit === "number" && row.passiveVit > 0) {
      /* Vit passives (Iron Wall) affect derived stats in full client; omitted here. */
    }
  });
  return out;
}
