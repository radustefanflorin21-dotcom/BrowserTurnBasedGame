import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const TacticalGrid = require("../../shared/tactical_grid.js");
const TacticalTargeting = require("../../shared/tactical_targeting.js");
const TacticalSkillTargeting = require("../../shared/tactical_skill_targeting.js");

function getActorSkillLevel(actor, skillName) {
  if (skillName === "Basic Physical Attack" || skillName === "Basic Magical Attack") return 1;
  const map = actor?.classSkillLevels && typeof actor.classSkillLevels === "object" ? actor.classSkillLevels : {};
  const lv = map[skillName];
  return typeof lv === "number" && lv > 0 ? Math.min(5, Math.floor(lv)) : 0;
}

function applyBrutalRush(st, caster, targetX, targetY) {
  if (!caster || typeof caster.gridX !== "number" || typeof caster.gridY !== "number") {
    return { ok: false, message: "Caster is not on the board." };
  }
  if (!TacticalTargeting.isSameOrthogonalLine(caster.gridX, caster.gridY, targetX, targetY)) {
    return { ok: false, message: "Brutal Rush must target in a straight line." };
  }
  const occ = TacticalGrid.buildOccupancy(TacticalGrid.allCombatUnits(st));
  const casterKey = TacticalGrid.coordKey(caster.gridX, caster.gridY);
  const dirs = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0]
  ];
  const candidates = [];
  for (const [dx, dy] of dirs) {
    const x = targetX + dx;
    const y = targetY + dy;
    if (!TacticalGrid.isInBounds(x, y)) continue;
    const key = TacticalGrid.coordKey(x, y);
    if (occ.has(key) && key !== casterKey) continue;
    candidates.push({ x, y });
  }
  if (!candidates.length) {
    return { ok: false, message: "No free tile adjacent to the target." };
  }
  const onLine = candidates.filter(
    (c) =>
      (c.x === caster.gridX || c.y === caster.gridY) &&
      TacticalGrid.manhattan(caster.gridX, caster.gridY, c.x, c.y) <
        TacticalGrid.manhattan(caster.gridX, caster.gridY, targetX, targetY)
  );
  const pool = onLine.length ? onLine : candidates;
  pool.sort(
    (a, b) =>
      TacticalGrid.manhattan(a.x, a.y, targetX, targetY) -
      TacticalGrid.manhattan(b.x, b.y, targetX, targetY)
  );
  const spot = pool[0];
  caster.gridX = spot.x;
  caster.gridY = spot.y;
  return { ok: true, x: spot.x, y: spot.y };
}

/**
 * @param {{ x?: number, y?: number } | null} gridTarget
 */
export function prepareTacticalSkillCast(st, member, actor, skillName, targetUid, gridTarget) {
  if (!st?.tactical) return { ok: true, ctx: null, targetUid };

  const cfg = TacticalSkillTargeting.getSkillTargeting(skillName);
  if (!cfg) return { ok: false, error: "Unknown tactical targeting for this skill." };

  const skillRank = Math.max(1, getActorSkillLevel(actor, skillName) || 1);
  const needsTile = TacticalSkillTargeting.needsTileTarget(skillName);

  if (needsTile) {
    const tx = gridTarget?.x;
    const ty = gridTarget?.y;
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) {
      return { ok: false, error: "Select a target tile on the board." };
    }
    const ctx = TacticalTargeting.validateSkillTile(st, member, skillName, tx, ty, skillRank);
    if (!ctx.ok) return { ok: false, error: ctx.message || "Invalid target." };

    if (cfg.brutalRush) {
      const rush = applyBrutalRush(st, member, tx, ty);
      if (!rush.ok) return { ok: false, error: rush.message || "Brutal Rush failed." };
    }

    let resolvedUid = targetUid;
    if (cfg.target === "enemy" && ctx.unit && !TacticalTargeting.isAllyUnit(st, ctx.unit)) {
      resolvedUid = ctx.unit.uid;
    } else if (cfg.target === "ally" && ctx.unit && TacticalTargeting.isAllyUnit(st, ctx.unit)) {
      resolvedUid = ctx.unit.uid;
    } else if (ctx.foes?.length === 1) {
      resolvedUid = ctx.foes[0].uid;
    } else if (ctx.allies?.length === 1) {
      resolvedUid = ctx.allies[0].uid;
    }

    return { ok: true, ctx, targetUid: resolvedUid };
  }

  const ctx = TacticalTargeting.validateSkillTile(st, member, skillName, member.gridX, member.gridY, skillRank);
  if (!ctx.ok) return { ok: false, error: ctx.message || "Invalid cast." };
  return { ok: true, ctx, targetUid: member.uid };
}

export function tacticalFoeTargets(st, tacticalCtx, targetUid, legacyFn) {
  if (!st?.tactical) return legacyFn();
  if (!tacticalCtx) return [];
  return Array.isArray(tacticalCtx.foes) ? tacticalCtx.foes.filter((f) => f && f.hp > 0) : [];
}

export function tacticalPrimaryFoe(st, tacticalCtx, targetUid) {
  if (st?.tactical) {
    if (!tacticalCtx || !Array.isArray(tacticalCtx.foes) || !tacticalCtx.foes.length) return null;
    return (
      tacticalCtx.foes.find((f) => f.uid === targetUid && f.hp > 0) ||
      tacticalCtx.foes.find((f) => f.hp > 0) ||
      null
    );
  }
  return st.foes.find((f) => f.uid === targetUid && f.hp > 0) || null;
}

export function tacticalPrimaryAlly(st, tacticalCtx, targetUid) {
  if (st?.tactical) {
    if (!tacticalCtx || !Array.isArray(tacticalCtx.allies) || !tacticalCtx.allies.length) return null;
    return (
      tacticalCtx.allies.find((a) => a.uid === targetUid && a.hp > 0) ||
      tacticalCtx.allies.find((a) => a.hp > 0) ||
      null
    );
  }
  return (st.party || []).find((m) => m && m.uid === targetUid && m.hp > 0) || null;
}

export function tacticalFriendlyFireAllies(st, tacticalCtx, casterUid) {
  if (!st?.tactical || !tacticalCtx?.allies) return [];
  return tacticalCtx.allies.filter((a) => a && a.uid !== casterUid && a.hp > 0);
}
