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

export const SUPPORTED_DEFINITION_STATUSES = new Set(["draft", "active", "archived"]);
export const SUPPORTED_PAGE_SCOPES = new Set(["shared", "profile"]);
export const SUPPORTED_QUESTIONNAIRE_VISA_TYPES = new Set(["temporary-work", "partner", "protection"]);
export const SUPPORTED_QUESTIONNAIRE_SCHEMA_VERSION = 1;

export const QUESTIONNAIRE_LIMITS = Object.freeze({
  maxSerializedBytes: 900 * 1024,
  maxPages: 100,
  maxQuestionsPerPage: 200,
  maxQuestionDepth: 5,
  maxOptionsPerQuestion: 100,
  maxConditionsPerQuestion: 50,
  maxIntroBlocksPerPage: 50,
  maxIntroListItems: 100,
  maxVisaContexts: 20,
});

const SUPPORTED_VISIBLE_IF_OPERATORS = new Set([
  "equals",
  "notEquals",
  "in",
  "notIn",
  "exists",
  "notExists",
]);

const SAFE_ROUTE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const SAFE_DATA_KEY = /^[A-Za-z0-9](?:[A-Za-z0-9_-]{0,254}[A-Za-z0-9])?$/;
const RESERVED_DATA_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const RESERVED_WORKFLOW_ROUTE = /\/(?:start|profile|submit)$/;
const PROFILE_QUESTIONNAIRE_ROUTE = /^\/intake\/(?:temporary-work|partner|protection)\/(?:main-applicant|spouse-partner|children\/[^/]+|non-migrating\/[^/]+)\//;
const SUPPORTED_TEMPORARY_WORK_VISA_CONTEXTS = new Set(["482", "186"]);

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizedUniqueKey(value) {
  return String(value || "").trim().toLocaleLowerCase("en");
}

function getSerializedSize(definition, issues) {
  try {
    const serialized = JSON.stringify(definition);
    return new TextEncoder().encode(serialized).byteLength;
  } catch {
    issues.push("definition must be JSON serializable");
    return null;
  }
}

export function isSafeQuestionnaireRoute(route) {
  if (!isNonEmptyString(route) || route.length > 300) return false;
  if (route.includes("?") || route.includes("#") || route.includes("\\") || route.includes("%")) return false;
  if (!route.startsWith("/intake/") || route.includes("//")) return false;
  if (RESERVED_WORKFLOW_ROUTE.test(route)) return false;

  const segments = route.split("/").slice(1);
  return segments.length >= 2 && segments.every((segment) => SAFE_ROUTE_SEGMENT.test(segment));
}

function isSafeDataKey(value) {
  if (!isNonEmptyString(value) || !SAFE_DATA_KEY.test(value)) return false;
  return !RESERVED_DATA_KEYS.has(value.trim().toLocaleLowerCase("en"));
}

function validateVisaContexts(definition, issues) {
  if (definition.visaContext !== undefined && !isNonEmptyString(definition.visaContext)) {
    issues.push("definition.visaContext must be a non-empty string when provided");
  } else if (
    definition.visaContexts === undefined &&
    isNonEmptyString(definition.visaContext) &&
    definition.visaType === "temporary-work" &&
    !SUPPORTED_TEMPORARY_WORK_VISA_CONTEXTS.has(definition.visaContext.trim())
  ) {
    issues.push('definition.visaContext must be "482" or "186"');
  }

  if (definition.visaContexts === undefined) return;
  if (!Array.isArray(definition.visaContexts)) {
    issues.push("definition.visaContexts must be an array");
    return;
  }
  if (definition.visaContexts.length > QUESTIONNAIRE_LIMITS.maxVisaContexts) {
    issues.push(`definition.visaContexts cannot contain more than ${QUESTIONNAIRE_LIMITS.maxVisaContexts} items`);
  }

  const seenContexts = new Set();
  definition.visaContexts.forEach((context, index) => {
    if (!isNonEmptyString(context)) {
      issues.push(`definition.visaContexts[${index}] must be a non-empty string`);
      return;
    }
    if (
      definition.visaType === "temporary-work" &&
      !SUPPORTED_TEMPORARY_WORK_VISA_CONTEXTS.has(context.trim())
    ) {
      issues.push(`definition.visaContexts[${index}] must be "482" or "186"`);
    }
    const key = normalizedUniqueKey(context);
    if (seenContexts.has(key)) {
      issues.push(`definition.visaContexts contains duplicated context "${context}"`);
      return;
    }
    seenContexts.add(key);
  });

  if (definition.visaType !== "temporary-work" && definition.visaContexts.length > 0) {
    issues.push("definition.visaContexts is only supported for temporary-work questionnaires");
  }
}

