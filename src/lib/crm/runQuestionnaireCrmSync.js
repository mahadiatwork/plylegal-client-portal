import {
  normalizeQuestionnaireDefinition,
  selectActiveQuestionnaireDefinition,
  selectQuestionnaireDefinitionPages,
} from "../questionnaires/index.js";
import { getCrmSyncFlags } from "./crmSyncFlags.js";
import { buildCrmSyncJobRecord } from "./crmSyncJobs.js";
import { buildQuestionnaireCrmProjection } from "./questionnaireMapping.js";
import { seedDefinitionCrmMappings } from "./questionnaireCrmSeed.js";
import { synchronizeQuestionnaireCrm } from "./questionnaireSync.js";
import { PARTNER_SUBCLASS_CODES } from "../visaDisplay.js";

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
// Applications use Nano ID's URL-safe alphabet, including a leading _ or -.
const SAFE_APPLICATION_ID = /^[A-Za-z0-9_-]{1,128}$/;

export function parseCrmSyncRequestBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "applicationId is required", status: 400 };
  }
  const applicationId = String(body.applicationId || "").trim();
  const mode = String(body.mode || "").trim();
  const pageId = body.pageId == null || body.pageId === "" ? null : String(body.pageId).trim();
  const profileId = body.profileId == null || body.profileId === "" ? null : String(body.profileId).trim();
  if (!SAFE_APPLICATION_ID.test(applicationId)) {
    return { error: "A valid applicationId is required", status: 400 };
  }
  if (mode !== "page" && mode !== "full") {
    return { error: "mode must be page or full", status: 400 };
  }
  if (mode === "page" && (!pageId || !SAFE_ID.test(pageId))) {
    return { error: "pageId is required", status: 400 };
  }
  if (profileId && !SAFE_ID.test(profileId)) {
    return { error: "A valid profileId is required", status: 400 };
  }
  return { applicationId, mode, pageId, profileId };
}

export function inferQuestionnaireAudience(application = {}, draft = {}) {
  const raw = String(application.visaTypeCode || application.type || application.visaType || "").toLowerCase();
  let visaType = "temporary-work";
  if (raw.includes("partner") || PARTNER_SUBCLASS_CODES.some((subclass) => new RegExp(`\\b${subclass}\\b`).test(raw))) visaType = "partner";
  else if (raw.includes("protection") || raw === "866") visaType = "protection";
  const visaContext = String(draft.visaContext || application.visaContext || "").trim()
    || (raw.includes("186") ? "186" : raw.includes("482") ? "482" : "");
  return { visaType, visaContext: visaContext || undefined };
}

export async function loadPublishedDefinition(db, application, draft) {
  const collection = db.collection("questionnaireDefinitions");
  const ref = application?.questionnaireDefinitionRef;
  if (ref?.id && SAFE_ID.test(String(ref.id))) {
    const live = await collection.doc(String(ref.id)).get();
    if (live.exists) {
      const data = { id: live.id, ...live.data() };
      if (ref.revision == null || Number(data.revision) === Number(ref.revision)) {
        return normalizeLoadedDefinition(data);
      }
    }
    const revisionId = `${ref.id}__${ref.revision}`;
    const snapshot = await db.collection("questionnaireDefinitionRevisions").doc(revisionId).get();
    if (snapshot.exists) {
      return normalizeLoadedDefinition({ id: String(ref.id), ...snapshot.data() });
    }
  }
  const audience = inferQuestionnaireAudience(application, draft);
  const active = await collection.where("status", "==", "active").get();
  const selected = selectActiveQuestionnaireDefinition(
    active.docs.map((doc) => ({ ...doc.data(), id: doc.id })),
    audience,
  );
  return selected ? normalizeLoadedDefinition(selected) : null;
}

async function loadPublishedDefinitionWithClient(client, application, draft) {
  // The signed-in applicant can read active definitions through Firestore rules.
  // This also works when the server's Admin SDK credential cannot read Firestore.
  const active = await client.getActiveDocuments("questionnaireDefinitions");
  const selected = selectActiveQuestionnaireDefinition(
    active.map(({ id, data }) => ({ ...data, id })),
    inferQuestionnaireAudience(application, draft),
  );
  return selected ? normalizeLoadedDefinition(selected) : null;
}

