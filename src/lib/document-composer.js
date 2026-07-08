(function createDocumentComposerLibrary(globalScope) {
  const DOCUMENT_TYPES = [
    { id: "letter", label: "Letter" },
    { id: "internal-document", label: "Internal Document" },
    { id: "proposal", label: "Proposal" },
    { id: "quotation", label: "Quotation" },
  ];

  const DEFAULT_FOOTER =
    "Accord Signal | Capability Infrastructure | Role Architecture | Attention Alignment";
  const DEFAULT_PREFIX = "AS";

  function formatLongDate(date = new Date()) {
    return new Intl.DateTimeFormat("en-ZA", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(date);
  }

  function createReferenceNumber(prefix = DEFAULT_PREFIX) {
    const stamp = [
      datePart(new Date().getFullYear(), 4),
      datePart(new Date().getMonth() + 1, 2),
      datePart(new Date().getDate(), 2),
    ].join("");
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${prefix}-${stamp}-${suffix}`;
  }

  function datePart(value, length) {
    return String(value).padStart(length, "0");
  }

  function getDefaultSections(documentType) {
    if (documentType === "proposal") {
      return [
        {
          id: createId("section"),
          title: "Objective",
          heading: "",
          subheading: "",
          body: "Describe the institutional objective this proposal is designed to address.",
          bullets: [],
          bodyAfterBullets: "",
        },
        {
          id: createId("section"),
          title: "Scope of Work",
          heading: "",
          subheading: "",
          body: "Outline the workstreams, deliverables, and operating responsibilities included in the engagement.",
          bullets: ["Capability diagnosis", "Role architecture", "Delivery rhythm"],
          bodyAfterBullets: "",
        },
        {
          id: createId("section"),
          title: "Delivery Approach",
          heading: "",
          subheading: "",
          body: "Clarify how the work will be sequenced, reviewed, and governed.",
          bullets: [],
          bodyAfterBullets: "",
        },
        {
          id: createId("section"),
          title: "Commercial Terms",
          heading: "",
          subheading: "",
          body: "State the commercial basis, timing assumptions, and payment expectations.",
          bullets: [],
          bodyAfterBullets: "",
        },
      ];
    }

    if (documentType === "quotation") {
      return [
        {
          id: createId("section"),
          title: "Scope Summary",
          heading: "",
          subheading: "",
          body: "Summarize the quoted work and any planning assumptions.",
          bullets: [],
          bodyAfterBullets: "",
        },
        {
          id: createId("section"),
          title: "Commercial Notes",
          heading: "",
          subheading: "",
          body: "Clarify exclusions, validity period, and invoicing expectations.",
          bullets: [],
          bodyAfterBullets: "",
        },
      ];
    }

    if (documentType === "internal-document") {
      return [
        {
          id: createId("section"),
          title: "Purpose",
          heading: "",
          subheading: "",
          body: "State the internal purpose of this document and the operational context it addresses.",
          bullets: [],
          bodyAfterBullets: "",
        },
        {
          id: createId("section"),
          title: "Key Direction",
          heading: "",
          subheading: "",
          body: "Set out the decisions, standards, or instructions that internal teams are expected to follow.",
          bullets: [],
          bodyAfterBullets: "",
        },
        {
          id: createId("section"),
          title: "Execution Notes",
          heading: "",
          subheading: "",
          body: "Clarify owners, timing, dependencies, and any internal follow-through required.",
          bullets: [],
          bodyAfterBullets: "",
        },
      ];
    }

    return [
      {
        id: createId("section"),
        title: "Context",
        heading: "",
        subheading: "",
        body: "Set out the situation, instruction, or concern that this letter addresses.",
        bullets: [],
        bodyAfterBullets: "",
      },
      {
        id: createId("section"),
        title: "Response",
        heading: "",
        subheading: "",
        body: "State the core response, finding, or direction clearly and directly.",
        bullets: [],
        bodyAfterBullets: "",
      },
      {
        id: createId("section"),
        title: "Next Steps",
        heading: "",
        subheading: "",
        body: "List the immediate actions, owners, or follow-up commitments.",
        bullets: [],
        bodyAfterBullets: "",
      },
    ];
  }

  function getDefaultLineItems() {
    return [
      {
        id: createId("line"),
        description: "Capability infrastructure advisory",
        quantity: 1,
        unitPrice: 0,
      },
    ];
  }

  function getDefaultSubject(documentType) {
    if (documentType === "internal-document") {
      return "Internal document for business operations";
    }

    if (documentType === "proposal") {
      return "Proposal for capability infrastructure support";
    }

    if (documentType === "quotation") {
      return "Quotation for advisory services";
    }

    return "Letter regarding capability development";
  }

  function getDefaultTitle(documentType) {
    if (documentType === "internal-document") {
      return "Internal Business Document";
    }

    if (documentType === "proposal") {
      return "Capability Infrastructure Proposal";
    }

    if (documentType === "quotation") {
      return "Capability Infrastructure Quotation";
    }

    return "Institutional Letter";
  }

  function getDefaultState(documentType = "letter") {
    const normalizedType = normalizeDocumentType(documentType);

    return {
      documentType: normalizedType,
      documentTitle: getDefaultTitle(normalizedType),
      clientName: "",
      date: formatLongDate(),
      referenceNumber: createReferenceNumber(),
      footer: DEFAULT_FOOTER,
      subject: getDefaultSubject(normalizedType),
      recipientName: "",
      recipientTitle: "",
      greeting: "Dear Team,",
      intro: "",
      sections: getDefaultSections(normalizedType),
      lineItems: normalizedType === "quotation" ? getDefaultLineItems() : [],
      notes: "",
      closing: "We remain available to support the next phase of work.",
      signOff: "Sincerely,",
      senderName: "Accord Signal",
      senderTitle: "Capability Infrastructure Division",
    };
  }

  function normalizeDocumentType(documentType) {
    return DOCUMENT_TYPES.some((entry) => entry.id === documentType) ? documentType : "letter";
  }

  function getDocumentTypeLabel(documentType) {
    const entry = DOCUMENT_TYPES.find((item) => item.id === normalizeDocumentType(documentType));
    return entry ? entry.label : "Letter";
  }

  function createId(prefix) {
    const randomPart = Math.random().toString(36).slice(2, 10);
    return `${prefix}-${randomPart}`;
  }

  function normalizeSection(section, index) {
    return {
      id: section?.id || createId(`section-${index}`),
      title: String(section?.title || "").trim(),
      heading: String(section?.heading || "").trim(),
      subheading: String(section?.subheading || "").trim(),
      body: String(section?.body || "").trim(),
      bullets: Array.isArray(section?.bullets)
        ? section.bullets.map((bullet) => String(bullet || "").trim()).filter(Boolean)
        : [],
      bodyAfterBullets: String(section?.bodyAfterBullets || "").trim(),
    };
  }

  function normalizeLineItem(item, index) {
    const quantity = Number(item?.quantity || 0);
    const unitPrice = Number(item?.unitPrice || 0);

    return {
      id: item?.id || createId(`line-${index}`),
      description: String(item?.description || "").trim(),
      quantity: Number.isFinite(quantity) ? quantity : 0,
      unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
    };
  }

  function coerceState(partialState) {
    const baseline = getDefaultState(partialState?.documentType);
    const documentType = normalizeDocumentType(partialState?.documentType || baseline.documentType);

    return {
      ...baseline,
      ...partialState,
      documentType,
      documentTitle: String(partialState?.documentTitle || baseline.documentTitle).trim(),
      clientName: String(partialState?.clientName || "").trim(),
      date: String(partialState?.date || baseline.date).trim(),
      referenceNumber: String(partialState?.referenceNumber || baseline.referenceNumber).trim(),
      footer: String(partialState?.footer || baseline.footer).trim(),
      subject: String(partialState?.subject || baseline.subject).trim(),
      recipientName: String(partialState?.recipientName || "").trim(),
      recipientTitle: String(partialState?.recipientTitle || "").trim(),
      greeting: String(partialState?.greeting || baseline.greeting).trim(),
      intro: String(partialState?.intro || "").trim(),
      sections: (Array.isArray(partialState?.sections) ? partialState.sections : baseline.sections)
        .map(normalizeSection)
        .filter(
          (section) =>
            section.title ||
            section.body ||
            section.bullets.length ||
            section.bodyAfterBullets ||
            section.heading ||
            section.subheading
        ),
      lineItems:
        documentType === "quotation"
          ? (Array.isArray(partialState?.lineItems) ? partialState.lineItems : baseline.lineItems)
              .map(normalizeLineItem)
              .filter((item) => item.description || item.quantity || item.unitPrice)
          : [],
      notes: String(partialState?.notes || "").trim(),
      closing:
        typeof partialState?.closing === "undefined" || partialState?.closing === null
          ? String(baseline.closing || "").trim()
          : String(partialState.closing).trim(),
      signOff: String(partialState?.signOff || baseline.signOff).trim(),
      senderName: String(partialState?.senderName || baseline.senderName).trim(),
      senderTitle: String(partialState?.senderTitle || baseline.senderTitle).trim(),
    };
  }

  function changeDocumentType(currentState, nextDocumentType) {
    const existing = coerceState(currentState);
    const nextDefaults = getDefaultState(nextDocumentType);

    return coerceState({
      ...existing,
      documentType: nextDefaults.documentType,
      documentTitle:
        existing.documentTitle && existing.documentTitle !== getDefaultTitle(existing.documentType)
          ? existing.documentTitle
          : nextDefaults.documentTitle,
      subject:
        existing.subject && existing.subject !== getDefaultSubject(existing.documentType)
          ? existing.subject
          : nextDefaults.subject,
      sections: nextDefaults.sections,
      lineItems: nextDefaults.lineItems,
    });
  }

  function reorderSections(currentState, sourceSectionId, targetSectionId, position = "before") {
    const normalized = coerceState(currentState);
    const sourceIndex = normalized.sections.findIndex((section) => section.id === sourceSectionId);
    const targetIndex = normalized.sections.findIndex((section) => section.id === targetSectionId);

    if (sourceIndex === -1 || targetIndex === -1 || sourceIndex === targetIndex) {
      return normalized;
    }

    const nextSections = normalized.sections.slice();
    const [movedSection] = nextSections.splice(sourceIndex, 1);
    let insertionIndex = targetIndex;

    if (position === "after") {
      insertionIndex += sourceIndex < targetIndex ? 0 : 1;
    } else if (sourceIndex < targetIndex) {
      insertionIndex -= 1;
    }

    nextSections.splice(Math.max(0, Math.min(insertionIndex, nextSections.length)), 0, movedSection);

    return coerceState({
      ...normalized,
      sections: nextSections,
    });
  }

  function getLineItemTotal(item) {
    return roundMoney(Number(item.quantity || 0) * Number(item.unitPrice || 0));
  }

  function calculateTotals(state) {
    const normalized = coerceState(state);
    const subtotal = normalized.lineItems.reduce(
      (runningTotal, item) => runningTotal + getLineItemTotal(item),
      0
    );

    return {
      subtotal: roundMoney(subtotal),
      grandTotal: roundMoney(subtotal),
    };
  }

  function roundMoney(value) {
    return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("en-ZA", {
      currency: "ZAR",
      style: "currency",
      minimumFractionDigits: 2,
    }).format(Number(value || 0));
  }

  function escapeYaml(value) {
    return String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n");
  }

  function toFrontmatter(state) {
    const normalized = coerceState(state);

    return [
      `documentTitle: "${escapeYaml(normalized.documentTitle)}"`,
      `clientName: "${escapeYaml(normalized.clientName)}"`,
      `date: "${escapeYaml(normalized.date)}"`,
      `referenceNumber: "${escapeYaml(normalized.referenceNumber)}"`,
      `footer: "${escapeYaml(normalized.footer)}"`,
      `documentType: "${escapeYaml(normalized.documentType)}"`,
      `subject: "${escapeYaml(normalized.subject)}"`,
      `recipientName: "${escapeYaml(normalized.recipientName)}"`,
      `recipientTitle: "${escapeYaml(normalized.recipientTitle)}"`,
      `greeting: "${escapeYaml(normalized.greeting)}"`,
      `closing: "${escapeYaml(normalized.closing)}"`,
      `signOff: "${escapeYaml(normalized.signOff)}"`,
      `senderName: "${escapeYaml(normalized.senderName)}"`,
      `senderTitle: "${escapeYaml(normalized.senderTitle)}"`,
    ].join("\n");
  }

  function buildMarkdown(state) {
    const normalized = coerceState(state);
    const parts = [];

    if (normalized.intro) {
      parts.push(normalized.intro);
    }

    normalized.sections.forEach((section) => {
      parts.push(`## ${section.title}`);

        if (section.heading) {
          parts.push(`### ${section.heading}`);
        }

        if (section.subheading) {
          parts.push(`#### ${section.subheading}`);
        }

      if (section.body) {
        parts.push(section.body);
      }

      if (section.bullets.length) {
        parts.push(section.bullets.map((bullet) => `- ${bullet}`).join("\n"));
      }

      if (section.bodyAfterBullets) {
        parts.push(section.bodyAfterBullets);
      }
    });

    if (normalized.documentType === "quotation" && normalized.lineItems.length) {
      const totals = calculateTotals(normalized);
      const lines = [
        "## Pricing Schedule",
        "| Description | Qty | Unit Price | Line Total |",
        "| --- | ---: | ---: | ---: |",
      ];

      normalized.lineItems.forEach((item) => {
        lines.push(
          `| ${item.description || "-"} | ${item.quantity} | ${formatCurrency(
            item.unitPrice
          )} | ${formatCurrency(getLineItemTotal(item))} |`
        );
      });

      lines.push(`| **Total** |  |  | **${formatCurrency(totals.grandTotal)}** |`);
      parts.push(lines.join("\n"));
    }

    if (normalized.notes) {
      parts.push("## Notes");
      parts.push(normalized.notes);
    }

    if (normalized.closing) {
      parts.push(normalized.closing);
    }

    const signatureLines = [
      normalized.signOff,
      normalized.senderName ? `**${normalized.senderName}**` : "",
      normalized.senderTitle,
    ].filter(Boolean);
    parts.push(signatureLines.join("\n"));

    return ["---", toFrontmatter(normalized), "---", "", parts.filter(Boolean).join("\n\n"), ""].join("\n");
  }

  const api = {
    DOCUMENT_TYPES,
    calculateTotals,
    changeDocumentType,
    coerceState,
    createId,
    createReferenceNumber,
    formatCurrency,
    getDocumentTypeLabel,
    getDefaultState,
    getDefaultSections,
    getLineItemTotal,
    reorderSections,
    toFrontmatter,
    buildMarkdown,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  globalScope.AccordSignalDocumentComposer = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
