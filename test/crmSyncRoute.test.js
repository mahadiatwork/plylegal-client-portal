import assert from "node:assert/strict";
import { test } from "node:test";
import { Module } from "node:module";
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
        contents: "export class ZohoCRMClient { constructor() { globalThis.__crmSyncZohoConstructed = true; } }",
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
