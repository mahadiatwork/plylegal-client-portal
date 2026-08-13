import {
  EMPLOYER_NOMINATION_SPOUSE_PROFILE_SUBPAGES,
  NON_MIGRATING_MEMBER_SUBPAGES,
  PROFILE_SUBPAGES,
  TEMPORARY_WORK_482_SPOUSE_PROFILE_SUBPAGES,
  TEMPORARY_WORK_CHILD_PROFILE_SUBPAGES,
  getNonMigratingCompletionPrefix,
  getIntakeRoutes,
} from "@/lib/routes";
import {
  normalizeIdentityForVisa,
  resolveIdentityDraftData,
  validateIdentityForVisa,
} from "@/lib/mainApplicantIdentity";

function getProfileDisplayName(profile) {
  const rawName = `${profile?.given_names || ""} ${profile?.family_name || ""}`.trim();
  const name = rawName || "Unnamed";
  const relationship = profile?.relationship;

  if (relationship === "main_applicant") return `Main Applicant (${name})`;
  if (relationship === "spouse") return `Spouse/Partner (${name})`;
  if (relationship === "child") return `Child (${name})`;
  return `Dependent (${name})`;
}

function normalizeKeyFromPath(path, visaType) {
  return path.replace(`/intake/${visaType}/`, `${visaType}/`);
}

function getSortedProfiles(profiles) {
  const order = {
    main_applicant: 0,
    spouse: 1,
    child: 2,
    other: 3,
  };

  return [...profiles].sort(
    (a, b) => (order[a?.relationship] ?? 4) - (order[b?.relationship] ?? 4)
  );
}

const LEGACY_TEMPORARY_WORK_SECTION_KEYS = {
  main_applicant: {
    details: "temporary_work_details",
    other: "temporary_work_other",
    contact_details: "temporary_work_contact_details",
    employment: "temporary_work_employment",
    education: "temporary_work_education",
    skills: "temporary_work_skills",
    language: "temporary_work_language",
  },
  spouse: {
    details: "temporary_work_spouse_details",
    other: "temporary_work_spouse_other",
    education: "temporary_work_spouse_education",
    language: "temporary_work_spouse_language",
  },
};

const EMPLOYED_STATUSES = new Set(["employed", "self-employed"]);
const STRICT_TEMPORARY_WORK_CONTEXTS = new Set(["186", "482"]);

