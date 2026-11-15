import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { synchronizeQuestionnaireCrm } from "../questionnaireSync.js";
import { gateFieldValue, indexFieldMetadata } from "../crmFieldGate.js";
import { sanitizeCrmSyncError } from "../crmSyncJobs.js";

const definition = JSON.parse(readFileSync(
  new URL("../../../../e2e/fixtures/built-in-temporary-work-482.json", import.meta.url),
  "utf8",
));

const draft = {
  profiles: [
    { id: "main-1", relationship: "main_applicant" },
    { id: "spouse-1", relationship: "spouse", zohoDependentId: "dep-spouse" },
  ],
  profiles_data: {
    "main-1": {
      details: {
        given_names: "Ada", family_name: "Lovelace", gender: "Female",
        birth_day: "10", birth_month: "December", birth_year: "1985",
        marital_status: "Married", country_of_birth: "United Kingdom",
        city_of_birth: "London", state_of_birth: "Greater London",
        citizenships: [{ country: "United Kingdom", still_citizen: "yes" }],
      },
      identity: {
        passports: [{ document_number: "P1234567", passport_country: "United Kingdom", document_status: "Current", date_expiry_day: "7", date_expiry_month: "3", date_expiry_year: "2031" }],
      },
      contact_details: { phone: "0291234567", mobile: "+61412345678", usual_country_of_residence: "Australia" },
    },
    "spouse-1": { details: { given_names: "Sam", family_name: "Lovelace", city_of_birth: "Paris" } },
  },
};

const liveMetadata = [
  ...["First_Name", "Last_Name", "Preferred_Name", "City_Town_of_Birth", "State_or_Province_of_Birth", "Passport_No", "Phone", "Mobile"]
    .map((api_name) => ({ api_name, data_type: "text", length: 40, read_only: false })),
  { api_name: "Gender", data_type: "picklist", pick_list_values: [{ actual_value: "Male" }, { actual_value: "Female" }] },
  { api_name: "Date_of_Birth", data_type: "date" },
  { api_name: "Passport_Expiry_Date", data_type: "date" },
  { api_name: "Relationship_Status", data_type: "picklist", pick_list_values: [{ actual_value: "Married" }, { actual_value: "Single" }] },
  { api_name: "Country_of_Birth", data_type: "picklist", pick_list_values: [{ actual_value: "United Kingdom" }, { actual_value: "Australia" }] },
  { api_name: "Nationality", data_type: "picklist", pick_list_values: [{ actual_value: "British" }, { actual_value: "Australian" }] },
  { api_name: "Country_of_Passport", data_type: "picklist", pick_list_values: [{ actual_value: "United Kingdom" }] },
  { api_name: "Country_of_Residence", data_type: "picklist", pick_list_values: [{ actual_value: "Australia" }] },
];

function fakeZoho(overrides = {}) {
  const calls = [];
  return {
    calls,
    getAccessToken: async () => "token",
    getContactIdentity: async () => ({ Email: "Ada@Example.com", Secondary_Email: "" }),
    getFieldMetadata: async () => liveMetadata,
    updateRecord: async (module, recordId, fields) => {
      calls.push({ module, recordId, fields: { ...fields } });
      return { status: "success", code: "SUCCESS", details: { id: recordId } };
    },
    ...overrides,
  };
}

function run(zoho, input = {}, deps = {}) {
  const jobs = [];
  const promise = synchronizeQuestionnaireCrm({
    application: { id: "app-1", zohoId: "deal-1" },
    userProfile: { zohoContactId: "contact-1", email: "ada@example.com" },
    definition,
    draft,
    mode: "full",
    ...input,
  }, {
    zoho,
    flags: { enabled: true, dryRun: false },
    persistJob: async (job) => jobs.push(JSON.parse(JSON.stringify(job))),
    ...deps,
  });
  return promise.then((result) => ({ result, jobs }));
}

const contactCall = (zoho) => zoho.calls.find((call) => call.module === "Contacts");

