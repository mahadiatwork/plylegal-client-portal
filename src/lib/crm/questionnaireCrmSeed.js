import { CRM_CLEAR_POLICIES, CRM_MAPPING_MODES, CRM_TARGETS } from "./crmFieldCatalog.js";
import { getQuestionnairePageProfileRole } from "./questionnaireCrmContract.js";

function profileTarget(role) {
  if (role === "main_applicant") {
    return { target: CRM_TARGETS.matter, module: "Deals" };
  }
  return { target: CRM_TARGETS.profile_record, module: "Partner_Dependents" };
}

function identityMapping(question, role) {
  if (!role) return null;
  const destination = profileTarget(role);
  const isMatter = destination.module === "Deals";
  const familyField = isMatter ? "Family_Name" : "Name";
  const givenField = isMatter ? "Given_Name" : "First_Name";
  if (question.answerKey === "family_name" && question.type === "text") {
    return {
      mode: CRM_MAPPING_MODES.field,
      ...destination,
      fieldApiName: familyField,
      transform: "text",
      clearPolicy: CRM_CLEAR_POLICIES.preserve_when_empty,
    };
  }
  if (question.answerKey === "given_names" && question.type === "text") {
    return {
      mode: CRM_MAPPING_MODES.field,
      ...destination,
      fieldApiName: givenField,
      transform: "text",
      clearPolicy: CRM_CLEAR_POLICIES.preserve_when_empty,
    };
  }
  if (question.answerKey === "gender" && ["radio", "select"].includes(question.type)) {
    return {
      mode: CRM_MAPPING_MODES.field,
      ...destination,
      fieldApiName: "Gender",
      transform: "picklist",
      clearPolicy: CRM_CLEAR_POLICIES.preserve_when_empty,
      optionMap: { Male: "Male", Female: "Female" },
    };
  }
  if (question.answerKey === "birth" && question.type === "dateParts") {
    return {
      mode: CRM_MAPPING_MODES.field,
      ...destination,
      fieldApiName: "Date_of_Birth",
      transform: "date_parts_to_iso",
      clearPolicy: CRM_CLEAR_POLICIES.preserve_when_empty,
    };
  }
  if (isMatter && question.answerKey === "preferred_names" && question.type === "text") {
    return {
      mode: CRM_MAPPING_MODES.field,
      ...destination,
      fieldApiName: "Preferred_Name",
      transform: "text",
      clearPolicy: CRM_CLEAR_POLICIES.preserve_when_empty,
    };
  }
  if (isMatter && question.answerKey === "country_of_birth" && question.type === "text") {
    return {
      mode: CRM_MAPPING_MODES.field,
      ...destination,
      fieldApiName: "Country_of_Birth",
      transform: "text",
      clearPolicy: CRM_CLEAR_POLICIES.preserve_when_empty,
    };
  }
  if (isMatter && question.answerKey === "marital_status" && ["radio", "select"].includes(question.type)) {
    return {
      mode: CRM_MAPPING_MODES.field,
      ...destination,
      fieldApiName: "Marital_Status",
      transform: "picklist",
      clearPolicy: CRM_CLEAR_POLICIES.preserve_when_empty,
      optionMap: {
        "Never Married": "Never Married or been in a De Facto Relationship",
        "Never Married or been in a De Facto Relationship": "Never Married or been in a De Facto Relationship",
        Married: "Married",
        "De Facto Relationship": "De Facto Relationship",
        Divorced: "Divorced",
        Engaged: "Engaged",
        Separated: "Separated",
        Widowed: "Widowed",
      },
    };
  }
  return null;
}

function seedQuestion(question, page, inRepeater = false) {
  const existing = question?.metadata?.crm;
  const keepExisting = existing?.mode === CRM_MAPPING_MODES.field
    || existing?.mode === CRM_MAPPING_MODES.portal_only;
  const crm = keepExisting
    ? existing
    : (inRepeater || question?.type === "repeater"
      ? { mode: CRM_MAPPING_MODES.portal_only }
      : identityMapping(question, getQuestionnairePageProfileRole(page)) || { mode: CRM_MAPPING_MODES.portal_only });
  return {
    ...question,
    followUps: Array.isArray(question.followUps)
      ? question.followUps.map((child) => seedQuestion(child, page, inRepeater))
      : question.followUps,
    metadata: {
      ...question.metadata,
      crm,
      fields: Array.isArray(question.metadata?.fields)
        ? question.metadata.fields.map((child) => seedQuestion(child, page, true))
        : question.metadata?.fields,
    },
  };
}

export function seedDefinitionCrmMappings(definition) {
  return {
    ...definition,
    pages: (definition.pages || []).map((page) => ({
      ...page,
      questions: (page.questions || []).map((question) => seedQuestion(question, page)),
    })),
  };
}

export function describeCrmSeedPlan(definition) {
  const rows = [];
  const walk = (questions, page, inRepeater) => {
    (questions || []).forEach((question) => {
      const seeded = seedQuestion(question, page, inRepeater);
      rows.push({
        definitionId: definition.id,
        pageId: page.id,
        questionId: question.id,
        answerKey: question.answerKey,
        mode: seeded.metadata.crm.mode,
        module: seeded.metadata.crm.module || null,
        fieldApiName: seeded.metadata.crm.fieldApiName || null,
      });
      walk(question.followUps, page, inRepeater);
      walk(question.metadata?.fields, page, true);
    });
  };
  (definition.pages || []).forEach((page) => walk(page.questions, page, false));
  return rows;
}
