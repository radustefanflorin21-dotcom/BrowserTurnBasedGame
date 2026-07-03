import { db } from "../db.js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ArenaConfig = require("../../shared/arena_config.js");

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function defaultObjectives() {
  const o = {};
  for (const obj of ArenaConfig.DAILY_OBJECTIVES) {
    o[obj.id] = 0;
  }
  return o;
}

function parseObjectives(raw) {
  try {
    const p = JSON.parse(raw || "{}");
    const base = defaultObjectives();
    return { ...base, ...p };
  } catch {
    return defaultObjectives();
  }
}

export function getArenaProfile(userId, slotIndex, seasonId = ArenaConfig.ARENA_SEASON_ID) {
  const row = db
    .prepare(
      `SELECT * FROM arena_profile WHERE user_id = ? AND slot_index = ? AND season_id = ?`
    )
    .get(userId, slotIndex, seasonId);
  if (!row) {
    return {
      userId,
      slotIndex,
      seasonId,
      rating: ArenaConfig.DEFAULT_RATING,
      honor: 0,
      warMedals: 0,
      wins: 0,
      losses: 0,
      winStreak: 0,
      highestRating: ArenaConfig.DEFAULT_RATING,
      dailyResetKey: todayKey(),
      dailyWins: 0,
      dailyMatches: 0,
      dailyFirstWinClaimed: 0,
      dailyObjectives: defaultObjectives()
    };
  }
  const dailyKey = todayKey();
  let dailyWins = row.daily_wins;
  let dailyMatches = row.daily_matches;
  let dailyFirstWinClaimed = row.daily_first_win_claimed;
  let dailyObjectives = parseObjectives(row.daily_objectives_json);
  if (row.daily_reset_key !== dailyKey) {
    dailyWins = 0;
    dailyMatches = 0;
    dailyFirstWinClaimed = 0;
    dailyObjectives = defaultObjectives();
  }
  return {
    userId,
    slotIndex,
    seasonId: row.season_id,
    rating: row.rating,
    honor: row.honor,
    warMedals: row.war_medals,
    wins: row.wins,
    losses: row.losses,
    winStreak: row.win_streak,
    highestRating: row.highest_rating,
    dailyResetKey: dailyKey,
    dailyWins,
    dailyMatches,
    dailyFirstWinClaimed,
    dailyObjectives
  };
}

function upsertArenaProfile(profile) {
  db.prepare(
    `INSERT INTO arena_profile (
      user_id, slot_index, season_id, rating, honor, war_medals, wins, losses, win_streak,
      highest_rating, daily_reset_key, daily_wins, daily_matches, daily_first_win_claimed,
      daily_objectives_json, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, slot_index) DO UPDATE SET
      season_id = excluded.season_id,
      rating = excluded.rating,
      honor = excluded.honor,
      war_medals = excluded.war_medals,
      wins = excluded.wins,
      losses = excluded.losses,
      win_streak = excluded.win_streak,
      highest_rating = excluded.highest_rating,
      daily_reset_key = excluded.daily_reset_key,
      daily_wins = excluded.daily_wins,
      daily_matches = excluded.daily_matches,
      daily_first_win_claimed = excluded.daily_first_win_claimed,
      daily_objectives_json = excluded.daily_objectives_json,
      updated_at = datetime('now')`
  ).run(
    profile.userId,
    profile.slotIndex,
    profile.seasonId || ArenaConfig.ARENA_SEASON_ID,
    profile.rating,
    profile.honor,
    profile.warMedals,
    profile.wins,
    profile.losses,
    profile.winStreak,
    profile.highestRating,
    profile.dailyResetKey || todayKey(),
    profile.dailyWins,
    profile.dailyMatches,
    profile.dailyFirstWinClaimed,
    JSON.stringify(profile.dailyObjectives || defaultObjectives())
  );
}

export function computeRatingDelta(playerRating, opponentRating, won) {
  const k = 32;
  const expected = 1 / (1 + 10 ** ((opponentRating - playerRating) / 400));
  const delta = Math.round(k * ((won ? 1 : 0) - expected));
  return won ? Math.max(8, delta) : Math.min(-8, delta);
}

