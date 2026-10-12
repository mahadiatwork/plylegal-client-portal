import { getQuestionnairePageSavedValues } from "../questionnaires/answers.js";
import { CRM_MODULES, CRM_TARGETS } from "./crmFieldCatalog.js";
import { getQuestionnairePageProfileRole } from "./questionnaireCrmContract.js";

const MONTHS = Object.freeze({
  january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
  july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
});

const MARITAL_STATUS = Object.freeze({
  "never married": "Never Married or been in a De Facto Relationship",
  "never married or been in a de facto relationship": "Never Married or been in a De Facto Relationship",
  married: "Married",
  "de facto relationship": "De Facto Relationship",
  divorced: "Divorced",
  engaged: "Engaged",
  separated: "Separated",
  widowed: "Widowed",
});

const RELATIONSHIPS = Object.freeze({
  spouse: "Spouse",
  partner: "Partner",
  child: "Children",
  children: "Children",
});

function text(value) {
  return value == null ? "" : String(value).trim();
}

function firstText(...values) {
  return values.map(text).find(Boolean) || "";
}

function normalizeMonth(value) {
  const raw = text(value);
  if (!raw) return "";
  if (MONTHS[raw.toLowerCase()]) return MONTHS[raw.toLowerCase()];
  const numeric = Number(raw);
  return Number.isInteger(numeric) && numeric >= 1 && numeric <= 12
    ? String(numeric).padStart(2, "0")
    : "";
}