const TEMPORARY_WORK_SECTION_BY_ROUTE = {
  details: "details",
  other: "other",
  "other-details": "other",
  identity: "identity",
  "contact-details": "contact_details",
  employment: "employment",
  education: "education",
  skills: "skills",
  language: "language",
  custody: "custody",
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function hasText(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function isYes(value) {
  return String(value || "").trim().toLowerCase() === "yes";
}

function hasAnswer(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "yes" || normalized === "no";
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function hasCompleteDate(data, fields) {
  return fields.every((field) => hasText(data?.[field]));
}

function hasRows(value) {
  return Array.isArray(value) && value.length > 0;
}

function rowHasFields(row, fields) {
  return fields.every((field) => hasText(row?.[field]));
}

function allRowsHaveFields(rows, fields, extraValidator = null) {
  if (!hasRows(rows)) return false;
  return rows.every((row) => {
    if (!rowHasFields(row, fields)) return false;
    if (extraValidator && !extraValidator(row)) return false;
    return true;
  });
}

function addValidationIssue(items, itemSet, label) {
  if (!label || itemSet.has(label)) return;
  itemSet.add(label);
  items.push(label);
}

function getStrictTemporaryWorkContext(visaContext, draft) {
  const context = visaContext ?? draft?.visaContext ?? null;
  return STRICT_TEMPORARY_WORK_CONTEXTS.has(context) ? context : null;
}

function normalizeTemporaryWorkPageKey(pageKey) {
  const rawKey = String(pageKey || "").split("__")[0];
  if (!rawKey) return "";
  if (rawKey.startsWith("/intake/temporary-work/")) {
    return rawKey.replace("/intake/", "");
  }
  return rawKey.replace(/^\/+/, "");
}

function parseTemporaryWorkPageKey(pageKey) {
  const key = normalizeTemporaryWorkPageKey(pageKey);
  if (!key.startsWith("temporary-work/")) return null;

  const parts = key.split("/");
  if (parts[1] === "main-applicant") {
    return {
      applicantType: "main_applicant",
      sectionName: TEMPORARY_WORK_SECTION_BY_ROUTE[parts[2]],
      routeKey: key,
    };
  }

  if (parts[1] === "spouse-partner") {
    return {
      applicantType: "spouse",
      sectionName: TEMPORARY_WORK_SECTION_BY_ROUTE[parts[2]],
      routeKey: key,
    };
  }

  if (parts[1] === "children") {
    return {
      applicantType: "child",
      childId: parts[2],
      sectionName: TEMPORARY_WORK_SECTION_BY_ROUTE[parts[3]],
      routeKey: key,
    };
  }

  if (parts[1] === "all-applicants" && parts[2] === "countries-of-residence") {
    return {
      applicantType: "all_applicants",
      sectionName: "countries_of_residence",
      routeKey: key,
    };
  }

  if (parts[1] === "all-applicants" && parts[2] === "travel-history") {
    return {
      applicantType: "all_applicants",
      sectionName: "travel_history",
      routeKey: key,
    };
  }

  return null;
}

function getProfileIdFromPageKey(pageKey) {
  const profileId = String(pageKey || "").split("__")[1];
  return profileId || null;
}

function getProfileForTemporaryWorkPage(draft, parsed, profileId) {
  const profiles = Array.isArray(draft?.profiles) ? draft.profiles : [];
  const resolvedId = profileId || parsed?.childId || null;
  const matchById = resolvedId
    ? profiles.find((profile) => String(profile?.id) === String(resolvedId))
    : null;
  if (matchById) return matchById;

  const matchByRelationship = profiles.find((profile) => profile?.relationship === parsed?.applicantType);
  if (matchByRelationship) return matchByRelationship;

  return {
    id: resolvedId,
    relationship: parsed?.applicantType,
  };
}

function collectValidationIssues(runValidation) {
  const issues = [];
  const issueSet = new Set();
  const addIssue = (label) => addValidationIssue(issues, issueSet, label);
  runValidation(addIssue);
  return issues;
}

function todayOnly() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addYears(date, years) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

function formatCoverageDate(date) {
  return `${String(date.getDate()).padStart(2, "0")} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function monthIndex(value) {
  const raw = String(value || "").trim();
  if (!raw) return -1;
  if (/^\d+$/.test(raw)) {
    const month = Number.parseInt(raw, 10);
    return month >= 1 && month <= 12 ? month - 1 : -1;
  }
  return MONTH_NAMES.findIndex((month) => month.toLowerCase() === raw.toLowerCase());
}

function parseResidenceDate(day, month, year) {
  const parsedDay = Number.parseInt(String(day || ""), 10);
  const parsedYear = Number.parseInt(String(year || ""), 10);
  const parsedMonth = monthIndex(month);
  if (!parsedDay || parsedMonth < 0 || !parsedYear) return null;

  const date = new Date(parsedYear, parsedMonth, parsedDay);
  if (
    date.getFullYear() !== parsedYear ||
    date.getMonth() !== parsedMonth ||
    date.getDate() !== parsedDay
  ) {
    return null;
  }
  return date;
}

function rowBelongsToApplicant(row, applicant) {
  const saved = String(row?.applicant_name || "").trim();
  if (!saved) return false;
  return [applicant.value, applicant.label, applicant.id].filter(Boolean).some((token) => saved === token);
}

function applicantCoverageStart(applicant, today) {
  const tenYearsAgo = new Date(today);
  tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

  const dob = parseResidenceDate(applicant.birth_day, applicant.birth_month, applicant.birth_year);
  if (!dob) return tenYearsAgo;

  const sixteenthBirthday = addYears(dob, 16);
  return sixteenthBirthday > tenYearsAgo ? sixteenthBirthday : tenYearsAgo;
}

function parseResidenceInterval(row, today) {
  const start = parseResidenceDate(row.date_from_day, row.date_from_month, row.date_from_year);
  if (!start) return { error: "Date From is incomplete or invalid." };

  const toValues = [row.date_to_day, row.date_to_month, row.date_to_year].map((value) => String(value || "").trim());
  const filledToValues = toValues.filter(Boolean).length;
  let end = today;

  if (filledToValues > 0 && filledToValues < 3) {
    return { error: "Date To is incomplete." };
  }

  if (filledToValues === 3) {
    end = parseResidenceDate(row.date_to_day, row.date_to_month, row.date_to_year);
    if (!end) return { error: "Date To is invalid." };
  }

  if (end < start) {
    return { error: "Date To cannot be before Date From." };
  }

  return { start, end };
}

function getResidenceApplicants(draft) {
  return (draft?.profiles || []).map((profile) => {
    const fullName = [profile?.given_names, profile?.family_name].filter(Boolean).join(" ").trim();
    const label = fullName || "Unnamed";
    return {
      label,
      value: label,
      id: profile?.id,
      birth_day: profile?.birth_day || "",
      birth_month: profile?.birth_month || "",
      birth_year: profile?.birth_year || "",
    };
  });
}

export function getResidenceCoverageIssues(records, applicants) {
  if (!Array.isArray(applicants) || applicants.length === 0) return [];

  const today = todayOnly();
  const issues = [];

  applicants.forEach((applicant) => {
    const requiredStart = applicantCoverageStart(applicant, today);
    if (requiredStart > today) return;

    const intervals = [];
    const applicantRows = (records || []).filter((row) => rowBelongsToApplicant(row, applicant));

    applicantRows.forEach((row) => {
      const parsed = parseResidenceInterval(row, today);
      if (parsed.error) {
        issues.push(`${applicant.label}: ${parsed.error}`);
        return;
      }
      if (parsed.end < requiredStart || parsed.start > today) return;
      intervals.push({
        start: parsed.start < requiredStart ? requiredStart : parsed.start,
        end: parsed.end > today ? today : parsed.end,
      });
    });

    if (!intervals.length) {
      issues.push(`${applicant.label}: add residence records from ${formatCoverageDate(requiredStart)} to today.`);
      return;
    }

    intervals.sort((a, b) => a.start.getTime() - b.start.getTime());
    let coveredEnd = null;

    intervals.forEach((interval) => {
      if (!coveredEnd) {
        if (interval.start > requiredStart) {
          issues.push(`${applicant.label}: coverage must start by ${formatCoverageDate(requiredStart)}.`);
        }
        coveredEnd = interval.end;
        return;
      }

      if (interval.start.getTime() > coveredEnd.getTime() + MS_PER_DAY) {
        issues.push(
          `${applicant.label}: gap between ${formatCoverageDate(addDays(coveredEnd, 1))} and ${formatCoverageDate(addDays(interval.start, -1))}.`
        );
      }

      if (interval.end > coveredEnd) {
        coveredEnd = interval.end;
      }
    });

    if (coveredEnd && coveredEnd < today) {
      issues.push(`${applicant.label}: coverage must continue through today.`);
    }
  });

  return issues;
}

function getTemporaryWorkSection(draft, profile, sectionName) {
  const profileSection = draft?.profiles_data?.[profile?.id]?.[sectionName];
  const legacyKey = LEGACY_TEMPORARY_WORK_SECTION_KEYS[profile?.relationship]?.[sectionName];
  const legacySection = legacyKey ? draft?.[legacyKey] : undefined;
  const section = profileSection && Object.keys(profileSection).length > 0
    ? profileSection
    : legacySection || {};

  if (sectionName !== "details" || !profile) return section || {};

  return {
    ...section,
    family_name: section?.family_name || profile.family_name || "",
    given_names: section?.given_names || profile.given_names || "",
    gender: section?.gender || profile.gender || "",
    birth_day: section?.birth_day || profile.birth_day || "",
    birth_month: section?.birth_month || profile.birth_month || "",
    birth_year: section?.birth_year || profile.birth_year || "",
  };
}

function validateDetailsSection(section, label, addIssue) {
  const requiredPersonalFields = [
    "family_name",
    "given_names",
    "gender",
    "birth_day",
    "birth_month",
    "birth_year",
    "marital_status",
  ];

  if (!rowHasFields(section, requiredPersonalFields)) {
    addIssue(`${label}: Personal details`);
  }

  if (
    hasText(section?.marital_status) &&
    section.marital_status !== "Never Married" &&
    !hasCompleteDate(section, [
      "marital_status_date_day",
      "marital_status_date_month",
      "marital_status_date_year",
    ])
  ) {
    addIssue(`${label}: Marital status date`);
  }

  if (!rowHasFields(section, ["country_of_birth", "city_of_birth", "state_of_birth"])) {
    addIssue(`${label}: Birthplace information`);
  }

  if (!hasAnswer(section?.citizenship_of_passport_country)) {
    addIssue(`${label}: Passport citizenship question`);
  }

  if (!hasAnswer(section?.citizenship_other_than_birth)) {
    addIssue(`${label}: Other citizenship question`);
  } else if (
    isYes(section.citizenship_other_than_birth) &&
    !allRowsHaveFields(section?.citizenships, ["country", "how_obtained"], (row) => {
      if (normalizeStatus(row?.still_citizen) === "no") {
        return rowHasFields(row, [
          "date_ceased_day",
          "date_ceased_month",
          "date_ceased_year",
          "reason_ceased",
        ]);
      }
      return true;
    })
  ) {
    addIssue(`${label}: Citizenship details`);
  }
}

function validateOtherNamesSection(section, label, addIssue, options = {}) {
  const {
    hasChineseCodeQuestion = false,
    hasRussianDescentQuestion = false,
    hasPreviousDobQuestion = false,
  } = options;

  if (!hasAnswer(section?.has_other_names)) {
    addIssue(`${label}: Other names question`);
  } else if (
    isYes(section.has_other_names) &&
    !allRowsHaveFields(section?.other_names, [
      "family_name",
      "given_names",
      "reason_for_change",
    ])
  ) {
    addIssue(`${label}: Other names details`);
  }

  if (hasChineseCodeQuestion && !hasAnswer(section?.use_chinese_code)) {
    addIssue(`${label}: Chinese Commercial Code question`);
  } else if (hasChineseCodeQuestion && isYes(section.use_chinese_code) && !hasText(section?.chinese_code)) {
    addIssue(`${label}: Chinese Commercial Code details`);
  }

  if (hasRussianDescentQuestion && !hasAnswer(section?.russian_descent)) {
    addIssue(`${label}: Russian descent question`);
  } else if (
    hasRussianDescentQuestion &&
    isYes(section.russian_descent) &&
    !rowHasFields(section, ["patronymic_family_name", "patronymic_given_names"])
  ) {
    addIssue(`${label}: Russian patronymic details`);
  }

  if (hasPreviousDobQuestion && !hasAnswer(section?.has_prev_dob)) {
    addIssue(`${label}: Previous date of birth question`);
  } else if (
    hasPreviousDobQuestion &&
    isYes(section.has_prev_dob) &&
    !allRowsHaveFields(section?.prev_dobs, ["date_of_birth"])
  ) {
    addIssue(`${label}: Previous date of birth details`);
  }
}

function validateContactSection(section, label, addIssue) {
  const residential = section?.residential_address || {};

  if (!hasText(section?.email)) {
    addIssue(`${label}: Email address`);
  }

  if (!hasText(section?.phone) && !hasText(section?.mobile)) {
    addIssue(`${label}: Contact phone number`);
  }

  if (!rowHasFields(section, ["emergency_contact_name", "emergency_contact_phone"])) {
    addIssue(`${label}: Emergency contact`);
  }

  if (!hasText(section?.usual_country_of_residence)) {
    addIssue(`${label}: Usual country of residence`);
  }

  if (
    !rowHasFields(residential, [
      "country",
      "address_line",
      "suburb",
      "state_territory",
      "postcode",
    ])
  ) {
    addIssue(`${label}: Residential address`);
  }
}

function validateEmploymentSection(section, label, visaContext, addIssue) {
  if (!hasAnswer(section?.is_currently_employed)) {
    addIssue(`${label}: Current employment question`);
  } else if (
    isYes(section.is_currently_employed) &&
    !rowHasFields(section, [
      "current_employer",
      "current_position",
      "current_country",
      "current_start_date_day",
      "current_start_date_month",
      "current_start_date_year",
      "current_employment_type",
      "current_address",
    ])
  ) {
    addIssue(`${label}: Current employment details`);
  }

  if (!isYes(section?.is_currently_employed) && !hasRows(section?.employment_history)) {
    addIssue(`${label}: Employment history`);
    return;
  }

  if (
    hasRows(section?.employment_history) &&
    !allRowsHaveFields(
      section.employment_history,
      ["date_from_day", "date_from_month", "date_from_year", "status", "country"],
      (row) => {
        const status = normalizeStatus(row?.status);
        if (EMPLOYED_STATUSES.has(status) && !rowHasFields(row, ["position", "employer"])) {
          return false;
        }
        if (visaContext === "186" && row?.country === "Australia" && !hasText(row?.visa_held)) {
          return false;
        }
        return true;
      }
    )
  ) {
    addIssue(`${label}: Employment history details`);
  }
}

function validateEducationSection(section, label, addIssue) {
  if (!hasAnswer(section?.has_secondary_education)) {
    addIssue(`${label}: Education question`);
  } else if (
    isYes(section.has_secondary_education) &&
    !allRowsHaveFields(section?.education_history, [
      "date_from_day",
      "date_from_month",
      "date_from_year",
      "qualification",
      "is_highest_qualification",
      "course_name",
      "course_language",
      "course_status",
      "institution",
      "country",
      "institution_address",
      "institution_suburb",
      "institution_state",
      "institution_postcode",
    ])
  ) {
    addIssue(`${label}: Education history details`);
  }
}

function validateSkillsSection(section, label, addIssue) {
  if (!hasAnswer(section?.has_occupational_registration)) {
    addIssue(`${label}: Occupational registration question`);
  } else if (
    isYes(section.has_occupational_registration) &&
    !allRowsHaveFields(section?.registrations, [
      "authority",
      "title",
      "licence_number",
      "english_requirement",
      "occupation",
      "country",
      "issue_date_day",
      "issue_date_month",
      "issue_date_year",
    ], (row) => {
      if (isYes(row?.english_requirement)) {
        return hasText(row?.english_requirement_details);
      }
      return true;
    })
  ) {
    addIssue(`${label}: Occupational registration details`);
  }

  if (!hasAnswer(section?.has_skills_assessment)) {
    addIssue(`${label}: Skills assessment question`);
  } else if (
    isYes(section.has_skills_assessment) &&
    !allRowsHaveFields(section?.assessments, [
      "assessing_authority",
      "assessment_type",
      "anzsco_code",
      "lodgement_date_day",
      "lodgement_date_month",
      "lodgement_date_year",
      "outcome",
    ], (row) => {
      if (normalizeStatus(row?.outcome) === "pending") return true;
      return hasCompleteDate(row, ["outcome_date_day", "outcome_date_month", "outcome_date_year"]);
    })
  ) {
    addIssue(`${label}: Skills assessment details`);
  }
}

function validateLanguageSection(section, label, addIssue) {
  if (!hasAnswer(section?.is_english_main_language)) {
    addIssue(`${label}: Main language question`);
  } else if (
    !isYes(section.is_english_main_language) &&
    !allRowsHaveFields(section?.languages, ["language", "proficiency", "is_main_language"])
  ) {
    addIssue(`${label}: Non-English main language details`);
  }

  if (!hasAnswer(section?.has_english_test)) {
    addIssue(`${label}: English test question`);
  } else if (
    isYes(section.has_english_test) &&
    !allRowsHaveFields(section?.english_tests, [
      "test_type",
      "date_day",
      "date_month",
      "date_year",
      "location",
      "reference_number",
      "overall_score",
    ])
  ) {
    addIssue(`${label}: English test details`);
  }

  if (!hasAnswer(section?.studied_in_english)) {
    addIssue(`${label}: English study question`);
  } else if (isYes(section.studied_in_english) && !hasText(section?.studied_in_english_details)) {
    addIssue(`${label}: English study details`);
  }
}

function validateIdentitySection(section, label, addIssue) {
  validateIdentityForVisa(section, "temporary-work").forEach((issue) => addIssue(`${label}: ${issue}`));
}

function hasBooleanAnswer(value) {
  return value === true || value === false || hasAnswer(value);
}

function isAffirmative(value) {
  return value === true || isYes(value);
}

function isNegative(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return value === false || normalized === "no";
}

function validateCustodySection(section, label, addIssue) {
  if (!hasBooleanAnswer(section?.under_18)) {
    addIssue(`${label}: Under 18 question`);
    return;
  }

  if (!isAffirmative(section?.under_18)) return;

  if (!section?.primary_custody || !hasBooleanAnswer(section.primary_custody.has)) {
    addIssue(`${label}: Primary custody question`);
  } else if (isNegative(section.primary_custody.has) && !hasText(section.primary_custody.details)) {
    addIssue(`${label}: Primary custody details`);
  }

  if (!section?.other_person_rights || !hasBooleanAnswer(section.other_person_rights.has)) {
    addIssue(`${label}: Other person rights question`);
  } else if (isAffirmative(section.other_person_rights.has) && !hasText(section.other_person_rights.details)) {
    addIssue(`${label}: Other person rights details`);
  }

  if (!section?.travel_impediments || !hasBooleanAnswer(section.travel_impediments.has)) {
    addIssue(`${label}: Travel impediments question`);
  } else if (isAffirmative(section.travel_impediments.has) && !hasText(section.travel_impediments.details)) {
    addIssue(`${label}: Travel impediments details`);
  }
}

function validateCountriesOfResidenceSection(section, draft, addIssue) {
  const records = Array.isArray(section?.residence_records) ? section.residence_records : [];
  const applicants = getResidenceApplicants(draft);
  const issues = getResidenceCoverageIssues(records, applicants);
  issues.forEach((issue) => addIssue(`All Applicants: Countries of Residence - ${issue}`));
}

function validateTravelHistorySection(section, addIssue) {
  if (!hasAnswer(section?.has_travel_history)) {
    addIssue("All Applicants: Travel history question");
    return;
  }

  if (!isYes(section.has_travel_history)) return;

  const rows = Array.isArray(section?.travel_history) ? section.travel_history : [];
  if (!hasRows(rows)) {
    addIssue("All Applicants: Travel history records");
    return;
  }

  const rowsComplete = rows.every((row) => {
    const applicantIds = Array.isArray(row?.applicant_ids) ? row.applicant_ids.filter(Boolean) : [];
    return (
      applicantIds.length > 0 &&
      rowHasFields(row, [
        "country",
        "reason_for_visit",
        "legal_status",
        "date_arrived_day",
        "date_arrived_month",
        "date_arrived_year",
      ])
    );
  });

  if (!rowsComplete) {
    addIssue("All Applicants: Travel history details");
  }
}

function validateTemporaryWorkProfileSection({ draft, visaContext, parsed, profileId, addIssue }) {
  const profile = getProfileForTemporaryWorkPage(draft, parsed, profileId);
  if (!profile?.relationship || !parsed?.sectionName) return false;

  const label = getProfileDisplayName(profile);
  const section = getTemporaryWorkSection(draft, profile, parsed.sectionName);

  switch (parsed.sectionName) {
    case "details":
      validateDetailsSection(section, label, addIssue);
      return true;
    case "other":
      validateOtherNamesSection(section, label, addIssue, {
        hasChineseCodeQuestion: profile.relationship === "spouse",
        hasRussianDescentQuestion: false,
        hasPreviousDobQuestion: false,
      });
      return true;
    case "identity":
      validateIdentitySection(section, label, addIssue);
      return true;
    case "contact_details":
      validateContactSection(section, label, addIssue);
      return true;
    case "employment":
      validateEmploymentSection(section, label, visaContext, addIssue);
      return true;
    case "education":
      validateEducationSection(section, label, addIssue);
      return true;
    case "skills":
      validateSkillsSection(section, label, addIssue);
      return true;
    case "language":
      validateLanguageSection(section, label, addIssue);
      return true;
    case "custody":
      validateCustodySection(section, label, addIssue);
      return true;
    default:
      return false;
  }
}

export function validateTemporaryWorkSectionCompletion({
  draft = {},
  visaContext = null,
  pageKey = "",
  profileId = null,
} = {}) {
  const strictContext = getStrictTemporaryWorkContext(visaContext, draft);
  const parsed = parseTemporaryWorkPageKey(pageKey);

  if (!strictContext || !parsed?.sectionName) {
    return { applicable: false, complete: true, issues: [] };
  }

  const issues = collectValidationIssues((addIssue) => {
    if (parsed.sectionName === "countries_of_residence") {
      validateCountriesOfResidenceSection(draft?.temporary_work_countries_of_residence || {}, draft, addIssue);
      return;
    }

    if (parsed.sectionName === "travel_history") {
      validateTravelHistorySection(draft?.temporary_work_travel || {}, addIssue);
      return;
    }

    validateTemporaryWorkProfileSection({
      draft,
      visaContext: strictContext,
      parsed,
      profileId: profileId || getProfileIdFromPageKey(pageKey),
      addIssue,
    });
  });

  return {
    applicable: true,
    complete: issues.length === 0,
    issues,
  };
}

function getTemporaryWorkValidationPageKeys(draft, visaContext) {
  const profiles = getSortedProfiles(draft?.profiles || []);
  const pageKeys = [];

  profiles.forEach((profile) => {
    if (!profile?.id) return;

    if (profile.relationship === "child") {
      TEMPORARY_WORK_CHILD_PROFILE_SUBPAGES.forEach((subpage) => {
        pageKeys.push(`temporary-work/children/${profile.id}/${subpage.pathSuffix}__${profile.id}`);
      });
      return;
    }

    const subpages =
      profile.relationship === "spouse"
        ? visaContext === "186"
          ? EMPLOYER_NOMINATION_SPOUSE_PROFILE_SUBPAGES
          : TEMPORARY_WORK_482_SPOUSE_PROFILE_SUBPAGES
        : PROFILE_SUBPAGES;

    subpages.forEach((subpage) => {
      const suffix = subpage.href.split(/\/(?:main-applicant|spouse-partner)\//)[1];
      const routePrefix = profile.relationship === "spouse" ? "spouse-partner" : "main-applicant";
      pageKeys.push(`temporary-work/${routePrefix}/${suffix}__${profile.id}`);
    });
  });

  pageKeys.push("temporary-work/all-applicants/countries-of-residence");

  return pageKeys;
}

function appendTemporaryWorkValidationIssues(items, draft, visaContext) {
  const itemSet = new Set(items);
  const addIssue = (label) => addValidationIssue(items, itemSet, label);

  getTemporaryWorkValidationPageKeys(draft, visaContext).forEach((pageKey) => {
    const result = validateTemporaryWorkSectionCompletion({ draft, visaContext, pageKey });
    if (!result.applicable || result.complete) return;
    result.issues.forEach(addIssue);
  });
}

function appendMainApplicantIdentityValidationIssues(items, draft, visaType) {
  const itemSet = new Set(items);
  const addIssue = (label) => addValidationIssue(items, itemSet, label);

  (draft?.profiles || [])
    .filter((profile) => profile?.relationship === "main_applicant")
    .forEach((profile) => {
      const raw = resolveIdentityDraftData(draft, visaType, profile.id);
      const section = normalizeIdentityForVisa(raw, visaType, profile);
      validateIdentityForVisa(section, visaType).forEach((issue) => {
        addIssue(`${getProfileDisplayName(profile)}: ${issue}`);
      });
    });
}

export function getIncompleteChecklist({
  visaType,
  visaContext = null,
  completionStatus = {},
  draft = {},
}) {
  const completion = completionStatus || {};
  const items = [];

  const addIncomplete = (key, label) => {
    if (!key || !label) return;
    const legacyPerMemberKey = /(?:^|\/)non-migrating\//.test(key)
      ? key.split("__")[0]
      : null;
    if (completion[key] === true) return;
    if (Object.prototype.hasOwnProperty.call(completion, key)) {
      items.push(label);
      return;
    }
    if (legacyPerMemberKey && completion[legacyPerMemberKey] === true) return;
    items.push(label);
  };

  if (visaType !== "temporary-work") {
    const routes = getIntakeRoutes(visaType, visaContext);

    routes.forEach((route) => {
      if (route.href.includes("/submit")) return;

      if (route.subpages?.length) {
        route.subpages.forEach((subpage) => {
          const key = normalizeKeyFromPath(subpage.href, visaType);
          addIncomplete(key, `${route.title}: ${subpage.title}`);
        });
        return;
      }

      const key = normalizeKeyFromPath(route.href, visaType);
      addIncomplete(key, route.title);
    });

    const nonMigratingPrefix = getNonMigratingCompletionPrefix(visaType);
    addIncomplete(nonMigratingPrefix, "Other Family");
    (draft?.non_migrating_members || []).forEach((member) => {
      const memberId = member?.id;
      if (!memberId) return;

      const name = [member?.passport?.given_names, member?.passport?.family_name]
        .filter(Boolean)
        .join(" ")
        .trim() || "Unnamed Member";

      NON_MIGRATING_MEMBER_SUBPAGES.forEach((subpage) => {
        const key = `${nonMigratingPrefix}/${memberId}/${subpage.pathSuffix}__${memberId}`;
        addIncomplete(key, `Other Family (${name}): ${subpage.title}`);
      });
    });

    if (visaType === "partner" || visaType === "protection") {
      appendMainApplicantIdentityValidationIssues(items, draft, visaType);
    }

    return items;
  }

  addIncomplete("temporary-work/start", "Getting Started");
  addIncomplete("temporary-work/profile", "Included Applicants");

  const profiles = getSortedProfiles(draft?.profiles || []);

  profiles.forEach((profile) => {
    const profileId = profile?.id;
    if (!profileId) return;

    const profileLabel = getProfileDisplayName(profile);

    if (profile.relationship === "child") {
      TEMPORARY_WORK_CHILD_PROFILE_SUBPAGES.forEach((subpage) => {
        const key = `temporary-work/children/${profileId}/${subpage.pathSuffix}__${profileId}`;
        addIncomplete(key, `${profileLabel}: ${subpage.title}`);
      });
      return;
    }

    const subpages =
      profile.relationship === "spouse"
        ? visaContext === "186"
          ? EMPLOYER_NOMINATION_SPOUSE_PROFILE_SUBPAGES
          : TEMPORARY_WORK_482_SPOUSE_PROFILE_SUBPAGES
        : PROFILE_SUBPAGES;

    subpages.forEach((subpage) => {
      const suffix = subpage.href.split(/\/(?:main-applicant|spouse-partner)\//)[1];
      const routePrefix = profile.relationship === "spouse" ? "spouse-partner" : "main-applicant";
      const key = `temporary-work/${routePrefix}/${suffix}__${profileId}`;

      addIncomplete(key, `${profileLabel}: ${subpage.title}`);

      if (profile.relationship === "main_applicant" && subpage.title === "Contact Details") {
        addIncomplete("temporary-work/non-migrating", "Other Family");
      }
    });
  });

  (draft?.non_migrating_members || []).forEach((member) => {
    const memberId = member?.id;
    if (!memberId) return;

    const name = [member?.passport?.given_names, member?.passport?.family_name]
      .filter(Boolean)
      .join(" ")
      .trim() || "Unnamed Member";

    NON_MIGRATING_MEMBER_SUBPAGES.forEach((subpage) => {
      const key = `temporary-work/non-migrating/${memberId}/${subpage.pathSuffix}__${memberId}`;
      addIncomplete(key, `Other Family (${name}): ${subpage.title}`);
    });
  });

  const allApplicantsRoute = getIntakeRoutes("temporary-work", visaContext).find(
    (route) => route.title === "All Applicants"
  );

  allApplicantsRoute?.subpages?.forEach((subpage) => {
    const key = normalizeKeyFromPath(subpage.href, "temporary-work");
    addIncomplete(key, `All Applicants: ${subpage.title}`);
  });

  appendTemporaryWorkValidationIssues(items, draft, visaContext);

  return items;
}
