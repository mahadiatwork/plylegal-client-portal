import assert from "node:assert/strict";
import test from "node:test";
import {
  createLegacyQuestionnaireCopy,
  translateLegacyQuestionnaireCopy,
} from "../src/lib/questionnaires/legacyCopy.js";

test("published workflow pages translate legacy start and profile copy", () => {
  const page = {
    title: "Welcome",
    introBlocks: [
      { type: "paragraph", text: "Updated introduction." },
      { type: "list", lead: "Include these people:", items: ["Primary visa applicant"] },
    ],
    questions: [
      {
        answerKey: "applicants",
        label: "People included",
        description: "Add the primary applicant first.",
        metadata: {
          originalLabel: "Included applicants",
          originalDescription: "Start by adding the main applicant",
          presentation: {
            addLabel: "Add applicant",
            emptyMessage: "Nobody added yet",
            addDialogTitle: "Create applicant",
          },
          originalPresentation: {
            addLabel: "Add Person",
            emptyMessage: "No persons added yet",
            addDialogTitle: "Add Person",
          },
        },
      },
    ],
    metadata: {
      renderer: "legacy",
      originalTitle: "Included Applicants",
      originalIntroBlocks: [
        { type: "paragraph", text: "Original introduction." },
        { type: "list", lead: "Who should be added?", items: ["Main applicant"] },
      ],
    },
  };

  const copy = createLegacyQuestionnaireCopy(page);
  assert.equal(translateLegacyQuestionnaireCopy("Included Applicants", copy, "title"), "Welcome");
  assert.equal(translateLegacyQuestionnaireCopy("Original introduction.", copy, "body"), "Updated introduction.");
  assert.equal(translateLegacyQuestionnaireCopy("Who should be added?", copy, "intro"), "Include these people:");
  assert.equal(translateLegacyQuestionnaireCopy("Main applicant", copy, "intro"), "Primary visa applicant");
  assert.equal(translateLegacyQuestionnaireCopy("No persons added yet", copy, "labels"), "Nobody added yet");
  assert.equal(
    translateLegacyQuestionnaireCopy("Add Person", copy, "labels", "applicants.presentation.addLabel"),
    "Add applicant",
  );
  assert.equal(
    translateLegacyQuestionnaireCopy("Add Person", copy, "labels", "applicants.presentation.addDialogTitle"),
    "Create applicant",
  );
});

test("published Other Family copy keeps dialog sections and duplicate field labels scoped", () => {
  const page = {
    title: "Family outside this application",
    introBlocks: [{ type: "paragraph", text: "Updated family guidance." }],
    questions: [{
      answerKey: "members",
      label: "Family records",
      metadata: {
        originalLabel: "Other family members",
        fields: [
          {
            answerKey: "relationship",
            label: "Relationship with the primary applicant",
            metadata: { originalLabel: "Relationship to Main Applicant" },
          },
          {
            answerKey: "place_of_birth_country",
            label: "Birth country",
            metadata: { originalLabel: "Country" },
          },
          {
            answerKey: "address_country",
            label: "Home country",
            metadata: { originalLabel: "Country" },
          },
        ],
        presentation: {
          addLabel: "Add relative",
          addDialogTitle: "Add a relative",
          sections: [{ heading: "Birth details", description: "" }],
          actions: { cancel: "Go back", confirm: "Save relative" },
        },
        originalPresentation: {
          addLabel: "Add Other Family Member",
          addDialogTitle: "Add Other Family Member",
          sections: [{ heading: "Place of Birth", description: "" }],
          actions: { cancel: "Cancel", confirm: "Add Member" },
        },
      },
    }],
    metadata: {
      renderer: "legacy",
      originalTitle: "Other Family",
      originalIntroBlocks: [{ type: "paragraph", text: "Original family guidance." }],
    },
  };

  const copy = createLegacyQuestionnaireCopy(page);
  assert.equal(translateLegacyQuestionnaireCopy("Other Family", copy, "title"), "Family outside this application");
  assert.equal(translateLegacyQuestionnaireCopy("Original family guidance.", copy, "intro"), "Updated family guidance.");
  assert.equal(translateLegacyQuestionnaireCopy("Country", copy, "labels"), "Country");
  assert.equal(translateLegacyQuestionnaireCopy("Country", copy, "labels", "members.place_of_birth_country"), "Birth country");
  assert.equal(translateLegacyQuestionnaireCopy("Country", copy, "labels", "members.address_country"), "Home country");
  assert.equal(translateLegacyQuestionnaireCopy("Place of Birth", copy, "labels", "members"), "Birth details");
  assert.equal(translateLegacyQuestionnaireCopy("Add Other Family Member", copy, "labels", "members.presentation.addLabel"), "Add relative");
  assert.equal(translateLegacyQuestionnaireCopy("Cancel", copy, "labels", "members.presentation.actions.cancel"), "Go back");
});
