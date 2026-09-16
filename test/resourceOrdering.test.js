import assert from "node:assert/strict";
import test from "node:test";
import {
  LAST_RESOURCE_ORDER,
  compareResourceItems,
  normalizeResourceOrder,
} from "../src/lib/resourceOrdering.js";

test("resource positions preserve zero and numeric strings while missing and invalid orders sort last", () => {
  for (const [input, expected] of [[0, 0], [1, 1], ["0", 0], ["1", 1], [" 12 ", 12]]) {
    assert.equal(normalizeResourceOrder(input), expected);
  }
  for (const input of [undefined, null, "", " ", "first", Infinity, NaN, false, [], {}]) {
    assert.equal(normalizeResourceOrder(input), LAST_RESOURCE_ORDER);
  }
});

test("client display preserves template and matter custom orders within the same category", () => {
  const items = [
    { id: "template-last", resourceSource: "template", category: "Guides", order: "10", name: "Last" },
    { id: "matter-missing", resourceSource: "matter", category: "Guides", name: "A missing position" },
    { id: "template-first", resourceSource: "template", category: "Guides", order: 0, name: "First" },
    { id: "matter-second", resourceSource: "matter", category: "Guides", order: "1", name: "Second" },
    { id: "matter-blank", resourceSource: "matter", category: "Guides", order: "", name: "Blank position" },
    { id: "template-invalid", resourceSource: "template", category: "Guides", order: "invalid", name: "Invalid position" },
  ];

  assert.deepEqual(items.sort(compareResourceItems).map(({ id }) => id), [
    "template-first", "matter-second", "template-last", "matter-missing", "matter-blank", "template-invalid",
  ]);
});
