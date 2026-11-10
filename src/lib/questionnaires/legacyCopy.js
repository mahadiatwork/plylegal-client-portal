function copyKey(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().toLocaleLowerCase("en") : "";
}

function addCopy(map, original, edited) {
  const key = copyKey(original);
  if (!key || typeof edited !== "string") return;
  if (map.has(key) && map.get(key) !== edited) map.set(key, null);
  else if (!map.has(key)) map.set(key, edited);
}

function presentationValues(presentation = {}) {
  return [
    presentation.addLabel,
    presentation.emptyMessage,
    presentation.addDialogTitle,
    presentation.editDialogTitle,
    presentation.dialogSubtitle,
    ...(presentation.columns || []).map((column) => column.label),
  ].filter((value) => typeof value === "string");
}

function identifierTokens(value) {
  return String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLocaleLowerCase("en")
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((token) => token.endsWith("ies") ? `${token.slice(0, -3)}y` : token.endsWith("s") && token.length > 3 ? token.slice(0, -1) : token);
}

function tokensMatch(left, right) {
  return left === right || (left.length >= 4 && right.length >= 4 && (left.startsWith(right) || right.startsWith(left)));
}

function repeaterHintScore(candidate, hints) {
  const candidateTokens = identifierTokens(`${candidate.path} ${candidate.answerKey}`);
  const hintTokens = identifierTokens(hints.testIdPrefix);
  let score = 0;
  if (hintTokens.length && hintTokens.every((hint) => candidateTokens.some((token) => tokensMatch(hint, token)))) {
    score += 20 + hintTokens.length;
  }

  const candidateCopy = new Set(candidate.copy.map(copyKey));
  [
    [hints.addButtonText, 5],
    [hints.emptyMessage, 8],
    [hints.dialogTitle, 10],
    ...((hints.columns || []).map((column) => [column?.label, 3])),
  ].forEach(([value, weight]) => {
    if (typeof value === "string" && candidateCopy.has(copyKey(value))) score += weight;
  });
  return score;
}

