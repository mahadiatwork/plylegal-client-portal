import { normalizeIdentityForVisa } from "./mainApplicantIdentity.js";
import { PERSONAL_MONTHS } from "./targetVisaPersonalDetails.js";

export function normalizeTargetIdentityDocuments(saved = {}, profile = null) {
  const hasSavedNationalCard = Object.values(saved.national_id_card || {}).some((value) => String(value ?? "").trim());
  const input = !saved.has_national_id && hasSavedNationalCard ? { ...saved, has_national_id: "yes" } : saved;
  const normalized = normalizeIdentityForVisa(input, "temporary-work", profile);
  normalized.national_id_card = { ...normalized.national_id_card, ...saved.national_id_card };
  if (!saved.has_passport && normalized.passports.length) normalized.has_passport = "yes";
  normalized.identity_import_review = [...new Map(normalized.identity_import_review.map((row) => [JSON.stringify(row), row])).values()];
  for (const prefix of ["date_issued", "date_expiry"]) {
    const day = String(normalized.national_id_card[`${prefix}_day`] || "");
    const month = String(normalized.national_id_card[`${prefix}_month`] || "");
    normalized.national_id_card[`${prefix}_day`] = /^\d+$/.test(day) ? String(Number(day)) : day;
    normalized.national_id_card[`${prefix}_month`] = /^\d+$/.test(month) ? PERSONAL_MONTHS[Number(month) - 1] || month : month;
  }
  return normalized;
}

export function preserveEditedIdentityRows(previous, next) {
  return previous.length === next.length ? next.map((row, index) => ({ ...previous[index], ...row })) : next;
}
