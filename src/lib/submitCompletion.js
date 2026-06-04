import {
  EMPLOYER_NOMINATION_SPOUSE_PROFILE_SUBPAGES,
  NON_MIGRATING_MEMBER_SUBPAGES,
  PROFILE_SUBPAGES,
  TEMPORARY_WORK_482_SPOUSE_PROFILE_SUBPAGES,
  TEMPORARY_WORK_CHILD_PROFILE_SUBPAGES,
  getIntakeRoutes,
} from "@/lib/routes";

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

  if (!rowHasFields(section, ["country_of_birth", "city_of_birth"])) {
    addIssue(`${label}: Birthplace information`);
  }

  if (!hasAnswer(section?.citizenship_other_than_birth)) {
    addIssue(`${label}: Citizenship question`);
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

function appendTemporaryWorkValidationIssues(items, draft, visaContext) {
  const itemSet = new Set(items);
  const addIssue = (label) => addValidationIssue(items, itemSet, label);
  const profiles = getSortedProfiles(draft?.profiles || []);

  profiles.forEach((profile) => {
    if (!profile?.id) return;

    const label = getProfileDisplayName(profile);

    validateDetailsSection(getTemporaryWorkSection(draft, profile, "details"), label, addIssue);
    validateOtherNamesSection(
      getTemporaryWorkSection(draft, profile, "other"),
      label,
      addIssue,
      {
        hasChineseCodeQuestion: profile.relationship === "spouse",
        hasRussianDescentQuestion: false,
        hasPreviousDobQuestion: false,
      }
    );

    if (profile.relationship === "main_applicant") {
      validateContactSection(getTemporaryWorkSection(draft, profile, "contact_details"), label, addIssue);
      validateEmploymentSection(getTemporaryWorkSection(draft, profile, "employment"), label, visaContext, addIssue);
      validateEducationSection(getTemporaryWorkSection(draft, profile, "education"), label, addIssue);
      validateSkillsSection(getTemporaryWorkSection(draft, profile, "skills"), label, addIssue);
      validateLanguageSection(getTemporaryWorkSection(draft, profile, "language"), label, addIssue);
    }

    if (profile.relationship === "spouse" && visaContext === "186") {
      validateLanguageSection(getTemporaryWorkSection(draft, profile, "language"), label, addIssue);
    }
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
    const legacyPerMemberKey = key.startsWith("temporary-work/non-migrating/")
      ? key.split("__")[0]
      : null;
    if (completion[key] === true) return;
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

      if (
        visaContext === "186" &&
        profile.relationship === "main_applicant" &&
        subpage.title === "Contact Details"
      ) {
        addIncomplete("temporary-work/non-migrating", "Other Family");
      }
    });
  });

  if (visaContext === "186") {
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
  }

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
