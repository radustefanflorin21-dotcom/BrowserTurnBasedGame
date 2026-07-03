/**
 * Arena PvP configuration (client + server).
 */
(function (root) {
  const ARENA_SEASON_ID = "season_1";
  const ARENA_SEASON_LABEL = "Season 1: War of the First Banners";

  const LEVEL_BRACKETS = Object.freeze([
    { id: "novice", label: "Novice", minLevel: 1, maxLevel: 15 },
    { id: "adept", label: "Adept", minLevel: 16, maxLevel: 30 },
    { id: "veteran", label: "Veteran", minLevel: 31, maxLevel: 45 },
    { id: "endgame", label: "Endgame", minLevel: 46, maxLevel: 60 }
  ]);

  const RANK_TIERS = Object.freeze([
    { id: "bronze", label: "Bronze", minRating: 0, maxRating: 999 },
    { id: "silver", label: "Silver", minRating: 1000, maxRating: 1299 },
    { id: "gold", label: "Gold", minRating: 1300, maxRating: 1599 },
    { id: "platinum", label: "Platinum", minRating: 1600, maxRating: 1899 },
    { id: "diamond", label: "Diamond", minRating: 1900, maxRating: 2199 },
    { id: "champion", label: "Champion", minRating: 2200, maxRating: 99999 }
  ]);

  const DIVISIONS_PER_TIER = 3;

  const MODES = Object.freeze({
    ranked_1v1: {
      id: "ranked_1v1",
      label: "Ranked 1v1",
      description: "Prove your skill in a test of one.",
      teamSize: 1,
      boardSize: 8,
      turnTimerSec: 45,
      placementPhase: true,
      placementTimerSec: 30,
      consumables: false,
      pets: true,
      gear: true,
      rating: true,
      honorWin: 20,
      honorLoss: 6,
      enabled: true
    },
    ranked_4v4: {
      id: "ranked_4v4",
      label: "Ranked 4v4",
      description: "Team up and fight for glory.",
      teamSize: 4,
      boardSize: 8,
      turnTimerSec: 45,
      placementPhase: true,
      placementTimerSec: 30,
      consumables: false,
      pets: true,
      gear: true,
      rating: true,
      honorWin: 45,
      honorLoss: 15,
      enabled: true
    },
    war_arena_8v8: {
      id: "war_arena_8v8",
      label: "War Arena 8v8",
      description: "Epic battles. Claim the battlefield.",
      teamSize: 8,
      enabled: false,
      comingSoon: true
    },
    friendly_duel: {
      id: "friendly_duel",
      label: "Friendly Duel",
      description: "Duel a friend in a private match.",
      enabled: false,
      comingSoon: true
    },
    custom_match: {
      id: "custom_match",
      label: "Custom Match",
      description: "Create or join a custom arena.",
      enabled: false,
      comingSoon: true
    },
    practice_ai: {
      id: "practice_ai",
      label: "Practice vs AI",
      description: "Hone your tactics against AI foes.",
      enabled: false,
      comingSoon: true
    }
  });

  const MATCH_ACCEPT_MS = 25_000;
  const QUEUE_EXPAND_RATING_EVERY_MS = 15_000;
  const QUEUE_INITIAL_RATING_RANGE = 100;
  const QUEUE_MAX_RATING_RANGE = 400;
  const QUEUE_MAX_WAIT_MS = 180_000;
  const FIRST_WIN_MEDALS = 3;
  const DEFAULT_RATING = 1000;

  const DAILY_OBJECTIVES = Object.freeze([
    { id: "win_1", label: "Win 1 Arena match", type: "wins", target: 1, honor: 150 },
    { id: "play_3", label: "Play 3 Arena matches", type: "matches", target: 3, honor: 150 },
    { id: "win_2", label: "Win 2 Arena matches", type: "wins", target: 2, warMedals: 3 }
  ]);

  function getLevelBracket(level) {
    const lv = Math.max(1, Math.floor(Number(level) || 1));
    return (
      LEVEL_BRACKETS.find((b) => lv >= b.minLevel && lv <= b.maxLevel) ||
      LEVEL_BRACKETS[LEVEL_BRACKETS.length - 1]
    );
  }

  function getRankTier(rating) {
    const r = Math.max(0, Math.floor(Number(rating) || 0));
    return (
      RANK_TIERS.find((t) => r >= t.minRating && r <= t.maxRating) ||
      RANK_TIERS[RANK_TIERS.length - 1]
    );
  }

  function getDivisionIndex(rating, tier) {
    const t = tier || getRankTier(rating);
    const span = t.maxRating - t.minRating + 1;
    const offset = Math.max(0, Math.min(span - 1, Math.floor(Number(rating) || 0) - t.minRating));
    const div = Math.floor((offset / span) * DIVISIONS_PER_TIER);
    return Math.min(DIVISIONS_PER_TIER - 1, Math.max(0, div));
  }

  function getDivisionRoman(n) {
    return ["I", "II", "III"][Math.max(0, Math.min(2, n))] || "I";
  }

  function formatRankLabel(rating) {
    const tier = getRankTier(rating);
    const div = getDivisionRoman(getDivisionIndex(rating, tier));
    return `${tier.label} ${div}`;
  }

  function getMode(modeId) {
    return MODES[modeId] || null;
  }

  function listEnabledModes() {
    return Object.values(MODES).filter((m) => m.enabled);
  }

  const ArenaConfig = Object.freeze({
    ARENA_SEASON_ID,
    ARENA_SEASON_LABEL,
    LEVEL_BRACKETS,
    RANK_TIERS,
    DIVISIONS_PER_TIER,
    MODES,
    MATCH_ACCEPT_MS,
    QUEUE_EXPAND_RATING_EVERY_MS,
    QUEUE_INITIAL_RATING_RANGE,
    QUEUE_MAX_RATING_RANGE,
    QUEUE_MAX_WAIT_MS,
    FIRST_WIN_MEDALS,
    DEFAULT_RATING,
    DAILY_OBJECTIVES,
    getLevelBracket,
    getRankTier,
    getDivisionIndex,
    getDivisionRoman,
    formatRankLabel,
    getMode,
    listEnabledModes
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = ArenaConfig;
  } else {
    root.ArenaConfig = ArenaConfig;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : global);
