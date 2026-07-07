const pdfShell = window.AccordSignalInternalTools;
const pdfGenerator = window.AccordSignalEmailGenerator;
const pdfPanelLibrary = window.AccordSignalComposerPanel;

const pdfComposerRoot = document.querySelector("#document-composer-root");
const pdfPreviewFrame = document.querySelector("#pdf-preview-frame");
const pdfMarkdownOutput = document.querySelector("#markdown-output");
const pdfDownloadButton = document.querySelector("#download-pdf");
const pdfPreviewStatus = document.querySelector("#pdf-preview-status");
const pdfLogoutButton = document.querySelector("#tool-logout");
const referenceBackgroundToggle = document.querySelector("#use-reference-background");

let currentPdfMarkdown = "";
let currentPdfHtml = "";
let pdfTemplate = "";
let lastState = null;

function setPdfStatus(message) {
  if (pdfPreviewStatus) {
    pdfPreviewStatus.textContent = message;
  }
}

async function loadPdfTemplate() {
  const response = await fetch("/accord-signal-letterhead-system/templates/accord-signal-letter-pdf.html");
  pdfTemplate = await response.text();
}

function renderPdfPreview({ state, markdown }) {
  currentPdfMarkdown = markdown;
  lastState = state;

  const templateData = pdfGenerator.resolveTemplateData(markdown, {});
  currentPdfHtml = pdfGenerator.injectTemplate(pdfTemplate, {
    ...templateData,
    BRAND_NAME: "Accord Signal",
    BRAND_TAGLINE: "Capability Infrastructure",
    REFERENCE_BACKGROUND_STYLE:
      referenceBackgroundToggle?.checked ? "background: rgba(107, 111, 61, 0.04);" : "",
  });

  if (pdfPreviewFrame) {
    pdfPreviewFrame.srcdoc = currentPdfHtml;
  }

  if (pdfMarkdownOutput) {
    pdfMarkdownOutput.value = markdown;
  }

  setPdfStatus("Preview updated.");
}

async function downloadPdf() {
  if (!currentPdfMarkdown) {
    return;
  }

  const response = await fetch("/api/generate-pdf", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      markdown: currentPdfMarkdown,
      fileName: `${lastState?.documentTitle || "accord-signal-document"}.md`,
      overrides: {
        documentTitle: lastState?.documentTitle || "",
        clientName: lastState?.clientName || "",
        date: lastState?.date || "",
        referenceNumber: lastState?.referenceNumber || "",
        footer: lastState?.footer || "",
      },
      useReferenceBackground: Boolean(referenceBackgroundToggle?.checked),
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Unable to generate the PDF.");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "accord-signal-document.pdf";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function initPdfPage() {
  const authenticated = await pdfShell.ensureAuthenticated("/generate-pdf/");

  if (!authenticated) {
    return;
  }

  await loadPdfTemplate();
  pdfShell.bindLogout(pdfLogoutButton);

  pdfPanelLibrary.mountDocumentComposer({
    root: pdfComposerRoot,
    title: "Compose the PDF source document",
    onChange: renderPdfPreview,
  });

  pdfDownloadButton?.addEventListener("click", async () => {
    pdfDownloadButton.disabled = true;
    setPdfStatus("Generating PDF...");

    try {
      await downloadPdf();
      setPdfStatus("PDF generated and downloaded.");
    } catch (error) {
      setPdfStatus(error.message);
    } finally {
      pdfDownloadButton.disabled = false;
    }
  });

  referenceBackgroundToggle?.addEventListener("change", () => {
    if (currentPdfMarkdown) {
      renderPdfPreview({
        state: lastState,
        markdown: currentPdfMarkdown,
      });
    }
  });
}

initPdfPage().catch(() => {
  setPdfStatus("The PDF generator could not be initialized.");
});
