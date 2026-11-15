import { getQuestionnairePageSavedValues } from "../questionnaires/answers.js";
import { getQuestionnairePageProfileRole } from "./questionnaireCrmContract.js";
import {
  MARITAL_STATUS,
  dateFromParts,
  firstText,
  isFalsyAnswer,
  isTruthyAnswer,
  text,
} from "./crmValueHelpers.js";

/**
 * Zoho Contacts projection for the MAIN APPLICANT only.
 *
 * Contacts holds the main applicant. Spouses, children and other family members
 * are `Partner_Dependents` records and must never be written here, so this module
 * only ever receives the main-applicant subject.
 *
 * Every field is declared once in CONTACT_FIELD_INVENTORY. `sync: "automatic"` fields
 * are written after Zoho field metadata confirms the field exists, is writable and
 * accepts the value (see crmFieldGate.js). `sync: "hold"` fields are deliberately NOT
 * written: their meaning or allowed values are not established, and the reason is
 * surfaced in the sync summary instead of guessing.
 */

export const CONTACT_SECTIONS = Object.freeze(["details", "identity", "contact_details"]);

export const SKIP_REASONS = Object.freeze({
  needsConfirmation: "needs_confirmation",
  ambiguousPassport: "ambiguous_current_passport",
  ambiguousCitizenship: "ambiguous_primary_citizenship",
  unsupportedValue: "unsupported_picklist_value",
  invalidDate: "invalid_date",
  invalidPhone: "invalid_phone_number",
  ambiguousPhoneCode: "ambiguous_phone_country_code",
  notSharedWithMain: "postal_details_not_shared_with_main_applicant",
});

/** Skip reasons a person must look at (as opposed to ordinary "no data yet"). */
export const ATTENTION_SKIP_REASONS = Object.freeze(new Set(Object.values(SKIP_REASONS)));

/**
 * Maps a page onto one of CONTACT_SECTIONS (or another token for pages this module
 * does not read). Real definitions use `profileSection` ("details", "identity",
 * "contact_details") and prefixed section keys ("temporary_work_details",
 * "partner_main_applicant_identity", "protection_contact_details").
 */
export function contactSectionForPage(page) {
  const profileSection = text(page?.metadata?.profileSection).toLowerCase();
  const candidate = profileSection || text(page?.sectionKey).toLowerCase();
  if (!candidate) return "";
  if (/(^|[_-])contact[_-]?details$/.test(candidate)) return "contact_details";
  if (/(^|[_-])identity$/.test(candidate)) return "identity";
  if (/(^|[_-])details$/.test(candidate)) return "details";
  return candidate;
}

function pagesForSection(definition, section) {
  return (definition?.pages || []).filter((page) => contactSectionForPage(page) === section);
}

function readSection({ definition, draft, subject, section }) {
  const page = pagesForSection(definition, section).find(
    (candidate) => getQuestionnairePageProfileRole(candidate) === "main_applicant" && candidate.scope === "profile",
  );
  if (page) {
    const saved = getQuestionnairePageSavedValues(draft, page, subject.id, null) || {};
    if (Object.keys(saved).length) return saved;
  }
  return draft?.profiles_data?.[subject.id]?.[section] || {};
}

/** Partner and Protection keep contact details on one page shared by all applicants. */
function readSharedContactDetails({ definition, draft }) {
  const page = pagesForSection(definition, "contact_details").find((candidate) => candidate.scope === "shared");
  return page ? getQuestionnairePageSavedValues(draft, page, null, null) || {} : {};
}

function looksLikePassport(row) {
  const type = text(row?.document_type);
  return !type || /passport/i.test(type);
}

function passportStatusIsCurrent(row) {
  const status = text(row?.document_status);
  if (status) return status.toLowerCase() === "current";
  return isTruthyAnswer(row?.is_current) || isTruthyAnswer(row?.current);
}

