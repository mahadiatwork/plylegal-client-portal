import { getCrmSyncFlags } from "./crmSyncFlags.js";
import {
  CRM_SYNC_STATES,
  buildCrmSyncJobRecord,
  sanitizeCrmSyncError,
  summarizeCrmMappings,
} from "./crmSyncJobs.js";
import { buildQuestionnaireCrmProjection } from "./questionnaireMapping.js";

const RELATIONSHIP_MAP = Object.freeze({
  spouse: "Spouse",
  partner: "Partner",
  child: "Children",
  children: "Children",
});

function getRecordId(result) {
  return result?.details?.id || result?.id || null;
}

function dependentCreateFields(snapshot, contactId) {
  const fields = {
    Contact_Name: contactId ? { id: contactId } : undefined,
    First_Name: snapshot?.given_names,
    Name: snapshot?.family_name,
    Relationship_to_Applicant: RELATIONSHIP_MAP[snapshot?.relationship],
    Gender: ["Male", "Female"].includes(snapshot?.gender) ? snapshot.gender : undefined,
  };
  if (snapshot?.isNonMigrating === true) fields.Non_Migrating = true;
  const year = String(snapshot?.birth_year || "").trim();
  const day = String(snapshot?.birth_day || "").trim().padStart(2, "0");
  const monthRaw = String(snapshot?.birth_month || "").trim();
  const monthMap = {
    january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
    july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
  };
  const month = monthMap[monthRaw.toLowerCase()] || (Number(monthRaw) ? String(Number(monthRaw)).padStart(2, "0") : "");
  if (year && month && day && day !== "00") fields.Date_of_Birth = `${year}-${month}-${day}`;
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );
}

async function ensureDependentRecord(group, { zoho, userProfile, persistDependentId, dryRun }) {
  if (group.recordId) return group.recordId;
  const contactId = userProfile?.zohoContactId;
  if (!contactId) {
    throw Object.assign(new Error("missing_contact_id"), { code: "missing_contact_id" });
  }
  if (dryRun) return null;
  const existing = await zoho.getRelatedRecords?.(
    "Contacts",
    contactId,
    "Partner_Dependents",
  ) || [];
  const snapshot = group.profileSnapshot || {};
  const matchKey = zoho.buildDependentMatchKey?.({
    firstName: snapshot.given_names,
    lastName: snapshot.family_name,
    dateOfBirth: dependentCreateFields(snapshot, contactId).Date_of_Birth,
    relationship: RELATIONSHIP_MAP[snapshot.relationship] || snapshot.relationship,
  });
  const matched = existing.find((record) => zoho.buildDependentMatchKey?.(record) === matchKey);
  if (matched?.id) {
    if (snapshot.id) await persistDependentId?.(snapshot.id, matched.id, snapshot.isNonMigrating);
    return matched.id;
  }
  const created = await zoho.createRecord("Partner_Dependents", dependentCreateFields(snapshot, contactId));
  if (created?.status === "error") {
    throw Object.assign(new Error(created.message || "dependent_create_failed"), { code: created.code });
  }
  const recordId = getRecordId(created);
  if (!recordId) {
    throw Object.assign(new Error("dependent_create_failed"), { code: "dependent_create_failed" });
  }
  if (snapshot.id) await persistDependentId?.(snapshot.id, recordId, snapshot.isNonMigrating);
  return recordId;
}

function markGroupMappings(projection, group, patch) {
  projection.mappings.forEach((item) => {
    if (item.status !== "ready") return;
    if (item.module !== group.module) return;
    const sameRecord = item.recordId === group.recordId
      || (group.pendingProfileId && item.profileId === group.pendingProfileId);
    if (!sameRecord) return;
    Object.assign(item, patch);
    if (patch.recordId) item.recordId = patch.recordId;
  });
}