export function applyArenaMatchResult({
  userId,
  slotIndex,
  modeId,
  victory,
  opponentUserId,
  opponentName,
  rounds,
  stats
}) {
  const mode = ArenaConfig.getMode(modeId);
  const profile = getArenaProfile(userId, slotIndex);
  const ratingBefore = profile.rating;
  let ratingAfter = ratingBefore;
  if (mode?.rating) {
    const opp =
      opponentUserId != null
        ? getArenaProfile(opponentUserId, slotIndex).rating
        : ratingBefore;
    const delta = computeRatingDelta(ratingBefore, opp, victory);
    ratingAfter = Math.max(0, ratingBefore + delta);
  }
  const honorEarned = victory ? mode?.honorWin || 0 : mode?.honorLoss || 0;
  let warMedalsEarned = 0;
  profile.honor += honorEarned;
  profile.dailyMatches += 1;
  if (victory) {
    profile.wins += 1;
    profile.winStreak += 1;
    profile.dailyWins += 1;
    if (!profile.dailyFirstWinClaimed) {
      warMedalsEarned += ArenaConfig.FIRST_WIN_MEDALS;
      profile.dailyFirstWinClaimed = 1;
    }
    for (const obj of ArenaConfig.DAILY_OBJECTIVES) {
      if (obj.type === "wins") {
        profile.dailyObjectives[obj.id] = (profile.dailyObjectives[obj.id] || 0) + 1;
        if (profile.dailyObjectives[obj.id] >= obj.target && obj.warMedals) {
          warMedalsEarned += obj.warMedals;
        }
      }
      if (obj.type === "matches") {
        profile.dailyObjectives[obj.id] = (profile.dailyObjectives[obj.id] || 0) + 1;
      }
    }
  } else {
    profile.losses += 1;
    profile.winStreak = 0;
    for (const obj of ArenaConfig.DAILY_OBJECTIVES) {
      if (obj.type === "matches") {
        profile.dailyObjectives[obj.id] = (profile.dailyObjectives[obj.id] || 0) + 1;
      }
    }
  }
  profile.warMedals += warMedalsEarned;
  profile.rating = ratingAfter;
  profile.highestRating = Math.max(profile.highestRating, ratingAfter);
  profile.dailyResetKey = todayKey();
  upsertArenaProfile(profile);
  db.prepare(
    `INSERT INTO arena_match_history (
      season_id, mode_id, user_id, slot_index, opponent_user_id, opponent_name,
      victory, rating_before, rating_after, honor_earned, war_medals_earned, rounds, stats_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    profile.seasonId,
    modeId,
    userId,
    slotIndex,
    opponentUserId ?? null,
    opponentName || "",
    victory ? 1 : 0,
    ratingBefore,
    ratingAfter,
    honorEarned,
    warMedalsEarned,
    Math.max(0, Math.floor(rounds || 0)),
    JSON.stringify(stats || {})
  );
  return {
    profile,
    ratingBefore,
    ratingAfter,
    honorEarned,
    warMedalsEarned,
    rankLabel: ArenaConfig.formatRankLabel(ratingAfter)
  };
}

export function getArenaMatchHistory(userId, slotIndex, limit = 10) {
  return db
    .prepare(
      `SELECT * FROM arena_match_history
       WHERE user_id = ? AND slot_index = ?
       ORDER BY id DESC LIMIT ?`
    )
    .all(userId, slotIndex, Math.max(1, Math.min(50, limit)));
}

export function publicArenaProfile(userId, slotIndex) {
  const p = getArenaProfile(userId, slotIndex);
  return {
    rating: p.rating,
    honor: p.honor,
    warMedals: p.warMedals,
    wins: p.wins,
    losses: p.losses,
    winStreak: p.winStreak,
    rankLabel: ArenaConfig.formatRankLabel(p.rating),
    seasonId: p.seasonId,
    seasonLabel: ArenaConfig.ARENA_SEASON_LABEL,
    dailyWins: p.dailyWins,
    dailyMatches: p.dailyMatches,
    dailyObjectives: ArenaConfig.DAILY_OBJECTIVES.map((obj) => ({
      id: obj.id,
      label: obj.label,
      target: obj.target,
      progress: p.dailyObjectives[obj.id] || 0,
      honor: obj.honor || 0,
      warMedals: obj.warMedals || 0,
      complete: (p.dailyObjectives[obj.id] || 0) >= obj.target
    }))
  };
}
