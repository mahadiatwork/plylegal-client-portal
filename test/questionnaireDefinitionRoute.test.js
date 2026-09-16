import assert from "node:assert/strict";
import { test } from "node:test";
import { Module } from "node:module";
import path from "node:path";
import { build } from "esbuild";
import { NextRequest } from "next/server.js";
import { getFirebaseIdentityAuth } from "../src/lib/firebaseIdentity.js";
import { temporaryWork482Definition } from "../src/lib/questionnaires/temporaryWork482.definition.js";

const bundled = await build({
  entryPoints: ["app/api/questionnaires/definition/route.js"], bundle: true, write: false,
  platform: "node", format: "cjs", packages: "external", logLevel: "silent",
  plugins: [{
    name: "questionnaire-database-test",
    setup(builder) {
      builder.onResolve({ filter: /(?:^|\/)firebase-admin(?:\.js)?$/ }, () => ({ path: "database", namespace: "test" }));
      builder.onLoad({ filter: /.*/, namespace: "test" }, () => ({
        contents: "export function getDb() { return globalThis.__questionnaireTestDatabase; }",
      }));
    },
  }],
});
const filename = path.resolve("test", "questionnaire-definition-route-bundle.cjs");
const routeModule = new Module(filename);
routeModule.filename = filename;
routeModule.paths = Module._nodeModulePaths(path.dirname(filename));
routeModule._compile(bundled.outputFiles[0].text, filename);
const { GET } = routeModule.exports;

function setup(t) {
  const previous = { ...process.env };
  t.after(() => { process.env = previous; delete globalThis.__questionnaireTestDatabase; });
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "questionnaire-test";
  t.mock.method(getFirebaseIdentityAuth(), "verifyIdToken", async (token) => {
    if (token !== "signed-client-token") throw new Error("Invalid token");
    return { uid: "applicant-1" };
  });
  const definitions = new Map();
  const legacyPages = new Map();
  const calls = [];
  const doc = (id) => ({ id, exists: definitions.has(id), data: () => definitions.get(id) });
  globalThis.__questionnaireTestDatabase = {
    ok: true,
    db: {
      collection(name) {
        calls.push(name);
        assert.equal(name, "questionnaireDefinitions", "must never read applicant answers or private history");
        return {
          where(field, op, status) {
            assert.deepEqual([field, op, status], ["status", "==", "active"]);
            return { get: async () => ({ docs: [...definitions].filter(([, value]) => value.status === "active").map(([id]) => doc(id)) }) };
          },
          doc(id) {
            return {
              get: async () => doc(id),
              collection(child) {
                assert.equal(child, "pages");
                return { get: async () => ({ docs: (legacyPages.get(id) || []).map((page) => ({ id: page.id, data: () => page })) }) };
              },
            };
          },
        };
      },
    },
  };
  return { definitions, legacyPages, calls };
}

const request = (query = "visaType=temporary-work&visaContext=482", token = "signed-client-token") => new NextRequest(
  `https://portal.example/api/questionnaires/definition?${query}`,
  { headers: token ? { Authorization: `Bearer ${token}` } : {} },
);

test("published questionnaire fallback requires a valid client identity before database access", async (t) => {
  const { calls } = setup(t);
  assert.equal((await GET(request("", null))).status, 401);
  assert.equal((await GET(request("", "forged-token"))).status, 401);
  assert.deepEqual(calls, []);
});

test("published definition matches visa audience and preserves current questions and revision", async (t) => {
  const { definitions } = setup(t);
  definitions.set("current", { ...structuredClone(temporaryWork482Definition), revision: 3, updatedBy: "admin-private-id" });
  definitions.set("other-visa", { ...structuredClone(temporaryWork482Definition), visaContext: "186", revision: 10 });
  const response = await GET(request());
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const { definition } = await response.json();
  assert.equal(definition.id, "current");
  assert.equal(definition.revision, 3);
  assert.equal(definition.updatedBy, undefined);
  assert.deepEqual(definition.pages, temporaryWork482Definition.pages);
});

test("draft, archived and wrong-audience definitions cannot be retrieved by ID", async (t) => {
  const { definitions } = setup(t);
  for (const status of ["draft", "archived"]) {
    definitions.set(status, { ...temporaryWork482Definition, status });
    const response = await GET(request(`definitionId=${status}&visaType=temporary-work&visaContext=482`));
    assert.deepEqual(await response.json(), { success: true, definition: null });
  }
  definitions.set("active-186", { ...temporaryWork482Definition, visaContext: "186" });
  assert.equal((await (await GET(request("definitionId=active-186&visaType=temporary-work&visaContext=482"))).json()).definition, null);
});

test("only a successful empty query restores the built-in questionnaire", async (t) => {
  setup(t);
  assert.deepEqual(await (await GET(request())).json(), { success: true, definition: null });
  globalThis.__questionnaireTestDatabase = { ok: false, error: "credential-secret-sentinel" };
  const failed = await GET(request());
  assert.equal(failed.status, 503);
  const payload = await failed.json();
  assert.equal(payload.success, false);
  assert.equal("definition" in payload, false);
  assert.equal(JSON.stringify(payload).includes("credential-secret-sentinel"), false);
});

test("invalid current definitions fail closed; invalid lower-priority definitions do not break the current form", async (t) => {
  const { definitions } = setup(t);
  definitions.set("wildcard", { ...temporaryWork482Definition, visaContexts: [], pages: [{ broken: true }] });
  definitions.set("exact", structuredClone(temporaryWork482Definition));
  const response = await GET(request());
  assert.equal(response.status, 200);
  assert.equal((await response.json()).definition.id, "exact");
  definitions.get("exact").pages = [{ broken: true }];
  assert.equal((await GET(request())).status, 503);
});

test("legacy pages are supported while explicit empty embedded pages stay authoritative", async (t) => {
  const { definitions, legacyPages } = setup(t);
  const definition = structuredClone(temporaryWork482Definition);
  delete definition.pages;
  definitions.set("legacy", definition);
  legacyPages.set("legacy", temporaryWork482Definition.pages);
  assert.deepEqual((await (await GET(request())).json()).definition.pages, temporaryWork482Definition.pages);
  definition.pages = [];
  assert.deepEqual((await (await GET(request())).json()).definition.pages, []);
});

test("unsafe definition selections are rejected before database reads", async (t) => {
  const { calls } = setup(t);
  for (const query of ["definitionId=../private", "visaType=unknown", "visaContext=../../../applications"]) {
    assert.equal((await GET(request(query))).status, 400);
  }
  assert.deepEqual(calls, []);
});
