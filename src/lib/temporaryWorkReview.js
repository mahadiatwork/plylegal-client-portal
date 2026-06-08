import {
  buildIntakeHref,
  EMPLOYER_NOMINATION_SPOUSE_PROFILE_SUBPAGES,
  NON_MIGRATING_MEMBER_SUBPAGES,
  PROFILE_SUBPAGES,
  TEMPORARY_WORK_482_SPOUSE_PROFILE_SUBPAGES,
  TEMPORARY_WORK_CHILD_PROFILE_SUBPAGES,
} from "@/lib/routes";

const PROFILE_RELATIONSHIP_ORDER = {
  main_applicant: 0,
  spouse: 1,
  child: 2,
  other: 3,
};

const RELATIONSHIP_LABELS = {
  main_applicant: "Main Applicant",
  spouse: "Spouse/Partner",
  child: "Child",
  other: "Dependent",
  partner: "Partner",
  other_dependent: "Other Dependent",
  de_facto: "De Facto",
  never_married: "Never Married",
};

const LEGACY_PROFILE_SECTION_KEYS = {
  main_applicant: {
    details: "temporary_work_details",
    other: "temporary_work_other",
    identity: "temporary_work_identity",
    contact_details: "temporary_work_contact_details",
    employment: "temporary_work_employment",
    education: "temporary_work_education",
    skills: "temporary_work_skills",
    language: "temporary_work_language",
  },
  spouse: {
    details: "temporary_work_spouse_details",
    other: "temporary_work_spouse_other",
    identity: "temporary_work_spouse_identity",
    education: "temporary_work_spouse_education",
    language: "temporary_work_spouse_language",
  },
};

const SHARED_SECTIONS = [
  {
    key: "temporary_work_visas",
    title: "All Applicants - Visas",
    href: "/intake/temporary-work/all-applicants/visas",
  },
  {
    key: "temporary_work_travel",
    title: "All Applicants - Travel History",
    href: "/intake/temporary-work/all-applicants/travel-history",
  },
  {
    key: "temporary_work_countries_of_residence",
    title: "All Applicants - Countries of Residence",
    href: "/intake/temporary-work/all-applicants/countries-of-residence",
  },
  {
    key: "temporary_work_health",
    title: "All Applicants - Health",
    href: "/intake/temporary-work/all-applicants/health",
  },
  {
    key: "temporary_work_character",
    title: "All Applicants - Character",
    href: "/intake/temporary-work/all-applicants/character",
  },
];

const FIELD_LABELS = {
  applicant_id: "Applicant",
  applicant_ids: "Applicants",
  applicant_name: "Applicant",
  birth_day: "Birth day",
  birth_month: "Birth month",
  birth_year: "Birth year",
  citizenship_other_than_birth: "Do you hold citizenship in any country other than your country of birth?",
  country_of_birth: "Country of birth",
  current_address: "Current address",
  current_country: "Current country",
  current_employer: "Current employer",
  current_employment_type: "Current employment type",
  current_position: "Current position",
  date_from_day: "From day",
  date_from_month: "From month",
  date_from_year: "From year",
  date_to_day: "To day",
  date_to_month: "To month",
  date_to_year: "To year",
  dob_day: "Birth day",
  dob_month: "Birth month",
  dob_year: "Birth year",
  family_name: "Family name",
  given_names: "Given names",
  has_current_passport: "Does this person have a current passport?",
  has_english_test: "Has the applicant taken an English language test?",
  has_health_examinations: "Has any applicant completed health examinations?",
  has_national_identity_card: "Does this person have a national identity card?",
  has_occupational_registration: "Does the applicant hold occupational registrations, licences or memberships?",
  has_other_identity_documents: "Does this person have any other identity documents?",
  has_other_names: "Have you ever had or been known by any other name?",
  has_secondary_education: "Have you completed post-secondary education?",
  has_skills_assessment: "Has a skills assessment been completed?",
  is_currently_employed: "Are you currently employed?",
  is_english_main_language: "Is English your main language?",
  marital_status: "Marital status",
  passport: "Passport",
  passport_family_name: "Passport family name",
  passport_given_names: "Passport given names",
  passport_sex: "Sex on passport",
  place_of_birth: "Place of birth",
  requires_health_examination: "Does this person require a health examination?",
  studied_in_english: "Have you studied in English?",
  studied_in_english_details: "English study details",
  use_chinese_code: "Do you use a Chinese Commercial Code for your name?",
  visa_grant_number: "Australian visa grant number",
};

