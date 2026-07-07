const { deleteDraft, listDrafts, saveDraft, shouldUseSupabase } = require("../lib/document-drafts-store");
const {
  createSlug,
  logAuditEvent,
  readJsonBody,
  sanitizePlainText,
  sendJson,
} = require("../lib/api-utils");
const { isAuthorizedRequest } = require("../lib/internal-auth");

function validateDraftPayload(payload) {
  const name = sanitizePlainText(payload?.name || payload?.draft?.name, 120);
  const draft = payload?.draft || payload;

  if (!name) {
    return {
      error: "Draft name is required.",
    };
  }

  if (!draft?.payload || typeof draft.payload !== "object") {
    return {
      error: "Draft payload is required.",
    };
  }

  const normalizedPayload = JSON.parse(JSON.stringify(draft.payload));
  const timestamp = new Date().toISOString();

  return {
    draft: {
      id: sanitizePlainText(draft.id, 80) || crypto.randomUUID(),
      name,
      slug: createSlug(draft.slug || name),
      documentType: sanitizePlainText(draft.documentType || normalizedPayload.documentType || "letter", 32),
      payload: normalizedPayload,
      createdAt: sanitizePlainText(draft.createdAt, 40) || timestamp,
      updatedAt: timestamp,
    },
  };
}

const crypto = require("crypto");

async function handleDocumentDraftsRequest(request, response) {
  if (!isAuthorizedRequest(request)) {
    sendJson(response, 401, { error: "Unauthorized" });
    return;
  }

  if (request.method === "GET") {
    try {
      const drafts = await listDrafts();
      sendJson(response, 200, {
        drafts,
        remoteEnabled: shouldUseSupabase(),
      });
    } catch (error) {
      sendJson(response, 500, {
        error: "Unable to load drafts.",
      });
    }

    return;
  }

  if (request.method === "POST") {
    try {
      const body = await readJsonBody(request, {
        maxBytes: 350 * 1024,
      });
      const validation = validateDraftPayload(body);

      if (validation.error) {
        sendJson(response, 400, {
          error: validation.error,
        });
        return;
      }

      const draft = await saveDraft(validation.draft);
      logAuditEvent("document-draft.saved", {
        draftId: draft.id,
        documentType: draft.documentType,
      });
      sendJson(response, 200, {
        ok: true,
        draft,
      });
    } catch (error) {
      sendJson(response, error.statusCode || 500, {
        error: error.statusCode ? error.message : "Unable to save the draft.",
      });
    }

    return;
  }

  if (request.method === "DELETE") {
    try {
      const url = new URL(request.url || "/", `http://${request.headers.host}`);
      const id = sanitizePlainText(url.searchParams.get("id"), 80);

      if (!id) {
        sendJson(response, 400, {
          error: "Draft id is required.",
        });
        return;
      }

      await deleteDraft(id);
      logAuditEvent("document-draft.deleted", {
        draftId: id,
      });
      sendJson(response, 200, {
        ok: true,
      });
    } catch (error) {
      sendJson(response, 500, {
        error: "Unable to delete the draft.",
      });
    }

    return;
  }

  sendJson(response, 405, { error: "Method not allowed" });
}

module.exports = handleDocumentDraftsRequest;
