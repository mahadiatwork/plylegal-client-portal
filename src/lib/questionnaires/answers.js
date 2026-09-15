import { evaluateVisibleIf } from "./validation.js";

export const DYNAMIC_QUESTIONNAIRE_COMPLETIONS_KEY = "dynamicQuestionnaireCompletions";

export function getQuestionnaireDatePartNames(question) {
  return question.parts || {
    day: `${question.answerKey}_day`,
    month: `${question.answerKey}_month`,
    year: `${question.answerKey}_year`,
  };
}

export function getQuestionnaireFieldNames(question) {
  if (question.type === "dateParts") {
    return Object.values(getQuestionnaireDatePartNames(question));
  }
  return question.answerKey ? [question.answerKey] : [];
}

function getQuestionnaireEmptyValue(question) {
  if (question.type === "checkbox") return false;
  if (question.type === "repeater") return [];
  return "";
}

function valuesMatch(left, right) {
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }
  return left === right;
}

/**
 * Clear answers which the definition explicitly says must not survive while hidden.
 * This runs before validation and persistence as a backstop for conditional fields
 * restored by an asynchronous form reset.
 */
export function sanitizeQuestionnairePageValues(page, values = {}) {
  const sanitized = { ...values };
  const questions = page?.questions || [];
  let changed = true;
  let remainingPasses = 1;

  function countQuestions(items = []) {
    return items.reduce(
      (count, question) => count + 1 + countQuestions(question.followUps || []),
      0
    );
  }

  remainingPasses += countQuestions(questions);

  while (changed && remainingPasses > 0) {
    changed = false;
    remainingPasses -= 1;

    function sanitizeQuestions(items = [], ancestorsVisible = true) {
      items.forEach((question) => {
        const visible = ancestorsVisible && evaluateVisibleIf(question.visibleIf, sanitized);
        if (!visible && question.clearWhenHidden) {
          const emptyValue = getQuestionnaireEmptyValue(question);
          getQuestionnaireFieldNames(question).forEach((fieldName) => {
            if (!valuesMatch(sanitized[fieldName], emptyValue)) {
              sanitized[fieldName] = Array.isArray(emptyValue) ? [...emptyValue] : emptyValue;
              changed = true;
            }
          });
        }
        if (question.followUps?.length) sanitizeQuestions(question.followUps, visible);
      });
    }

    sanitizeQuestions(questions);
  }

  return sanitized;
}

export function questionnaireAnswerHasValue(value, question) {
  if (Array.isArray(value)) return value.length > 0;
  if (question.type === "checkbox") return value === true;
  if (typeof value === "boolean") return true;
  if (typeof value === "string") return value.trim() !== "";
  return value !== null && value !== undefined;
}

export function getQuestionnairePageValidationIssues(page, values = {}) {
  const issues = [];

  function validateQuestions(questions = [], ancestorsVisible = true) {
    questions.forEach((question) => {
      const visible = ancestorsVisible && evaluateVisibleIf(question.visibleIf, values);
      if (visible) {
        const fieldNames = getQuestionnaireFieldNames(question);
        if (question.required) fieldNames.forEach((fieldName) => {
          if (!questionnaireAnswerHasValue(values[fieldName], question)) {
            issues.push({
              fieldName,
              message: question.validation?.requiredMessage || "This field is required",
              questionId: question.id,
            });
          }
        });

        if (
          ["radio", "select", "yesNo"].includes(question.type) &&
          Array.isArray(question.options) &&
          question.options.length > 0
        ) {
          const value = values[question.answerKey];
          const hasValue = questionnaireAnswerHasValue(value, question);
          const isAvailable = question.options.some((option) => option.value === value);
          if (hasValue && !isAvailable) {
            issues.push({
              fieldName: question.answerKey,
              message: "Select one of the available options",
              questionId: question.id,
            });
          }
        }
      }
      if (question.followUps?.length) validateQuestions(question.followUps, visible);
    });
  }

  validateQuestions(page?.questions || []);
  return issues;
}

function questionnaireReviewValueHasValue(value) {
  if (Array.isArray(value)) return value.some(questionnaireReviewValueHasValue);
  if (value && typeof value === "object") {
    return Object.values(value).some(questionnaireReviewValueHasValue);
  }
  if (typeof value === "string") return value.trim() !== "";
  return value !== null && value !== undefined;
}

function getQuestionnaireReviewValue(question, values) {
  if (question.type === "dateParts") {
    const names = getQuestionnaireDatePartNames(question);
    const parts = [values[names.day], values[names.month], values[names.year]];
    if (!parts.some(questionnaireReviewValueHasValue)) return "";
    return parts.map((part) => String(part || "—")).join("/");
  }

  const value = values[question.answerKey];
  const options = question.type === "yesNo" && !question.options?.length
    ? [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]
    : question.options || [];
  if (!options.length) return value;

  const labels = new Map(options.map((option) => [option.value, option.label]));
  if (Array.isArray(value)) return value.map((entry) => labels.get(entry) || entry);
  return labels.get(value) || value;
}

/** Build review rows using the exact wording and visibility rules in a JSON page. */
export function getQuestionnairePageReviewItems(page, values = {}) {
  const items = [];

  function appendQuestions(questions = [], ancestorsVisible = true) {
    questions.forEach((question) => {
      const visible = ancestorsVisible && evaluateVisibleIf(question.visibleIf, values);
      if (visible) {
        const value = getQuestionnaireReviewValue(question, values);
        if (questionnaireReviewValueHasValue(value)) {
          items.push({ label: question.label, value });
        }
      }
      if (question.followUps?.length) appendQuestions(question.followUps, visible);
    });
  }

  appendQuestions(page?.questions || []);
  return items;
}

export function getQuestionnaireCompletionKey(page) {
  return page?.completionKey || String(page?.route || "").replace(/^\/intake\//, "");
}

export function getQuestionnaireCompletionStamp(definition, page) {
  return {
    definitionId: definition?.id || "",
    pageId: page?.id || "",
    revision: Number.isInteger(definition?.revision) ? definition.revision : 0,
  };
}

export function isQuestionnaireCompletionStampCurrent(stamp, definition, page) {
  if (!stamp || typeof stamp !== "object") return false;
  const expected = getQuestionnaireCompletionStamp(definition, page);
  return (
    stamp.definitionId === expected.definitionId &&
    stamp.pageId === expected.pageId &&
    stamp.revision === expected.revision
  );
}

function getOwnNestedValue(value, path) {
  return String(path || "").split(".").filter(Boolean).reduce((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    if (!Object.prototype.hasOwnProperty.call(current, key)) return undefined;
    return current[key];
  }, value);
}

export function getQuestionnairePageSavedValues(draft, page, profileId = null) {
  if (page?.scope === "profile") {
    return draft?.profiles_data?.[profileId]?.[page.sectionKey] || {};
  }
  return getOwnNestedValue(draft, page?.sectionKey) || {};
}
