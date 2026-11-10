import assert from "node:assert/strict";
import { test } from "node:test";
import { Module } from "node:module";
import path from "node:path";
import { build } from "esbuild";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createLegacyQuestionnaireCopy, resolveLegacyQuestionnaireRepeaterPath, translateLegacyQuestionnaireCopy, applyLegacyQuestionnaireReviewCopy } from "../src/lib/questionnaires/legacyCopy.js";
import { findQuestionnaireDefinitionPage } from "../src/lib/questionnaires/pageRoutes.js";
import { getDynamicPartnerRoutes, getDynamicTemporaryWorkRoutes, PARTNER_VISA_ROUTES, setNonMigratingMembersGetter, setProfilesGetter } from "../src/lib/routes.js";

const page = {
  id: "legacy-other", route: "/intake/temporary-work/main-applicant/other", title: "Updated other names",
  sectionKey: "temporary_work_other", scope: "profile", completionKey: "temporary-work/main-applicant/other",
  metadata: { renderer: "legacy", originalTitle: "Other names", originalIntroBlocks: [{ type: "paragraph", text: "Original instructions" }] },
  introBlocks: [{ type: "paragraph", text: "Updated instructions" }],
  questions: [{
    id: "name", answerKey: "previous_name", label: "Your previous name", type: "text", required: true,
    description: "Updated help", placeholder: "Updated example",
    metadata: { originalLabel: "Previous name", originalDescription: "Original help", originalPlaceholder: "Original example" },
  }, {
    id: "decision", answerKey: "decision", label: "Decision", type: "select", options: [{ value: "yes", label: "Confirmed" }],
    metadata: { originalLabel: "Decision", originalOptions: [{ value: "yes", label: "Yes" }] },
  }],
};

test("legacy wording maps preserve values and translate titles, labels, instructions and option labels", () => {
  const copy = createLegacyQuestionnaireCopy(page);
  assert.equal(translateLegacyQuestionnaireCopy("Previous name", copy), "Your previous name");
  assert.equal(translateLegacyQuestionnaireCopy("  Previous   name ", copy), "Your previous name");
  assert.equal(translateLegacyQuestionnaireCopy("Other names", copy, "title"), "Updated other names");
  assert.equal(translateLegacyQuestionnaireCopy("Other names — Client Person", copy, "title"), "Updated other names — Client Person");
  assert.equal(translateLegacyQuestionnaireCopy("Original instructions", copy, "intro"), "Updated instructions");
  assert.equal(translateLegacyQuestionnaireCopy("Original help", copy, "body"), "Updated help");
  assert.equal(translateLegacyQuestionnaireCopy("Original example", copy, "placeholders"), "Updated example");
  assert.equal(translateLegacyQuestionnaireCopy("Yes", copy, "options"), "Confirmed");
  assert.equal(translateLegacyQuestionnaireCopy("Saved client name", copy), "Saved client name");
  assert.deepEqual(applyLegacyQuestionnaireReviewCopy([{ label: "Previous Name", value: "Saved client name" }], page), [{ label: "Your previous name", value: "Saved client name" }]);
});

test("ambiguous original labels use the field binding instead of changing unrelated copy", () => {
  const edited = structuredClone(page);
  edited.questions.push({ ...edited.questions[0], id: "second", answerKey: "second_name", label: "Second previous name" });
  const copy = createLegacyQuestionnaireCopy(edited);
  assert.equal(translateLegacyQuestionnaireCopy("Previous name", copy), "Previous name");
  assert.equal(translateLegacyQuestionnaireCopy("Previous name", copy, "all", "previous_name"), "Your previous name");
  assert.equal(translateLegacyQuestionnaireCopy("Previous name", copy, "all", "second_name"), "Second previous name");
});

test("catalog display labels do not change original static wording until an administrator edits them", () => {
  const baseline = structuredClone(page);
  baseline.questions[0].label = "Catalog display name";
  baseline.questions[0].metadata.originalDisplayLabel = "Catalog display name";
  baseline.title = "Catalog display title";
  baseline.metadata.originalDisplayTitle = "Catalog display title";
  const copy = createLegacyQuestionnaireCopy(baseline);
  assert.equal(translateLegacyQuestionnaireCopy("Previous name", copy), "Previous name");
  assert.equal(translateLegacyQuestionnaireCopy("Other names — Client Person", copy, "title"), "Other names — Client Person");
  baseline.questions[0].label = "Administrator edited name";
  assert.equal(translateLegacyQuestionnaireCopy("Previous name", createLegacyQuestionnaireCopy(baseline)), "Administrator edited name");
});

