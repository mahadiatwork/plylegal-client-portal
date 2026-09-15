import test from "node:test";
import assert from "node:assert/strict";
import { temporaryWork482Definition } from "../temporaryWork482.definition.js";
import {
  evaluateVisibleIf,
  getQuestionnaireDefinitionIssues,
  isSafeQuestionnaireRoute,
  QUESTIONNAIRE_LIMITS,
  validateQuestionnaireDefinition,
} from "../validation.js";
import {
  getQuestionnairePage,
  getQuestionnaireVisaContexts,
  questionnaireDefinitionMatches,
  selectActiveQuestionnaireDefinition,
  selectQuestionnaireDefinitionPages,
} from "../index.js";
import {
  getQuestionnaireCompletionStamp,
  getQuestionnairePageReviewItems,
  getQuestionnairePageValidationIssues,
  isQuestionnaireCompletionStampCurrent,
  sanitizeQuestionnairePageValues,
} from "../answers.js";
import { buildTemporaryWorkReviewSections } from "../../temporaryWorkReview.js";
import { buildTargetVisaReviewSections } from "../../targetVisaReview.js";

test("temporary work 482 definition is valid", () => {
  assert.equal(validateQuestionnaireDefinition(temporaryWork482Definition), temporaryWork482Definition);
});

test("managed definitions require a supported schema version and revision", () => {
  const missingVersion = structuredClone(temporaryWork482Definition);
  delete missingVersion.schemaVersion;
  delete missingVersion.revision;
  const missingIssues = getQuestionnaireDefinitionIssues(missingVersion);
  assert.ok(missingIssues.some((issue) => issue.includes("schemaVersion")));
  assert.ok(missingIssues.some((issue) => issue.includes("revision")));

  const futureVersion = structuredClone(temporaryWork482Definition);
  futureVersion.schemaVersion = 2;
  assert.ok(getQuestionnaireDefinitionIssues(futureVersion).some((issue) => issue.includes("schemaVersion")));
});

test("temporary-work visa contexts are limited to supported subclasses or global", () => {
  const unsupported = structuredClone(temporaryWork482Definition);
  delete unsupported.visaContext;
  unsupported.visaContexts = ["494"];
  assert.ok(
    getQuestionnaireDefinitionIssues(unsupported).includes(
      'definition.visaContexts[0] must be "482" or "186"'
    )
  );

  const global = structuredClone(temporaryWork482Definition);
  delete global.visaContext;
  global.visaContexts = [];
  assert.deepEqual(getQuestionnaireDefinitionIssues(global), []);
});

test("the bundled 482 Character page remains available without Firestore", async () => {
  const page = await getQuestionnairePage({
    definitionId: "temporary-work-482-v1",
    route: "/intake/temporary-work/all-applicants/character",
    visaType: "temporary-work",
    visaContext: "482",
  });

  assert.equal(page?.id, "all-applicants-character");
  assert.equal(page?.questions.length, 18);
});

test("definition validation rejects missing answerKey", () => {
  const broken = structuredClone(temporaryWork482Definition);
  delete broken.pages[0].questions[0].answerKey;

  const issues = getQuestionnaireDefinitionIssues(broken);
  assert.ok(issues.some((issue) => issue.includes("answerKey is required")));
});

test("definition validation rejects unsupported question type", () => {
  const broken = structuredClone(temporaryWork482Definition);
  broken.pages[0].questions[0].type = "unsupported";

  const issues = getQuestionnaireDefinitionIssues(broken);
  assert.ok(issues.some((issue) => issue.includes("unsupported")));
});

test("definition validation rejects invalid visibleIf", () => {
  const broken = structuredClone(temporaryWork482Definition);
  broken.pages[0].questions[0].visibleIf = [{ field: "char_q01", op: "contains", value: "yes" }];

  const issues = getQuestionnaireDefinitionIssues(broken);
  assert.ok(issues.some((issue) => issue.includes("visibleIf")));
});

