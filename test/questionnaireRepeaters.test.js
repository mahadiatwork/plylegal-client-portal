import assert from "node:assert/strict";
import { test } from "node:test";
import { temporaryWork482Definition } from "../src/lib/questionnaires/temporaryWork482.definition.js";
import { getQuestionnaireDefinitionIssues } from "../src/lib/questionnaires/validation.js";
import { getQuestionnairePageReviewItems, getQuestionnairePageValidationIssues, sanitizeQuestionnairePageValues } from "../src/lib/questionnaires/answers.js";
import { getQuestionnaireRowDefaults, scopeQuestionnaireRowField } from "../src/lib/questionnaires/repeaters.js";

const fields = [
  { id: "row_name", answerKey: "name", type: "text", label: "Previous name", required: true },
  { id: "row_gate", answerKey: "changed", type: "yesNo", label: "Changed name?" },
  { id: "row_details", answerKey: "details", type: "text", label: "Reason", required: true, clearWhenHidden: true, visibleIf: [{ field: "changed", op: "equals", value: "yes" }] },
  { id: "row_date", answerKey: "changed_date", type: "dateParts", label: "Change date", parts: { day: "change_day", month: "change_month", year: "change_year" } },
];
const repeater = { id: "names", answerKey: "names", type: "repeater", label: "Other names", required: true, metadata: { fields } };
const page = { questions: [repeater] };
const definition = (questions) => ({ ...structuredClone(temporaryWork482Definition), pages: [{ ...temporaryWork482Definition.pages[0], questions }] });

test("row schemas validate storage keys, options, conditions and depth within their own namespace", () => {
  assert.deepEqual(getQuestionnaireDefinitionIssues(definition([repeater])), []);
  const invalid = structuredClone(repeater);
  invalid.metadata.fields[0].answerKey = "__proto__";
  invalid.metadata.fields[2].visibleIf[0].field = "missing-row-field";
  const issues = getQuestionnaireDefinitionIssues(definition([invalid]));
  assert.ok(issues.some((issue) => issue.includes("safe storage key")));
  assert.ok(issues.some((issue) => issue.includes("same page")));
  const tooDeep = structuredClone(repeater);
  let nested = tooDeep;
  for (let index = 0; index < 6; index += 1) {
    nested.metadata.fields = [{ id: `nested-${index}`, answerKey: "nested", type: "repeater", label: "Nested", metadata: { fields: [] } }];
    nested = nested.metadata.fields[0];
  }
  assert.ok(getQuestionnaireDefinitionIssues(definition([tooDeep])).some((issue) => issue.includes("maximum follow-up depth")));
});

test("definition validation accepts every option source consumed by the dynamic renderer", () => {
  const supported = ["applicants", "countries"].map((optionsSource) => ({
    id: `source-${optionsSource}`,
    answerKey: `source_${optionsSource}`,
    type: "select",
    label: optionsSource,
    optionsSource,
  }));
  assert.deepEqual(getQuestionnaireDefinitionIssues(definition(supported)), []);

  const unsupported = structuredClone(supported[0]);
  unsupported.id = "source-unknown";
  unsupported.answerKey = "source_unknown";
  unsupported.optionsSource = "unknown";
  assert.ok(getQuestionnaireDefinitionIssues(definition([unsupported])).some((issue) => issue.includes("optionsSource is unsupported")));
});

test("row validation returns exact nested form paths and honors per-row visibility", () => {
  const issues = getQuestionnairePageValidationIssues(page, { names: [{ name: "Smith", changed: "no" }, { name: "", changed: "yes" }] });
  assert.deepEqual(issues.map((issue) => issue.fieldName), ["names.1.name", "names.1.details"]);
  assert.deepEqual(getQuestionnairePageValidationIssues(page, { names: [{ name: "Smith", changed: "no" }] }), []);
  assert.equal(getQuestionnairePageValidationIssues(page, { names: [] })[0].fieldName, "names");
});

