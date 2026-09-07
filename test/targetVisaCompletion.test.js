import assert from "node:assert/strict";
import test from "node:test";
import { getTargetPersonalDetailsIssues } from "../src/lib/targetVisaCompletion.js";

test("legacy completed spouse/child details need newly collected birthplace facts before submission", () => {
  const profiles = [
    { id: "spouse", relationship: "spouse", given_names: "Sam" },
    { id: "child", relationship: "child", given_names: "Casey" },
  ];
  const issues = getTargetPersonalDetailsIssues("partner", { profiles, profiles_data: { child: { details: { relationship_to_spouse: "Child" } } } });
  assert.equal(issues.length, 6);
  assert.ok(issues.some((issue) => issue.startsWith("Child (Casey): Country of birth")));
  assert.deepEqual(getTargetPersonalDetailsIssues("temporary-work", { profiles }), []);
});

test("legacy valid spouse details remain valid and citizenship Yes requires rows", () => {
  const draft = { profiles: [{ id: "spouse", relationship: "spouse" }], protection_spouse_details: {
    country_of_birth: "Australia", city_of_birth: "Sydney", state_of_birth: "NSW", citizenship_other_than_birth: "no",
  } };
  assert.deepEqual(getTargetPersonalDetailsIssues("protection", draft), []);
  draft.protection_spouse_details.citizenship_other_than_birth = "yes";
  assert.match(getTargetPersonalDetailsIssues("protection", draft)[0], /at least one citizenship/);
});