test("conditional fields must reference another question on the same page without cycles", () => {
  const missingSource = structuredClone(temporaryWork482Definition);
  missingSource.pages[0].questions[0].followUps[0].visibleIf[0].field = "missing_answer";
  assert.ok(
    getQuestionnaireDefinitionIssues(missingSource).some(
      (issue) => issue.includes("missing_answer") && issue.includes("same page")
    )
  );

  const selfReference = structuredClone(temporaryWork482Definition);
  selfReference.pages[0].questions[0].visibleIf = [
    { field: "char_q01", op: "equals", value: "yes" },
  ];
  assert.ok(
    getQuestionnaireDefinitionIssues(selfReference).some(
      (issue) => issue.includes("char_q01") && issue.includes("own question")
    )
  );

  const cycle = structuredClone(temporaryWork482Definition);
  cycle.pages[0].questions[0].visibleIf = [
    { field: "char_q01_details", op: "exists" },
  ];
  assert.ok(
    getQuestionnaireDefinitionIssues(cycle).some((issue) => issue.includes("dependency cycle"))
  );
});

test("conditional values must exist in a referenced question's static options", () => {
  for (const [op, value] of [
    ["equals", "maybe"],
    ["notEquals", "maybe"],
    ["in", ["yes", "maybe"]],
    ["notIn", ["no", "maybe"]],
  ]) {
    const broken = structuredClone(temporaryWork482Definition);
    broken.pages[0].questions[0].followUps[0].visibleIf = [
      { field: "char_q01", op, value },
    ];
    assert.ok(
      getQuestionnaireDefinitionIssues(broken).some(
        (issue) => issue.includes("maybe") && issue.includes("option value from")
      ),
      `${op} should reject an option value that no longer exists`
    );
  }

  const valid = structuredClone(temporaryWork482Definition);
  valid.pages[0].questions[0].followUps[0].visibleIf = [
    { field: "char_q01", op: "in", value: ["yes", "no"] },
  ];
  assert.deepEqual(getQuestionnaireDefinitionIssues(valid), []);
});

test("definition validation rejects duplicate question ids", () => {
  const broken = structuredClone(temporaryWork482Definition);
  broken.pages[0].questions[1].id = broken.pages[0].questions[0].id;

  const issues = getQuestionnaireDefinitionIssues(broken);
  assert.ok(issues.some((issue) => issue.includes("duplicated")));
});

test("visibleIf evaluates supported operators", () => {
  assert.equal(evaluateVisibleIf([{ field: "answer", op: "equals", value: "yes" }], { answer: "yes" }), true);
  assert.equal(evaluateVisibleIf([{ field: "answer", op: "notEquals", value: "yes" }], { answer: "no" }), true);
  assert.equal(evaluateVisibleIf([{ field: "answer", op: "in", value: ["yes", "maybe"] }], { answer: "yes" }), true);
  assert.equal(evaluateVisibleIf([{ field: "answer", op: "notIn", value: ["yes"] }], { answer: "no" }), true);
  assert.equal(evaluateVisibleIf([{ field: "answer", op: "exists" }], { answer: "no" }), true);
  assert.equal(evaluateVisibleIf([{ field: "answer", op: "notExists" }], { answer: "" }), true);
});

test("definition validation requires titles and unique page ids and routes", () => {
  const missingTitles = structuredClone(temporaryWork482Definition);
  delete missingTitles.title;
  delete missingTitles.pages[0].title;
  const missingIssues = getQuestionnaireDefinitionIssues(missingTitles);
  assert.ok(missingIssues.includes("definition.title is required"));
  assert.ok(missingIssues.some((issue) => issue.includes("pages[0].title is required")));

  const duplicated = structuredClone(temporaryWork482Definition);
  duplicated.pages.push({
    ...structuredClone(duplicated.pages[0]),
    questions: [],
  });
  const duplicateIssues = getQuestionnaireDefinitionIssues(duplicated);
  assert.ok(duplicateIssues.some((issue) => issue.includes(".id") && issue.includes("duplicated")));
  assert.ok(duplicateIssues.some((issue) => issue.includes(".route") && issue.includes("duplicated")));
});

