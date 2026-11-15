import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildCanonicalApplicantCrmMappings } from "../applicantCrmProjection.js";
import { buildQuestionnaireCrmProjection } from "../questionnaireMapping.js";
import { hasInvalidEnabledCrmMapping } from "../questionnaireCrmContract.js";
import {
  CONTACT_FIELD_INVENTORY,
  composeMobileNumber,
  selectCurrentPassport,
} from "../contactCrmProjection.js";
import { CRM_FIELD_CATALOG } from "../crmFieldCatalog.js";

const temporaryWork = JSON.parse(readFileSync(
  new URL("../../../../e2e/fixtures/built-in-temporary-work-482.json", import.meta.url),
  "utf8",
));

const pageIds = {
  details: "temporary-work-main-applicant-details",
  identity: "temporary-work-main-applicant-identity",
  contact: "temporary-work-main-applicant-contact-details",
  spouseDetails: "temporary-work-spouse-partner-details",
};

function draftWith({ details = {}, identity = {}, contact = {}, extra = {} } = {}) {
  return {
    profiles: [
      { id: "main-1", relationship: "main_applicant" },
      { id: "spouse-1", relationship: "spouse", zohoDependentId: "dep-spouse" },
    ],
    profiles_data: {
      "main-1": { details, identity, contact_details: contact },
      "spouse-1": {
        details: { given_names: "Sam", family_name: "Spouse", city_of_birth: "Spouseville", marital_status: "Married" },
        identity: { passports: [{ document_number: "SPOUSE9", passport_country: "Peru", document_status: "Current" }] },
      },
    },
    ...extra,
  };
}

const fullDetails = {
  given_names: "Ada",
  family_name: "Lovelace",
  gender: "Female",
  birth_day: "10",
  birth_month: "December",
  birth_year: "1985",
  marital_status: "Never Married",
  country_of_birth: "United Kingdom",
  city_of_birth: "London",
  state_of_birth: "Greater London",
  citizenships: [{ country: "United Kingdom", still_citizen: "yes" }],
};
const fullIdentity = {
  passports: [
    { document_type: "Passport", document_number: "P1234567", passport_country: "United Kingdom", nationality: "United Kingdom", date_expiry_day: "7", date_expiry_month: "March", date_expiry_year: "2031", document_status: "Current" },
    { document_type: "Passport", document_number: "OLD0001", passport_country: "United Kingdom", date_expiry_day: "1", date_expiry_month: "1", date_expiry_year: "2015", document_status: "Expired" },
  ],
};
const fullContact = { phone: "0291234567", mobile: "+61412345678", usual_country_of_residence: "Australia" };

function contacts(mappings, status = "ready") {
  return Object.fromEntries(mappings
    .filter((item) => item.module === "Contacts" && item.status === status)
    .map((item) => [item.fieldApiName, status === "ready" ? item.value : item.skipReason]));
}

function build(draft, options = {}) {
  return buildCanonicalApplicantCrmMappings({
    definition: temporaryWork,
    draft,
    application: { zohoId: "deal-1" },
    userProfile: { zohoContactId: "contact-1" },
    ...options,
  });
}

test("every Contacts screenshot field is in the catalog with the exact API name and a mapping decision", () => {
  const expected = [
    "First_Name", "Last_Name", "Preferred_Name", "Gender", "Date_of_Birth", "Nationality", "Country_of_Birth",
    "City_Town_of_Birth", "State_or_Province_of_Birth", "Relationship_Status", "Country_of_Passport", "Passport_No",
    "Passport_Expiry_Date", "Country_of_Residence", "Current_Visa", "Visa_Expiry_Date", "Email", "Secondary_Email",
    "Phone", "Mobile", "Home_Phone", "Mailing_Street", "Mailing_Suburb", "Mailing_City", "Mailing_State",
    "Mailing_Country", "Mailing_Zip", "Address_1_City", "Address_1_Country_Region", "Address_1_State_Province",
    "Address_1_Street_Address", "Address_1_Zip_Postal_Code",
  ];
  expected.forEach((apiName) => {
    assert.ok(CRM_FIELD_CATALOG.Contacts[apiName], `${apiName} missing from the Contacts catalog`);
    assert.ok(CONTACT_FIELD_INVENTORY.some((entry) => entry.apiName === apiName), `${apiName} has no sync/hold decision`);
  });
  // Truncated/guessed names must not appear.
  assert.equal(CRM_FIELD_CATALOG.Contacts.Mailing_Province, undefined);
  assert.equal(CRM_FIELD_CATALOG.Contacts.Citizenship, undefined);
  assert.equal(CRM_FIELD_CATALOG.Contacts.Passport_Number, undefined);
  CONTACT_FIELD_INVENTORY.filter((entry) => entry.sync === "hold").forEach((entry) => {
    assert.ok(entry.holdReason, `${entry.apiName} is held without a reason`);
  });
});

