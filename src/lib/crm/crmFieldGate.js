import { getCrmCatalogField } from "./crmFieldCatalog.js";

/**
 * Validates values against the LIVE Zoho field configuration before they are written.
 *
 * Field names for Contacts were taken from layout screenshots, so their data type,
 * writability and picklist values are verified here against `GET /settings/fields`
 * rather than assumed. Fields whose catalog entry is already proven by production
 * code (`requiresLiveVerification` falsy) do not need metadata to be written; every
 * other field fails closed (retryable) when metadata cannot be loaded.
 */

export const GATE_ERRORS = Object.freeze({
  metadataUnavailable: "field_metadata_unavailable",
  fieldMissing: "field_not_in_crm",
  readOnly: "field_read_only",
  unsupportedPicklist: "unsupported_picklist_value",
  tooLong: "value_too_long",
  invalidDate: "invalid_date",
});

export function indexFieldMetadata(fields) {
  const index = new Map();
  (Array.isArray(fields) ? fields : []).forEach((item) => {
    if (item?.api_name) index.set(item.api_name, item);
  });
  return index;
}

function normalizeChoice(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function picklistValuesOf(meta) {
  return (Array.isArray(meta?.pick_list_values) ? meta.pick_list_values : [])
    .map((item) => item?.actual_value ?? item?.display_value)
    .filter((value) => value !== undefined && value !== null && value !== "");
}

/**
 * @returns {{ok: true, value: any, retryable?: false} | {ok: false, error: string, retryable: boolean}}
 */
export function gateFieldValue({ module, fieldApiName, value, metadataIndex }) {
  const catalogField = getCrmCatalogField(module, fieldApiName);
  const needsLive = catalogField?.requiresLiveVerification === true;
  if (!metadataIndex) {
    return needsLive
      ? { ok: false, error: GATE_ERRORS.metadataUnavailable, retryable: true }
      : { ok: true, value };
  }
  const meta = metadataIndex.get(fieldApiName);
  if (!meta) {
    return needsLive
      ? { ok: false, error: GATE_ERRORS.fieldMissing, retryable: false }
      : { ok: true, value };
  }
  if (meta.read_only === true || meta.field_read_only === true || meta.visible === false) {
    return { ok: false, error: GATE_ERRORS.readOnly, retryable: false };
  }
  if (typeof value === "string") {
    const dataType = meta.data_type;
    if (dataType === "picklist") {
      const allowed = picklistValuesOf(meta);
      const exact = allowed.find((item) => item === value);
      if (exact !== undefined) return { ok: true, value: exact };
      const loose = allowed.filter((item) => normalizeChoice(item) === normalizeChoice(value));
      if (loose.length === 1) return { ok: true, value: loose[0] };
      return { ok: false, error: GATE_ERRORS.unsupportedPicklist, retryable: false };
    }
    if (dataType === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return { ok: false, error: GATE_ERRORS.invalidDate, retryable: false };
    }
    const limit = Number(meta.length);
    if (Number.isFinite(limit) && limit > 0 && ["text", "textarea", "phone", "email"].includes(dataType) && value.length > limit) {
      return { ok: false, error: GATE_ERRORS.tooLong, retryable: false };
    }
  }
  return { ok: true, value };
}
