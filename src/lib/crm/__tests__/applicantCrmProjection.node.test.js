import test from "node:test";
import assert from "node:assert/strict";
import { buildCanonicalApplicantCrmMappings } from "../applicantCrmProjection.js";

const definition = {
  id: "protection-866",
  pages: [
    { id: "main-details", sectionKey: "details", scope: "profile", metadata: { profileRole: "main_applicant" } },
    { id: "main-identity", sectionKey: "identity", scope: "profile", metadata: { profileRole: "main_applicant" } },
    { id: "child-details", sectionKey: "details", scope: "profile", metadata: { profileRole: "child" } },
    { id: "child-identity", sectionKey: "identity", scope: "profile", metadata: { profileRole: "child" } },
  ],
};

const draft = {
  profiles: [
    {
      id: "main-1",
      relationship: "main_applicant",
      family_name: "Old Family",
      given_names: "Old Given",
      birth_day: "10",
      birth_month: "December",
      birth_year: "1985",
    },
    {
      id: "child-1",
      relationship: "child",
      family_name: "Hasan",
      given_names: "Mehraj",
      birth_day: "16",
      birth_month: "November",
      birth_year: "2025",
      zohoDependentId: "dep-1",
    },
  ],
  profiles_data: {
    "main-1": {
      details: {
        family_name: "Hassan",
        given_names: "Mahmudul",
        gender: "Male",
        birth_day: "12",
        birth_month: "10",
        birth_year: "1983",
        marital_status: "Never Married",
        country_of_birth: "Bangladesh",
      },
      identity: {
        passports: [{
          document_number: "P1234567",
          passport_country: "Bangladesh",
          date_expiry_day: "7",
          date_expiry_month: "March",
          date_expiry_year: "2031",
          is_current: "yes",
        }],
        citizenships: [{ country: "Bangladesh" }],
      },
    },
  },
};

function readyFields(mappings, module, recordId) {
  return Object.fromEntries(mappings
    .filter((item) => item.status === "ready" && item.module === module && item.recordId === recordId)
    .map((item) => [item.fieldApiName, item.value]));
}

test("questionnaire details override stale roster values for the Matter and Contact", () => {
  const mappings = buildCanonicalApplicantCrmMappings({
    definition,
    draft,
    application: { zohoId: "matter-1" },
    userProfile: { zohoContactId: "contact-1" },
    mode: "page",
    pageId: "main-details",
    profileId: "main-1",
  });
  const matter = readyFields(mappings, "Deals", "matter-1");
  const contact = readyFields(mappings, "Contacts", "contact-1");
  assert.equal(matter.Family_Name, "Hassan");
  assert.equal(matter.Date_of_Birth, "1983-10-12");
  assert.equal(matter.Marital_Status, "Never Married or been in a De Facto Relationship");
  assert.equal(matter.Country_of_Birth, "Bangladesh");
  assert.equal(contact.Date_of_Birth, "1983-10-12");
});

test("passport and citizenship repeaters use the CRM fields supplied for the Matter", () => {
  const mappings = buildCanonicalApplicantCrmMappings({
    definition,
    draft,
    application: { zohoId: "matter-1" },
    userProfile: { zohoContactId: "contact-1" },
    mode: "page",
    pageId: "main-identity",
    profileId: "main-1",
  });
  const matter = readyFields(mappings, "Deals", "matter-1");
  assert.equal(matter.City_Town_of_Birth, "Bangladesh");
  assert.equal(matter.State_or_Province_of_Birth, "P1234567");
  assert.equal(Object.hasOwn(matter, "Marital_Status"), false);
});

test("dependants fall back to roster identity when no questionnaire details exist", () => {
  const mappings = buildCanonicalApplicantCrmMappings({
    definition,
    draft,
    application: { zohoId: "matter-1" },
    userProfile: { zohoContactId: "contact-1" },
    mode: "page",
    pageId: "child-details",
    profileId: "child-1",
  });
  const child = readyFields(mappings, "Partner_Dependents", "dep-1");
  assert.equal(child.First_Name, "Mehraj");
  assert.equal(child.Name, "Hasan");
  assert.equal(child.Date_of_Birth, "2025-11-16");
  assert.equal(child.Relationship_to_Applicant, "Children");
  assert.deepEqual(child.Contact_Name, { id: "contact-1" });
});
