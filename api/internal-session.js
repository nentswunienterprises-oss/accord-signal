const { logAuditEvent, readJsonBody, sendJson } = require("../lib/api-utils");
const {
  ADMIN_KEY,
  clearSessionCookie,
  isAuthorizedRequest,
  setSessionCookie,
} = require("../lib/internal-auth");

async function handleInternalSessionRequest(request, response) {
  if (request.method === "GET") {
    sendJson(response, 200, {
      authenticated: isAuthorizedRequest(request),
    });
    return;
  }

  if (request.method === "POST") {
    try {
      const body = await readJsonBody(request, {
        maxBytes: 8 * 1024,
      });
      const adminKey = String(body.adminKey || "").trim();

      if (adminKey !== ADMIN_KEY) {
        sendJson(response, 401, { error: "Unauthorized" });
        return;
      }

      setSessionCookie(request, response);
      logAuditEvent("internal.session.created");
      sendJson(response, 200, {
        ok: true,
      });
    } catch (error) {
      sendJson(response, error.statusCode || 500, {
        error: error.statusCode ? error.message : "Unable to create the session.",
      });
    }

    return;
  }

  if (request.method === "DELETE") {
    clearSessionCookie(response);
    logAuditEvent("internal.session.cleared");
    sendJson(response, 200, {
      ok: true,
    });
    return;
  }

  sendJson(response, 405, { error: "Method not allowed" });
}

module.exports = handleInternalSessionRequest;