test("edited child relationship wording matches the original prompt containing the actual spouse name", () => {
  const childPage = { ...page, questions: [{ id: "child-relationship", answerKey: "relationship_to_spouse", label: "This person is the spouse or partner's:", metadata: { originalLabel: "This person is the spouse or partner's:", labelTemplate: "This person is {spouseName}'s:" } }] };
  const original = "This person is Jill O'Neil's:";
  assert.equal(translateLegacyQuestionnaireCopy(original, createLegacyQuestionnaireCopy(childPage), "labels"), original);
  childPage.questions[0].label = "Select the child's relationship";
  assert.equal(translateLegacyQuestionnaireCopy(original, createLegacyQuestionnaireCopy(childPage), "labels"), "Select the child's relationship");
  childPage.questions[0].label = "Choose the relationship to {spouseName}";
  assert.equal(translateLegacyQuestionnaireCopy(original, createLegacyQuestionnaireCopy(childPage), "labels"), "Choose the relationship to Jill O'Neil");
  assert.equal(translateLegacyQuestionnaireCopy(original, createLegacyQuestionnaireCopy(childPage), "labels", "unrelated_field"), original);
});

test("reusable child and family-member pages resolve actual person IDs within their own visa flow", () => {
  const child = { ...page, route: "/intake/temporary-work/children/child-profile/other", completionKey: "temporary-work/children/child-profile/other", metadata: { ...page.metadata, profileRole: "child" } };
  const member = { ...page, route: "/intake/partner/non-migrating/member-profile/other-names", completionKey: "partner/non-migrating/member-profile/other-names", metadata: { ...page.metadata, profileRole: "non_migrating" } };
  const definition = { pages: [child, member] };
  const resolved = findQuestionnaireDefinitionPage(definition, "/intake/temporary-work/children/real-child/other?profileId=real-child");
  assert.equal(resolved.completionKey, "temporary-work/children/real-child/other");
  assert.equal(resolved.route, "/intake/temporary-work/children/real-child/other");
  assert.equal(findQuestionnaireDefinitionPage(definition, "/intake/partner/non-migrating/real-member/other-names").completionKey, "partner/non-migrating/real-member/other-names");
  assert.equal(findQuestionnaireDefinitionPage(definition, "/intake/protection/children/real-child/other"), null);
  assert.equal(child.route, "/intake/temporary-work/children/child-profile/other", "published page is never mutated");
});

const bundled = await build({
  stdin: { resolveDir: process.cwd(), loader: "jsx", contents: `
    import React from "react";
    import {useForm} from "react-hook-form";
    import {QuestionnaireCopyFieldScope,QuestionnaireCopyProvider} from "./src/components/questionnaire/QuestionnaireCopyContext.jsx";
    import {Field} from "./src/components/Field.jsx";
    import {Card,CardHeader,CardTitle,CardContent} from "./src/components/ui/card.jsx";
    import {Button} from "./src/components/ui/button.jsx";
    import {Label} from "./src/components/ui/label.jsx";
    export {getIncompleteChecklist} from "./src/lib/submitCompletion.js";
    export {buildTemporaryWorkReviewSections} from "./src/lib/temporaryWorkReview.js";
    export function Fixture({page}) {
      const form=useForm({defaultValues:{previous_name:"Saved client name"}});
      return <QuestionnaireCopyProvider page={page}><Card><CardHeader><CardTitle>Other names</CardTitle></CardHeader><CardContent><p>Original instructions</p><Field control={form.control} name="previous_name" label="Previous name" description="Original help" placeholder="Original example" type="text"/></CardContent></Card></QuestionnaireCopyProvider>;
    }
    export function ScopedFixture({page,fieldName}) {
      return <QuestionnaireCopyProvider page={page}><QuestionnaireCopyFieldScope fieldName={fieldName}><Label htmlFor="name">Name</Label><Button>Cancel</Button></QuestionnaireCopyFieldScope></QuestionnaireCopyProvider>;
    }
  ` },
  bundle: true, write: false, platform: "node", format: "cjs", packages: "external", jsx: "automatic", logLevel: "silent",
});
const filename = path.resolve("test", "legacy-questionnaire-bundle.cjs");
const legacyModule = new Module(filename);
legacyModule.filename = filename;
legacyModule.paths = Module._nodeModulePaths(path.dirname(filename));
legacyModule._compile(bundled.outputFiles[0].text, filename);
const { Fixture, ScopedFixture, getIncompleteChecklist, buildTemporaryWorkReviewSections } = legacyModule.exports;

test("published text renders through the original controls without replacing stored answers", () => {
  const html = renderToStaticMarkup(createElement(Fixture, { page }));
  assert.match(html, /Updated other names/);
  assert.match(html, /Updated instructions/);
  assert.match(html, /Your previous name/);
  assert.match(html, /Updated help/);
  assert.match(html, /placeholder="Updated example"/);
  assert.match(html, /value="Saved client name"/);
  assert.match(html, /name="previous_name"/);
});

