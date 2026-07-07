(function createDocumentDraftsLibrary(globalScope) {
  const AUTOSAVE_KEY = "accord_signal_document_autosave_v1";
  const NAMED_DRAFTS_KEY = "accord_signal_document_named_drafts_v1";

  function readJsonStorage(key, fallbackValue) {
    try {
      const raw = globalScope.localStorage.getItem(key);

      if (!raw) {
        return fallbackValue;
      }

      return JSON.parse(raw);
    } catch {
      return fallbackValue;
    }
  }

  function writeJsonStorage(key, value) {
    globalScope.localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizeDraftRecord(record) {
    const timestamp = new Date().toISOString();

    return {
      id: record.id || (globalScope.crypto?.randomUUID ? globalScope.crypto.randomUUID() : `draft-${Date.now()}`),
      name: String(record.name || "Untitled draft").trim(),
      slug: String(record.slug || slugify(record.name || "untitled-draft")).trim(),
      documentType: String(record.documentType || record.payload?.documentType || "letter").trim(),
      payload: record.payload || {},
      createdAt: record.createdAt || timestamp,
      updatedAt: record.updatedAt || timestamp,
      source: record.source || "local",
    };
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }

  function loadAutosave() {
    return readJsonStorage(AUTOSAVE_KEY, null);
  }

  function saveAutosave(payload) {
    writeJsonStorage(AUTOSAVE_KEY, {
      payload,
      savedAt: new Date().toISOString(),
    });
  }

  function clearAutosave() {
    globalScope.localStorage.removeItem(AUTOSAVE_KEY);
  }

  function listLocalDrafts() {
    const drafts = readJsonStorage(NAMED_DRAFTS_KEY, []);
    return Array.isArray(drafts) ? drafts.map(normalizeDraftRecord) : [];
  }

  function persistLocalDrafts(drafts) {
    writeJsonStorage(NAMED_DRAFTS_KEY, drafts);
  }

  function saveLocalDraft(name, payload) {
    const drafts = listLocalDrafts();
    const now = new Date().toISOString();
    const slug = slugify(name);
    const existing = drafts.find((draft) => draft.slug === slug);
    const nextDraft = normalizeDraftRecord({
      id: existing?.id,
      name,
      slug,
      documentType: payload.documentType,
      payload,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      source: "local",
    });
    const nextDrafts = drafts.filter((draft) => draft.id !== nextDraft.id);

    nextDrafts.unshift(nextDraft);
    persistLocalDrafts(nextDrafts);
    return nextDraft;
  }

  function deleteLocalDraft(id) {
    const drafts = listLocalDrafts();
    const nextDrafts = drafts.filter((draft) => draft.id !== id);
    persistLocalDrafts(nextDrafts);
  }

  async function fetchRemoteDrafts() {
    const response = await fetch("/api/document-drafts", {
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Unable to load remote drafts.");
    }

    const payload = await response.json();
    return Array.isArray(payload.drafts) ? payload.drafts.map(normalizeDraftRecord) : [];
  }

  async function saveRemoteDraft(localDraft) {
    const response = await fetch("/api/document-drafts", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        draft: localDraft,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "Unable to sync the draft.");
    }

    const payload = await response.json();
    return normalizeDraftRecord(payload.draft);
  }

  async function deleteRemoteDraft(id) {
    const response = await fetch(`/api/document-drafts?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "same-origin",
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "Unable to delete the remote draft.");
    }
  }

  async function listDrafts() {
    const localDrafts = listLocalDrafts();

    try {
      const remoteDrafts = await fetchRemoteDrafts();
      const combined = [...remoteDrafts];

      localDrafts.forEach((localDraft) => {
        if (!combined.some((draft) => draft.id === localDraft.id)) {
          combined.push(localDraft);
        }
      });

      return combined.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    } catch {
      return localDrafts;
    }
  }

  async function saveNamedDraft(name, payload) {
    const localDraft = saveLocalDraft(name, payload);

    try {
      const remoteDraft = await saveRemoteDraft(localDraft);
      return {
        draft: remoteDraft,
        remoteSynced: true,
      };
    } catch (error) {
      return {
        draft: localDraft,
        remoteSynced: false,
        warning: error.message,
      };
    }
  }

  async function deleteNamedDraft(id) {
    deleteLocalDraft(id);

    try {
      await deleteRemoteDraft(id);
      return {
        remoteSynced: true,
      };
    } catch (error) {
      return {
        remoteSynced: false,
        warning: error.message,
      };
    }
  }

  const api = {
    clearAutosave,
    deleteNamedDraft,
    listDrafts,
    listLocalDrafts,
    loadAutosave,
    normalizeDraftRecord,
    saveAutosave,
    saveNamedDraft,
    slugify,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  globalScope.AccordSignalDocumentDrafts = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
