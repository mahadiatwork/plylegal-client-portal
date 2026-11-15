import assert from "node:assert/strict";
import { test } from "node:test";
import { Module } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { build } from "esbuild";
import { NextRequest } from "next/server.js";
import { getFirebaseIdentityAuth } from "../src/lib/firebaseIdentity.js";

const bundled = await build({
  entryPoints: ["app/api/intake/crm-sync/route.js"],
  bundle: true,
  write: false,
  platform: "node",
  format: "cjs",
  packages: "external",
  logLevel: "silent",
  plugins: [{
    name: "crm-sync-test",
    setup(builder) {
      builder.onResolve({ filter: /(?:^|\/)firebase-admin(?:\.js)?$/ }, () => ({ path: "admin", namespace: "test" }));
      builder.onResolve({ filter: /(?:^|\/)zohoClient(?:\.js)?$/ }, () => ({ path: "zoho", namespace: "test" }));
      builder.onLoad({ filter: /admin/, namespace: "test" }, () => ({
        contents: "export function getDb() { return globalThis.__crmSyncTestDatabase; }",
      }));
      builder.onLoad({ filter: /zoho/, namespace: "test" }, () => ({
        contents: "export class ZohoCRMClient { constructor() { globalThis.__crmSyncZohoConstructed = true; return globalThis.__crmSyncTestZoho || this; } }",
      }));
    },
  }],
});
const filename = path.resolve("test", "crm-sync-route-bundle.cjs");
const routeModule = new Module(filename);
routeModule.filename = filename;
routeModule.paths = Module._nodeModulePaths(path.dirname(filename));
routeModule._compile(bundled.outputFiles[0].text, filename);
const { POST } = routeModule.exports;

function request(body, token) {
  return new NextRequest("https://portal.example/api/intake/crm-sync", {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

test("another client's application cannot be synchronized", async (t) => {
  const previous = { ...process.env };
  t.after(() => { process.env = previous; });
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "crm-sync-test";
  process.env.CRM_QUESTIONNAIRE_SYNC_ENABLED = "true";
  t.mock.method(getFirebaseIdentityAuth(), "verifyIdToken", async (token) => {
    if (token !== "signed-client-token") throw new Error("Invalid token");
    return { uid: "owner-1" };
  });
  t.mock.method(globalThis, "fetch", async (url) => {
    if (["other-app", "_other-app", "-other-app"].some((id) => String(url).includes(`applications/${id}`))) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ fields: { userId: { stringValue: "other-user" } } }),
      };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  });
  for (const applicationId of ["other-app", "_other-app", "-other-app"]) {
    const response = await POST(request({ applicationId, mode: "full" }, "signed-client-token"));
    assert.equal(response.status, 403);
  }
  assert.equal(globalThis.__crmSyncZohoConstructed, undefined);
});

test("unauthenticated CRM sync requests are rejected", async (t) => {
  const previous = { ...process.env };
  t.after(() => { process.env = previous; });
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "crm-sync-test";
  t.mock.method(getFirebaseIdentityAuth(), "verifyIdToken", async () => {
    throw new Error("Invalid token");
  });
  assert.equal((await POST(request({ applicationId: "app-1", mode: "full" }))).status, 401);
  assert.equal((await POST(request({ applicationId: "app-1", mode: "full" }, "forged-token"))).status, 401);
});

test("disabled CRM synchronization does not require an admin Firestore connection", async (t) => {
  const previous = { ...process.env };
  const oldDatabase = globalThis.__crmSyncTestDatabase;
  t.after(() => { process.env = previous; globalThis.__crmSyncTestDatabase = oldDatabase; });
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "crm-sync-test";
  process.env.CRM_QUESTIONNAIRE_SYNC_ENABLED = "false";
  globalThis.__crmSyncTestDatabase = { ok: false };
  t.mock.method(getFirebaseIdentityAuth(), "verifyIdToken", async () => ({ uid: "owner-1" }));
  t.mock.method(globalThis, "fetch", async () => { throw new Error("disabled sync must not read Firestore"); });

  const response = await POST(request({ applicationId: "app-1", mode: "full" }, "signed-client-token"));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, skipped: true, reason: "feature_disabled" });
});

for (const applicationId of ["_app-1", "-app-1"]) {
  test(`the published 482 definition synchronizes ${applicationId} through the route`, (t) => verifyPublishedSync(t, applicationId));
}