test("repeater collection rules validate zero rows against page-level answers", () => {
  const minimum = {
    ...structuredClone(repeater),
    required: false,
    metadata: {
      ...structuredClone(repeater.metadata),
      validation: { rules: [{ id: "minimumRows", field: "names", config: { min: 2 } }] },
    },
  };
  assert.deepEqual(
    getQuestionnairePageValidationIssues({ questions: [minimum] }, { names: [] }).map((issue) => issue.fieldName),
    ["names"],
  );

  const conditional = {
    ...minimum,
    metadata: {
      ...minimum.metadata,
      validation: { rules: [{ id: "minRowsWhenEquals", field: "names", config: { field: "gate", value: "yes", min: 1 } }] },
    },
  };
  const conditionalPage = { questions: [{ id: "gate", answerKey: "gate", type: "yesNo", label: "Gate" }, conditional] };
  assert.deepEqual(getQuestionnairePageValidationIssues(conditionalPage, { gate: "no", names: [] }), []);
  assert.equal(getQuestionnairePageValidationIssues(conditionalPage, { gate: "yes", names: [] })[0].fieldName, "names");
});

test("sanitization clears hidden row answers without losing existing row IDs or unknown stored properties", () => {
  const values = { names: [{ id: "existing-row", name: "Smith", changed: "no", details: "Old reason", imported: "retain" }] };
  const sanitized = sanitizeQuestionnairePageValues(page, values);
  assert.deepEqual(sanitized.names[0], { ...values.names[0], details: "" });
  assert.equal(values.names[0].details, "Old reason", "original saved answers are not mutated");
});

test("single-object repeaters and nested lists validate and sanitize recursively", () => {
  const object = { id: "address", answerKey: "address", type: "repeater", label: "Address", metadata: { collection: "object", fields: [
    { id: "address_city", answerKey: "city", type: "text", label: "City", required: true },
    { ...repeater, id: "address_names" },
  ] } };
  const objectPage = { questions: [object] };
  assert.deepEqual(getQuestionnairePageValidationIssues(objectPage, { address: { city: "Sydney", names: [{ name: "Smith", changed: "no" }] } }), []);
  const errors = getQuestionnairePageValidationIssues(objectPage, { address: { city: "", names: [{ name: "", changed: "yes" }] } });
  assert.deepEqual(errors.map((issue) => issue.fieldName), ["address.city", "address.names.0.name", "address.names.0.details"]);
  const cleaned = sanitizeQuestionnairePageValues(objectPage, { address: { city: "Sydney", names: [{ id: "row", name: "Smith", changed: "no", details: "hidden" }], legacy: true } });
  assert.equal(cleaned.address.names[0].details, "");
  assert.equal(cleaned.address.legacy, true);
});

test("new row defaults and date field names match the nested answer storage", () => {
  assert.deepEqual(getQuestionnaireRowDefaults(fields), { name: "", changed: "", details: "", change_day: "", change_month: "", change_year: "" });
  const scoped = scopeQuestionnaireRowField(fields[3], "names.2");
  assert.equal(scoped.answerKey, "names.2.changed_date");
  assert.deepEqual(scoped.parts, { day: "names.2.change_day", month: "names.2.change_month", year: "names.2.change_year" });
});

test("repeater reviews use published row labels and hide irrelevant conditional answers", () => {
  assert.deepEqual(getQuestionnairePageReviewItems(page, { names: [{ name: "Smith", changed: "no", details: "hidden", change_day: "1", change_month: "2", change_year: "2020" }] }), [
    { label: "Other names", value: [{ "Previous name": "Smith", "Changed name?": "No", "Change date": "1/2/2020" }] },
  ]);
});

test("primitive string repeaters retain built-in applicant id arrays", () => {
  const applicantIds = {
    id: "applicant_ids",
    answerKey: "applicant_ids",
    type: "repeater",
    label: "Applicants",
    metadata: {
      itemType: "string",
      fields: [{ id: "applicant_id", answerKey: "value", type: "text", label: "Applicant" }],
    },
  };
  const primitivePage = { questions: [applicantIds] };
  const saved = { applicant_ids: ["profile-a", "profile-b"] };

  assert.deepEqual(getQuestionnairePageValidationIssues(primitivePage, saved), []);
  assert.deepEqual(sanitizeQuestionnairePageValues(primitivePage, saved), saved);
  assert.deepEqual(getQuestionnairePageReviewItems(primitivePage, saved), [
    { label: "Applicants", value: ["profile-a", "profile-b"] },
  ]);
  assert.equal(
    getQuestionnairePageValidationIssues(primitivePage, { applicant_ids: [{ value: "profile-a" }] })[0]?.fieldName,
    "applicant_ids",
  );
});