test("full reconciliation writes one Contacts update to the verified Contact only after Zoho confirms", async () => {
  const zoho = fakeZoho();
  const { result, jobs } = await run(zoho);
  assert.equal(result.success, true, JSON.stringify(result.error));
  const contactUpdates = zoho.calls.filter((call) => call.module === "Contacts");
  assert.equal(contactUpdates.length, 1);
  assert.equal(contactUpdates[0].recordId, "contact-1");
  assert.equal(contactUpdates[0].fields.City_Town_of_Birth, "London");
  assert.equal(contactUpdates[0].fields.Relationship_Status, "Married");
  assert.equal(contactUpdates[0].fields.Passport_Expiry_Date, "2031-03-07");
  // Spouse answers go to the spouse's dependent record, never to the Contact.
  const spouse = zoho.calls.find((call) => call.recordId === "dep-spouse");
  assert.equal(spouse.module, "Partner_Dependents");
  assert.equal(Object.values(contactUpdates[0].fields).includes("Paris"), false);
  assert.equal(jobs.at(-1).state, "succeeded");
  // Fields awaiting confirmation are surfaced, not silently dropped.
  assert.ok(jobs.at(-1).summary.attention.some((item) => item.fieldApiName === "Email" && item.skipReason === "needs_confirmation"));
});

test("a page save synchronizes the saved page's Contacts fields", async () => {
  const zoho = fakeZoho();
  const { result } = await run(zoho, { mode: "page", pageId: "temporary-work-main-applicant-contact-details", profileId: "main-1" });
  assert.equal(result.success, true, JSON.stringify(result.error));
  assert.deepEqual(contactCall(zoho).fields, { Country_of_Residence: "Australia", Phone: "0291234567", Mobile: "+61412345678" });
});

test("the Contact is not written when it does not belong to the signed-in person", async () => {
  const zoho = fakeZoho({ getContactIdentity: async () => ({ Email: "someone.else@example.com", Secondary_Email: "" }) });
  const { result, jobs } = await run(zoho);
  assert.equal(result.success, false);
  assert.equal(result.error.code, "contact_link_mismatch");
  assert.equal(contactCall(zoho), undefined);
  assert.equal(jobs.at(-1).state, "failed");
  assert.ok(result.summary.failed.some((item) => item.module === "Contacts"));
  // Unrelated matter and dependent writes are not blocked by a bad Contact link.
  assert.ok(zoho.calls.some((call) => call.module === "Deals"));
});

test("a Contact whose ownership cannot be verified is not written and stays retryable", async () => {
  for (const identity of [async () => null, async () => { throw Object.assign(new Error("timeout"), { code: "TIMEOUT" }); }]) {
    const zoho = fakeZoho({ getContactIdentity: identity });
    const { result } = await run(zoho);
    assert.equal(result.success, false);
    assert.equal(contactCall(zoho), undefined);
    assert.equal(result.state, "failed");
  }
  const secondary = fakeZoho({ getContactIdentity: async () => ({ Email: "other@example.com", Secondary_Email: "ADA@example.com" }) });
  assert.equal((await run(secondary)).result.success, true);
});

test("values Zoho does not accept are reported and never sent; accepted fields still sync", async () => {
  const zoho = fakeZoho();
  const { result } = await run(zoho);
  const sent = contactCall(zoho).fields;
  // Nationality "United Kingdom" is not in this CRM's picklist ("British"), so it is reported.
  assert.equal(Object.hasOwn(sent, "Nationality"), false);
  assert.ok(result.summary.attention.some((item) => item.fieldApiName === "Nationality" && item.skipReason === "unsupported_picklist_value"));
  assert.equal(result.state, "succeeded");
  assert.equal(sent.Country_of_Birth, "United Kingdom");
});

test("picklist matching normalises case but never invents a value", () => {
  const index = indexFieldMetadata([{ api_name: "Relationship_Status", data_type: "picklist", pick_list_values: [{ actual_value: "De Facto" }] }]);
  const gate = (value) => gateFieldValue({ module: "Contacts", fieldApiName: "Relationship_Status", value, metadataIndex: index });
  assert.deepEqual(gate("de  facto"), { ok: true, value: "De Facto" });
  assert.equal(gate("Married").error, "unsupported_picklist_value");
  const readOnly = indexFieldMetadata([{ api_name: "Passport_No", data_type: "text", field_read_only: true }]);
  assert.equal(gateFieldValue({ module: "Contacts", fieldApiName: "Passport_No", value: "X", metadataIndex: readOnly }).error, "field_read_only");
  const missing = indexFieldMetadata([{ api_name: "Other", data_type: "text" }]);
  assert.equal(gateFieldValue({ module: "Contacts", fieldApiName: "Passport_No", value: "X", metadataIndex: missing }).error, "field_not_in_crm");
  const short = indexFieldMetadata([{ api_name: "Passport_No", data_type: "text", length: 3 }]);
  assert.equal(gateFieldValue({ module: "Contacts", fieldApiName: "Passport_No", value: "ABCDE", metadataIndex: short }).error, "value_too_long");
});