async function verifyPublishedSync(t, applicationId) {
  const previous = { ...process.env };
  const oldDatabase = globalThis.__crmSyncTestDatabase;
  const oldZoho = globalThis.__crmSyncTestZoho;
  t.after(() => {
    process.env = previous;
    globalThis.__crmSyncTestDatabase = oldDatabase;
    globalThis.__crmSyncTestZoho = oldZoho;
    delete globalThis.__crmSyncZohoConstructed;
  });
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "crm-sync-test";
  process.env.CRM_QUESTIONNAIRE_SYNC_ENABLED = "true";
  process.env.CRM_QUESTIONNAIRE_SYNC_DRY_RUN = "false";
  const definition = JSON.parse(readFileSync(new URL("../e2e/fixtures/built-in-temporary-work-482.json", import.meta.url), "utf8"));
  const documents = new Map([
    [`applications/${applicationId}/data/questionnaire`, {
      visaContext: "482",
      profiles: [
        { id: "main-1", relationship: "main_applicant", given_names: "Ada", family_name: "Lovelace" },
        { id: "spouse-1", relationship: "spouse", given_names: "Sam", family_name: "Lovelace" },
      ],
      profiles_data: {
        "main-1": {
          details: { given_names: "Ada", family_name: "Lovelace", preferred_names: "Ada", country_of_birth: "Country 1 test" },
          contact_details: { phone: "0291234567", mobile: "+61412345678" },
        },
        "spouse-1": { details: { given_names: "Sam", family_name: "Lovelace" } },
      },
    }],
    [`questionnaireDefinitions/${definition.id}`, definition],
  ]);
  function verifyFirestoreValue(value, path = "job") {
    assert.notEqual(value, undefined, `${path} cannot contain undefined`);
    if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) verifyFirestoreValue(child, `${path}.${key}`);
    }
  }
  function collection(path) {
    assert.notEqual(path, "users", "Deals-only sync must not load the Contact profile");
    return {
      doc(id) {
        const documentPath = `${path}/${id}`;
        return {
          id,
          collection: (child) => collection(`${documentPath}/${child}`),
          get: async () => ({ id, exists: documents.has(documentPath), data: () => documents.get(documentPath) }),
          set: async (value, options) => {
            verifyFirestoreValue(value);
            documents.set(documentPath, options?.merge ? { ...documents.get(documentPath), ...value } : value);
          },
        };
      },
      where: () => ({
        get: async () => ({ docs: [{ id: definition.id, data: () => definition }] }),
      }),
    };
  }
  const updates = [];
  globalThis.__crmSyncTestDatabase = { ok: true, db: { collection } };
  globalThis.__crmSyncTestZoho = {
    getAccessToken: async () => "test-token",
    getContactIdentity: async () => { throw new Error("Contacts must not be read"); },
    getRelatedRecords: async () => { throw new Error("Dependents must not be read"); },
    createRecord: async () => { throw new Error("Dependents must not be created"); },
    getFieldMetadata: async (module) => {
      assert.equal(module, "Deals");
      return [
        ...["Family_Name", "Given_Name", "Client_Phone", "Client_Mobile"]
          .map((api_name) => ({ api_name, data_type: "text" })),
        { api_name: "Questionnaires_Status", data_type: "picklist", pick_list_values: [{ actual_value: "In Progress" }] },
        { api_name: "Country_of_Birth", data_type: "picklist", pick_list_values: [{ actual_value: "Australia" }] },
      ];
    },
    updateRecord: async (module, recordId, fields) => {
      updates.push({ module, recordId, fields });
      return { status: "success", details: { id: recordId } };
    },
  };
  t.mock.method(getFirebaseIdentityAuth(), "verifyIdToken", async () => ({ uid: "owner-1" }));
  t.mock.method(globalThis, "fetch", async (url) => {
    assert.ok(String(url).endsWith(`/applications/${applicationId}`));
    return {
      ok: true,
      status: 200,
      json: async () => ({ fields: {
        userId: { stringValue: "owner-1" },
        // The authorized document path, not a mutable stored field, determines the application ID.
        id: { stringValue: "different-app" },
        zohoId: { stringValue: "deal-1" },
        visaTypeCode: { stringValue: "temporary-work" },
      } }),
    };
  });

  for (const body of [
    { applicationId, mode: "page", pageId: "temporary-work-main-applicant-details", profileId: "main-1" },
    { applicationId, mode: "page", pageId: "temporary-work-main-applicant-contact-details", profileId: "main-1" },
    { applicationId, mode: "page", pageId: "temporary-work-spouse-partner-details", profileId: "spouse-1" },
    { applicationId, mode: "full" },
  ]) {
    const response = await POST(request(body, "signed-client-token"));
    const payload = await response.json();
    assert.equal(response.status, 200, JSON.stringify(payload));
    assert.equal(payload.success, true);
    assert.equal(payload.state, "succeeded");
    assert.equal(payload.summary.skipped.some((item) => item.questionId.endsWith("-heading")), false);
    if (body.mode === "full" || body.pageId === "temporary-work-main-applicant-details") {
      assert.ok(payload.summary.attention.some((item) => item.fieldApiName === "Country_of_Birth" && item.skipReason === "unsupported_picklist_value"));
      assert.ok(payload.summary.attention.some((item) => item.fieldApiName === "Preferred_Name" && item.skipReason === "field_not_in_crm"));
    }
  }
  assert.equal(updates.length, 4);
  assert.ok(updates.every((update) => update.module === "Deals" && update.recordId === "deal-1"));
  assert.ok(updates.some((update) => update.fields.Family_Name === "Lovelace" && update.fields.Given_Name === "Ada"));
  assert.ok(updates.some((update) => update.fields.Client_Phone === "0291234567" && update.fields.Client_Mobile === "+61412345678"));
  assert.ok(updates.every((update) => !Object.hasOwn(update.fields, "Country_of_Birth")));
  assert.ok(updates.every((update) => !Object.hasOwn(update.fields, "Preferred_Name")));
  const completedJobs = [...documents.entries()].filter(([key, value]) => key.startsWith(`applications/${applicationId}/crmSync/`) && value.state === "succeeded");
  assert.equal(completedJobs.length, 4);

  // A real upstream failure remains visible, and retrying the same saved
  // answers completes the existing job once the upstream service recovers.
  documents.get(`applications/${applicationId}/data/questionnaire`).profiles_data["main-1"].details.family_name = "Byron";
  const originalUpdate = globalThis.__crmSyncTestZoho.updateRecord;
  globalThis.__crmSyncTestZoho.updateRecord = async () => {
    throw Object.assign(new Error("service unavailable"), { code: "TEMPORARY_ERROR" });
  };
  const retryBody = { applicationId, mode: "page", pageId: "temporary-work-main-applicant-details", profileId: "main-1" };
  const failedResponse = await POST(request(retryBody, "signed-client-token"));
  const failed = await failedResponse.json();
  assert.equal(failedResponse.status, 502);
  assert.equal(failed.state, "failed");
  assert.equal(failed.error.code, "TEMPORARY_ERROR");
  globalThis.__crmSyncTestZoho.updateRecord = originalUpdate;
  const retryResponse = await POST(request(retryBody, "signed-client-token"));
  const retried = await retryResponse.json();
  assert.equal(retryResponse.status, 200);
  assert.equal(retried.state, "succeeded");
  assert.equal(retried.jobId, failed.jobId);
  assert.equal(documents.get(`applications/${applicationId}/crmSync/${failed.jobId}`).attemptCount, 2);

  // A temporary metadata failure must not block safe Deal fields or permanently
  // suppress an answer once Zoho's field configuration is available again.
  documents.get(`applications/${applicationId}/data/questionnaire`).profiles_data["main-1"].details.country_of_birth = "Australia";
  const originalMetadata = globalThis.__crmSyncTestZoho.getFieldMetadata;
  globalThis.__crmSyncTestZoho.getFieldMetadata = async () => { throw new Error("metadata unavailable"); };
  const partialResponse = await POST(request(retryBody, "signed-client-token"));
  const partial = await partialResponse.json();
  assert.equal(partialResponse.status, 200);
  assert.ok(partial.summary.attention.some((item) => item.fieldApiName === "Country_of_Birth" && item.skipReason === "field_metadata_unavailable"));
  globalThis.__crmSyncTestZoho.getFieldMetadata = originalMetadata;
  const recoveredResponse = await POST(request(retryBody, "signed-client-token"));
  const recovered = await recoveredResponse.json();
  assert.equal(recoveredResponse.status, 200);
  assert.equal(recovered.idempotent, undefined);
  assert.equal(recovered.jobId, partial.jobId);
  assert.equal(updates.at(-1).fields.Country_of_Birth, "Australia");
  assert.equal(documents.get(`applications/${applicationId}/crmSync/${partial.jobId}`).attemptCount, 2);
}