test("promoted Details pages clear citizenship rows when the controlling answer becomes no", () => {
  const citizenshipPage = {
    metadata: { builtInPageId: "temporary-work-main-applicant-details" },
    questions: [{
      id: "citizenships",
      answerKey: "citizenships",
      label: "Other citizenships",
      type: "repeater",
      visibleIf: [{ field: "citizenship_other_than_birth", op: "equals", value: "yes" }],
      metadata: {
        fields: [{ id: "country", answerKey: "country", label: "Country", type: "text" }],
      },
    }],
  };
  assert.deepEqual(
    sanitizeQuestionnairePageValues(citizenshipPage, {
      citizenship_other_than_birth: "no",
      citizenships: [{ country: "France" }],
    }),
    { citizenship_other_than_birth: "no", citizenships: [] },
  );
});

test("dynamic repeater validation executes employment metadata rules", () => {
  const employment = {
    id: "employment_history",
    answerKey: "employment_history",
    label: "Employment history",
    type: "repeater",
    metadata: {
      fields: [
        { id: "status", answerKey: "status", label: "Status", type: "text" },
        { id: "employer", answerKey: "employer", label: "Employer", type: "text" },
        { id: "position", answerKey: "position", label: "Position", type: "text" },
        { id: "duties", answerKey: "duties", label: "Duties", type: "text" },
        { id: "visa", answerKey: "visa_held", label: "Visa", type: "text", metadata: { validation: { rules: [{ id: "requiredWhenEquals", field: "visa_held", config: { field: "country", value: "Australia" } }] } } },
      ],
      validation: { rules: [
        { id: "datePartsAllOrNone", field: "date_to_day" },
        { id: "dateToNotBeforeDateFrom", field: "date_to_day" },
        { id: "requiredWhenStatusIn", field: "employer", config: { statuses: ["Work Experience/Internships"] } },
        { id: "requiredWhenStatusIn", field: "position", config: { statuses: ["Work Experience/Internships"] } },
        { id: "maxLength", field: "duties", config: { max: 300 } },
      ] },
    },
  };
  const invalid = { employment_history: [{
    status: "Work Experience/Internships", employer: "", position: "", duties: "x".repeat(301), country: "Australia", visa_held: "",
    date_from_day: "10", date_from_month: "January", date_from_year: "2024",
    date_to_day: "9", date_to_month: "", date_to_year: "2024",
  }] };
  const issues = getQuestionnairePageValidationIssues({ questions: [employment] }, invalid);
  assert.deepEqual(new Set(issues.map((issue) => issue.fieldName)), new Set([
    "employment_history.0.date_to_day",
    "employment_history.0.employer",
    "employment_history.0.position",
    "employment_history.0.duties",
    "employment_history.0.visa_held",
  ]));

  const valid = structuredClone(invalid);
  Object.assign(valid.employment_history[0], {
    employer: "Example Pty Ltd", position: "Intern", duties: "Assisted the team", visa_held: "Subclass 186",
    date_to_day: "11", date_to_month: "January", date_to_year: "2024",
  });
  assert.deepEqual(getQuestionnairePageValidationIssues({ questions: [employment] }, valid), []);
});

test("storage-only questions are preserved but excluded from validation and review", () => {
  const compatibilityPage = { questions: [{
    id: "records", answerKey: "records", label: "Records", type: "repeater", metadata: { fields: [
      { id: "visible", answerKey: "visible", label: "Visible value", type: "text", required: true },
      { id: "derived", answerKey: "derived", label: "Derived value", type: "text", required: true, metadata: { storageOnly: true } },
    ] },
  }] };
  const values = { records: [{ visible: "Shown", derived: "Preserved compatibility value" }] };
  assert.deepEqual(getQuestionnairePageValidationIssues(compatibilityPage, values), []);
  assert.deepEqual(sanitizeQuestionnairePageValues(compatibilityPage, values), values);
  assert.deepEqual(getQuestionnairePageReviewItems(compatibilityPage, values), [
    { label: "Records", value: [{ "Visible value": "Shown" }] },
  ]);
});