function validateVisibleIf(visibleIf, path, issues) {
  if (visibleIf === undefined) return;
  if (!Array.isArray(visibleIf)) {
    issues.push(`${path}.visibleIf must be an array`);
    return;
  }
  if (visibleIf.length > QUESTIONNAIRE_LIMITS.maxConditionsPerQuestion) {
    issues.push(`${path}.visibleIf cannot contain more than ${QUESTIONNAIRE_LIMITS.maxConditionsPerQuestion} conditions`);
  }

  visibleIf.forEach((condition, index) => {
    const conditionPath = `${path}.visibleIf[${index}]`;
    if (!condition || typeof condition !== "object" || Array.isArray(condition)) {
      issues.push(`${conditionPath} must be an object`);
      return;
    }
    if (!isSafeDataKey(condition.field)) {
      issues.push(`${conditionPath}.field must be a safe storage key`);
    }
    if (!SUPPORTED_VISIBLE_IF_OPERATORS.has(condition.op)) {
      issues.push(`${conditionPath}.op is unsupported`);
      return;
    }

    if (condition.op === "in" || condition.op === "notIn") {
      if (!Array.isArray(condition.value)) {
        issues.push(`${conditionPath}.value must be an array for ${condition.op}`);
      } else if (condition.value.length > QUESTIONNAIRE_LIMITS.maxOptionsPerQuestion) {
        issues.push(`${conditionPath}.value cannot contain more than ${QUESTIONNAIRE_LIMITS.maxOptionsPerQuestion} items`);
      }
      return;
    }

    if (
      (condition.op === "equals" || condition.op === "notEquals") &&
      !Object.prototype.hasOwnProperty.call(condition, "value")
    ) {
      issues.push(`${conditionPath}.value is required for ${condition.op}`);
    }
  });
}

function validateOptions(question, path, issues) {
  if (question.options === undefined) {
    if ((question.type === "radio" || question.type === "select") && !isNonEmptyString(question.optionsSource)) {
      issues.push(`${path}.options or ${path}.optionsSource is required for ${question.type}`);
    }
    return;
  }

  if (!Array.isArray(question.options)) {
    issues.push(`${path}.options must be an array`);
    return;
  }
  if (question.options.length > QUESTIONNAIRE_LIMITS.maxOptionsPerQuestion) {
    issues.push(`${path}.options cannot contain more than ${QUESTIONNAIRE_LIMITS.maxOptionsPerQuestion} items`);
  }

  const seenValues = new Set();
  question.options.forEach((option, index) => {
    const optionPath = `${path}.options[${index}]`;
    if (!option || typeof option !== "object" || Array.isArray(option)) {
      issues.push(`${optionPath} must be an object`);
      return;
    }
    if (!isNonEmptyString(option.value)) {
      issues.push(`${optionPath}.value must be a non-empty string`);
    } else {
      const key = normalizedUniqueKey(option.value);
      if (seenValues.has(key)) {
        issues.push(`${path}.options contains duplicated value "${option.value}"`);
      } else {
        seenValues.add(key);
      }
    }
    if (!isNonEmptyString(option.label)) {
      issues.push(`${optionPath}.label must be a non-empty string`);
    }
  });

  if (
    (question.type === "radio" || question.type === "select") &&
    question.options.length === 0 &&
    !isNonEmptyString(question.optionsSource)
  ) {
    issues.push(`${path}.options cannot be empty for ${question.type}`);
  }
}

