import test from "node:test";
import assert from "node:assert/strict";
import { CRM_CLEAR_POLICIES, CRM_FIELD_CATALOG } from "../crmFieldCatalog.js";
import {
  applyClearPolicy,
  isEmptyPortalAnswer,
  transformQuestionnaireAnswer,
} from "../questionnaireTransforms.js";

const dateQuestion = {
  type: "dateParts",
  answerKey: "birth",
  parts: { day: "birth_day", month: "birth_month", year: "birth_year" },
};

test("transforms text, boolean, number, picklist, and date parts", () => {
  assert.deepEqual(
    transformQuestionnaireAnswer({ transform: "text", value: "  Ada  ", question: { type: "text" } }),
    { empty: false, value: "Ada" },
  );
  assert.deepEqual(
    transformQuestionnaireAnswer({ transform: "boolean", value: "yes", question: { type: "yesNo" } }),
    { empty: false, value: true },
  );
  assert.deepEqual(
    transformQuestionnaireAnswer({ transform: "number", value: "12", question: { type: "text" } }),
    { empty: false, value: 12 },
  );
  assert.deepEqual(
    transformQuestionnaireAnswer({
      transform: "picklist",
      value: "Female",
      question: { type: "radio" },
      optionMap: { Male: "Male", Female: "Female" },
      catalogField: CRM_FIELD_CATALOG.Contacts.Gender,
    }),
    { empty: false, value: "Female" },
  );
  assert.deepEqual(
    transformQuestionnaireAnswer({
      transform: "date_parts_to_iso",
      value: { birth_day: "10", birth_month: "December", birth_year: "1815" },
      question: dateQuestion,
    }),
    { empty: false, value: "1815-12-10" },
  );
  assert.deepEqual(
    transformQuestionnaireAnswer({
      transform: "date_parts_to_iso",
      value: { birth_day: "10", birth_month: "12", birth_year: "1815" },
      question: dateQuestion,
    }),
    { empty: false, value: "1815-12-10" },
  );
});

test("preserves CRM values when the portal answer is empty", () => {
  const empty = transformQuestionnaireAnswer({ transform: "text", value: "  ", question: { type: "text" } });
  assert.equal(isEmptyPortalAnswer("", { type: "text" }), true);
  assert.deepEqual(
    applyClearPolicy(empty, CRM_CLEAR_POLICIES.preserve_when_empty),
    { empty: true, skip: true, value: null, skipReason: "preserve_when_empty" },
  );
  assert.deepEqual(
    applyClearPolicy(empty, CRM_CLEAR_POLICIES.clear_when_empty),
    { empty: true, clear: true, value: null },
  );
});

test("rejects unmapped picklist values", () => {
  const result = transformQuestionnaireAnswer({
    transform: "picklist",
    value: "Other",
    question: { type: "radio" },
    optionMap: { Male: "Male", Female: "Female" },
    catalogField: CRM_FIELD_CATALOG.Contacts.Gender,
  });
  assert.equal(result.error, "unmapped_picklist_value");
});