function passportHasStatusInfo(row) {
  return Boolean(text(row?.document_status)) || row?.is_current !== undefined || row?.current !== undefined;
}

/**
 * Current-passport rule: the single passport row whose status is "Current"
 * (`document_status`, or the legacy `is_current` flag). A lone passport with no
 * status information at all is also accepted. More than one current passport is
 * reported as ambiguous; no row is picked.
 */
export function selectCurrentPassport(rows) {
  const passports = (Array.isArray(rows) ? rows : []).filter((row) => row && typeof row === "object" && looksLikePassport(row));
  if (!passports.length) return { passport: null };
  if (passports.length === 1 && !passportHasStatusInfo(passports[0])) return { passport: passports[0] };
  const current = passports.filter(passportStatusIsCurrent);
  if (current.length === 1) return { passport: current[0] };
  if (current.length > 1) return { passport: null, ambiguous: SKIP_REASONS.ambiguousPassport };
  return { passport: null };
}

function passportFields(passport) {
  if (!passport) return { number: "", country: "", nationality: "", expiryParts: [], expiry: "" };
  const parts = [passport.date_expiry_day, passport.date_expiry_month, passport.date_expiry_year];
  return {
    number: firstText(passport.document_number, passport.passport_number),
    country: firstText(passport.passport_country, passport.country_of_passport),
    nationality: text(passport.nationality),
    expiryParts: parts,
    expiry: dateFromParts(...parts),
  };
}

function citizenshipRows(...sources) {
  return sources
    .filter(Array.isArray)
    .flat()
    .filter((row) => row && typeof row === "object")
    .map((row) => ({
      country: firstText(row.country, row.citizenship_country, row.country_name),
      stillCitizen: !isFalsyAnswer(row.still_citizen) && !text(row.date_ceased_year) && !text(row.date_ceased),
    }))
    .filter((row) => row.country);
}

const sameCountry = (left, right) => text(left).toLowerCase() === text(right).toLowerCase();

/**
 * Primary-citizenship rule (Contacts `Nationality`):
 *  1. exactly one current citizenship (not ceased) -> that country;
 *  2. several current citizenships -> the one matching the current passport's
 *     nationality/country, if exactly one matches; otherwise ambiguous;
 *  3. no citizenship rows but "citizen of the passport country" answered yes -> passport country.
 * An ambiguous result writes nothing and is reported.
 */
export function selectPrimaryCitizenship({ details, identity, passport }) {
  const rows = citizenshipRows(details?.citizenships, identity?.citizenships);
  const current = [...new Map(rows.filter((row) => row.stillCitizen).map((row) => [row.country.toLowerCase(), row.country])).values()];
  if (current.length === 1) return { country: current[0] };
  if (current.length > 1) {
    const matches = current.filter((country) => sameCountry(country, passport.nationality) || sameCountry(country, passport.country));
    if (matches.length === 1) return { country: matches[0] };
    return { country: "", ambiguous: SKIP_REASONS.ambiguousCitizenship };
  }
  const passportCitizen = [
    details?.citizenship_of_passport_country,
    details?.citizen_of_passport_country,
    identity?.citizenship_of_passport_country,
  ].some(isTruthyAnswer);
  if (passportCitizen && passport.country) return { country: passport.country };
  return { country: "" };
}

function phoneCountryDigits(raw) {
  const value = text(raw);
  if (!value) return { digits: "" };
  const direct = value.match(/^\+?(\d{1,4})$/) || value.match(/\(\+?(\d{1,4})\)/);
  return direct ? { digits: direct[1] } : { ambiguous: true };
}

