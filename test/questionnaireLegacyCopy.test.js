import assert from "node:assert/strict";
import { test } from "node:test";
import { Module } from "node:module";
import path from "node:path";
import { build } from "esbuild";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createLegacyQuestionnaireCopy, translateLegacyQuestionnaireCopy, applyLegacyQuestionnaireReviewCopy } from "../src/lib/questionnaires/legacyCopy.js";
import { findQuestionnaireDefinitionPage } from "../src/lib/questionnaires/pageRoutes.js";

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
    import {QuestionnaireCopyProvider} from "./src/components/questionnaire/QuestionnaireCopyContext.jsx";
    import {Field} from "./src/components/Field.jsx";
    import {Card,CardHeader,CardTitle,CardContent} from "./src/components/ui/card.jsx";
    export {getIncompleteChecklist} from "./src/lib/submitCompletion.js";
    export {buildTemporaryWorkReviewSections} from "./src/lib/temporaryWorkReview.js";
    export function Fixture({page}) {
      const form=useForm({defaultValues:{previous_name:"Saved client name"}});
      return <QuestionnaireCopyProvider page={page}><Card><CardHeader><CardTitle>Other names</CardTitle></CardHeader><CardContent><p>Original instructions</p><Field control={form.control} name="previous_name" label="Previous name" description="Original help" placeholder="Original example" type="text"/></CardContent></Card></QuestionnaireCopyProvider>;
    }
  ` },
  bundle: true, write: false, platform: "node", format: "cjs", packages: "external", jsx: "automatic", logLevel: "silent",
});
const filename = path.resolve("test", "legacy-questionnaire-bundle.cjs");
const legacyModule = new Module(filename);
legacyModule.filename = filename;
legacyModule.paths = Module._nodeModulePaths(path.dirname(filename));
legacyModule._compile(bundled.outputFiles[0].text, filename);
const { Fixture, getIncompleteChecklist, buildTemporaryWorkReviewSections } = legacyModule.exports;

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

test("legacy review reads original profile section aliases and retains answers with edited labels", () => {
  const draft = { visaContext: "482", profiles: [{ id: "main", relationship: "main_applicant", given_names: "Client" }], profiles_data: { main: { other: { previous_name: "Saved client name" } } } };
  const sections = buildTemporaryWorkReviewSections({ draft, visaContext: "482", questionnaireDefinition: { id: "published", revision: 99, pages: [page] } });
  const other = sections.find((section) => section.title.includes("Updated other names"));
  assert.ok(other);
  assert.ok(other.items.some((item) => item.label === "Your previous name" && item.value === "Saved client name"));
});
