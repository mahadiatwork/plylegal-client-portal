import test from "node:test";
import assert from "node:assert/strict";
import { parseCrmSyncRequestBody } from "../runQuestionnaireCrmSync.js";
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

test("writes grouped Zoho payloads from saved answers", async () => {
  const { calls, client } = zohoMock();
  const jobs = [];
  const result = await synchronizeQuestionnaireCrm(
    {
      application: { id: "app-1", zohoId: "deal-1" },
      userProfile: { zohoContactId: "contact-1" },
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
  assert.deepEqual(calls, [{ module: "Contacts", recordId: "contact-1", fields: { Last_Name: "Lovelace" } }]);
  assert.equal(jobs.at(-1).state, "succeeded");
  assert.equal(jobs.at(-1).targets[0].fieldApiNames.includes("Last_Name"), true);
  assert.equal(JSON.stringify(jobs.at(-1)).includes("Lovelace"), false);
});

test("missing token and Zoho errors become durable failures", async () => {
  const jobs = [];
  const missingToken = await synchronizeQuestionnaireCrm(
    {
      application: { id: "app-1" },
      userProfile: { zohoContactId: "contact-1" },
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
      userProfile: { zohoContactId: "contact-1" },
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
    application: { id: "app-1" },
    userProfile: { zohoContactId: "contact-1" },
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
  assert.equal(calls.length, 1);
});
