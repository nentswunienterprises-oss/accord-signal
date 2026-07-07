(function createEmailLogoSvgLibrary(globalScope) {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144" role="img" aria-label="Accord Signal">
  <rect width="144" height="144" rx="24" fill="#f6f3ee"/>
  <path d="M18 18h38v38H32v26H18z" fill="#6b6f3d"/>
  <path d="M88 18h38v64h-14V42H88z" fill="#232426"/>
  <path d="M18 88h26v26h64v14H18z" fill="#7c8088"/>
  <path d="M88 88h38v38H62v-14h50V88z" fill="#d1cbc1"/>
  <rect x="60" y="60" width="24" height="24" fill="#6b6f3d"/>
</svg>`.trim();

  function getSvgMarkup() {
    return svg;
  }

  function getDataUri() {
    if (typeof btoa === "function") {
      return `data:image/svg+xml;base64,${btoa(svg)}`;
    }

    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  const api = {
    getDataUri,
    getSvgMarkup,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  globalScope.AccordSignalEmailLogoSvg = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
