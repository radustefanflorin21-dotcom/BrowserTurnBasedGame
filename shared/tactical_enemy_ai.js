/**
 * Role-aware tactical enemy movement and focus targeting.
 */
(function (root) {
  const TG = () =>
    typeof TacticalGrid !== "undefined"
      ? TacticalGrid
      : typeof require !== "undefined"
        ? require("./tactical_grid.js")
        : null;
  const TT = () =>
    typeof TacticalTargeting !== "undefined"
      ? TacticalTargeting
      : typeof require !== "undefined"
        ? require("./tactical_targeting.js")
        : null;
  const TER = () =>
    typeof TacticalEnemyResolve !== "undefined"
      ? TacticalEnemyResolve
      : typeof require !== "undefined"
        ? require("./tactical_enemy_resolve.js")
        : null;
  const ET = () =>
    typeof EnemyTacticalTargeting !== "undefined"
      ? EnemyTacticalTargeting
      : typeof require !== "undefined"
        ? require("./enemy_tactical_targeting.js")
        : null;

  const MELEE_ROLES = new Set(["tank", "bruiser", "assassin"]);
  const RANGED_ROLES = new Set(["mage", "controller", "support", "summoner", "harasser", "buffer"]);

  const ROLE_PICK_RULE = {
    assassin: "lowest_hp",
    bruiser: "tank",
    tank: "tank",
    mage: "lowest_hp",
    controller: "lowest_hp",
    support: "lowest_hp",
    summoner: "lowest_hp",
    harasser: "lowest_hp",
    buffer: "lowest_hp"
  };

  function livingParty(st) {
    return (st.party || []).filter((m) => m && m.hp > 0 && typeof m.gridX === "number");
  }

  function livingFoeAllies(st, foe) {
    return (st.foes || []).filter(
      (f) => f && f.hp > 0 && f.uid !== foe.uid && typeof f.gridX === "number"
    );
  }

  function resolvePickRule(role, override) {
    if (override && override !== "bruiser") return override;
    return ROLE_PICK_RULE[String(role || "bruiser").toLowerCase()] || "nearest";
  }

  function pickFocusTarget(st, foe, role, rng, ruleOverride) {
    const rule = resolvePickRule(role, ruleOverride);
    const basic = ET().getBasicAttackForRole(role);
    const inRange = TER().pickBestPlayer(st, foe, basic, rule, rng);
    if (inRange) return inRange;

    const party = livingParty(st);
    if (!party.length) return null;
    const hpFrac = (m) => m.hp / Math.max(1, m.maxHp);
    const grid = TG();

    if (rule === "lowest_hp" || rule === "weakest" || rule === "assassin" || rule === "mage" || rule === "controller") {
      return party.reduce((a, b) => (hpFrac(a) <= hpFrac(b) ? a : b));
    }
    if (rule === "tank" || rule === "bruiser" || rule === "highest_hp") {
      return party.reduce((a, b) => (hpFrac(a) >= hpFrac(b) ? a : b));
    }
    if (rule === "highest_damage") {
      return party.reduce((a, b) => {
        const sa = (a.str || 0) + (a.kind === "hero" ? 5 : 0);
        const sb = (b.str || 0) + (b.kind === "hero" ? 5 : 0);
        return sa >= sb ? a : b;
      });
    }
    let best = party[0];
    let bestD = grid.minManhattanBetweenUnits(foe, best);
    for (const m of party) {
      const d = grid.minManhattanBetweenUnits(foe, m);
      if (d < bestD) {
        bestD = d;
        best = m;
      }
    }
    return best;
  }

  function getPositioningConfig(scriptId, role, skillCd) {
    const basic = ET().getBasicAttackForRole(role);
    if (MELEE_ROLES.has(role)) return { mode: "melee", cfg: basic };

    let best = null;
    if (skillCd && scriptId) {
      for (const key of Object.keys(skillCd)) {
        if (skillCd[key] > 0) continue;
        const cfg = ET().getEnemySkillTargeting(scriptId, key, role);
        if (cfg.summonAdjacent || cfg.target === "self" || cfg.target === "foe_ally") continue;
        if (cfg.target !== "player" && cfg.target !== "global_players" && cfg.aoe !== "global_players") continue;
        const rMax = typeof cfg.rangeMax === "number" ? cfg.rangeMax : basic.rangeMax;
        if (!best || rMax > (best.rangeMax || 0)) best = cfg;
      }
    }
    return { mode: "ranged", cfg: best || basic };
  }

  function hasLos(st, x, y, tx, ty) {
    return TT().hasLineOfSight(st, x, y, tx, ty);
  }

  function scoreDestination(st, cell, focus, mode, cfg, foe) {
    const grid = TG();
    const d = grid.minManhattanBetweenUnits(
      { gridX: cell.x, gridY: cell.y, gridFootprintW: foe ? grid.getUnitFootprint(foe).w : 1, gridFootprintH: foe ? grid.getUnitFootprint(foe).h : 1 },
      focus
    );
    if (mode === "melee") {
      const probe = { gridX: cell.x, gridY: cell.y, gridFootprintW: foe ? grid.getUnitFootprint(foe).w : 1, gridFootprintH: foe ? grid.getUnitFootprint(foe).h : 1 };
      if (grid.areUnitsOrthogonalAdjacent(probe, focus)) return 1000;
      const lineBonus = cell.x === focus.gridX || cell.y === focus.gridY ? 20 : 0;
      return 800 - d * 45 + lineBonus;
    }
    const rMin = typeof cfg.rangeMin === "number" ? cfg.rangeMin : 1;
    const rMax = typeof cfg.rangeMax === "number" ? cfg.rangeMax : 4;
    const los = hasLos(st, cell.x, cell.y, focus.gridX, focus.gridY);
    if (d > rMax || !los) return 280 - d * 30;
    if (d < rMin) return 140 - (rMin - d) * 55;
    const ideal = Math.min(rMax, Math.max(rMin + 1, 3));
    let score = 620 - Math.abs(d - ideal) * 40;
    if (los && d === ideal) score += 90;
    return score;
  }

  function pickSupportDestination(st, foe, reachable) {
    const allies = livingFoeAllies(st, foe);
    if (!allies.length) return null;
    const wounded = allies.reduce((a, b) =>
      a.hp / Math.max(1, a.maxHp) <= b.hp / Math.max(1, b.maxHp) ? a : b
    );
    if (wounded.hp / Math.max(1, wounded.maxHp) > 0.72) return null;
    const grid = TG();
    let best = null;
    let bestD = grid.manhattan(foe.gridX, foe.gridY, wounded.gridX, wounded.gridY);
    for (const cell of reachable) {
      const d = grid.manhattan(cell.x, cell.y, wounded.gridX, wounded.gridY);
      if (d < bestD) {
        bestD = d;
        best = cell;
      }
    }
    return best;
  }

  function pickBestDestination(st, foe, focus, mode, cfg, role, reachable) {
    const grid = TG();
    if (role === "support") {
      const support = pickSupportDestination(st, foe, reachable);
      if (support) return support;
    }

    let best = null;
    let bestScore = -Infinity;
    for (const cell of reachable) {
      const score = scoreDestination(st, cell, focus, mode, cfg, foe);
      if (score > bestScore) {
        bestScore = score;
        best = cell;
      }
    }
    if (best) return best;

    return reachable.reduce((a, b) => {
      const probeA = { gridX: a.x, gridY: a.y, gridFootprintW: grid.getUnitFootprint(foe).w, gridFootprintH: grid.getUnitFootprint(foe).h };
      const probeB = { gridX: b.x, gridY: b.y, gridFootprintW: grid.getUnitFootprint(foe).w, gridFootprintH: grid.getUnitFootprint(foe).h };
      const da = grid.minManhattanBetweenUnits(probeA, focus);
      const db = grid.minManhattanBetweenUnits(probeB, focus);
      return da <= db ? a : b;
    }, null);
  }

  function shouldSkipMove(foe, focus, mode, cfg, st) {
    const grid = TG();
    if (mode === "melee") {
      return grid.areUnitsOrthogonalAdjacent(foe, focus);
    }
    const d = grid.minManhattanBetweenUnits(foe, focus);
    const rMin = typeof cfg.rangeMin === "number" ? cfg.rangeMin : 1;
    const rMax = typeof cfg.rangeMax === "number" ? cfg.rangeMax : 4;
    const los = hasLos(st, foe.gridX, foe.gridY, focus.gridX, focus.gridY);
    if (d >= rMin && d <= rMax && los) {
      const ideal = Math.min(rMax, Math.max(rMin + 1, 3));
      return Math.abs(d - ideal) <= 1;
    }
    return false;
  }

  /**
   * @param {object} opts { role, scriptId, rng, rule }
   * @returns {{ moved: boolean, x?: number, y?: number, cost?: number, log?: string }}
   */
  function planTacticalEnemyMove(st, foe, opts) {
    if (!st?.tactical || !foe || foe.hp <= 0 || typeof foe.gridX !== "number") return { moved: false };
    if (!livingParty(st).length) return { moved: false };

    const role = opts?.role || "bruiser";
    const scriptId = opts?.scriptId || "";
    const skillCd = foe.combat?.skillCd || {};
    const focus = pickFocusTarget(st, foe, role, opts?.rng || null, opts?.rule);
    if (!focus) return { moved: false };

    const { mode, cfg } = getPositioningConfig(scriptId, role, skillCd);
    if (shouldSkipMove(foe, focus, mode, cfg, st)) return { moved: false };

    const grid = TG();
    const occ = grid.buildOccupancy(grid.allCombatUnits(st));
    const mp = typeof foe.movePoints === "number" ? foe.movePoints : grid.DEFAULT_MOVE_POINTS;
    const fp = grid.getUnitFootprint(foe);
    const reachable = grid.bfsReachable(foe.gridX, foe.gridY, mp, st.board, occ, foe.uid, fp.w, fp.h);
    if (!reachable.length) return { moved: false };

    const dest = pickBestDestination(st, foe, focus, mode, cfg, role, reachable);
    if (!dest || (dest.x === foe.gridX && dest.y === foe.gridY)) return { moved: false };

    return {
      moved: true,
      x: dest.x,
      y: dest.y,
      cost: dest.cost
    };
  }

  const api = Object.freeze({
    MELEE_ROLES,
    RANGED_ROLES,
    ROLE_PICK_RULE,
    livingParty,
    pickFocusTarget,
    planTacticalEnemyMove
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.TacticalEnemyAi = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : global);
