/**
 * Pet XP curve, feed charges, and food cost tiers.
 */
(function (root) {
  const PET_MAX_LEVEL = 30;
  const FEED_CHARGE_INTERVAL_MS = 8 * 60 * 60 * 1000;
  const FEED_CHARGE_CAP = 2;
  const BASIC_FOOD_XP = 60;
  const FAVORITE_FOOD_XP = 100;

  /** XP required to advance from level N to N+1 (index 0 = L1→L2). */
  const XP_TO_NEXT_LEVEL = [
    110, 120, 130, 145, 160, 175, 190, 210, 230, 250, 275, 295, 320, 350, 380, 405, 440, 470, 505, 540,
    575, 615, 655, 695, 740, 780, 825, 875, 920
  ];

  const TOTAL_XP_TO_MAX = XP_TO_NEXT_LEVEL.reduce((a, b) => a + b, 0);

  function clampLevel(level) {
    const lv = Math.floor(Number(level) || 1);
    return Math.max(1, Math.min(PET_MAX_LEVEL, lv));
  }

  function xpRequiredForLevel(level) {
    const lv = clampLevel(level);
    if (lv >= PET_MAX_LEVEL) return 0;
    return XP_TO_NEXT_LEVEL[lv - 1] || 0;
  }

  function totalXpForLevel(level) {
    const lv = clampLevel(level);
    let sum = 0;
    for (let i = 0; i < lv - 1; i++) sum += XP_TO_NEXT_LEVEL[i] || 0;
    return sum;
  }

  function levelFromTotalXp(totalXp) {
    let xp = Math.max(0, Math.floor(Number(totalXp) || 0));
    let level = 1;
    while (level < PET_MAX_LEVEL) {
      const need = XP_TO_NEXT_LEVEL[level - 1];
      if (!need || xp < need) break;
      xp -= need;
      level += 1;
    }
    return { level, xpIntoLevel: xp };
  }

  function foodCostForLevel(level) {
    const lv = clampLevel(level);
    if (lv >= PET_MAX_LEVEL) return 0;
    if (lv <= 9) return 1;
    if (lv <= 19) return 2;
    return 3;
  }

  function getVisualStage(level) {
    const lv = clampLevel(level);
    if (lv >= 20) return "mature";
    if (lv >= 10) return "grown";
    return "young";
  }

  function getVisualStageLabel(stage) {
    if (stage === "mature") return "Mature";
    if (stage === "grown") return "Grown";
    return "Young";
  }

  function reconcileFeedCharges(feedState, nowMs) {
    const state = feedState && typeof feedState === "object" ? feedState : {};
    let charges = typeof state.charges === "number" && Number.isFinite(state.charges) ? Math.floor(state.charges) : FEED_CHARGE_CAP;
    charges = Math.max(0, Math.min(FEED_CHARGE_CAP, charges));
    const now = typeof nowMs === "number" && Number.isFinite(nowMs) ? nowMs : Date.now();
    let last = typeof state.lastUpdatedMs === "number" && Number.isFinite(state.lastUpdatedMs) ? state.lastUpdatedMs : now;
    if (last > now) last = now;
    if (charges < FEED_CHARGE_CAP) {
      const elapsed = now - last;
      const gained = Math.floor(elapsed / FEED_CHARGE_INTERVAL_MS);
      if (gained > 0) {
        charges = Math.min(FEED_CHARGE_CAP, charges + gained);
        last += gained * FEED_CHARGE_INTERVAL_MS;
      }
    } else {
      last = now;
    }
    return { charges, lastUpdatedMs: last };
  }

  function msUntilNextFeedCharge(feedState, nowMs) {
    const rec = reconcileFeedCharges(feedState, nowMs);
    if (rec.charges >= FEED_CHARGE_CAP) return 0;
    const now = typeof nowMs === "number" && Number.isFinite(nowMs) ? nowMs : Date.now();
    const nextAt = rec.lastUpdatedMs + FEED_CHARGE_INTERVAL_MS;
    return Math.max(0, nextAt - now);
  }

  function consumeFeedCharge(feedState, nowMs) {
    const rec = reconcileFeedCharges(feedState, nowMs);
    if (rec.charges <= 0) return null;
    rec.charges -= 1;
    rec.lastUpdatedMs = typeof nowMs === "number" && Number.isFinite(nowMs) ? nowMs : Date.now();
    return rec;
  }

  const api = {
    PET_MAX_LEVEL,
    FEED_CHARGE_INTERVAL_MS,
    FEED_CHARGE_CAP,
    BASIC_FOOD_XP,
    FAVORITE_FOOD_XP,
    XP_TO_NEXT_LEVEL,
    TOTAL_XP_TO_MAX,
    clampLevel,
    xpRequiredForLevel,
    totalXpForLevel,
    levelFromTotalXp,
    foodCostForLevel,
    getVisualStage,
    getVisualStageLabel,
    reconcileFeedCharges,
    msUntilNextFeedCharge,
    consumeFeedCharge
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.PET_PROGRESSION = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : global);