function validateQuestion(question, path, state, issues, depth = 1) {
  state.questionCount += 1;
  if (state.questionCount > QUESTIONNAIRE_LIMITS.maxQuestionsPerPage && !state.hasQuestionLimitIssue) {
    issues.push(`${state.pagePath} cannot contain more than ${QUESTIONNAIRE_LIMITS.maxQuestionsPerPage} questions including follow-ups`);
    state.hasQuestionLimitIssue = true;
  }
  if (depth > QUESTIONNAIRE_LIMITS.maxQuestionDepth) {
    issues.push(`${path} exceeds the maximum follow-up depth of ${QUESTIONNAIRE_LIMITS.maxQuestionDepth}`);
    return;
  }

  if (!question || typeof question !== "object" || Array.isArray(question)) {
    issues.push(`${path} must be an object`);
    return;
  }

  if (!isNonEmptyString(question.id)) {
    issues.push(`${path}.id is required`);
  } else if (state.seenQuestionIds.has(question.id)) {
    issues.push(`${path}.id "${question.id}" is duplicated across the definition`);
  } else {
    state.seenQuestionIds.add(question.id);
  }

  if (!isNonEmptyString(question.answerKey)) {
    issues.push(`${path}.answerKey is required`);
  } else if (!isSafeDataKey(question.answerKey)) {
    issues.push(`${path}.answerKey must be a safe storage key`);
  } else if (state.seenAnswerKeys.has(question.answerKey)) {
    issues.push(`${path}.answerKey "${question.answerKey}" is duplicated in ${state.storageNamespace}`);
  } else {
    state.seenAnswerKeys.add(question.answerKey);
  }

  if (!isNonEmptyString(question.label)) {
    issues.push(`${path}.label is required`);
  }

  if (!SUPPORTED_QUESTION_TYPES.has(question.type)) {
    issues.push(`${path}.type "${question.type}" is unsupported`);
  }

  if (["radio", "select", "yesNo"].includes(question.type) || question.options !== undefined) {
    validateOptions(question, path, issues);
  }

  if (question.type === "yesNo" && Array.isArray(question.options)) {
    const optionValues = question.options.map((option) => option?.value).sort();
    if (
      optionValues.length !== 2 ||
      optionValues[0] !== "no" ||
      optionValues[1] !== "yes"
    ) {
      issues.push(`${path}.options for yesNo must contain exactly the values "yes" and "no"`);
    }
  }

  if (question.optionsSource !== undefined && question.optionsSource !== "applicants") {
    issues.push(`${path}.optionsSource is unsupported`);
  }

  if (question.parts !== undefined) {
    if (!question.parts || typeof question.parts !== "object" || Array.isArray(question.parts)) {
      issues.push(`${path}.parts must be an object`);
    } else {
      const partKeys = ["day", "month", "year"].map((part) => question.parts[part]);
      if (partKeys.some((partKey) => !isSafeDataKey(partKey))) {
        issues.push(`${path}.parts must contain safe day, month, and year storage keys`);
      }
      if (new Set(partKeys).size !== partKeys.length) {
        issues.push(`${path}.parts values must be unique`);
      }
    }
  }

  if (question.type === "dateParts") {
    const partEntries = question.parts && typeof question.parts === "object" && !Array.isArray(question.parts)
      ? ["day", "month", "year"].map((part) => [part, question.parts[part]])
      : isSafeDataKey(question.answerKey)
        ? ["day", "month", "year"].map((part) => [part, `${question.answerKey}_${part}`])
        : [];

    partEntries.forEach(([part, partKey]) => {
      if (!isSafeDataKey(partKey)) {
        if (question.parts === undefined) {
          issues.push(`${path}.parts.${part} derived from answerKey must be a safe storage key`);
        }
        return;
      }
      if (state.seenAnswerKeys.has(partKey)) {
        issues.push(`${path}.parts.${part} storage key "${partKey}" is duplicated in ${state.storageNamespace}`);
      } else {
        state.seenAnswerKeys.add(partKey);
      }
    });
  }

  validateVisibleIf(question.visibleIf, path, issues);

  if (question.metadata?.fields !== undefined) {
    if (question.type !== "repeater") {
      issues.push(`${path}.metadata.fields is only supported for repeater questions`);
    } else if (!Array.isArray(question.metadata.fields) || question.metadata.fields.length === 0) {
      issues.push(`${path}.metadata.fields must be a non-empty array of row questions`);
    } else {
      if (question.metadata.collection !== undefined && !["array", "object"].includes(question.metadata.collection)) {
        issues.push(`${path}.metadata.collection must be "array" or "object"`);
      }
      const rowState = {
        ...state,
        storageNamespace: `${state.storageNamespace}.${question.answerKey}`,
        seenAnswerKeys: new Set(),
      };
      question.metadata.fields.forEach((field, index) => {
        validateQuestion(field, `${path}.metadata.fields[${index}]`, rowState, issues, depth + 1);
      });
      state.questionCount = rowState.questionCount;
      state.hasQuestionLimitIssue = rowState.hasQuestionLimitIssue;
      validatePageConditionReferences(question.metadata.fields, `${path}.metadata.fields`, issues);
    }
  }

  if (question.followUps !== undefined) {
    if (!Array.isArray(question.followUps)) {
      issues.push(`${path}.followUps must be an array`);
    } else {
      question.followUps.forEach((followUp, index) => {
        validateQuestion(followUp, `${path}.followUps[${index}]`, state, issues, depth + 1);
      });
    }
  }
}

