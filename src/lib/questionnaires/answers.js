import { evaluateVisibleIf } from "./validation.js";
import { getContinuousHistoryIssues, getYearsAgoDate } from "../protectionHistoryCoverage.js";
import {
  SPONSOR_CHARACTER_KEYS,
  normalizeSponsorCharacter,
} from "../partnerQuestionnaireAlignment.js";

export const DYNAMIC_QUESTIONNAIRE_COMPLETIONS_KEY = "dynamicQuestionnaireCompletions";
const QUESTIONNAIRE_MAIN_APPLICANT_ID_KEY = "_questionnaireMainApplicantId";

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
  if (question.type === "repeater") return question.metadata?.collection === "object" ? {} : [];
  return "";
}

function valuesMatch(left, right) {
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((value, index) => valuesMatch(value, right[index]));
  }
  if (left && right && typeof left === "object" && typeof right === "object") {
    const keys = Object.keys(left);
    return keys.length === Object.keys(right).length && keys.every((key) => Object.hasOwn(right, key) && valuesMatch(left[key], right[key]));
  }
  return left === right;
}

/**
 * Clear answers which the definition explicitly says must not survive while hidden.
 * This runs before validation and persistence as a backstop for conditional fields
 * restored by an asynchronous form reset.
 */
export function sanitizeQuestionnairePageValues(page, values = {}, ancestorsVisible = true) {
  const sanitized = { ...values };
  const questions = page?.questions || [];
  let changed = true;
  let remainingPasses = 1;

  function countQuestions(items = []) {
    return items.reduce(
      (count, question) => count + 1 + countQuestions(question.followUps || []) + countQuestions(question.metadata?.fields || []),
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
        const clearsLegacyCitizenships = Boolean(
          page?.metadata?.builtInPageId &&
          question.answerKey === "citizenships" &&
          question.visibleIf?.some((condition) => condition.field === "citizenship_other_than_birth"),
        );
        if (!visible && (question.clearWhenHidden || clearsLegacyCitizenships)) {
          const emptyValue = getQuestionnaireEmptyValue(question);
          getQuestionnaireFieldNames(question).forEach((fieldName) => {
            if (!valuesMatch(sanitized[fieldName], emptyValue)) {
              sanitized[fieldName] = Array.isArray(emptyValue) ? [...emptyValue] : emptyValue;
              changed = true;
            }
          });
        }
        if (question.type === "repeater" && Array.isArray(question.metadata?.fields)) {
          const value = sanitized[question.answerKey];
          const sanitizeRow = (row) => row && typeof row === "object" && !Array.isArray(row)
            ? sanitizeQuestionnairePageValues({ questions: question.metadata.fields }, row, visible)
            : row;
          const nextValue = question.metadata.collection === "object"
            ? sanitizeRow(value)
            : Array.isArray(value) ? value.map(sanitizeRow) : value;
          if (!valuesMatch(value, nextValue)) {
            sanitized[question.answerKey] = nextValue;
            changed = true;
          }
        }
        if (question.followUps?.length) sanitizeQuestions(question.followUps, visible);
      });
    }

    sanitizeQuestions(questions, ancestorsVisible);
  }

  return sanitized;
}

export function questionnaireAnswerHasValue(value, question) {
  if (Array.isArray(value)) return value.length > 0;
  if (question.type === "repeater" && value && typeof value === "object") {
    return Object.values(value).some((entry) => questionnaireReviewValueHasValue(entry));
  }
  if (question.type === "checkbox") return value === true;
  if (typeof value === "boolean") return true;
  if (typeof value === "string") return value.trim() !== "";
  return value !== null && value !== undefined;
}