test("duplicate page titles are valid", () => {
  const definition = structuredClone(temporaryWork482Definition);
  definition.pages.push({
    id: "second-page",
    route: "/intake/temporary-work/all-applicants/second-page",
    title: definition.pages[0].title,
    sectionKey: "temporary_work_second_page",
    scope: "shared",
    questions: [],
  });

  assert.deepEqual(getQuestionnaireDefinitionIssues(definition), []);
});

test("question ids remain unique across pages", () => {
  const broken = structuredClone(temporaryWork482Definition);
  broken.pages.push({
    id: "second-page",
    route: "/intake/temporary-work/all-applicants/second-page",
    title: "Second page",
    sectionKey: "temporary_work_second_page",
    scope: "shared",
    questions: [structuredClone(broken.pages[0].questions[0])],
  });

  const issues = getQuestionnaireDefinitionIssues(broken);
  assert.ok(issues.some((issue) => issue.includes("id") && issue.includes("across the definition")));
  assert.equal(issues.some((issue) => issue.includes("answerKey") && issue.includes("duplicated")), false);
});

test("answer keys may repeat in different storage sections", () => {
  const definition = structuredClone(temporaryWork482Definition);
  const repeatedAnswerQuestion = structuredClone(definition.pages[0].questions[0]);
  repeatedAnswerQuestion.id = "second-page-question";
  repeatedAnswerQuestion.followUps = repeatedAnswerQuestion.followUps.map((followUp, index) => ({
    ...followUp,
    id: `second-page-follow-up-${index}`,
  }));
  definition.pages.push({
    id: "second-page",
    route: "/intake/temporary-work/all-applicants/second-page",
    title: "Second page",
    sectionKey: "temporary_work_second_page",
    scope: "shared",
    questions: [repeatedAnswerQuestion],
  });

  assert.deepEqual(getQuestionnaireDefinitionIssues(definition), []);
});

test("answer keys must remain unique inside the same scope and section", () => {
  const broken = structuredClone(temporaryWork482Definition);
  const repeatedAnswerQuestion = structuredClone(broken.pages[0].questions[0]);
  repeatedAnswerQuestion.id = "second-page-question";
  repeatedAnswerQuestion.followUps = repeatedAnswerQuestion.followUps.map((followUp, index) => ({
    ...followUp,
    id: `second-page-follow-up-${index}`,
  }));
  broken.pages.push({
    id: "second-page",
    route: "/intake/temporary-work/all-applicants/second-page",
    title: "Second page",
    sectionKey: broken.pages[0].sectionKey,
    scope: broken.pages[0].scope,
    questions: [repeatedAnswerQuestion],
  });

  const issues = getQuestionnaireDefinitionIssues(broken);
  assert.ok(issues.some((issue) => issue.includes("answerKey") && issue.includes("duplicated in shared:temporary_work_character")));
});

test("option objects require non-empty unique string values and labels", () => {
  const broken = structuredClone(temporaryWork482Definition);
  broken.pages[0].questions[0].options = [
    { value: "yes", label: "Yes" },
    { value: "YES", label: "Duplicate" },
    { value: 2, label: "" },
    "not-an-option",
  ];

  const issues = getQuestionnaireDefinitionIssues(broken);
  assert.ok(issues.some((issue) => issue.includes("duplicated value")));
  assert.ok(issues.some((issue) => issue.includes("value must be a non-empty string")));
  assert.ok(issues.some((issue) => issue.includes("label must be a non-empty string")));
  assert.ok(issues.some((issue) => issue.includes("must be an object")));
});

test("only safe internal intake routes are accepted", () => {
  assert.equal(isSafeQuestionnaireRoute("/intake/temporary-work/all-applicants/character"), true);
  assert.equal(isSafeQuestionnaireRoute("/applications/482/questionnaire"), false);
  assert.equal(isSafeQuestionnaireRoute("/intake/temporary-work/../admin"), false);
  assert.equal(isSafeQuestionnaireRoute("/intake/temporary-work/page?preview=1"), false);
  assert.equal(isSafeQuestionnaireRoute("/intake//character"), false);
});

