import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("matter resources are owner-readable but never client-writable or publicly readable", async () => {
  const rules = await readFile(new URL("../firestore.rules", import.meta.url), "utf8");

  assert.match(rules, /match \/applications\/\{appId\}\/resources\/\{resourceId\}/);
  assert.match(rules, /match \/applications\/\{appId\}\/data\/\{document=\*\*\}/);
  assert.doesNotMatch(rules, /match \/applications\/\{appId\}\/\{document=\*\*\}/);
  assert.match(
    rules,
    /match \/applications\/\{appId\}\/resources\/\{resourceId\} \{[\s\S]*?request\.auth != null[\s\S]*?allow write: if false;/
  );
  const resourceBlock = rules.match(
    /match \/applications\/\{appId\}\/resources\/\{resourceId\} \{([\s\S]*?)\n    \}/
  )?.[1] || "";
  assert.doesNotMatch(resourceBlock, /publicReviewAccess/);
});