test("full reconciliation maps every established answer to the exact Contacts field", () => {
  const mappings = build(draftWith({ details: fullDetails, identity: fullIdentity, contact: fullContact }), { mode: "full" });
  const sent = contacts(mappings);
  assert.deepEqual(sent, {
    First_Name: "Ada",
    Last_Name: "Lovelace",
    Gender: "Female",
    Date_of_Birth: "1985-12-10",
    Country_of_Birth: "United Kingdom",
    City_Town_of_Birth: "London",
    State_or_Province_of_Birth: "Greater London",
    Relationship_Status: "Never Married or been in a De Facto Relationship",
    Nationality: "United Kingdom",
    Country_of_Passport: "United Kingdom",
    Passport_No: "P1234567",
    Passport_Expiry_Date: "2031-03-07",
    Country_of_Residence: "Australia",
    Phone: "0291234567",
    Mobile: "+61412345678",
  });
  mappings.filter((item) => item.module === "Contacts" && item.status === "ready").forEach((item) => {
    assert.equal(item.recordId, "contact-1");
    assert.equal(item.target, "main_contact");
  });
});

test("saving a real (prefixed sectionKey) page now synchronizes its Contacts fields", () => {
  const draft = draftWith({ details: fullDetails, identity: fullIdentity, contact: fullContact });
  const details = contacts(build(draft, { mode: "page", pageId: pageIds.details, profileId: "main-1" }));
  assert.equal(details.City_Town_of_Birth, "London");
  assert.equal(details.Relationship_Status, "Never Married or been in a De Facto Relationship");
  assert.equal(Object.hasOwn(details, "Passport_No"), false);
  assert.equal(Object.hasOwn(details, "Phone"), false);

  const identity = contacts(build(draft, { mode: "page", pageId: pageIds.identity, profileId: "main-1" }));
  assert.deepEqual(Object.keys(identity).sort(), ["Country_of_Passport", "Nationality", "Passport_Expiry_Date", "Passport_No"]);

  const contact = contacts(build(draft, { mode: "page", pageId: pageIds.contact, profileId: "main-1" }));
  assert.deepEqual(Object.keys(contact).sort(), ["Country_of_Residence", "Mobile", "Phone"]);
});

test("Deal and dependent mappings are unchanged by the Contacts work", () => {
  const mappings = build(draftWith({ details: fullDetails, identity: fullIdentity, contact: fullContact }), { mode: "full" });
  const deal = Object.fromEntries(mappings.filter((item) => item.module === "Deals" && item.status === "ready").map((item) => [item.fieldApiName, item.value]));
  // Existing (unverified) Deal behaviour is preserved exactly, and kept separate from Contacts.
  assert.equal(deal.City_Town_of_Birth, "United Kingdom");
  assert.equal(deal.State_or_Province_of_Birth, "P1234567");
  assert.equal(deal.Marital_Status, "Never Married or been in a De Facto Relationship");
  const spouse = mappings.filter((item) => item.module === "Partner_Dependents" && item.status === "ready" && item.recordId === "dep-spouse");
  assert.ok(spouse.some((item) => item.fieldApiName === "Relationship_Status" && item.value === "Married"));
  assert.equal(
    mappings.find((item) => item.module === "Contacts" && item.fieldApiName === "City_Town_of_Birth" && item.status === "ready").value,
    "London",
  );
});

