import test from "node:test";
import assert from "node:assert/strict";
import { parseCrmSyncRequestBody } from "../runQuestionnaireCrmSync.js";
import { seedDefinitionCrmMappings } from "../questionnaireCrmSeed.js";
import { synchronizeQuestionnaireCrm } from "../questionnaireSync.js";


const definition = {
  id: "def-1",
  revision: 1,
  pages: [
    {
      id: "main-details",
      route: "/intake/temporary-work/main-applicant/details",
      sectionKey: "details",
      scope: "profile",
      metadata: { profileRole: "main_applicant" },
      questions: [
        {
          id: "main-family",
          answerKey: "family_name",
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
      ],
    },
  ],
};

function zohoMock(t) {
  const calls = [];
  return {
    calls,
    client: {
      getAccessToken: async () => "token",
      getContactIdentity: async () => ({ Email: "client@example.com", Secondary_Email: "" }),
      getFieldMetadata: async () => [],
      updateRecord: async (module, recordId, fields) => {
        calls.push({ module, recordId, fields });
        return { status: "success", details: { id: recordId } };
      },
    },
  };
}

test("request body cannot choose Zoho module, record, field, or answer values", () => {
  const parsed = parseCrmSyncRequestBody({
    applicationId: "app-1",
    mode: "page",
    pageId: "main-details",
    module: "Leads",
    recordId: "hacked",
    fieldApiName: "Anything",
    value: "injected",
    answers: { family_name: "Nope" },
  });
  assert.deepEqual(parsed, {
    applicationId: "app-1",
    mode: "page",
    pageId: "main-details",
    profileId: null,
  });
});

test("CRM sync accepts Nano ID application IDs and rejects unsafe document paths", () => {
  for (const applicationId of ["_app-1", "-app_1", "app-1", "a".repeat(128)]) {
    assert.deepEqual(parseCrmSyncRequestBody({ applicationId, mode: "full" }), {
      applicationId,
      mode: "full",
      pageId: null,
      profileId: null,
    });
  }

  for (const applicationId of ["", " ", "/app", "app/other", "../app", "app\\other", "app%2Fother", "app id", "app\nother", "a".repeat(129)]) {
    assert.deepEqual(parseCrmSyncRequestBody({ applicationId, mode: "full" }), {
      error: "A valid applicationId is required",
      status: 400,
    });
  }
});

test("Deals-only synchronization reports a missing Matter link without attempting any CRM write", async () => {
  let calls = 0;
  const result = await synchronizeQuestionnaireCrm({
    application: { id: "app-1" },
    definition,
    draft: {
      profiles: [{ id: "main-1", relationship: "main_applicant" }],
      profiles_data: { "main-1": { details: { family_name: "Lovelace" } } },
    },
    mode: "page",
    pageId: "main-details",
    profileId: "main-1",
  }, {
    zoho: { updateRecord: async () => { calls += 1; } },
    flags: { enabled: true, dryRun: false },
    dealsOnly: true,
  });
  assert.equal(result.success, false);
  assert.equal(result.error.code, "missing_matter_id");
  assert.equal(calls, 0);
});

test("Deals-only sync retries valid fields when Zoho identifies one rejected field", async () => {
  const writes = [];
  const result = await synchronizeQuestionnaireCrm({
    application: { id: "app-1", zohoId: "deal-1" },
    definition,
    draft: {
      profiles: [{ id: "main-1", relationship: "main_applicant" }],
      profiles_data: { "main-1": { details: { family_name: "Lovelace", country_of_birth: "Country 1 test" } } },
    },
    mode: "page",
    pageId: "main-details",
    profileId: "main-1",
  }, {
    zoho: {
      getAccessToken: async () => "token",
      getFieldMetadata: async () => ["Family_Name", "Country_of_Birth", "Questionnaires_Status"]
        .map((api_name) => ({ api_name, data_type: "text" })),
      updateRecord: async (module, recordId, fields) => {
        writes.push({ module, recordId, fields: { ...fields } });
        if (fields.Country_of_Birth) {
          return { status: "error", code: "INVALID_DATA", details: { api_name: "Country_of_Birth" } };
        }
        return { status: "success", details: { id: recordId } };
      },
    },
    flags: { enabled: true, dryRun: false },
    dealsOnly: true,
  });
  assert.equal(result.success, true);
  assert.equal(writes.length, 2);
  assert.ok(writes.every(({ module }) => module === "Deals"));
  assert.equal(writes[0].fields.Country_of_Birth, "Country 1 test");
  assert.equal(writes[1].fields.Country_of_Birth, undefined);
  assert.equal(writes[1].fields.Family_Name, "Lovelace");
  assert.ok(result.summary.attention.some((item) => item.fieldApiName === "Country_of_Birth" && item.skipReason === "zoho_rejected_field"));
});

test("writes grouped Zoho payloads from saved answers", async () => {
  const { calls, client } = zohoMock();
  const jobs = [];
  const result = await synchronizeQuestionnaireCrm(
    {
      application: { id: "app-1", zohoId: "deal-1" },
      userProfile: { zohoContactId: "contact-1", email: "client@example.com" },
      definition,
      draft: {
        profiles: [{ id: "main-1", relationship: "main_applicant" }],
        profiles_data: { "main-1": { details: { family_name: "Lovelace" } } },
      },
      mode: "page",
      pageId: "main-details",
      profileId: "main-1",
    },
    {
      zoho: client,
      flags: { enabled: true, dryRun: false },
      persistJob: async (job) => jobs.push(job),
    },
  );
  assert.equal(result.success, true);
  assert.deepEqual(calls, [
    { module: "Contacts", recordId: "contact-1", fields: { Last_Name: "Lovelace" } },
    {
      module: "Deals",
      recordId: "deal-1",
      fields: { Family_Name: "Lovelace", Questionnaires_Status: "In Progress" },
    },
  ]);
  assert.equal(jobs.at(-1).state, "succeeded");
  assert.equal(jobs.at(-1).targets[0].fieldApiNames.includes("Last_Name"), true);
  assert.equal(JSON.stringify(jobs.at(-1)).includes("Lovelace"), false);
});

test("missing token and Zoho errors become durable failures", async () => {
  const jobs = [];
  const missingToken = await synchronizeQuestionnaireCrm(
    {
      application: { id: "app-1" },
      userProfile: { zohoContactId: "contact-1", email: "client@example.com" },
      definition,
      draft: {
        profiles: [{ id: "main-1", relationship: "main_applicant" }],
        profiles_data: { "main-1": { details: { family_name: "Lovelace" } } },
      },
      mode: "full",
    },
    {
      zoho: { getAccessToken: async () => null },
      flags: { enabled: true, dryRun: false },
      persistJob: async (job) => jobs.push(job),
    },
  );
  assert.equal(missingToken.success, false);
  assert.equal(missingToken.error.code, "missing_zoho_token");
  assert.equal(jobs.at(-1).state, "failed");

  const failed = await synchronizeQuestionnaireCrm(
    {
      application: { id: "app-1" },
      userProfile: { zohoContactId: "contact-1", email: "client@example.com" },
      definition,
      draft: {
        profiles: [{ id: "main-1", relationship: "main_applicant" }],
        profiles_data: { "main-1": { details: { family_name: "Lovelace" } } },
      },
      mode: "full",
    },
    {
      zoho: {
        getAccessToken: async () => "token",
        getContactIdentity: async () => ({ Email: "client@example.com" }),
        updateRecord: async () => { throw Object.assign(new Error("unavailable"), { code: "SERVICE_UNAVAILABLE" }); },
      },
      flags: { enabled: true, dryRun: false },
      persistJob: async (job) => jobs.push(job),
    },
  );
  assert.equal(failed.success, false);
  assert.equal(failed.state, "failed");
});

test("retrying the same payload is idempotent", async () => {
  const { client, calls } = zohoMock();
  const jobs = [];
  const input = {
    application: { id: "app-1", zohoId: "deal-1" },
    userProfile: { zohoContactId: "contact-1", email: "client@example.com" },
    definition,
    draft: {
      profiles: [{ id: "main-1", relationship: "main_applicant" }],
      profiles_data: { "main-1": { details: { family_name: "Lovelace" } } },
    },
    mode: "full",
  };
  const first = await synchronizeQuestionnaireCrm(input, {
    zoho: client,
    flags: { enabled: true, dryRun: false },
    persistJob: async (job) => jobs.push(job),
  });
  const second = await synchronizeQuestionnaireCrm(input, {
    zoho: client,
    flags: { enabled: true, dryRun: false },
    persistJob: async (job) => jobs.push(job),
    existingJob: jobs.find((job) => job.state === "succeeded"),
  });
  assert.equal(first.success, true);
  assert.equal(second.idempotent, true);
  assert.equal(calls.length, 2);
});

test("content items are not persisted as CRM answers during page or full synchronization", async () => {
  const form = structuredClone(definition);
  form.pages[0].questions.unshift(
    { id: "heading-1", type: "heading", label: "Personal information" },
    { id: "paragraph-1", type: "paragraph", label: "Provide your details." },
  );
  const seeded = seedDefinitionCrmMappings(form);
  const { client, calls } = zohoMock();
  const jobs = [];
  const checkFirestoreValue = (value, path = "job") => {
    assert.notEqual(value, undefined, `${path} cannot contain undefined`);
    if (value && typeof value === "object") {
      for (const [key, item] of Object.entries(value)) checkFirestoreValue(item, `${path}.${key}`);
    }
  };
  const input = {
    application: { id: "app-1", zohoId: "deal-1" },
    userProfile: { zohoContactId: "contact-1", email: "client@example.com" },
    definition: seeded,
    draft: {
      profiles: [{ id: "main-1", relationship: "main_applicant" }],
      profiles_data: { "main-1": { details: { family_name: "Lovelace" } } },
    },
  };

  for (const mode of ["page", "full"]) {
    const result = await synchronizeQuestionnaireCrm({
      ...input,
      mode,
      ...(mode === "page" ? { pageId: "main-details", profileId: "main-1" } : {}),
    }, {
      zoho: client,
      flags: { enabled: true, dryRun: false },
      persistJob: async (job) => { checkFirestoreValue(job); jobs.push(job); },
    });
    assert.equal(result.success, true);
    assert.equal(result.summary.skipped.some((item) => ["heading-1", "paragraph-1"].includes(item.questionId)), false);
  }
  assert.equal(calls.length, 4);
  assert.equal(jobs.filter((job) => job.state === "succeeded").length, 2);
});
