const http = require("http");
const fs = require("fs");
const path = require("path");
const { loadEnvFile } = require("./lib/load-env");
const handleSubmissionsRequest = require("./api/submissions");
const handleGeneratePdfRequest = require("./api/generate-pdf");
const handleDocumentDraftsRequest = require("./api/document-drafts");
const handleInternalSessionRequest = require("./api/internal-session");
const { isAuthorizedRequest } = require("./lib/internal-auth");

loadEnvFile();

const host = "127.0.0.1";
const port = Number(process.env.PORT) || 3000;
const root = process.cwd();

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

function resolvePath(urlPath) {
  const pathname = decodeURIComponent(urlPath);
  const normalized = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");

  if (path.extname(normalized)) {
    return path.normalize(path.join(root, normalized));
  }

  return path.normalize(path.join(root, normalized, "index.html"));
}

function isInsideRoot(filePath) {
  return filePath.startsWith(root);
}

function serveStatic(request, response) {
  const filePath = resolvePath(new URL(request.url || "/", `http://${request.headers.host}`).pathname);

  if (!isInsideRoot(filePath)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError || !stats.isFile()) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not Found");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const contentType = contentTypes[extension] || "application/octet-stream";

    response.writeHead(200, { "Content-Type": contentType });
    fs.createReadStream(filePath).pipe(response);
  });
}

function isProtectedInternalRoute(pathname) {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/generate-email") ||
    pathname.startsWith("/generate-pdf")
  );
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);

  if (url.pathname === "/api/submissions") {
    handleSubmissionsRequest(request, response);
    return;
  }

  if (url.pathname === "/api/generate-pdf") {
    handleGeneratePdfRequest(request, response);
    return;
  }

  if (url.pathname === "/api/document-drafts") {
    handleDocumentDraftsRequest(request, response);
    return;
  }

  if (url.pathname === "/api/internal-session") {
    handleInternalSessionRequest(request, response);
    return;
  }

  if (isProtectedInternalRoute(url.pathname) && !isAuthorizedRequest(request)) {
    response.writeHead(302, {
      Location: `/internal/?next=${encodeURIComponent(url.pathname)}`,
      "Cache-Control": "no-store",
    });
    response.end();
    return;
  }

  serveStatic(request, response);
});

server.listen(port, host, () => {
  console.log(`Accord Signal dev server running at http://${host}:${port}`);
});
