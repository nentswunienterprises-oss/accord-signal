const fs = require("fs/promises");
const path = require("path");
const nodeCrypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE_PATH = path.join(DATA_DIR, "submissions.json");
const TABLE_NAME = "capability_briefs";

const DEFAULT_STORE = {
  submissions: [],
};

let supabaseClient;

function cloneDefaultStore() {
  return {
    submissions: [],
  };
}

function shouldUseSupabase() {
  return Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function getSupabaseClient() {
  if (!shouldUseSupabase()) {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
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
    return cloneDefaultStore();
  }
}

async function writeFileStore(data) {
  await ensureFileStore();
  await fs.writeFile(FILE_PATH, JSON.stringify(data, null, 2), "utf8");
}

function formatDateStamp(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function createReferenceNumber() {
  const dateStamp = formatDateStamp(new Date());
  const randomPart = nodeCrypto.randomBytes(2).toString("hex").toUpperCase();
  return `AS-${dateStamp}-${randomPart}`;
}

function buildSubmission(payload) {
  const now = new Date().toISOString();

  return {
    id: nodeCrypto.randomUUID(),
    referenceNumber: createReferenceNumber(),
    createdAt: now,
    updatedAt: now,
    status: "new",
    requesterName: payload.requesterName,
    requesterRole: payload.requesterRole || "",
    requesterEmail: payload.requesterEmail,
    organizationName: payload.organizationName,
    teamSize: payload.teamSize,
    primaryNeed: payload.primaryNeed,
    urgency: payload.urgency || "",
    budgetRange: payload.budgetRange || "",
    decisionMaker: payload.decisionMaker || "",
    mainProblem: payload.mainProblem,
    desiredOutcome: payload.desiredOutcome,
    source: "capability-brief",
  };
}

function summarize(submissions) {
  const todayStamp = formatDateStamp(new Date());

  return {
    total: submissions.length,
    new: submissions.filter((submission) => submission.status === "new").length,
    today: submissions.filter((submission) =>
      submission.referenceNumber.startsWith(`AS-${todayStamp}`)
    ).length,
  };
}

function toDatabaseRecord(submission) {
  return {
    id: submission.id,
    reference_number: submission.referenceNumber,
    created_at: submission.createdAt,
    updated_at: submission.updatedAt,
    status: submission.status,
    requester_name: submission.requesterName,
    requester_role: submission.requesterRole,
    requester_email: submission.requesterEmail,
    organization_name: submission.organizationName,
    team_size: submission.teamSize,
    primary_need: submission.primaryNeed,
    urgency: submission.urgency,
    budget_range: submission.budgetRange,
    decision_maker: submission.decisionMaker,
    main_problem: submission.mainProblem,
    desired_outcome: submission.desiredOutcome,
    source: submission.source,
  };
}

function fromDatabaseRecord(record) {
  return {
    id: record.id,
    referenceNumber: record.reference_number,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    status: record.status,
    requesterName: record.requester_name,
    requesterRole: record.requester_role,
    requesterEmail: record.requester_email,
    organizationName: record.organization_name,
    teamSize: record.team_size,
    primaryNeed: record.primary_need,
    urgency: record.urgency,
    budgetRange: record.budget_range,
    decisionMaker: record.decision_maker,
    mainProblem: record.main_problem,
    desiredOutcome: record.desired_outcome,
    source: record.source,
  };
}

async function createSubmissionInSupabase(payload) {
  const client = getSupabaseClient();
  const submission = buildSubmission(payload);
  const { data, error } = await client
    .from(TABLE_NAME)
    .insert(toDatabaseRecord(submission))
    .select()
    .single();

  if (error) {
    throw error;
  }

  return fromDatabaseRecord(data);
}

async function listSubmissionsFromSupabase() {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from(TABLE_NAME)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const submissions = (data || []).map(fromDatabaseRecord);

  return {
    submissions,
    stats: summarize(submissions),
  };
}

async function createSubmissionInFile(payload) {
  const store = await readFileStore();
  const submissions = Array.isArray(store.submissions) ? store.submissions : [];
  const submission = buildSubmission(payload);
  const nextStore = {
    submissions: [submission, ...submissions],
  };

  await writeFileStore(nextStore);
  return submission;
}

async function listSubmissionsFromFile() {
  const store = await readFileStore();
  const submissions = Array.isArray(store.submissions) ? store.submissions : [];
  const ordered = [...submissions].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt)
  );

  return {
    submissions: ordered,
    stats: summarize(ordered),
  };
}

async function createSubmission(payload) {
  if (shouldUseSupabase()) {
    return createSubmissionInSupabase(payload);
  }

  return createSubmissionInFile(payload);
}

async function listSubmissions() {
  if (shouldUseSupabase()) {
    return listSubmissionsFromSupabase();
  }

  return listSubmissionsFromFile();
}

module.exports = {
  createSubmission,
  listSubmissions,
};