test("a spouse's answers are never written to the main applicant's Contact", () => {
  const draft = draftWith({ details: fullDetails, identity: fullIdentity, contact: fullContact });
  const full = build(draft, { mode: "full" });
  const contactValues = Object.values(contacts(full));
  ["Sam", "Spouse", "Spouseville", "SPOUSE9", "Peru", "Married"].forEach((value) => {
    assert.equal(contactValues.includes(value), false, `${value} leaked into the Contact`);
  });
  const spousePage = build(draft, { mode: "page", pageId: pageIds.spouseDetails, profileId: "spouse-1" });
  assert.equal(spousePage.some((item) => item.module === "Contacts"), false);
  // Spouse data still reaches its own Partner_Dependents record (full reconciliation).
  assert.ok(full.some((item) => item.module === "Partner_Dependents" && item.recordId === "dep-spouse" && item.status === "ready"));
});

test("builder mappings to main_contact are rejected on non-main-applicant pages", () => {
  const definition = {
    id: "x",
    pages: [
      {
        id: "spouse-details", route: "/intake/temporary-work/spouse-partner/details", sectionKey: "details", scope: "profile",
        metadata: { profileRole: "spouse" },
        questions: [{ id: "q1", answerKey: "city_of_birth", type: "text", metadata: { crm: { mode: "field", target: "main_contact", module: "Contacts", fieldApiName: "City_Town_of_Birth", transform: "text" } } }],
      },
      {
        id: "main-details", route: "/intake/temporary-work/main-applicant/details", sectionKey: "details", scope: "profile",
        metadata: { profileRole: "main_applicant" },
        questions: [{ id: "q2", answerKey: "city_of_birth", type: "text", metadata: { crm: { mode: "field", target: "main_contact", module: "Contacts", fieldApiName: "City_Town_of_Birth", transform: "text" } } }],
      },
    ],
  };
  const issues = hasInvalidEnabledCrmMapping(definition);
  // The spouse page is rejected (and its duplicate destination is also flagged).
  assert.ok(issues.some((issue) => /pages\[0\].*main_contact.*main applicant/.test(issue)), issues.join("\n"));
  assert.equal(issues.some((issue) => /pages\[1\].*only allowed on main applicant/.test(issue)), false);
  const draft = {
    profiles: [{ id: "m", relationship: "main_applicant" }, { id: "s", relationship: "spouse" }],
    profiles_data: { m: { details: { city_of_birth: "Rome" } }, s: { details: { city_of_birth: "Paris" } } },
  };
  const projection = buildQuestionnaireCrmProjection({ definition, draft, userProfile: { zohoContactId: "contact-1" }, mode: "full" });
  const spouse = projection.mappings.find((item) => item.questionId === "q1");
  assert.equal(spouse.status, "failed");
  assert.equal(spouse.error, "contact_target_requires_main_applicant");
  assert.deepEqual(projection.groups.filter((group) => group.module === "Contacts").map((group) => group.fields), [{ City_Town_of_Birth: "Rome" }]);
});

test("dates are converted to YYYY-MM-DD and impossible dates are reported, not guessed", () => {
  const numeric = contacts(build(draftWith({
    details: { ...fullDetails, birth_day: "5", birth_month: "3", birth_year: "1990" },
    identity: { passports: [{ document_number: "A1", passport_country: "France", document_status: "Current", date_expiry_day: "9", date_expiry_month: "11", date_expiry_year: "2030" }] },
  }), { mode: "full" }));
  assert.equal(numeric.Date_of_Birth, "1990-03-05");
  assert.equal(numeric.Passport_Expiry_Date, "2030-11-09");

  const invalid = build(draftWith({
    details: { ...fullDetails, birth_day: "31", birth_month: "February", birth_year: "1990" },
    identity: { passports: [{ document_number: "A1", passport_country: "France", document_status: "Current", date_expiry_day: "9", date_expiry_month: "Smarch", date_expiry_year: "2030" }] },
  }), { mode: "full" });
  const reasons = contacts(invalid, "skipped");
  assert.equal(reasons.Date_of_Birth, "invalid_date");
  assert.equal(reasons.Passport_Expiry_Date, "invalid_date");
  assert.equal(Object.hasOwn(contacts(invalid), "Date_of_Birth"), false);
});

