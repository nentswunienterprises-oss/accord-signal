const path = require("path");
const { generatePdfDocument } = require("../accord-signal-letterhead-system/pdf-service");
const {
  logAuditEvent,
  normalizeBoolean,
  readJsonBody,
  sanitizeMultilineText,
  sanitizePlainText,
  sendJson,
} = require("../lib/api-utils");
const { isAuthorizedRequest } = require("../lib/internal-auth");

const requestWindow = new Map();
const MAX_REQUESTS_PER_MINUTE = 10;

function getRequestIp(request) {
  const forwardedFor = request.headers["x-forwarded-for"];

  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  return request.socket?.remoteAddress || "unknown";
}

function isRateLimited(request) {
  const ip = getRequestIp(request);
  const now = Date.now();
  const windowStart = now - 60_000;
  const current = (requestWindow.get(ip) || []).filter((timestamp) => timestamp > windowStart);

  current.push(now);
  requestWindow.set(ip, current);

  return current.length > MAX_REQUESTS_PER_MINUTE;
}

function getDownloadName(fileName, overrides) {
  const baseName = sanitizePlainText(
    path.basename(fileName || overrides.documentTitle || "accord-signal-document"),
    100
  )
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9-_ ]/gi, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();

  return `${baseName || "accord-signal-document"}.pdf`;
}

function normalizeOverrides(overrides) {
  const allowedKeys = ["documentTitle", "clientName", "date", "referenceNumber", "footer"];

  return allowedKeys.reduce((normalized, key) => {
    if (typeof overrides?.[key] === "undefined") {
      return normalized;
    }

    normalized[key] = sanitizePlainText(overrides[key], 240);
    return normalized;
  }, {});
}

async function handleGeneratePdfRequest(request, response) {
  if (!isAuthorizedRequest(request)) {
    sendJson(response, 401, { error: "Unauthorized" });
    return;
  }

  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  if (isRateLimited(request)) {
    sendJson(response, 429, { error: "Too many PDF requests. Please wait and try again." });
    return;
  }

  try {
    const body = await readJsonBody(request, {
      maxBytes: 350 * 1024,
    });
    const markdown = sanitizeMultilineText(body.markdown, 250 * 1024);

    if (!markdown) {
      sendJson(response, 400, {
        error: "Markdown is required.",
      });
      return;
    }

    const overrides = normalizeOverrides(body.overrides || {});
    const pdfBuffer = await generatePdfDocument({
      markdown,
      overrides,
      useReferenceBackground: normalizeBoolean(body.useReferenceBackground),
    });
    const downloadName = getDownloadName(body.fileName, overrides);

    logAuditEvent("document-pdf.generated", {
      fileName: downloadName,
      requestIp: getRequestIp(request),
    });

    response.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${downloadName}"`,
      "Cache-Control": "no-store",
      "Content-Length": Buffer.byteLength(pdfBuffer),
    });
    response.end(pdfBuffer);
  } catch (error) {
    console.error(error);
    sendJson(response, error.statusCode || 500, {
      error: error.statusCode ? error.message : "Unable to generate the PDF.",
    });
  }
}

module.exports = handleGeneratePdfRequest;
