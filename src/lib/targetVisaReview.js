import { buildIntakeHref } from "./routes.js";
import { getTargetVisaPages } from "./targetVisaPages.js";
import { formatReviewLabel, hasReviewValue, mergeDatePartGroups } from "./temporaryWorkReview.js";
import { CHARACTER_QUESTION_LABELS } from "./allApplicantsParity.js";
import { SPONSOR_CHARACTER_LABELS, normalizeSponsorCharacter } from "./partnerQuestionnaireAlignment.js";

const INTERNAL_KEYS = new Set(["id", "__typename", "createdAt", "updatedAt", "userId", "visaContext", "zohoDependentId", "zohoLastSyncedAt", "zohoSyncError", "zohoSyncStatus", "matterDocumentId"]);
const SHARED_SUFFIXES = { "travel-history": "travel", "contact-details": "contact_details", "future-travel": "future_travel", "future-addresses": "future_addresses" };
const RELATIONSHIP_SECTIONS = { "current-relationship": "currentRelationship", "relationship-details": "relationshipDetails", "previous-relationships": "previousRelationships", "supporting-witnesses": "supportingWitnesses" };
const DETAIL_GATES = {
  health_examinations: "has_health_examinations", hospital_details: "intends_hospital_entry",
  healthcare_work_details: "intends_healthcare_work", aged_care_work_details: "intends_aged_care",
  childcare_work_details: "intends_childcare", classroom_work_details: "intends_classroom",
  tuberculosis_details: "had_tuberculosis", tuberculosis_exposure_details: "close_contact_tb",
  health_conditions_details: "medical_condition", medical_assistance_details: "requires_assistance",
  health_insurance_details: "health_insurance", passports: "has_passport", national_id_card: "has_national_id",
};

function readPath(draft, path) {
  return draft[path] ?? path.split(".").reduce((value, key) => value?.[key], draft);
}

function firstSection(draft, keys) {
  for (const key of keys) {
    const value = readPath(draft, key);
    if (hasReviewValue(value)) return value;
  }
  return {};
}

function profileData(draft, visaType, page) {
  const section = page.section === "other-details" ? "other" : page.section;
  const saved = draft.profiles_data?.[page.profileId];
  const spouse = page.profile.relationship === "spouse";
  const partnerKey = spouse ? `spousePartner.${section === "other" ? "otherNames" : section}` : `mainApplicant.${section === "other" ? "otherNames" : section}`;
  const rootKey = `${visaType === "partner" ? "partner" : "protection"}_${spouse ? "spouse_" : ""}${section}`;
  const legacyOnly = page.profile.relationship === "main_applicant" && (section === "family" || (visaType === "protection" && ["education", "employment"].includes(section)));
  const legacy = firstSection(draft, visaType === "partner" ? [partnerKey, rootKey] : [rootKey, partnerKey]);
  let data;
  if (page.profile.relationship === "child") data = saved?.[section] || {};
  else if (legacyOnly) data = legacy;
  else if (page.profile.relationship === "main_applicant" && ["other", "identity"].includes(section)) data = { ...legacy, ...saved?.[section] };
  else data = saved && Object.prototype.hasOwnProperty.call(saved, section) ? saved[section] : legacy;
  if (section !== "details") return data;
  const { given_names, family_name, gender, birth_day, birth_month, birth_year } = page.profile;
  return { given_names, family_name, gender, birth_day, birth_month, birth_year, ...data };
}

function memberData(member, section) {
  switch (section) {
    case "details": return { relationship: member.relationship, relationship_status: member.relationship_status, place_of_birth: member.place_of_birth, contact: member.contact, address: member.address };
    case "passport": return { has_current_passport: member.has_current_passport, passport: member.passport };
    case "identity": return { has_national_identity_card: member.has_national_identity_card, has_other_identity_documents: member.has_other_identity_documents };
    case "other-names": return { other_names: member.other_names };
    case "citizenship": return { citizenship: member.citizenship };
    case "health": return { requires_health_examination: member.requires_health_examination };
    default: return {};
  }
}

export function formatTargetReviewLabel(key) {
  if (CHARACTER_QUESTION_LABELS[key]) return CHARACTER_QUESTION_LABELS[key];
  if (SPONSOR_CHARACTER_LABELS[key]) return SPONSOR_CHARACTER_LABELS[key];
  if (key.endsWith("_details") && CHARACTER_QUESTION_LABELS[key.slice(0, -8)]) {
    return `${CHARACTER_QUESTION_LABELS[key.slice(0, -8)]} — Give details`;
  }
  return formatReviewLabel(key);
}

export function formatSponsorReviewLabel(key) {
  const questionKey = key.endsWith("_details") ? key.slice(0, -8) : key;
  if (SPONSOR_CHARACTER_LABELS[questionKey]) return `${SPONSOR_CHARACTER_LABELS[questionKey]}${questionKey !== key ? " — Give details" : ""}`;
  return formatReviewLabel(key);
}

