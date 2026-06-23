/**
 * Persistence layer for character roster — online-only (REST API + JWT).
 * Scoped localStorage is used only as a read cache after server responses.
 */
(function (root) {
  const C = root.MMO_CONSTANTS;
  if (!C) throw new Error("mmo/storage.js requires shared/mmo_constants.js");

  const runtime = root.MMO_RUNTIME || { mode: "online", apiBaseUrl: "http://localhost:3001" };

  let rosterRevision = 0;
  let cachedMmoFeatures = null;

  function setRosterRevision(revision) {
    if (typeof revision === "number" && Number.isFinite(revision)) {
      rosterRevision = Math.max(0, Math.floor(revision));
    }
  }

  function getRosterRevision() {
    return rosterRevision;
  }

  function isOnlineMode() {
    return runtime.mode === "online";
  }

  function getApiBaseUrl() {
    return runtime.apiBaseUrl;
  }

  function getAuthToken() {
    try {
      return localStorage.getItem(C.AUTH_TOKEN_KEY) || "";
    } catch {
      return "";
    }
  }

  function setAuthSession(token, email) {
    try {
      if (token) localStorage.setItem(C.AUTH_TOKEN_KEY, token);
      else localStorage.removeItem(C.AUTH_TOKEN_KEY);
      if (email) localStorage.setItem(C.AUTH_EMAIL_KEY, email);
      else localStorage.removeItem(C.AUTH_EMAIL_KEY);
    } catch {
      /* ignore */
    }
  }

  function getAuthEmail() {
    try {
      return localStorage.getItem(C.AUTH_EMAIL_KEY) || "";
    } catch {
      return "";
    }
  }

  /** Per-account local cache key. Prevents roster bleed between logins on one browser. */
  function getScopedRosterStorageKey() {
    const email = getAuthEmail();
    if (!email) return C.ROSTER_STORAGE_KEY;
    return `${C.ROSTER_STORAGE_KEY}:${email}`;
  }

  function clearSharedLegacySaves() {
    try {
      localStorage.removeItem(C.ROSTER_STORAGE_KEY);
      localStorage.removeItem(C.PLAYER_SAVE_KEY);
      localStorage.removeItem(C.PLAYER_SAVE_BACKUP_KEY);
    } catch {
      /* ignore */
    }
  }

  function authHeaders() {
    const token = getAuthToken();
    const h = { "Content-Type": "application/json" };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }

  async function apiFetch(path, options) {
    const url = `${getApiBaseUrl()}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: { ...authHeaders(), ...(options && options.headers ? options.headers : {}) }
    });
    let body = null;
    const text = await res.text();
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = { raw: text };
      }
    }
    if (!res.ok) {
      const msg =
        body && typeof body.error === "string"
          ? body.error
          : body && typeof body.message === "string"
            ? body.message
            : `Request failed (${res.status})`;
      const err = new Error(msg);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return body;
  }

  const ApiStorageAdapter = {
    async loadRosterJson() {
      const data = await apiFetch("/api/roster", { method: "GET" });
      if (!data || data.roster == null) return null;
      if (data.revision != null) setRosterRevision(data.revision);
      const rosterJson =
        typeof data.roster === "string" ? data.roster : JSON.stringify(data.roster);
      try {
        localStorage.setItem(getScopedRosterStorageKey(), rosterJson);
      } catch {
        /* ignore */
      }
      return rosterJson;
    },
    async saveRosterJson(json) {
      const roster = JSON.parse(json);
      const data = await apiFetch("/api/roster", {
        method: "PUT",
        body: JSON.stringify({ roster, baseRevision: rosterRevision })
      });
      if (data?.revision != null) setRosterRevision(data.revision);
      const warnings = data && Array.isArray(data.warnings) ? data.warnings : [];
      if (warnings.length && typeof root.showToast === "function") {
        root.showToast(
          "Some progression values were adjusted by the server to match allowed limits."
        );
      }
      const rosterJson = data && data.roster ? JSON.stringify(data.roster) : json;
      try {
        localStorage.setItem(getScopedRosterStorageKey(), rosterJson);
      } catch {
        /* ignore */
      }
      return { rosterJson, warnings, revision: data?.revision };
    }
  };

  async function loadRosterJson() {
    if (!isOnlineMode()) {
      throw new Error("Local-only mode is disabled. Remove ?mmo=local or use the online server.");
    }
    return ApiStorageAdapter.loadRosterJson();
  }

  async function saveRosterJson(json) {
    if (!isOnlineMode()) {
      throw new Error("Local-only mode is disabled. Remove ?mmo=local or use the online server.");
    }
    try {
      const out = await ApiStorageAdapter.saveRosterJson(json);
      if (out && typeof out === "object" && out.rosterJson != null) {
        return out;
      }
      return { rosterJson: out || json, warnings: [] };
    } catch (err) {
      if (err.status === 409 && err.body && err.body.roster) {
        const restored = JSON.stringify(err.body.roster);
        if (err.body.revision != null) setRosterRevision(err.body.revision);
        if (typeof root.applyAuthoritativeRosterJson === "function") {
          root.applyAuthoritativeRosterJson(restored, { noRender: true });
        }
        if (typeof root.showToast === "function") {
          root.showToast("Your save was out of date — synced from the server.");
        }
        return { rosterJson: restored, warnings: err.body.violations || [], revision: err.body.revision };
      }
      throw err;
    }
  }

  async function validateSession() {
    if (!getAuthToken()) return false;
    try {
      await apiFetch("/api/auth/me", { method: "GET" });
      return true;
    } catch {
      setAuthSession("", "");
      return false;
    }
  }

  async function register(email, password) {
    const data = await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    if (data && data.token) {
      setAuthSession(data.token, data.email || email);
      clearSharedLegacySaves();
    }
    return data;
  }

  async function login(email, password) {
    const data = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    if (data && data.token) {
      setAuthSession(data.token, data.email || email);
      clearSharedLegacySaves();
    }
    return data;
  }

  function logout() {
    if (root.MMOPresence && typeof root.MMOPresence.disconnect === "function") {
      root.MMOPresence.disconnect();
    }
    try {
      localStorage.removeItem(getScopedRosterStorageKey());
    } catch {
      /* ignore */
    }
    setAuthSession("", "");
    const authEl = root.document.getElementById("mmoAuthScreen");
    const selectEl = root.document.getElementById("characterSelectScreen");
    if (authEl) authEl.classList.remove("hidden");
    if (selectEl) selectEl.classList.add("hidden");
  }

  /** Show auth UI until logged in. @returns {Promise<boolean>} */
  async function ensureSession() {
    if (!isOnlineMode()) {
      const authEl = root.document.getElementById("mmoAuthScreen");
      const selectEl = root.document.getElementById("characterSelectScreen");
      if (authEl) authEl.classList.remove("hidden");
      if (selectEl) selectEl.classList.add("hidden");
      return false;
    }
    if (await validateSession()) return true;
    const authEl = root.document.getElementById("mmoAuthScreen");
    const selectEl = root.document.getElementById("characterSelectScreen");
    if (authEl) authEl.classList.remove("hidden");
    if (selectEl) selectEl.classList.add("hidden");
    return false;
  }

  function onSessionReady() {
    const authEl = root.document.getElementById("mmoAuthScreen");
    const selectEl = root.document.getElementById("characterSelectScreen");
    if (authEl) authEl.classList.add("hidden");
    if (selectEl) selectEl.classList.remove("hidden");
  }

  async function enterDungeon(dungeonId, slotIndex) {
    return apiFetch("/api/dungeon/enter", {
      method: "POST",
      body: JSON.stringify({ dungeonId, slotIndex })
    });
  }

  async function leaveDungeon(dungeonId, slotIndex, opts) {
    const body = { dungeonId, slotIndex };
    if (opts && opts.afterDefeat) body.afterDefeat = true;
    return apiFetch("/api/dungeon/leave", {
      method: "POST",
      body: JSON.stringify(body)
    });
  }

  async function playerEquip(body) {
    return apiFetch("/api/player/equip", { method: "POST", body: JSON.stringify(body) });
  }

  async function playerUnequip(body) {
    return apiFetch("/api/player/unequip", { method: "POST", body: JSON.stringify(body) });
  }

  async function playerSpendStat(body) {
    return apiFetch("/api/player/spend-stat", { method: "POST", body: JSON.stringify(body) });
  }

  async function playerUpgradeSkill(body) {
    return apiFetch("/api/player/upgrade-skill", { method: "POST", body: JSON.stringify(body) });
  }

  async function playerCraft(body) {
    return apiFetch("/api/player/craft", { method: "POST", body: JSON.stringify(body) });
  }

  async function playerEnhance(body) {
    return apiFetch("/api/player/enhance", { method: "POST", body: JSON.stringify(body) });
  }

  async function playerHeal(body) {
    return apiFetch("/api/player/heal", { method: "POST", body: JSON.stringify(body) });
  }

  async function playerUseConsumable(body) {
    return apiFetch("/api/player/use-consumable", { method: "POST", body: JSON.stringify(body) });
  }

  async function worldMove(body) {
    return apiFetch("/api/world/move", { method: "POST", body: JSON.stringify(body) });
  }

  async function worldPickup(body) {
    return apiFetch("/api/world/pickup", { method: "POST", body: JSON.stringify(body) });
  }

  async function fetchMarketListings(query) {
    const params = new URLSearchParams();
    if (query?.search) params.set("search", query.search);
    if (query?.category) params.set("category", query.category);
    if (query?.subcategory) params.set("subcategory", query.subcategory);
    const qs = params.toString();
    return apiFetch(`/api/market/listings${qs ? `?${qs}` : ""}`, { method: "GET" });
  }

  async function fetchMyMarketListings(slotIndex) {
    return apiFetch(`/api/market/my-listings?slotIndex=${encodeURIComponent(slotIndex)}`, { method: "GET" });
  }

  async function marketList(body) {
    return apiFetch("/api/market/list", { method: "POST", body: JSON.stringify(body) });
  }

  async function marketBuy(body) {
    return apiFetch("/api/market/buy", { method: "POST", body: JSON.stringify(body) });
  }

  async function marketCancel(body) {
    return apiFetch("/api/market/cancel", { method: "POST", body: JSON.stringify(body) });
  }

  async function fetchMail(limit) {
    const q = limit != null ? `?limit=${encodeURIComponent(limit)}` : "";
    return apiFetch(`/api/mail${q}`, { method: "GET" });
  }

  async function markMailRead(body) {
    return apiFetch("/api/mail/read", { method: "POST", body: JSON.stringify(body || {}) });
  }

  async function fetchMmoFeatures(force) {
    if (cachedMmoFeatures && !force) return cachedMmoFeatures;
    cachedMmoFeatures = await apiFetch("/api/mmo/features", { method: "GET" });
    return cachedMmoFeatures;
  }

  root.GameStorage = {
    isOnlineMode,
    getMode: () => runtime.mode,
    getApiBaseUrl,
    getAuthToken,
    getAuthEmail,
    getRosterRevision,
    setRosterRevision,
    loadRosterJson,
    saveRosterJson,
    validateSession,
    register,
    login,
    logout,
    ensureSession,
    onSessionReady,
    enterDungeon,
    leaveDungeon,
    playerEquip,
    playerUnequip,
    playerSpendStat,
    playerUpgradeSkill,
    playerCraft,
    playerEnhance,
    playerHeal,
    playerUseConsumable,
    worldMove,
    worldPickup,
    fetchMarketListings,
    fetchMyMarketListings,
    marketList,
    marketBuy,
    marketCancel,
    fetchMail,
    markMailRead,
    fetchMmoFeatures
  };
})(typeof window !== "undefined" ? window : globalThis);
