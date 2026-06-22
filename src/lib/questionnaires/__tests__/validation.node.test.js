import test from "node:test";
import assert from "node:assert/strict";
import { temporaryWork482Definition } from "../temporaryWork482.definition.js";
import {
  evaluateVisibleIf,
  getQuestionnaireDefinitionIssues,
  validateQuestionnaireDefinition,
} from "../validation.js";

test("temporary work 482 definition is valid", () => {
  assert.equal(validateQuestionnaireDefinition(temporaryWork482Definition), temporaryWork482Definition);
});

test("definition validation rejects missing answerKey", () => {
  const broken = structuredClone(temporaryWork482Definition);
  delete broken.pages[0].questions[0].answerKey;

  const issues = getQuestionnaireDefinitionIssues(broken);
  assert.ok(issues.some((issue) => issue.includes("answerKey is required")));
});

test("definition validation rejects unsupported question type", () => {
  const broken = structuredClone(temporaryWork482Definition);
  broken.pages[0].questions[0].type = "unsupported";

  const issues = getQuestionnaireDefinitionIssues(broken);
  assert.ok(issues.some((issue) => issue.includes("unsupported")));
});

test("definition validation rejects invalid visibleIf", () => {
  const broken = structuredClone(temporaryWork482Definition);
  broken.pages[0].questions[0].visibleIf = [{ field: "char_q01", op: "contains", value: "yes" }];

  const issues = getQuestionnaireDefinitionIssues(broken);
  assert.ok(issues.some((issue) => issue.includes("visibleIf")));
});

test("definition validation rejects duplicate question ids", () => {
  const broken = structuredClone(temporaryWork482Definition);
  broken.pages[0].questions[1].id = broken.pages[0].questions[0].id;

  const issues = getQuestionnaireDefinitionIssues(broken);
  assert.ok(issues.some((issue) => issue.includes("duplicated")));
});

test("visibleIf evaluates supported operators", () => {
  assert.equal(evaluateVisibleIf([{ field: "answer", op: "equals", value: "yes" }], { answer: "yes" }), true);
  assert.equal(evaluateVisibleIf([{ field: "answer", op: "notEquals", value: "yes" }], { answer: "no" }), true);
  assert.equal(evaluateVisibleIf([{ field: "answer", op: "in", value: ["yes", "maybe"] }], { answer: "yes" }), true);
  assert.equal(evaluateVisibleIf([{ field: "answer", op: "notIn", value: ["yes"] }], { answer: "no" }), true);
  assert.equal(evaluateVisibleIf([{ field: "answer", op: "exists" }], { answer: "no" }), true);
  assert.equal(evaluateVisibleIf([{ field: "answer", op: "notExists" }], { answer: "" }), true);
});
