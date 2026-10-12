import { getQuestionnairePageSavedValues } from "../questionnaires/answers.js";
import {
  CRM_CLEAR_POLICIES,
  CRM_MAPPING_MODES,
  CRM_TARGETS,
} from "./crmFieldCatalog.js";
import {
  getQuestionnairePageProfileRole,
  normalizeCrmMapping,
  walkQuestionnaireQuestions,
} from "./questionnaireCrmContract.js";
import {
  applyClearPolicy,
  catalogFieldForMapping,
  readQuestionAnswer,
  transformQuestionnaireAnswer,
} from "./questionnaireTransforms.js";

function profilesForPage(draft, page, profileId) {
  const role = getQuestionnairePageProfileRole(page);
  if (role === "non_migrating") {
    return (draft?.non_migrating_members || []).filter((member) => (
      !profileId || String(member.id) === String(profileId)
    ));
  }
  if (page?.scope !== "profile") return [null];
  return (draft?.profiles || []).filter((profile) => {
    if (profileId && String(profile.id) !== String(profileId)) return false;
    if (!role) return true;
    return profile.relationship === role;
  });
}

function resolveTargetRecord({ mapping, application, userProfile, profile, member }) {
  if (mapping.target === CRM_TARGETS.matter) {
    const recordId = application?.zohoId || null;
    return {
      module: mapping.module,
      recordId,
      missingReason: recordId ? null : "missing_matter_id",
    };
  }
  if (mapping.target === CRM_TARGETS.main_contact) {
    const recordId = userProfile?.zohoContactId || null;
    return {
      module: mapping.module,
      recordId,
      missingReason: recordId ? null : "missing_contact_id",
    };
  }
  const source = member || profile;
  const recordId = source?.zohoDependentId || null;
  return {
    module: mapping.module,
    recordId,
    missingReason: recordId ? null : "missing_dependent_id",
    needsDependentCreate: !recordId,
    profileId: source?.id || null,
  };
}

export function buildQuestionnaireCrmProjection({
  definition,
  draft = {},
  application = {},
  userProfile = {},
  mode = "full",
  pageId = null,
  profileId = null,
} = {}) {
  const mappings = [];
  walkQuestionnaireQuestions(definition, ({ question, page, profileRole, inRepeater }) => {
    if (mode === "page" && pageId && page.id !== pageId) return;
    const mapping = normalizeCrmMapping(question?.metadata?.crm);
    if (!mapping || mapping.invalid || mapping.mode === CRM_MAPPING_MODES.unconfigured) {
      mappings.push({
        questionId: question.id,
        answerKey: question.answerKey,
        pageId: page.id,
        profileRole,
        status: "skipped",
        skipReason: "unconfigured",
      });
      return;
    }
    if (mapping.mode === CRM_MAPPING_MODES.portal_only) {
      mappings.push({
        questionId: question.id,
        answerKey: question.answerKey,
        pageId: page.id,
        profileRole,
        status: "skipped",
        skipReason: "portal_only",
        required: mapping.required === true,
      });
      return;
    }
    if (question.type === "repeater" || inRepeater) {
      mappings.push({
        questionId: question.id,
        answerKey: question.answerKey,
        pageId: page.id,
        profileRole,
        status: "failed",
        error: "repeater_not_supported",
        required: mapping.required === true,
      });
      return;
    }

    const subjects = profilesForPage(draft, page, profileId);
    if (page.scope === "profile" && subjects.length === 0) {
      mappings.push({
        questionId: question.id,
        answerKey: question.answerKey,
        pageId: page.id,
        profileRole,
        status: "skipped",
        skipReason: "no_matching_profile",
        required: mapping.required === true,
      });
      return;
    }

    subjects.forEach((subject) => {
      const member = profileRole === "non_migrating" ? subject : null;
      const profile = profileRole === "non_migrating" ? null : subject;
      const values = getQuestionnairePageSavedValues(
        draft,
        page,
        profile?.id || null,
        member?.id || null,
      );
      const rawValue = readQuestionAnswer(question, values);
      const transformed = applyClearPolicy(
        transformQuestionnaireAnswer({
          transform: mapping.transform,
          value: rawValue,
          question,
          optionMap: mapping.optionMap,
          catalogField: catalogFieldForMapping(mapping),
        }),
        mapping.clearPolicy || CRM_CLEAR_POLICIES.preserve_when_empty,
      );
      const target = resolveTargetRecord({
        mapping,
        application,
        userProfile,
        profile,
        member,
      });
      const item = {
        questionId: question.id,
        answerKey: question.answerKey,
        pageId: page.id,
        profileId: subject?.id || null,
        profileRole,
        target: mapping.target,
        module: mapping.module,
        fieldApiName: mapping.fieldApiName,
        transform: mapping.transform,
        clearPolicy: mapping.clearPolicy,
        required: mapping.required === true,
        recordId: target.recordId,
        needsDependentCreate: Boolean(target.needsDependentCreate),
        profileSnapshot: subject ? {
          id: subject.id,
          relationship: subject.relationship,
          given_names: subject.given_names,
          family_name: subject.family_name,
          gender: subject.gender,
          birth_day: subject.birth_day,
          birth_month: subject.birth_month,
          birth_year: subject.birth_year,
          isApplicant: subject.isApplicant,
          isNonMigrating: subject.isNonMigrating || profileRole === "non_migrating",
        } : null,
      };
      if (transformed.error) {
        mappings.push({ ...item, status: "failed", error: transformed.error });
        return;
      }
      if (transformed.skip) {
        mappings.push({ ...item, status: "skipped", skipReason: transformed.skipReason });
        return;
      }
      if (target.missingReason && !target.needsDependentCreate) {
        mappings.push({ ...item, status: "failed", error: target.missingReason });
        return;
      }
      mappings.push({
        ...item,
        status: "ready",
        value: transformed.clear ? null : transformed.value,
        clear: Boolean(transformed.clear),
      });
    });
  });

  const groups = [];
  const groupIndex = new Map();
  mappings.filter((item) => item.status === "ready").forEach((item) => {
    const recordKey = item.recordId
      ? `${item.module}:${item.recordId}`
      : `${item.module}:pending:${item.profileId || item.questionId}`;
    if (!groupIndex.has(recordKey)) {
      groupIndex.set(recordKey, groups.length);
      groups.push({
        module: item.module,
        recordId: item.recordId,
        pendingProfileId: item.recordId ? null : item.profileId,
        needsDependentCreate: Boolean(item.needsDependentCreate),
        profileSnapshot: item.profileSnapshot,
        fields: {},
        fieldApiNames: [],
        questionIds: [],
      });
    }
    const group = groups[groupIndex.get(recordKey)];
    group.fields[item.fieldApiName] = item.clear ? "" : item.value;
    if (!group.fieldApiNames.includes(item.fieldApiName)) group.fieldApiNames.push(item.fieldApiName);
    group.questionIds.push(item.questionId);
  });

  return { mappings, groups };
}

export function projectionHasBlockingFailure(projection, { requireMapped = false } = {}) {
  return projection.mappings.some((item) => {
    if (item.status !== "failed") return false;
    return requireMapped ? item.required === true : true;
  });
}