function reviewLabelForPage(page, baseFormatter) {
  const suffix = page.href.split("/").pop();
  const historyLabels = { "travel-history": "Travel History", "future-travel": "Future Travel", addresses: "Address History", "future-addresses": "Future Addresses", employment: "Employment History", education: "Education History" };
  return (key) => {
    if (key === "history" && historyLabels[suffix]) return historyLabels[suffix];
    if (key === "relationship" && suffix === "profile") return "Relationship to Application";
    if (key === "relationship_to_spouse") return "Relationship to Spouse/Partner";
    return baseFormatter(key);
  };
}

function sponsorDataForReview(data) {
  if (!Array.isArray(data.national_security_details)) return data;
  const result = { ...data };
  result.national_security_risk_details = normalizeSponsorCharacter(data).national_security_risk_details;
  delete result.national_security_details;
  return result;
}

function visibleContactData(data, visaType) {
  const result = { ...data };
  const partner = visaType === "partner";
  const gates = [
    [partner ? "share_contact_phone_numbers" : "share_same_contact_phones", /^(after_hours_|office_hours_|mobile_)/],
    [partner ? "share_email_address" : "share_same_email", /^shared_email$/],
    [partner ? "share_postal_address" : "share_same_postal_address", /^postal_/],
  ];
  for (const [gate, fields] of gates) {
    if (String(data[gate]).toLowerCase() === "no") {
      for (const key of Object.keys(result)) if (fields.test(key)) delete result[key];
    }
  }
  return result;
}

function normalize(value, names) {
  if (Array.isArray(value)) return value.map((item) => normalize(item, names)).filter(hasReviewValue);
  if (!value || typeof value !== "object") return value;
  const result = {};
  for (const [key, entry] of Object.entries(value)) {
    if (INTERNAL_KEYS.has(key)) continue;
    const gate = DETAIL_GATES[key] || (key.endsWith("_details") ? key.slice(0, -8) : null);
    if (gate && String(value[gate]).toLowerCase() === "no") continue;
    let next = normalize(entry, names);
    if (key === "applicant_ids" && Array.isArray(entry)) next = entry.map((id) => names.get(String(id)) || id);
    if (["applicantId", "applicant_id", "applicant_name"].includes(key)) next = names.get(String(entry)) || entry;
    if (hasReviewValue(next)) result[names.get(key) || key] = next;
  }
  return mergeDatePartGroups(result);
}

export function buildTargetVisaReviewSections({ visaType, draft = {}, appId }) {
  const names = new Map((draft.profiles || []).map((profile) => [String(profile.id), [profile.given_names, profile.family_name].filter(Boolean).join(" ") || "Unnamed applicant"]));
  const sections = [];
  for (const page of getTargetVisaPages(visaType, draft)) {
    const suffix = page.href.split("/").pop();
    if (suffix === "start") continue;
    let data = {};
    let title = page.title;
    let formatLabel = formatTargetReviewLabel;
    if (page.member) data = memberData(page.member, page.section);
    else if (page.profile) data = profileData(draft, visaType, page);
    else if (suffix === "profile") data = { applicants: draft.profiles || [] };
    else if (suffix === "non-migrating") data = { has_other_family: draft.temporary_work_non_migrating?.has_other_family };
    else if (page.href.includes("/family-sponsor/")) {
      // Sponsor pages save into a single object. Show it once, without dropping
      // legacy or visa-specific facts that span multiple sponsor subpages.
      if (suffix !== "details") continue;
      title = "Family Sponsor";
      formatLabel = formatSponsorReviewLabel;
      data = sponsorDataForReview(draft.familySponsor?.details || {});
    } else if (page.href.includes("/relationships/")) data = draft.relationships?.[RELATIONSHIP_SECTIONS[suffix]] || {};
    else if (page.href.includes("/all-applicants/")) data = draft[`${visaType}_${SHARED_SUFFIXES[suffix] || suffix}`] || {};
    else if (suffix === "employment") data = draft.protection_employment_offer || {};
    if (suffix === "contact-details" && page.href.includes("/all-applicants/")) data = visibleContactData(data, visaType);
    formatLabel = reviewLabelForPage(page, formatLabel);
    const normalized = normalize(data, names);
    const items = Object.entries(normalized).filter(([, value]) => hasReviewValue(value)).map(([key, value]) => ({ label: formatLabel(key), value }));
    if (!items.length) continue;
    sections.push({
      id: page.key.replace(/[^a-zA-Z0-9-]+/g, "-"), title, items, formatLabel,
      editHref: buildIntakeHref({ appId, internalHref: page.href, visaType, profileId: page.profile ? page.profileId : undefined }),
    });
  }
  return sections;
}
