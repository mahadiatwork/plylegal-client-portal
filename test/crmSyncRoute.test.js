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
    if (String(url).includes("applications/other-app")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ fields: { userId: { stringValue: "other-user" } } }),
      };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  });
  const response = await POST(request({ applicationId: "other-app", mode: "full" }, "signed-client-token"));
  assert.equal(response.status, 403);
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

test("the published 482 definition synchronizes page and full requests through the route", async (t) => {
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
    ["applications/app-1/data/questionnaire", {
      visaContext: "482",
      profiles: [{ id: "main-1", relationship: "main_applicant", given_names: "Ada", family_name: "Lovelace" }],
      profiles_data: { "main-1": { details: { given_names: "Ada", family_name: "Lovelace" } } },
    }],
    ["users/owner-1", { zohoContactId: "contact-1", email: "client@example.com" }],
    [`questionnaireDefinitions/${definition.id}`, definition],
  ]);
  function verifyFirestoreValue(value, path = "job") {
    assert.notEqual(value, undefined, `${path} cannot contain undefined`);
    if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) verifyFirestoreValue(child, `${path}.${key}`);
    }
  }
  function collection(path) {
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
    getContactIdentity: async () => ({ Email: "client@example.com", Secondary_Email: "" }),
    getFieldMetadata: async () => [],
    updateRecord: async (module, recordId, fields) => {
      updates.push({ module, recordId, fields });
      return { status: "success", details: { id: recordId } };
    },
  };
  t.mock.method(getFirebaseIdentityAuth(), "verifyIdToken", async () => ({ uid: "owner-1" }));
  t.mock.method(globalThis, "fetch", async () => ({
    ok: true,
    status: 200,
    json: async () => ({ fields: {
      userId: { stringValue: "owner-1" },
      zohoId: { stringValue: "deal-1" },
      visaTypeCode: { stringValue: "temporary-work" },
    } }),
  }));

  for (const body of [
    { applicationId: "app-1", mode: "page", pageId: "temporary-work-main-applicant-details", profileId: "main-1" },
    { applicationId: "app-1", mode: "full" },
  ]) {
    const response = await POST(request(body, "signed-client-token"));
    const payload = await response.json();
    assert.equal(response.status, 200, JSON.stringify(payload));
    assert.equal(payload.success, true);
    assert.equal(payload.state, "succeeded");
    assert.equal(payload.summary.skipped.some((item) => item.questionId.endsWith("-heading")), false);
  }
  assert.ok(updates.some((update) => update.module === "Deals"));
  const completedJobs = [...documents.entries()].filter(([key, value]) => key.includes("/crmSync/") && value.state === "succeeded");
  assert.equal(completedJobs.length, 2);

  // A real upstream failure remains visible, and retrying the same saved
  // answers completes the existing job once the upstream service recovers.
  documents.get("applications/app-1/data/questionnaire").profiles_data["main-1"].details.family_name = "Byron";
  const originalUpdate = globalThis.__crmSyncTestZoho.updateRecord;
  globalThis.__crmSyncTestZoho.updateRecord = async () => {
    throw Object.assign(new Error("service unavailable"), { code: "TEMPORARY_ERROR" });
  };
  const retryBody = { applicationId: "app-1", mode: "page", pageId: "temporary-work-main-applicant-details", profileId: "main-1" };
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
  assert.equal(documents.get(`applications/app-1/crmSync/${failed.jobId}`).attemptCount, 2);
});
