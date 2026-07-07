const shell = window.AccordSignalInternalTools;
const emailGenerator = window.AccordSignalEmailGenerator;
const panelLibrary = window.AccordSignalComposerPanel;

const composerRoot = document.querySelector("#document-composer-root");
const previewFrame = document.querySelector("#email-preview-frame");
const markdownOutput = document.querySelector("#markdown-output");
const copyHtmlButton = document.querySelector("#copy-email-html");
const downloadHtmlButton = document.querySelector("#download-email-html");
const previewStatus = document.querySelector("#email-preview-status");
const logoutButton = document.querySelector("#tool-logout");

let currentMarkdown = "";
let currentEmailHtml = "";
let emailTemplate = "";

function setPreviewStatus(message) {
  if (previewStatus) {
    previewStatus.textContent = message;
  }
}

async function loadTemplate() {
  const response = await fetch("/accord-signal-letterhead-system/templates/accord-signal-email.html");
  emailTemplate = await response.text();
}

function updatePreview({ markdown }) {
  currentMarkdown = markdown;
  currentEmailHtml = emailGenerator.renderEmailHtml({
    markdown,
    templateHtml: emailTemplate,
  });

  if (previewFrame) {
    previewFrame.srcdoc = currentEmailHtml;
  }

  if (markdownOutput) {
    markdownOutput.value = markdown;
  }

  setPreviewStatus("Preview updated.");
}

async function copyRichHtml() {
  if (!currentEmailHtml) {
    return;
  }

  if (window.ClipboardItem && navigator.clipboard?.write) {
    const item = new ClipboardItem({
      "text/html": new Blob([currentEmailHtml], { type: "text/html" }),
      "text/plain": new Blob([currentMarkdown], { type: "text/plain" }),
    });

    await navigator.clipboard.write([item]);
    return;
  }

  await navigator.clipboard.writeText(currentEmailHtml);
}

function downloadHtml() {
  if (!currentEmailHtml) {
    return;
  }

  const blob = new Blob([currentEmailHtml], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "accord-signal-email.html";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function init() {
  const authenticated = await shell.ensureAuthenticated("/generate-email/");

  if (!authenticated) {
    return;
  }

  await loadTemplate();
  shell.bindLogout(logoutButton);

  panelLibrary.mountDocumentComposer({
    root: composerRoot,
    title: "Compose the email source document",
    onChange: updatePreview,
  });

  copyHtmlButton?.addEventListener("click", async () => {
    try {
      await copyRichHtml();
      setPreviewStatus("HTML copied. Paste into your mail composer.");
    } catch {
      setPreviewStatus("Clipboard copy failed. Download the HTML instead.");
    }
  });

  downloadHtmlButton?.addEventListener("click", () => {
    downloadHtml();
    setPreviewStatus("Email HTML downloaded.");
  });
}

init().catch(() => {
  setPreviewStatus("The email generator could not be initialized.");
});