/** Builds an E.164-style number from a country-code select and a local number. */
export function composeMobileNumber(countryCode, localNumber) {
  const local = text(localNumber).replace(/[\s().-]/g, "");
  if (!local) return { value: "" };
  if (!/^\+?\d+$/.test(local)) return { skip: SKIP_REASONS.invalidPhone };
  if (local.startsWith("+")) return /^\+\d{7,15}$/.test(local) ? { value: local } : { skip: SKIP_REASONS.invalidPhone };
  const country = phoneCountryDigits(countryCode);
  if (country.ambiguous || !country.digits) return { skip: SKIP_REASONS.ambiguousPhoneCode };
  const national = local.replace(/^0+/, "");
  const full = `+${country.digits}${national}`;
  return /^\+\d{7,15}$/.test(full) ? { value: full } : { skip: SKIP_REASONS.invalidPhone };
}

function dateOrInvalid(parts, parsed) {
  const supplied = parts.some((part) => text(part));
  if (!supplied) return { value: "" };
  return parsed ? { value: parsed } : { skip: SKIP_REASONS.invalidDate };
}

function plain(value) {
  const normalized = text(value);
  return { value: normalized };
}

function genderValue(value) {
  const normalized = text(value);
  if (!normalized) return { value: "" };
  return ["Male", "Female"].includes(normalized) ? { value: normalized } : { skip: SKIP_REASONS.unsupportedValue };
}

function relationshipStatusValue(value) {
  const normalized = text(value);
  if (!normalized) return { value: "" };
  const mapped = MARITAL_STATUS[normalized.toLowerCase()];
  return mapped ? { value: mapped } : { skip: SKIP_REASONS.unsupportedValue };
}

function sharedYes(value) {
  return isTruthyAnswer(value);
}

function sharedFlag(shared, ...keys) {
  return keys.some((key) => sharedYes(shared?.[key]));
}

function postalField(shared, keys, ...valueKeys) {
  if (!sharedFlag(shared, ...keys)) {
    const answered = valueKeys.some((key) => text(shared?.[key]));
    return answered ? { skip: SKIP_REASONS.notSharedWithMain } : { value: "" };
  }
  return plain(firstText(...valueKeys.map((key) => shared?.[key])));
}

function postalStreet(shared, keys) {
  if (!sharedFlag(shared, ...keys)) return postalField(shared, keys, "postal_address");
  const street = [text(shared.postal_address), text(shared.postal_address_line2)].filter(Boolean).join(", ");
  return { value: street };
}

const POSTAL_FLAGS = ["share_postal_address", "share_same_postal_address"];
const PHONE_FLAGS = ["share_contact_phone_numbers", "share_same_contact_phones"];

function mobileFromShared(shared) {
  if (!sharedFlag(shared, ...PHONE_FLAGS)) {
    const answered = ["mobile_number", "mobile_phone_number"].some((key) => text(shared?.[key]));
    return answered ? { skip: SKIP_REASONS.notSharedWithMain } : { value: "" };
  }
  return composeMobileNumber(
    firstText(shared.mobile_country_code, shared.mobile_phone_country_code),
    firstText(shared.mobile_number, shared.mobile_phone_number),
  );
}

/**
 * The single source of truth for Contacts mappings. `derive(ctx)` returns
 * `{ value }` (empty string = nothing to send) or `{ skip: <reason> }`.
 * `sections` are the page sections whose save triggers the field.
 */
