import assert from "node:assert/strict";
import { test } from "node:test";
import { Module } from "node:module";
import path from "node:path";
import { build } from "esbuild";

globalThis.__testCrmClientAuth = { currentUser: null };
const bundled = await build({
  entryPoints: ["src/lib/crm/clientCrmSync.js"],
  bundle: true,
  write: false,
  platform: "node",
  format: "cjs",
  packages: "external",
  logLevel: "silent",
  plugins: [{
    name: "crm-client-auth-test",
    setup(builder) {
      builder.onResolve({ filter: /^@\/lib\/firebase$/ }, () => ({ path: "auth", namespace: "test" }));
      builder.onLoad({ filter: /.*/, namespace: "test" }, () => ({
        contents: "export const auth = globalThis.__testCrmClientAuth;",
      }));
    },
  }],
});
const filename = path.resolve("test", "crm-client-test-bundle.cjs");
const clientModule = new Module(filename);
clientModule.filename = filename;
clientModule.paths = Module._nodeModulePaths(path.dirname(filename));
clientModule._compile(bundled.outputFiles[0].text, filename);
const { describeCrmSyncResult, requestQuestionnaireCrmSync } = clientModule.exports;
const auth = globalThis.__testCrmClientAuth;

function restoreDatabaseType(value) {
  if (value === undefined) delete process.env.NEXT_PUBLIC_DATABASE_TYPE;
  else process.env.NEXT_PUBLIC_DATABASE_TYPE = value;
}

test("local storage mode never starts a CRM request even when Firebase is configured", async (t) => {
  const oldType = process.env.NEXT_PUBLIC_DATABASE_TYPE;
  t.after(() => restoreDatabaseType(oldType));
  process.env.NEXT_PUBLIC_DATABASE_TYPE = "localStorage";
  auth.currentUser = { getIdToken: () => { throw new Error("should not request a token"); } };
  const result = await requestQuestionnaireCrmSync({ applicationId: "app-1", mode: "full" });
  assert.equal(result.success, true);
  assert.equal(result.skipped, true);
});

test("Firebase synchronization waits for the restored user before requesting a token", async (t) => {
  const oldType = process.env.NEXT_PUBLIC_DATABASE_TYPE;
  t.after(() => restoreDatabaseType(oldType));
  process.env.NEXT_PUBLIC_DATABASE_TYPE = "firebase";
  auth.currentUser = null;
  auth.authStateReady = async () => { auth.currentUser = { getIdToken: async () => "signed-token" }; };
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "/api/intake/crm-sync");
    assert.equal(options.method, "POST");
    assert.equal(options.headers.Authorization, "Bearer signed-token");
    assert.deepEqual(JSON.parse(options.body), {
      applicationId: "_app-1",
      mode: "page",
      pageId: "main-details",
      profileId: "profile-1",
    });
    return { ok: true, json: async () => ({ success: true, state: "succeeded" }) };
  });
  const result = await requestQuestionnaireCrmSync({
    applicationId: "_app-1",
    mode: "page",
    pageId: "main-details",
    profileId: "profile-1",
  });
  assert.equal(result.success, true);
});

test("network failures become retryable results and do not promise an automatic retry", async (t) => {
  const oldType = process.env.NEXT_PUBLIC_DATABASE_TYPE;
  t.after(() => restoreDatabaseType(oldType));
  process.env.NEXT_PUBLIC_DATABASE_TYPE = "firebase";
  auth.currentUser = { getIdToken: async () => "signed-token" };
  auth.authStateReady = async () => {};
  t.mock.method(globalThis, "fetch", async () => { throw new Error("offline"); });
  const result = await requestQuestionnaireCrmSync({ applicationId: "app-1", mode: "full" });
  assert.equal(result.success, false);
  assert.equal(result.state, "failed");
  assert.match(describeCrmSyncResult(result).message, /retry/i);
  assert.doesNotMatch(describeCrmSyncResult(result).message, /will be retried/i);
});

test("a confirmed Matter write reports fields Zoho could not accept", () => {
  const result = describeCrmSyncResult({ success: true, summary: { attention: [
    { fieldApiName: "Country_of_Birth", skipReason: "unsupported_picklist_value" },
    { fieldApiName: "Country_of_Birth", skipReason: "unsupported_picklist_value" },
  ] } });
  assert.equal(result.state, "succeeded");
  assert.match(result.message, /Matter in CRM/);
  assert.match(result.message, /1 field/);
});
