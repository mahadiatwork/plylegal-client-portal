function copyKey(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().toLocaleLowerCase("en") : "";
}

function addCopy(map, original, edited) {
  const key = copyKey(original);
  if (!key || typeof edited !== "string") return;
  if (map.has(key) && map.get(key) !== edited) map.set(key, null);
  else if (!map.has(key)) map.set(key, edited);
}

/** Published wording changes preserve original storage keys and form behavior. */
export function createLegacyQuestionnaireCopy(page) {
  const maps = { all: new Map(), labels: new Map(), options: new Map(), intro: new Map(), help: new Map(), body: new Map(), placeholders: new Map(), title: new Map(), fields: new Map(), personLabels: [] };
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
    const path = String(fieldName).replace(/\.\d+(?=\.|$)/g, "");
    const field = copy.fields.get(path) || copy.fields.get(path.split(".").at(-1));
    const translated = field?.get(key);
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
