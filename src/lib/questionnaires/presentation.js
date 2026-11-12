import { COUNTRIES } from "../../reuseable/countries.js";
import { evaluateVisibleIf } from "./validation.js";

function isRecord(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function hasValue(value) {
  if (Array.isArray(value)) return value.some(hasValue);
  if (isRecord(value)) return Object.values(value).some(hasValue);
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function getNestedOrLiteral(value, path) {
  if (!isRecord(value)) return undefined;
  const nested = String(path || "").split(".").filter(Boolean).reduce((current, key) => (
    isRecord(current) && Object.prototype.hasOwnProperty.call(current, key)
      ? current[key]
      : undefined
  ), value);
  if (nested !== undefined) return nested;
  return Object.prototype.hasOwnProperty.call(value, path) ? value[path] : undefined;
}

function isSpouseProfile(profile) {
  return ["spouse", "de_facto", "partner"].includes(profile?.relationship);
}

function displayName(profile, details = {}) {
  return [
    profile?.given_names || details?.given_names,
    profile?.family_name || details?.family_name,
  ].filter(Boolean).join(" ").trim();
}

function profilePresentation(draft, context = {}) {
  const profiles = Array.isArray(draft?.profiles) ? draft.profiles : [];
  const profile = context.profileId
    ? profiles.find((candidate) => String(candidate.id) === String(context.profileId))
    : null;
  if (profile) {
    return displayName(profile, draft?.profiles_data?.[String(profile.id)]?.details || "")
      || (isSpouseProfile(profile) ? "Spouse/Partner" : profile.relationship === "child" ? "Child" : "Main Applicant");
  }
  if (context.memberId) {
    const member = (draft?.non_migrating_members || []).find((candidate) => String(candidate.id) === String(context.memberId));
    return [member?.passport?.given_names, member?.passport?.family_name].filter(Boolean).join(" ").trim()
      || "Non-Migrating Member";
  }
  const main = profiles.find((candidate) => candidate?.relationship === "main_applicant") || profiles[0];
  return displayName(main, draft?.profiles_data?.[String(main?.id)]?.details || "") || "Main Applicant";
}

function resolvePageTitle(page, draft, context) {
  const template = page.title === page.metadata?.originalTitle
    ? page.metadata?.titleTemplate
    : page.title;
  if (!template || !template.includes("{")) return page.title;
  const mainApplicantName = profilePresentation(draft, {});
  const spouseName = getQuestionnaireSpousePresentation(draft).name;
  const replacements = {
    profileName: profilePresentation(draft, context),
    mainApplicantName,
    spouseName,
    sponsorName: draft?.partner_sponsor_details?.given_names || "Sponsor",
  };
  return Object.entries(replacements).reduce(
    (title, [token, value]) => title.replaceAll(`{${token}}`, value),
    template,
  );
}

export function getQuestionnaireSpousePresentation(draft = {}) {
  const spouse = (Array.isArray(draft?.profiles) ? draft.profiles : []).find(isSpouseProfile);
  if (spouse) {
    const details = draft?.profiles_data?.[String(spouse.id)]?.details || {};
    return { exists: true, name: displayName(spouse, details) || "Spouse/Partner" };
  }

  const legacy = [
    draft?.temporary_work_spouse_details,
    draft?.protection_spouse_details,
    getNestedOrLiteral(draft, "spousePartner.details"),
    draft?.partner_spouse_details,
  ].find(hasValue);
  return legacy
    ? { exists: true, name: displayName(null, legacy) || "Spouse/Partner" }
    : { exists: false, name: "Spouse/Partner" };
}

function resolveQuestions(questions, spouse) {
  let changed = false;
  const resolved = [];

  (questions || []).forEach((question) => {
    if (question.metadata?.requiresSpouse && !spouse.exists) {
      changed = true;
      return;
    }

    let next = question;
    const template = question.label === question.metadata?.originalLabel
      ? question.metadata?.labelTemplate
      : question.label;
    if (template?.includes("{spouseName}")) {
      const label = template.replaceAll("{spouseName}", spouse.name);
      if (label !== question.label) {
        next = { ...next, label };
        changed = true;
      }
    }

    if (Array.isArray(question.followUps)) {
      const followUps = resolveQuestions(question.followUps, spouse);
      if (followUps !== question.followUps) {
        next = { ...next, followUps };
        changed = true;
      }
    }

    if (Array.isArray(question.metadata?.fields)) {
      const fields = resolveQuestions(question.metadata.fields, spouse);
      if (fields !== question.metadata.fields) {
        next = { ...next, metadata: { ...next.metadata, fields } };
        changed = true;
      }
    }

    resolved.push(next);
  });

  return changed ? resolved : questions;
}

/** Apply display-only built-in metadata without changing storage identifiers. */
export function resolveQuestionnairePagePresentation(page, draft = {}, context = {}) {
  if (!page) return page;
  const questions = resolveQuestions(page.questions || [], getQuestionnaireSpousePresentation(draft));
  const title = resolvePageTitle(page, draft, context);
  return questions === page.questions && title === page.title ? page : { ...page, title, questions };
}

/** Return one heading position for each consecutive visible group. */
export function getQuestionnaireGroupHeadingIndexes(questions = [], values = {}) {
  const headings = new Map();
  let index = 0;

  while (index < questions.length) {
    const group = String(questions[index]?.metadata?.group || "").trim();
    if (!group) {
      index += 1;
      continue;
    }

    let end = index + 1;
    while (
      end < questions.length
      && String(questions[end]?.metadata?.group || "").trim() === group
    ) end += 1;

    const firstVisible = questions
      .slice(index, end)
      .findIndex((question) => evaluateVisibleIf(question.visibleIf, values));
    if (firstVisible >= 0) headings.set(index + firstVisible, group);
    index = end;
  }

  return headings;
}

export function getQuestionnaireCountryOptions(currentValue = "") {
  const values = [...COUNTRIES];
  const current = String(currentValue || "").trim();
  if (current && !values.includes(current)) values.push(current);
  return values.map((country) => ({ value: country, label: country }));
}