test("legacy pages keep static saved completion and validation when a newer wording revision is published", () => {
  const draft = { visaContext: "482", profiles: [{ id: "main", relationship: "main_applicant", given_names: "Client" }], profiles_data: { main: { other: { has_other_names: "no", chinese_commercial_code: "no" } } } };
  const completionStatus = { "temporary-work/main-applicant/other__main": true };
  const args = { visaType: "temporary-work", visaContext: "482", draft, completionStatus };
  const before = getIncompleteChecklist(args);
  const after = getIncompleteChecklist({ ...args, questionnaireDefinition: { id: "published", revision: 99, pages: [page] } });
  assert.deepEqual(after, before, "wording-only changes must retain original static completion/validation");
  assert.equal(after.some((issue) => issue.endsWith(": Other Names")), false);
});

test("legacy employment completion enforces declarative date, status and length contracts", () => {
  const employment = {
    is_currently_employed: "yes",
    current_employer: "Example Pty Ltd",
    current_position: "Analyst",
    current_country: "Australia",
    current_start_date_day: "1",
    current_start_date_month: "January",
    current_start_date_year: "2024",
    current_employment_type: "Full-time",
    current_address: "1 Example Street",
    current_duties: "x".repeat(301),
    employment_history: [{
      status: "Work Experience/Internships",
      employer: "",
      position: "",
      country: "Australia",
      visa_held: "",
      duties: "x".repeat(301),
      date_from_day: "10",
      date_from_month: "January",
      date_from_year: "2024",
      date_to_day: "9",
      date_to_month: "",
      date_to_year: "2024",
    }],
  };
  const args = {
    visaType: "temporary-work",
    visaContext: "186",
    draft: {
      visaContext: "186",
      profiles: [{ id: "main", relationship: "main_applicant", given_names: "Client" }],
      profiles_data: { main: { employment } },
    },
    completionStatus: { "temporary-work/main-applicant/employment__main": true },
  };
  const invalid = getIncompleteChecklist(args);
  assert.ok(invalid.some((issue) => issue.includes("Employment history details")));
  assert.ok(invalid.some((issue) => issue.includes("Current employment duties")));

  Object.assign(employment, { current_duties: "Valid duties" });
  Object.assign(employment.employment_history[0], {
    employer: "Example Pty Ltd",
    position: "Intern",
    visa_held: "Subclass 186",
    duties: "Valid duties",
    date_to_day: "11",
    date_to_month: "January",
  });
  const valid = getIncompleteChecklist(args);
  assert.equal(valid.some((issue) => issue.includes("Employment history details")), false);
  assert.equal(valid.some((issue) => issue.includes("Current employment duties")), false);
});

test("legacy review reads original profile section aliases and retains answers with edited labels", () => {
  const draft = { visaContext: "482", profiles: [{ id: "main", relationship: "main_applicant", given_names: "Client" }], profiles_data: { main: { other: { previous_name: "Saved client name" } } } };
  const sections = buildTemporaryWorkReviewSections({ draft, visaContext: "482", questionnaireDefinition: { id: "published", revision: 99, pages: [page] } });
  const other = sections.find((section) => section.title.includes("Updated other names"));
  assert.ok(other);
  assert.ok(other.items.some((item) => item.label === "Your previous name" && item.value === "Saved client name"));
});