export function resolveLegacyQuestionnaireRepeaterPath(copy, hints = {}) {
  if (typeof hints.fieldName === "string" && hints.fieldName.trim()) return hints.fieldName.trim();
  const scored = (copy?.repeaters || [])
    .map((candidate) => ({ candidate, score: repeaterHintScore(candidate, hints) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score);
  if (!scored.length || scored[0].score === scored[1]?.score) return null;
  return scored[0].candidate.path;
}

function collectPresentationCopy(maps, question, path) {
  const presentation = question.metadata?.presentation;
  if (!presentation) return;
  const field = maps.fields.get(path) || new Map();
  const originals = question.metadata?.originalPresentation || {};
  const add = (key, value, original) => {
    if (typeof value !== "string" && typeof original !== "string") return;
    addCopy(field, original ?? value, value);
    addCopy(maps.labels, original ?? value, value);
  };
  add("addLabel", presentation.addLabel, originals.addLabel);
  add("emptyMessage", presentation.emptyMessage, originals.emptyMessage);
  add("addDialogTitle", presentation.addDialogTitle, originals.addDialogTitle);
  add("editDialogTitle", presentation.editDialogTitle, originals.editDialogTitle);
  add("dialogSubtitle", presentation.dialogSubtitle, originals.dialogSubtitle);
  (presentation.columns || []).forEach((column, index) => {
    const originalColumn = (originals.columns || [])[index];
    addCopy(field, originalColumn?.label ?? column.label, column.label);
    addCopy(maps.labels, originalColumn?.label ?? column.label, column.label);
  });
  (presentation.sections || []).forEach((section, index) => {
    const originalSection = (originals.sections || [])[index];
    addCopy(field, originalSection?.heading ?? section.heading, section.heading);
    addCopy(maps.labels, originalSection?.heading ?? section.heading, section.heading);
    addCopy(field, originalSection?.description ?? section.description, section.description);
    addCopy(maps.labels, originalSection?.description ?? section.description, section.description);
  });
  if (presentation.actions) {
    Object.entries(presentation.actions).forEach(([action, value]) => {
      const originalValue = originals.actions?.[action];
      addCopy(field, originalValue ?? value, value);
      addCopy(maps.labels, originalValue ?? value, value);
    });
  }
  if (presentation.rowFormatter && typeof presentation.rowFormatter === "string") {
    maps.rowFormatters = maps.rowFormatters || new Map();
    maps.rowFormatters.set(question.answerKey, presentation.rowFormatter);
  }
  maps.fields.set(path, field);
  maps.repeaters.push({
    path,
    answerKey: question.answerKey,
    copy: [...presentationValues(originals), ...presentationValues(presentation)],
  });
}

/** Published wording changes preserve original storage keys and form behavior. */
export function createLegacyQuestionnaireCopy(page) {
  const maps = { all: new Map(), labels: new Map(), options: new Map(), intro: new Map(), help: new Map(), body: new Map(), placeholders: new Map(), title: new Map(), fields: new Map(), personLabels: [], rowFormatters: new Map(), repeaters: [] };
  if (page?.metadata?.renderer !== "legacy") return maps;
  const editedTitle = page.metadata.originalDisplayTitle !== undefined && page.title === page.metadata.originalDisplayTitle
    ? page.metadata.originalTitle : page.title;
  addCopy(maps.title, page.metadata.originalTitle, editedTitle);
  function collect(questions = [], prefix = "") {
    questions.forEach((question) => {
      const metadata = question.metadata || {};
      const field = new Map();
      const editedLabel = metadata.originalDisplayLabel !== undefined && question.label === metadata.originalDisplayLabel
        ? metadata.originalLabel : question.label;
      if (question.answerKey === "relationship_to_spouse" && metadata.labelTemplate === "This person is {spouseName}'s:") {
        maps.personLabels.push({ fieldName: question.answerKey, label: question.label, baseline: metadata.originalDisplayLabel ?? metadata.originalLabel });
      }
      addCopy(field, metadata.originalLabel, editedLabel);
      addCopy(field, metadata.originalDescription, question.description);
      addCopy(field, metadata.originalPlaceholder, question.placeholder);
      addCopy(maps.labels, metadata.originalLabel, editedLabel);
      addCopy(maps.labels, metadata.originalDescription, question.description);
      addCopy(maps.labels, metadata.originalPlaceholder, question.placeholder);
      addCopy(maps.help, metadata.originalDescription, question.description);
      addCopy(maps.placeholders, metadata.originalPlaceholder, question.placeholder);
      (metadata.originalOptions || []).forEach((option) => {
        const edited = question.options?.find((candidate) => candidate.value === option.value);
        if (edited) {
          addCopy(field, option.label, edited.label);
          addCopy(maps.options, option.label, edited.label);
        }
      });
      const path = `${prefix}${question.answerKey}`;
      maps.fields.set(path, field);
      const parentPaths = prefix.replace(/\.$/, "").split(".").filter(Boolean);
      while (parentPaths.length) {
        const parent = maps.fields.get(parentPaths.join("."));
        if (parent) {
          addCopy(parent, metadata.originalLabel, editedLabel);
          addCopy(parent, metadata.originalDescription, question.description);
          addCopy(parent, metadata.originalPlaceholder, question.placeholder);
          (metadata.originalOptions || []).forEach((option) => {
            const edited = question.options?.find((candidate) => candidate.value === option.value);
            if (edited) addCopy(parent, option.label, edited.label);
          });
        }
        parentPaths.pop();
      }
      collectPresentationCopy(maps, question, path);
      collect(question.followUps, prefix);
      collect(metadata.fields, `${path}.`);
    });
  }
  collect(page.questions);
  (page.metadata.originalIntroBlocks || []).forEach((block, index) => {
    const edited = page.introBlocks?.[index];
    if (!edited || edited.type !== block.type) return;
    addCopy(maps.intro, block.text, edited.text);
    addCopy(maps.intro, block.lead, edited.lead);
    (block.items || []).forEach((item, itemIndex) => addCopy(maps.intro, item, edited.items?.[itemIndex]));
  });
  for (const map of [maps.labels, maps.options, maps.intro, maps.title]) {
    for (const [original, edited] of map) if (edited !== null) addCopy(maps.all, original, edited);
  }
  for (const map of [maps.intro, maps.help]) {
    for (const [original, edited] of map) if (edited !== null) addCopy(maps.body, original, edited);
  }
  return maps;
}

export function translateLegacyQuestionnaireCopy(value, copy, kind = "all", fieldName = null) {
  if (typeof value !== "string") return value;
  const key = copyKey(value);
  if (fieldName) {
    const path = String(fieldName).replace(/\.\d+(?=\.|$)/g, "").replace(/\.actions$/, "");
    const parts = path.split(".");
    while (parts.length) {
      const translated = copy.fields.get(parts.join("."))?.get(key);
      if (typeof translated === "string") return translated;
      parts.pop();
    }
    const translated = copy.fields.get(path.split(".").at(-1))?.get(key);
    if (typeof translated === "string") return translated;
  }
  const translated = copy[kind]?.get(key);
  if (typeof translated === "string") return translated;
  if (kind === "labels" || kind === "all") {
    const source = value.match(/^This person is (.+)'s:$/);
    const personLabel = source && copy.personLabels.find((candidate) => !fieldName || String(fieldName).split(".").at(-1) === candidate.fieldName);
    if (personLabel && personLabel.label !== personLabel.baseline) {
      return personLabel.label.replaceAll("{spouseName}", source[1]);
    }
  }
  if (kind === "title") {
    const title = value.match(/^(.+?)(\s+[\u2014\u2013-]\s+|\s*:\s*)(.+)$/);
    const prefix = title && copy.title.get(copyKey(title[1]));
    if (typeof prefix === "string") return `${prefix}${title[2]}${title[3]}`;
  }
  return value;
}

export function applyLegacyQuestionnaireReviewCopy(items, page) {
  if (page?.metadata?.renderer !== "legacy") return items;
  const copy = createLegacyQuestionnaireCopy(page);
  function nested(value) {
    if (Array.isArray(value)) return value.map(nested);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [translateLegacyQuestionnaireCopy(key, copy, "labels"), nested(item)]));
    }
    return value;
  }
  return items.map((item) => ({ ...item, label: translateLegacyQuestionnaireCopy(item.label, copy, "labels"), value: nested(item.value) }));
}
