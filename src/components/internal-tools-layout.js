(function createInternalToolsLayoutLibrary(globalScope) {
  async function ensureAuthenticated(nextPath) {
    const response = await fetch("/api/internal-session", {
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      redirectToLogin(nextPath);
      return false;
    }

    const payload = await response.json();

    if (!payload.authenticated) {
      redirectToLogin(nextPath);
      return false;
    }

    return true;
  }

  async function logout() {
    await fetch("/api/internal-session", {
      method: "DELETE",
      credentials: "same-origin",
    });
    redirectToLogin("/");
  }

  function redirectToLogin(nextPath) {
    const destination = encodeURIComponent(nextPath || globalScope.location.pathname || "/");
    globalScope.location.replace(`/internal/?next=${destination}`);
  }

  function bindLogout(button) {
    if (!button) {
      return;
    }

    button.addEventListener("click", async () => {
      button.disabled = true;

      try {
        await logout();
      } finally {
        button.disabled = false;
      }
    });
  }

  const api = {
    bindLogout,
    ensureAuthenticated,
    logout,
    redirectToLogin,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  globalScope.AccordSignalInternalTools = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
