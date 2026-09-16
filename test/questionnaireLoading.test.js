import assert from "node:assert/strict";
import { test } from "node:test";
import { loadAuthenticatedQuestionnaireDefinition, withQuestionnaireLoadTimeout } from "../src/lib/questionnaires/remoteLoading.js";

test("questionnaire reads wait for Firebase auth and reject a missing session", async () => {
  let ready;
  const auth = { currentUser: null, authStateReady: () => new Promise((resolve) => { ready = resolve; }) };
  let reads = 0;
  const pending = loadAuthenticatedQuestionnaireDefinition({
    auth,
    loadFromFirestore: async () => { reads += 1; return { revision: 2 }; },
  });
  assert.equal(reads, 0);
  auth.currentUser = {};
  ready();
  assert.deepEqual(await pending, { revision: 2 });
  assert.equal(reads, 1);

  await assert.rejects(loadAuthenticatedQuestionnaireDefinition({
    auth: { authStateReady: async () => {}, currentUser: null },
    loadFromFirestore: async () => { throw new Error("Must not read without a session"); },
  }), { code: "unauthenticated" });
});

test("missing Firestore collection permissions use a freshly authenticated server read", async () => {
  let refreshed = false;
  const currentDefinition = { id: "published", revision: 4 };
  const result = await loadAuthenticatedQuestionnaireDefinition({
    auth: {
      authStateReady: async () => {},
      currentUser: { getIdToken: async (forceRefresh) => { refreshed = forceRefresh; return "fresh-token"; } },
    },
    loadFromFirestore: async () => { throw Object.assign(new Error("Denied"), { code: "permission-denied" }); },
    loadFromServer: async (token) => { assert.equal(token, "fresh-token"); return currentDefinition; },
  });
  assert.equal(refreshed, true);
  assert.equal(result, currentDefinition);
});

test("a successful empty published query keeps the existing questionnaire available", async () => {
  assert.equal(await loadAuthenticatedQuestionnaireDefinition({
    auth: { authStateReady: async () => {}, currentUser: {} },
    loadFromFirestore: async () => null,
    loadFromServer: async () => { throw new Error("Must not call fallback after a successful query"); },
  }), null);
});

test("schema and network failures are not converted into an absent definition", async () => {
  for (const code of ["invalid-argument", "unavailable"]) {
    const failure = Object.assign(new Error("Unable to verify published form"), { code });
    await assert.rejects(loadAuthenticatedQuestionnaireDefinition({
      auth: { authStateReady: async () => {}, currentUser: {} },
      loadFromFirestore: async () => { throw failure; },
      loadFromServer: async () => { throw new Error("Must not bypass schema or network error"); },
    }), (error) => error === failure);
  }
});

test("failed server fallback remains an error and a subsequent attempt can recover", async () => {
  const serverError = new Error("Published definition unavailable");
  let attempt = 0;
  const loaders = {
    auth: { authStateReady: async () => {}, currentUser: { getIdToken: async () => "token" } },
    loadFromFirestore: async () => { throw Object.assign(new Error("Denied"), { code: "permission-denied" }); },
    loadFromServer: async () => {
      if (attempt++ === 0) throw serverError;
      return { revision: 8 };
    },
  };
  await assert.rejects(loadAuthenticatedQuestionnaireDefinition(loaders), (error) => error === serverError);
  assert.deepEqual(await loadAuthenticatedQuestionnaireDefinition(loaders), { revision: 8 });
});

test("a stalled optional definition read times out so the built-in questionnaire can be shown", async () => {
  await assert.rejects(withQuestionnaireLoadTimeout(() => new Promise(() => {}), 5), { code: "unavailable" });
  const definition = { id: "current", revision: 5 };
  assert.equal(await withQuestionnaireLoadTimeout(async () => definition, 100), definition);
  assert.equal(await withQuestionnaireLoadTimeout(async () => null, 100), null);
});
