import test from "node:test";
import assert from "node:assert/strict";
import { buildQuestionnaireCrmProjection } from "../questionnaireMapping.js";

function definition() {
  return {
    id: "temporary-work-482-v1",
    visaType: "temporary-work",
    visaContext: "482",
    title: "Test",
    version: "1.0.0",
    status: "active",
    schemaVersion: 1,
    revision: 3,
    pages: [
      {
        id: "main-details",
        route: "/intake/temporary-work/main-applicant/details",
        title: "Details",
        sectionKey: "details",
        scope: "profile",
        metadata: { profileRole: "main_applicant" },
        questions: [
          {
            id: "main-family",
            answerKey: "family_name",
            label: "Family Name",
            type: "text",
            metadata: {
              crm: {
                mode: "field",
                target: "main_contact",
                module: "Contacts",
                fieldApiName: "Last_Name",
                transform: "text",
                clearPolicy: "preserve_when_empty",
              },
            },
          },
          {
            id: "main-given",
            answerKey: "given_names",
            label: "Given Names",
            type: "text",
            metadata: {
              crm: {
                mode: "field",
                target: "main_contact",
                module: "Contacts",
                fieldApiName: "First_Name",
                transform: "text",
                clearPolicy: "preserve_when_empty",
              },
            },
          },
          {
            id: "main-gender",
            answerKey: "gender",
            label: "Gender",
            type: "radio",
            options: [
              { value: "Male", label: "Male" },
              { value: "Female", label: "Female" },
              { value: "Other", label: "Other" },
            ],
            metadata: {
              crm: {
                mode: "field",
                target: "main_contact",
                module: "Contacts",
                fieldApiName: "Gender",
                transform: "picklist",
                clearPolicy: "preserve_when_empty",
                optionMap: { Male: "Male", Female: "Female" },
              },
            },
          },
          {
            id: "main-birth",
            answerKey: "birth",
            label: "Date of Birth",
            type: "dateParts",
            parts: { day: "birth_day", month: "birth_month", year: "birth_year" },
            metadata: {
              crm: {
                mode: "field",
                target: "main_contact",
                module: "Contacts",
                fieldApiName: "Date_of_Birth",
                transform: "date_parts_to_iso",
                clearPolicy: "preserve_when_empty",
              },
            },
          },
          {
            id: "main-notes",
            answerKey: "notes",
            label: "Notes",
            type: "textarea",
            metadata: { crm: { mode: "portal_only" } },
          },
        ],
      },
      {
        id: "spouse-details",
        route: "/intake/temporary-work/spouse-partner/details",
        title: "Details",
        sectionKey: "details",
        scope: "profile",
        metadata: { profileRole: "spouse" },
        questions: [
          {
            id: "spouse-family",
            answerKey: "family_name",
            label: "Family Name",
            type: "text",
            metadata: {
              crm: {
                mode: "field",
                target: "profile_record",
                module: "Partner_Dependents",
                fieldApiName: "Name",
                transform: "text",
                clearPolicy: "preserve_when_empty",
              },
            },
          },
        ],
      },
    ],
  };
}

const draft = {
  profiles: [
    { id: "main-1", relationship: "main_applicant" },
    { id: "spouse-1", relationship: "spouse", zohoDependentId: "dep-1" },
    { id: "child-1", relationship: "child", zohoDependentId: "dep-2" },
  ],
  profiles_data: {
    "main-1": {
      details: {
        family_name: "Lovelace",
        given_names: "Ada",
        gender: "Female",
        birth_day: "10",
        birth_month: "12",
        birth_year: "1815",
        notes: "portal only",
      },
    },
    "spouse-1": { details: { family_name: "King" } },
    "child-1": { details: { family_name: "Ignored" } },
  },
};

test("projects a saved main-applicant page onto Contacts fields", () => {
  const projection = buildQuestionnaireCrmProjection({
    definition: definition(),
    draft,
    application: { id: "app-1", zohoId: "deal-1" },
    userProfile: { zohoContactId: "contact-1" },
    mode: "page",
    pageId: "main-details",
    profileId: "main-1",
  });
  assert.equal(projection.groups.length, 1);
  assert.equal(projection.groups[0].module, "Contacts");
  assert.equal(projection.groups[0].recordId, "contact-1");
  assert.deepEqual(projection.groups[0].fields, {
    Last_Name: "Lovelace",
    First_Name: "Ada",
    Gender: "Female",
    Date_of_Birth: "1815-12-10",
  });
  assert.equal(projection.mappings.find((item) => item.answerKey === "notes").skipReason, "portal_only");
});

test("projects a spouse page only onto that dependant's Partner_Dependents record", () => {
  const projection = buildQuestionnaireCrmProjection({
    definition: definition(),
    draft,
    application: { id: "app-1", zohoId: "deal-1" },
    userProfile: { zohoContactId: "contact-1" },
    mode: "page",
    pageId: "spouse-details",
    profileId: "spouse-1",
  });
  assert.equal(projection.groups.length, 1);
  assert.deepEqual(projection.groups[0].module, "Partner_Dependents");
  assert.equal(projection.groups[0].recordId, "dep-1");
  assert.deepEqual(projection.groups[0].fields, { Name: "King" });
});

test("full reconciliation groups payloads without flattening portal-only answers", () => {
  const projection = buildQuestionnaireCrmProjection({
    definition: definition(),
    draft,
    application: { id: "app-1", zohoId: "deal-1" },
    userProfile: { zohoContactId: "contact-1" },
    mode: "full",
  });
  assert.equal(projection.groups.length, 2);
  assert.ok(projection.groups.some((group) => group.module === "Contacts"));
  assert.ok(projection.groups.some((group) => group.recordId === "dep-1"));
  assert.equal(projection.groups.some((group) => group.recordId === "dep-2"), false);
});