function collectPageQuestionEntries(questions, path, entries = []) {
  if (!Array.isArray(questions)) return entries;

  questions.forEach((question, index) => {
    const questionPath = `${path}[${index}]`;
    if (!isPlainObject(question)) return;

    entries.push({
      question,
      path: questionPath,
      answerKey: typeof question.answerKey === "string" ? question.answerKey.trim() : "",
    });
    collectPageQuestionEntries(question.followUps, `${questionPath}.followUps`, entries);
  });

  return entries;
}

function getStaticOptionValues(question) {
  if (
    !["radio", "select", "yesNo"].includes(question.type) ||
    question.optionsSource ||
    !Array.isArray(question.options) ||
    question.options.length === 0
  ) {
    return null;
  }

  const values = [];
  for (const option of question.options) {
    if (!isPlainObject(option) || typeof option.value !== "string" || !option.value.trim()) {
      return null;
    }
    values.push(option.value.trim());
  }
  return new Set(values);
}

function validateStaticConditionValues(condition, conditionPath, source, issues) {
  const optionValues = getStaticOptionValues(source.question);
  if (!optionValues) return;

  let values = [];
  if (["equals", "notEquals"].includes(condition.op)) {
    if (!Object.prototype.hasOwnProperty.call(condition, "value")) return;
    values = [{ value: condition.value, path: `${conditionPath}.value` }];
  } else if (["in", "notIn"].includes(condition.op)) {
    if (!Array.isArray(condition.value)) return;
    values = condition.value.map((value, index) => ({
      value,
      path: `${conditionPath}.value[${index}]`,
    }));
  }

  values.forEach(({ value, path }) => {
    if (!optionValues.has(value)) {
      issues.push(
        `${path} ${JSON.stringify(value)} must match an option value from "${source.answerKey}"`
      );
    }
  });
}

function validatePageConditionReferences(questions, pagePath, issues) {
  const entries = collectPageQuestionEntries(questions, `${pagePath}.questions`);
  const entriesByAnswerKey = new Map();
  const dependencies = new Map(entries.map((entry) => [entry, []]));

  entries.forEach((entry) => {
    if (entry.answerKey && !entriesByAnswerKey.has(entry.answerKey)) {
      entriesByAnswerKey.set(entry.answerKey, entry);
    }
  });

  entries.forEach((target) => {
    if (!Array.isArray(target.question.visibleIf)) return;

    target.question.visibleIf.forEach((condition, conditionIndex) => {
      if (!isPlainObject(condition) || typeof condition.field !== "string") return;
      const conditionPath = `${target.path}.visibleIf[${conditionIndex}]`;
      const sourceKey = condition.field.trim();
      if (!sourceKey) return;

      const source = entriesByAnswerKey.get(sourceKey);
      if (!source) {
        issues.push(`${conditionPath}.field "${sourceKey}" must match an answerKey on the same page`);
        return;
      }

      validateStaticConditionValues(condition, conditionPath, source, issues);
      if (source === target) {
        issues.push(`${conditionPath}.field cannot reference its own question answerKey "${sourceKey}"`);
        return;
      }
      dependencies.get(target).push({ source, conditionPath });
    });
  });

  const states = new Map();
  function visit(entry) {
    states.set(entry, "visiting");
    for (const dependency of dependencies.get(entry) || []) {
      const sourceState = states.get(dependency.source);
      if (sourceState === "visiting") {
        issues.push(
          `${dependency.conditionPath}.field creates a conditional dependency cycle involving "${dependency.source.answerKey}"`
        );
      } else if (sourceState !== "visited") {
        visit(dependency.source);
      }
    }
    states.set(entry, "visited");
  }

  entries.forEach((entry) => {
    if (!states.has(entry)) visit(entry);
  });
}

