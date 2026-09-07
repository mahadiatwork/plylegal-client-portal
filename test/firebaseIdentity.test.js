import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { test } from "node:test";
import { cert, deleteApp, getApps } from "firebase-admin/app";
import { getFirebaseIdentityAuth } from "../src/lib/firebaseIdentity.js";
import { parseFirebaseServiceAccount } from "../src/lib/firebaseServiceAccount.js";
import { verifyFirebaseIdentity } from "../src/lib/serverAuth.js";

const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
const account = {
  project_id: "preview-test",
  client_email: "test@preview-test.iam.gserviceaccount.com",
  private_key: privateKey,
};

test("accepts raw and double-encoded service accounts as objects, never SDK file paths", () => {
  for (const raw of [JSON.stringify(account), JSON.stringify(JSON.stringify(account)), `'${JSON.stringify(account)}'`]) {
    const parsed = parseFirebaseServiceAccount(raw);
    assert.equal(typeof parsed, "object");
    assert.equal(parsed.project_id, account.project_id);
    assert.doesNotThrow(() => cert(parsed));
  }
  assert.equal(parseFirebaseServiceAccount(JSON.stringify({
    ...account, private_key: privateKey.replaceAll("\n", "\\n"),
  })).private_key, privateKey);
});

test("rejects non-object or malformed credentials without exposing their content", () => {
  for (const value of ["secret-sentinel", null, [], 4, {}, { private_key: "secret-sentinel" }]) {
    assert.throws(() => parseFirebaseServiceAccount(JSON.stringify(value)), (error) => {
      assert.doesNotMatch(error.message, /secret-sentinel/);
      assert.match(error.message, /valid service-account JSON object/);
      return true;
    });
  }
});

test("identity verification is independent of missing, malformed and double-encoded Admin credentials", async (t) => {
  const previous = { ...process.env };
  t.after(async () => {
    for (const app of getApps()) await deleteApp(app);
    process.env = previous;
  });
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "preview-test";
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST;

  for (const credential of [undefined, "secret-sentinel", JSON.stringify(JSON.stringify(account))]) {
    if (credential === undefined) delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    else process.env.FIREBASE_SERVICE_ACCOUNT_KEY = credential;
    const identityAuth = getFirebaseIdentityAuth();
    assert.equal(identityAuth.app.options.projectId, "preview-test");
    const request = new Request("https://portal.example/api", { headers: { Authorization: "Bearer invalid" } });
    assert.equal((await verifyFirebaseIdentity(request)).authenticated, false);
    const verifier = t.mock.method(identityAuth, "verifyIdToken", async (token) => {
      assert.equal(token, "verified-test-token");
      return { uid: "owner", email: "owner@example.test" };
    });
    const valid = await verifyFirebaseIdentity(new Request("https://portal.example/api", {
      headers: { Authorization: "Bearer verified-test-token" },
    }));
    assert.equal(valid.uid, "owner");
    assert.equal(valid.authenticated, true);
    verifier.mock.restore();
    assert.equal(getApps().some((app) => app.name === "[DEFAULT]"), false);
  }
});

test("default Admin app can initialize after the independent identity verifier", async (t) => {
  const previous = { ...process.env };
  t.after(async () => {
    for (const app of getApps()) await deleteApp(app);
    process.env = previous;
  });
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = account.project_id;
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY = JSON.stringify(JSON.stringify(account));
  getFirebaseIdentityAuth();
  const admin = await import("../src/lib/firebase-admin.js");
  assert.equal(admin.initResult.success, true);
  assert.equal(admin.getDb().ok, true);
  assert.equal(admin.adminApp.name, "[DEFAULT]");
});
