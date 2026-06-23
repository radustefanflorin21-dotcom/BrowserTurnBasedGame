/**
 * Gathering profession XP (client + server).
 */
(function (root) {
  function roundXpToNearest5(value) {
    const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
    if (n <= 0) return 0;
    return Math.max(5, Math.round(n / 5) * 5);
  }

  function computeBaseGatherXp(resourceLevel) {
    const lv = Math.max(1, Math.floor(resourceLevel));
    const raw = 4 + lv * 1.1 + Math.pow(lv, 1.18);
    return roundXpToNearest5(raw);
  }

  function getGatherLevelRelevanceMultiplier(resourceLevel, professionLevel) {
    const resLv = Math.max(1, Math.floor(resourceLevel));
    const profLv = Math.max(1, Math.floor(professionLevel));
    const gap = Math.max(0, profLv - resLv);
    if (gap <= 5) return 1.0;
    if (gap <= 10) return 0.75;
    if (gap <= 20) return 0.4;
    if (gap <= 29) return 0.1;
    return 0;
  }

  function computeGatherXp(resourceLevel, professionLevel) {
    const relevance = getGatherLevelRelevanceMultiplier(resourceLevel, professionLevel);
    if (relevance <= 0) return 0;
    return roundXpToNearest5(computeBaseGatherXp(resourceLevel) * relevance);
  }

  /** Bonus +1 resource chance (0–1); does not grant extra XP. */
  function getBonusYieldChance(professionLevel, resourceLevel) {
    const resLv = Math.max(1, Math.floor(resourceLevel));
    const profLv = Math.max(1, Math.floor(professionLevel));
    const gap = Math.max(0, profLv - resLv);
    if (gap >= 30) return 0.3;
    if (gap >= 20) return 0.2;
    if (gap >= 10) return 0.1;
    return 0;
  }

  const api = Object.freeze({
    roundXpToNearest5,
    computeBaseGatherXp,
    getGatherLevelRelevanceMultiplier,
    computeGatherXp,
    getBonusYieldChance
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.GatherXp = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : global);