export function getQuestionnairePageValidationIssues(page, values = {}) {
  const issues = [];

  function validateQuestions(questions = [], ancestorsVisible = true, source = values, prefix = "") {
    questions.forEach((question) => {
      const visible = ancestorsVisible && evaluateVisibleIf(question.visibleIf, source);
      if (visible) {
        const fieldNames = getQuestionnaireFieldNames(question);
        if (question.required) fieldNames.forEach((fieldName) => {
          if (!questionnaireAnswerHasValue(source[fieldName], question)) {
            issues.push({
              fieldName: `${prefix}${fieldName}`,
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
          const value = source[question.answerKey];
          const hasValue = questionnaireAnswerHasValue(value, question);
          const isAvailable = question.options.some((option) => option.value === value);
          if (hasValue && !isAvailable) {
            issues.push({
              fieldName: `${prefix}${question.answerKey}`,
              message: "Select one of the available options",
              questionId: question.id,
            });
          }
        }
        if (question.type === "repeater" && Array.isArray(question.metadata?.fields)) {
          const value = source[question.answerKey];
          const rowPrefix = `${prefix}${question.answerKey}.`;
          if (question.metadata.itemType === "string") {
            if (value != null && (!Array.isArray(value) || value.some((entry) => typeof entry !== "string"))) {
              issues.push({
                fieldName: `${prefix}${question.answerKey}`,
                message: "Enter a valid list of details",
                questionId: question.id,
              });
            }
          } else if (question.metadata.collection === "object") {
            if (value != null && (typeof value !== "object" || Array.isArray(value))) {
              issues.push({ fieldName: `${prefix}${question.answerKey}`, message: "Enter valid details", questionId: question.id });
            } else {
              validateQuestions(question.metadata.fields, visible, value || {}, rowPrefix);
            }
          } else if (value != null && !Array.isArray(value)) {
            issues.push({ fieldName: `${prefix}${question.answerKey}`, message: "Enter a valid list of details", questionId: question.id });
          } else {
            (value || []).forEach((row, index) => {
              if (!row || typeof row !== "object" || Array.isArray(row)) {
                issues.push({ fieldName: `${rowPrefix}${index}`, message: "Enter valid details", questionId: question.id });
              } else {
                validateQuestions(question.metadata.fields, visible, row, `${rowPrefix}${index}.`);
              }
            });
          }
        }
      }
      if (question.followUps?.length) validateQuestions(question.followUps, visible, source, prefix);
    });
  }

  validateQuestions(page?.questions || []);

  if (page?.metadata?.answerLayout === "applicantLanguages") {
    const applicants = Array.isArray(values.applicants) ? values.applicants : [];
    applicants.forEach((applicant, applicantIndex) => {
      const prefix = `applicants.${applicantIndex}`;
      const languages = Array.isArray(applicant?.languages) ? applicant.languages : [];
      if (applicant?._languageEligibility === "unknown") {
        issues.push({
          fieldName: `${prefix}.languages`,
          message: `Enter a date of birth for ${applicant.name || "this applicant"} before completing languages`,
          questionId: "applicants",
        });
      } else if (applicant?._languageEligibility === "required" && languages.length === 0) {
        issues.push({
          fieldName: `${prefix}.languages`,
          message: `Add at least one language for ${applicant.name || "this applicant"}`,
          questionId: "applicants",
        });
      }

      languages.forEach((language, languageIndex) => {
        const languagePrefix = `${prefix}.languages.${languageIndex}`;
        if (!String(language?.language || "").trim()) {
          issues.push({
            fieldName: `${languagePrefix}.language`,
            message: "Language is required",
            questionId: "languages",
          });
        }
        if (!language?.speak && !language?.read && !language?.write) {
          issues.push({
            fieldName: `${languagePrefix}.speak`,
            message: "Select at least one ability",
            questionId: "languages",
          });
        }
      });
    });
  }

  if (getQuestionnairePageAnswerLayout(page) === "applicantAddresses") {
    const shared = values.all_same_address === "yes";
    const mainApplicantId = String(values[QUESTIONNAIRE_MAIN_APPLICANT_ID_KEY] || "");
    const addressSets = shared
      ? [["main_applicant_addresses", values.main_applicant_addresses || [], "Shared address history"]]
      : [
          ["main_applicant_addresses", values.main_applicant_addresses || [], "Main applicant address history"],
          ...Object.entries(
            values.addresses_by_applicant
            && typeof values.addresses_by_applicant === "object"
            && !Array.isArray(values.addresses_by_applicant)
              ? values.addresses_by_applicant
              : {},
          )
            .filter(([profileId]) => !mainApplicantId || String(profileId) !== mainApplicantId)
            .map(([profileId, addresses]) => [
              `addresses_by_applicant.${profileId}`,
              addresses,
              "Applicant address history",
            ]),
        ];

    if (!addressSets.length) {
      issues.push({
        fieldName: "addresses_by_applicant",
        message: "Add address history for every applicant",
        questionId: "addresses_by_applicant",
      });
    }
    addressSets.forEach(([fieldName, addresses, label]) => {
      getContinuousHistoryIssues(Array.isArray(addresses) ? addresses : [], {
        startDate: getYearsAgoDate(20),
        label,
      }).forEach((message) => {
        issues.push({ fieldName, message, questionId: "addresses_by_applicant" });
      });
    });
  }

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

function getQuestionnaireReviewValue(question, values, context = {}) {
  if (question.type === "dateParts") {
    const names = getQuestionnaireDatePartNames(question);
    const parts = [values[names.day], values[names.month], values[names.year]];
    if (!parts.some(questionnaireReviewValueHasValue)) return "";
    return parts.map((part) => String(part || "—")).join("/");
  }

  const value = values[question.answerKey];
  if (question.type === "repeater" && Array.isArray(question.metadata?.fields)) {
    if (question.metadata.itemType === "string") {
      const entries = Array.isArray(value) ? value : [];
      if (question.answerKey.split(".").pop() !== "applicant_ids") return entries;
      const applicantNamesById = context.applicantNamesById;
      return entries.map((entry) => applicantNamesById?.get?.(String(entry)) || entry);
    }
    const reviewRow = (row) => Object.fromEntries(getQuestionnairePageReviewItems(
      { questions: question.metadata.fields }, row && typeof row === "object" ? row : {},
      context,
    ).map((item) => [item.label, item.value]));
    return question.metadata.collection === "object"
      ? reviewRow(value)
      : Array.isArray(value) ? value.map(reviewRow) : [];
  }
  const options = question.type === "yesNo" && !question.options?.length
    ? [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]
    : question.options || [];
  if (!options.length) return value;

  const labels = new Map(options.map((option) => [option.value, option.label]));
  if (Array.isArray(value)) return value.map((entry) => labels.get(entry) || entry);
  return labels.get(value) || value;
}

/** Build review rows using the exact wording and visibility rules in a JSON page. */
export function getQuestionnairePageReviewItems(page, values = {}, context = {}) {
  const items = [];

  function appendQuestions(questions = [], ancestorsVisible = true) {
    questions.forEach((question) => {
      const visible = ancestorsVisible && evaluateVisibleIf(question.visibleIf, values);
      if (visible) {
        const value = getQuestionnaireReviewValue(question, values, context);
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

function getLegacyStorageValue(draft, path) {
  if (!path) return undefined;
  const nestedValue = getOwnNestedValue(draft, path);
  if (nestedValue !== undefined) return nestedValue;
  // Some older partner drafts persisted dotted storage paths as literal keys.
  if (draft && Object.prototype.hasOwnProperty.call(draft, path)) return draft[path];
  return undefined;
}

function hasLegacyStorageMetadata(page) {
  return typeof page?.metadata?.storagePath === "string" && page.metadata.storagePath.length > 0;
}

function canUseLegacyProfileStorage(page) {
  if (page?.metadata?.profileRole === "child") return false;
  return !/\/children\/[^/]+\//.test(String(page?.route || ""));
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Keep extracted legacy forms on their stored month-name contract. */
export function getQuestionnaireMonthOptions(question, currentValue = "") {
  const hasConfiguredOptions = Array.isArray(question?.monthOptions) && question.monthOptions.length > 0;
  const configured = hasConfiguredOptions
    ? question.monthOptions
    : MONTH_NAMES.map((label, index) => ({ value: String(index + 1), label }));
  if (hasConfiguredOptions) {
    if (!currentValue || configured.some((option) => option.value === currentValue)) return configured;
    const monthIndex = MONTH_NAMES.findIndex(
      (month) => month.toLowerCase() === String(currentValue).toLowerCase(),
    );
    return [
      ...configured,
      {
        value: String(currentValue),
        label: monthIndex >= 0 ? MONTH_NAMES[monthIndex] : String(currentValue),
      },
    ];
  }
  if (!question?.metadata?.originalLabel || /^\d{1,2}$/.test(String(currentValue || ""))) {
    return configured;
  }
  return configured.map((option, index) => ({
    ...option,
    value: /^\d{1,2}$/.test(String(option.value))
      ? MONTH_NAMES[Number(option.value) - 1] || option.value
      : MONTH_NAMES[index] || option.value,
  }));
}

function getApplicantAge(profile, details = {}) {
  const day = Number(profile?.birth_day || details.birth_day || details.date_of_birth_day);
  const rawMonth = profile?.birth_month || details.birth_month || details.date_of_birth_month;
  const numericMonth = Number(rawMonth);
  const namedMonth = MONTH_NAMES.findIndex(
    (month) => month.toLowerCase() === String(rawMonth || "").toLowerCase(),
  ) + 1;
  const month = Number.isFinite(numericMonth) && numericMonth >= 1 && numericMonth <= 12
    ? numericMonth
    : namedMonth;
  const year = Number(profile?.birth_year || details.birth_year || details.date_of_birth_year);
  if (!day || !month || !year) return null;

  const birthDate = new Date(year, month - 1, day);
  if (
    birthDate.getFullYear() !== year ||
    birthDate.getMonth() !== month - 1 ||
    birthDate.getDate() !== day
  ) return null;

  const today = new Date();
  let age = today.getFullYear() - year;
  if (
    today.getMonth() + 1 < month ||
    (today.getMonth() + 1 === month && today.getDate() < day)
  ) age -= 1;
  return age;
}

export function getQuestionnaireApplicantIdOptions(draft = {}, page = null) {
  const profileOptions = (Array.isArray(draft?.profiles) ? draft.profiles : [])
    .filter((profile) => profile?.id != null && String(profile.id).trim())
    .map((profile) => {
      const profileId = String(profile.id);
      const details = draft?.profiles_data?.[profileId]?.details || {};
      const name = [
        profile.given_names || details.given_names,
        profile.family_name || details.family_name,
      ].filter(Boolean).join(" ").trim();
      const relationship = String(profile.relationship || "");
      const relationshipLabel = relationship === "main_applicant"
        ? "Main Applicant"
        : relationship === "spouse"
          ? "Spouse/Partner"
          : relationship === "child"
            ? "Child"
            : "Applicant";
      return {
        value: profileId,
        label: name ? `${name} (${relationshipLabel})` : relationshipLabel,
        relationship,
      };
    });
  if (profileOptions.length > 0) return profileOptions;

  const route = `${page?.metadata?.builtInPageId || ""} ${page?.route || ""}`;
  if (route.includes("temporary-work")) {
    const options = [];
    const main = draft?.temporary_work_details || {};
    const mainName = [main.given_names, main.family_name].filter(Boolean).join(" ").trim();
    if (mainName) {
      options.push({ value: "legacy_main", label: mainName, relationship: "main_applicant" });
    }
    const spouse = draft?.temporary_work_spouse_details || {};
    const spouseName = [spouse.given_names, spouse.family_name].filter(Boolean).join(" ").trim();
    if (spouseName) {
      options.push({
        value: "legacy_spouse",
        label: `${spouseName} (Spouse/Partner)`,
        relationship: "spouse",
      });
    }
    (Array.isArray(draft?.temporary_work_children?.children)
      ? draft.temporary_work_children.children
      : [])
      .filter((child) => child?.included_in_application === "Yes")
      .forEach((child, index) => {
        const childName = [child?.given_names, child?.family_name]
          .filter(Boolean).join(" ").trim();
        if (childName) {
          options.push({
            value: `legacy_child_${index}`,
            label: `${childName} (Child)`,
            relationship: "child",
          });
        }
      });
    return options;
  }

  if (route.includes("partner")) {
    const main = draft?.partner_details || draft?.mainApplicant?.details || {};
    const name = [main.given_names, main.family_name].filter(Boolean).join(" ").trim();
    return [{
      value: "legacy_main",
      label: name || "Main Applicant",
      relationship: "main_applicant",
    }];
  }

  if (route.includes("protection")) {
    const main = draft?.protection_details || {};
    const name = [main.given_names, main.family_name].filter(Boolean).join(" ").trim();
    return [{
      value: "main-applicant",
      label: name || "Main Applicant",
      relationship: "main_applicant",
    }];
  }

  return [];
}

function getQuestionnaireMainApplicantId(draft = {}, page = null) {
  const options = getQuestionnaireApplicantIdOptions(draft, page);
  return options.find((option) => option.relationship === "main_applicant")?.value
    || options[0]?.value
    || null;
}

/** Identify form-only adapters used by promoted built-in pages. */
export function getQuestionnairePageAnswerLayout(page) {
  if (
    page?.metadata?.builtInPageId === "partner-family-sponsor-character"
    || String(page?.route || "").split("?")[0] === "/intake/partner/family-sponsor/character"
  ) {
    return "sponsorCharacter";
  }
  if (page?.metadata?.answerLayout) return page.metadata.answerLayout;
  if (page?.metadata?.builtInPageId === "protection-all-applicants-addresses") {
    return "applicantAddresses";
  }
  return null;
}

function adaptApplicantLanguagesForForm(draft, saved) {
  if (Array.isArray(saved?.applicants)) return saved;

  const stored = saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
  const profiles = Array.isArray(draft?.profiles) ? draft.profiles : [];
  const profileIds = new Set(profiles.map((profile) => String(profile.id)));
  const applicants = [];

  profiles.forEach((profile) => {
    const profileId = String(profile.id);
    const details = draft?.profiles_data?.[profileId]?.details || {};
    const age = getApplicantAge(profile, details);
    const languages = Array.isArray(stored[profileId]) ? stored[profileId] : [];
    // Under-16 applicants are not shown unless older saved answers must remain editable.
    if (age !== null && age < 16 && languages.length === 0) return;
    const name = [
      profile.given_names || details.given_names,
      profile.family_name || details.family_name,
    ].filter(Boolean).join(" ").trim() || "Unnamed applicant";
    applicants.push({
      id: profileId,
      name,
      languages,
      _languageEligibility: age === null ? "unknown" : age >= 16 ? "required" : "optional",
    });
  });

  Object.entries(stored).forEach(([profileId, languages]) => {
    if (profileIds.has(String(profileId)) || !Array.isArray(languages)) return;
    applicants.push({
      id: String(profileId),
      name: String(profileId),
      languages,
      _languageEligibility: "optional",
    });
  });

  return { applicants };
}

function adaptQuestionnairePageValuesForForm(draft, page, saved) {
  const answerLayout = getQuestionnairePageAnswerLayout(page);
  if (answerLayout === "sponsorCharacter") {
    const stored = saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
    return {
      ...stored,
      ...normalizeSponsorCharacter(stored),
    };
  }
  if (answerLayout === "applicantLanguages") {
    return adaptApplicantLanguagesForForm(draft, saved);
  }
  if (answerLayout === "applicantAddresses") {
    const values = saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
    const mainApplicantId = getQuestionnaireMainApplicantId(draft, page);
    const storedByApplicant = values.addresses_by_applicant
      && typeof values.addresses_by_applicant === "object"
      && !Array.isArray(values.addresses_by_applicant)
      ? values.addresses_by_applicant
      : {};
    const mainApplicantAddresses = Array.isArray(values.main_applicant_addresses)
      ? values.main_applicant_addresses
      : mainApplicantId && Array.isArray(storedByApplicant[mainApplicantId])
        ? storedByApplicant[mainApplicantId]
        : [];
    const applicantIds = getQuestionnaireApplicantIdOptions(draft, page)
      .map((option) => String(option.value || ""))
      .filter(Boolean);
    const addressesByApplicant = { ...storedByApplicant };
    applicantIds.forEach((applicantId) => {
      if (!Array.isArray(addressesByApplicant[applicantId])) {
        addressesByApplicant[applicantId] = applicantId === mainApplicantId
          ? mainApplicantAddresses
          : [];
      }
    });
    if (mainApplicantId) addressesByApplicant[mainApplicantId] = mainApplicantAddresses;
    return {
      ...values,
      [QUESTIONNAIRE_MAIN_APPLICANT_ID_KEY]: mainApplicantId || "",
      all_same_address: values.all_same_address || "no",
      main_applicant_addresses: mainApplicantAddresses,
      addresses_by_applicant: addressesByApplicant,
    };
  }
  return saved || {};
}

/** Convert form-friendly layouts back to the existing persisted answer contract. */
export function getQuestionnairePageStorageValues(page, values = {}, draft = {}) {
  const answerLayout = getQuestionnairePageAnswerLayout(page);
  if (answerLayout === "sponsorCharacter") {
    const storagePath = page?.metadata?.storagePath || "familySponsor.details";
    const existingValue = getLegacyStorageValue(draft, storagePath);
    const existing = existingValue && typeof existingValue === "object" && !Array.isArray(existingValue)
      ? existingValue
      : {};
    const storedValues = { ...existing, ...values };
    const sponsorName = [existing.given_names, existing.family_name]
      .filter((value) => String(value || "").trim())
      .join(" ")
      .trim() || "Family Sponsor";

    SPONSOR_CHARACTER_KEYS.forEach((key) => {
      const detailsKey = `${key}_details`;
      if (!Array.isArray(storedValues[detailsKey])) return;
      storedValues[detailsKey] = storedValues[detailsKey].map((row) => {
        if (!row || typeof row !== "object" || Array.isArray(row)) return row;
        return {
          ...row,
          applicant_name: sponsorName,
          ...(Object.prototype.hasOwnProperty.call(row, "name") ? { name: sponsorName } : {}),
        };
      });
    });

    if (Array.isArray(existing.national_security_details)) {
      storedValues.national_security_details = Array.isArray(storedValues.national_security_risk_details)
        ? storedValues.national_security_risk_details
        : [];
    } else if (!Object.prototype.hasOwnProperty.call(existing, "national_security_details")) {
      delete storedValues.national_security_details;
    } else {
      storedValues.national_security_details = existing.national_security_details;
    }

    return storedValues;
  }
  if (answerLayout === "applicantAddresses") {
    const storedValues = { ...values };
    delete storedValues[QUESTIONNAIRE_MAIN_APPLICANT_ID_KEY];
    const mainApplicantId = getQuestionnaireMainApplicantId(draft, page);
    const storedByApplicant = values.addresses_by_applicant
      && typeof values.addresses_by_applicant === "object"
      && !Array.isArray(values.addresses_by_applicant)
      ? values.addresses_by_applicant
      : {};
    const mainApplicantAddresses = Array.isArray(values.main_applicant_addresses)
      ? values.main_applicant_addresses
      : [];
    const addressesByApplicant = mainApplicantId
      ? values.all_same_address === "yes"
        ? { [mainApplicantId]: mainApplicantAddresses }
        : { ...storedByApplicant, [mainApplicantId]: mainApplicantAddresses }
      : storedByApplicant;
    return { ...storedValues, addresses_by_applicant: addressesByApplicant };
  }
  if (answerLayout !== "applicantLanguages") return values;

  const applicants = Array.isArray(values.applicants) ? values.applicants : [];
  return Object.fromEntries(applicants
    .filter((applicant) => applicant?.id)
    .map((applicant) => [
      String(applicant.id),
      (Array.isArray(applicant.languages) ? applicant.languages : []).map((language, index) => ({
        language: String(language?.language || ""),
        speak: Boolean(language?.speak),
        read: Boolean(language?.read),
        write: Boolean(language?.write),
        preference_order: index + 1,
      })),
    ]));
}

function getNonMigratingPageSuffix(page) {
  return String(page?.route || "").split("?")[0].split("/").filter(Boolean).pop() || "";
}

function getNonMigratingMemberFormValues(page, member) {
  if (!member) return {};
  switch (getNonMigratingPageSuffix(page)) {
    case "details":
      return {
        relationship: member.relationship || "",
        relationship_status: member.relationship_status || "",
        sex: member.passport?.sex || "",
        dob_day: member.passport?.dob_day || "",
        dob_month: member.passport?.dob_month || "",
        dob_year: member.passport?.dob_year || "",
        place_of_birth_town: member.place_of_birth?.town_city || "",
        place_of_birth_state: member.place_of_birth?.state_province || "",
        place_of_birth_country: member.place_of_birth?.country || "",
      };
    case "passport":
      return {
        has_current_passport: member.has_current_passport || "no",
        family_name: member.passport?.family_name || "",
        given_names: member.passport?.given_names || "",
        sex: member.passport?.sex || "",
        dob_day: member.passport?.dob_day || "",
        dob_month: member.passport?.dob_month || "",
        dob_year: member.passport?.dob_year || "",
      };
    case "identity":
      return {
        has_national_identity_card: member.has_national_identity_card || "no",
        has_other_identity_documents: member.has_other_identity_documents || "no",
      };
    case "other-names":
      return { other_names: Array.isArray(member.other_names) ? member.other_names : [] };
    case "citizenship":
      return {
        citizenship_has_other: member.citizenship?.has_other || "no",
        citizenship_countries: Array.isArray(member.citizenship?.countries)
          ? member.citizenship.countries.join(", ")
          : "",
      };
    case "health":
      return { requires_health_examination: member.requires_health_examination || "no" };
    default:
      return {};
  }
}

/** Map a promoted member form back onto the existing non-migrating member model. */
export function getQuestionnaireNonMigratingMemberUpdates(page, values = {}, member = {}) {
  switch (getNonMigratingPageSuffix(page)) {
    case "details":
      return {
        relationship: values.relationship,
        relationship_status: values.relationship_status,
        passport: {
          ...(member.passport || {}),
          sex: values.sex,
          dob_day: values.dob_day,
          dob_month: values.dob_month,
          dob_year: values.dob_year,
        },
        place_of_birth: {
          town_city: values.place_of_birth_town,
          state_province: values.place_of_birth_state,
          country: values.place_of_birth_country,
        },
      };
    case "passport":
      return {
        has_current_passport: values.has_current_passport,
        passport: values.has_current_passport === "yes" ? {
          ...(member.passport || {}),
          family_name: values.family_name,
          given_names: values.given_names,
          sex: values.sex,
          dob_day: values.dob_day,
          dob_month: values.dob_month,
          dob_year: values.dob_year,
        } : null,
      };
    case "identity":
      return {
        has_national_identity_card: values.has_national_identity_card,
        has_other_identity_documents: values.has_other_identity_documents,
      };
    case "other-names":
      return { other_names: Array.isArray(values.other_names) ? values.other_names : [] };
    case "citizenship":
      return {
        citizenship: {
          has_other: values.citizenship_has_other,
          countries: values.citizenship_has_other === "yes"
            ? String(values.citizenship_countries || "").split(",").map((country) => country.trim()).filter(Boolean)
            : [],
        },
      };
    case "health":
      return { requires_health_examination: values.requires_health_examination };
    default:
      return null;
  }
}

/**
 * Resolve where a JSON page should persist its answers.
 *
 * Promoted built-in pages retain the storage metadata from their former React
 * form. Profile pages use the modern per-profile section whenever a profile is
 * available, and retain the legacy root path for applications which predate
 * profiles. Native JSON pages have no legacy storage metadata and keep their
 * original sectionKey behavior.
 */
export function getQuestionnairePageStorageTarget(page, profileId = null, memberId = null) {
  if (page?.metadata?.profileRole === "non_migrating") {
    return {
      type: "nonMigratingMember",
      memberId,
      sectionKey: page?.sectionKey,
    };
  }

  const legacyStoragePath = hasLegacyStorageMetadata(page)
    ? page.metadata.storagePath
    : null;
  const legacyProfileSection = page?.metadata?.profileSection
    || (
      page?.metadata?.builtInPageId === "partner-spouse-partner-details"
      || page?.route === "/intake/partner/spouse-partner/details"
        ? "details"
        : null
    );

  if (page?.scope === "profile") {
    if (legacyStoragePath && profileId && legacyProfileSection) {
      return {
        type: "profile",
        profileId,
        sectionKey: legacyProfileSection,
      };
    }

    if (legacyStoragePath) {
      return { type: "section", sectionKey: legacyStoragePath };
    }

    if (profileId) {
      return { type: "profile", profileId, sectionKey: page.sectionKey };
    }

    return { type: "profile", profileId: null, sectionKey: page?.sectionKey };
  }

  return {
    type: "section",
    sectionKey: legacyStoragePath || page?.sectionKey,
  };
}

export function getQuestionnairePageSavedValues(draft, page, profileId = null, memberId = null) {
  if (page?.metadata?.profileRole === "non_migrating") {
    const member = (draft?.non_migrating_members || []).find(
      (candidate) => String(candidate.id) === String(memberId || ""),
    );
    return getNonMigratingMemberFormValues(page, member);
  }

  if (page?.scope === "profile") {
    const target = getQuestionnairePageStorageTarget(page, profileId);
    if (target.type === "profile") {
      const modernValue = getOwnNestedValue(
        draft?.profiles_data?.[target.profileId],
        target.sectionKey,
      );
      // An explicitly saved empty modern section is authoritative. It must not
      // resurrect stale answers which remain at the legacy root path.
      if (modernValue !== undefined) {
        return adaptQuestionnairePageValuesForForm(draft, page, modernValue || {});
      }
    }

    if (hasLegacyStorageMetadata(page) && canUseLegacyProfileStorage(page)) {
      return adaptQuestionnairePageValuesForForm(
        draft,
        page,
        getLegacyStorageValue(draft, page.metadata.storagePath) || {},
      );
    }

    return {};
  }

  const target = getQuestionnairePageStorageTarget(page, profileId);
  if (hasLegacyStorageMetadata(page)) {
    return adaptQuestionnairePageValuesForForm(
      draft,
      page,
      getLegacyStorageValue(draft, target.sectionKey) || {},
    );
  }
  return adaptQuestionnairePageValuesForForm(
    draft,
    page,
    getOwnNestedValue(draft, target.sectionKey) || {},
  );
}