const INTERNAL_KEYS = new Set([
  "__typename",
  "createdAt",
  "id",
  "matterDocumentId",
  "updatedAt",
  "userId",
  "visaContext",
  "zohoDependentId",
  "zohoLastSyncedAt",
  "zohoSyncError",
  "zohoSyncStatus",
]);

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function firstTextValue(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function toTitleCase(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatDateParts(day, month, year) {
  return [day, month, year].map(firstTextValue).filter(Boolean).join(" ");
}

function getProfileName(profile) {
  return [profile?.given_names, profile?.family_name].map(firstTextValue).filter(Boolean).join(" ").trim();
}

function getProfileDisplayName(profile) {
  return getProfileName(profile) || "Unnamed applicant";
}

function getRelationshipLabel(value) {
  return RELATIONSHIP_LABELS[value] || toTitleCase(value || "Dependent");
}

function getSortedProfiles(profiles) {
  return [...(profiles || [])].sort(
    (a, b) => (PROFILE_RELATIONSHIP_ORDER[a?.relationship] ?? 4) - (PROFILE_RELATIONSHIP_ORDER[b?.relationship] ?? 4)
  );
}

function hasOwnMeaningfulValue(value) {
  if (typeof value === "string") return value.trim() !== "";
  if (typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.some(hasOwnMeaningfulValue);
  if (isPlainObject(value)) {
    return Object.entries(value).some(([key, nestedValue]) => !INTERNAL_KEYS.has(key) && hasOwnMeaningfulValue(nestedValue));
  }
  return value !== null && value !== undefined;
}

export function hasReviewValue(value) {
  return hasOwnMeaningfulValue(value);
}

export function formatReviewLabel(key) {
  const normalizedKey = String(key || "");
  if (FIELD_LABELS[normalizedKey]) return FIELD_LABELS[normalizedKey];
  return toTitleCase(normalizedKey);
}

export function formatReviewValue(value) {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (value === null || value === undefined) return "";

  const text = String(value).trim();
  if (!text) return "";

  const lower = text.toLowerCase();
  if (lower === "yes") return "Yes";
  if (lower === "no") return "No";
  if (RELATIONSHIP_LABELS[lower]) return RELATIONSHIP_LABELS[lower];
  if (/^[a-z][a-z_-]*$/.test(text)) return toTitleCase(text);
  if (/^[a-z0-9]+(?:[_-][a-z0-9]+)+$/i.test(text)) return toTitleCase(text);
  return text;
}

function buildHref({ appId, slug, visaContext, internalHref, profileId }) {
  return buildIntakeHref({
    appId,
    slug,
    internalHref,
    profileId,
    visaType: "temporary-work",
    visaContext,
  });
}

function getProfilesFromLegacyDraft(draft) {
  const profiles = [];

  if (hasReviewValue(draft?.temporary_work_details)) {
    const details = draft.temporary_work_details;
    profiles.push({
      id: "legacy-main-applicant",
      relationship: "main_applicant",
      family_name: details.family_name,
      given_names: details.given_names,
      gender: details.gender,
      birth_day: details.birth_day,
      birth_month: details.birth_month,
      birth_year: details.birth_year,
    });
  }

  if (hasReviewValue(draft?.temporary_work_spouse_details)) {
    const details = draft.temporary_work_spouse_details;
    profiles.push({
      id: "legacy-spouse",
      relationship: "spouse",
      family_name: details.family_name,
      given_names: details.given_names,
      gender: details.gender,
      birth_day: details.birth_day,
      birth_month: details.birth_month,
      birth_year: details.birth_year,
    });
  }

  return profiles;
}

function getProfilesForReview(draft) {
  if (Array.isArray(draft?.profiles) && draft.profiles.length > 0) {
    return getSortedProfiles(draft.profiles);
  }
  return getSortedProfiles(getProfilesFromLegacyDraft(draft));
}

function buildApplicantNameMap(profiles) {
  return new Map(
    (profiles || []).map((profile) => [String(profile.id), getProfileDisplayName(profile)])
  );
}

function getSectionKeyFromHref(href) {
  const suffix = String(href || "").split("/").pop();
  if (suffix === "other-details") return "other";
  if (suffix === "contact-details") return "contact_details";
  return suffix ? suffix.replace(/-/g, "_") : "";
}

function getSubpagesForProfile(profile, visaContext) {
  if (profile.relationship === "child") {
    return TEMPORARY_WORK_CHILD_PROFILE_SUBPAGES.map((subpage) => ({
      title: subpage.title,
      sectionKey: subpage.pathSuffix === "other" ? "other" : subpage.pathSuffix,
      href: `/intake/temporary-work/children/${profile.id}/${subpage.pathSuffix}`,
      profileId: profile.id,
    }));
  }

  const subpages =
    profile.relationship === "spouse"
      ? visaContext === "186"
        ? EMPLOYER_NOMINATION_SPOUSE_PROFILE_SUBPAGES
        : TEMPORARY_WORK_482_SPOUSE_PROFILE_SUBPAGES
      : PROFILE_SUBPAGES;

  return subpages.map((subpage) => ({
    title: subpage.title,
    sectionKey: getSectionKeyFromHref(subpage.href),
    href: subpage.href,
    profileId: profile.id?.startsWith?.("legacy-") ? null : profile.id,
  }));
}

function fillMissingProfileDetails(data, profile) {
  const merged = { ...(data || {}) };
  const defaults = {
    family_name: profile?.family_name,
    given_names: profile?.given_names,
    gender: profile?.gender,
    birth_day: profile?.birth_day,
    birth_month: profile?.birth_month,
    birth_year: profile?.birth_year,
  };

  Object.entries(defaults).forEach(([key, value]) => {
    if (!hasReviewValue(merged[key]) && hasReviewValue(value)) {
      merged[key] = value;
    }
  });

  return merged;
}

function getProfileSectionData(draft, profile, sectionKey) {
  const profileData = draft?.profiles_data?.[profile?.id]?.[sectionKey];
  const legacyKey = LEGACY_PROFILE_SECTION_KEYS[profile?.relationship]?.[sectionKey];
  const legacyData = legacyKey ? draft?.[legacyKey] : undefined;
  const sectionData = hasReviewValue(profileData) ? profileData : legacyData;

  if (sectionKey === "details") {
    return fillMissingProfileDetails(clone(sectionData) || {}, profile);
  }

  return clone(sectionData) || {};
}

function normalizeReviewData(value, context) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeReviewData(item, context)).filter(hasReviewValue);
  }

  if (!isPlainObject(value)) return value;

  return Object.entries(value).reduce((next, [key, nestedValue]) => {
    if (INTERNAL_KEYS.has(key)) return next;

    if (key === "applicant_ids" && Array.isArray(nestedValue)) {
      next[key] = nestedValue
        .map((id) => context.applicantNamesById.get(String(id)) || id)
        .filter(hasReviewValue);
      return next;
    }

    if (key === "applicantId" || key === "applicant_id") {
      next[key] = context.applicantNamesById.get(String(nestedValue)) || nestedValue;
      return next;
    }

    const normalizedValue = normalizeReviewData(nestedValue, context);
    if (hasReviewValue(normalizedValue)) {
      next[key] = normalizedValue;
    }

    return next;
  }, {});
}

