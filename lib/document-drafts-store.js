const fs = require("fs/promises");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE_PATH = path.join(DATA_DIR, "document-drafts.json");
const TABLE_NAME = "document_composer_drafts";

const DEFAULT_STORE = {
  drafts: [],
};

let supabaseClient;

function shouldUseSupabase() {
  return Boolean(
    (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL) &&
      (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

function getSupabaseClient() {
  if (!shouldUseSupabase()) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(
      process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  return supabaseClient;
}

async function ensureFileStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(FILE_PATH);
  } catch {
    await fs.writeFile(FILE_PATH, JSON.stringify(DEFAULT_STORE, null, 2), "utf8");
  }
}

async function readFileStore() {
  await ensureFileStore();
  const raw = await fs.readFile(FILE_PATH, "utf8");

  try {
    return JSON.parse(raw);
  } catch {
    return { drafts: [] };
  }
}

async function writeFileStore(data) {
  await ensureFileStore();
  await fs.writeFile(FILE_PATH, JSON.stringify(data, null, 2), "utf8");
}

function normalizeDraftRecord(record) {
  const createdAt = record.createdAt || record.created_at || new Date().toISOString();
  const updatedAt = record.updatedAt || record.updated_at || createdAt;

  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    documentType: record.documentType || record.document_type || "letter",
    payload: record.payload || {},
    createdAt,
    updatedAt,
    source: record.source || "remote",
  };
}

function toDatabaseRecord(draft) {
  return {
    id: draft.id,
    name: draft.name,
    slug: draft.slug,
    document_type: draft.documentType,
    payload: draft.payload,
    created_at: draft.createdAt,
    updated_at: draft.updatedAt,
  };
}

async function listDraftsFromFile() {
  const store = await readFileStore();
  const drafts = Array.isArray(store.drafts) ? store.drafts : [];

  return drafts
    .map((draft) => normalizeDraftRecord({ ...draft, source: "file" }))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

async function saveDraftToFile(draft) {
  const store = await readFileStore();
  const drafts = Array.isArray(store.drafts) ? store.drafts : [];
  const nextDrafts = drafts.filter((entry) => entry.id !== draft.id);

  nextDrafts.unshift(draft);

  await writeFileStore({
    drafts: nextDrafts,
  });

  return normalizeDraftRecord({ ...draft, source: "file" });
}

async function deleteDraftFromFile(id) {
  const store = await readFileStore();
  const drafts = Array.isArray(store.drafts) ? store.drafts : [];
  const nextDrafts = drafts.filter((entry) => entry.id !== id);
  const deleted = nextDrafts.length !== drafts.length;

  await writeFileStore({
    drafts: nextDrafts,
  });

  return deleted;
}

async function listDraftsFromSupabase() {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from(TABLE_NAME)
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []).map((record) => normalizeDraftRecord({ ...record, source: "supabase" }));
}

async function saveDraftToSupabase(draft) {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from(TABLE_NAME)
    .upsert(toDatabaseRecord(draft), { onConflict: "id" })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return normalizeDraftRecord({ ...data, source: "supabase" });
}

async function deleteDraftFromSupabase(id) {
  const client = getSupabaseClient();
  const { error } = await client.from(TABLE_NAME).delete().eq("id", id);

  if (error) {
    throw error;
  }

  return true;
}

async function listDrafts() {
  if (shouldUseSupabase()) {
    try {
      return await listDraftsFromSupabase();
    } catch {
      return listDraftsFromFile();
    }
  }

  return listDraftsFromFile();
}

async function saveDraft(draft) {
  if (shouldUseSupabase()) {
    try {
      return await saveDraftToSupabase(draft);
    } catch {
      return saveDraftToFile(draft);
    }
  }

  return saveDraftToFile(draft);
}

async function deleteDraft(id) {
  if (shouldUseSupabase()) {
    try {
      return await deleteDraftFromSupabase(id);
    } catch {
      return deleteDraftFromFile(id);
    }
  }

  return deleteDraftFromFile(id);
}

module.exports = {
  deleteDraft,
  listDrafts,
  saveDraft,
  shouldUseSupabase,
};
