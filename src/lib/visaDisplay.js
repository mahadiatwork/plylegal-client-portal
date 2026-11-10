/**
 * User-facing visa labels and Zoho deal → internal visa route mapping.
 * Replaces legacy "Temporary Work" / TSS wording with Skills in Demand (subclass 482) where appropriate.
 */

export const SKILLS_IN_DEMAND_TYPE_LABEL = "Skills in Demand (Subclass 482)";
export const PARTNER_PUBLIC_SLUG = "820";
export const PARTNER_SUBCLASS_CODES = Object.freeze(["820", "801", "309", "100"]);
export const PROTECTION_PUBLIC_SLUG = "866";

const SUBCLASS_PATTERN = /subclass\s*(\d{3})/i;

export function extractSubclass(value) {
  if (!value || typeof value !== "string") return null;
  return value.match(SUBCLASS_PATTERN)?.[1] || null;
}

export function isPartnerSubclass(value) {
  return PARTNER_SUBCLASS_CODES.includes(String(value || "").trim());
}

function containsPartnerSubclass(value) {
  return PARTNER_SUBCLASS_CODES.some((subclass) => new RegExp(`\\b${subclass}\\b`, "i").test(String(value || "")));
}

/**
 * Maps a Zoho CRM deal to the same visa code used by intake routes (`partner`, `protection`, `temporary-work`).
 */
export function mapZohoDealToVisaTypeCode(deal) {
  const dealNameRaw = deal?.Deal_Name || deal?.DealName || "";
  const visaTypeRaw = deal?.Visa_Type || deal?.visaType || deal?.Type || "";
  const dealName = dealNameRaw.toLowerCase();
  const visaType = visaTypeRaw.toLowerCase();
  const combined = `${dealNameRaw} ${visaTypeRaw}`;
  const combinedLower = combined.toLowerCase();

  if (dealName.includes("protection") || visaType.includes("protection")) {
    return "protection";
  }

  const subclass = extractSubclass(combined);
  if (
    subclass === "186" ||
    combinedLower.includes("employer nomination") ||
    /\b186\b/.test(combinedLower)
  ) {
    return "temporary-work";
  }
  if (
    subclass === "482" ||
    combinedLower.includes("skills in demand") ||
    combinedLower.includes("temporary work") ||
    combinedLower.includes("temporary skill") ||
    combinedLower.includes("tss") ||
    (combinedLower.includes("temporary") && combinedLower.includes("work")) ||
    (dealName.includes("work") && !combinedLower.includes("partner visa"))
  ) {
    return "temporary-work";
  }

  const partnerVisa =
    containsPartnerSubclass(combined) || /partner\s+visa/i.test(combined) ||
    visaTypeRaw.trim().toLowerCase() === "partner";
  if (partnerVisa) {
    return "partner";
  }

  return "partner";
}

/**
 * Normalizes stored CRM visa type strings: legacy Temporary Work / TSS labels → Skills in Demand (482).
 * Leaves Employer Nomination (186) and other subclasses unchanged.
 */
export function normalizeSkillsInDemandTypeLabel(typeStr) {
  if (!typeStr || typeof typeStr !== "string") return typeStr;
  const lower = typeStr.toLowerCase();
  if (lower.includes("186") || lower.includes("employer nomination")) {
    return typeStr;
  }
  if (
    lower.includes("temporary work") ||
    lower.includes("temporary skill") ||
    lower.includes("skill shortage") ||
    (lower.includes("tss") && lower.includes("482")) ||
    (lower.includes("482") && lower.includes("temporary"))
  ) {
    return SKILLS_IN_DEMAND_TYPE_LABEL;
  }
  return typeStr;
}

/** Applications list / UI: prefer normalized Skills in Demand label. */
export function formatVisaApplicationType(app) {
  if (!app?.type?.trim()) return "N/A";
  return normalizeSkillsInDemandTypeLabel(app.type.trim()) || "N/A";
}

export function normalizeApplicationSlug(slug) {
  const value = String(slug || "").trim().toLowerCase();
  if (value === "partner" || isPartnerSubclass(value)) return PARTNER_PUBLIC_SLUG;
  if (value === "protection") return PROTECTION_PUBLIC_SLUG;
  if (["186", "482", PARTNER_PUBLIC_SLUG, PROTECTION_PUBLIC_SLUG].includes(value)) return value;
  return value;
}

export function getApplicationSlug(app) {
  if (!app) return PARTNER_PUBLIC_SLUG;

  const explicitSlug = String(
    app.visaSlug ||
    app.resourceTemplateSlug ||
    app.visaContext ||
    app.questionnaireVisaContext ||
    ""
  ).trim().toLowerCase();

  if (["186", "482", "partner", ...PARTNER_SUBCLASS_CODES, "protection", PROTECTION_PUBLIC_SLUG].includes(explicitSlug)) {
    return normalizeApplicationSlug(explicitSlug);
  }

  const text = [
    app.type,
    app.reference,
    app.visaType,
    app.visaTypeCode,
  ].filter(Boolean).join(" ");
  const lower = text.toLowerCase();

  if (lower.includes("protection") || app.visaTypeCode === "protection") {
    return PROTECTION_PUBLIC_SLUG;
  }

  const subclass = extractSubclass(text);
  if (
    subclass === "186" ||
    lower.includes("employer nomination") ||
    (/\b186\b/.test(lower) &&
      (lower.includes("nomination") || lower.includes("employer")))
  ) {
    return "186";
  }
  if (
    subclass === "482" ||
    lower.includes("skills in demand") ||
    lower.includes("temporary work") ||
    lower.includes("temporary skill") ||
    lower.includes("tss")
  ) {
    return "482";
  }

  if (app.visaTypeCode === "temporary-work") {
    if (lower.includes("employer nomination") || /\b186\b/.test(lower)) return "186";
    return "482";
  }

  const partnerVisa =
    app.visaTypeCode === "partner" ||
    containsPartnerSubclass(lower) || /partner\s+visa/i.test(lower);
  if (partnerVisa) {
    return PARTNER_PUBLIC_SLUG;
  }

  return PARTNER_PUBLIC_SLUG;
}
