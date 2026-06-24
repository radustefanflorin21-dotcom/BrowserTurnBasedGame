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

  function buildOccupancy(units) {
    const map = new Map();
    (units || []).forEach((u) => {
      if (!u || u.hp <= 0) return;
      if (typeof u.gridX !== "number" || typeof u.gridY !== "number") return;
      map.set(coordKey(u.gridX, u.gridY), u.uid);
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

  function firstFreeCell(cells, occupancy) {
    for (const c of cells) {
      if (!occupancy.has(coordKey(c.x, c.y))) return { ...c };
    }
    return null;
  }

  function roleColumnPreference(roleKey) {
    const r = String(roleKey || "").toLowerCase();
    if (FRONT_ROLES.has(r)) return ENEMY_COL_MIN;
    if (BACK_ROLES.has(r)) return ENEMY_COL_MAX;
    if (MID_ROLES.has(r)) return ENEMY_COL_MIN + 1;
    return ENEMY_COL_MIN;
  }

  function autoPlaceUnits(units, cells, preferredCols) {
    const occupancy = new Map();
    const placed = [];
    const list = Array.isArray(units) ? units.slice() : [];
    list.sort((a, b) => {
      const pa = preferredCols ? preferredCols(a) : 0;
      const pb = preferredCols ? preferredCols(b) : 0;
      return pa - pb;
    });
    const sortedCells = cells.slice().sort((a, b) => {
      const ca = preferredCols ? Math.abs(a.x - preferredCols({})) : a.x;
      const cb = preferredCols ? Math.abs(b.x - preferredCols({})) : b.x;
      if (ca !== cb) return ca - cb;
      return a.y - b.y;
    });
    for (const u of list) {
      if (!u) continue;
      let spot = null;
      const prefCol = preferredCols ? preferredCols(u) : null;
      if (prefCol != null) {
        const preferred = sortedCells.filter((c) => c.x === prefCol);
        spot = firstFreeCell(preferred.length ? preferred : sortedCells, occupancy);
      }
      if (!spot) spot = firstFreeCell(sortedCells, occupancy);
      if (!spot) continue;
      u.gridX = spot.x;
      u.gridY = spot.y;
      occupancy.set(coordKey(spot.x, spot.y), u.uid);
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
    return autoPlaceUnits(foes, cells, (f) => roleColumnPreference(roleForFoe ? roleForFoe(f) : "bruiser"));
  }

  function bfsReachable(fromX, fromY, movePoints, board, occupancy, ignoreUid) {
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
        if (!isCellWalkable(nx, ny, board, occupancy, ignoreUid)) continue;
        const nd = cur.d + 1;
        if (dist.has(key) && dist.get(key) <= nd) continue;
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
    buildOccupancy,
    isCellWalkable,
    enumerateAllySpawnCells,
    enumerateEnemySpawnCells,
    autoPlaceAllies,
    autoPlaceEnemies,
    bfsReachable,
    findUnitByUid,
    allCombatUnits
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.TacticalGrid = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : global);
