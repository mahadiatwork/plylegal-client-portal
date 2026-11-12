import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const rules = await readFile(new URL("../firestore.rules", import.meta.url), "utf8");

function allowLines(source) {
  return source.split(/\r?\n/).filter((line) => /^\s*allow\b/.test(line));
}

test("no rule grants public access based on a document flag", () => {
  assert.doesNotMatch(rules, /publicReviewAccess/);
});

test("every application and application data read requires authentication", () => {
  const applicationBlocks = rules.match(/match \/applications\/\{appId\}[^\n]*\{[\s\S]*?\n    \}/g) || [];
  assert.ok(applicationBlocks.length >= 3, "expected application, data and resources blocks");
  for (const block of applicationBlocks) {
    for (const line of allowLines(block)) {
      if (/allow write: if false;/.test(line)) continue;
      assert.match(
        block.slice(block.indexOf(line)),
        /request\.auth != null/,
        `allow rule must require authentication: ${line.trim()}`
      );
    }
  }
});
