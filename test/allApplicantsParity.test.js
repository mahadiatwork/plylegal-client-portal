import test from "node:test";
import assert from "node:assert/strict";
import {
  APPLICANT_COUNTRIES,
  COMMON_TRAVEL_REASONS,
  HEALTH_CONDITIONS,
  TARGET_CHARACTER_QUESTIONS,
  alignCharacterQuestion,
  withCurrentOption,
} from "../src/lib/allApplicantsParity.js";
import { COUNTRIES } from "../src/reuseable/countries.js";
import { temporaryWork482Definition } from "../src/lib/questionnaires/temporaryWork482.definition.js";

test("editing a legacy travel reason keeps its saved value and the approved choices", () => {
  const approved = [...COMMON_TRAVEL_REASONS];
  for (const savedValue of ["Working Holiday", "Visiting family", "Military deployment", "Returning home"]) {
    const choices = withCurrentOption(COMMON_TRAVEL_REASONS, savedValue);
    assert.deepEqual(choices.slice(0, approved.length), approved);
    assert.equal(choices.at(-1), savedValue);
    assert.equal(choices.filter((value) => value === savedValue).length, 1);
    assert.strictEqual(withCurrentOption(choices, savedValue), choices);
  }
  assert.deepEqual(COMMON_TRAVEL_REASONS, approved, "opening an old record must not alter new-record choices");
});

test("ordinary or unanswered choices add no duplicate or blank option", () => {
  for (const value of ["Other", "Business", "", null, undefined]) {
    assert.strictEqual(withCurrentOption(COMMON_TRAVEL_REASONS, value), COMMON_TRAVEL_REASONS);
  }
});

test("old health selections remain editable while broader condition coverage remains available", () => {
  const oldCondition = "Kidney disease (including dialysis)";
  const choices = withCurrentOption(HEALTH_CONDITIONS, oldCondition);
  assert.ok(choices.includes(oldCondition));
  assert.ok(choices.includes("Kidney disease, including dialysis"));
  assert.ok(choices.includes("HIV infection, including AIDS"));
  for (const condition of [
    "Respiratory condition (including asthma)",
    "Cardiac (heart) condition",
    "Liver disease (including hepatitis or cirrhosis)",
    "Diabetes",
    "Disability (physical or intellectual)",
    "Hospitalisation (any cause)",
    "Neurological condition",
  ]) assert.ok(HEALTH_CONDITIONS.includes(condition), `Keep existing coverage: ${condition}`);

  const roles = ["Ambulance Officer / Paramedic", "Other"];
  const oldRole = "Amb Ambulance Officer / Paramedic";
  assert.ok(withCurrentOption(roles, oldRole).includes(oldRole));
  assert.deepEqual(roles, ["Ambulance Officer / Paramedic", "Other"]);
});

test("country alignment retains both approved values and protection's existing additional values", () => {
  for (const country of [...COUNTRIES, "North Macedonia", "Palestine", "Timor-Leste"]) {
    assert.ok(APPLICANT_COUNTRIES.includes(country), `A saved country must remain selectable: ${country}`);
  }
  assert.equal(new Set(APPLICANT_COUNTRIES).size, APPLICANT_COUNTRIES.length);
});

test("common character wording retains target answer keys and question metadata", () => {
  const original = { key: "military_training", label: "Legacy wording", metadata: { repeatable: true } };
  const aligned = alignCharacterQuestion(original);
  const approved = temporaryWork482Definition.pages[0].questions.find((question) => question.id === "char_q14");
  assert.equal(aligned.label, approved.label);
  assert.equal(aligned.key, original.key);
  assert.strictEqual(aligned.metadata, original.metadata);
  assert.equal(original.label, "Legacy wording");

  const targetKeys = TARGET_CHARACTER_QUESTIONS.map((question) => question.key);
  assert.equal(targetKeys.length, 27);
  assert.equal(new Set(targetKeys).size, 27);
  assert.ok(targetKeys.includes("deported_removed"));
  assert.ok(targetKeys.includes("excluded_from_country"));
  assert.ok(targetKeys.includes("police_check_last_12_months"));
  const labels = Object.fromEntries(TARGET_CHARACTER_QUESTIONS.map((question) => [question.key, question.label]));
  assert.match(labels.overstayed_visa, /visa or entry permit/);
  assert.match(labels.excluded_from_country, /excluded from or asked to leave/);
  assert.doesNotMatch(labels.deported_removed, /excluded/);
});
