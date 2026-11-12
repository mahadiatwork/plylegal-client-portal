import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const routes = [
  "../app/api/review-pdf/application/[matterId]/route.js",
  "../app/api/review-pdf/application/[matterId]/draft/route.js",
];

for (const route of routes) {
  test(`${route} reads through the Admin SDK, not the unauthenticated client SDK`, async () => {
    const source = await readFile(new URL(route, import.meta.url), "utf8");
    assert.match(source, /@\/lib\/firebase-admin/);
    assert.doesNotMatch(source, /firebase\/firestore/);
    assert.doesNotMatch(source, /@\/lib\/review-pdf\/firebase/);
  });

  test(`${route} does not leak internal error messages`, async () => {
    const source = await readFile(new URL(route, import.meta.url), "utf8");
    assert.doesNotMatch(source, /error:\s*error\.message/);
  });
}
