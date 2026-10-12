import { CRM_CLEAR_POLICIES, CRM_TRANSFORMS, getCrmCatalogField } from "./crmFieldCatalog.js";

const MONTH_INDEX = Object.freeze({
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  may: "05",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
});

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function getQuestionnaireDatePartNames(question) {
  return question?.parts || {
    day: `${question.answerKey}_day`,
    month: `${question.answerKey}_month`,
    year: `${question.answerKey}_year`,
  };
}

export function readQuestionAnswer(question, values = {}) {
  if (question?.type === "dateParts") return values;
  return values?.[question?.answerKey];
}

export function isEmptyPortalAnswer(value, question) {
  if (question?.type === "dateParts") {
    const parts = getQuestionnaireDatePartNames(question);
    const day = String(value?.[parts.day] ?? "").trim();
    const month = String(value?.[parts.month] ?? "").trim();
    const year = String(value?.[parts.year] ?? "").trim();
    return !day || !month || !year;
  }
  if (value === null || value === undefined) return true;
  if (typeof value === "boolean") return false;
  if (typeof value === "number") return !Number.isFinite(value);
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (isPlainObject(value)) return Object.keys(value).length === 0;
  return false;
}

function normalizeMonth(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  const named = MONTH_INDEX[value.toLowerCase()];
  if (named) return named;
  const numeric = Number(value);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 12) {
    return String(numeric).padStart(2, "0");
  }
  return "";
}

function transformBoolean(value, optionMap = {}) {
  if (Object.prototype.hasOwnProperty.call(optionMap, value)) {
    const mapped = optionMap[value];
    if (mapped === true || mapped === "true") return { empty: false, value: true };
    if (mapped === false || mapped === "false") return { empty: false, value: false };
  }
  if (value === true || value === "yes" || value === "true") return { empty: false, value: true };
  if (value === false || value === "no" || value === "false") return { empty: false, value: false };
  return { empty: false, error: "unmapped_boolean" };
}

function transformPicklist(value, optionMap, catalogField) {
  const portalValue = String(value ?? "").trim();
  if (!Object.prototype.hasOwnProperty.call(optionMap || {}, portalValue)) {
    return { empty: false, error: "unmapped_picklist_value" };
  }
  const zohoValue = optionMap[portalValue];
  if (
    Array.isArray(catalogField?.picklistValues)
    && !catalogField.picklistValues.includes(zohoValue)
  ) {
    return { empty: false, error: "invalid_picklist_value" };
  }
  return { empty: false, value: zohoValue };
}

function transformDateParts(values, question) {
  const parts = getQuestionnaireDatePartNames(question);
  const year = String(values?.[parts.year] ?? "").trim();
  const day = String(values?.[parts.day] ?? "").trim().padStart(2, "0");
  const month = normalizeMonth(values?.[parts.month]);
  if (!year || !month || !day || day === "00") {
    return { empty: true, value: null };
  }
  if (!/^\d{4}$/.test(year) || Number(day) < 1 || Number(day) > 31) {
    return { empty: false, error: "invalid_date_parts" };
  }
  return { empty: false, value: `${year}-${month}-${day}` };
}

export function transformQuestionnaireAnswer({
  transform,
  value,
  question,
  optionMap = {},
  catalogField = null,
}) {
  if (isEmptyPortalAnswer(value, question)) {
    return { empty: true, value: null };
  }
  switch (transform) {
    case CRM_TRANSFORMS.text:
    case CRM_TRANSFORMS.multiline_text:
      return { empty: false, value: String(value).trim() };
    case CRM_TRANSFORMS.number: {
      const number = Number(String(value).trim());
      if (!Number.isFinite(number)) return { empty: false, error: "not_a_number" };
      return { empty: false, value: number };
    }
    case CRM_TRANSFORMS.boolean:
      return transformBoolean(value, optionMap);
    case CRM_TRANSFORMS.picklist:
      return transformPicklist(value, optionMap, catalogField);
    case CRM_TRANSFORMS.date_parts_to_iso:
      return transformDateParts(value, question);
    default:
      return { empty: false, error: "unsupported_transform" };
  }
}

export function applyClearPolicy(result, clearPolicy = CRM_CLEAR_POLICIES.preserve_when_empty) {
  if (!result.empty) return result;
  if (clearPolicy === CRM_CLEAR_POLICIES.clear_when_empty) {
    return { empty: true, clear: true, value: null };
  }
  return { empty: true, skip: true, value: null, skipReason: "preserve_when_empty" };
}

export function catalogFieldForMapping(mapping) {
  return getCrmCatalogField(mapping.module, mapping.fieldApiName);
}
