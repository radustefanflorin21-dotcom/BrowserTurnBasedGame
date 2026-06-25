/**
 * 8×8 tactical board helpers (client + server).
 * Columns A–H map to x=0..7; row 1 = y=0 (bottom) through row 8 = y=7 (top) in UI terms.
 */
(function (root) {
  const GRID_SIZE = 8;
  const ALLY_COL_MIN = 0;
  const ALLY_COL_MAX = 1;
  const ENEMY_COL_MIN = 6;
  const ENEMY_COL_MAX = 7;
  const DEFAULT_MOVE_POINTS = 3;

  const FRONT_ROLES = new Set(["tank", "bruiser"]);
  const BACK_ROLES = new Set(["mage", "controller", "support", "summoner", "buffer"]);
  const MID_ROLES = new Set(["assassin", "harasser", "controller"]);

  function colToLetter(x) {
    return String.fromCharCode(65 + Math.max(0, Math.min(7, x)));
  }

  function coordKey(x, y) {
    return `${x},${y}`;
  }

  function parseCoordKey(key) {
    if (typeof key !== "string") return null;
    const parts = key.split(",");
    if (parts.length !== 2) return null;
    const x = Number(parts[0]);
    const y = Number(parts[1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x: Math.floor(x), y: Math.floor(y) };
  }

  function isInBounds(x, y) {
    return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
  }

  function isAllyColumn(x) {
    return x >= ALLY_COL_MIN && x <= ALLY_COL_MAX;
  }

  function isEnemyColumn(x) {
    return x >= ENEMY_COL_MIN && x <= ENEMY_COL_MAX;
  }

  function manhattan(ax, ay, bx, by) {
    return Math.abs(ax - bx) + Math.abs(ay - by);
  }

  function areOrthogonalAdjacent(ax, ay, bx, by) {
    return manhattan(ax, ay, bx, by) === 1;
  }

  function createBoard() {
    return {
      width: GRID_SIZE,
      height: GRID_SIZE,
      obstacles: []
    };
  }

  function obstacleSet(board) {
    const set = new Set();
    const list = board && Array.isArray(board.obstacles) ? board.obstacles : [];
    list.forEach((o) => {
      if (typeof o === "string") set.add(o);
      else if (o && Number.isFinite(o.x) && Number.isFinite(o.y)) set.add(coordKey(o.x, o.y));
    });
    return set;
  }

  function getUnitFootprint(unit) {
    const w = unit?.gridFootprintW;
    const h = unit?.gridFootprintH;
    return {
      w: Math.max(1, Math.min(GRID_SIZE, Math.floor(Number.isFinite(w) ? w : 1))),
      h: Math.max(1, Math.min(GRID_SIZE, Math.floor(Number.isFinite(h) ? h : 1)))
    };
  }

  function footprintCells(ax, ay, fw, fh) {
    const cells = [];
    for (let dy = 0; dy < fh; dy++) {
      for (let dx = 0; dx < fw; dx++) {
        const x = ax + dx;
        const y = ay + dy;
        if (isInBounds(x, y)) cells.push({ x, y });
      }
    }
    return cells;
  }

  function getUnitOccupiedCells(unit) {
    if (!unit || typeof unit.gridX !== "number" || typeof unit.gridY !== "number") return [];
    const { w, h } = getUnitFootprint(unit);
    return footprintCells(unit.gridX, unit.gridY, w, h);
  }

  function isFootprintInBounds(ax, ay, fw, fh) {
    return ax >= 0 && ay >= 0 && ax + fw <= GRID_SIZE && ay + fh <= GRID_SIZE;
  }

  function isFootprintPlaceable(ax, ay, fw, fh, board, occupancy, ignoreUid) {
    if (!isFootprintInBounds(ax, ay, fw, fh)) return false;
    const obs = obstacleSet(board);
    for (const c of footprintCells(ax, ay, fw, fh)) {
      const key = coordKey(c.x, c.y);
      if (obs.has(key)) return false;
      const uid = occupancy.get(key);
      if (uid != null && uid !== ignoreUid) return false;
    }
    return true;
  }

  function claimFootprintOccupancy(ax, ay, fw, fh, uid, occupancy) {
    footprintCells(ax, ay, fw, fh).forEach((c) => {
      occupancy.set(coordKey(c.x, c.y), uid);
    });
  }

  function firstFreeFootprintCell(cells, fw, fh, occupancy, ignoreUid) {
    for (const c of cells) {
      if (isFootprintPlaceable(c.x, c.y, fw, fh, null, occupancy, ignoreUid)) {
        return { x: c.x, y: c.y };
      }
    }
    return null;
  }

  function unitOccupyingCell(units, x, y) {
    for (const u of units || []) {
      if (!u || u.hp <= 0) continue;
      if (getUnitOccupiedCells(u).some((c) => c.x === x && c.y === y)) return u;
    }
    return null;
  }

  function minManhattanBetweenUnits(unitA, unitB) {
    const cellsA = getUnitOccupiedCells(unitA);
    const cellsB = getUnitOccupiedCells(unitB);
    if (!cellsA.length || !cellsB.length) return Infinity;
    let best = Infinity;
    for (const a of cellsA) {
      for (const b of cellsB) {
        best = Math.min(best, manhattan(a.x, a.y, b.x, b.y));
      }
    }
    return best;
  }

  function areUnitsOrthogonalAdjacent(unitA, unitB) {
    const cellsA = getUnitOccupiedCells(unitA);
    const cellsB = getUnitOccupiedCells(unitB);
    for (const a of cellsA) {
      for (const b of cellsB) {
        if (areOrthogonalAdjacent(a.x, a.y, b.x, b.y)) return true;
      }
    }
    return false;
  }

  function buildOccupancy(units) {
    const map = new Map();
    (units || []).forEach((u) => {
      if (!u || u.hp <= 0) return;
      if (typeof u.gridX !== "number" || typeof u.gridY !== "number") return;
      const { w, h } = getUnitFootprint(u);
      claimFootprintOccupancy(u.gridX, u.gridY, w, h, u.uid, map);
    });
    return map;
  }

  function isCellWalkable(x, y, board, occupancy, ignoreUid) {
    if (!isInBounds(x, y)) return false;
    const occ = occupancy || new Map();
    const key = coordKey(x, y);
    if (obstacleSet(board).has(key)) return false;
    const uid = occ.get(key);
    if (uid == null) return true;
    return ignoreUid != null && uid === ignoreUid;
  }

  function enumerateAllySpawnCells() {
    const out = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = ALLY_COL_MIN; x <= ALLY_COL_MAX; x++) {
        out.push({ x, y });
      }
    }
    return out;
  }

  function enumerateEnemySpawnCells() {
    const out = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = ENEMY_COL_MIN; x <= ENEMY_COL_MAX; x++) {
        out.push({ x, y });
      }
    }
    return out;
  }

  /** Valid anchor tiles for multi-cell foes that must still overlap the enemy side (cols G–H). */
  function enumerateEnemyPlacementAnchorCells(fw, fh) {
    const footprintW = Math.max(1, Math.floor(fw || 1));
    const footprintH = Math.max(1, Math.floor(fh || 1));
    if (footprintW === 1 && footprintH === 1) return enumerateEnemySpawnCells();
    const out = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (!isFootprintInBounds(x, y, footprintW, footprintH)) continue;
        let overlapsEnemy = false;
        for (const c of footprintCells(x, y, footprintW, footprintH)) {
          if (isEnemyColumn(c.x)) {
            overlapsEnemy = true;
            break;
          }
        }
        if (overlapsEnemy) out.push({ x, y });
      }
    }
    return out;
  }

  function placementCellsForUnit(unit, side) {
    const { w, h } = getUnitFootprint(unit);
    if (side === "foe" && (w > 1 || h > 1)) {
      return enumerateEnemyPlacementAnchorCells(w, h);
    }
    if (side === "ally") return enumerateAllySpawnCells();
    return enumerateEnemySpawnCells();
  }

  function firstFreeCell(cells, occupancy) {
    for (const c of cells) {
      if (!occupancy.has(coordKey(c.x, c.y))) return { ...c };
    }
    return null;
  }

  function firstFreeCellForUnit(cells, unit, occupancy) {
    const { w, h } = getUnitFootprint(unit);
    if (w === 1 && h === 1) {
      const spot = firstFreeCell(cells, occupancy);
      return spot;
    }
    return firstFreeFootprintCell(cells, w, h, occupancy, unit?.uid);
  }

  function roleColumnPreference(roleKey) {
    const r = String(roleKey || "").toLowerCase();
    if (FRONT_ROLES.has(r)) return ENEMY_COL_MIN;
    if (BACK_ROLES.has(r)) return ENEMY_COL_MAX;
    if (MID_ROLES.has(r)) return ENEMY_COL_MIN + 1;
    return ENEMY_COL_MIN;
  }

  function autoPlaceUnits(units, cells, preferredCols, cellsForUnit) {
    const occupancy = new Map();
    const placed = [];
    const list = Array.isArray(units) ? units.slice() : [];
    list.sort((a, b) => {
      const pa = preferredCols ? preferredCols(a) : 0;
      const pb = preferredCols ? preferredCols(b) : 0;
      return pa - pb;
    });
    const resolveCells = (u) => (typeof cellsForUnit === "function" ? cellsForUnit(u) : cells);
    for (const u of list) {
      if (!u) continue;
      const { w, h } = getUnitFootprint(u);
      const unitCells = resolveCells(u).slice().sort((a, b) => {
        const prefCol = preferredCols ? preferredCols(u) : null;
        const ca = prefCol != null ? Math.abs(a.x - prefCol) : a.x;
        const cb = prefCol != null ? Math.abs(b.x - prefCol) : b.x;
        if (ca !== cb) return ca - cb;
        return a.y - b.y;
      });
      let spot = firstFreeFootprintCell(unitCells, w, h, occupancy, u.uid);
      if (!spot) continue;
      u.gridX = spot.x;
      u.gridY = spot.y;
      claimFootprintOccupancy(spot.x, spot.y, w, h, u.uid, occupancy);
      placed.push(u);
    }
    return placed;
  }

  function autoPlaceAllies(party) {
    const cells = enumerateAllySpawnCells();
    return autoPlaceUnits(party, cells, () => ALLY_COL_MIN);
  }

  function autoPlaceEnemies(foes, roleForFoe) {
    const cells = enumerateEnemySpawnCells();
    return autoPlaceUnits(
      foes,
      cells,
      (f) => roleColumnPreference(roleForFoe ? roleForFoe(f) : "bruiser"),
      (u) => placementCellsForUnit(u, "foe")
    );
  }

  function reconstructPath(parent, end) {
    const path = [];
    let cur = end;
    while (cur) {
      path.push({ x: cur.x, y: cur.y });
      cur = parent.get(coordKey(cur.x, cur.y));
    }
    path.reverse();
    return path;
  }

  /** Shortest orthogonal path for movement preview (may append unwalkable goal for display). */
  function shortestPath(fromX, fromY, toX, toY, board, occupancy, ignoreUid) {
    if (fromX === toX && fromY === toY) return [{ x: fromX, y: fromY }];
    const parent = new Map();
    parent.set(coordKey(fromX, fromY), null);
    const queue = [{ x: fromX, y: fromY }];
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ];
    let goal = null;
    while (queue.length) {
      const cur = queue.shift();
      if (cur.x === toX && cur.y === toY) {
        goal = cur;
        break;
      }
      for (const [dx, dy] of dirs) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        const key = coordKey(nx, ny);
        if (parent.has(key)) continue;
        if (!isCellWalkable(nx, ny, board, occupancy, ignoreUid)) continue;
        parent.set(key, cur);
        queue.push({ x: nx, y: ny });
      }
    }
    if (goal) return reconstructPath(parent, goal);

    let bestKey = coordKey(fromX, fromY);
    let bestDist = manhattan(fromX, fromY, toX, toY);
    for (const key of parent.keys()) {
      const c = parseCoordKey(key);
      if (!c) continue;
      const d = manhattan(c.x, c.y, toX, toY);
      if (d < bestDist) {
        bestDist = d;
        bestKey = key;
      }
    }
    const closest = parseCoordKey(bestKey);
    if (!closest || (closest.x === fromX && closest.y === fromY)) {
      return [
        { x: fromX, y: fromY },
        { x: toX, y: toY }
      ];
    }
    const path = reconstructPath(parent, closest);
    const last = path[path.length - 1];
    if (!last || last.x !== toX || last.y !== toY) path.push({ x: toX, y: toY });
    return path;
  }

  function bfsReachable(fromX, fromY, movePoints, board, occupancy, ignoreUid, footprintW, footprintH) {
    const fw = footprintW || 1;
    const fh = footprintH || 1;
    const maxMp = Math.max(0, Math.floor(movePoints || 0));
    const dist = new Map();
    const queue = [{ x: fromX, y: fromY, d: 0 }];
    dist.set(coordKey(fromX, fromY), 0);
    const reachable = [];
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ];
    while (queue.length) {
      const cur = queue.shift();
      if (cur.d > 0) reachable.push({ x: cur.x, y: cur.y, cost: cur.d });
      if (cur.d >= maxMp) continue;
      for (const [dx, dy] of dirs) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        const key = coordKey(nx, ny);
        if (dist.has(key) && dist.get(key) <= cur.d + 1) continue;
        if (!isFootprintPlaceable(nx, ny, fw, fh, board, occupancy, ignoreUid)) continue;
        const nd = cur.d + 1;
        dist.set(key, nd);
        queue.push({ x: nx, y: ny, d: nd });
      }
    }
    return reachable;
  }

  function findUnitByUid(units, uid) {
    const n = Number(uid);
    if (!Number.isFinite(n)) return null;
    return (units || []).find((u) => u && u.uid === n) || null;
  }

  function allCombatUnits(st) {
    const party = Array.isArray(st?.party) ? st.party : [];
    const foes = Array.isArray(st?.foes) ? st.foes : [];
    return [...party, ...foes];
  }

  const api = Object.freeze({
    GRID_SIZE,
    ALLY_COL_MIN,
    ALLY_COL_MAX,
    ENEMY_COL_MIN,
    ENEMY_COL_MAX,
    DEFAULT_MOVE_POINTS,
    colToLetter,
    coordKey,
    parseCoordKey,
    isInBounds,
    isAllyColumn,
    isEnemyColumn,
    manhattan,
    areOrthogonalAdjacent,
    createBoard,
    obstacleSet,
    getUnitFootprint,
    footprintCells,
    getUnitOccupiedCells,
    isFootprintInBounds,
    isFootprintPlaceable,
    claimFootprintOccupancy,
    firstFreeFootprintCell,
    unitOccupyingCell,
    minManhattanBetweenUnits,
    areUnitsOrthogonalAdjacent,
    buildOccupancy,
    isCellWalkable,
    enumerateAllySpawnCells,
    enumerateEnemySpawnCells,
    enumerateEnemyPlacementAnchorCells,
    placementCellsForUnit,
    autoPlaceAllies,
    autoPlaceEnemies,
    bfsReachable,
    shortestPath,
    findUnitByUid,
    allCombatUnits
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.TacticalGrid = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : global);
