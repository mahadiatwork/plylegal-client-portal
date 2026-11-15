// Small, dependency-free value helpers shared by the canonical CRM projections.

export const MONTHS = Object.freeze({
  january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
  july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
});

export const MARITAL_STATUS = Object.freeze({
  "never married": "Never Married or been in a De Facto Relationship",
  "never married or been in a de facto relationship": "Never Married or been in a De Facto Relationship",
  married: "Married",
  "de facto relationship": "De Facto Relationship",
  divorced: "Divorced",
  engaged: "Engaged",
  separated: "Separated",
  widowed: "Widowed",
});

export function text(value) {
  return value == null ? "" : String(value).trim();
}

export function firstText(...values) {
  return values.map(text).find(Boolean) || "";
}

export function normalizeMonth(value) {
  const raw = text(value);
  if (!raw) return "";
  if (MONTHS[raw.toLowerCase()]) return MONTHS[raw.toLowerCase()];
  const numeric = Number(raw);
  return Number.isInteger(numeric) && numeric >= 1 && numeric <= 12
    ? String(numeric).padStart(2, "0")
    : "";
}

/** Returns a real calendar date as YYYY-MM-DD, or "" when the parts are missing/invalid. */
export function dateFromParts(day, month, year) {
  const normalizedDay = text(day).padStart(2, "0");
  const normalizedMonth = normalizeMonth(month);
  const normalizedYear = text(year);
  if (!/^\d{4}$/.test(normalizedYear) || !normalizedMonth || !/^\d{2}$/.test(normalizedDay)) return "";
  const candidate = `${normalizedYear}-${normalizedMonth}-${normalizedDay}`;
  const parsed = new Date(`${candidate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== candidate) return "";
  return candidate;
}

export function isTruthyAnswer(value) {
  return value === true || ["yes", "true", "1"].includes(text(value).toLowerCase());
}

export function isFalsyAnswer(value) {
  return value === false || ["no", "false", "0"].includes(text(value).toLowerCase());
}
