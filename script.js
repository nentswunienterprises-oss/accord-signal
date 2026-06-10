const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelectorAll(".site-nav a");

if (menuToggle) {
  menuToggle.addEventListener("click", () => {
    const isOpen = document.body.classList.toggle("is-nav-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    document.body.classList.remove("is-nav-open");
    menuToggle?.setAttribute("aria-expanded", "false");
  });
});

const revealItems = document.querySelectorAll("[data-reveal]");

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  },
  {
    threshold: 0.15,
    rootMargin: "0px 0px -6% 0px",
  }
);

revealItems.forEach((item, index) => {
  item.style.transitionDelay = `${Math.min(index * 45, 360)}ms`;
  revealObserver.observe(item);
});

const briefForm = document.querySelector("#brief-form");
const successPanel = document.querySelector("#brief-success");
const referenceNumberElement = document.querySelector("#reference-number");
const copyReferenceButton = document.querySelector("#copy-reference");
const copyFeedback = document.querySelector("#copy-feedback");

async function copyReference(referenceNumber) {
  await navigator.clipboard.writeText(referenceNumber);
}

if (briefForm) {
  briefForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = briefForm.querySelector("[type='submit']");
    const originalLabel = submitButton?.dataset.submitLabel || submitButton?.textContent || "Submit";
    const formData = new FormData(briefForm);
    const payload = Object.fromEntries(formData.entries());

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Submitting...";
    }

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to submit the brief.");
      }

      if (referenceNumberElement) {
        referenceNumberElement.textContent = result.referenceNumber;
      }

      briefForm.reset();
      successPanel?.classList.remove("is-hidden");
      copyFeedback && (copyFeedback.textContent = "Reference number ready to copy.");
      successPanel?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (error) {
      successPanel?.classList.remove("is-hidden");
      if (referenceNumberElement) {
        referenceNumberElement.textContent = "Submission failed";
      }
      if (copyFeedback) {
        copyFeedback.textContent = error.message;
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalLabel;
      }
    }
  });
}

if (copyReferenceButton) {
  copyReferenceButton.addEventListener("click", async () => {
    const referenceNumber = referenceNumberElement?.textContent?.trim();

    if (!referenceNumber || referenceNumber === "Submission failed") {
      return;
    }

    try {
      await copyReference(referenceNumber);
      if (copyFeedback) {
        copyFeedback.textContent = "Reference number copied.";
      }
    } catch {
      if (copyFeedback) {
        copyFeedback.textContent = "Copy failed. Please copy the reference manually.";
      }
    }
  });
}
