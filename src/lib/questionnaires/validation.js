export const SUPPORTED_QUESTION_TYPES = new Set([
  "text",
  "textarea",
  "radio",
  "select",
  "checkbox",
  "dateParts",
  "yesNo",
  "repeater",
]);

const SUPPORTED_VISIBLE_IF_OPERATORS = new Set([
  "equals",
  "notEquals",
  "in",
  "notIn",
  "exists",
  "notExists",
]);

function validateVisibleIf(visibleIf, path, issues) {
  if (visibleIf === undefined) return;
  if (!Array.isArray(visibleIf)) {
    issues.push(`${path}.visibleIf must be an array`);
    return;
  }

  visibleIf.forEach((condition, index) => {
    const conditionPath = `${path}.visibleIf[${index}]`;
    if (!condition || typeof condition !== "object") {
      issues.push(`${conditionPath} must be an object`);
      return;
    }
    if (!condition.field || typeof condition.field !== "string") {
      issues.push(`${conditionPath}.field is required`);
    }
    if (!SUPPORTED_VISIBLE_IF_OPERATORS.has(condition.op)) {
      issues.push(`${conditionPath}.op is unsupported`);
    }
    if ((condition.op === "in" || condition.op === "notIn") && !Array.isArray(condition.value)) {
      issues.push(`${conditionPath}.value must be an array for ${condition.op}`);
    }
  });
}

function validateQuestion(question, path, seenIds, seenAnswerKeys, issues) {
  if (!question || typeof question !== "object") {
    issues.push(`${path} must be an object`);
    return;
  }

  if (!question.id || typeof question.id !== "string") {
    issues.push(`${path}.id is required`);
  } else if (seenIds.has(question.id)) {
    issues.push(`${path}.id "${question.id}" is duplicated`);
  } else {
    seenIds.add(question.id);
  }

  if (!question.answerKey || typeof question.answerKey !== "string") {
    issues.push(`${path}.answerKey is required`);
  } else if (seenAnswerKeys.has(question.answerKey)) {
    issues.push(`${path}.answerKey "${question.answerKey}" is duplicated`);
  } else {
    seenAnswerKeys.add(question.answerKey);
  }

  if (!SUPPORTED_QUESTION_TYPES.has(question.type)) {
    issues.push(`${path}.type "${question.type}" is unsupported`);
  }

  if (["radio", "select", "yesNo"].includes(question.type) && question.options !== undefined && !Array.isArray(question.options)) {
    issues.push(`${path}.options must be an array`);
  }

  validateVisibleIf(question.visibleIf, path, issues);

  if (question.followUps !== undefined) {
    if (!Array.isArray(question.followUps)) {
      issues.push(`${path}.followUps must be an array`);
    } else {
      question.followUps.forEach((followUp, index) => {
        validateQuestion(followUp, `${path}.followUps[${index}]`, seenIds, seenAnswerKeys, issues);
      });
    }
  }
}

export function getQuestionnaireDefinitionIssues(definition) {
  const issues = [];

  if (!definition || typeof definition !== "object") {
    return ["definition must be an object"];
  }

  if (!definition.id || typeof definition.id !== "string") {
    issues.push("definition.id is required");
  }
  if (!definition.version || typeof definition.version !== "string") {
    issues.push("definition.version is required");
  }
  if (!Array.isArray(definition.pages)) {
    issues.push("definition.pages must be an array");
    return issues;
  }

  const seenPageIds = new Set();
  definition.pages.forEach((page, pageIndex) => {
    const pagePath = `pages[${pageIndex}]`;
    if (!page?.id || typeof page.id !== "string") {
      issues.push(`${pagePath}.id is required`);
    } else if (seenPageIds.has(page.id)) {
      issues.push(`${pagePath}.id "${page.id}" is duplicated`);
    } else {
      seenPageIds.add(page.id);
    }
    if (!page?.route || typeof page.route !== "string") {
      issues.push(`${pagePath}.route is required`);
    }
    if (!page?.sectionKey || typeof page.sectionKey !== "string") {
      issues.push(`${pagePath}.sectionKey is required`);
    }
    if (!Array.isArray(page?.questions)) {
      issues.push(`${pagePath}.questions must be an array`);
      return;
    }

    const seenIds = new Set();
    const seenAnswerKeys = new Set();
    page.questions.forEach((question, questionIndex) => {
      validateQuestion(question, `${pagePath}.questions[${questionIndex}]`, seenIds, seenAnswerKeys, issues);
    });
  });

  return issues;
}

export function validateQuestionnaireDefinition(definition) {
  const issues = getQuestionnaireDefinitionIssues(definition);
  if (issues.length > 0) {
    throw new Error(`Invalid questionnaire definition:\n${issues.join("\n")}`);
  }
  return definition;
}

export function evaluateVisibleIf(conditions = [], values = {}) {
  if (!conditions || conditions.length === 0) return true;

  return conditions.every((condition) => {
    const currentValue = values?.[condition.field];
    switch (condition.op) {
      case "equals":
        return currentValue === condition.value;
      case "notEquals":
        return currentValue !== condition.value;
      case "in":
        return Array.isArray(condition.value) && condition.value.includes(currentValue);
      case "notIn":
        return Array.isArray(condition.value) && !condition.value.includes(currentValue);
      case "exists":
        return currentValue !== undefined && currentValue !== null && currentValue !== "";
      case "notExists":
        return currentValue === undefined || currentValue === null || currentValue === "";
      default:
        return false;
    }
  });
}
