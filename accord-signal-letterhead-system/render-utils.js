const fs = require("fs/promises");
const path = require("path");
const matter = require("gray-matter");
const { marked } = require("marked");

const TEMPLATE_DIR = path.join(process.cwd(), "accord-signal-letterhead-system", "templates");

marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: false,
  mangle: false,
});

function sanitizeMarkdownSource(markdown) {
  return String(markdown || "")
    .replace(/<script/gi, "&lt;script")
    .replace(/<\/script>/gi, "&lt;/script&gt;");
}

function parseDocumentMarkdown(markdown) {
  const parsed = matter(String(markdown || ""));

  return {
    data: parsed.data || {},
    body: String(parsed.content || "").trim(),
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderMarkdownHtml(markdownBody) {
  return marked.parse(sanitizeMarkdownSource(markdownBody || ""));
}

function resolveTemplateData(parsedDocument, overrides = {}) {
  const data = {
    ...parsedDocument.data,
    ...overrides,
  };

  return {
    BODY: renderMarkdownHtml(parsedDocument.body),
    BRAND_NAME: "Accord Signal",
    BRAND_TAGLINE: "Capability Infrastructure",
    CLIENT_NAME: escapeHtml(data.clientName || "Client"),
    DATE: escapeHtml(data.date || new Date().toLocaleDateString("en-ZA")),
    DOCUMENT_TITLE: escapeHtml(data.documentTitle || "Document"),
    DOCUMENT_TYPE: escapeHtml(data.documentType || "letter"),
    FOOTER: escapeHtml(
      data.footer || "Accord Signal | Capability Infrastructure | Role Architecture | Attention Alignment"
    ),
    GREETING: escapeHtml(data.greeting || "Dear Team,"),
    LOGO_URL: escapeHtml(process.env.VITE_EMAIL_LOGO_URL || ""),
    REFERENCE_NUMBER: escapeHtml(data.referenceNumber || ""),
    RECIPIENT_NAME: escapeHtml(data.recipientName || ""),
    RECIPIENT_TITLE: escapeHtml(data.recipientTitle || ""),
    SENDER_NAME: escapeHtml(data.senderName || "Accord Signal"),
    SENDER_TITLE: escapeHtml(data.senderTitle || ""),
    SUBJECT: escapeHtml(data.subject || data.documentTitle || ""),
  };
}

async function loadTemplate(templateName) {
  return fs.readFile(path.join(TEMPLATE_DIR, templateName), "utf8");
}

function injectTemplate(templateHtml, templateData) {
  return String(templateHtml || "").replace(/\{\{([A-Z0-9_]+)\}\}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(templateData, key) ? templateData[key] : "";
  });
}

function buildReferenceBackgroundStyle(useReferenceBackground) {
  if (!useReferenceBackground) {
    return "";
  }

  const backgroundUrl = process.env.ACCORD_SIGNAL_REFERENCE_BACKGROUND_URL || "";

  if (!backgroundUrl) {
    return "";
  }

  return `background-image: url('${backgroundUrl}'); background-size: cover; background-position: center;`;
}

async function renderTemplateHtml(options) {
  const parsed = parseDocumentMarkdown(options.markdown);
  const templateHtml = await loadTemplate(options.templateName);
  const templateData = resolveTemplateData(parsed, options.overrides);

  return injectTemplate(templateHtml, {
    ...templateData,
    REFERENCE_BACKGROUND_STYLE: buildReferenceBackgroundStyle(options.useReferenceBackground),
  });
}

module.exports = {
  injectTemplate,
  loadTemplate,
  parseDocumentMarkdown,
  renderMarkdownHtml,
  renderTemplateHtml,
  resolveTemplateData,
};
