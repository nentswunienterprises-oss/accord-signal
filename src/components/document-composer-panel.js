(function createDocumentComposerPanelLibrary(globalScope) {
  const composer = globalScope.AccordSignalDocumentComposer;
  const draftsApi = globalScope.AccordSignalDocumentDrafts;

  function mountDocumentComposer(options) {
    const root = options.root;

    if (!root || !composer || !draftsApi) {
      throw new Error("Document composer dependencies are unavailable.");
    }

    const autosave = draftsApi.loadAutosave();
    let state = composer.coerceState(autosave?.payload || composer.getDefaultState("letter"));
    let drafts = [];
    let selectedDraftId = "";
    let draftName = state.documentTitle || `${state.documentType} draft`;
    let statusMessage = autosave?.savedAt
      ? `Autosave restored from ${new Date(autosave.savedAt).toLocaleString("en-ZA")}.`
      : "Ready to draft.";

    function setStatus(message) {
      statusMessage = message;
      render();
    }

    function emitChange() {
      const markdown = composer.buildMarkdown(state);
      draftsApi.saveAutosave(state);

      if (typeof options.onChange === "function") {
        options.onChange({
          state,
          markdown,
        });
      }
    }

    function serializeSectionBullets(section) {
      return section.bullets.join("\n");
    }

    function renderSections() {
      return state.sections
        .map(
          (section, index) => `
            <article class="tool-card tool-subcard" data-section-id="${section.id}">
              <div class="tool-subcard-header">
                <h3>Section ${index + 1}</h3>
                <button class="button button-ghost tool-mini-button" type="button" data-action="remove-section" data-section-id="${section.id}">Remove</button>
              </div>
              <label class="field field-full">
                <span>Section title</span>
                <input type="text" data-section-field="title" data-section-id="${section.id}" value="${escapeAttribute(section.title)}">
              </label>
              <label class="field field-full">
                <span>Body</span>
                <textarea data-section-field="body" data-section-id="${section.id}" rows="5">${escapeHtml(
                  section.body
                )}</textarea>
              </label>
              <label class="field field-full">
                <span>Bullets (one per line)</span>
                <textarea data-section-field="bullets" data-section-id="${section.id}" rows="4">${escapeHtml(
                  serializeSectionBullets(section)
                )}</textarea>
              </label>
            </article>
          `
        )
        .join("");
    }

    function renderLineItems() {
      if (state.documentType !== "quotation") {
        return "";
      }

      const totals = composer.calculateTotals(state);
      const items = state.lineItems
        .map(
          (item, index) => `
            <article class="tool-card tool-subcard" data-line-item-id="${item.id}">
              <div class="tool-subcard-header">
                <h3>Line Item ${index + 1}</h3>
                <button class="button button-ghost tool-mini-button" type="button" data-action="remove-line-item" data-line-item-id="${item.id}">Remove</button>
              </div>
              <div class="form-grid">
                <label class="field field-full">
                  <span>Description</span>
                  <input type="text" data-line-item-field="description" data-line-item-id="${item.id}" value="${escapeAttribute(
                    item.description
                  )}">
                </label>
                <label class="field">
                  <span>Quantity</span>
                  <input type="number" step="1" min="0" data-line-item-field="quantity" data-line-item-id="${item.id}" value="${item.quantity}">
                </label>
                <label class="field">
                  <span>Unit price (ZAR)</span>
                  <input type="number" step="0.01" min="0" data-line-item-field="unitPrice" data-line-item-id="${item.id}" value="${item.unitPrice}">
                </label>
              </div>
              <p class="tool-inline-note">Line total: <strong>${composer.formatCurrency(
                composer.getLineItemTotal(item)
              )}</strong></p>
            </article>
          `
        )
        .join("");

      return `
        <section class="tool-card">
          <div class="tool-card-heading">
            <div>
              <p class="statement-index">Pricing</p>
              <h2>Commercial schedule</h2>
            </div>
            <button class="button button-secondary tool-mini-button" type="button" data-action="add-line-item">Add line item</button>
          </div>
          <div class="tool-stack">${items}</div>
          <p class="tool-inline-note tool-total-note">Quotation total: <strong>${composer.formatCurrency(
            totals.grandTotal
          )}</strong></p>
        </section>
      `;
    }

    function renderDraftOptions() {
      if (!drafts.length) {
        return '<option value="">No saved drafts yet</option>';
      }

      return [
        '<option value="">Select a draft</option>',
        ...drafts.map(
          (draft) =>
            `<option value="${draft.id}" ${draft.id === selectedDraftId ? "selected" : ""}>${escapeHtml(
              draft.name
            )} - ${escapeHtml(draft.documentType)} - ${new Date(draft.updatedAt).toLocaleDateString(
              "en-ZA"
            )}</option>`
        ),
      ].join("");
    }

    function render() {
      root.innerHTML = `
        <section class="tool-card">
          <div class="tool-card-heading">
            <div>
              <p class="statement-index">Document Composer</p>
              <h2>${options.title}</h2>
            </div>
            <p class="tool-status">${escapeHtml(statusMessage)}</p>
          </div>

          <div class="tool-stack">
            <div class="form-grid">
              <label class="field">
                <span>Document type</span>
                <select name="documentType">
                  ${composer.DOCUMENT_TYPES.map(
                    (type) =>
                      `<option value="${type.id}" ${
                        state.documentType === type.id ? "selected" : ""
                      }>${type.label}</option>`
                  ).join("")}
                </select>
              </label>
              <label class="field">
                <span>Draft name</span>
                <input type="text" name="draftName" value="${escapeAttribute(
                  draftName
                )}">
              </label>
            </div>

            <div class="tool-actions-row">
              <button class="button button-secondary tool-mini-button" type="button" data-action="save-draft">Save draft</button>
              <button class="button button-ghost tool-mini-button" type="button" data-action="reset-document">Reset</button>
              <label class="field tool-select-field">
                <span>Saved drafts</span>
                <select name="draftSelector">${renderDraftOptions()}</select>
              </label>
              <button class="button button-ghost tool-mini-button" type="button" data-action="load-draft">Load</button>
              <button class="button button-ghost tool-mini-button" type="button" data-action="delete-draft">Delete</button>
            </div>
          </div>
        </section>

        <section class="tool-card">
          <div class="tool-card-heading">
            <div>
              <p class="statement-index">Frontmatter</p>
              <h2>Document frame</h2>
            </div>
          </div>

          <div class="form-grid">
            <label class="field">
              <span>Document title</span>
              <input type="text" name="documentTitle" value="${escapeAttribute(state.documentTitle)}">
            </label>
            <label class="field">
              <span>Client name</span>
              <input type="text" name="clientName" value="${escapeAttribute(state.clientName)}">
            </label>
            <label class="field">
              <span>Date</span>
              <input type="text" name="date" value="${escapeAttribute(state.date)}">
            </label>
            <label class="field">
              <span>Reference number</span>
              <input type="text" name="referenceNumber" value="${escapeAttribute(state.referenceNumber)}">
            </label>
            <label class="field field-full">
              <span>Footer</span>
              <input type="text" name="footer" value="${escapeAttribute(state.footer)}">
            </label>
          </div>
        </section>

        <section class="tool-card">
          <div class="tool-card-heading">
            <div>
              <p class="statement-index">Message</p>
              <h2>Context and sign-off</h2>
            </div>
          </div>

          <div class="form-grid">
            <label class="field field-full">
              <span>Subject</span>
              <input type="text" name="subject" value="${escapeAttribute(state.subject)}">
            </label>
            <label class="field">
              <span>Recipient name</span>
              <input type="text" name="recipientName" value="${escapeAttribute(state.recipientName)}">
            </label>
            <label class="field">
              <span>Recipient title</span>
              <input type="text" name="recipientTitle" value="${escapeAttribute(state.recipientTitle)}">
            </label>
            <label class="field field-full">
              <span>Greeting</span>
              <input type="text" name="greeting" value="${escapeAttribute(state.greeting)}">
            </label>
            <label class="field field-full">
              <span>Intro</span>
              <textarea name="intro" rows="5">${escapeHtml(state.intro)}</textarea>
            </label>
            <label class="field field-full">
              <span>Closing paragraph</span>
              <textarea name="closing" rows="4">${escapeHtml(state.closing)}</textarea>
            </label>
            <label class="field">
              <span>Sign-off</span>
              <input type="text" name="signOff" value="${escapeAttribute(state.signOff)}">
            </label>
            <label class="field">
              <span>Sender name</span>
              <input type="text" name="senderName" value="${escapeAttribute(state.senderName)}">
            </label>
            <label class="field field-full">
              <span>Sender title</span>
              <input type="text" name="senderTitle" value="${escapeAttribute(state.senderTitle)}">
            </label>
          </div>
        </section>

        <section class="tool-card">
          <div class="tool-card-heading">
            <div>
              <p class="statement-index">Sections</p>
              <h2>Structured body blocks</h2>
            </div>
            <button class="button button-secondary tool-mini-button" type="button" data-action="add-section">Add section</button>
          </div>
          <div class="tool-stack">${renderSections()}</div>
        </section>

        ${renderLineItems()}

        <section class="tool-card">
          <div class="tool-card-heading">
            <div>
              <p class="statement-index">Notes</p>
              <h2>Additional terms</h2>
            </div>
          </div>
          <label class="field field-full">
            <span>Notes</span>
            <textarea name="notes" rows="5">${escapeHtml(state.notes)}</textarea>
          </label>
        </section>
      `;

      bindEvents();
    }

    function updateStateField(fieldName, value, shouldRender) {
      const previousTitle = state.documentTitle;

      if (fieldName === "documentType") {
        state = composer.changeDocumentType(state, value);
        draftName = state.documentTitle;
      } else {
        state = composer.coerceState({
          ...state,
          [fieldName]: value,
        });

        if (fieldName === "documentTitle" && (!draftName || draftName === previousTitle)) {
          draftName = value;
        }
      }

      emitChange();

      if (shouldRender) {
        render();
      }
    }

    function bindEvents() {
      root.querySelectorAll("input[name], textarea[name], select[name]").forEach((element) => {
        element.addEventListener("input", (event) => {
          const { name, value } = event.currentTarget;

          if (name === "draftSelector") {
            return;
          }

          if (name === "draftName") {
            draftName = value;
            return;
          }

          updateStateField(name, value, false);
        });

        element.addEventListener("change", (event) => {
          const { name, value } = event.currentTarget;

          if (name === "draftSelector") {
            selectedDraftId = value;
            return;
          }

          if (name === "draftName") {
            return;
          }

          if (name === "documentType") {
            updateStateField(name, value, true);
          }
        });
      });

      root.querySelectorAll("[data-section-field]").forEach((element) => {
        element.addEventListener("input", (event) => {
          const sectionId = event.currentTarget.getAttribute("data-section-id");
          const field = event.currentTarget.getAttribute("data-section-field");
          const nextSections = state.sections.map((section) => {
            if (section.id !== sectionId) {
              return section;
            }

            if (field === "bullets") {
              return {
                ...section,
                bullets: event.currentTarget.value
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean),
              };
            }

            return {
              ...section,
              [field]: event.currentTarget.value,
            };
          });

          state = composer.coerceState({
            ...state,
            sections: nextSections,
          });
          emitChange();
        });
      });

      root.querySelectorAll("[data-line-item-field]").forEach((element) => {
        element.addEventListener("input", (event) => {
          const lineItemId = event.currentTarget.getAttribute("data-line-item-id");
          const field = event.currentTarget.getAttribute("data-line-item-field");
          const nextItems = state.lineItems.map((item) => {
            if (item.id !== lineItemId) {
              return item;
            }

            const nextValue =
              field === "quantity" || field === "unitPrice"
                ? Number(event.currentTarget.value || 0)
                : event.currentTarget.value;

            return {
              ...item,
              [field]: nextValue,
            };
          });

          state = composer.coerceState({
            ...state,
            lineItems: nextItems,
          });
          emitChange();
        });

        element.addEventListener("change", () => {
          render();
        });
      });

      root.querySelectorAll("[data-action]").forEach((button) => {
        button.addEventListener("click", async (event) => {
          const action = event.currentTarget.getAttribute("data-action");

          if (action === "add-section") {
            state = composer.coerceState({
              ...state,
              sections: [
                ...state.sections,
                {
                  id: composer.createId("section"),
                  title: "New Section",
                  body: "",
                  bullets: [],
                },
              ],
            });
            emitChange();
            render();
            return;
          }

          if (action === "remove-section") {
            const sectionId = event.currentTarget.getAttribute("data-section-id");
            state = composer.coerceState({
              ...state,
              sections: state.sections.filter((section) => section.id !== sectionId),
            });
            emitChange();
            render();
            return;
          }

          if (action === "add-line-item") {
            state = composer.coerceState({
              ...state,
              lineItems: [
                ...state.lineItems,
                {
                  id: composer.createId("line"),
                  description: "",
                  quantity: 1,
                  unitPrice: 0,
                },
              ],
            });
            emitChange();
            render();
            return;
          }

          if (action === "remove-line-item") {
            const lineItemId = event.currentTarget.getAttribute("data-line-item-id");
            state = composer.coerceState({
              ...state,
              lineItems: state.lineItems.filter((item) => item.id !== lineItemId),
            });
            emitChange();
            render();
            return;
          }

          if (action === "reset-document") {
            state = composer.getDefaultState(state.documentType);
            draftName = state.documentTitle;
            draftsApi.clearAutosave();
            selectedDraftId = "";
            setStatus("Document reset to defaults.");
            emitChange();
            render();
            return;
          }

          if (action === "save-draft") {
            const nextDraftName = String(draftName || state.documentTitle || "Untitled draft").trim();
            const result = await draftsApi.saveNamedDraft(nextDraftName, state);

            selectedDraftId = result.draft.id;
            drafts = await draftsApi.listDrafts();
            setStatus(
              result.remoteSynced
                ? `Saved "${nextDraftName}" locally and remotely.`
                : `Saved "${nextDraftName}" locally. ${result.warning || ""}`.trim()
            );
            render();
            return;
          }

          if (action === "load-draft") {
            const selectedDraft = drafts.find((draft) => draft.id === selectedDraftId);

            if (!selectedDraft) {
              setStatus("Choose a draft to load.");
              return;
            }

            state = composer.coerceState(selectedDraft.payload);
            draftName = selectedDraft.name;
            setStatus(`Loaded "${selectedDraft.name}".`);
            emitChange();
            render();
            return;
          }

          if (action === "delete-draft") {
            const selectedDraft = drafts.find((draft) => draft.id === selectedDraftId);

            if (!selectedDraft) {
              setStatus("Choose a draft to delete.");
              return;
            }

            if (!globalScope.confirm(`Delete "${selectedDraft.name}"?`)) {
              return;
            }

            const result = await draftsApi.deleteNamedDraft(selectedDraft.id);
            drafts = await draftsApi.listDrafts();
            selectedDraftId = "";
            setStatus(
              result.remoteSynced
                ? `Deleted "${selectedDraft.name}" locally and remotely.`
                : `Deleted "${selectedDraft.name}" locally. ${result.warning || ""}`.trim()
            );
            render();
          }
        });
      });
    }

    async function hydrateDrafts() {
      drafts = await draftsApi.listDrafts();
      render();
    }

    function escapeHtml(value) {
      return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
    }

    function escapeAttribute(value) {
      return escapeHtml(value).replace(/\n/g, "&#10;");
    }

    render();
    emitChange();
    hydrateDrafts().catch(() => {
      setStatus("Remote drafts unavailable. Local draft storage remains active.");
    });
  }

  const api = {
    mountDocumentComposer,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  globalScope.AccordSignalComposerPanel = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
