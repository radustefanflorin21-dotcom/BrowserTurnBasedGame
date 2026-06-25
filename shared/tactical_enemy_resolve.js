/**
 * Resolve enemy skill tiles and targets on the tactical grid.
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
  const ET = () =>
    typeof EnemyTacticalTargeting !== "undefined"
      ? EnemyTacticalTargeting
      : typeof require !== "undefined"
        ? require("./enemy_tactical_targeting.js")
        : null;

  function livingParty(st) {
    return (st.party || []).filter((m) => m && m.hp > 0 && typeof m.gridX === "number");
  }

  function livingFoes(st) {
    return (st.foes || []).filter((f) => f && f.hp > 0 && typeof f.gridX === "number");
  }

  function selfRadiusTiles(cx, cy, radius) {
    const grid = TG();
    const out = [];
    const r = Math.max(0, Math.floor(radius));
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) + Math.abs(dy) > r) continue;
        const x = cx + dx;
        const y = cy + dy;
        if (grid.isInBounds(x, y)) out.push({ x, y });
      }
    }
    return out;
  }

  function lineFromCaster(st, cx, cy, maxLen, stopAtOccupied) {
    const grid = TG();
    const tt = TT();
    const occ = grid.buildOccupancy(grid.allCombatUnits(st));
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ];
    let best = [];
    for (const [dx, dy] of dirs) {
      const tiles = [];
      let x = cx;
      let y = cy;
      for (let i = 0; i < maxLen; i++) {
        x += dx;
        y += dy;
        if (!grid.isInBounds(x, y)) break;
        const key = grid.coordKey(x, y);
        tiles.push({ x, y });
        if (stopAtOccupied && occ.has(key)) break;
      }
      if (tiles.length > best.length) best = tiles;
    }
    return best;
  }

  function unitsOnTiles(st, tiles, side) {
    const grid = TG();
    const party = [];
    const foes = [];
    const seen = new Set();
    for (const t of tiles || []) {
      const u = grid.allCombatUnits(st).find((x) => x && x.hp > 0 && x.gridX === t.x && x.gridY === t.y);
      if (!u || seen.has(u.uid)) continue;
      seen.add(u.uid);
      if ((st.party || []).some((m) => m && m.uid === u.uid)) party.push(u);
      else foes.push(u);
    }
    if (side === "player") return party;
    if (side === "foe_ally" || side === "global_foes") return foes;
    return { party, foes };
  }

  function inSkillRange(st, foe, tx, ty, cfg) {
    const grid = TG();
    const tt = TT();
    if (!foe || typeof foe.gridX !== "number") return false;
    if (cfg.target === "global_players" || cfg.target === "global_foes") return true;
    if (cfg.aoe === "self_radius" || cfg.rangeMax === 0) {
      if (cfg.aoe === "self_radius") {
        return selfRadiusTiles(foe.gridX, foe.gridY, cfg.selfRadius || 1).some((t) => t.x === tx && t.y === ty);
      }
      return foe.gridX === tx && foe.gridY === ty;
    }
    const rMin = typeof cfg.rangeMin === "number" ? cfg.rangeMin : 1;
    const rMax = typeof cfg.rangeMax === "number" ? cfg.rangeMax : 1;
    if (!tt.isInRange(foe.gridX, foe.gridY, tx, ty, rMin, rMax)) return false;
    if (rMax > 0 && !tt.hasLineOfSight(st, foe.gridX, foe.gridY, tx, ty)) return false;
    return true;
  }

  function resolveTiles(st, foe, cfg, anchorX, anchorY) {
    const grid = TG();
    const tt = TT();
    const cx = typeof anchorX === "number" ? anchorX : foe.gridX;
    const cy = typeof anchorY === "number" ? anchorY : foe.gridY;

    if (cfg.target === "global_players" || cfg.aoe === "global_players") return null;
    if (cfg.target === "global_foes" || cfg.aoe === "global_foes") return null;
    if (cfg.target === "self" || cfg.rangeMax === 0 && cfg.aoe === "none") {
      return [{ x: foe.gridX, y: foe.gridY }];
    }
    if (cfg.aoe === "self_radius") {
      return selfRadiusTiles(foe.gridX, foe.gridY, cfg.selfRadius || 1);
    }
    if (cfg.aoe === "line") {
      return lineFromCaster(st, foe.gridX, foe.gridY, cfg.lineMax || cfg.rangeMax || 3, cfg.stopAtOccupied !== false);
    }
    if (cfg.aoe === "cross1") {
      return tt.cross1Tiles(cx, cy, 1);
    }
    if (cfg.aoe === "3x3") {
      return tt.collectAoeTiles({ aoe: "3x3" }, 1, "", cx, cy, st);
    }
    return [{ x: cx, y: cy }];
  }

  function resolveTargets(st, foe, cfg, anchorX, anchorY) {
    if (!st?.tactical || !foe || typeof foe.gridX !== "number") {
      return { players: livingParty(st), foes: livingFoes(st), tiles: [] };
    }
    if (cfg.target === "players_in_range") {
      const rMin = typeof cfg.rangeMin === "number" ? cfg.rangeMin : 1;
      const rMax = typeof cfg.rangeMax === "number" ? cfg.rangeMax : 4;
      const players = livingParty(st).filter((m) =>
        inSkillRange(st, foe, m.gridX, m.gridY, { ...cfg, rangeMin: rMin, rangeMax: rMax })
      );
      return { players, foes: [], tiles: [] };
    }
    if (cfg.anchorSelf && cfg.aoe === "cross1") {
      const tiles = TT().cross1Tiles(foe.gridX, foe.gridY, 1);
      return { players: unitsOnTiles(st, tiles, "player"), foes: [], tiles };
    }
    if (cfg.target === "global_players" || cfg.aoe === "global_players") {
      return { players: livingParty(st), foes: [], tiles: [] };
    }
    if (cfg.target === "global_foes" || cfg.aoe === "global_foes") {
      return { players: [], foes: livingFoes(st), tiles: [] };
    }
    const tiles = resolveTiles(st, foe, cfg, anchorX, anchorY) || [];
    if (cfg.target === "foe_ally") {
      return { players: [], foes: unitsOnTiles(st, tiles, "foe_ally"), tiles };
    }
    if (cfg.aoe === "self_radius" && cfg.target === "global_foes") {
      return { players: [], foes: unitsOnTiles(st, tiles, "foe_ally"), tiles };
    }
    return { players: unitsOnTiles(st, tiles, "player"), foes: [], tiles };
  }

  function pickBestPlayer(st, foe, cfg, rule, rng) {
    const candidates = livingParty(st).filter((m) => inSkillRange(st, foe, m.gridX, m.gridY, cfg));
    if (!candidates.length) return null;
    if (rule === "lowest_hp") {
      return candidates.reduce((a, b) => (a.hp / a.maxHp <= b.hp / b.maxHp ? a : b));
    }
    if (rule === "highest_damage" || rule === "assassin" || rule === "mage") {
      return candidates[Math.floor((rng?.next?.() ?? Math.random()) * candidates.length)] || candidates[0];
    }
    let best = null;
    let bestD = Infinity;
    for (const m of candidates) {
      const d = TG().manhattan(foe.gridX, foe.gridY, m.gridX, m.gridY);
      if (d < bestD) {
        bestD = d;
        best = m;
      }
    }
    return best;
  }

  function pullUnitToward(st, unit, destX, destY) {
    const grid = TG();
    if (!unit || typeof unit.gridX !== "number") return false;
    const dx = Math.sign(destX - unit.gridX);
    const dy = Math.sign(destY - unit.gridY);
    if (dx === 0 && dy === 0) return false;
    const nx = unit.gridX + (Math.abs(destX - unit.gridX) >= Math.abs(destY - unit.gridY) ? dx : 0);
    const ny = unit.gridY + (Math.abs(destY - unit.gridY) > Math.abs(destX - unit.gridX) ? dy : 0);
    if (nx === unit.gridX && ny === unit.gridY) return false;
    const occ = grid.buildOccupancy(grid.allCombatUnits(st));
    const key = grid.coordKey(nx, ny);
    if (occ.has(key) && occ.get(key) !== unit.uid) return false;
    unit.gridX = nx;
    unit.gridY = ny;
    return true;
  }

  const api = Object.freeze({
    livingParty,
    livingFoes,
    selfRadiusTiles,
    lineFromCaster,
    inSkillRange,
    resolveTiles,
    resolveTargets,
    pickBestPlayer,
    pullUnitToward
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.TacticalEnemyResolve = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : global);
