/**
 * Login / register UI for online mode (?mmo=online).
 */
(function (root) {
  function setAuthError(msg) {
    const el = root.document.getElementById("mmoAuthError");
    if (!el) return;
    if (msg) {
      el.textContent = msg;
      el.classList.remove("hidden");
    } else {
      el.textContent = "";
      el.classList.add("hidden");
    }
  }

  function bindAuthUi() {
    if (!root.GameStorage || !root.GameStorage.isOnlineMode()) return;

    const loginForm = root.document.getElementById("mmoLoginForm");
    const registerForm = root.document.getElementById("mmoRegisterForm");
    const showRegister = root.document.getElementById("mmoShowRegister");
    const showLogin = root.document.getElementById("mmoShowLogin");
    const logoutBtn = root.document.getElementById("mmoLogoutBtn");

    if (showRegister && loginForm && registerForm) {
      showRegister.addEventListener("click", (e) => {
        e.preventDefault();
        setAuthError("");
        loginForm.classList.add("hidden");
        registerForm.classList.remove("hidden");
      });
    }
    if (showLogin && loginForm && registerForm) {
      showLogin.addEventListener("click", (e) => {
        e.preventDefault();
        setAuthError("");
        registerForm.classList.add("hidden");
        loginForm.classList.remove("hidden");
      });
    }

    if (loginForm) {
      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        setAuthError("");
        const email = loginForm.querySelector("[name=email]")?.value?.trim() || "";
        const password = loginForm.querySelector("[name=password]")?.value || "";
        if (!email || !password) {
          setAuthError("Enter email and password.");
          return;
        }
        try {
          await root.GameStorage.login(email, password);
          root.GameStorage.onSessionReady();
          if (typeof root.bootGameAfterAuth === "function") await root.bootGameAfterAuth();
        } catch (err) {
          setAuthError(err && err.message ? err.message : "Login failed.");
        }
      });
    }

    if (registerForm) {
      registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        setAuthError("");
        const email = registerForm.querySelector("[name=email]")?.value?.trim() || "";
        const password = registerForm.querySelector("[name=password]")?.value || "";
        if (!email || password.length < 6) {
          setAuthError("Use a valid email and password (6+ characters).");
          return;
        }
        try {
          await root.GameStorage.register(email, password);
          root.GameStorage.onSessionReady();
          if (typeof root.bootGameAfterAuth === "function") await root.bootGameAfterAuth();
        } catch (err) {
          setAuthError(err && err.message ? err.message : "Registration failed.");
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        root.GameStorage.logout();
        root.location.reload();
      });
    }
  }

  if (root.document.readyState === "loading") {
    root.document.addEventListener("DOMContentLoaded", bindAuthUi);
  } else {
    bindAuthUi();
  }
})(typeof window !== "undefined" ? window : globalThis);