test("definition status and page scope are constrained", () => {
  const broken = structuredClone(temporaryWork482Definition);
  broken.status = "published";
  broken.pages[0].scope = "application";

  const issues = getQuestionnaireDefinitionIssues(broken);
  assert.ok(issues.some((issue) => issue.includes("definition.status") && issue.includes("unsupported")));
  assert.ok(issues.some((issue) => issue.includes("scope") && issue.includes("unsupported")));
});

test("definition validation enforces question-count and serialized-size limits", () => {
  const tooManyQuestions = structuredClone(temporaryWork482Definition);
  tooManyQuestions.pages[0].questions = Array.from(
    { length: QUESTIONNAIRE_LIMITS.maxQuestionsPerPage + 1 },
    (_, index) => ({
      id: `question_${index}`,
      answerKey: `answer_${index}`,
      label: `Question ${index}`,
      type: "text",
    })
  );
  assert.ok(
    getQuestionnaireDefinitionIssues(tooManyQuestions).some((issue) => issue.includes("questions including follow-ups"))
  );

  const tooLarge = structuredClone(temporaryWork482Definition);
  tooLarge.pages[0].questions[0].description = "x".repeat(QUESTIONNAIRE_LIMITS.maxSerializedBytes);
  assert.ok(
    getQuestionnaireDefinitionIssues(tooLarge).some((issue) => issue.includes("serialized bytes"))
  );
});

test("canonical and legacy visa contexts use exact membership, with empty canonical contexts matching all", () => {
  const base = {
    id: "definition",
    status: "active",
    visaType: "temporary-work",
  };

  assert.deepEqual(getQuestionnaireVisaContexts({ ...base, visaContext: "482" }), ["482"]);
  assert.deepEqual(getQuestionnaireVisaContexts({ ...base, visaContexts: ["186", "482"] }), ["186", "482"]);
  assert.equal(questionnaireDefinitionMatches({ ...base, visaContext: "482" }, { visaType: "temporary-work", visaContext: "482" }), true);
  assert.equal(questionnaireDefinitionMatches({ ...base, visaContext: "482" }, { visaType: "temporary-work", visaContext: "186" }), false);
  assert.equal(questionnaireDefinitionMatches({ ...base, visaContexts: [] }, { visaType: "temporary-work", visaContext: "186" }), true);
  assert.equal(
    questionnaireDefinitionMatches(
      { ...base, visaContext: "482", visaContexts: [] },
      { visaType: "temporary-work", visaContext: "186" }
    ),
    true
  );
});