test("repeater table and popup chrome are collected for legacy copy translation", () => {
  const pageWithRepeater = {
    id: "legacy-employment",
    route: "/intake/protection/main-applicant/employment",
    title: "Employment",
    sectionKey: "protection_employment",
    scope: "profile",
    completionKey: "protection/main-applicant/employment",
    metadata: { renderer: "legacy", originalTitle: "Employment" },
    introBlocks: [],
    questions: [{
      id: "employment_history",
      answerKey: "employment_history",
      label: "Employment History for the Main Applicant ({mainApplicantName})",
      type: "repeater",
      required: false,
      metadata: {
        originalLabel: "Employment History",
        originalPresentation: {
          addLabel: "Add",
          emptyMessage: "No entries added",
          addDialogTitle: "Add Entry",
          editDialogTitle: "Edit Entry",
          columns: [
            { key: "date_from_day", label: "Date From", format: "protectionDate" },
            { key: "date_to_day", label: "Date To", format: "protectionDateOrOngoing" },
            { key: "status", label: "Status" },
          ],
          actions: {
            edit: "Edit",
            delete: "Delete",
            cancel: "Cancel",
            confirm: "Ok",
            actionsHeading: "Actions",
          },
        },
        presentation: {
          addLabel: "Add history",
          emptyMessage: "Nothing added yet",
          addDialogTitle: "Add History Entry",
          editDialogTitle: "Edit History Entry",
          columns: [
            { key: "date_from_day", label: "From", format: "protectionDate" },
            { key: "date_to_day", label: "To", format: "protectionDateOrOngoing" },
            { key: "status", label: "Work status" },
          ],
          actions: {
            edit: "Modify",
            delete: "Remove",
            cancel: "Discard",
            confirm: "Save",
            actionsHeading: "Options",
          },
        },
        fields: [
          { id: "date_from_day", answerKey: "date_from_day", label: "Date From", type: "text" },
          { id: "status", answerKey: "status", label: "Status", type: "select", options: [{ value: "employed", label: "Employed" }] },
        ],
      },
    }],
  };
  const copy = createLegacyQuestionnaireCopy(pageWithRepeater);
  const fieldCopy = copy.fields.get("employment_history");
  assert.ok(fieldCopy, "repeater field copy should exist");
  assert.equal(translateLegacyQuestionnaireCopy("Add", copy, "labels", "employment_history"), "Add history");
  assert.equal(translateLegacyQuestionnaireCopy("No entries added", copy, "labels", "employment_history"), "Nothing added yet");
  assert.equal(translateLegacyQuestionnaireCopy("Add Entry", copy, "labels", "employment_history"), "Add History Entry");
  assert.equal(translateLegacyQuestionnaireCopy("Edit Entry", copy, "labels", "employment_history"), "Edit History Entry");
  assert.equal(translateLegacyQuestionnaireCopy("Date From", copy, "labels", "employment_history"), "From");
  assert.equal(translateLegacyQuestionnaireCopy("Date To", copy, "labels", "employment_history"), "To");
  assert.equal(translateLegacyQuestionnaireCopy("Status", copy, "labels", "employment_history"), "Work status");
  assert.equal(translateLegacyQuestionnaireCopy("Edit", copy, "labels", "employment_history"), "Modify");
  assert.equal(translateLegacyQuestionnaireCopy("Delete", copy, "labels", "employment_history"), "Remove");
  assert.equal(translateLegacyQuestionnaireCopy("Cancel", copy, "labels", "employment_history"), "Discard");
  assert.equal(translateLegacyQuestionnaireCopy("Ok", copy, "labels", "employment_history"), "Save");
  assert.equal(translateLegacyQuestionnaireCopy("Actions", copy, "labels", "employment_history"), "Options");
});

test("repeater action paths and popup sections resolve from the same field copy map", () => {
  const skillsPage = {
    id: "legacy-skills",
    route: "/intake/temporary-work/main-applicant/skills",
    title: "Main Applicant's Skills",
    sectionKey: "temporary_work_skills",
    scope: "profile",
    completionKey: "temporary-work/main-applicant/skills",
    metadata: { renderer: "legacy", originalTitle: "Skills" },
    introBlocks: [],
    questions: [{
      id: "assessments",
      answerKey: "assessments",
      label: "Skills Assessments",
      type: "repeater",
      required: false,
      metadata: {
        originalLabel: "Skills Assessments",
        originalPresentation: {
          addLabel: "Add",
          emptyMessage: "No entries added",
          addDialogTitle: "Add Entry",
          editDialogTitle: "Edit Entry",
          columns: [{ key: "outcome", label: "Outcome" }],
          actions: { edit: "Edit", delete: "Delete", cancel: "Cancel", confirm: "Ok", actionsHeading: "Actions" },
          sections: [
            { heading: "Skills Assessment", description: "Enter details of the Skill Assessment you have applied for" },
            { heading: "Assessment Outcome", description: "Enter details on the outcome of the Skills Assessment" },
          ],
        },
        presentation: {
          addLabel: "Add assessment",
          emptyMessage: "No assessments added",
          addDialogTitle: "Add Assessment",
          editDialogTitle: "Edit Assessment",
          columns: [{ key: "outcome", label: "Result" }],
          actions: { edit: "Modify", delete: "Remove", cancel: "Discard", confirm: "Save", actionsHeading: "Options" },
          sections: [
            { heading: "Assessment", description: "Enter the assessment details" },
            { heading: "Outcome", description: "Enter the assessment outcome" },
          ],
        },
        fields: [{ id: "outcome", answerKey: "outcome", label: "Outcome", type: "select", options: [{ value: "Positive", label: "Positive" }] }],
      },
    }],
  };
  const copy = createLegacyQuestionnaireCopy(skillsPage);
  assert.equal(translateLegacyQuestionnaireCopy("Add", copy, "labels", "assessments.actions"), "Add assessment");
  assert.equal(translateLegacyQuestionnaireCopy("Add Entry", copy, "labels", "assessments.actions"), "Add Assessment");
  assert.equal(translateLegacyQuestionnaireCopy("Actions", copy, "labels", "assessments.actions"), "Options");
  assert.equal(translateLegacyQuestionnaireCopy("Delete", copy, "labels", "assessments.actions"), "Remove");
  assert.equal(translateLegacyQuestionnaireCopy("Skills Assessment", copy, "labels", "assessments"), "Assessment");
  assert.equal(
    translateLegacyQuestionnaireCopy("Enter details on the outcome of the Skills Assessment", copy, "labels", "assessments"),
    "Enter the assessment outcome"
  );
});

