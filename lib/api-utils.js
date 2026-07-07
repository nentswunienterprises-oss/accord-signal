function sendJson(response, statusCode, payload, extraHeaders = {}) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders,
  });
  response.end(JSON.stringify(payload));
}

function sendHtml(response, statusCode, html) {
  response.writeHead(statusCode, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(html);
}

function normalizeBody(body) {
  if (!body) {
    return {};
  }

  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      const error = new Error("Invalid JSON payload.");
      error.statusCode = 400;
      throw error;
    }
  }

  return body;
}

async function readJsonBody(request, options = {}) {
  const maxBytes = options.maxBytes || 200 * 1024;

  if (typeof request.body !== "undefined") {
    return normalizeBody(request.body);
  }

  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    totalBytes += chunk.length;

    if (totalBytes > maxBytes) {
      const error = new Error(`Payload exceeds ${maxBytes} bytes.`);
      error.statusCode = 413;
      throw error;
    }

    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return normalizeBody(raw);
}

function sanitizePlainText(value, maxLength = 5000) {
  return String(value || "")
    .replace(/\0/g, "")
    .replace(/\r\n/g, "\n")
    .slice(0, maxLength)
    .trim();
}

function sanitizeMultilineText(value, maxLength = 50000) {
  return String(value || "")
    .replace(/\0/g, "")
    .replace(/\r\n/g, "\n")
    .slice(0, maxLength)
    .trim();
}

function createSlug(value) {
  const normalized = sanitizePlainText(value, 120).toLowerCase();
  return normalized
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeBoolean(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function logAuditEvent(event, details = {}) {
  const payload = {
    event,
    timestamp: new Date().toISOString(),
    ...details,
  };

  console.log(JSON.stringify(payload));
}

module.exports = {
  createSlug,
  escapeHtml,
  logAuditEvent,
  normalizeBoolean,
  readJsonBody,
  sanitizeMultilineText,
  sanitizePlainText,
  sendHtml,
  sendJson,
};