test("picklist values are mapped, and unsupported choices are reported instead of guessed", () => {
  const statuses = {
    "Never Married": "Never Married or been in a De Facto Relationship",
    "De Facto Relationship": "De Facto Relationship",
    Widowed: "Widowed",
  };
  Object.entries(statuses).forEach(([portal, zoho]) => {
    const sent = contacts(build(draftWith({ details: { ...fullDetails, marital_status: portal } }), { mode: "full" }));
    assert.equal(sent.Relationship_Status, zoho);
  });
  const odd = build(draftWith({ details: { ...fullDetails, marital_status: "It's complicated", gender: "Indeterminate" } }), { mode: "full" });
  const skipped = contacts(odd, "skipped");
  assert.equal(skipped.Relationship_Status, "unsupported_picklist_value");
  assert.equal(skipped.Gender, "unsupported_picklist_value");
  assert.equal(Object.hasOwn(contacts(odd), "Gender"), false);
});

test("empty answers never produce a write that could erase CRM data", () => {
  const mappings = build(draftWith({ details: {}, identity: {}, contact: {} }), { mode: "full" });
  assert.deepEqual(contacts(mappings), {});
  const preserved = mappings.filter((item) => item.module === "Contacts" && item.skipReason === "preserve_when_empty");
  assert.ok(preserved.length > 10);
  assert.ok(mappings.every((item) => item.module !== "Contacts" || item.value !== ""));
  // Clearing a field in the portal also leaves the populated CRM value alone.
  const cleared = contacts(build(draftWith({ details: { ...fullDetails, city_of_birth: "   ", state_of_birth: "" } }), { mode: "full" }));
  assert.equal(Object.hasOwn(cleared, "City_Town_of_Birth"), false);
  assert.equal(Object.hasOwn(cleared, "State_or_Province_of_Birth"), false);
});

test("current passport rule: one Current passport wins, ambiguity is reported", () => {
  const one = selectCurrentPassport(fullIdentity.passports);
  assert.equal(one.passport.document_number, "P1234567");

  assert.equal(selectCurrentPassport([{ document_number: "ONLY" }]).passport.document_number, "ONLY");
  assert.equal(selectCurrentPassport([{ document_number: "A", document_status: "Expired" }]).passport, null);
  assert.equal(selectCurrentPassport([{ document_type: "National ID", document_number: "ID", document_status: "Current" }]).passport, null);
  assert.equal(selectCurrentPassport([{ document_number: "L", is_current: "yes" }, { document_number: "M" }]).passport.document_number, "L");

  const two = build(draftWith({
    details: fullDetails,
    identity: { passports: [
      { document_number: "A1", passport_country: "France", document_status: "Current" },
      { document_number: "B2", passport_country: "Spain", document_status: "Current" },
    ] },
  }), { mode: "full" });
  assert.equal(contacts(two).Passport_No, undefined);
  assert.equal(contacts(two).Country_of_Passport, undefined);
  assert.equal(contacts(two, "skipped").Passport_No, "ambiguous_current_passport");
  assert.equal(contacts(two, "skipped").Passport_Expiry_Date, "ambiguous_current_passport");
});

test("primary citizenship rule: one current citizenship, passport tie-break, otherwise ambiguous", () => {
  const nationality = (details, identity = fullIdentity) => {
    const mappings = build(draftWith({ details: { ...fullDetails, ...details }, identity }), { mode: "full" });
    return { sent: contacts(mappings).Nationality, skipped: contacts(mappings, "skipped").Nationality };
  };
  // Ceased citizenships are ignored.
  assert.equal(nationality({ citizenships: [
    { country: "Ireland", still_citizen: "no" },
    { country: "United Kingdom", still_citizen: "yes" },
  ] }).sent, "United Kingdom");
  // Two current citizenships: the current passport's nationality breaks the tie.
  assert.equal(nationality({ citizenships: [
    { country: "France", still_citizen: "yes" },
    { country: "United Kingdom", still_citizen: "yes" },
  ] }).sent, "United Kingdom");
  // No tie-break available: nothing is written and the case is reported.
  const ambiguous = nationality({ citizenships: [
    { country: "France", still_citizen: "yes" },
    { country: "Ireland", still_citizen: "yes" },
  ] });
  assert.equal(ambiguous.sent, undefined);
  assert.equal(ambiguous.skipped, "ambiguous_primary_citizenship");
  // Citizen of the passport country answered yes, no rows.
  assert.equal(nationality({ citizenships: [], citizenship_of_passport_country: "yes" }).sent, "United Kingdom");
});

