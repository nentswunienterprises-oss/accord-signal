const loginForm = document.querySelector("#internal-access-form");
const feedbackNode = document.querySelector("#internal-access-feedback");

function getNextPath() {
  const url = new URL(window.location.href);
  return url.searchParams.get("next") || "/generate-email/";
}

async function redirectIfAuthenticated() {
  const response = await fetch("/api/internal-session", {
    credentials: "same-origin",
  });
  const payload = await response.json();

  if (payload.authenticated) {
    window.location.replace(getNextPath());
  }
}

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = loginForm.querySelector("[type='submit']");
    const formData = new FormData(loginForm);
    const adminKey = String(formData.get("adminKey") || "").trim();

    if (!adminKey) {
      return;
    }

    submitButton.disabled = true;
    feedbackNode.textContent = "Checking access...";

    try {
      const response = await fetch("/api/internal-session", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminKey,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to authenticate.");
      }

      window.location.replace(getNextPath());
    } catch (error) {
      feedbackNode.textContent = error.message;
    } finally {
      submitButton.disabled = false;
    }
  });

  redirectIfAuthenticated().catch(() => {
    feedbackNode.textContent = "Enter the internal access key configured for this environment.";
  });
}