function validateIntroBlocks(introBlocks, path, issues) {
  if (introBlocks === undefined) return;
  if (!Array.isArray(introBlocks)) {
    issues.push(`${path}.introBlocks must be an array`);
    return;
  }
  if (introBlocks.length > QUESTIONNAIRE_LIMITS.maxIntroBlocksPerPage) {
    issues.push(`${path}.introBlocks cannot contain more than ${QUESTIONNAIRE_LIMITS.maxIntroBlocksPerPage} blocks`);
  }

  introBlocks.forEach((block, index) => {
    const blockPath = `${path}.introBlocks[${index}]`;
    if (!block || typeof block !== "object" || Array.isArray(block)) {
      issues.push(`${blockPath} must be an object`);
      return;
    }
    if (block.type === "paragraph") {
      if (!isNonEmptyString(block.text)) issues.push(`${blockPath}.text is required`);
      return;
    }
    if (block.type === "list") {
      if (block.lead !== undefined && !isNonEmptyString(block.lead)) {
        issues.push(`${blockPath}.lead must be a non-empty string when provided`);
      }
      if (!Array.isArray(block.items) || block.items.some((item) => !isNonEmptyString(item))) {
        issues.push(`${blockPath}.items must be an array of non-empty strings`);
      } else if (block.items.length > QUESTIONNAIRE_LIMITS.maxIntroListItems) {
        issues.push(`${blockPath}.items cannot contain more than ${QUESTIONNAIRE_LIMITS.maxIntroListItems} items`);
      }
      return;
    }
    issues.push(`${blockPath}.type is unsupported`);
  });
}

