/**
 * Shared MMO refactor constants (client + server).
 * Keep in sync when changing roster shape or auth storage keys.
 */
(function (root) {
  const MMO_CONSTANTS = Object.freeze({
    ROSTER_VERSION: 1,
    CHARACTER_SLOT_COUNT: 5,
    ROSTER_STORAGE_KEY: "character_roster_v1",
    PLAYER_SAVE_KEY: "player",
    PLAYER_SAVE_BACKUP_KEY: "player_backup",
    AUTH_TOKEN_KEY: "mmo_auth_token_v1",
    AUTH_EMAIL_KEY: "mmo_auth_email_v1"
  });
  if (typeof module !== "undefined" && module.exports) {
    module.exports = MMO_CONSTANTS;
  } else {
    root.MMO_CONSTANTS = MMO_CONSTANTS;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : global);