test("repeater hints infer distinct popup paths and scope ambiguous nested labels", () => {
  const healthPage = {
    id: "legacy-health",
    route: "/intake/temporary-work/all-applicants/health",
    title: "Health",
    sectionKey: "temporary_work_health",
    scope: "shared",
    completionKey: "temporary-work/all-applicants/health",
    metadata: { renderer: "legacy", originalTitle: "Health" },
    introBlocks: [],
    questions: [
      {
        id: "health_examinations", answerKey: "health_examinations", label: "Health examinations", type: "repeater",
        metadata: {
          originalPresentation: { addLabel: "Add", emptyMessage: "No entries added", columns: [{ key: "name", label: "Name" }], actions: { cancel: "Cancel" } },
          presentation: { addLabel: "Add exam", emptyMessage: "No examinations", columns: [{ key: "name", label: "Applicant" }], actions: { cancel: "Discard exam" } },
          fields: [{ id: "name", answerKey: "name", label: "Exam applicant", type: "text", metadata: { originalLabel: "Name" } }],
        },
      },
      {
        id: "hospital_details", answerKey: "hospital_details", label: "Hospital details", type: "repeater",
        metadata: {
          originalPresentation: { addLabel: "Add", emptyMessage: "No entries added", columns: [{ key: "name", label: "Name" }], actions: { cancel: "Cancel" } },
          presentation: { addLabel: "Add hospital", emptyMessage: "No hospital details", columns: [{ key: "name", label: "Patient" }], actions: { cancel: "Discard hospital" } },
          fields: [{ id: "name", answerKey: "name", label: "Hospital applicant", type: "text", metadata: { originalLabel: "Name" } }],
        },
      },
    ],
  };
  const copy = createLegacyQuestionnaireCopy(healthPage);
  assert.equal(resolveLegacyQuestionnaireRepeaterPath(copy, { testIdPrefix: "health-exam", addButtonText: "Add" }), "health_examinations");
  assert.equal(resolveLegacyQuestionnaireRepeaterPath(copy, { testIdPrefix: "hospital", addButtonText: "Add" }), "hospital_details");
  assert.equal(translateLegacyQuestionnaireCopy("Name", copy, "labels"), "Name", "ambiguous global copy stays unchanged");
  assert.equal(translateLegacyQuestionnaireCopy("Name", copy, "labels", "health_examinations.name"), "Exam applicant");
  assert.equal(translateLegacyQuestionnaireCopy("Cancel", copy, "labels", "hospital_details"), "Discard hospital");

  const html = renderToStaticMarkup(createElement(ScopedFixture, { page: healthPage, fieldName: "health_examinations" }));
  assert.match(html, /Exam applicant/);
  assert.match(html, /Discard exam/);
});

test("partner route lists omit the stale children start and duplicate Family lookup", () => {
  assert.equal(PARTNER_VISA_ROUTES.some((route) => route.href === "/intake/partner/children/start"), false);
  setProfilesGetter(() => [{ id: "main-1", relationship: "main_applicant" }]);
  const routes = getDynamicPartnerRoutes();
  assert.equal(routes.filter((route) => route.split("?")[0] === "/intake/partner/main-applicant/family").length, 1);
  assert.equal(routes.includes("/intake/partner/children/start"), false);
  setProfilesGetter(() => []);
});

test("temporary-work route order covers empty and multi-profile 482/186 scenarios", () => {
  setProfilesGetter(() => []);
  setNonMigratingMembersGetter(() => []);
  const empty = getDynamicTemporaryWorkRoutes("482");
  assert.deepEqual(empty.slice(0, 2), ["/intake/temporary-work/start", "/intake/temporary-work/profile"]);
  assert.equal(empty.some((route) => route.includes("main-applicant")), false);
  assert.equal(empty.at(-1), "/intake/temporary-work/submit");

  setProfilesGetter(() => [
    { id: "child-2", relationship: "child" },
    { id: "spouse-2", relationship: "spouse" },
    { id: "main-1", relationship: "main_applicant" },
    { id: "child-1", relationship: "child" },
    { id: "spouse-1", relationship: "spouse" },
  ]);
  setNonMigratingMembersGetter(() => [{ id: "member-1" }, { id: "member-2" }]);
  const routes482 = getDynamicTemporaryWorkRoutes("482");
  const routes186 = getDynamicTemporaryWorkRoutes("186");
  const index = (routes, route) => routes.findIndex((candidate) => candidate === route);

  assert.ok(index(routes482, "/intake/temporary-work/main-applicant/contact-details?profileId=main-1") < index(routes482, "/intake/temporary-work/non-migrating"));
  assert.ok(index(routes482, "/intake/temporary-work/non-migrating/member-2/health") < index(routes482, "/intake/temporary-work/main-applicant/employment?profileId=main-1"));
  assert.ok(index(routes482, "/intake/temporary-work/spouse-partner/identity?profileId=spouse-2") < index(routes482, "/intake/temporary-work/children/child-2/details"));
  assert.equal(routes482.some((route) => route.includes("spouse-partner/education")), false);
  assert.ok(index(routes186, "/intake/temporary-work/spouse-partner/identity?profileId=spouse-1") < index(routes186, "/intake/temporary-work/spouse-partner/education?profileId=spouse-1"));
  assert.ok(index(routes186, "/intake/temporary-work/spouse-partner/language?profileId=spouse-2") < index(routes186, "/intake/temporary-work/children/child-1/details"));
  assert.equal(new Set(routes482).size, routes482.length);
  assert.equal(new Set(routes186).size, routes186.length);

  setProfilesGetter(() => []);
  setNonMigratingMembersGetter(() => []);
});

