export const EMPTY_NATIONAL_ID_CARD = {
  family_name: "",
  given_names: "",
  identification_number: "",
  country_of_issue: "",
  date_issued_day: "",
  date_issued_month: "",
  date_issued_year: "",
  date_expiry_day: "",
  date_expiry_month: "",
  date_expiry_year: "",
};

export const OTHER_IDENTITY_DOC_TYPES = [
  "Birth certificate",
  "Drivers licence",
  "Marriage certificate",
  "Change of name certificate",
  "Military discharge certificate",
  "Other",
];

export const IDENTITY_LEGACY_ROOT_BY_VISA = {
  "temporary-work": "temporary_work_identity",
  partner: "mainApplicant.identity",
  protection: "protection_identity",
};

const EXTRA_VISAS = new Set(["partner", "protection"]);
const RECOGNIZED_OTHER_DOC_TYPES = new Set(OTHER_IDENTITY_DOC_TYPES);

export function hasIdentityExtras(visaType) {
  return EXTRA_VISAS.has(visaType);
}

export function normalizeYesNo(value, fallback = "no") {
  return String(value || "").trim().toLowerCase() === "yes" ? "yes" : fallback;
}

export function getNestedValue(obj, path) {
  return String(path || "").split(".").reduce((current, key) => current?.[key], obj);
}

export function getIdentityLegacyRoot(visaType) {
  return IDENTITY_LEGACY_ROOT_BY_VISA[visaType] || "temporary_work_identity";
}

export function makeIdentityDefaults(visaType = "temporary-work") {
  const defaults = {
    has_passport: "no",
    passports: [],
    has_national_id: "no",
    national_id_card: { ...EMPTY_NATIONAL_ID_CARD },
    other_identity_documents: [],
    identity_import_review: [],
  };

  if (!hasIdentityExtras(visaType)) return defaults;

  return {
    ...defaults,
    citizen_of_country: "no",
    stateless_explanation: "",
    ever_been_citizen: "no",
    citizenships: [],
    permanent_residency_rights: "no",
    pr_countries: [],
  };
}

export function resolveIdentityDraftData(draft = {}, visaType = "temporary-work", profileId = null) {
  const legacyData = getNestedValue(draft, getIdentityLegacyRoot(visaType)) || {};
  const profileData = profileId ? draft?.profiles_data?.[profileId]?.identity || {} : {};
  return profileId ? { ...legacyData, ...profileData } : legacyData;
}

export function normalizeIdentityForVisa(rawData = {}, visaType = "temporary-work", profile = null) {
  const defaults = makeIdentityDefaults(visaType);
  const raw = rawData || {};
  const legacyDocs = Array.isArray(raw.identity_docs)
    ? raw.identity_docs
    : Array.isArray(raw.identity_documents)
      ? raw.identity_documents
      : [];
  const converted = convertLegacyIdentityDocs(legacyDocs, profile);
  const hasCanonicalNational = raw.has_national_id === "yes" || raw.has_national_id === "no";
  const hasCanonicalOtherDocs = Array.isArray(raw.other_identity_documents);

  const normalized = {
    ...defaults,
    ...raw,
    has_passport: normalizeYesNo(raw.has_passport),
    passports: Array.isArray(raw.passports) ? raw.passports : [],
    has_national_id: hasCanonicalNational ? raw.has_national_id : converted.has_national_id,
    national_id_card: {
      ...EMPTY_NATIONAL_ID_CARD,
      ...(hasCanonicalNational ? raw.national_id_card || {} : converted.national_id_card),
    },
    other_identity_documents: hasCanonicalOtherDocs
      ? raw.other_identity_documents
      : converted.other_identity_documents,
    identity_import_review: [
      ...(Array.isArray(raw.identity_import_review) ? raw.identity_import_review : []),
      ...converted.identity_import_review,
    ],
  };

  if (!hasIdentityExtras(visaType)) return normalized;

  return {
    ...normalized,
    citizen_of_country: normalizeYesNo(raw.citizen_of_country),
    stateless_explanation: raw.stateless_explanation || "",
    ever_been_citizen: normalizeYesNo(raw.ever_been_citizen),
    citizenships: normalizeCitizenships(raw.citizenships),
    permanent_residency_rights: normalizeYesNo(raw.permanent_residency_rights),
    pr_countries: normalizeResidenceRights(raw.pr_countries),
  };
}

