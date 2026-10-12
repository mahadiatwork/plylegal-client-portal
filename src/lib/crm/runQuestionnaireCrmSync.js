import {
  normalizeQuestionnaireDefinition,
  selectActiveQuestionnaireDefinition,
  selectQuestionnaireDefinitionPages,
} from "../questionnaires/index.js";
import { getCrmSyncFlags } from "./crmSyncFlags.js";
import { CRM_SYNC_STATES, buildCrmSyncJobRecord } from "./crmSyncJobs.js";
import { buildQuestionnaireCrmProjection } from "./questionnaireMapping.js";
import { synchronizeQuestionnaireCrm } from "./questionnaireSync.js";

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

export function parseCrmSyncRequestBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "applicationId is required", status: 400 };
  }
  const applicationId = String(body.applicationId || "").trim();
  const mode = String(body.mode || "").trim();
  const pageId = body.pageId == null || body.pageId === "" ? null : String(body.pageId).trim();
  const profileId = body.profileId == null || body.profileId === "" ? null : String(body.profileId).trim();
  if (!applicationId || applicationId.includes("/") || !SAFE_ID.test(applicationId)) {
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
  if (raw.includes("partner") || ["820", "801", "309"].includes(raw)) visaType = "partner";
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
    active.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    audience,
  );
  return selected ? normalizeLoadedDefinition(selected) : null;
}

function normalizeLoadedDefinition(definition) {
  const pages = selectQuestionnaireDefinitionPages(definition, []);
  return normalizeQuestionnaireDefinition({ ...definition, pages }, pages);
}

export async function runQuestionnaireCrmSync({
  db,
  application,
  authUid,
  mode,
  pageId,
  profileId,
  zoho,
  flags,
  now,
}) {
  const draftSnap = await db.collection("applications").doc(application.id).collection("data").doc("questionnaire").get();
  const draft = draftSnap.exists ? draftSnap.data() : {};
  const userSnap = await db.collection("users").doc(authUid).get();
  const userProfile = userSnap.exists ? userSnap.data() : {};
  const definition = await loadPublishedDefinition(db, application, draft);
  if (!definition) {
    return {
      httpStatus: 409,
      body: { success: false, error: "Published questionnaire definition was not found" },
    };
  }

  const persistDependentId = async (subjectId, zohoDependentId, isNonMigrating) => {
    const key = isNonMigrating ? "non_migrating_members" : "profiles";
    const list = Array.isArray(draft[key]) ? draft[key] : [];
    const next = list.map((item) => (
      String(item.id) === String(subjectId) ? { ...item, zohoDependentId } : item
    ));
    draft[key] = next;
    await db.collection("applications").doc(application.id).collection("data").doc("questionnaire").set(
      { [key]: next },
      { merge: true },
    );
  };

  const persistJob = async (job) => {
    const record = { ...job };
    delete record.groups;
    await db.collection("applications").doc(application.id).collection("crmSync").doc(job.id).set(record, { merge: true });
  };

  const projection = buildQuestionnaireCrmProjection({
    definition,
    draft,
    application,
    userProfile,
    mode,
    pageId,
    profileId,
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
      userProfile,
      mode,
      pageId,
      profileId,
    },
    {
      zoho,
      flags: flags || getCrmSyncFlags(),
      persistJob,
      persistDependentId,
      existingJob: existingJob?.state === CRM_SYNC_STATES.succeeded ? existingJob : existingJob,
      now,
    },
  );

  if (result.skipped) {
    return { httpStatus: 200, body: { success: true, ...result } };
  }
  if (!result.success) {
    return { httpStatus: 502, body: { success: false, ...result } };
  }
  return { httpStatus: 200, body: { success: true, ...result } };
}