export const CONTACT_FIELD_INVENTORY = Object.freeze([
  { apiName: "First_Name", label: "First Name", dataType: "text", sections: ["details"], sync: "automatic",
    portalSource: "Main applicant details: given_names (all visas)", transform: "trim",
    derive: ({ snapshot }) => plain(snapshot.given_names) },
  { apiName: "Last_Name", label: "Last Name", dataType: "text", sections: ["details"], sync: "automatic",
    portalSource: "Main applicant details: family_name (all visas)", transform: "trim",
    derive: ({ snapshot }) => plain(snapshot.family_name) },
  { apiName: "Preferred_Name", label: "Preferred Name", dataType: "text", sections: ["details"], sync: "automatic",
    portalSource: "Main applicant details: preferred_names (only where the page/draft collects it)", transform: "trim",
    derive: ({ snapshot }) => plain(snapshot.preferred_names) },
  { apiName: "Gender", label: "Gender", dataType: "picklist (Male, Female)", sections: ["details"], sync: "automatic",
    portalSource: "Main applicant details: gender", transform: "picklist Male/Female; other choices reported",
    derive: ({ snapshot }) => genderValue(snapshot.gender) },
  { apiName: "Date_of_Birth", label: "Date of Birth", dataType: "date", sections: ["details"], sync: "automatic",
    portalSource: "Main applicant details: birth day/month/year", transform: "day+month(name or number)+year -> YYYY-MM-DD",
    derive: ({ snapshot }) => dateOrInvalid([snapshot.birth_day, snapshot.birth_month, snapshot.birth_year], snapshot.date_of_birth) },
  { apiName: "Country_of_Birth", label: "Country of Birth", dataType: "text/picklist (verified live)", sections: ["details"], sync: "automatic",
    portalSource: "Main applicant details: country_of_birth", transform: "trim; checked against live picklist",
    derive: ({ details }) => plain(details.country_of_birth) },
  { apiName: "City_Town_of_Birth", label: "City/Town of Birth", dataType: "text", sections: ["details"], sync: "automatic",
    portalSource: "Main applicant details: city_of_birth (all visas)", transform: "trim",
    derive: ({ details }) => plain(details.city_of_birth) },
  { apiName: "State_or_Province_of_Birth", label: "State or Province of Birth", dataType: "text", sections: ["details"], sync: "automatic",
    portalSource: "Main applicant details: state_of_birth (all visas)", transform: "trim",
    derive: ({ details }) => plain(details.state_of_birth) },
  { apiName: "Relationship_Status", label: "Relationship Status", dataType: "picklist (verified live)", sections: ["details"], sync: "automatic",
    portalSource: "Main applicant details: marital_status",
    transform: "portal marital status -> canonical status; checked against live picklist (same meaning as Partner_Dependents.Relationship_Status)",
    derive: ({ details }) => relationshipStatusValue(details.marital_status) },
  { apiName: "Nationality", label: "Citizenship", dataType: "text/picklist (verified live)", sections: ["details", "identity"], sync: "automatic",
    portalSource: "Main applicant details + identity: citizenships (current), passport nationality/country",
    transform: "primary-citizenship rule; ambiguity reported, nothing written",
    derive: ({ citizenship }) => (citizenship.ambiguous ? { skip: citizenship.ambiguous } : plain(citizenship.country)) },
  { apiName: "Country_of_Passport", label: "Country of Passport", dataType: "text/picklist (verified live)", sections: ["identity"], sync: "automatic",
    portalSource: "Main applicant identity: passports[].passport_country of the current passport", transform: "current-passport rule",
    derive: ({ currentPassport, passport }) => (currentPassport.ambiguous ? { skip: currentPassport.ambiguous } : plain(passport.country)) },
  { apiName: "Passport_No", label: "Passport Number", dataType: "text", sections: ["identity"], sync: "automatic",
    portalSource: "Main applicant identity: passports[].document_number of the current passport", transform: "current-passport rule",
    derive: ({ currentPassport, passport }) => (currentPassport.ambiguous ? { skip: currentPassport.ambiguous } : plain(passport.number)) },
  { apiName: "Passport_Expiry_Date", label: "Passport Expiry Date", dataType: "date", sections: ["identity"], sync: "automatic",
    portalSource: "Main applicant identity: passports[].date_expiry day/month/year of the current passport",
    transform: "current-passport rule; parts -> YYYY-MM-DD",
    derive: ({ currentPassport, passport }) => (currentPassport.ambiguous
      ? { skip: currentPassport.ambiguous }
      : dateOrInvalid(passport.expiryParts, passport.expiry)) },
  { apiName: "Country_of_Residence", label: "Country of Residence", dataType: "text/picklist (verified live)", sections: ["contact_details"], sync: "automatic",
    portalSource: "Temporary Work main applicant contact details: usual_country_of_residence (no equivalent on Partner/Protection)",
    transform: "trim; checked against live picklist",
    derive: ({ contactDetails }) => plain(contactDetails.usual_country_of_residence) },
  { apiName: "Phone", label: "Phone", dataType: "text", sections: ["contact_details"], sync: "automatic",
    portalSource: "Temporary Work main applicant contact details: phone (Partner/Protection: not synchronized, see Home_Phone)", transform: "trim",
    derive: ({ contactDetails }) => plain(contactDetails.phone) },
  { apiName: "Mobile", label: "Mobile", dataType: "text", sections: ["contact_details"], sync: "automatic",
    portalSource: "Temporary Work: mobile. Partner/Protection shared contact details: mobile country code + number when phones are shared with all applicants",
    transform: "trim / country code + number -> +E.164",
    derive: ({ contactDetails, shared }) => (text(contactDetails.mobile) ? plain(contactDetails.mobile) : mobileFromShared(shared)) },
  { apiName: "Mailing_Street", label: "Street", dataType: "text", sections: ["contact_details"], sync: "automatic",
    portalSource: "Partner/Protection shared contact details: postal_address + postal_address_line2 (only when the postal address is shared with all applicants)",
    transform: "join lines with \", \"",
    derive: ({ shared }) => postalStreet(shared, POSTAL_FLAGS) },
  { apiName: "Mailing_Suburb", label: "Suburb", dataType: "text", sections: ["contact_details"], sync: "automatic",
    portalSource: "Partner/Protection shared contact details: postal_suburb (shared postal address)", transform: "trim",
    derive: ({ shared }) => postalField(shared, POSTAL_FLAGS, "postal_suburb") },
  { apiName: "Mailing_State", label: "Mailing Province", dataType: "text", sections: ["contact_details"], sync: "automatic",
    portalSource: "Partner/Protection shared contact details: postal_state (shared postal address)", transform: "trim",
    derive: ({ shared }) => postalField(shared, POSTAL_FLAGS, "postal_state") },
  { apiName: "Mailing_Zip", label: "Post Code", dataType: "text", sections: ["contact_details"], sync: "automatic",
    portalSource: "Partner/Protection shared contact details: postal_postcode (shared postal address)", transform: "trim",
    derive: ({ shared }) => postalField(shared, POSTAL_FLAGS, "postal_postcode") },
  { apiName: "Mailing_Country", label: "Mailing Country", dataType: "text/picklist (verified live)", sections: ["contact_details"], sync: "automatic",
    portalSource: "Partner/Protection shared contact details: postal_country (shared postal address)", transform: "trim; checked against live picklist",
    derive: ({ shared }) => postalField(shared, POSTAL_FLAGS, "postal_country") },

  // ---- Held: not written until the owner confirms the stated question. ----
  { apiName: "Email", label: "Email", dataType: "text", sections: ["contact_details"], sync: "hold",
    portalSource: "Main applicant contact details: email",
    holdReason: "Email is the portal login and the key used to link the Contact. Overwriting it from a questionnaire answer could break access." },
  { apiName: "Secondary_Email", label: "Secondary Email", dataType: "text", sections: ["contact_details"], sync: "hold",
    portalSource: "Main applicant contact details: email (when different from the Contact's primary email)",
    holdReason: "Portal has no separate secondary-email question; confirm that a differing contact-details email should become the secondary email." },
  { apiName: "Home_Phone", label: "Home Phone", dataType: "text", sections: ["contact_details"], sync: "hold",
    portalSource: "Partner/Protection shared contact details: after-hours phone (country code, area code, number)",
    holdReason: "Confirm after-hours = Home Phone and office hours = Phone before writing the shared, split phone numbers." },
  { apiName: "Mailing_City", label: "Mailing City", dataType: "text", sections: ["contact_details"], sync: "hold",
    portalSource: "No portal field (portal asks only for a suburb)",
    holdReason: "The portal does not distinguish suburb from city; suburb is written to Mailing_Suburb only." },
  { apiName: "Current_Visa", label: "Current Visa", dataType: "text/picklist (unknown)", sections: ["identity"], sync: "hold",
    portalSource: "Partner: visa history; Protection: previous visas; Temporary Work: grant numbers only",
    holdReason: "Visa history rows are not flagged as current and Zoho's allowed visa values are unknown; a current-visa rule (granted, not cancelled, expiry in future, Australia) needs approval." },
  { apiName: "Visa_Expiry_Date", label: "Current Visa Expiry Date", dataType: "date", sections: ["identity"], sync: "hold",
    portalSource: "Partner/Protection visa history: expiry_date of the current visa",
    holdReason: "Depends on the same current-visa rule as Current_Visa." },
  { apiName: "Address_1_Street_Address", label: "Address - Street Address", dataType: "text", sections: ["contact_details"], sync: "hold",
    portalSource: "Temporary Work contact details residential_address[].address_line (candidate)",
    holdReason: "The meaning of the Zoho 'Address' (Address_1) block is not established (residential vs other). Residential addresses must not be written to the mailing fields." },
  { apiName: "Address_1_City", label: "Address - City", dataType: "text", sections: ["contact_details"], sync: "hold",
    portalSource: "Temporary Work residential_address[].suburb (candidate)", holdReason: "See Address_1_Street_Address." },
  { apiName: "Address_1_State_Province", label: "Address - State / Province", dataType: "text", sections: ["contact_details"], sync: "hold",
    portalSource: "Temporary Work residential_address[].state_territory (candidate)", holdReason: "See Address_1_Street_Address." },
  { apiName: "Address_1_Zip_Postal_Code", label: "Address - Zip / Postal Code", dataType: "text", sections: ["contact_details"], sync: "hold",
    portalSource: "Temporary Work residential_address[].postcode (candidate)", holdReason: "See Address_1_Street_Address." },
  { apiName: "Address_1_Country_Region", label: "Address - Country / Region", dataType: "text", sections: ["contact_details"], sync: "hold",
    portalSource: "Temporary Work residential_address[].country (candidate)", holdReason: "See Address_1_Street_Address." },
]);

