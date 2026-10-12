export function getCrmSyncFlags(env = process.env) {
  const enabledValue = String(env.CRM_QUESTIONNAIRE_SYNC_ENABLED || "").trim().toLowerCase();
  const dryRunValue = String(env.CRM_QUESTIONNAIRE_SYNC_DRY_RUN || "").trim().toLowerCase();
  return {
    enabled: enabledValue === "true" || enabledValue === "1",
    dryRun: dryRunValue === "true" || dryRunValue === "1",
  };
}
