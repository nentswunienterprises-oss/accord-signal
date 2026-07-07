const crypto = require("crypto");

const ADMIN_KEY = process.env.ADMIN_ACCESS_KEY || "accord-signal-admin";
const SESSION_COOKIE_NAME = "accord_signal_internal";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

function getHeader(request, name) {
  const header = request.headers?.[name];

  if (Array.isArray(header)) {
    return header[0];
  }

  return header;
}

function parseCookies(request) {
  const raw = getHeader(request, "cookie");

  if (!raw) {
    return {};
  }

  return raw.split(";").reduce((cookies, pair) => {
    const separatorIndex = pair.indexOf("=");

    if (separatorIndex === -1) {
      return cookies;
    }

    const key = pair.slice(0, separatorIndex).trim();
    const value = pair.slice(separatorIndex + 1).trim();

    if (key) {
      cookies[key] = decodeURIComponent(value);
    }

    return cookies;
  }, {});
}

function createSessionToken() {
  return crypto
    .createHash("sha256")
    .update(`${ADMIN_KEY}|accord-signal-internal-session|v1`)
    .digest("hex");
}

function buildCookieAttributes(request) {
  const forwardedProto = getHeader(request, "x-forwarded-proto");
  const isSecure = process.env.NODE_ENV === "production" || forwardedProto === "https";

  return [
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
    isSecure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

function setSessionCookie(request, response) {
  response.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(createSessionToken())}; ${buildCookieAttributes(request)}`
  );
}

function clearSessionCookie(response) {
  response.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

function hasValidCookie(request) {
  const cookies = parseCookies(request);
  return cookies[SESSION_COOKIE_NAME] === createSessionToken();
}

function isAuthorizedRequest(request) {
  const headerToken = getHeader(request, "x-admin-key");
  return headerToken === ADMIN_KEY || hasValidCookie(request);
}

module.exports = {
  ADMIN_KEY,
  SESSION_COOKIE_NAME,
  clearSessionCookie,
  getHeader,
  isAuthorizedRequest,
  parseCookies,
  setSessionCookie,
};
