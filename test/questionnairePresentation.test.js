import assert from "node:assert/strict";
import test from "node:test";
import {
  getQuestionnaireCountryOptions,
  getQuestionnaireGroupHeadingIndexes,
  getQuestionnaireSpousePresentation,
  resolveQuestionnairePagePresentation,
} from "../src/lib/questionnaires/presentation.js";

test("country controls use the shared list and retain an existing unlisted answer", () => {
  const standard = getQuestionnaireCountryOptions("Australia");
  assert.ok(standard.some((option) => option.value === "Australia" && option.label === "Australia"));
  assert.equal(standard.filter((option) => option.value === "Australia").length, 1);

  const legacy = getQuestionnaireCountryOptions("Legacy Country Name");
  assert.deepEqual(legacy.at(-1), {
    value: "Legacy Country Name",
    label: "Legacy Country Name",
  });
});

test("group headings attach to the first visible question in each consecutive group", () => {
  const questions = [
    { id: "hidden-personal", metadata: { group: "Personal Information" }, visibleIf: [{ field: "show_name", op: "equals", value: "yes" }] },
    { id: "gender", metadata: { group: "Personal Information" } },
    { id: "country", metadata: { group: "Birthplace Information" } },
    { id: "ungrouped" },
    { id: "citizenship", metadata: { group: "Citizenships" } },
  ];

  assert.deepEqual(
    [...getQuestionnaireGroupHeadingIndexes(questions, { show_name: "no" }).entries()],
    [[1, "Personal Information"], [2, "Birthplace Information"], [4, "Citizenships"]],
  );
});

test("spouse label templates use saved profile details and preserve edited wording", () => {
  const originalLabel = "This person is the spouse or partner's:";
  const page = {
    questions: [
      {
        id: "relationship",
        label: originalLabel,
        metadata: {
          originalLabel,
          labelTemplate: "This person is {spouseName}'s:",
          requiresSpouse: true,
        },
      },
      {
        id: "edited",
        label: "How is this child related to your partner?",
        metadata: {
          originalLabel,
          labelTemplate: "This person is {spouseName}'s:",
          requiresSpouse: true,
        },
      },
    ],
  };
  const draft = {
    profiles: [{ id: "spouse-id", relationship: "spouse" }],
    profiles_data: {
      "spouse-id": { details: { given_names: "Sam", family_name: "Spouse" } },
    },
  };

  const resolved = resolveQuestionnairePagePresentation(page, draft);
  assert.equal(resolved.questions[0].label, "This person is Sam Spouse's:");
  assert.equal(resolved.questions[1].label, "How is this child related to your partner?");
  assert.equal(page.questions[0].label, originalLabel, "the published definition is not mutated");
});

test("spouse requirements hide unavailable questions and use a clear unnamed fallback", () => {
  const question = {
    id: "relationship",
    label: "Original relationship label",
    metadata: {
      originalLabel: "Original relationship label",
      labelTemplate: "This person is {spouseName}'s:",
      requiresSpouse: true,
    },
  };
  assert.deepEqual(resolveQuestionnairePagePresentation({ questions: [question] }, {}).questions, []);

  const unnamed = resolveQuestionnairePagePresentation(
    { questions: [question] },
    { profiles: [{ id: "spouse-id", relationship: "de_facto" }] },
  );
  assert.equal(unnamed.questions[0].label, "This person is Spouse/Partner's:");

  assert.deepEqual(
    getQuestionnaireSpousePresentation({ spousePartner: { details: { given_names: "Legacy", family_name: "Partner" } } }),
    { exists: true, name: "Legacy Partner" },
  );

  assert.deepEqual(
    getQuestionnaireSpousePresentation({
      "spousePartner.details": { given_names: "Stale" },
      spousePartner: { details: { given_names: "Current", family_name: "Partner" } },
    }),
    { exists: true, name: "Current Partner" },
  );
});

test("page title templates interpolate profile and non-migrating names without overriding edited copy", () => {
  const draft = {
    profiles: [{ id: "child-1", relationship: "child" }],
    profiles_data: { "child-1": { details: { given_names: "Casey", family_name: "Child" } } },
    non_migrating_members: [{ id: "member-1", passport: { given_names: "Morgan", family_name: "Parent" } }],
  };
  const page = {
    title: "Details",
    metadata: { originalTitle: "Details", titleTemplate: "Details — {profileName}" },
    questions: [],
  };
  assert.equal(resolveQuestionnairePagePresentation(page, draft, { profileId: "child-1" }).title, "Details — Casey Child");
  assert.equal(resolveQuestionnairePagePresentation(page, draft, { memberId: "member-1" }).title, "Details — Morgan Parent");

  const edited = { ...page, title: "Tell us about this applicant" };
  assert.equal(resolveQuestionnairePagePresentation(edited, draft, { profileId: "child-1" }).title, edited.title);
  assert.equal(page.title, "Details", "the published definition is not mutated");
});
