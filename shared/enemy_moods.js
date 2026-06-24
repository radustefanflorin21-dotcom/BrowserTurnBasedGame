/**
 * Enemy mood rolls and combat field application (client + server).
 */
(function (root) {
  const ENEMY_MOOD_SPAWN_CHANCE = 0.1;

  function getNeutralEnemyMood() {
    return {
      id: null,
      name: "",
      damageMult: 1,
      hpMult: 1,
      damageTakenMult: 1,
      accuracyPct: 0,
      critPct: 0,
      evasionPct: 0,
      statusResistPct: 0,
      description: ""
    };
  }

  function randomFrom(arr, rng) {
    if (!Array.isArray(arr) || !arr.length) return null;
    const roll = typeof rng?.next === "function" ? rng.next() : Math.random();
    return arr[Math.floor(roll * arr.length)];
  }

  /** Roll 10% mood from the full mood list (ignores per-enemy restrictions). */
  function pickRandomEnemyMood(moods, rng) {
    const roll = typeof rng?.next === "function" ? rng.next() : Math.random();
    if (roll >= ENEMY_MOOD_SPAWN_CHANCE) return getNeutralEnemyMood();
    const picked = randomFrom(Array.isArray(moods) ? moods : [], rng);
    return picked && picked.id ? picked : getNeutralEnemyMood();
  }

  function resolveEnemyMoodById(id, moods) {
    if (typeof id !== "string" || !id.trim()) return getNeutralEnemyMood();
    const found = (Array.isArray(moods) ? moods : []).find((m) => m && m.id === id.trim());
    return found || getNeutralEnemyMood();
  }

  /** Apply mood combat modifiers onto a spawned foe object. */
  function applyMoodCombatFields(foe, mood) {
    const m = mood && mood.id ? mood : getNeutralEnemyMood();
    const damageMult = typeof m.damageMult === "number" && m.damageMult > 0 ? m.damageMult : 1;
    foe.moodId = m.id || null;
    foe.moodName = typeof m.name === "string" ? m.name : "";
    foe.moodAttackMult = damageMult;
    foe.moodAttackBonus = 0;
    foe.damageTakenMult = typeof m.damageTakenMult === "number" && m.damageTakenMult > 0 ? m.damageTakenMult : 1;
    foe.moodAccuracyPct = typeof m.accuracyPct === "number" ? m.accuracyPct : 0;
    foe.moodCritPct = typeof m.critPct === "number" ? m.critPct : 0;
    foe.moodEvasionPct = typeof m.evasionPct === "number" ? m.evasionPct : 0;
    foe.moodStatusResistPct = typeof m.statusResistPct === "number" ? m.statusResistPct : 0;
    return foe;
  }

  const api = Object.freeze({
    ENEMY_MOOD_SPAWN_CHANCE,
    getNeutralEnemyMood,
    pickRandomEnemyMood,
    resolveEnemyMoodById,
    applyMoodCombatFields
  });

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.EnemyMoods = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : global);
