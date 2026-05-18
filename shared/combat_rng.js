/**
 * Seeded PRNG for authoritative combat (client + server).
 */
(function (root) {
  function mulberry32(seed) {
    let t = seed >>> 0;
    return function next() {
      t += 0x6d2b79f5;
      let x = t;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  function createCombatRng(seed) {
    const next = mulberry32(typeof seed === "number" ? seed : 1);
    return {
      seed: seed >>> 0,
      next,
      /** [min, max] inclusive integers */
      int(min, max) {
        const lo = Math.ceil(min);
        const hi = Math.floor(max);
        if (hi < lo) return lo;
        return lo + Math.floor(next() * (hi - lo + 1));
      },
      chance(pct) {
        const p = Math.max(0, Math.min(100, Number(pct) || 0));
        return next() * 100 < p;
      }
    };
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { createCombatRng };
  } else {
    root.CombatRng = { createCombatRng };
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : global);