export function validateIdentityForVisa(data = {}, visaType = "temporary-work") {
  const issues = [];
  const add = (message) => issues.push(message);

  if (!isAnswered(data.has_passport)) add("Passport question");
  if (isYes(data.has_passport) && !allPassportRowsComplete(data.passports)) add("Passport/travel document details");

  if (!isAnswered(data.has_national_id)) add("National ID question");
  if (isYes(data.has_national_id)) {
    const nationalId = data.national_id_card || {};
    if (!hasText(nationalId.family_name)) add("National ID family name");
    if (!hasText(nationalId.given_names)) add("National ID given names");
    if (!hasText(nationalId.identification_number)) add("National ID number");
    if (!hasText(nationalId.country_of_issue)) add("National ID country of issue");
  }

  (data.other_identity_documents || []).forEach((row, index) => {
    if (!["family_name", "given_names", "document_type", "identification_number", "country_of_issue"].every((field) => hasText(row?.[field]))) {
      add(`Other identity document ${index + 1}`);
    }
  });

  const unresolved = getUnresolvedIdentityImports(data);
  if (unresolved.length > 0) add("Imported identity document review");

  if (!hasIdentityExtras(visaType)) return issues;

  if (!isAnswered(data.citizen_of_country)) add("Current citizenship question");
  if (isNo(data.citizen_of_country) && !hasText(data.stateless_explanation)) add("Statelessness details");
  if (isNo(data.citizen_of_country) && !isAnswered(data.ever_been_citizen)) add("Former citizenship question");

  const needsCitizenshipRows = isYes(data.citizen_of_country) || (isNo(data.citizen_of_country) && isYes(data.ever_been_citizen));
  if (needsCitizenshipRows && !hasRows(data.citizenships)) add("Citizenship details");
  (data.citizenships || []).forEach((row, index) => {
    if (!["country", "how_obtained", "still_citizen"].every((field) => hasText(row?.[field]))) {
      add(`Citizenship ${index + 1}`);
    }
    if (isNo(row?.still_citizen) && !["date_ceased_day", "date_ceased_month", "date_ceased_year", "reason_ceased"].every((field) => hasText(row?.[field]))) {
      add(`Citizenship ${index + 1} ceased details`);
    }
  });

  if (!isAnswered(data.permanent_residency_rights)) add("Residence rights question");
  if (isYes(data.permanent_residency_rights) && !hasRows(data.pr_countries)) add("Residence rights details");
  (data.pr_countries || []).forEach((row, index) => {
    if (!["country", "status"].every((field) => hasText(row?.[field]))) {
      add(`Residence right ${index + 1}`);
    }
    if (String(row?.status || "").toLowerCase() === "temporary" && !["expiry_day", "expiry_month", "expiry_year"].every((field) => hasText(row?.[field]))) {
      add(`Residence right ${index + 1} expiry`);
    }
  });

  return issues;
}

export function getUnresolvedIdentityImports(data = {}) {
  const reviewRows = Array.isArray(data.identity_import_review) ? data.identity_import_review : [];
  return reviewRows.filter((row) => !hasMatchingCanonicalDocument(row, data));
}

