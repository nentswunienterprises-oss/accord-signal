const pdfShell = window.AccordSignalInternalTools;
const pdfPanelLibrary = window.AccordSignalComposerPanel;

const pdfComposerRoot = document.querySelector("#document-composer-root");
const pdfPreviewFrame = document.querySelector("#pdf-preview-frame");
const pdfMarkdownOutput = document.querySelector("#markdown-output");
const pdfDownloadButton = document.querySelector("#download-pdf");
const pdfRefreshButton = document.querySelector("#refresh-pdf-preview");
const pdfPreviewStatus = document.querySelector("#pdf-preview-status");
const pdfLogoutButton = document.querySelector("#tool-logout");
const referenceBackgroundToggle = document.querySelector("#use-reference-background");

let currentPdfMarkdown = "";
let lastState = null;
let activePreviewUrl = "";
let previewTimer = null;
let previewAbortController = null;
let latestPreviewToken = 0;

function setPdfStatus(message) {
  if (pdfPreviewStatus) {
    pdfPreviewStatus.textContent = message;
  }
}

function buildPdfRequestPayload() {
  return {
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
  };
}

function clearPreviewTimer() {
  if (previewTimer) {
    window.clearTimeout(previewTimer);
    previewTimer = null;
  }
}

function revokeActivePreviewUrl() {
  if (activePreviewUrl) {
    URL.revokeObjectURL(activePreviewUrl);
    activePreviewUrl = "";
  }
}

async function requestPdfBlob(options = {}) {
  if (!currentPdfMarkdown) {
    return null;
  }

  const response = await fetch("/api/generate-pdf", {
    method: "POST",
    credentials: "same-origin",
    signal: options.signal,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildPdfRequestPayload()),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Unable to generate the PDF.");
  }

  return response.blob();
}

async function refreshPdfPreview(options = {}) {
  if (!currentPdfMarkdown) {
    return;
  }

  clearPreviewTimer();

  if (previewAbortController) {
    previewAbortController.abort();
  }

  const previewToken = latestPreviewToken + 1;
  latestPreviewToken = previewToken;
  const controller = new AbortController();
  previewAbortController = controller;

  if (pdfRefreshButton) {
    pdfRefreshButton.disabled = true;
  }

  setPdfStatus(options.statusMessage || "Rendering paginated PDF preview...");

  try {
    const blob = await requestPdfBlob({
      signal: controller.signal,
    });

    if (!blob || previewToken !== latestPreviewToken) {
      return;
    }

    revokeActivePreviewUrl();
    activePreviewUrl = URL.createObjectURL(blob);

    if (pdfPreviewFrame) {
      pdfPreviewFrame.src = `${activePreviewUrl}#view=FitH`;
    }

    setPdfStatus("PDF preview updated.");
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }

    setPdfStatus(error.message);
  } finally {
    if (previewAbortController === controller) {
      previewAbortController = null;
    }

    if (pdfRefreshButton) {
      pdfRefreshButton.disabled = false;
    }
  }
}

function schedulePdfPreview() {
  clearPreviewTimer();
  previewTimer = window.setTimeout(() => {
    refreshPdfPreview({
      statusMessage: "Rendering updated PDF pages...",
    });
  }, 2500);
  setPdfStatus("Preview queued...");
}

function handleComposerChange({ state, markdown }) {
  currentPdfMarkdown = markdown;
  lastState = state;

  if (pdfMarkdownOutput) {
    pdfMarkdownOutput.value = markdown;
  }

  schedulePdfPreview();
}

async function downloadPdf() {
  const blob = await requestPdfBlob();
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

  pdfShell.bindLogout(pdfLogoutButton);

  pdfPanelLibrary.mountDocumentComposer({
    root: pdfComposerRoot,
    title: "Compose the PDF source document",
    onChange: handleComposerChange,
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

  pdfRefreshButton?.addEventListener("click", async () => {
    await refreshPdfPreview({
      statusMessage: "Refreshing paginated PDF preview...",
    });
  });

  referenceBackgroundToggle?.addEventListener("change", () => {
    if (currentPdfMarkdown) {
      refreshPdfPreview({
        statusMessage: "Refreshing paginated PDF preview...",
      });
    }
  });

  window.addEventListener("beforeunload", () => {
    clearPreviewTimer();

    if (previewAbortController) {
      previewAbortController.abort();
    }

    revokeActivePreviewUrl();
  });
}

initPdfPage().catch(() => {
  setPdfStatus("The PDF generator could not be initialized.");
});
