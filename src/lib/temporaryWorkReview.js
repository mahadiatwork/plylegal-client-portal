import {
  buildIntakeHref,
  CHARACTER_QUESTIONS as LEGACY_CHARACTER_QUESTIONS,
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

const TEMPORARY_WORK_CHARACTER_QUESTIONS = [
  {
    key: "char_q01",
    label: "Has any applicant ever been charged with any offence that is currently awaiting legal action?",
  },
  {
    key: "char_q02",
    label:
      "Has any applicant ever been convicted of an offence in any country (including any conviction which is now removed from official records)?",
  },
  {
    key: "char_q03",
    label:
      "Has any applicant ever been the subject of a domestic violence or family violence order, or any other order, of a tribunal or court or other similar authority, for the personal protection of another person?",
  },
  {
    key: "char_q04",
    label: "Has any applicant ever been the subject of an arrest warrant or Interpol notice?",
  },
  {
    key: "char_q05",
    label:
      "Has any applicant ever been found guilty of a sexually based offence involving a child (including where no conviction was recorded)?",
  },
  {
    key: "char_q06",
    label: "Has any applicant ever been named on a sex offender register?",
  },
  {
    key: "char_q07",
    label:
      "Has any applicant ever been acquitted of any offence on the grounds of unsoundness of mind or insanity?",
  },
  {
    key: "char_q08",
    label: "Has any applicant ever been found by a court not fit to plead?",
  },
  {
    key: "char_q09",
    label:
      "Has any applicant ever been directly or indirectly involved in, or associated with, activities which would represent a risk to national security in Australia or any other country?",
  },
  {
    key: "char_q10",
    label:
      "Has any applicant ever been charged with, or indicted for: genocide, war crimes, crimes against humanity, torture, slavery, or any other crime that is otherwise of a serious international concern?",
  },
  {
    key: "char_q11",
    label:
      "Has any applicant ever been associated with a person, group or organisation that has been or is involved in criminal conduct?",
  },
  {
    key: "char_q12",
    label:
      "Has any applicant ever been associated with an organisation engaged in violence or engaged in acts of violence (including war, insurgency, freedom fighting, terrorism, protest) either overseas or in Australia?",
  },
  {
    key: "char_q13",
    label:
      "Has any applicant ever served in a military force, police force, state sponsored / private militia or intelligence agency (including secret police)?",
  },
  {
    key: "char_q14",
    label:
      "Has any applicant ever undergone any military/paramilitary training, been trained in weapons/explosives or in the manufacture of chemical/biological products?",
  },
  {
    key: "char_q15",
    label: "Has any applicant ever been involved in people smuggling or people trafficking offences?",
  },
  {
    key: "char_q16",
    label: "Has any applicant ever been removed, deported or excluded from any country (including Australia)?",
  },
  {
    key: "char_q17",
    label: "Has any applicant ever overstayed a visa in any country (including Australia)?",
  },
  {
    key: "char_q18",
    label:
      "Has any applicant ever had any outstanding debts to the Australian Government or any public authority in Australia?",
  },
];

const CHARACTER_QUESTION_LABELS = {
  ...Object.fromEntries(LEGACY_CHARACTER_QUESTIONS.map((item) => [item.slug, item.question])),
  ...Object.fromEntries(TEMPORARY_WORK_CHARACTER_QUESTIONS.map((item) => [item.key, item.label])),
};

const DATE_PART_GROUPS = [
  { key: "date_of_birth", parts: ["birth_day", "birth_month", "birth_year"] },
  { key: "date_of_birth", parts: ["dob_day", "dob_month", "dob_year"] },
  { key: "completing_date_of_birth", parts: ["completing_birth_day", "completing_birth_month", "completing_birth_year"] },
  { key: "passport_date_of_birth", parts: ["passport_dob_day", "passport_dob_month", "passport_dob_year"] },
  { key: "marital_status_date", parts: ["marital_status_date_day", "marital_status_date_month", "marital_status_date_year"] },
  { key: "date_obtained", parts: ["date_obtained_day", "date_obtained_month", "date_obtained_year"] },
  { key: "date_ceased", parts: ["date_ceased_day", "date_ceased_month", "date_ceased_year"] },
  { key: "date_from", parts: ["date_from_day", "date_from_month", "date_from_year"] },
  { key: "date_to", parts: ["date_to_day", "date_to_month", "date_to_year"] },
  { key: "current_start_date", parts: ["current_start_date_day", "current_start_date_month", "current_start_date_year"] },
  { key: "application_date", parts: ["application_date_day", "application_date_month", "application_date_year"] },
  { key: "date_granted", parts: ["date_granted_day", "date_granted_month", "date_granted_year"] },
  { key: "expiry_date", parts: ["expiry_date_day", "expiry_date_month", "expiry_date_year"] },
  { key: "decision_date", parts: ["decision_date_day", "decision_date_month", "decision_date_year"] },
  { key: "date_issued", parts: ["date_issued_day", "date_issued_month", "date_issued_year"] },
  { key: "date_expiry", parts: ["date_expiry_day", "date_expiry_month", "date_expiry_year"] },
  { key: "original_issue_date", parts: ["original_date_day", "original_date_month", "original_date_year"] },
  { key: "document_issue_date", parts: ["document_issue_day", "document_issue_month", "document_issue_year"] },
  { key: "issue_date", parts: ["issue_date_day", "issue_date_month", "issue_date_year"] },
  { key: "lodgement_date", parts: ["lodgement_date_day", "lodgement_date_month", "lodgement_date_year"] },
  { key: "outcome_date", parts: ["outcome_date_day", "outcome_date_month", "outcome_date_year"] },
  { key: "test_date", parts: ["date_day", "date_month", "date_year"] },
  { key: "date_completed", parts: ["date_completed_day", "date_completed_month", "date_completed_year"] },
  { key: "date_arrived", parts: ["date_arrived_day", "date_arrived_month", "date_arrived_year"] },
  { key: "departure_date", parts: ["departure_day", "departure_month", "departure_year"] },
  { key: "first_met_date", parts: ["first_met_day", "first_met_month", "first_met_year"] },
  { key: "marriage_date", parts: ["marriage_day", "marriage_month", "marriage_year"] },
  { key: "separation_date", parts: ["separation_day", "separation_month", "separation_year"] },
];

const DATE_GROUP_BY_PART = new Map(
  DATE_PART_GROUPS.flatMap((group) => group.parts.map((part) => [part, group]))
);

const FIELD_LABELS = {
  address: "Address",
  address_history: "Address history",
  address_line: "Address (including street number and name)",
  address1: "Address",
  address2: "Address line 2",
  aged_care_work_details: "Aged care or disability care details",
  applicant_id: "Applicant",
  applicantId: "Applicant",
  applicant_ids: "Applicants",
  applicant_name: "Applicant",
  applicant: "Applicant",
  application_date: "Application date",
  application_reference_number: "Application reference number (TRN)",
  assessments: "Skills assessments",
  assessing_authority: "Name of skills assessing authority",
  authority: "Name of authority granting licence, registration or membership",
  all_same_address: "Does every applicant currently live at the same residential address?",
  anzsco_code: "ANZSCO code",
  birth_day: "Date of birth",
  birth_month: "Date of birth month",
  birth_year: "Date of birth year",
  cancelled: "Has this visa ever been cancelled?",
  childcare_work_details: "Child care centre details",
  chinese_code: "Chinese Commercial Code",
  citizenship: "Citizenship",
  citizenship_countries: "Countries of citizenship",
  citizenship_has_other: "Does this person hold citizenship of any other country?",
  citizenship_of_passport_country: "Is this applicant a citizen of their country of passport?",
  citizenship_other_than_birth: "Is this applicant a citizen of any other country?",
  citizenships: "Citizenships",
  city: "City or town",
  city_of_birth: "City or town of birth",
  classroom_work_details: "Classroom details",
  condition: "Condition",
  close_contact_tb: "Has any applicant been in close contact with active tuberculosis?",
  completing_birth_day: "Date of birth",
  completing_birth_month: "Date of birth month",
  completing_birth_year: "Date of birth year",
  completing_date_of_birth: "Date of birth of person completing this questionnaire",
  completing_family_name: "Family name of person completing this questionnaire",
  completing_gender: "Gender of person completing this questionnaire",
  completing_given_names: "Given names of person completing this questionnaire",
  completing_preferred_names: "Preferred names of person completing this questionnaire",
  country: "Country",
  country_of_birth: "Country of birth",
  country_of_exam: "Country of examination",
  country_of_issue: "Country of issue",
  course_language: "Course language",
  course_name: "Course name or research description",
  course_status: "Course status",
  current_start_date: "Date started",
  current_address: "Current address",
  current_country: "Current country",
  current_employer: "Current employer",
  current_employment_type: "Current employment type",
  current_position: "Current position",
  custody_order_details: "Custody arrangement details",
  date_arrived: "Date arrived",
  date_completed: "Date completed",
  date_expiry: "Date of expiry",
  date_from: "Date from",
  date_granted: "Date granted",
  date_issued: "Date of issue",
  date_ceased: "Date ceased",
  date_of_birth: "Date of birth",
  date_obtained: "Date obtained",
  date_to: "Date to",
  decision_date: "Decision date",
  decision_details: "Enter details",
  departure_date: "Departure date",
  details: "Give details",
  dob_day: "Date of birth",
  dob_month: "Date of birth month",
  dob_year: "Date of birth year",
  document_issue_date: "Date of document issue",
  document_number: "Passport/document number",
  document_reference_number: "Document reference number",
  document_status: "Document status",
  document_type: "Type of document",
  duties: "Duties",
  education_history: "Education history",
  email: "Email address",
  emergency_contact_name: "Emergency contact name",
  emergency_contact_phone: "Emergency contact phone number",
  employer: "Employer/organisation name",
  employment_history: "Employment history",
  english_requirement: "Does this licence, registration or membership require English language ability?",
  english_requirement_details: "Enter details of the language requirement",
  english_tests: "English test results",
  evidence_type: "Evidence type",
  expiry_date: "Expiry date",
  family_name: "Family name",
  first_met_date: "When did you and your spouse/partner first meet in person?",
  given_names: "Given names",
  gender: "Gender",
  grantNumber: "Australian visa grant number",
  had_tuberculosis:
    "Has any applicant ever had tuberculosis, been in close contact with active tuberculosis, or had an abnormal chest x-ray?",
  hap_id: "HAP ID",
  has_australian_visa_grant_number: "Do any applicants have an Australian visa grant number?",
  has_current_passport: "Does this person have a current passport?",
  has_children: "Do you or your spouse/partner have any children, step-children or adopted children to be included in this application?",
  has_english_test: "Have you undertaken any English language test within the last 36 months?",
  has_evidence: "Do you have identity documents for this name?",
  has_health_examinations:
    "Has any applicant undertaken a health examination for an Australian visa in the past 12 months?",
  has_aus_visa_history: "Has any applicant applied for or held an Australian visa?",
  has_national_id: "Does this person have a national identity card?",
  has_national_identity_card: "Does this person have a national identity card?",
  has_occupational_registration:
    "Does the applicant hold occupational registrations, licences or professional memberships?",
  has_other_identity_documents: "Does this person have any other identity documents?",
  has_other_names:
    "Have you ever had or been known by any other name or alias, or had a different name spelling?",
  has_passport: "Does this person have a passport or travel document?",
  has_prev_dob: "Have you previously had a different date of birth?",
  has_secondary_education:
    "Have you ever undertaken or enrolled in any studies or training at secondary level or above?",
  has_skills_assessment: "Has a skills assessment been completed?",
  has_sole_custody: "Is this child in the primary applicant's care and legal custody?",
  has_travel_history: "Has any applicant travelled outside their country of passport in the last 10 years?",
  health_conditions_details: "Medical condition details",
  health_conditions_list: "Medical conditions",
  health_examinations: "Health examinations",
  health_insurance: "Does any applicant hold health insurance?",
  health_insurance_details: "Health insurance details",
  healthcare_work_details: "Health care work details",
  hospital_details: "Hospital or health care facility details",
  how_obtained: "How was this citizenship obtained?",
  history: "Visa application or visa history",
  identification_number: "Identification number",
  included_in_application: "Will this child be included in the application?",
  institution: "Institution name",
  institution_address: "Institution address",
  institution_postcode: "Institution postcode",
  institution_state: "Institution state",
  institution_suburb: "Institution suburb / town / city",
  intends_aged_care: "Does any applicant intend to work, study or train within aged care or disability care while in Australia?",
  intends_childcare:
    "Does any applicant intend to work or be a trainee at a child care centre while in Australia?",
  intends_classroom:
    "Does any applicant intend to be in a classroom situation for more than 3 months?",
  intends_healthcare_work:
    "Does any applicant intend to work as, study or train to be a health care worker, or work within a health care facility while in Australia?",
  intends_hospital_entry:
    "Does any applicant intend to enter a hospital or health care facility while in Australia?",
  is_current_employment: "Is this your current employment?",
  is_currently_employed: "Are you currently employed in a paid position?",
  is_english_main_language: "Is the English language your main language?",
  is_highest_qualification: "Is this your highest qualification?",
  is_main_applicant: "Is this person the main applicant?",
  is_main_language: "Is this your main language?",
  is_original_date: "Is the date of issue the original date of issue?",
  issue_date: "Issue date",
  issuing_country: "Issuing country",
  issuing_state: "Issuing state / province",
  language: "Language",
  languages: "Languages used",
  legal_status: "Legal status",
  licence_number: "Licence / registration number",
  linked_passport: "Linked passport",
  listening: "Listening",
  location: "Location / test centre",
  lodgement_date: "Lodgement date",
  marriage_date: "What date did you marry?",
  marital_status: "Marital status",
  marital_status_date: "Date marital status commenced",
  medical_assistance_details: "Medical care, equipment or assistance details",
  medical_condition:
    "During their proposed visit to Australia, does any applicant expect to incur medical costs or require treatment or follow up for specified medical conditions?",
  met_in_person: "Have you and your spouse/partner met in person?",
  mobile: "Mobile number",
  name: "Name",
  national_id_card: "National identity card",
  national_identity_cards: "National identity cards",
  nationality: "Nationality",
  occupation: "Occupation",
  original_issue_date: "Original date of issue",
  other_family_members: "Other family members",
  other_identity_documents: "Other identity documents",
  other_names: "Other names",
  other_person_rights_details: "Other person rights details",
  other_person_rights_has: "Does any other person have a right to determine where this child can live?",
  other_reason_details: "Please provide details",
  outcome: "Outcome",
  outcome_date: "Outcome date",
  outcome_reference_number: "Outcome reference number",
  overall_score: "Overall score",
  passport: "Passport",
  passport_country: "Passport country",
  passport_date_of_birth: "Date of birth",
  passport_family_name: "Passport family name",
  passport_given_names: "Passport given names",
  passport_sex: "Sex on passport",
  passports: "Passports / travel documents",
  patronymic_family_name: "Patronymic family name",
  patronymic_given_names: "Patronymic given names",
  phone: "Phone number",
  place_of_birth: "Place of birth",
  place_of_birth_country: "Country of birth",
  place_of_birth_state: "State or province of birth",
  place_of_birth_town: "Town or city of birth",
  place_of_issue: "Place of issue / issuing authority",
  position: "Position / occupation",
  position_type: "Position type",
  postcode: "Postcode",
  preferred_names: "Preferred names",
  prefix: "Title",
  prev_dobs: "Previous dates of birth",
  primary_custody_details: "Primary applicant custody details",
  primary_custody_has: "Is this child in the primary applicant's care and legal custody?",
  proficiency: "Proficiency",
  qualification: "Qualification type / course type",
  reading: "Reading",
  reason_for_change: "Reason for change",
  reason_ceased: "Reason citizenship ceased",
  reason_for_separation: "Reason for living apart",
  reason_for_visit: "Reason for being in this country",
  receipt_number: "Receipt number",
  reference_number: "Reference / registration number",
  registrations: "Registrations, licences or professional memberships",
  relationship: "Relationship to the main applicant",
  relationship_status: "Relationship status",
  requires_assistance:
    "Does any applicant require ongoing medical care or special equipment, assistive technology or assistance from others for daily living?",
  requires_health_examination: "Does this person require a health examination?",
  residence_records: "Countries of residence",
  residential_address: "Residential address",
  role: "Role",
  russian_descent: "Do you have Russian descent?",
  separation_date: "Since when have you been living separately?",
  sex: "Sex",
  speaking: "Speaking",
  state: "State / territory",
  state_of_birth: "State or province of birth",
  status: "Status",
  still_citizen: "Are you still a citizen of this country?",
  studied_in_english: "Have you studied in English?",
  studied_in_english_details: "Please provide details of English-medium study",
  suburb: "Suburb / town / city",
  test_date: "Date",
  test_type: "Test type",
  title: "Title / name of licence, registration or membership",
  travel_history: "Travel history",
  travel_impediments_details: "Travel impediments details",
  travel_impediments_has: "Are there any legal impediments to this child's travel?",
  tuberculosis_details: "Tuberculosis details",
  tuberculosis_exposure_details: "Tuberculosis exposure details",
  under_18: "Is this family member a child under 18 years of age?",
  use_chinese_code: "Do you use a Chinese Commercial Code for your name?",
  visa_conditions: "Visa conditions",
  visa_country: "Visa country",
  visa_grant_entries: "Australian visa grant numbers",
  visa_grant_number: "Australian visa grant number",
  visa_history: "Visa application or visa history",
  visa_held: "Visa held",
  visa_number: "Visa number",
  visa_type: "Visa type",
  visited_outside_details: "Visits outside country of passport",
  visited_outside_passport_country:
    "In the last five years, has any applicant visited or lived outside their country of passport for more than 3 consecutive months?",
  writing: "Writing",
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
  if (CHARACTER_QUESTION_LABELS[normalizedKey]) return CHARACTER_QUESTION_LABELS[normalizedKey];
  if (/^(?:char_q\d+|q\d+)_applicant_name$/.test(normalizedKey)) {
    return "Which applicant does this declaration apply to?";
  }
  if (/^(?:char_q\d+|q\d+)_details$/.test(normalizedKey)) return "Give details";
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

function mergeDatePartGroups(value) {
  const merged = {};
  const emittedGroups = new Set();

  Object.entries(value || {}).forEach(([key, nestedValue]) => {
    const group = DATE_GROUP_BY_PART.get(key);
    if (!group) {
      if (!hasReviewValue(merged[key])) {
        merged[key] = nestedValue;
      }
      return;
    }

    if (emittedGroups.has(group.key)) return;

    const formattedDate = formatDateParts(...group.parts.map((part) => value[part]));
    if (!hasReviewValue(formattedDate)) return;

    emittedGroups.add(group.key);
    if (!hasReviewValue(merged[group.key])) {
      merged[group.key] = formattedDate;
    }
  });

  return merged;
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

  const normalizedObject = Object.entries(value).reduce((next, [key, nestedValue]) => {
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

  return mergeDatePartGroups(normalizedObject);
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
