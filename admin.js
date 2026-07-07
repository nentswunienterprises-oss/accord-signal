const loginPanel = document.querySelector("#admin-login");
const loginForm = document.querySelector("#admin-login-form");
const loginFeedback = document.querySelector("#admin-login-feedback");
const dashboard = document.querySelector("#admin-dashboard");
const submissionTable = document.querySelector("#submission-table");
const submissionDetail = document.querySelector("#submission-detail");

const metricTotal = document.querySelector("#metric-total");
const metricNew = document.querySelector("#metric-new");
const metricToday = document.querySelector("#metric-today");

const storageKey = "accord_signal_admin_key";

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function renderDetail(submission) {
  if (!submissionDetail) {
    return;
  }

  submissionDetail.innerHTML = `
    <div class="section-heading compact">
      <p class="eyebrow">Detail</p>
      <h2>${escapeHtml(submission.referenceNumber)}</h2>
    </div>
    <div class="detail-stack">
      <div class="detail-block">
        <span class="detail-label">Status</span>
        <span class="status-pill">${escapeHtml(submission.status)}</span>
      </div>
      <div class="detail-block">
        <span class="detail-label">Organization</span>
        <p class="detail-value">${escapeHtml(submission.organizationName)}</p>
      </div>
      <div class="detail-block">
        <span class="detail-label">Requester</span>
        <p class="detail-value">${escapeHtml(submission.requesterName)}${submission.requesterRole ? `, ${escapeHtml(submission.requesterRole)}` : ""}</p>
      </div>
      <div class="detail-block">
        <span class="detail-label">Email</span>
        <p class="detail-value">${escapeHtml(submission.requesterEmail)}</p>
      </div>
      <div class="detail-block">
        <span class="detail-label">Primary Need</span>
        <p class="detail-value">${escapeHtml(submission.primaryNeed)}</p>
      </div>
      <div class="detail-block">
        <span class="detail-label">Team Size</span>
        <p class="detail-value">${escapeHtml(submission.teamSize || "-")}</p>
      </div>
      <div class="detail-block">
        <span class="detail-label">Urgency</span>
        <p class="detail-value">${escapeHtml(submission.urgency || "-")}</p>
      </div>
      <div class="detail-block">
        <span class="detail-label">Budget Range</span>
        <p class="detail-value">${escapeHtml(submission.budgetRange || "-")}</p>
      </div>
      <div class="detail-block">
        <span class="detail-label">Decision Maker</span>
        <p class="detail-value">${escapeHtml(submission.decisionMaker || "-")}</p>
      </div>
      <div class="detail-block">
        <span class="detail-label">Main Problem</span>
        <p class="detail-value">${escapeHtml(submission.mainProblem)}</p>
      </div>
      <div class="detail-block">
        <span class="detail-label">Desired Outcome</span>
        <p class="detail-value">${escapeHtml(submission.desiredOutcome)}</p>
      </div>
      <div class="detail-block">
        <span class="detail-label">Received</span>
        <p class="detail-value">${escapeHtml(formatDate(submission.createdAt))}</p>
      </div>
    </div>
  `;
}

function renderTable(submissions) {
  if (!submissionTable) {
    return;
  }

  if (!submissions.length) {
    submissionTable.innerHTML = `<p class="section-text">No submissions yet.</p>`;
    return;
  }

  const rows = submissions
    .map(
      (submission, index) => `
        <tr>
          <td>
            <button type="button" data-submission-index="${index}">
              <span class="submission-primary">${escapeHtml(submission.referenceNumber)}</span>
              <span class="submission-secondary">${escapeHtml(submission.organizationName)}</span>
            </button>
          </td>
          <td>${escapeHtml(submission.primaryNeed)}</td>
          <td>${escapeHtml(formatDate(submission.createdAt))}</td>
          <td><span class="status-pill">${escapeHtml(submission.status)}</span></td>
        </tr>
      `
    )
    .join("");

  submissionTable.innerHTML = `
    <table class="dashboard-table">
      <thead>
        <tr>
          <th>Reference</th>
          <th>Need</th>
          <th>Received</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  submissionTable.querySelectorAll("[data-submission-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const submission = submissions[Number(button.dataset.submissionIndex)];
      renderDetail(submission);
    });
  });

  renderDetail(submissions[0]);
}

async function loadDashboard(adminKey) {
  const headers = {};

  if (adminKey) {
    headers["x-admin-key"] = adminKey;
  }

  const response = await fetch("/api/submissions", {
    credentials: "same-origin",
    headers,
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Unable to load submissions.");
  }

  if (metricTotal) {
    metricTotal.textContent = String(payload.stats.total);
  }

  if (metricNew) {
    metricNew.textContent = String(payload.stats.new);
  }

  if (metricToday) {
    metricToday.textContent = String(payload.stats.today);
  }

  renderTable(payload.submissions);

  loginPanel?.classList.add("is-hidden");
  dashboard?.classList.remove("is-hidden");
}

async function attemptLogin(adminKey) {
  try {
    await loadDashboard(adminKey);
    sessionStorage.setItem(storageKey, adminKey);
  } catch (error) {
    if (loginFeedback) {
      loginFeedback.textContent = error.message;
    }
  }
}

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(loginForm);
    const adminKey = String(formData.get("adminKey") || "").trim();

    if (!adminKey) {
      return;
    }

    if (loginFeedback) {
      loginFeedback.textContent = "Checking access...";
    }

    await attemptLogin(adminKey);
  });

  const savedKey = sessionStorage.getItem(storageKey);
  attemptLogin(savedKey || "");
}