function buildItemsFromObject(data, context) {
  const normalizedData = normalizeReviewData(data || {}, context);

  return Object.entries(normalizedData)
    .filter(([key, value]) => !INTERNAL_KEYS.has(key) && hasReviewValue(value))
    .map(([key, value]) => ({
      label: formatReviewLabel(key),
      value,
    }));
}

function buildApplicantRosterSection(profiles, options) {
  if (!Array.isArray(profiles) || profiles.length === 0) return null;

  const applicants = profiles.map((profile, index) => ({
    applicant: `Applicant ${index + 1}`,
    relationship: getRelationshipLabel(profile.relationship),
    name: getProfileDisplayName(profile),
    gender: profile.gender,
    date_of_birth: formatDateParts(profile.birth_day, profile.birth_month, profile.birth_year),
    country_of_birth: profile.country_of_birth,
  }));

  return {
    id: "included-applicants",
    title: "Included Applicants",
    editHref: buildHref({
      ...options,
      internalHref: "/intake/temporary-work/profile",
    }),
    items: [{ label: "Applicants", value: applicants }],
  };
}

function getNonMigratingDisplayName(member) {
  return [member?.passport?.given_names, member?.passport?.family_name]
    .map(firstTextValue)
    .filter(Boolean)
    .join(" ")
    .trim() || "Unnamed family member";
}

