import test from "node:test";
import assert from "node:assert/strict";
import {
  COURSE_LANGUAGE_OPTIONS,
  normalizeEducationRecord,
  optionsWithSavedValue,
  normalizeSponsorCharacter,
  normalizeSponsorTravelReason,
} from "../src/lib/partnerQuestionnaireAlignment.js";

test("education migration normalizes ongoing status without inventing a Chinese dialect or losing stored fields", () => {
  const original = {
    course_status: "Ongoing", course_language: "Chinese", institution_name: "Example",
    custom_evidence: { reference: "original-record" },
  };
  const migrated = normalizeEducationRecord(original);
  assert.equal(migrated.course_status, "Current/Ongoing");
  assert.equal(migrated.course_language, "Chinese");
  assert.deepEqual(migrated.custom_evidence, original.custom_evidence);
  assert.equal(original.course_status, "Ongoing");
  assert.ok(optionsWithSavedValue(COURSE_LANGUAGE_OPTIONS, migrated.course_language).includes("Chinese"));
  assert.ok(!COURSE_LANGUAGE_OPTIONS.includes("Chinese"));
  assert.equal(normalizeEducationRecord({ course_status: "Legacy status" }).course_status, "Legacy status");
});

test("saved option compatibility neither mutates the approved choices nor duplicates supported answers", () => {
  const original = ["Birth", "Descent", "Naturalisation"];
  assert.deepEqual(optionsWithSavedValue(original, "Other"), [...original, "Other"]);
  assert.deepEqual(original, ["Birth", "Descent", "Naturalisation"]);
  assert.deepEqual(optionsWithSavedValue(original, "Birth"), original);
  assert.deepEqual(optionsWithSavedValue(original, ""), original);
});

test("sponsor national-security migration merges aliases without dropping distinct or repeated historical events", () => {
  const first = { country: "Australia", details: "Original record", date_year: "2020" };
  const second = { country: "Australia", details: "Original record", date_year: "2021" };
  const source = {
    national_security_risk: "yes",
    national_security_risk_details: [first, first],
    national_security_details: [first, second],
    military_service_details: [{ duties_description: "Existing military duties", custom: "retained" }],
  };
  const result = normalizeSponsorCharacter(source);
  assert.deepEqual(result.national_security_risk_details, [first, first, second]);
  assert.deepEqual(result.military_service_details, source.military_service_details);
  assert.deepEqual(source.national_security_details, [first, second]);
  // A subsequent save synchronizes the alias, so reloading is idempotent.
  assert.deepEqual(normalizeSponsorCharacter({ ...result, national_security_details: result.national_security_risk_details }), result);
  assert.equal(normalizeSponsorCharacter(null).national_security_risk, "no");
});

test("sponsor reason display normalizes shared categories while preserving residence scope", () => {
  assert.equal(normalizeSponsorTravelReason("Work"), "Work, study or training");
  assert.equal(normalizeSponsorTravelReason("Study"), "Work, study or training");
  assert.equal(normalizeSponsorTravelReason("Holiday"), "Holiday or Leisure");
  for (const value of ["Temporary Residence", "Permanent Residence", "Visit Friends", "Legacy reason"]) {
    assert.equal(normalizeSponsorTravelReason(value), value);
  }
});
