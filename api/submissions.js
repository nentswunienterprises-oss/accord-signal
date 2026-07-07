const { createSubmission, listSubmissions } = require("../lib/submissions-store");
const { loadEnvFile } = require("../lib/load-env");
const { isAuthorizedRequest } = require("../lib/internal-auth");

loadEnvFile();

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

function normalizeBody(body) {
  if (!body) {
    return {};
  }

  if (typeof body === "string") {
    return JSON.parse(body);
  }

  return body;
}

async function readJsonBody(request) {
  if (typeof request.body !== "undefined") {
    return normalizeBody(request.body);
  }

  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return normalizeBody(raw);
}

function validateSubmission(payload) {
  const requiredFields = [
    "requesterName",
    "requesterEmail",
    "organizationName",
    "teamSize",
    "primaryNeed",
    "mainProblem",
    "desiredOutcome",
  ];

  for (const field of requiredFields) {
    if (!payload[field] || !String(payload[field]).trim()) {
      return `${field} is required`;
    }
  }

  return null;
}

async function handleSubmissionsRequest(request, response) {
  if (request.method === "GET") {
    if (!isAuthorizedRequest(request)) {
      sendJson(response, 401, { error: "Unauthorized" });
      return;
    }

    const payload = await listSubmissions();
    sendJson(response, 200, payload);
    return;
  }

  if (request.method === "POST") {
    try {
      const body = await readJsonBody(request);
      const error = validateSubmission(body);

      if (error) {
        sendJson(response, 400, { error });
        return;
      }

      const submission = await createSubmission(body);
      sendJson(response, 201, {
        ok: true,
        referenceNumber: submission.referenceNumber,
        submission,
      });
    } catch (error) {
      sendJson(response, 500, {
        error: "Unable to save the brief at this time.",
      });
    }

    return;
  }

  sendJson(response, 405, { error: "Method not allowed" });
}

module.exports = handleSubmissionsRequest;
