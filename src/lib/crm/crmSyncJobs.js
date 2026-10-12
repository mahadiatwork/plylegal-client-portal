import { createHash } from "node:crypto";

export const CRM_SYNC_STATES = Object.freeze({
  pending: "pending",
  processing: "processing",
  succeeded: "succeeded",
  failed: "failed",
});

export function fingerprintCrmGroups(groups = []) {
  const normalized = groups.map((group) => ({
    module: group.module,
    recordId: group.recordId || `pending:${group.pendingProfileId || ""}`,
    fields: Object.fromEntries(
      Object.entries(group.fields || {}).sort(([left], [right]) => left.localeCompare(right)),
    ),
  }));
  normalized.sort((left, right) => `${left.module}:${left.recordId}`.localeCompare(`${right.module}:${right.recordId}`));
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex").slice(0, 32);
}

export function buildCrmSyncIdempotencyKey({
  applicationId,
  definitionId,
  definitionRevision,
  pageId,
  profileId,
  payloadFingerprint,
}) {
  return [
    applicationId,
    definitionId || "unknown",
    String(definitionRevision ?? 0),
    pageId || "full",
    profileId || "all",
    payloadFingerprint,
  ].join(":");
}

export function crmSyncDocumentId(idempotencyKey) {
  return createHash("sha256").update(idempotencyKey).digest("hex").slice(0, 40);
}

export function sanitizeCrmSyncError(error) {
  const message = String(error?.message || "CRM synchronization failed");
  return {
    code: error?.code || error?.status || "crm_sync_failed",
    message: message.slice(0, 300),
  };
}

export function buildCrmSyncJobRecord({
  applicationId,
  definition,
  mode,
  pageId,
  profileId,
  groups,
  state = CRM_SYNC_STATES.pending,
  attemptCount = 0,
  dryRun = false,
  error = null,
  now = new Date(),
}) {
  const payloadFingerprint = fingerprintCrmGroups(groups);
  const idempotencyKey = buildCrmSyncIdempotencyKey({
    applicationId,
    definitionId: definition?.id,
    definitionRevision: definition?.revision,
    pageId,
    profileId,
    payloadFingerprint,
  });
  const timestamp = now.toISOString();
  return {
    id: crmSyncDocumentId(idempotencyKey),
    applicationId,
    definitionId: definition?.id || null,
    definitionRevision: definition?.revision ?? null,
    mode,
    pageId: pageId || null,
    profileId: profileId || null,
    idempotencyKey,
    targets: groups.map((group) => ({
      module: group.module,
      recordId: group.recordId || null,
      fieldApiNames: [...(group.fieldApiNames || Object.keys(group.fields || {}))],
    })),
    state,
    attemptCount,
    dryRun,
    error,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function summarizeCrmMappings(mappings = []) {
  return {
    succeeded: mappings.filter((item) => item.status === "succeeded").map(publicMapping),
    skipped: mappings.filter((item) => item.status === "skipped").map(publicMapping),
    failed: mappings.filter((item) => item.status === "failed").map(publicMapping),
    ready: mappings.filter((item) => item.status === "ready").map(publicMapping),
  };
}

function publicMapping(item) {
  return {
    questionId: item.questionId,
    answerKey: item.answerKey,
    pageId: item.pageId,
    profileId: item.profileId || null,
    target: item.target || null,
    module: item.module || null,
    fieldApiName: item.fieldApiName || null,
    status: item.status,
    skipReason: item.skipReason || null,
    error: item.error || null,
    required: item.required === true,
  };
}

export function maskCrmValue(value) {
  if (value === null || value === undefined || value === "") return "";
  return "[hidden]";
}
