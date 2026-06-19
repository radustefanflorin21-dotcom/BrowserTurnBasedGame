/**
 * Persistence layer for character roster (Phase 1 MMO refactor).
 * - local: browser localStorage (default)
 * - online: REST API + JWT (see server/)
 */
(function (root) {
  const C = root.MMO_CONSTANTS;
  if (!C) throw new Error("mmo/storage.js requires shared/mmo_constants.js");

  const runtime = root.MMO_RUNTIME || { mode: "local", apiBaseUrl: "http://localhost:3001" };

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

  /** Per-account local cache key (online only). Prevents roster bleed between logins on one browser. */
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

  const LocalStorageAdapter = {
    async loadRosterJson() {
      try {
        return localStorage.getItem(C.ROSTER_STORAGE_KEY);
      } catch {
        return null;
      }
    },
    async saveRosterJson(json) {
      try {
        localStorage.setItem(C.ROSTER_STORAGE_KEY, json);
      } catch {
        /* ignore quota / private mode */
      }
      return { rosterJson: json, warnings: [] };
    }
  };

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

  function getAdapter() {
    return isOnlineMode() ? ApiStorageAdapter : LocalStorageAdapter;
  }

  async function loadRosterJson() {
    return getAdapter().loadRosterJson();
  }

  async function saveRosterJson(json) {
    try {
      const out = await getAdapter().saveRosterJson(json);
      if (out && typeof out === "object" && out.rosterJson != null) {
        return out;
      }
      return { rosterJson: out || json, warnings: [] };
    } catch (err) {
      if (isOnlineMode() && err.status === 409 && err.body && err.body.roster) {
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

  /**
   * Online: show auth UI until logged in. Local: always ready.
   * @returns {Promise<boolean>}
   */
  async function ensureSession() {
    if (!isOnlineMode()) return true;
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
    if (!isOnlineMode()) return null;
    return apiFetch("/api/dungeon/enter", {
      method: "POST",
      body: JSON.stringify({ dungeonId, slotIndex })
    });
  }

  async function leaveDungeon(dungeonId, slotIndex, opts) {
    if (!isOnlineMode()) return null;
    const body = { dungeonId, slotIndex };
    if (opts && opts.afterDefeat) body.afterDefeat = true;
    return apiFetch("/api/dungeon/leave", {
      method: "POST",
      body: JSON.stringify(body)
    });
  }

  async function playerEquip(body) {
    if (!isOnlineMode()) return null;
    return apiFetch("/api/player/equip", { method: "POST", body: JSON.stringify(body) });
  }

  async function playerUnequip(body) {
    if (!isOnlineMode()) return null;
    return apiFetch("/api/player/unequip", { method: "POST", body: JSON.stringify(body) });
  }

  async function playerSpendStat(body) {
    if (!isOnlineMode()) return null;
    return apiFetch("/api/player/spend-stat", { method: "POST", body: JSON.stringify(body) });
  }

  async function playerUpgradeSkill(body) {
    if (!isOnlineMode()) return null;
    return apiFetch("/api/player/upgrade-skill", { method: "POST", body: JSON.stringify(body) });
  }

  async function playerCraft(body) {
    if (!isOnlineMode()) return null;
    return apiFetch("/api/player/craft", { method: "POST", body: JSON.stringify(body) });
  }

  async function worldMove(body) {
    if (!isOnlineMode()) return null;
    return apiFetch("/api/world/move", { method: "POST", body: JSON.stringify(body) });
  }

  async function worldPickup(body) {
    if (!isOnlineMode()) return null;
    return apiFetch("/api/world/pickup", { method: "POST", body: JSON.stringify(body) });
  }

  async function fetchMmoFeatures(force) {
    if (!isOnlineMode()) return null;
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
    worldMove,
    worldPickup,
    fetchMmoFeatures
  };
})(typeof window !== "undefined" ? window : globalThis);
