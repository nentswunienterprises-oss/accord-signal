(function createEmailGeneratorLibrary(globalScope) {
  function parseMarkdownDocument(markdown) {
    const source = String(markdown || "").replace(/\r\n/g, "\n");

    if (!source.startsWith("---\n")) {
      return {
        data: {},
        body: source.trim(),
      };
    }

    const endIndex = source.indexOf("\n---\n", 4);

    if (endIndex === -1) {
      return {
        data: {},
        body: source.trim(),
      };
    }

    const rawFrontmatter = source.slice(4, endIndex);
    const body = source.slice(endIndex + 5).trim();
    const data = {};

    rawFrontmatter.split("\n").forEach((line) => {
      const separatorIndex = line.indexOf(":");

      if (separatorIndex === -1) {
        return;
      }

      const key = line.slice(0, separatorIndex).trim();
      let value = line.slice(separatorIndex + 1).trim();

      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
      }

      data[key] = value;
    });

    return {
      data,
      body,
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

  function renderInlineMarkdown(text) {
    return escapeHtml(text)
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
  }

  function renderTable(block) {
    const rows = block
      .trim()
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()));

    if (rows.length < 2) {
      return `<p>${renderInlineMarkdown(block.trim())}</p>`;
    }

    const header = rows[0];
    const bodyRows = rows.slice(2);
    const headerHtml = header.map((cell) => `<th>${renderInlineMarkdown(cell)}</th>`).join("");
    const bodyHtml = bodyRows
      .map(
        (cells) =>
          `<tr>${cells.map((cell) => `<td>${renderInlineMarkdown(cell)}</td>`).join("")}</tr>`
      )
      .join("");

    return `<table class="document-table"><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
  }

  function renderMarkdownHtml(markdownBody) {
    const blocks = String(markdownBody || "")
      .replace(/\r\n/g, "\n")
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean);

    return blocks
      .map((block) => {
        if (/^\|.+\|$/m.test(block) && block.includes("\n| ---")) {
          return renderTable(block);
        }

        if (block.startsWith("### ")) {
          return `<h3>${renderInlineMarkdown(block.slice(4))}</h3>`;
        }

        if (block.startsWith("## ")) {
          return `<h2>${renderInlineMarkdown(block.slice(3))}</h2>`;
        }

        if (block.startsWith("# ")) {
          return `<h1>${renderInlineMarkdown(block.slice(2))}</h1>`;
        }

        if (block.startsWith("> ")) {
          return `<blockquote>${renderInlineMarkdown(block.slice(2))}</blockquote>`;
        }

        if (/^(- |\* )/m.test(block)) {
          const items = block
            .split("\n")
            .map((line) => line.replace(/^(- |\* )/, "").trim())
            .filter(Boolean)
            .map((item) => `<li>${renderInlineMarkdown(item)}</li>`)
            .join("");

          return `<ul>${items}</ul>`;
        }

        if (/^\d+\. /m.test(block)) {
          const items = block
            .split("\n")
            .map((line) => line.replace(/^\d+\. /, "").trim())
            .filter(Boolean)
            .map((item) => `<li>${renderInlineMarkdown(item)}</li>`)
            .join("");

          return `<ol>${items}</ol>`;
        }

        return block
          .split("\n")
          .map((line) => `<p>${renderInlineMarkdown(line)}</p>`)
          .join("");
      })
      .join("\n");
  }

  function resolveTemplateData(documentPayload, overrides = {}) {
    const parsed = typeof documentPayload === "string" ? parseMarkdownDocument(documentPayload) : documentPayload;
    const data = {
      ...parsed.data,
      ...overrides,
    };
    const documentType = formatDocumentTypeLabel(data.documentType || "letter");

    return {
      BODY: renderMarkdownHtml(parsed.body),
      CLIENT_NAME: escapeHtml(data.clientName || "Client"),
      DATE: escapeHtml(data.date || new Date().toLocaleDateString("en-ZA")),
      DOCUMENT_TITLE: escapeHtml(data.documentTitle || "Document"),
      DOCUMENT_TYPE: escapeHtml(documentType),
      FOOTER: escapeHtml(data.footer || "Accord Signal"),
      GREETING: escapeHtml(data.greeting || "Dear Team,"),
      REFERENCE_NUMBER: escapeHtml(data.referenceNumber || ""),
      RECIPIENT_NAME: escapeHtml(data.recipientName || ""),
      RECIPIENT_TITLE: escapeHtml(data.recipientTitle || ""),
      SENDER_NAME: escapeHtml(data.senderName || "Accord Signal"),
      SENDER_TITLE: escapeHtml(data.senderTitle || ""),
      SUBJECT: escapeHtml(data.subject || data.documentTitle || ""),
    };
  }

  function formatDocumentTypeLabel(documentType) {
    const normalized = String(documentType || "letter").trim().toLowerCase();
    const labels = {
      letter: "Letter",
      "internal-document": "Internal Document",
      proposal: "Proposal",
      quotation: "Quotation",
    };

    return labels[normalized] || normalized.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function injectTemplate(templateHtml, templateData) {
    return String(templateHtml || "").replace(/\{\{([A-Z0-9_]+)\}\}/g, (match, key) => {
      return Object.prototype.hasOwnProperty.call(templateData, key) ? templateData[key] : "";
    });
  }

  function renderEmailHtml(options) {
    const templateData = resolveTemplateData(options.markdown, options.overrides);
    const logoLibrary = globalScope.AccordSignalEmailLogoSvg;
    const logoUrl =
      options.logoUrl ||
      globalScope.ACCORD_SIGNAL_EMAIL_LOGO_URL ||
      (logoLibrary && typeof logoLibrary.getDataUri === "function" ? logoLibrary.getDataUri() : "");

    return injectTemplate(options.templateHtml, {
      ...templateData,
      BRAND_NAME: "Accord Signal",
      BRAND_TAGLINE: "Capability Infrastructure",
      LOGO_URL: logoUrl,
    });
  }

  const api = {
    escapeHtml,
    formatDocumentTypeLabel,
    injectTemplate,
    parseMarkdownDocument,
    renderEmailHtml,
    renderMarkdownHtml,
    resolveTemplateData,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  globalScope.AccordSignalEmailGenerator = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
