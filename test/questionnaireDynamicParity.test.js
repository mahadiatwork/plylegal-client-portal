import assert from "node:assert/strict";
import { test } from "node:test";
import { applyQuestionnairePagePrefill, preserveUnmanagedAnswers } from "../src/lib/questionnaires/answers.js";
import { formatQuestionnaireColumnValue } from "../src/lib/questionnaires/columnFormat.js";

const draft = {
  profiles: [{ id: "main-1", relationship: "main_applicant", given_names: "Alex", family_name: "Main", gender: "Male", birth_day: "07", birth_month: "August", birth_year: "1990" }],
};
const page = {
  metadata: {
    prefill: [
      { answerKey: "given_names", source: "profile", field: "given_names", mode: "always" },
      { answerKey: "birth_day", source: "profile", field: "birth_day", mode: "whenEmpty", format: "dayNumber" },
      { answerKey: "birth_month", source: "profile", field: "birth_month", mode: "whenEmpty", format: "monthNumber" },
      { answerKey: "is_main_applicant", value: "yes", mode: "whenEmpty" },
    ],
  },
};

test("prefill copies roster values like the legacy Details pages", () => {
  assert.deepEqual(applyQuestionnairePagePrefill(page, {}, { draft, profileId: "main-1" }), {
    given_names: "Alex",
    birth_day: "7",
    birth_month: "8",
    is_main_applicant: "yes",
  });
});

test("prefill 'always' overrides saved values; 'whenEmpty' keeps them", () => {
  const values = applyQuestionnairePagePrefill(page, { given_names: "Old", birth_day: "3", is_main_applicant: "no" }, { draft, profileId: "main-1" });
  assert.equal(values.given_names, "Alex");
  assert.equal(values.birth_day, "3");
  assert.equal(values.is_main_applicant, "no");
});

test("prefill is a no-op without rules or without a matching profile", () => {
  const values = { a: 1 };
  assert.equal(applyQuestionnairePagePrefill({}, values, { draft }), values);
  assert.deepEqual(applyQuestionnairePagePrefill(page, {}, { draft, profileId: "missing" }), { is_main_applicant: "yes" });
});

test("dynamic saves keep stored keys the page does not manage", () => {
  assert.deepEqual(
    preserveUnmanagedAnswers({ removed_question: "kept", a: "old" }, { a: "new" }),
    { removed_question: "kept", a: "new" },
  );
  assert.deepEqual(preserveUnmanagedAnswers(undefined, { a: 1 }), { a: 1 });
  assert.deepEqual(preserveUnmanagedAnswers({ a: 1 }, [1]), [1]);
});

test("repeater table columns match the legacy table formatting", () => {
  const row = { date_from_day: "1", date_from_month: "January", date_from_year: "2020", is_main_language: "yes", applicant_ids: ["main-1", "legacy_name:Sam"] };
  assert.equal(formatQuestionnaireColumnValue(row, { key: "date_from", format: "groupedDate" }), "1 January 2020");
  assert.equal(formatQuestionnaireColumnValue(row, { key: "date_day", format: "groupedDate" }), "");
  assert.equal(formatQuestionnaireColumnValue(row, { key: "date_to", format: "groupedDateOrOngoing" }), "Ongoing");
  assert.equal(formatQuestionnaireColumnValue(row, { key: "date_from_year", format: "yearFromDateParts" }), "2020");
  assert.equal(formatQuestionnaireColumnValue(row, { key: "is_main_language", format: "yesNoLabel" }), "Yes");
  assert.equal(
    formatQuestionnaireColumnValue(row, { key: "applicant_ids", format: "applicantNames" }, { optionSources: { applicantIds: [{ value: "main-1", label: "Alex Main" }] } }),
    "Alex Main, Sam",
  );
  assert.equal(
    formatQuestionnaireColumnValue({ status: "c" }, { key: "status" }, { fields: [{ answerKey: "status", options: [{ value: "c", label: "Current" }] }] }),
    "Current",
  );
});

test("anyOf display rules: any nested rule shows the question; nesting is rejected", async () => {
  const { evaluateVisibleIf, getQuestionnaireDefinitionIssues } = await import("../src/lib/questionnaires/validation.js");
  const anyOf = { op: "anyOf", value: [{ field: "a", op: "equals", value: "yes" }, { field: "b", op: "equals", value: "yes" }] };
  assert.equal(evaluateVisibleIf([anyOf], { b: "yes" }), true);
  assert.equal(evaluateVisibleIf([anyOf], { a: "no" }), false);
  const definition = {
    id: "t", visaType: "temporary-work", visaContexts: ["482"], title: "t", version: "1", status: "active", schemaVersion: 1, revision: 1,
    pages: [{ id: "p", route: "/intake/temporary-work/all-applicants/character", title: "p", sectionKey: "s", scope: "shared", order: 1,
      questions: [
        { id: "a", answerKey: "a", label: "A", type: "yesNo" },
        { id: "b", answerKey: "b", label: "B", type: "yesNo" },
        { id: "c", answerKey: "c", label: "C", type: "text", visibleIf: [anyOf] },
      ] }],
  };
  assert.deepEqual(getQuestionnaireDefinitionIssues(definition), []);
  definition.pages[0].questions[2].visibleIf = [{ op: "anyOf", value: [anyOf] }];
  assert.ok(getQuestionnaireDefinitionIssues(definition).some((issue) => /anyOf/.test(issue)));
  definition.pages[0].questions[2].visibleIf = [{ op: "anyOf", value: [{ field: "missing", op: "exists" }] }];
  assert.ok(getQuestionnaireDefinitionIssues(definition).some((issue) => /missing/.test(issue)));
});

test("child custody layout maps the legacy nested booleans both ways", async () => {
  const { getQuestionnairePageSavedValues, getQuestionnairePageStorageValues, questionnairePageOwnsSection } = await import("../src/lib/questionnaires/answers.js");
  const page = { route: "/intake/temporary-work/children/child-profile/custody", scope: "profile", sectionKey: "custody", metadata: { answerLayout: "childCustody", profileSection: "custody", profileRole: "child" }, questions: [] };
  const stored = { under_18: true, primary_custody: { has: false, details: "Court order" }, other_person_rights: { has: true, details: "Father" }, travel_impediments: { has: false, details: "" } };
  const draft = { profiles: [{ id: "c1", relationship: "child" }], profiles_data: { c1: { custody: stored } } };
  const form = getQuestionnairePageSavedValues(draft, page, "c1");
  assert.equal(form.under_18, "yes");
  assert.equal(form.primary_custody_has, "no");
  assert.equal(form.primary_custody_details, "Court order");
  assert.equal(form.other_person_rights_has, "yes");
  assert.deepEqual(getQuestionnairePageStorageValues(page, form, draft), stored);
  assert.deepEqual(getQuestionnairePageStorageValues(page, { ...form, under_18: "no" }, draft), { under_18: false });
  assert.equal(questionnairePageOwnsSection(page), true);
});

test("child custody: an unanswered under-18 question is not stored as No", async () => {
  const { getQuestionnairePageStorageValues } = await import("../src/lib/questionnaires/answers.js");
  const page = { metadata: { answerLayout: "childCustody" } };
  assert.deepEqual(getQuestionnairePageStorageValues(page, { under_18: "", primary_custody_has: "" }), {});
});