test("186 employment, education and language repeaters resolve copy by their own field path", () => {
  const page = {
    id: "legacy-186-fixtures",
    route: "/intake/temporary-work/main-applicant/employment",
    title: "Main Applicant's Employment",
    sectionKey: "temporary_work_employment",
    scope: "profile",
    completionKey: "temporary-work/main-applicant/employment",
    metadata: { renderer: "legacy", originalTitle: "Employment" },
    introBlocks: [],
    questions: [
      {
        id: "employment_history", answerKey: "employment_history", label: "Employment History", type: "repeater", required: false,
        metadata: {
          originalPresentation: {
            addLabel: "Add", emptyMessage: "No entries added", addDialogTitle: "Add Entry", editDialogTitle: "Edit Entry",
            columns: [{ key: "date_from_day", label: "Date From" }],
            actions: { edit: "Edit", delete: "Delete", cancel: "Cancel", confirm: "Ok", actionsHeading: "Actions" },
          },
          presentation: {
            addLabel: "Add history", emptyMessage: "No employment added", addDialogTitle: "Add Employment", editDialogTitle: "Edit Employment",
            columns: [{ key: "date_from_day", label: "From" }],
            actions: { edit: "Modify", delete: "Remove", cancel: "Discard", confirm: "Save", actionsHeading: "Options" },
          },
          fields: [{ id: "date_from_day", answerKey: "date_from_day", label: "Date From", type: "text" }],
        },
      },
      {
        id: "education_history", answerKey: "education_history", label: "Education History", type: "repeater", required: false,
        metadata: {
          originalPresentation: { addLabel: "Add", emptyMessage: "No entries added", columns: [{ key: "institution", label: "Institution" }], actions: { edit: "Edit", delete: "Delete" } },
          presentation: { addLabel: "Add study", emptyMessage: "No study added", columns: [{ key: "institution", label: "School" }], actions: { edit: "Edit", delete: "Delete" }, sections: [{ heading: "Institution Details" }] },
          originalSections: [{ heading: "Institution Details" }],
          fields: [{ id: "institution", answerKey: "institution", label: "Institution Name", type: "text" }],
        },
      },
      {
        id: "languages", answerKey: "languages", label: "Languages Used", type: "repeater", required: false,
        metadata: {
          originalPresentation: { addLabel: "Add", emptyMessage: "No entries added", columns: [{ key: "language", label: "Language" }], actions: { edit: "Edit", delete: "Delete" } },
          presentation: { addLabel: "Add language", emptyMessage: "No languages added", columns: [{ key: "language", label: "Language spoken" }], actions: { edit: "Edit", delete: "Delete" } },
          fields: [{ id: "language", answerKey: "language", label: "Language", type: "text" }],
        },
      },
    ],
  };
  const copy = createLegacyQuestionnaireCopy(page);
  assert.equal(translateLegacyQuestionnaireCopy("Add", copy, "labels", "employment_history"), "Add history");
  assert.equal(translateLegacyQuestionnaireCopy("Date From", copy, "labels", "employment_history"), "From");
  assert.equal(translateLegacyQuestionnaireCopy("Add", copy, "labels", "education_history"), "Add study");
  assert.equal(translateLegacyQuestionnaireCopy("Institution", copy, "labels", "education_history"), "School");
  assert.equal(translateLegacyQuestionnaireCopy("Institution Details", copy, "labels", "education_history"), "Institution Details");
  assert.equal(translateLegacyQuestionnaireCopy("Add", copy, "labels", "languages"), "Add language");
  assert.equal(translateLegacyQuestionnaireCopy("Language", copy, "labels", "languages"), "Language spoken");
  assert.equal(translateLegacyQuestionnaireCopy("Empty", copy, "labels", "languages"), "Empty");
});

