import assert from "node:assert/strict";
import { test } from "node:test";
import { getQuestionnaireDefinitionIssues } from "../src/lib/questionnaires/validation.js";
import {
  getQuestionnaireFieldNames,
  getQuestionnairePageReviewItems,
  getQuestionnairePageValidationIssues,
  sanitizeQuestionnairePageValues,
} from "../src/lib/questionnaires/answers.js";
import { isQuestionnaireDisplayItem } from "../src/lib/questionnaires/contentItems.js";

const page = {
  id: "details",
  route: "/intake/temporary-work/all-applicants/character",
  title: "Details",
  sectionKey: "content_test",
  scope: "shared",
  order: 10,
  questions: [
    { id: "h1", type: "heading", label: "Personal Information" },
    { id: "family_name", answerKey: "family_name", label: "Family Name", type: "text", required: true },
    { id: "p1", type: "paragraph", label: "Use your passport name.", visibleIf: [{ field: "family_name", op: "exists" }] },
    { id: "given_names", answerKey: "given_names", label: "Given Names", type: "text" },
  ],
};
const definition = {
  id: "content", title: "Content", version: "1", visaType: "temporary-work", visaContexts: ["482"],
  status: "active", schemaVersion: 1, revision: 1, pages: [page],
};

test("published definitions with headings and explanatory text are accepted", () => {
  assert.deepEqual(getQuestionnaireDefinitionIssues(definition), []);
  assert.equal(isQuestionnaireDisplayItem(page.questions[0]), true);
  assert.equal(isQuestionnaireDisplayItem(page.questions[1]), false, "the short-answer 'text' type is a question");
});

test("display content may not carry answer fields", () => {
  const broken = structuredClone(definition);
  broken.pages[0].questions[0].answerKey = "heading_answer";
  assert.ok(getQuestionnaireDefinitionIssues(broken).some((issue) => issue.includes("answerKey is not supported on heading")));
});

test("display content stores nothing, is never required and is not reviewed", () => {
  assert.deepEqual(getQuestionnaireFieldNames(page.questions[0]), []);
  const values = sanitizeQuestionnairePageValues(page, { family_name: "Main", given_names: "Alex" });
  assert.deepEqual(values, { family_name: "Main", given_names: "Alex" });
  assert.deepEqual(getQuestionnairePageValidationIssues(page, values), []);
  assert.deepEqual(
    getQuestionnairePageValidationIssues(page, {}).map((issue) => issue.fieldName),
    ["family_name"],
  );
  assert.deepEqual(getQuestionnairePageReviewItems(page, values).map((item) => item.label), ["Family Name", "Given Names"]);
});