function dateFromParts(day, month, year) {
  const normalizedDay = text(day).padStart(2, "0");
  const normalizedMonth = normalizeMonth(month);
  const normalizedYear = text(year);
  if (!/^\d{4}$/.test(normalizedYear) || !normalizedMonth || !/^\d{2}$/.test(normalizedDay)) return "";
  const candidate = `${normalizedYear}-${normalizedMonth}-${normalizedDay}`;
  const parsed = new Date(`${candidate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== candidate) return "";
  return candidate;
}

function isTruthyAnswer(value) {
  return value === true || ["yes", "true", "1"].includes(text(value).toLowerCase());
}

function selectCurrentRow(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return {};
  return rows.find((row) => isTruthyAnswer(row?.is_current) || isTruthyAnswer(row?.current)) || rows[0] || {};
}

function firstCitizenship(details, identity, passportCountry) {
  const rows = [identity?.citizenships, details?.citizenships]
    .find((candidate) => Array.isArray(candidate) && candidate.length) || [];
  const rowCountry = rows.map((row) => firstText(
    row?.country,
    row?.citizenship_country,
    row?.country_name,
  )).find(Boolean);
  if (rowCountry) return rowCountry;
  if (
    isTruthyAnswer(details?.citizenship_of_passport_country)
    || isTruthyAnswer(details?.citizen_of_passport_country)
    || isTruthyAnswer(identity?.citizenship_of_passport_country)
  ) return passportCountry;
  return "";
}

function pageFor(definition, role, sectionKey) {
  return (definition?.pages || []).find((page) => (
    getQuestionnairePageProfileRole(page) === role
    && text(page.sectionKey).toLowerCase() === sectionKey
  ));
}

function sectionValues({ definition, draft, subject, role, sectionKey, isNonMigrating }) {
  const page = pageFor(definition, role, sectionKey);
  if (page) {
    return getQuestionnairePageSavedValues(
      draft,
      page,
      isNonMigrating ? null : subject.id,
      isNonMigrating ? subject.id : null,
    ) || {};
  }
  return draft?.profiles_data?.[subject.id]?.[sectionKey] || {};
}

function subjectSnapshot({ definition, draft, subject, role, isNonMigrating }) {
  const details = sectionValues({ definition, draft, subject, role, sectionKey: "details", isNonMigrating });
  const identity = sectionValues({ definition, draft, subject, role, sectionKey: "identity", isNonMigrating });
  const passport = selectCurrentRow(identity?.passports);
  const passportCountry = firstText(passport?.passport_country, passport?.country_of_passport);
  const citizenship = firstCitizenship(details, identity, passportCountry);
  return {
    id: subject.id,
    relationship: subject.relationship,
    given_names: firstText(details?.given_names, subject.given_names, subject.firstName),
    family_name: firstText(details?.family_name, subject.family_name, subject.lastName),
    preferred_names: firstText(details?.preferred_names, details?.preferred_name, subject.preferred_names),
    gender: firstText(details?.gender, subject.gender),
    birth_day: firstText(details?.birth_day, subject.birth_day),
    birth_month: firstText(details?.birth_month, subject.birth_month),
    birth_year: firstText(details?.birth_year, subject.birth_year),
    date_of_birth: dateFromParts(
      firstText(details?.birth_day, subject.birth_day),
      firstText(details?.birth_month, subject.birth_month),
      firstText(details?.birth_year, subject.birth_year),
    ),
    marital_status: MARITAL_STATUS[text(details?.marital_status).toLowerCase()] || "",
    country_of_birth: text(details?.country_of_birth),
    citizenship,
    passport_number: firstText(passport?.document_number, passport?.passport_number),
    passport_country: passportCountry,
    passport_expiry: dateFromParts(
      passport?.date_expiry_day,
      passport?.date_expiry_month,
      passport?.date_expiry_year,
    ),
    isApplicant: subject.isApplicant === true || role === "main_applicant",
    isNonMigrating: subject.isNonMigrating === true || isNonMigrating,
    zohoDependentId: subject.zohoDependentId || null,
  };
}

function canonicalMapping({
  snapshot,
  pageId,
  target,
  module,
  recordId,
  fieldApiName,
  value,
  needsDependentCreate = false,
}) {
  const base = {
    questionId: `canonical:${snapshot.id}:${fieldApiName}`,
    answerKey: fieldApiName,
    pageId: pageId || "canonical",
    profileId: snapshot.id,
    profileRole: snapshot.relationship,
    target,
    module,
    fieldApiName,
    transform: "canonical",
    clearPolicy: "preserve_when_empty",
    required: false,
    recordId,
    needsDependentCreate,
    profileSnapshot: snapshot,
  };
  if (value === "" || value === null || value === undefined) {
    return { ...base, status: "skipped", skipReason: "preserve_when_empty" };
  }
  if (!recordId && !needsDependentCreate) {
    return {
      ...base,
      status: "failed",
      error: target === CRM_TARGETS.matter ? "missing_matter_id" : "missing_contact_id",
    };
  }
  return { ...base, status: "ready", value };
}

function pushFields(mappings, config, fields) {
  Object.entries(fields).forEach(([fieldApiName, value]) => {
    mappings.push(canonicalMapping({ ...config, fieldApiName, value }));
  });
}

function questionnaireStatus(draft) {
  return draft?.submittedAt || draft?.submitted_at || draft?.status === "submitted"
    ? "Submitted"
    : "In Progress";
}

export function buildCanonicalApplicantCrmMappings({
  definition,
  draft = {},
  application = {},
  userProfile = {},
  mode = "full",
  pageId = null,
  profileId = null,
} = {}) {
  const selectedPage = mode === "page"
    ? (definition?.pages || []).find((page) => page.id === pageId)
    : null;
  const selectedRole = selectedPage ? getQuestionnairePageProfileRole(selectedPage) : null;
  const selectedSection = selectedPage ? text(selectedPage.sectionKey).toLowerCase() : null;
  const sections = mode === "full" ? new Set(["details", "identity"]) : new Set([selectedSection]);
  const subjects = [
    ...(draft.profiles || []).map((subject) => ({ subject, role: subject.relationship, isNonMigrating: false })),
    ...(draft.non_migrating_members || []).map((subject) => ({
      subject,
      role: "non_migrating",
      isNonMigrating: true,
    })),
  ].filter(({ subject, role }) => (
    (!profileId || String(subject.id) === String(profileId))
    && (!selectedRole || role === selectedRole)
  ));

  const mappings = [];
  subjects.forEach(({ subject, role, isNonMigrating }) => {
    const snapshot = subjectSnapshot({ definition, draft, subject, role, isNonMigrating });
    const page = selectedPage?.id || null;
    if (role === "main_applicant") {
      if (sections.has("details")) {
        const matter = {
          snapshot,
          pageId: page,
          target: CRM_TARGETS.matter,
          module: CRM_MODULES.Deals,
          recordId: application.zohoId || null,
        };
        pushFields(mappings, matter, {
          Family_Name: snapshot.family_name,
          Given_Name: snapshot.given_names,
          Preferred_Name: snapshot.preferred_names,
          Gender: ["Male", "Female"].includes(snapshot.gender) ? snapshot.gender : "",
          Date_of_Birth: snapshot.date_of_birth,
          Country_of_Birth: snapshot.country_of_birth,
          Marital_Status: snapshot.marital_status,
          Questionnaires_Status: questionnaireStatus(draft),
        });
        pushFields(mappings, {
          snapshot,
          pageId: page,
          target: CRM_TARGETS.main_contact,
          module: CRM_MODULES.Contacts,
          recordId: userProfile.zohoContactId || null,
        }, {
          Last_Name: snapshot.family_name,
          First_Name: snapshot.given_names,
          Gender: ["Male", "Female"].includes(snapshot.gender) ? snapshot.gender : "",
          Date_of_Birth: snapshot.date_of_birth,
        });
      }
      if (sections.has("identity")) {
        pushFields(mappings, {
          snapshot,
          pageId: page,
          target: CRM_TARGETS.matter,
          module: CRM_MODULES.Deals,
          recordId: application.zohoId || null,
        }, {
          City_Town_of_Birth: snapshot.citizenship,
          State_or_Province_of_Birth: snapshot.passport_number,
        });
      }
      return;
    }

    const dependent = {
      snapshot,
      pageId: page,
      target: CRM_TARGETS.profile_record,
      module: CRM_MODULES.Partner_Dependents,
      recordId: snapshot.zohoDependentId,
      needsDependentCreate: !snapshot.zohoDependentId,
    };
    if (sections.has("details")) {
      pushFields(mappings, dependent, {
        First_Name: snapshot.given_names,
        Name: snapshot.family_name,
        Gender: ["Male", "Female"].includes(snapshot.gender) ? snapshot.gender : "",
        Date_of_Birth: snapshot.date_of_birth,
        Relationship_to_Applicant: RELATIONSHIPS[text(snapshot.relationship).toLowerCase()] || "",
        Relationship_Status: snapshot.marital_status,
        Non_Migrating: snapshot.isNonMigrating,
        Contact_Name: userProfile.zohoContactId ? { id: userProfile.zohoContactId } : "",
      });
    }
    if (sections.has("identity")) {
      pushFields(mappings, dependent, {
        Passport_Number: snapshot.passport_number,
        Passport_Expiry_Date: snapshot.passport_expiry,
        Country_of_Passport: snapshot.passport_country,
        Citizenship: snapshot.citizenship,
      });
    }
  });
  return mappings;
}