export function getQuestionnaireDefinitionIssues(definition) {
  const issues = [];

  if (!definition || typeof definition !== "object" || Array.isArray(definition)) {
    return ["definition must be an object"];
  }

  const serializedSize = getSerializedSize(definition, issues);
  if (serializedSize === null) return issues;
  if (serializedSize > QUESTIONNAIRE_LIMITS.maxSerializedBytes) {
    issues.push(`definition cannot exceed ${QUESTIONNAIRE_LIMITS.maxSerializedBytes} serialized bytes`);
  }

  if (!isNonEmptyString(definition.id)) issues.push("definition.id is required");
  if (!isNonEmptyString(definition.title)) issues.push("definition.title is required");
  if (!isNonEmptyString(definition.version)) issues.push("definition.version is required");
  if (!isNonEmptyString(definition.visaType)) issues.push("definition.visaType is required");
  else if (!SUPPORTED_QUESTIONNAIRE_VISA_TYPES.has(definition.visaType)) {
    issues.push(`definition.visaType "${definition.visaType}" is unsupported`);
  }
  if (!SUPPORTED_DEFINITION_STATUSES.has(definition.status)) {
    issues.push(`definition.status "${definition.status}" is unsupported`);
  }
  if (definition.schemaVersion !== SUPPORTED_QUESTIONNAIRE_SCHEMA_VERSION) {
    issues.push(`definition.schemaVersion must be ${SUPPORTED_QUESTIONNAIRE_SCHEMA_VERSION}`);
  }
  if (!Number.isInteger(definition.revision) || definition.revision < 0) {
    issues.push("definition.revision must be a non-negative integer");
  }
  validateVisaContexts(definition, issues);

  if (!Array.isArray(definition.pages)) {
    issues.push("definition.pages must be an array");
    return issues;
  }
  if (definition.pages.length > QUESTIONNAIRE_LIMITS.maxPages) {
    issues.push(`definition.pages cannot contain more than ${QUESTIONNAIRE_LIMITS.maxPages} pages`);
  }

  const seenPageIds = new Set();
  const seenPageRoutes = new Set();
  const seenQuestionIds = new Set();
  const seenAnswerKeysByStorage = new Map();

  definition.pages.forEach((page, pageIndex) => {
    const pagePath = `pages[${pageIndex}]`;
    if (!page || typeof page !== "object" || Array.isArray(page)) {
      issues.push(`${pagePath} must be an object`);
      return;
    }

    if (!isNonEmptyString(page.id)) {
      issues.push(`${pagePath}.id is required`);
    } else if (seenPageIds.has(page.id)) {
      issues.push(`${pagePath}.id "${page.id}" is duplicated`);
    } else {
      seenPageIds.add(page.id);
    }

    if (!isNonEmptyString(page.title)) {
      issues.push(`${pagePath}.title is required`);
    }

    if (!isSafeQuestionnaireRoute(page.route)) {
      issues.push(`${pagePath}.route must be a safe /intake/ route`);
    } else if (seenPageRoutes.has(page.route)) {
      issues.push(`${pagePath}.route "${page.route}" is duplicated`);
    } else {
      seenPageRoutes.add(page.route);
    }
    if (
      isNonEmptyString(definition.visaType) &&
      isNonEmptyString(page.route) &&
      !page.route.startsWith(`/intake/${definition.visaType}/`)
    ) {
      issues.push(`${pagePath}.route must belong to the ${definition.visaType} questionnaire`);
    }

    if (!isSafeDataKey(page.sectionKey)) {
      issues.push(`${pagePath}.sectionKey must be a safe storage key`);
    }
    if (page.scope !== undefined && !SUPPORTED_PAGE_SCOPES.has(page.scope)) {
      issues.push(`${pagePath}.scope "${page.scope}" is unsupported`);
    }
    const routeNeedsProfile = isNonEmptyString(page.route) && PROFILE_QUESTIONNAIRE_ROUTE.test(page.route);
    if (routeNeedsProfile && page.scope !== "profile") {
      issues.push(`${pagePath}.scope must be "profile" for this route`);
    }
    if (!routeNeedsProfile && page.scope === "profile") {
      issues.push(`${pagePath}.scope cannot be "profile" for this route`);
    }
    if (page.order !== undefined && (!Number.isFinite(page.order) || !Number.isInteger(page.order))) {
      issues.push(`${pagePath}.order must be an integer when provided`);
    }

    validateIntroBlocks(page.introBlocks, pagePath, issues);

    if (!Array.isArray(page.questions)) {
      issues.push(`${pagePath}.questions must be an array`);
      return;
    }

    const profileRole = page.metadata?.profileRole || (page.route?.includes("/main-applicant/") ? "main_applicant"
      : page.route?.includes("/spouse-partner/") ? "spouse"
        : page.route?.includes("/children/") ? "child"
          : page.route?.includes("/non-migrating/") ? "non_migrating" : "");
    const storageNamespace = page.scope === "profile"
      ? `profile:${profileRole}:${page.sectionKey || ""}`
      : `shared:${page.sectionKey || ""}`;
    const seenAnswerKeys = seenAnswerKeysByStorage.get(storageNamespace) || new Set();
    seenAnswerKeysByStorage.set(storageNamespace, seenAnswerKeys);

    const state = {
      pagePath,
      storageNamespace,
      questionCount: 0,
      hasQuestionLimitIssue: false,
      seenQuestionIds,
      seenAnswerKeys,
    };
    page.questions.forEach((question, questionIndex) => {
      validateQuestion(question, `${pagePath}.questions[${questionIndex}]`, state, issues);
    });
    validatePageConditionReferences(page.questions, pagePath, issues);
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