test("active definition selection prefers an exact context over a wildcard", () => {
  const wildcard = {
    id: "wildcard",
    status: "active",
    visaType: "temporary-work",
    visaContexts: [],
    version: "9.0.0",
    updatedAt: "2026-09-12T00:00:00.000Z",
  };
  const exact = {
    id: "exact",
    status: "active",
    visaType: "temporary-work",
    visaContexts: ["482"],
    version: "1.0.0",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  assert.equal(
    selectActiveQuestionnaireDefinition([wildcard, exact], {
      visaType: "temporary-work",
      visaContext: "482",
    })?.id,
    "exact"
  );
  assert.equal(
    selectActiveQuestionnaireDefinition([wildcard, exact], {
      visaType: "temporary-work",
      visaContext: "186",
    })?.id,
    "wildcard"
  );
});

test("embedded pages are authoritative and legacy subcollection pages remain supported", () => {
  const embedded = [{ id: "embedded" }];
  const legacy = [{ id: "legacy" }];

  assert.equal(selectQuestionnaireDefinitionPages({ pages: embedded }, legacy), embedded);
  assert.deepEqual(selectQuestionnaireDefinitionPages({ pages: [] }, legacy), []);
  assert.equal(selectQuestionnaireDefinitionPages({}, legacy), legacy);
});

test("required date parts use derived field names and required checkboxes must be checked", () => {
  const page = {
    questions: [
      { id: "arrival", answerKey: "arrival", label: "Arrival", type: "dateParts", required: true },
      { id: "consent", answerKey: "consent", label: "Consent", type: "checkbox", required: true },
    ],
  };
  const incomplete = getQuestionnairePageValidationIssues(page, {
    arrival_day: "1",
    arrival_month: "2",
    arrival_year: "2026",
    consent: false,
  });
  assert.deepEqual(incomplete.map((issue) => issue.fieldName), ["consent"]);
  assert.deepEqual(
    getQuestionnairePageValidationIssues(page, {
      arrival_day: "1",
      arrival_month: "2",
      arrival_year: "2026",
      consent: true,
    }),
    []
  );
});

test("saved static option values become invalid only when their value is removed", () => {
  const page = {
    questions: [
      {
        id: "decision",
        answerKey: "decision",
        label: "Decision",
        type: "select",
        options: [
          { value: "approved", label: "Approved" },
          { value: "declined", label: "Declined" },
        ],
      },
    ],
  };

  assert.deepEqual(getQuestionnairePageValidationIssues(page, { decision: "approved" }), []);

  const labelOnlyEdit = structuredClone(page);
  labelOnlyEdit.questions[0].options[0].label = "Approved by the department";
  assert.deepEqual(
    getQuestionnairePageValidationIssues(labelOnlyEdit, { decision: "approved" }),
    []
  );

  const removedValue = structuredClone(page);
  removedValue.questions[0].options = [{ value: "declined", label: "Declined" }];
  assert.deepEqual(
    getQuestionnairePageValidationIssues(removedValue, { decision: "approved" }),
    [{
      fieldName: "decision",
      message: "Select one of the available options",
      questionId: "decision",
    }]
  );
});

test("required follow-ups inherit hidden ancestor visibility", () => {
  const page = {
    questions: [
      {
        id: "parent",
        answerKey: "parent",
        label: "Parent",
        type: "yesNo",
        visibleIf: [{ field: "gate", op: "equals", value: "yes" }],
        followUps: [
          { id: "detail", answerKey: "detail", label: "Detail", type: "text", required: true },
        ],
      },
    ],
  };
  assert.deepEqual(getQuestionnairePageValidationIssues(page, { gate: "no" }), []);
  assert.equal(getQuestionnairePageValidationIssues(page, { gate: "yes" }).length, 1);
});

test("dynamic completion stamps are tied to definition revision and page", () => {
  const definition = { id: "temporary-work-482", revision: 3 };
  const page = { id: "character" };
  const stamp = getQuestionnaireCompletionStamp(definition, page);
  assert.equal(isQuestionnaireCompletionStampCurrent(stamp, definition, page), true);
  assert.equal(isQuestionnaireCompletionStampCurrent(stamp, { ...definition, revision: 4 }, page), false);
});

test("storage keys and workflow-only routes are rejected", () => {
  const broken = structuredClone(temporaryWork482Definition);
  broken.pages[0].sectionKey = "constructor.prototype.polluted";
  broken.pages[0].questions[0].answerKey = "nested.answer";
  broken.pages[0].route = "/intake/temporary-work/submit";
  const issues = getQuestionnaireDefinitionIssues(broken);
  assert.ok(issues.some((issue) => issue.includes("sectionKey") && issue.includes("safe storage key")));
  assert.ok(issues.some((issue) => issue.includes("answerKey") && issue.includes("safe storage key")));
  assert.ok(issues.some((issue) => issue.includes("route") && issue.includes("safe /intake/ route")));
});

test("custom yes/no labels keep the canonical yes and no values", () => {
  const valid = structuredClone(temporaryWork482Definition);
  valid.pages[0].questions[0].options = [
    { value: "yes", label: "Certainly" },
    { value: "no", label: "Not at all" },
  ];
  assert.deepEqual(getQuestionnaireDefinitionIssues(valid), []);

  const broken = structuredClone(valid);
  broken.pages[0].questions[0].options = [];
  assert.ok(getQuestionnaireDefinitionIssues(broken).some((issue) => issue.includes("exactly the values")));
});

test("date part storage names cannot collide with other answers", () => {
  const broken = structuredClone(temporaryWork482Definition);
  broken.pages[0].questions.push({
    id: "arrival-date",
    answerKey: "arrival",
    label: "Arrival date",
    type: "dateParts",
  });
  broken.pages[0].questions.push({
    id: "arrival-day-copy",
    answerKey: "arrival_day",
    label: "Arrival day copy",
    type: "text",
  });

  assert.ok(
    getQuestionnaireDefinitionIssues(broken).some(
      (issue) => issue.includes("arrival_day") && issue.includes("duplicated")
    )
  );
});

test("hidden answers marked clearWhenHidden are sanitized transitively", () => {
  const page = {
    questions: [
      {
        id: "parent",
        answerKey: "parent",
        label: "Parent",
        type: "text",
        visibleIf: [{ field: "gate", op: "equals", value: "yes" }],
        clearWhenHidden: true,
      },
      {
        id: "child",
        answerKey: "child",
        label: "Child",
        type: "text",
        visibleIf: [{ field: "parent", op: "equals", value: "show" }],
        clearWhenHidden: true,
      },
    ],
  };

  assert.deepEqual(
    sanitizeQuestionnairePageValues(page, { gate: "no", parent: "show", child: "stale" }),
    { gate: "no", parent: "", child: "" }
  );
});

test("dynamic review rows use managed wording, choices, dates, and visibility", () => {
  const page = {
    questions: [
      {
        id: "decision",
        answerKey: "decision",
        label: "Managed decision wording",
        type: "yesNo",
        options: [{ value: "yes", label: "Certainly" }, { value: "no", label: "Never" }],
      },
      {
        id: "date",
        answerKey: "event_date",
        label: "Managed date wording",
        type: "dateParts",
      },
      {
        id: "hidden",
        answerKey: "hidden_detail",
        label: "Hidden detail",
        type: "text",
        visibleIf: [{ field: "decision", op: "equals", value: "no" }],
      },
    ],
  };

  assert.deepEqual(
    getQuestionnairePageReviewItems(page, {
      decision: "yes",
      event_date_day: "4",
      event_date_month: "7",
      event_date_year: "2026",
      hidden_detail: "stale",
    }),
    [
      { label: "Managed decision wording", value: "Certainly" },
      { label: "Managed date wording", value: "4/7/2026" },
    ]
  );
});

test("review builders read dynamic section keys and labels", () => {
  const sharedDefinition = {
    pages: [{
      id: "managed-character",
      route: "/intake/temporary-work/all-applicants/character",
      title: "Managed Character Title",
      sectionKey: "managed_character",
      scope: "shared",
      questions: [{ id: "managed-answer", answerKey: "answer", label: "Managed label", type: "text" }],
    }],
  };
  const sharedSections = buildTemporaryWorkReviewSections({
    draft: { managed_character: { answer: "Managed value" } },
    questionnaireDefinition: sharedDefinition,
  });
  const sharedSection = sharedSections.find((section) => section.title === "Managed Character Title");
  assert.deepEqual(sharedSection?.items, [{ label: "Managed label", value: "Managed value" }]);

  const profileDefinition = {
    pages: [{
      id: "managed-details",
      route: "/intake/partner/main-applicant/details",
      title: "Managed Details Title",
      sectionKey: "managed_details",
      scope: "profile",
      questions: [{ id: "profile-answer", answerKey: "answer", label: "Profile managed label", type: "text" }],
    }],
  };
  const profileSections = buildTargetVisaReviewSections({
    visaType: "partner",
    draft: {
      profiles: [{ id: "profile-1", relationship: "main_applicant", given_names: "Ada", family_name: "Lovelace" }],
      profiles_data: { "profile-1": { managed_details: { answer: "Profile managed value" } } },
    },
    questionnaireDefinition: profileDefinition,
  });
  const profileSection = profileSections.find((section) => section.title === "Managed Details Title");
  assert.deepEqual(profileSection?.items, [{ label: "Profile managed label", value: "Profile managed value" }]);
});
