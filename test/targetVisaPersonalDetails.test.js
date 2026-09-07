import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTargetPersonalDetails, mergeTargetPersonalDetails } from "../src/lib/targetVisaPersonalDetails.js";

test("relationship-only child records gain editable profile values without losing their relationship answer", () => {
  const saved = { relationship_to_spouse: "Step-child", custom_note: "Keep this evidence" };
  const profile = { given_names: "Casey", family_name: "Test", gender: "Other", birth_day: "04", birth_month: "September", birth_year: "2015" };
  const normalized = normalizeTargetPersonalDetails(saved, profile);
  assert.equal(normalized.given_names, "Casey");
  assert.equal(normalized.gender, "Other");
  assert.equal(normalized.birth_day, "4");
  assert.equal(normalized.birth_month, "9");
  assert.equal(normalized.relationship_to_spouse, "Step-child");
  assert.equal(normalized.custom_note, "Keep this evidence");
  assert.deepEqual(saved, { relationship_to_spouse: "Step-child", custom_note: "Keep this evidence" });
});

test("editing common spouse fields preserves sponsor/migration and previously saved citizenship facts", () => {
  const existing = { family_name: "Original", intending_to_migrate: "Other - they are my Sponsor", current_residence: "France", citizenships: [{ country: "France", how_obtained: "Birth", date_obtained_year: "1985" }], stateless_explanation: "Historical note" };
  const merged = mergeTargetPersonalDetails(existing, { family_name: "Updated", gender: "Other" });
  assert.equal(merged.family_name, "Updated");
  assert.equal(merged.intending_to_migrate, existing.intending_to_migrate);
  assert.deepEqual(merged.citizenships, existing.citizenships);
  assert.equal(merged.stateless_explanation, existing.stateless_explanation);
  assert.equal(existing.family_name, "Original");
});
