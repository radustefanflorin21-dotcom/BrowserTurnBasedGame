/** Tactical board layout (visual only — position and scale on screen).
 * Edit in combat with Layout Edit on: click the board (empty cell or frame), drag to move,
 * Shift+drag or wheel to scale. Export JSON → paste into `tacticalBoardPreset` below.
 *
 * Layout fields:
 * - offsetXPct, offsetYPct — move the board (% of its own width/height)
 * - scalePct — board scale (% of default cell size, 100 = default)
 */
(function () {
  const PRESET_REV = "2026-07-08-coastal-v2";
  const preset = {
    offsetXPct: 18.80041486641634,
    offsetYPct: 6.015037593984962,
    scalePct: 100
  };
  if (typeof GAME_CONFIG !== "undefined") {
    GAME_CONFIG.tacticalBoardPreset = preset;
    GAME_CONFIG.tacticalLayoutPresetRev = PRESET_REV;
  }
  window.TACTICAL_BOARD_PRESET = preset;
  window.TACTICAL_LAYOUT_PRESET_REV = PRESET_REV;
})();
