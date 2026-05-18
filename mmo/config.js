/**
 * Runtime MMO mode. Default: local-only (current behavior).
 * Online: add ?mmo=online to the URL or set window.MMO_CONFIG before scripts load.
 *
 * API URL resolution (first match wins):
 * 1. window.MMO_CONFIG.apiBaseUrl
 * 2. ?api=https://your.domain (online mode)
 * 3. Same origin when ?mmo=online and host is not localhost (VPS / production)
 * 4. http://localhost:3001 (local dev)
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

  function trimBaseUrl(url) {
    return String(url || "")
      .trim()
      .replace(/\/$/, "");
  }

  function resolveApiBaseUrl() {
    if (typeof preset.apiBaseUrl === "string" && preset.apiBaseUrl.trim()) {
      return trimBaseUrl(preset.apiBaseUrl);
    }
    const queryApi = params.get("api");
    if (queryApi && queryApi.trim()) return trimBaseUrl(queryApi);
    if (mode === "online" && root.location && root.location.origin) {
      const host = root.location.hostname || "";
      if (host && host !== "localhost" && host !== "127.0.0.1") {
        return trimBaseUrl(root.location.origin);
      }
    }
    return "http://localhost:3001";
  }

  root.MMO_RUNTIME = Object.freeze({
    mode,
    apiBaseUrl: resolveApiBaseUrl()
  });
})(typeof window !== "undefined" ? window : globalThis);
