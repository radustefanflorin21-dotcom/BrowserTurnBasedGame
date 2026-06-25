/**
 * Enemy leap, charge, pull, and summon placement on the tactical grid.
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

  const ORTHO_DIRS = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];

  function adjacentWalkableTiles(st, x, y, ignoreUid) {
    const grid = TG();
    const occ = grid.buildOccupancy(grid.allCombatUnits(st));
    const obs = grid.obstacleSet(st?.board);
    const out = [];
    for (const [dx, dy] of ORTHO_DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (!grid.isInBounds(nx, ny)) continue;
      const key = grid.coordKey(nx, ny);
      if (obs.has(key)) continue;
      if (occ.has(key) && occ.get(key) !== ignoreUid) continue;
      out.push({ x: nx, y: ny });
    }
    return out;
  }

  function isOrthogonalPathClear(st, x0, y0, x1, y1, ignoreUid) {
    const grid = TG();
    const occ = grid.buildOccupancy(grid.allCombatUnits(st));
    let x = x0;
    let y = y0;
    const dx = Math.sign(x1 - x0);
    const dy = Math.sign(y1 - y0);
    if (dx === 0 && dy === 0) return true;
    while (x !== x1 || y !== y1) {
      if (x !== x1) x += dx;
      else y += dy;
      if (x === x1 && y === y1) break;
      const key = grid.coordKey(x, y);
      if (occ.has(key) && occ.get(key) !== ignoreUid) return false;
    }
    return true;
  }

  /**
   * Pick a free tile beside (targetX, targetY) for caster to land on.
   * @param {object} st
   * @param {object} caster
   * @param {number} targetX
   * @param {number} targetY
   * @param {{ leap?: boolean, charge?: boolean, straightLine?: boolean, ignorePathBlock?: boolean }} cfg
   */
  function findLandingBesideTarget(st, caster, targetX, targetY, cfg) {
    const grid = TG();
    const tt = TT();
    if (!grid || !caster || typeof caster.gridX !== "number" || typeof caster.gridY !== "number") return null;

    const leap = !!(cfg?.leap || cfg?.ignorePathBlock);
    const charge = !!(cfg?.charge || cfg?.straightLine);
    const needLine = leap || charge;

    if (needLine && tt && !tt.isSameOrthogonalLine(caster.gridX, caster.gridY, targetX, targetY)) {
      return null;
    }

    const candidates = adjacentWalkableTiles(st, targetX, targetY, caster.uid);
    if (!candidates.length) return null;

    const casterDist = grid.manhattan(caster.gridX, caster.gridY, targetX, targetY);
    const onLine = candidates.filter(
      (c) =>
        (c.x === caster.gridX || c.y === caster.gridY) &&
        grid.manhattan(caster.gridX, caster.gridY, c.x, c.y) < casterDist
    );

    let pool = candidates;
    if (charge) pool = onLine;
    else if (leap) pool = onLine.length ? onLine : candidates;
    else pool = onLine.length ? onLine : candidates;

    if (!pool.length) return null;

    pool.sort(
      (a, b) =>
        grid.manhattan(a.x, a.y, targetX, targetY) - grid.manhattan(b.x, b.y, targetX, targetY) ||
        grid.manhattan(caster.gridX, caster.gridY, a.x, a.y) -
          grid.manhattan(caster.gridX, caster.gridY, b.x, b.y)
    );

    for (const spot of pool) {
      if (leap || cfg?.ignorePathBlock) return spot;
      if (isOrthogonalPathClear(st, caster.gridX, caster.gridY, spot.x, spot.y, caster.uid)) return spot;
    }
    return null;
  }

  /**
   * @returns {{ moved: boolean, fromX?: number, fromY?: number, x?: number, y?: number }}
   */
  function applyLeapOrCharge(st, caster, target, cfg, hooks) {
    if (!st?.tactical || !caster || !target || typeof target.gridX !== "number") {
      return { moved: false };
    }
    if (typeof caster.gridX !== "number" || typeof caster.gridY !== "number") return { moved: false };

    const spot = findLandingBesideTarget(st, caster, target.gridX, target.gridY, cfg || {});
    if (!spot) return { moved: false };
    if (spot.x === caster.gridX && spot.y === caster.gridY) return { moved: false };

    const fromX = caster.gridX;
    const fromY = caster.gridY;
    if (hooks && typeof hooks.prepareMove === "function") {
      hooks.prepareMove(caster, fromX, fromY, spot.x, spot.y);
    }
    caster.gridX = spot.x;
    caster.gridY = spot.y;
    return { moved: true, fromX, fromY, x: spot.x, y: spot.y };
  }

  /** Nearest free tile beside caster, else closest free within 2 Manhattan steps. */
  function findSummonAdjacentCell(st, caster) {
    const grid = TG();
    if (!grid || !caster || typeof caster.gridX !== "number" || typeof caster.gridY !== "number") {
      return null;
    }
    const occ = grid.buildOccupancy(grid.allCombatUnits(st));
    const obs = grid.obstacleSet(st?.board);
    const cx = caster.gridX;
    const cy = caster.gridY;

    const adjacent = [];
    for (const [dx, dy] of ORTHO_DIRS) {
      const x = cx + dx;
      const y = cy + dy;
      if (!grid.isInBounds(x, y)) continue;
      const key = grid.coordKey(x, y);
      if (obs.has(key) || occ.has(key)) continue;
      adjacent.push({ x, y, d: 1 });
    }
    if (adjacent.length) {
      adjacent.sort((a, b) => a.x - b.x || a.y - b.y);
      return adjacent[0];
    }

    const within2 = [];
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (dx === 0 && dy === 0) continue;
        if (Math.abs(dx) + Math.abs(dy) > 2) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (!grid.isInBounds(x, y)) continue;
        const key = grid.coordKey(x, y);
        if (obs.has(key) || occ.has(key)) continue;
        within2.push({ x, y, d: Math.abs(dx) + Math.abs(dy) });
      }
    }
    if (!within2.length) return null;
    within2.sort((a, b) => a.d - b.d || a.x - b.x || a.y - b.y);
    return within2[0];
  }

  function placeSummonAdjacent(st, summon, caster) {
    const grid = TG();
    if (!grid || !summon || !caster) return false;
    const spot = findSummonAdjacentCell(st, caster);
    if (!spot) return false;
    summon.gridX = spot.x;
    summon.gridY = spot.y;
    return true;
  }

  const api = Object.freeze({
    adjacentWalkableTiles,
    findLandingBesideTarget,
    applyLeapOrCharge,
    findSummonAdjacentCell,
    placeSummonAdjacent
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.EnemyTacticalMovement = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : global);