export function buildContactContext({ definition, draft, subject, snapshot }) {
  const details = readSection({ definition, draft, subject, section: "details" });
  const identity = readSection({ definition, draft, subject, section: "identity" });
  const contactDetails = readSection({ definition, draft, subject, section: "contact_details" });
  const shared = readSharedContactDetails({ definition, draft });
  const currentPassport = selectCurrentPassport(identity?.passports);
  const passport = passportFields(currentPassport.passport);
  const citizenship = selectPrimaryCitizenship({ details, identity, passport });
  return { snapshot, details, identity, contactDetails, shared, currentPassport, passport, citizenship };
}

/**
 * Returns one entry per applicable Contacts field:
 *   { fieldApiName, value }                 -> send
 *   { fieldApiName, value: "" }             -> nothing to send (preserved in CRM)
 *   { fieldApiName, skipReason }            -> not sent; reason is surfaced
 */
export function buildContactFieldPlan({ definition, draft, subject, snapshot, sections, includeHeld = false }) {
  const wanted = new Set(sections);
  const context = buildContactContext({ definition, draft, subject, snapshot });
  const plan = [];
  CONTACT_FIELD_INVENTORY.forEach((entry) => {
    if (!entry.sections.some((section) => wanted.has(section))) return;
    if (entry.sync === "hold") {
      if (includeHeld) plan.push({ fieldApiName: entry.apiName, skipReason: SKIP_REASONS.needsConfirmation });
      return;
    }
    const result = entry.derive(context);
    if (result.skip) plan.push({ fieldApiName: entry.apiName, skipReason: result.skip });
    else plan.push({ fieldApiName: entry.apiName, value: result.value ?? "" });
  });
  return plan;
}