test("partner employment history consumes its own chrome and nested field copy", () => {
  const page = {
    id: "legacy-partner-employment",
    route: "/intake/partner/main-applicant/employment",
    title: "Main Applicant's Employment",
    sectionKey: "partner_employment",
    scope: "profile",
    completionKey: "partner/main-applicant/employment",
    metadata: { renderer: "legacy", originalTitle: "Employment" },
    introBlocks: [],
    questions: [{
      id: "employment_history",
      answerKey: "employment_history",
      label: "Employment History",
      type: "repeater",
      required: false,
      metadata: {
        originalLabel: "Employment History",
        originalDescription: "Enter details of all of your employment and unemployment since birth. There can be no gaps in dates.",
        originalPresentation: {
          addLabel: "Add", emptyMessage: "No entries added", addDialogTitle: "Add Entry", editDialogTitle: "Edit Entry",
          columns: [{ key: "date_from_day", label: "Date From" }, { key: "status", label: "Status" }],
          actions: { edit: "Edit", delete: "Delete", cancel: "Cancel", confirm: "Ok", actionsHeading: "Actions" },
        },
        presentation: {
          addLabel: "Add role", emptyMessage: "No roles added", addDialogTitle: "Add Role", editDialogTitle: "Edit Role",
          columns: [{ key: "date_from_day", label: "From" }, { key: "status", label: "Work status" }],
          actions: { edit: "Modify", delete: "Remove", cancel: "Discard", confirm: "Save", actionsHeading: "Options" },
        },
        fields: [{ id: "status", answerKey: "status", label: "Status", type: "select", options: [{ value: "Employed", label: "Employed" }] }],
      },
    }],
  };
  const copy = createLegacyQuestionnaireCopy(page);
  assert.equal(translateLegacyQuestionnaireCopy("Add", copy, "labels", "employment_history"), "Add role");
  assert.equal(translateLegacyQuestionnaireCopy("Date From", copy, "labels", "employment_history"), "From");
  assert.equal(translateLegacyQuestionnaireCopy("Status", copy, "labels", "employment_history"), "Work status");
  assert.equal(translateLegacyQuestionnaireCopy("Actions", copy, "labels", "employment_history.actions"), "Options");
  assert.equal(translateLegacyQuestionnaireCopy("Cancel", copy, "labels", "employment_history.actions"), "Discard");
  assert.equal(translateLegacyQuestionnaireCopy("Ok", copy, "labels", "employment_history.actions"), "Save");
  assert.equal(
    translateLegacyQuestionnaireCopy("Enter details of all of your employment and unemployment since birth. There can be no gaps in dates.", copy, "help", "employment_history"),
    "Enter details of all of your employment and unemployment since birth. There can be no gaps in dates."
  );
});

test("promoted non-migrating pages validate the actual member route and completion stamp", () => {
  const memberPage = {
    id: "temporary-work-non-migrating-member-profile-other-names",
    route: "/intake/temporary-work/non-migrating/member-profile/other-names",
    title: "Previous names",
    sectionKey: "temporary_work_other_names",
    completionKey: "temporary-work/non-migrating/member-profile/other-names",
    scope: "profile",
    metadata: {
      renderer: "dynamic",
      profileRole: "non_migrating",
      storagePath: "temporary_work_other_names",
    },
    questions: [{
      id: "other_names",
      answerKey: "other_names",
      label: "Published previous names",
      type: "repeater",
      required: false,
      metadata: {
        fields: [
          { id: "family_name", answerKey: "family_name", label: "Family name", type: "text", required: false },
          {
            id: "type",
            answerKey: "type",
            label: "Published name type",
            type: "select",
            required: false,
            options: [{ value: "maiden", label: "Former surname" }],
          },
        ],
      },
    }],
  };
  const definition = { id: "published", revision: 7, pages: [memberPage] };
  const completionKey = "temporary-work/non-migrating/member-1/other-names__member-1";
  const draft = {
    visaContext: "482",
    non_migrating_members: [{
      id: "member-1",
      passport: { given_names: "Family", family_name: "Member" },
      other_names: [{ family_name: "Previous", type: "maiden" }],
    }],
  };
  const completionStatus = {
    [completionKey]: true,
    dynamicQuestionnaireCompletions: {
      [completionKey]: {
        definitionId: "published",
        pageId: memberPage.id,
        revision: 7,
      },
    },
  };

  const incomplete = getIncompleteChecklist({
    visaType: "temporary-work",
    visaContext: "482",
    draft,
    completionStatus,
    questionnaireDefinition: definition,
  });
  assert.equal(
    incomplete.includes("Other Family (Family Member): Other Names"),
    false,
  );

  const sections = buildTemporaryWorkReviewSections({
    draft,
    visaContext: "482",
    questionnaireDefinition: definition,
  });
  const review = sections.find((section) => section.title.includes("Previous names"));
  assert.ok(review);
  assert.deepEqual(review.items, [{
    label: "Published previous names",
    value: [{ "Family name": "Previous", "Published name type": "Former surname" }],
  }]);
});

