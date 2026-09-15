import { normalizeTargetPersonalDetails, targetPersonalDetailsSchema, targetChildDetailsSchema } from "./targetVisaPersonalDetails.js";

// Older completed child/spouse pages did not collect the newly shared fields.
// Check the answers as well as the stored page flags before submission.
export function getTargetPersonalDetailsIssues(visaType, draft = {}, { skipRelationships = new Set() } = {}) {
  if (!["partner", "protection"].includes(visaType)) return [];
  const issues = [];
  const hasSpouse = (draft.profiles || []).some((profile) => profile.relationship === "spouse");
  for (const profile of draft.profiles || []) {
    if (!["spouse", "child"].includes(profile.relationship)) continue;
    if (skipRelationships.has(profile.relationship)) continue;
    const saved = draft.profiles_data?.[profile.id];
    const legacy = profile.relationship === "child" ? {} : visaType === "partner"
      ? draft.spousePartner?.details || draft["spousePartner.details"] || {}
      : draft.protection_spouse_details || {};
    const details = saved && Object.prototype.hasOwnProperty.call(saved, "details") ? saved.details : legacy;
    const schema = profile.relationship === "child" && hasSpouse ? targetChildDetailsSchema : targetPersonalDetailsSchema;
    const result = schema.safeParse(normalizeTargetPersonalDetails(details, profile));
    if (!result.success) {
      const role = profile.relationship === "child" ? "Child" : "Spouse/Partner";
      const name = [profile.given_names, profile.family_name].filter(Boolean).join(" ") || "Unnamed";
      for (const issue of result.error.issues) issues.push(`${role} (${name}): ${issue.message}`);
    }
  }
  return issues;
}