test("when field metadata cannot be loaded, unverified fields fail retryably and proven fields still sync", async () => {
  const zoho = fakeZoho({ getFieldMetadata: async () => { throw new Error("metadata down"); } });
  const { result, jobs } = await run(zoho);
  assert.equal(result.success, false);
  assert.equal(result.state, "failed");
  assert.equal(result.partial, true);
  assert.deepEqual(Object.keys(contactCall(zoho).fields).sort(), ["Date_of_Birth", "First_Name", "Gender", "Last_Name"]);
  assert.ok(result.summary.failed.every((item) => item.error === "field_metadata_unavailable"));
  assert.equal(jobs.at(-1).state, "failed");
});

test("an update Zoho does not confirm is a failure, not a success", async () => {
  for (const reply of [null, {}, { status: "error", code: "INVALID_DATA", message: "bad" }, { status: "success", details: { id: "other-record" } }]) {
    const zoho = fakeZoho({ updateRecord: async () => reply });
    const { result, jobs } = await run(zoho);
    assert.equal(result.success, false, JSON.stringify(reply));
    assert.equal(result.summary.succeeded.length, 0);
    assert.equal(jobs.at(-1).state, "failed");
  }
});

test("a failed sync is retryable and the retry succeeds on the same job", async () => {
  let failing = true;
  const zoho = fakeZoho({
    updateRecord: async (module, recordId, fields) => {
      if (failing && module === "Contacts") {
        throw Object.assign(new Error("Invalid value \"ada@example.com\" for 0412345678"), { code: "INVALID_DATA" });
      }
      return { status: "success", details: { id: recordId } };
    },
  });
  const first = await run(zoho);
  assert.equal(first.result.success, false);
  assert.equal(first.result.error.code, "INVALID_DATA");
  const persisted = JSON.stringify(first.jobs);
  assert.equal(persisted.includes("ada@example.com"), false);
  assert.equal(persisted.includes("0412345678"), false);

  failing = false;
  const retry = await run(zoho, {}, { existingJob: { ...first.jobs.at(-1), id: first.result.jobId } });
  assert.equal(retry.result.success, true);
  assert.equal(retry.result.jobId, first.result.jobId);
  assert.equal(retry.jobs.at(-1).attemptCount, 2);

  // Once succeeded, re-running the same payload does not write again.
  const writes = [];
  const again = await run(fakeZoho({ updateRecord: async (...args) => { writes.push(args); return { status: "success" }; } }), {}, { existingJob: { ...retry.jobs.at(-1), id: retry.result.jobId } });
  assert.equal(again.result.idempotent, true);
  assert.equal(writes.length, 0);
});

test("errors never persist emails or phone-like numbers", () => {
  const sanitized = sanitizeCrmSyncError(Object.assign(new Error("Duplicate for ada@example.com / 61412345678 'secret value'"), { code: "DUPLICATE_DATA" }));
  assert.equal(sanitized.code, "DUPLICATE_DATA");
  assert.doesNotMatch(sanitized.message, /ada@example\.com|61412345678|secret value/);
});

test("a missing Contact link is reported without writing, and does not stop the matter", async () => {
  const zoho = fakeZoho();
  const { result } = await run(zoho, { userProfile: { email: "ada@example.com" } });
  assert.equal(result.success, false);
  assert.ok(result.summary.failed.some((item) => item.module === "Contacts" && item.error === "missing_contact_id"));
  assert.equal(contactCall(zoho), undefined);
});

test("dry-run and disabled modes never contact Zoho", async () => {
  const zoho = fakeZoho({ getContactIdentity: async () => { throw new Error("must not be called"); } });
  const dry = await run(zoho, {}, { flags: { enabled: true, dryRun: true } });
  assert.equal(dry.result.dryRun, true);
  assert.equal(zoho.calls.length, 0);
  const off = await run(zoho, {}, { flags: { enabled: false } });
  assert.equal(off.result.skipped, true);
});