function getNonMigratingSubpageData(member, pathSuffix) {
  if (pathSuffix === "details") {
    return {
      relationship: member.relationship,
      relationship_status: member.relationship_status,
      family_name: member.passport?.family_name,
      given_names: member.passport?.given_names,
      sex: member.passport?.sex,
      date_of_birth: formatDateParts(member.passport?.dob_day, member.passport?.dob_month, member.passport?.dob_year),
      place_of_birth: member.place_of_birth,
    };
  }

  if (pathSuffix === "passport") {
    return {
      has_current_passport: member.has_current_passport,
      passport: member.passport,
    };
  }

  if (pathSuffix === "identity") {
    return {
      has_national_identity_card: member.has_national_identity_card,
      has_other_identity_documents: member.has_other_identity_documents,
    };
  }

  if (pathSuffix === "other-names") {
    return {
      other_names: member.other_names,
    };
  }

  if (pathSuffix === "citizenship") {
    return {
      citizenship: member.citizenship,
    };
  }

  if (pathSuffix === "health") {
    return {
      requires_health_examination: member.requires_health_examination,
    };
  }

  return {};
}

function buildNonMigratingSections(draft, context, options) {
  if (options.visaContext !== "186") return [];

  const members = Array.isArray(draft?.non_migrating_members) ? draft.non_migrating_members : [];
  if (members.length === 0) return [];

  const indexSection = {
    id: "other-family",
    title: "Other Family",
    editHref: buildHref({
      ...options,
      internalHref: "/intake/temporary-work/non-migrating",
    }),
    items: [
      {
        label: "Other family members",
        value: members.map((member) => ({
          relationship: member.relationship,
          name: getNonMigratingDisplayName(member),
          has_current_passport: member.has_current_passport,
        })),
      },
    ],
  };

  const memberSections = members.flatMap((member, memberIndex) =>
    NON_MIGRATING_MEMBER_SUBPAGES.map((subpage) => {
      const items = buildItemsFromObject(getNonMigratingSubpageData(member, subpage.pathSuffix), context);
      if (items.length === 0) return null;

      return {
        id: `other-family-${slugify(member.id)}-${slugify(subpage.pathSuffix)}`,
        title: `Other Family ${memberIndex + 1} - ${subpage.title}`,
        subtitle: getNonMigratingDisplayName(member),
        editHref: buildHref({
          ...options,
          internalHref: `/intake/temporary-work/non-migrating/${member.id}/${subpage.pathSuffix}`,
        }),
        items,
      };
    }).filter(Boolean)
  );

  return [indexSection, ...memberSections];
}

export function buildTemporaryWorkReviewSections({
  draft = {},
  visaContext = null,
  appId = null,
  slug = null,
} = {}) {
  const effectiveVisaContext = visaContext || draft?.visaContext || "482";
  const options = {
    appId,
    slug: slug || (effectiveVisaContext === "186" ? "186" : "482"),
    visaContext: effectiveVisaContext,
  };
  const profiles = getProfilesForReview(draft);
  const context = {
    applicantNamesById: buildApplicantNameMap(profiles),
  };
  const sections = [];

  const rosterSection = buildApplicantRosterSection(profiles, options);
  if (rosterSection) sections.push(rosterSection);

  profiles.forEach((profile, profileIndex) => {
    getSubpagesForProfile(profile, effectiveVisaContext).forEach((subpage) => {
      const items = buildItemsFromObject(getProfileSectionData(draft, profile, subpage.sectionKey), context);
      if (items.length === 0) return;

      sections.push({
        id: `profile-${slugify(profile.id)}-${slugify(subpage.sectionKey)}`,
        title: `Applicant ${profileIndex + 1} (${getRelationshipLabel(profile.relationship)}) - ${subpage.title}`,
        subtitle: getProfileDisplayName(profile),
        editHref: buildHref({
          ...options,
          internalHref: subpage.href,
          profileId: subpage.profileId,
        }),
        items,
      });
    });
  });

  sections.push(...buildNonMigratingSections(draft, context, options));

  SHARED_SECTIONS.forEach((section) => {
    const items = buildItemsFromObject(draft?.[section.key], context);
    if (items.length === 0) return;

    sections.push({
      id: slugify(section.title),
      title: section.title,
      editHref: buildHref({
        ...options,
        internalHref: section.href,
      }),
      items,
    });
  });

  return sections;
}