export async function synchronizeQuestionnaireCrm(input, deps = {}) {
  const flags = deps.flags || getCrmSyncFlags(deps.env || process.env);
  const {
    application,
    draft,
    definition,
    userProfile = {},
    mode = "full",
    pageId = null,
    profileId = null,
  } = input;
  const zoho = deps.zoho;
  const persistJob = deps.persistJob;
  const persistDependentId = deps.persistDependentId;
  const now = deps.now || (() => new Date());

  if (!flags.enabled) {
    return {
      success: true,
      skipped: true,
      reason: "feature_disabled",
      summary: { succeeded: [], skipped: [], failed: [] },
    };
  }

  const projection = buildQuestionnaireCrmProjection({
    definition,
    draft,
    application,
    userProfile,
    mode,
    pageId,
    profileId,
  });

  const job = buildCrmSyncJobRecord({
    applicationId: application.id,
    definition,
    mode,
    pageId,
    profileId,
    groups: projection.groups,
    state: CRM_SYNC_STATES.processing,
    dryRun: flags.dryRun || mode === "preview",
    now: now(),
  });

  if (deps.existingJob?.state === CRM_SYNC_STATES.succeeded
    && deps.existingJob.idempotencyKey === job.idempotencyKey) {
    return {
      success: true,
      jobId: deps.existingJob.id,
      state: CRM_SYNC_STATES.succeeded,
      idempotent: true,
      dryRun: Boolean(deps.existingJob.dryRun),
      summary: deps.existingJob.summary || summarizeCrmMappings(projection.mappings),
    };
  }

  await persistJob?.({ ...job, attemptCount: (deps.existingJob?.attemptCount || 0) + 1 });

  if (mode === "preview" || flags.dryRun) {
    const previewMappings = projection.mappings.map((item) => (
      item.status === "ready" ? { ...item, status: "succeeded", dryRun: true } : item
    ));
    const completed = {
      ...job,
      state: CRM_SYNC_STATES.succeeded,
      summary: summarizeCrmMappings(previewMappings),
      updatedAt: now().toISOString(),
      completedAt: now().toISOString(),
    };
    await persistJob?.(completed);
    return {
      success: true,
      jobId: job.id,
      state: CRM_SYNC_STATES.succeeded,
      dryRun: true,
      preview: true,
      groups: projection.groups.map((group) => ({
        module: group.module,
        recordId: group.recordId,
        fieldApiNames: group.fieldApiNames,
        needsDependentCreate: group.needsDependentCreate,
      })),
      summary: completed.summary,
    };
  }

  let fatalError = null;
  const groupErrors = [];
  if (projection.groups.length) {
    const token = await zoho?.getAccessToken?.();
    if (!token) {
      fatalError = Object.assign(new Error("Zoho access token is unavailable"), { code: "missing_zoho_token" });
      projection.mappings.forEach((item) => {
        if (item.status === "ready") {
          item.status = "failed";
          item.error = "missing_zoho_token";
        }
      });
    }
  }

  if (!fatalError) {
    for (const group of projection.groups) {
      try {
      let recordId = group.recordId;
      if (group.needsDependentCreate || !recordId) {
        recordId = await ensureDependentRecord(group, {
          zoho,
          userProfile,
          persistDependentId,
          dryRun: false,
        });
        group.recordId = recordId;
      }
      if (!recordId) {
        throw Object.assign(new Error("missing_record_id"), { code: "missing_record_id" });
      }
      const result = await zoho.updateRecord(group.module, recordId, group.fields);
      if (!result || result.status === "error") {
        throw Object.assign(new Error(result?.message || "Zoho update failed"), {
          code: result?.code || "zoho_update_failed",
        });
      }
      markGroupMappings(projection, group, { status: "succeeded", recordId });
      } catch (error) {
        const sanitized = sanitizeCrmSyncError(error);
        groupErrors.push(sanitized);
        markGroupMappings(projection, group, { status: "failed", error: sanitized.code });
      }
    }
  }

  const summary = summarizeCrmMappings(projection.mappings);
  const hasFailures = Boolean(fatalError || groupErrors.length || summary.failed.length);
  if (!hasFailures) {
    const completed = {
      ...job,
      state: CRM_SYNC_STATES.succeeded,
      summary,
      updatedAt: now().toISOString(),
      completedAt: now().toISOString(),
      attemptCount: (deps.existingJob?.attemptCount || 0) + 1,
    };
    await persistJob?.(completed);
    return {
      success: true,
      jobId: job.id,
      state: CRM_SYNC_STATES.succeeded,
      dryRun: false,
      summary: completed.summary,
    };
  }

  const firstError = fatalError
    ? sanitizeCrmSyncError(fatalError)
    : groupErrors[0] || { code: "crm_projection_failed", message: "One or more CRM fields could not be synchronized" };
  const failed = {
    ...job,
    state: CRM_SYNC_STATES.failed,
    error: firstError,
    summary,
    updatedAt: now().toISOString(),
    completedAt: now().toISOString(),
    attemptCount: (deps.existingJob?.attemptCount || 0) + 1,
  };
  await persistJob?.(failed);
  return {
    success: false,
    jobId: job.id,
    state: CRM_SYNC_STATES.failed,
    partial: summary.succeeded.length > 0,
    error: failed.error,
    summary: failed.summary,
  };
}

export function blockingCrmSyncFailure(result, { requireMapped = false } = {}) {
  if (!result || result.skipped) return false;
  if (result.success === false) {
    const failed = result.summary?.failed || [];
    if (!failed.length) return true;
    return requireMapped ? failed.some((item) => item.required) : true;
  }
  return false;
}