function normalizeLoadedDefinition(definition) {
  const pages = selectQuestionnaireDefinitionPages(definition, []);
  return seedDefinitionCrmMappings(
    normalizeQuestionnaireDefinition({ ...definition, pages }, pages),
  );
}

function syncHttpResponse(result, application) {
  const matterId = application?.zohoId ? String(application.zohoId) : null;
  if (result.skipped) {
    return { httpStatus: 200, body: { success: true, ...result, matterId } };
  }
  return {
    httpStatus: result.success ? 200 : 502,
    body: { success: result.success, ...result, matterId },
  };
}

/**
 * Fallback for deployments where the Admin SDK cannot read or persist sync jobs.
 * The client token is used only for Firestore reads already allowed to the
 * verified application owner. Zoho writes still happen server-side.
 */
export async function runQuestionnaireCrmSyncWithClient({
  client,
  application,
  mode,
  pageId,
  profileId,
  zoho,
  flags,
  now,
}) {
  const draft = await client.getDocument(`applications/${application.id}/data/questionnaire`);
  if (!draft) {
    return {
      httpStatus: 409,
      body: { success: false, error: { code: "questionnaire_draft_not_found", message: "No saved questionnaire was found" } },
    };
  }
  const definition = await loadPublishedDefinitionWithClient(client, application, draft);
  if (!definition) {
    return {
      httpStatus: 409,
      body: { success: false, error: "Published questionnaire definition was not found" },
    };
  }
  const result = await synchronizeQuestionnaireCrm(
    { application, draft, definition, mode, pageId, profileId },
    { zoho, flags: flags || getCrmSyncFlags(), dealsOnly: true, now },
  );
  return syncHttpResponse(result, application);
}

export async function runQuestionnaireCrmSync({
  db,
  application,
  mode,
  pageId,
  profileId,
  zoho,
  flags,
  now,
}) {
  const syncFlags = flags || getCrmSyncFlags();
  if (!syncFlags.enabled) {
    return { httpStatus: 200, body: { success: true, skipped: true, reason: "feature_disabled" } };
  }
  const draftSnap = await db.collection("applications").doc(application.id).collection("data").doc("questionnaire").get();
  if (!draftSnap.exists) {
    return {
      httpStatus: 409,
      body: { success: false, error: { code: "questionnaire_draft_not_found", message: "No saved questionnaire was found" } },
    };
  }
  const draft = draftSnap.data();
  const definition = await loadPublishedDefinition(db, application, draft);
  if (!definition) {
    return {
      httpStatus: 409,
      body: { success: false, error: "Published questionnaire definition was not found" },
    };
  }

  const persistJob = async (job) => {
    const record = { ...job };
    delete record.groups;
    try {
      await db.collection("applications").doc(application.id).collection("crmSync").doc(job.id).set(record, { merge: true });
    } catch (error) {
      // Audit storage must not turn a confirmed Zoho Deal write into a failure.
      console.error("[intake/crm-sync] job audit write failed", { code: error?.code || error?.name || "unknown" });
    }
  };

  const projection = buildQuestionnaireCrmProjection({
    definition,
    draft,
    application,
    userProfile: {},
    mode,
    pageId,
    profileId,
    dealsOnly: true,
  });
  const projectionJob = buildCrmSyncJobRecord({
    applicationId: application.id,
    definition,
    mode,
    pageId,
    profileId,
    groups: projection.groups,
    now: now?.() || new Date(),
  });
  const existingSnap = await db.collection("applications").doc(application.id).collection("crmSync").doc(projectionJob.id).get();
  const existingJob = existingSnap.exists ? { id: existingSnap.id, ...existingSnap.data() } : null;

  const result = await synchronizeQuestionnaireCrm(
    {
      application,
      draft,
      definition,
      userProfile: {},
      mode,
      pageId,
      profileId,
    },
    {
      zoho,
      flags: syncFlags,
      persistJob,
      existingJob,
      dealsOnly: true,
      now,
    },
  );

  return syncHttpResponse(result, application);
}
