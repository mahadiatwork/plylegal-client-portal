import { z } from "zod";

export const PERSONAL_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const MARITAL_STATUSES = ["Never Married", "Married", "De Facto Relationship", "Divorced", "Widowed", "Separated"];
export const MARITAL_DATE_LABELS = {
  Married: "Date of Marriage",
  "De Facto Relationship": "Date De Facto Relationship Began",
  Divorced: "Date of Divorce",
  Widowed: "Date of Death of Spouse",
  Separated: "Date of Separation",
};

const textFields = [
  "family_name", "given_names", "preferred_names", "gender", "birth_day", "birth_month", "birth_year",
  "country_of_birth", "city_of_birth", "state_of_birth", "marital_status",
  "marital_status_date_day", "marital_status_date_month", "marital_status_date_year",
  "citizenship_of_passport_country", "citizenship_other_than_birth",
];

export const EMPTY_PERSONAL_DETAILS = Object.fromEntries(textFields.map((key) => [key, ""]));

// Keep target-only and imported answers when validating the common fields.
export const targetPersonalDetailsSchema = z.object({
  ...Object.fromEntries(textFields.map((key) => [key, z.string().optional()])),
  country_of_birth: z.string().trim().min(1, "Country of birth is required"),
  city_of_birth: z.string().trim().min(1, "City or town of birth is required"),
  state_of_birth: z.string().trim().min(1, "State or province of birth is required"),
  citizenships: z.array(z.object({
    country: z.string(),
    how_obtained: z.string(),
  }).passthrough()).optional(),
}).passthrough().refine(
  (data) => data.citizenship_other_than_birth !== "yes" || data.citizenships?.length > 0,
  { message: "Please add at least one citizenship", path: ["citizenships"] },
);

export const targetChildDetailsSchema = targetPersonalDetailsSchema.and(z.object({
  relationship_to_spouse: z.string().refine((value) => value.trim().length > 0, "Please select the child's relationship to your spouse or partner"),
}));

export function normalizePersonalMonth(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (/^\d+$/.test(text)) return String(Number(text));
  const index = PERSONAL_MONTHS.findIndex((month) => month.toLowerCase() === text.toLowerCase());
  return index < 0 ? text : String(index + 1);
}

export function normalizeTargetPersonalDetails(saved = {}, profile = {}) {
  const values = { ...EMPTY_PERSONAL_DETAILS, ...saved, citizenships: Array.isArray(saved.citizenships) ? saved.citizenships : [] };
  for (const field of textFields) values[field] = String(values[field] ?? "");
  for (const field of ["family_name", "given_names", "gender", "birth_day", "birth_month", "birth_year"]) {
    if (!values[field]) values[field] = String(profile?.[field] ?? "");
  }
  values.gender = ({ male: "Male", m: "Male", female: "Female", f: "Female", other: "Other" })[values.gender.toLowerCase()] || values.gender;
  for (const prefix of ["birth", "marital_status_date"]) {
    const day = values[`${prefix}_day`];
    values[`${prefix}_day`] = /^\d+$/.test(day) ? String(Number(day)) : day;
    values[`${prefix}_month`] = normalizePersonalMonth(values[`${prefix}_month`]);
  }
  return values;
}

export function mergeTargetPersonalDetails(existing = {}, values = {}) {
  return { ...existing, ...values };
}
