const fs = require("fs");
const path = require("path");
const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");
const { renderTemplateHtml } = require("./render-utils");

chromium.setGraphicsMode = false;

async function resolveExecutablePath() {
  const explicitPath = process.env.PUPPETEER_EXECUTABLE_PATH;

  if (explicitPath && fs.existsSync(explicitPath) && fs.statSync(explicitPath).isFile()) {
    return explicitPath;
  }

  const commonPaths = [
    process.env["PROGRAMFILES"] && path.join(process.env["PROGRAMFILES"], "Google", "Chrome", "Application", "chrome.exe"),
    process.env["PROGRAMFILES(X86)"] &&
      path.join(process.env["PROGRAMFILES(X86)"], "Google", "Chrome", "Application", "chrome.exe"),
    process.env["PROGRAMFILES"] &&
      path.join(process.env["PROGRAMFILES"], "Microsoft", "Edge", "Application", "msedge.exe"),
    process.env["PROGRAMFILES(X86)"] &&
      path.join(process.env["PROGRAMFILES(X86)"], "Microsoft", "Edge", "Application", "msedge.exe"),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe"),
  ].filter(Boolean);

  const commonExecutable = commonPaths.find(
    (candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()
  );

  if (commonExecutable) {
    return commonExecutable;
  }

  try {
    const chromiumPath = await chromium.executablePath();

    if (chromiumPath && fs.existsSync(chromiumPath)) {
      if (fs.statSync(chromiumPath).isFile()) {
        if (process.platform !== "win32") {
          return chromiumPath;
        }

        if (path.extname(chromiumPath).toLowerCase() === ".exe") {
          return chromiumPath;
        }
      }

      if (fs.statSync(chromiumPath).isDirectory()) {
        const nestedExecutable = [
          path.join(chromiumPath, "chrome.exe"),
          path.join(chromiumPath, "chromium.exe"),
          path.join(chromiumPath, "chromium"),
        ].find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());

        if (nestedExecutable) {
          return nestedExecutable;
        }
      }
    }
  } catch {}

  return null;
}

async function getLaunchOptions(executablePath) {
  const isServerlessLinux =
    process.platform !== "win32" &&
    (process.env.VERCEL === "1" || executablePath.includes("/tmp/"));
  const headless = isServerlessLinux ? "shell" : true;

  return {
    executablePath,
    args: isServerlessLinux
      ? await puppeteer.defaultArgs({
          args: chromium.args,
          headless,
        })
      : await puppeteer.defaultArgs(),
    defaultViewport: {
      width: 1240,
      height: 1754,
      deviceScaleFactor: 1.5,
    },
    headless,
    ...(isServerlessLinux
      ? {
          ignoreHTTPSErrors: true,
        }
      : {}),
  };
}

async function generatePdfDocument(options) {
  const executablePath = await resolveExecutablePath();

  if (!executablePath) {
    throw new Error("No Chromium executable was found for PDF generation.");
  }

  const browser = await puppeteer.launch(await getLaunchOptions(executablePath));

  try {
    const page = await browser.newPage();
    const html = await renderTemplateHtml({
      markdown: options.markdown,
      overrides: options.overrides,
      templateName: "accord-signal-letter-pdf.html",
      useReferenceBackground: options.useReferenceBackground,
    });

    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    return await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "16mm",
        right: "14mm",
        bottom: "26mm",
        left: "14mm",
      },
      preferCSSPageSize: true,
    });
  } finally {
    await browser.close();
  }
}

module.exports = {
  generatePdfDocument,
};