test("Partner/Protection shared contact details: mobile, shared postal address and unshared answers", () => {
  const definition = {
    id: "partner",
    pages: [
      { id: "p-contact", route: "/intake/partner/all-applicants/contact-details", sectionKey: "partner_contact_details", scope: "shared", metadata: { storagePath: "partner_contact_details" }, questions: [] },
    ],
  };
  const run = (shared) => contacts(buildCanonicalApplicantCrmMappings({
    definition,
    draft: { profiles: [{ id: "main-1", relationship: "main_applicant" }], partner_contact_details: shared },
    userProfile: { zohoContactId: "contact-1" },
    mode: "page",
    pageId: "p-contact",
  }));
  const sharedYes = run({
    share_contact_phone_numbers: "Yes", mobile_country_code: "+61", mobile_number: "0412 345 678",
    share_postal_address: "Yes", postal_address: "1 George St", postal_address_line2: "Unit 2", postal_suburb: "Sydney",
    postal_state: "NSW", postal_postcode: "2000", postal_country: "Australia",
  });
  assert.deepEqual(sharedYes, {
    Mobile: "+61412345678",
    Mailing_Street: "1 George St, Unit 2",
    Mailing_Suburb: "Sydney",
    Mailing_State: "NSW",
    Mailing_Zip: "2000",
    Mailing_Country: "Australia",
  });
  // Not shared with every applicant: the page cannot be attributed to the main applicant.
  const notShared = buildCanonicalApplicantCrmMappings({
    definition,
    draft: { profiles: [{ id: "main-1", relationship: "main_applicant" }], partner_contact_details: { share_postal_address: "No", postal_address: "9 Other Rd", share_contact_phone_numbers: "No", mobile_number: "0400000000" } },
    userProfile: { zohoContactId: "contact-1" },
    mode: "page",
    pageId: "p-contact",
  });
  assert.deepEqual(contacts(notShared), {});
  assert.equal(contacts(notShared, "skipped").Mailing_Street, "postal_details_not_shared_with_main_applicant");
});

test("mobile numbers are composed as E.164 or reported", () => {
  assert.deepEqual(composeMobileNumber("+61", "0412 345 678"), { value: "+61412345678" });
  assert.deepEqual(composeMobileNumber("Australia (+61)", "412345678"), { value: "+61412345678" });
  assert.deepEqual(composeMobileNumber("", "+441234567890"), { value: "+441234567890" });
  assert.deepEqual(composeMobileNumber("+61", ""), { value: "" });
  assert.equal(composeMobileNumber("Australia", "0412345678").skip, "ambiguous_phone_country_code");
  assert.equal(composeMobileNumber("+61", "04-abc").skip, "invalid_phone_number");
});

test("ambiguous or unconfirmed fields are held and listed on full reconciliation", () => {
  const mappings = build(draftWith({ details: fullDetails, identity: fullIdentity, contact: { ...fullContact, email: "x@y.com", residential_address: [{ address_line: "1 Rd" }] } }), { mode: "full" });
  const held = contacts(mappings, "skipped");
  ["Email", "Secondary_Email", "Home_Phone", "Mailing_City", "Current_Visa", "Visa_Expiry_Date",
    "Address_1_Street_Address", "Address_1_City", "Address_1_State_Province", "Address_1_Zip_Postal_Code", "Address_1_Country_Region"].forEach((apiName) => {
    assert.equal(held[apiName], "needs_confirmation", apiName);
  });
  // The residential address must not be written to the mailing fields.
  const sent = contacts(mappings);
  assert.equal(Object.keys(sent).some((name) => name.startsWith("Mailing_") || name.startsWith("Address_1_")), false);
  assert.equal(Object.hasOwn(sent, "Email"), false);
});
