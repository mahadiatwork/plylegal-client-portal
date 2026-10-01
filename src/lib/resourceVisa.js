import {
  extractSubclass,
  PARTNER_PUBLIC_SLUG,
  PROTECTION_PUBLIC_SLUG,
} from "./visaDisplay.js";

const GENERIC_VISA_SIGNALS = new Set([
  "application",
  "temporary-work",
  "temporary work",
  "visa",
  "visa application",
]);

function normalizeVisaSignal(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeKnownVisaSlug(value) {
  const slug = normalizeVisaSignal(value);
  if (slug === "186" || slug === "482") return slug;
  if (["309", "801", PARTNER_PUBLIC_SLUG, "partner"].includes(slug)) {
    return PARTNER_PUBLIC_SLUG;
  }
  if ([PROTECTION_PUBLIC_SLUG, "protection"].includes(slug)) {
    return PROTECTION_PUBLIC_SLUG;
  }
  return null;
}

function getExactSubclass(value) {
  const signal = normalizeVisaSignal(value);
  if (!signal) return null;
  return signal.match(/^(?:subclass[\s_-]*)?(\d{3})(?:\s*visa)?$/i)?.[1]
    || extractSubclass(signal);
}

function resolveExactVisaSignal(value) {
  const signal = normalizeVisaSignal(value);
  if (!signal || GENERIC_VISA_SIGNALS.has(signal)) return null;

  const knownSlug = normalizeKnownVisaSlug(signal);
  if (knownSlug) return knownSlug;

  const subclass = getExactSubclass(signal);
  return subclass ? normalizeKnownVisaSlug(subclass) || subclass : signal;
}

export function getApplicationResourceVisaSlug(application = {}, questionnaire = {}) {
  const applicationSignals = [
    application.resourceTemplateSlug,
    application.visaSlug,
    application.visaContext,
  ];

  for (const value of applicationSignals) {
    const resolved = resolveExactVisaSignal(value);
    if (resolved) return resolved;
  }

  const questionnaireSlug = resolveExactVisaSignal(questionnaire.visaContext);
  if (questionnaireSlug) return questionnaireSlug;

  const typeText = [
    application.type,
    application.visaType,
  ].filter(Boolean).join(" ");
  const descriptiveSubclass = extractSubclass(typeText)
    || getExactSubclass(application.type)
    || getExactSubclass(application.visaType);
  if (descriptiveSubclass) {
    return normalizeKnownVisaSlug(descriptiveSubclass) || descriptiveSubclass;
  }

  const lowerType = typeText.toLowerCase();
  if (lowerType.includes("protection")) {
    return PROTECTION_PUBLIC_SLUG;
  }
  if (lowerType.includes("employer nomination") || /\b186\b/.test(lowerType)) {
    return "186";
  }
  if (
    lowerType.includes("skills in demand") ||
    lowerType.includes("temporary work") ||
    lowerType.includes("temporary skill") ||
    lowerType.includes("tss") ||
    /\b482\b/.test(lowerType)
  ) {
    return "482";
  }
  if (/\b820\b|\b801\b|\b309\b|\bpartner\b/i.test(typeText)) {
    return PARTNER_PUBLIC_SLUG;
  }

  const visaTypeCodeSlug = resolveExactVisaSignal(application.visaTypeCode);
  if (visaTypeCodeSlug) return visaTypeCodeSlug;

  const unknownType = [application.type, application.visaType]
    .map(normalizeVisaSignal)
    .find((signal) => signal && !GENERIC_VISA_SIGNALS.has(signal));
  if (unknownType) return unknownType;

  return null;
}

export function getResourceTemplateSlug(visaSlug) {
  const knownSlug = normalizeKnownVisaSlug(visaSlug);
  if (knownSlug === "186" || knownSlug === "482") return knownSlug;
  if (knownSlug === PARTNER_PUBLIC_SLUG) return "partner";
  if (knownSlug === PROTECTION_PUBLIC_SLUG) return "protection";
  return null;
}