function convertLegacyIdentityDocs(rows, profile) {
  const result = {
    has_national_id: "no",
    national_id_card: { ...EMPTY_NATIONAL_ID_CARD },
    other_identity_documents: [],
    identity_import_review: [],
  };

  rows.forEach((row) => {
    const type = row.document_type || row.doc_type || "";
    const number = row.identification_number || row.id_number || "";
    const country = row.country_of_issue || "";
    const names = getStructuredNames(row, profile);
    const review = { ...row, document_type: type, identification_number: number, country_of_issue: country };

    if (/national identity/i.test(type)) {
      if (names && number && country && result.has_national_id === "no") {
        result.has_national_id = "yes";
        result.national_id_card = {
          ...EMPTY_NATIONAL_ID_CARD,
          family_name: names.family_name,
          given_names: names.given_names,
          identification_number: number,
          country_of_issue: country,
          date_issued_day: row.date_issued_day || "",
          date_issued_month: row.date_issued_month || "",
          date_issued_year: row.date_issued_year || "",
          date_expiry_day: row.date_expiry_day || "",
          date_expiry_month: row.date_expiry_month || "",
          date_expiry_year: row.date_expiry_year || "",
        };
        return;
      }
      result.identity_import_review.push(review);
      return;
    }

    if (RECOGNIZED_OTHER_DOC_TYPES.has(type) && names && number && country) {
      result.other_identity_documents.push({
        family_name: names.family_name,
        given_names: names.given_names,
        document_type: type,
        identification_number: number,
        country_of_issue: country,
      });
      return;
    }

    result.identity_import_review.push(review);
  });

  return result;
}

function getStructuredNames(row, profile) {
  const familyName = row.family_name || row.familyName;
  const givenNames = row.given_names || row.givenNames;
  if (hasText(familyName) && hasText(givenNames)) {
    return { family_name: familyName, given_names: givenNames };
  }

  const rowName = compactName(row.name);
  const profileName = compactName(`${profile?.given_names || ""} ${profile?.family_name || ""}`);
  if (rowName && profileName && rowName === profileName && hasText(profile?.family_name) && hasText(profile?.given_names)) {
    return { family_name: profile.family_name, given_names: profile.given_names };
  }

  return null;
}

function normalizeCitizenships(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    ...row,
    country: row.country || "",
    how_obtained: row.how_obtained || row.obtained_method || "",
    date_obtained_day: row.date_obtained_day || "",
    date_obtained_month: row.date_obtained_month || "",
    date_obtained_year: row.date_obtained_year || "",
    still_citizen: normalizeYesNo(row.still_citizen),
    date_ceased_day: row.date_ceased_day || "",
    date_ceased_month: row.date_ceased_month || "",
    date_ceased_year: row.date_ceased_year || "",
    reason_ceased: row.reason_ceased || row.ceased_reason || "",
  }));
}

function normalizeResidenceRights(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    ...row,
    country: row.country || "",
    status: row.status || "",
    expiry_day: row.expiry_day || "",
    expiry_month: row.expiry_month || "",
    expiry_year: row.expiry_year || "",
  }));
}

function hasMatchingCanonicalDocument(row, data) {
  const number = row.identification_number || row.id_number || "";
  const country = row.country_of_issue || "";
  if (!hasText(number) || !hasText(country)) return false;

  const national = data.national_id_card || {};
  if (
    isYes(data.has_national_id) &&
    sameText(national.identification_number, number) &&
    sameText(national.country_of_issue, country)
  ) {
    return true;
  }

  return (data.other_identity_documents || []).some((doc) =>
    sameText(doc.identification_number, number) && sameText(doc.country_of_issue, country)
  );
}

function compactName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function sameText(a, b) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

function hasText(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function hasRows(value) {
  return Array.isArray(value) && value.length > 0;
}

function allPassportRowsComplete(rows) {
  if (!hasRows(rows)) return false;
  const requiredFields = [
    "document_type",
    "document_number",
    "passport_country",
    "place_of_issue",
    "nationality",
    "gender",
    "name",
    "date_issued_day",
    "date_issued_month",
    "date_issued_year",
    "document_status",
  ];

  return rows.every((row) => {
    if (!requiredFields.every((field) => hasText(row?.[field]))) return false;
    if (row.document_status === "Current") {
      return ["date_expiry_day", "date_expiry_month", "date_expiry_year"].every((field) => hasText(row?.[field]));
    }
    return true;
  });
}

function isAnswered(value) {
  return isYes(value) || isNo(value);
}

function isYes(value) {
  return String(value || "").trim().toLowerCase() === "yes";
}

function isNo(value) {
  return String(value || "").trim().toLowerCase() === "no";
}