test("promoted temporary-work applicant lists use client names in review", () => {
  const travelPage = {
    id: "temporary-work-all-applicants-travel-history",
    route: "/intake/temporary-work/all-applicants/travel-history",
    title: "Published travel history",
    sectionKey: "temporary_work_travel",
    completionKey: "temporary-work/all-applicants/travel-history",
    scope: "shared",
    metadata: { renderer: "dynamic", storagePath: "temporary_work_travel" },
    questions: [{
      id: "travel_history",
      answerKey: "travel_history",
      label: "Published trips",
      type: "repeater",
      required: false,
      metadata: { fields: [{
        id: "applicant_ids",
        answerKey: "applicant_ids",
        label: "Published travellers",
        type: "repeater",
        required: true,
        metadata: {
          itemType: "string",
          fields: [{ id: "value", answerKey: "value", label: "Applicant", type: "text", required: false }],
        },
      }, {
        id: "country",
        answerKey: "country",
        label: "Country",
        type: "text",
        required: false,
      }] },
    }],
  };
  const sections = buildTemporaryWorkReviewSections({
    visaContext: "482",
    questionnaireDefinition: { id: "published", revision: 8, pages: [travelPage] },
    draft: {
      visaContext: "482",
      profiles: [
        { id: "main", relationship: "main_applicant", given_names: "Alex", family_name: "Applicant" },
        { id: "child", relationship: "child", given_names: "Casey", family_name: "Child" },
      ],
      temporary_work_travel: {
        travel_history: [{ applicant_ids: ["main", "child"], country: "New Zealand" }],
      },
    },
  });

  const review = sections.find((section) => section.title === "Published travel history");
  assert.ok(review);
  assert.deepEqual(review.items, [{
    label: "Published trips",
    value: [{
      "Published travellers": ["Alex Applicant", "Casey Child"],
      Country: "New Zealand",
    }],
  }]);
  assert.ok(!JSON.stringify(review.items).includes('"main"'));
  assert.ok(!JSON.stringify(review.items).includes('"child"'));
});

function completedDynamicPage(page, definition, key) {
  return {
    [key]: true,
    dynamicQuestionnaireCompletions: {
      [key]: {
        definitionId: definition.id,
        pageId: page.id,
        revision: definition.revision,
      },
    },
  };
}

test("promoted temporary-work child pages replace legacy validation for the actual child route", () => {
  const childPage = {
    id: "temporary-work-children-child-profile-details",
    route: "/intake/temporary-work/children/child-profile/details",
    title: "Details",
    sectionKey: "temporary_work_details",
    completionKey: "temporary-work/children/child-profile/details",
    scope: "profile",
    metadata: {
      renderer: "dynamic",
      profileRole: "child",
      profileSection: "details",
      storagePath: "temporary_work_details",
    },
    questions: [],
  };
  const definition = { id: "published-482", revision: 8, pages: [childPage] };
  const completionKey = "temporary-work/children/child-1/details__child-1";
  const draft = {
    visaContext: "482",
    profiles: [{ id: "child-1", relationship: "child", given_names: "Casey" }],
    profiles_data: { "child-1": { details: {} } },
  };
  const args = {
    visaType: "temporary-work",
    visaContext: "482",
    draft,
    completionStatus: completedDynamicPage(childPage, definition, completionKey),
  };

  assert.ok(
    getIncompleteChecklist(args).includes("Child (Casey): Personal details"),
    "the legacy validator still reports the unpromoted child page",
  );
  assert.equal(
    getIncompleteChecklist({ ...args, questionnaireDefinition: definition })
      .includes("Child (Casey): Personal details"),
    false,
  );
});

test("promoted partner and protection child Details pages replace the fixed child schema", () => {
  for (const visaType of ["partner", "protection"]) {
    const childPage = {
      id: `${visaType}-children-child-profile-details`,
      route: `/intake/${visaType}/children/child-profile/details`,
      title: "Details",
      sectionKey: `${visaType}_details`,
      completionKey: `${visaType}/children/child-profile/details`,
      scope: "profile",
      metadata: {
        renderer: "dynamic",
        profileRole: "child",
        profileSection: "details",
        storagePath: `${visaType}_details`,
      },
      questions: [],
    };
    const definition = { id: `published-${visaType}`, revision: 9, pages: [childPage] };
    const completionKey = `${visaType}/children/child-1/details__child-1`;
    const draft = {
      profiles: [{ id: "child-1", relationship: "child", given_names: "Casey" }],
      profiles_data: { "child-1": { details: {} } },
    };
    const args = {
      visaType,
      draft,
      completionStatus: completedDynamicPage(childPage, definition, completionKey),
    };
    const isLegacyChildDetailsIssue = (issue) =>
      issue.startsWith("Child (Casey): Country of birth");

    assert.ok(
      getIncompleteChecklist(args).some(isLegacyChildDetailsIssue),
      `the ${visaType} legacy child schema still runs before promotion`,
    );
    assert.equal(
      getIncompleteChecklist({ ...args, questionnaireDefinition: definition })
        .some(isLegacyChildDetailsIssue),
      false,
    );
  }
});
