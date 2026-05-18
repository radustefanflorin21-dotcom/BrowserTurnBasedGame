/**
 * Runtime MMO mode. Default: local-only (current behavior).
 * Online: add ?mmo=online to the URL or set window.MMO_CONFIG before scripts load.
 */
(function (root) {
  const params = new URLSearchParams(root.location.search);
  const queryMode = params.get("mmo");
  const preset = root.MMO_CONFIG && typeof root.MMO_CONFIG === "object" ? root.MMO_CONFIG : {};
  const mode =
    queryMode === "online" || preset.mode === "online"
      ? "online"
      : queryMode === "local" || preset.mode === "local"
        ? "local"
        : "local";
  root.MMO_RUNTIME = Object.freeze({
    mode,
    apiBaseUrl:
      typeof preset.apiBaseUrl === "string" && preset.apiBaseUrl.trim()
        ? preset.apiBaseUrl.trim().replace(/\/$/, "")
        : "http://localhost:3001"
  });
})(typeof window !== "undefined" ? window : globalThis);
