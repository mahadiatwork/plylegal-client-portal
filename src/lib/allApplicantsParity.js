import { COUNTRIES } from "../reuseable/countries.js";
import { temporaryWork482Definition } from "./questionnaires/temporaryWork482.definition.js";

// Keep the approved list and countries that existing protection forms offered.
export const APPLICANT_COUNTRIES = [...new Set([
  ...COUNTRIES,
  "North Macedonia",
  "Palestine",
  "Timor-Leste",
])];

export const COMMON_TRAVEL_REASONS = [
  "Work, study or training",
  "Business",
  "Visit Family",
  "Holiday or Leisure",
  "Military Deployment",
  "Other",
];

export const HEALTH_CONDITIONS = [
  "Blood disorder",
  "Cancer",
  "Heart disease",
  "Hepatitis B or C and/or liver disease",
  "HIV infection, including AIDS",
  "Kidney disease, including dialysis",
  "Mental illness",
  "Pregnancy",
  "Respiratory disease that has required hospital admission or oxygen therapy",
  // These broader categories were already available for partner applications.
  "Diabetes",
  "Disability (physical or intellectual)",
  "Hospitalisation (any cause)",
  "Neurological condition",
  "Liver disease (including hepatitis or cirrhosis)",
  "Respiratory condition (including asthma)",
  "Cardiac (heart) condition",
  "Other",
];

// A saved choice remains selectable without rewriting its stored value.
export function withCurrentOption(options, value) {
  return value && !options.includes(value) ? [...options, value] : options;
}

const characterPage = temporaryWork482Definition.pages.find((page) => page.id === "all-applicants-character");
const approvedCharacterLabels = Object.fromEntries(characterPage.questions.map((question) => [question.id, question.label]));
export const CHARACTER_INSTRUCTIONS = characterPage.introBlocks;

const characterQuestionKeys = {
  awaiting_legal_action: "char_q01",
  convicted_offence: "char_q02",
  domestic_violence_order: "char_q03",
  arrest_warrant: "char_q04",
  child_sex_offence: "char_q05",
  sex_offender_register: "char_q06",
  insanity_acquittal: "char_q07",
  unfit_to_plead: "char_q08",
  national_security_risk: "char_q09",
  war_crimes: "char_q10",
  associated_criminal_conduct: "char_q11",
  associated_violent_org: "char_q12",
  military_service: "char_q13",
  military_training: "char_q14",
  people_smuggling: "char_q15",
  outstanding_debts: "char_q18",
};

// Keep the separate target declarations and their wider entry-permit coverage.
const scopedCharacterLabels = {
  overstayed_visa: "Has any applicant ever overstayed a visa or entry permit in any country (including Australia)?",
  deported_removed: "Has any applicant ever been removed or deported from any country (including Australia)?",
  excluded_from_country: "Has any applicant ever been excluded from or asked to leave any country (including Australia)?",
};

export function alignCharacterQuestion(question) {
  return {
    ...question,
    label: approvedCharacterLabels[characterQuestionKeys[question.key]] || scopedCharacterLabels[question.key] || question.label,
  };
}

export const TARGET_CHARACTER_QUESTIONS = [
  { key: "police_check_last_12_months", label: "Has any applicant applied for a police clearance certificate in the last 12 months?" },
  { key: "immigration_detention", label: "Has any applicant previously been in immigration detention, a refugee camp or centre for refugees?" },
  { key: "convicted_offence" },
  { key: "awaiting_legal_action" },
  { key: "domestic_violence_order" },
  { key: "arrest_warrant" },
  { key: "child_sex_offence" },
  { key: "sex_offender_register" },
  { key: "psychiatric_institution", label: "Has any applicant ever been confined in a prison or psychiatric institution by order of a court in relation to criminal proceedings?" },
  { key: "insanity_acquittal" },
  { key: "unfit_to_plead" },
  { key: "false_misleading_info", label: "Has any applicant ever provided any information or a document to the Australian Immigration or Customs Authorities which was wrong, incorrect, false or misleading?" },
  { key: "visa_refused", label: "Has any applicant ever had a visa or entry permit for any country (including Australia) refused?" },
  { key: "overstayed_visa" },
  { key: "deported_removed" },
  { key: "avoid_removal", label: "Has any applicant ever left any country to avoid being removed or deported from that country (including Australia)?" },
  { key: "excluded_from_country" },
  { key: "citizenship_refusal", label: "Has any applicant ever been refused, renounced or rescinded citizenship of any country?" },
  { key: "war_crimes" },
  { key: "national_security_risk" },
  { key: "outstanding_debts" },
  { key: "people_smuggling" },
  { key: "associated_criminal_conduct" },
  { key: "associated_violent_org" },
  { key: "military_training" },
  { key: "military_service" },
  { key: "sponsorship_payment", label: "Has any person included in this application made or offered to make a payment or provide another benefit of any kind to another person or entity in return for the sponsorship, nomination or support for an Australian visa?" },
].map(alignCharacterQuestion);

export const CHARACTER_QUESTION_LABELS = Object.fromEntries(
  TARGET_CHARACTER_QUESTIONS.map((question) => [question.key, question.label]),
);
