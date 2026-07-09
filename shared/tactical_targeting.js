/**
 * Tactical grid targeting: line of sight, range, AoE tile sets.
 */
(function (root) {
  const TG = () =>
    typeof TacticalGrid !== "undefined"
      ? TacticalGrid
      : typeof require !== "undefined"
        ? require("./tactical_grid.js")
        : null;
  const ST = () =>
    typeof TacticalSkillTargeting !== "undefined"
      ? TacticalSkillTargeting
      : typeof require !== "undefined"
        ? require("./tactical_skill_targeting.js")
        : null;

  function obstacleSet(st) {
    const grid = TG();
    const board = st?.board || (grid ? grid.createBoard() : { obstacles: [] });
    if (grid && typeof grid.obstacleSet === "function") return grid.obstacleSet(board);
    const set = new Set();
    const list = board && Array.isArray(board.obstacles) ? board.obstacles : [];
    list.forEach((o) => {
      if (typeof o === "string") set.add(o);
      else if (o && Number.isFinite(o.x) && Number.isFinite(o.y)) {
        set.add(grid ? grid.coordKey(o.x, o.y) : `${o.x},${o.y}`);
      }
    });
    return set;
  }

  function buildOccupancy(st) {
    const grid = TG();
    if (!grid) return new Map();
    return grid.buildOccupancy(grid.allCombatUnits(st));
  }

  function unitAt(st, x, y) {
    const grid = TG();
    if (!grid) return null;
    const units = grid.allCombatUnits(st).filter((u) => u && u.hp > 0);
    return grid.unitOccupyingCell(units, x, y);
  }

  function isAllyUnit(st, unit) {
    return (st.party || []).some((m) => m && m.uid === unit.uid);
  }

  /** Supercover line cells between (x0,y0) and (x1,y1), excluding endpoints. */
  function lineCellsBetween(x0, y0, x1, y1) {
    const cells = [];
    let x0i = Math.floor(x0);
    let y0i = Math.floor(y0);
    const x1i = Math.floor(x1);
    const y1i = Math.floor(y1);
    const dx = Math.abs(x1i - x0i);
    const dy = Math.abs(y1i - y0i);
    const sx = x0i < x1i ? 1 : -1;
    const sy = y0i < y1i ? 1 : -1;
    let err = dx - dy;
    while (x0i !== x1i || y0i !== y1i) {
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0i += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0i += sy;
      }
      if (x0i === x1i && y0i === y1i) break;
      cells.push({ x: x0i, y: y0i });
    }
    return cells;
  }

  function hasLineOfSight(st, fromX, fromY, toX, toY, opts) {
    const grid = TG();
    const passUnits = opts && opts.passThroughUnits;
    if (!grid || !grid.isInBounds(fromX, fromY) || !grid.isInBounds(toX, toY)) return false;
    if (fromX === toX && fromY === toY) return true;
    const occ = passUnits ? null : buildOccupancy(st);
    const obs = obstacleSet(st);
    let passThroughUid = opts && opts.passThroughUnitUid != null ? opts.passThroughUnitUid : null;
    if (passThroughUid == null && !(opts && opts.strictFootprintLos)) {
      const targetUnit = unitAt(st, toX, toY);
      if (targetUnit) {
        const fp = grid.getUnitFootprint(targetUnit);
        if (fp.w > 1 || fp.h > 1) passThroughUid = targetUnit.uid;
      }
    }
    const between = lineCellsBetween(fromX, fromY, toX, toY);
    for (const c of between) {
      const key = grid.coordKey(c.x, c.y);
      if (obs.has(key)) return false;
      if (occ && occ.has(key)) {
        if (passThroughUid != null && occ.get(key) === passThroughUid) continue;
        return false;
      }
    }
    return true;
  }

  function isSameOrthogonalLine(ax, ay, bx, by) {
    return ax === bx || ay === by;
  }

  function manhattan(ax, ay, bx, by) {
    const grid = TG();
    return grid ? grid.manhattan(ax, ay, bx, by) : Math.abs(ax - bx) + Math.abs(ay - by);
  }

  function isInRange(casterX, casterY, tx, ty, rangeMin, rangeMax) {
    const d = manhattan(casterX, casterY, tx, ty);
    return d >= rangeMin && d <= rangeMax;
  }

  function isUnitInSkillRange(caster, unit, rangeMin, rangeMax) {
    const grid = TG();
    if (!grid || !caster || !unit) return false;
    if (typeof caster.gridX !== "number" || typeof caster.gridY !== "number") return false;
    const d = grid.minManhattanBetweenUnits(caster, unit);
    return d >= rangeMin && d <= rangeMax;
  }

  /** True if caster has LOS to at least one cell of the target unit's footprint. */
  function hasLineOfSightToUnit(st, fromX, fromY, unit, opts) {
    const grid = TG();
    if (!grid || !unit) return false;
    const cells = grid.getUnitOccupiedCells(unit);
    if (!cells.length) return false;
    const losOpts = { ...(opts || {}), passThroughUnitUid: unit.uid };
    return cells.some((c) => hasLineOfSight(st, fromX, fromY, c.x, c.y, losOpts));
  }

  /** True if any footprint cell is in range and reachable; if so the whole footprint is targetable. */
  function isUnitTargetable(st, caster, unit, rangeMin, rangeMax, opts) {
    if (!isUnitInSkillRange(caster, unit, rangeMin, rangeMax)) return false;
    return hasLineOfSightToUnit(st, caster.gridX, caster.gridY, unit, opts && opts.losOpts);
  }

  /** Add every footprint cell for units whose closest cell is within skill range. */
  function expandRangeTilesWithUnitFootprints(st, caster, tiles, rangeMin, rangeMax, opts) {
    const grid = TG();
    if (!grid || !caster) return tiles || [];
    const losOpts = opts && opts.losOpts;
    const requireLos = !(opts && opts.skipLos);
    const seen = new Set((tiles || []).map((t) => grid.coordKey(t.x, t.y)));
    const out = (tiles || []).slice();
    const units = grid.allCombatUnits(st).filter((u) => u && u.hp > 0);
    for (const u of units) {
      if (!isUnitTargetable(st, caster, u, rangeMin, rangeMax, { losOpts })) continue;
      for (const c of grid.getUnitOccupiedCells(u)) {
        const key = grid.coordKey(c.x, c.y);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ x: c.x, y: c.y });
      }
    }
    return out;
  }

  /** Best tile on a unit to use as the skill anchor (prefer in-range cells closest to caster). */
  function pickSkillCastCellForUnit(st, caster, unit, skillName, skillRank) {
    const grid = TG();
    const stCfg = ST();
    if (!grid || !caster || !unit) return null;
    const cfg = stCfg ? stCfg.getSkillTargeting(skillName) : null;
    if (!cfg) return null;
    const rMin = typeof cfg.rangeMin === "number" ? cfg.rangeMin : 1;
    const rMax = typeof cfg.rangeMax === "number" ? cfg.rangeMax : 1;
    const losOpts = cfg.brutalRush ? { passThroughUnits: true } : null;
    if (!isUnitInSkillRange(caster, unit, rMin, rMax)) return null;
    if (!hasLineOfSightToUnit(st, caster.gridX, caster.gridY, unit, losOpts)) return null;
    const cx = caster.gridX;
    const cy = caster.gridY;
    const fp = grid.getUnitFootprint(unit);
    const multiTile = fp.w > 1 || fp.h > 1;
    const cells = grid.getUnitOccupiedCells(unit);
    let best = null;
    let bestD = Infinity;
    for (const c of cells) {
      if (cfg.straightLine && !isSameOrthogonalLine(cx, cy, c.x, c.y)) continue;
      if (!multiTile) {
        const losOptsCell = { ...(losOpts || {}), passThroughUnitUid: unit.uid };
        if (!hasLineOfSight(st, cx, cy, c.x, c.y, losOptsCell)) continue;
      }
      const d = manhattan(cx, cy, c.x, c.y);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    return best;
  }

  function cross1Tiles(cx, cy, extraOrthogonal) {
    const grid = TG();
    const out = [{ x: cx, y: cy }];
    const dirs = [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0]
    ];
    const used = new Set([grid.coordKey(cx, cy)]);
    if (extraOrthogonal <= 0) return out;
    /** Expand by Manhattan rings on orthogonal adjacency only (cross + extended arms). */
    let frontier = [{ x: cx, y: cy }];
    for (let ring = 0; ring < extraOrthogonal; ring++) {
      const next = [];
      for (const f of frontier) {
        for (const [dx, dy] of dirs) {
          const nx = f.x + dx;
          const ny = f.y + dy;
          if (!grid.isInBounds(nx, ny)) continue;
          const key = grid.coordKey(nx, ny);
          if (used.has(key)) continue;
          used.add(key);
          const cell = { x: nx, y: ny };
          out.push(cell);
          next.push(cell);
        }
      }
      frontier = next;
    }
    return out;
  }

  function box3x3(cx, cy) {
    const grid = TG();
    const out = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (grid.isInBounds(x, y)) out.push({ x, y });
      }
    }
    return out;
  }

  function collectAoeTiles(cfg, skillRank, skillName, cx, cy, st) {
    const stCfg = ST();
    const aoe = stCfg ? stCfg.resolveAoeType(cfg, skillRank, skillName) : cfg.aoe || "single";
    if (aoe === "all_enemies" || aoe === "all_allies") return null;
    if (aoe === "none" || aoe === "single") return [{ x: cx, y: cy }];
    if (aoe === "3x3") return box3x3(cx, cy);
    if (aoe === "cross1_cap2") return cross1Tiles(cx, cy, 2);
    if (aoe === "cross1_rank") {
      const extra = stCfg ? stCfg.cross1ExtraCountForRank(skillRank) : 1;
      return cross1Tiles(cx, cy, extra);
    }
    return [{ x: cx, y: cy }];
  }

  function getUnitsOnTiles(st, tiles) {
    const grid = TG();
    const allies = [];
    const foes = [];
    const seen = new Set();
    for (const t of tiles || []) {
      const u = unitAt(st, t.x, t.y);
      if (!u || seen.has(u.uid)) continue;
      seen.add(u.uid);
      if (isAllyUnit(st, u)) allies.push(u);
      else foes.push(u);
    }
    return { allies, foes };
  }

  function enumerateRangeTiles(casterX, casterY, rangeMin, rangeMax, st) {
    const grid = TG();
    const out = [];
    if (!grid) return out;
    for (let y = 0; y < grid.GRID_HEIGHT; y++) {
      for (let x = 0; x < grid.GRID_WIDTH; x++) {
        if (!isInRange(casterX, casterY, x, y, rangeMin, rangeMax)) continue;
        if (!hasLineOfSight(st, casterX, casterY, x, y)) continue;
        out.push({ x, y });
      }
    }
    return out;
  }

  /**
   * Validate a tile click for a skill cast.
   * @returns {{ ok: boolean, message?: string, tiles?: {x:number,y:number}[], foes?: object[], allies?: object[] }}
   */
  function validateSkillTile(st, caster, skillName, tx, ty, skillRank) {
    const grid = TG();
    const stCfg = ST();
    const cfg = stCfg ? stCfg.getSkillTargeting(skillName) : null;
    if (!grid || !caster || typeof caster.gridX !== "number" || typeof caster.gridY !== "number") {
      return { ok: false, message: "Caster is not on the board." };
    }
    if (!cfg) return { ok: false, message: "Unknown skill targeting." };

    const cx = caster.gridX;
    const cy = caster.gridY;

    if (cfg.target === "self") {
      return { ok: true, tiles: [{ x: cx, y: cy }], foes: [], allies: [caster] };
    }
    if (cfg.target === "global_enemies") {
      const foes = (st.foes || []).filter((f) => f && f.hp > 0);
      return { ok: true, tiles: [], foes, allies: [] };
    }
    if (cfg.target === "global_allies") {
      const allies = (st.party || []).filter((m) => m && m.hp > 0);
      return { ok: true, tiles: [], foes: [], allies };
    }

    if (!grid.isInBounds(tx, ty)) return { ok: false, message: "Invalid tile." };

    const rMin = typeof cfg.rangeMin === "number" ? cfg.rangeMin : 1;
    const rMax = typeof cfg.rangeMax === "number" ? cfg.rangeMax : 1;
    const losOpts = cfg.brutalRush ? { passThroughUnits: true } : null;
    const unit = unitAt(st, tx, ty);

    if (unit) {
      const fp = grid.getUnitFootprint(unit);
      const multiTile = fp.w > 1 || fp.h > 1;
      if (!isUnitInSkillRange(caster, unit, rMin, rMax)) {
        return { ok: false, message: "Target is out of range." };
      }
      if (cfg.straightLine) {
        const onLine = grid.getUnitOccupiedCells(unit).some((c) => isSameOrthogonalLine(cx, cy, c.x, c.y));
        if (!onLine) return { ok: false, message: "Must target in a straight line." };
      }
      if (multiTile) {
        if (!hasLineOfSightToUnit(st, cx, cy, unit, losOpts)) {
          return { ok: false, message: "No line of sight." };
        }
      } else if (!hasLineOfSight(st, cx, cy, tx, ty, losOpts)) {
        return { ok: false, message: "No line of sight." };
      }
    } else {
      if (!isInRange(cx, cy, tx, ty, rMin, rMax)) {
        return { ok: false, message: "Target is out of range." };
      }
      if (cfg.straightLine && !isSameOrthogonalLine(cx, cy, tx, ty)) {
        return { ok: false, message: "Must target in a straight line." };
      }
      if (!hasLineOfSight(st, cx, cy, tx, ty, losOpts)) {
        return { ok: false, message: "No line of sight." };
      }
    }

    const aoeTiles = collectAoeTiles(cfg, skillRank, skillName, tx, ty, st);
    const aoeType = stCfg ? stCfg.resolveAoeType(cfg, skillRank, skillName) : cfg.aoe || "single";
    let allies = [];
    let foes = [];
    if (aoeType === "all_enemies") {
      foes = (st.foes || []).filter((f) => f && f.hp > 0);
    } else if (aoeType === "all_allies") {
      allies = (st.party || []).filter((m) => m && m.hp > 0);
    } else {
      const units = getUnitsOnTiles(st, aoeTiles);
      allies = units.allies;
      foes = units.foes;
    }

    return { ok: true, tiles: aoeTiles, foes, allies, center: { x: tx, y: ty }, unit };
  }

  function getSkillRangeTiles(st, caster, skillName) {
    const grid = TG();
    const stCfg = ST();
    const cfg = stCfg ? stCfg.getSkillTargeting(skillName) : null;
    if (!grid || !caster || !cfg) return [];
    if (cfg.target === "self" || cfg.target === "global_enemies" || cfg.target === "global_allies") {
      return [];
    }
    const rMin = typeof cfg.rangeMin === "number" ? cfg.rangeMin : 1;
    const rMax = typeof cfg.rangeMax === "number" ? cfg.rangeMax : 1;
    const losOpts = cfg.brutalRush ? { passThroughUnits: true } : null;
    let tiles = enumerateRangeTiles(caster.gridX, caster.gridY, rMin, rMax, st);
    if (cfg.straightLine) {
      tiles = tiles.filter(
        (t) =>
          (t.x === caster.gridX || t.y === caster.gridY) &&
          hasLineOfSight(st, caster.gridX, caster.gridY, t.x, t.y)
      );
    }
    tiles = expandRangeTilesWithUnitFootprints(st, caster, tiles, rMin, rMax, {
      losOpts,
      skipLos: false
    });
    if (cfg.straightLine) {
      const cx = caster.gridX;
      const cy = caster.gridY;
      tiles = tiles.filter((t) => t.x === cx || t.y === cy);
    }
    return tiles;
  }

  const api = Object.freeze({
    hasLineOfSight,
    hasLineOfSightToUnit,
    isInRange,
    isUnitInSkillRange,
    isUnitTargetable,
    isSameOrthogonalLine,
    cross1Tiles,
    box3x3,
    collectAoeTiles,
    getUnitsOnTiles,
    enumerateRangeTiles,
    expandRangeTilesWithUnitFootprints,
    pickSkillCastCellForUnit,
    validateSkillTile,
    getSkillRangeTiles,
    unitAt,
    isAllyUnit
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.TacticalTargeting = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : global);
