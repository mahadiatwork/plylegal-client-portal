import assert from "node:assert/strict";
import { Module } from "node:module";
import path from "node:path";
import { test } from "node:test";
import { build } from "esbuild";
import {
  buildDefinitionNavigation,
  getAllowedProfileRelationships,
  getDefinitionNavigationProgress,
  getFirstContentStep,
  getIncludedGroupKeys,
  getRouteAvailability,
  isDefinitionNavigation,
} from "../src/lib/questionnaires/navigation.js";
import {
  calculateProgress,
  getAllRoutes,
  getNextRoute,
  getPreviousRoute,
  setActiveNavigationDefinition,
  setNonMigratingMembersGetter,
  setProfilesGetter,
} from "../src/lib/routes.js";

const MAIN = { id: "main-1", relationship: "main_applicant", given_names: "Alex", family_name: "Main" };
const SPOUSE = { id: "spouse-1", relationship: "spouse", given_names: "Sam", family_name: "Main" };
const CHILD = { id: "child-1", relationship: "child", given_names: "Casey", family_name: "Main" };

function question(id) {
  return { id, answerKey: id, label: id, type: "text", required: true };
}

function customPage(slug, order, extra = {}) {
  return {
    id: slug,
    title: `Section ${slug}`,
    route: `/intake/temporary-work/main-applicant/${slug}`,
    sectionKey: `custom_${slug}`,
    completionKey: `temporary-work/main-applicant/${slug}`,
    scope: "profile",
    order,
    introBlocks: [],
    metadata: { renderer: "dynamic", profileRole: "main_applicant" },
    questions: [question(`${slug}_q1`)],
    ...extra,
  };
}

function blankDefinition(overrides = {}) {
  return {
    id: "blank-1",
    visaType: "temporary-work",
    visaContexts: ["482"],
    title: "Blank",
    version: "1.0.0",
    status: "draft",
    schemaVersion: 1,
    revision: 0,
    navigation: { mode: "definition", groups: ["main-applicant"] },
    pages: [customPage("alpha", 20), customPage("beta", 10)],
    ...overrides,
  };
}

const fullDraft = { profiles: [MAIN, SPOUSE, CHILD], non_migrating_members: [] };

test("legacy definitions without navigation keep code-owned navigation", () => {
  assert.equal(isDefinitionNavigation({ pages: [] }), false);
  assert.equal(isDefinitionNavigation(blankDefinition({ navigation: undefined })), false);
  assert.equal(getAllowedProfileRelationships({ pages: [] }), null);
  assert.deepEqual(getRouteAvailability({ pages: [] }, "/intake/temporary-work/spouse-partner/details"), { reachable: true });

  setProfilesGetter(() => [MAIN, SPOUSE]);
  setNonMigratingMembersGetter(() => []);
  setActiveNavigationDefinition(blankDefinition({ navigation: undefined }));
  const routes = getAllRoutes("temporary-work", "482");
  assert.ok(routes.includes("/intake/temporary-work/main-applicant/details?profileId=main-1"));
  assert.ok(routes.some((route) => route.includes("/spouse-partner/")));
  setActiveNavigationDefinition(null);
});

test("sidebar groups follow the definition: only included groups, pages by order", () => {
  const navigation = buildDefinitionNavigation(blankDefinition(), { draft: fullDraft });
  assert.deepEqual(navigation.steps.map((step) => step.id), [
    "workflow:start",
    "workflow:profile",
    "beta:main-1",
    "alpha:main-1",
    "workflow:submit",
  ]);
  const groups = navigation.entries.filter((entry) => entry.type === "group");
  assert.equal(groups.length, 1);
  assert.equal(groups[0].key, "main-applicant");
  assert.deepEqual(groups[0].steps.map((step) => step.title), ["Section beta", "Section alpha"]);
  // Spouse and child profiles exist in the draft but their groups are excluded.
  assert.equal(navigation.steps.some((step) => step.profileId === "spouse-1" || step.profileId === "child-1"), false);
});

test("reordering pages changes the sidebar and the linear step order", () => {
  const reordered = blankDefinition({ pages: [customPage("alpha", 10), customPage("beta", 20)] });
  const navigation = buildDefinitionNavigation(reordered, { draft: fullDraft });
  assert.deepEqual(navigation.steps.filter((step) => step.kind === "page").map((step) => step.page.id), ["alpha", "beta"]);
});

test("group order and optional groups are driven by navigation.groups", () => {
  const definition = blankDefinition({
    navigation: { mode: "definition", groups: ["all-applicants", "main-applicant"] },
    pages: [
      customPage("alpha", 10),
      {
        ...customPage("shared-one", 10),
        route: "/intake/temporary-work/all-applicants/shared-one",
        completionKey: "temporary-work/all-applicants/shared-one",
        scope: "shared",
        metadata: { renderer: "dynamic" },
      },
    ],
  });
  assert.deepEqual(getIncludedGroupKeys(definition), ["all-applicants", "main-applicant"]);
  const navigation = buildDefinitionNavigation(definition, { draft: fullDraft });
  assert.deepEqual(
    navigation.entries.filter((entry) => entry.type === "group").map((entry) => entry.key),
    ["all-applicants", "main-applicant"],
  );
  assert.deepEqual(getIncludedGroupKeys({ ...definition, navigation: { mode: "definition", groups: ["bogus", "children", "children"] } }), ["children"]);
});

test("included spouse and child groups expand per profile with profile-scoped completion keys", () => {
  const definition = blankDefinition({
    navigation: { mode: "definition", groups: ["main-applicant", "spouse-partner", "children"] },
    pages: [
      customPage("alpha", 10),
      { ...customPage("partner-info", 10), route: "/intake/temporary-work/spouse-partner/partner-info", completionKey: "temporary-work/spouse-partner/partner-info", metadata: { renderer: "dynamic", profileRole: "spouse" } },
      { ...customPage("kid-info", 10), route: "/intake/temporary-work/children/child-profile/kid-info", completionKey: "temporary-work/children/child-profile/kid-info", metadata: { renderer: "dynamic", profileRole: "child" } },
    ],
  });
  const navigation = buildDefinitionNavigation(definition, { draft: fullDraft });
  const byId = Object.fromEntries(navigation.steps.map((step) => [step.id, step]));
  assert.equal(byId["alpha:main-1"].completionKey, "temporary-work/main-applicant/alpha__main-1");
  assert.equal(byId["partner-info:spouse-1"].completionKey, "temporary-work/spouse-partner/partner-info__spouse-1");
  assert.equal(byId["kid-info:child-1"].href, "/intake/temporary-work/children/child-1/kid-info");
  assert.equal(byId["kid-info:child-1"].completionKey, "temporary-work/children/child-1/kid-info__child-1");
});

test("excluded groups and sections outside the definition are not reachable", () => {
  const definition = blankDefinition();
  assert.deepEqual(getRouteAvailability(definition, "/intake/temporary-work/main-applicant/alpha").reachable, true);
  assert.deepEqual(getRouteAvailability(definition, "/intake/temporary-work/start"), { reachable: true });
  assert.deepEqual(getRouteAvailability(definition, "/intake/temporary-work/submit"), { reachable: true });
  assert.deepEqual(getRouteAvailability(definition, "/intake/temporary-work/spouse-partner/details"), { reachable: false, reason: "group-excluded", groupKey: "spouse-partner" });
  assert.deepEqual(getRouteAvailability(definition, "/intake/temporary-work/children/child-1/details"), { reachable: false, reason: "group-excluded", groupKey: "children" });
  assert.deepEqual(getRouteAvailability(definition, "/intake/temporary-work/non-migrating"), { reachable: false, reason: "group-excluded", groupKey: "non-migrating" });
  assert.deepEqual(getRouteAvailability(definition, "/intake/temporary-work/all-applicants/health"), { reachable: false, reason: "group-excluded", groupKey: "all-applicants" });
  // Included group, but the built-in page is not part of this questionnaire.
  assert.deepEqual(getRouteAvailability(definition, "/intake/temporary-work/main-applicant/details"), { reachable: false, reason: "not-in-questionnaire", groupKey: "main-applicant" });
});

test("Included Applicants only offers relationships whose groups are included", () => {
  assert.deepEqual([...getAllowedProfileRelationships(blankDefinition())], ["main_applicant"]);
  const withFamily = blankDefinition({ navigation: { mode: "definition", groups: ["main-applicant", "spouse-partner", "children", "non-migrating"] } });
  assert.deepEqual([...getAllowedProfileRelationships(withFamily)].sort(), ["child", "de_facto", "main_applicant", "other", "spouse"]);
});

test("Next / Previous and progress follow the definition and skip excluded groups", () => {
  setProfilesGetter(() => [MAIN, SPOUSE, CHILD]);
  setNonMigratingMembersGetter(() => []);
  setActiveNavigationDefinition(blankDefinition());
  try {
    assert.deepEqual(getAllRoutes("temporary-work", "482"), [
      "/intake/temporary-work/start",
      "/intake/temporary-work/profile",
      "/intake/temporary-work/main-applicant/beta?profileId=main-1",
      "/intake/temporary-work/main-applicant/alpha?profileId=main-1",
      "/intake/temporary-work/submit",
    ]);
    assert.equal(
      getNextRoute("/intake/temporary-work/profile", "temporary-work", null, "482"),
      "/intake/temporary-work/main-applicant/beta?profileId=main-1",
    );
    assert.equal(
      getNextRoute("/intake/temporary-work/main-applicant/beta?profileId=main-1", "temporary-work", null, "482"),
      "/intake/temporary-work/main-applicant/alpha?profileId=main-1",
    );
    assert.equal(
      getNextRoute("/intake/temporary-work/main-applicant/alpha?profileId=main-1", "temporary-work", null, "482"),
      "/intake/temporary-work/submit",
    );
    assert.equal(
      getPreviousRoute("/intake/temporary-work/main-applicant/alpha?profileId=main-1", "temporary-work", null, "482"),
      "/intake/temporary-work/main-applicant/beta?profileId=main-1",
    );
    assert.equal(getPreviousRoute("/intake/temporary-work/start", "temporary-work", null, "482"), null);
    assert.equal(calculateProgress("/intake/temporary-work/submit", "temporary-work", "482"), 100);
  } finally {
    setActiveNavigationDefinition(null);
  }
});

test("progress counts only included steps", () => {
  const navigation = buildDefinitionNavigation(blankDefinition(), { draft: fullDraft });
  // start, profile, beta, alpha (submit is never counted)
  assert.equal(navigation.progressSteps.length, 4);
  const done = new Set([
    "temporary-work/start",
    "temporary-work/profile",
    "temporary-work/main-applicant/beta__main-1",
  ]);
  assert.deepEqual(getDefinitionNavigationProgress(navigation, (key) => done.has(key)), { completed: 3, total: 4, percentage: 75 });
  // A completed spouse page cannot inflate or deflate progress while that group is excluded.
  done.add("temporary-work/spouse-partner/details__spouse-1");
  assert.equal(getDefinitionNavigationProgress(navigation, (key) => done.has(key)).total, 4);
  assert.equal(getFirstContentStep(navigation).page.id, "beta");
});

const bundled = await build({
  stdin: { resolveDir: process.cwd(), loader: "js", contents: `export {getIncompleteChecklist} from "./src/lib/submitCompletion.js"; export {buildTemporaryWorkReviewSections} from "./src/lib/temporaryWorkReview.js"; export {getTargetVisaPages, getTargetVisaProgress} from "./src/lib/targetVisaPages.js"; export {buildTargetVisaReviewSections} from "./src/lib/targetVisaReview.js";` },
  bundle: true, write: false, platform: "node", format: "cjs", packages: "external", jsx: "automatic", logLevel: "silent",
});
const filename = path.resolve("test", "definition-navigation-bundle.cjs");
const checklistModule = new Module(filename);
checklistModule.filename = filename;
checklistModule.paths = Module._nodeModulePaths(path.dirname(filename));
checklistModule._compile(bundled.outputFiles[0].text, filename);
const { getIncompleteChecklist, buildTemporaryWorkReviewSections, getTargetVisaPages, getTargetVisaProgress, buildTargetVisaReviewSections } = checklistModule.exports;

test("submission checklist only requires included sections and ignores excluded-group answers", () => {
  const definition = blankDefinition();
  const draft = {
    profiles: [MAIN, SPOUSE, CHILD],
    profiles_data: {
      "main-1": { custom_alpha: { alpha_q1: "done" }, custom_beta: { beta_q1: "done" } },
      // Saved answers for an excluded group stay in the draft; they must not matter.
      "spouse-1": { details: { family_name: "Spouse" } },
    },
  };
  const incomplete = getIncompleteChecklist({
    visaType: "temporary-work",
    visaContext: "482",
    completionStatus: {},
    draft,
    questionnaireDefinition: definition,
  });
  assert.deepEqual(incomplete, [
    "Getting Started",
    "Included Applicants",
    "Alex Main: Section beta",
    "Alex Main: Section alpha",
  ]);
  assert.equal(incomplete.some((item) => /Sam|Casey|Spouse|Child|Other Family|All Applicants/i.test(item)), false);

  const legacyChecklist = getIncompleteChecklist({
    visaType: "temporary-work",
    visaContext: "482",
    completionStatus: {},
    draft,
    questionnaireDefinition: { ...definition, navigation: undefined },
  });
  assert.ok(legacyChecklist.some((item) => /Sam Main/.test(item)), "legacy navigation still requires spouse pages");
});

test("a custom section is only complete once its answers validate", () => {
  const definition = blankDefinition({ pages: [customPage("alpha", 10)] });
  const draft = { profiles: [MAIN], profiles_data: { "main-1": { custom_alpha: { alpha_q1: "" } } } };
  const completionStatus = {
    "temporary-work/start": true,
    "temporary-work/profile": true,
    "temporary-work/main-applicant/alpha__main-1": true,
    dynamicQuestionnaireCompletions: {
      "temporary-work/main-applicant/alpha__main-1": { definitionId: "blank-1", revision: 0, pageId: "alpha" },
    },
  };
  const result = getIncompleteChecklist({ visaType: "temporary-work", visaContext: "482", completionStatus, draft, questionnaireDefinition: definition });
  assert.ok(result.includes("Alex Main: Section alpha"), "required answer is empty, so the section is still incomplete");
});

test("the review summary lists custom sections in order and hides excluded groups' saved answers", () => {
  const draft = {
    profiles: [MAIN, SPOUSE],
    profiles_data: {
      "main-1": { custom_alpha: { alpha_q1: "Alpha answer" }, custom_beta: { beta_q1: "Beta answer" } },
      "spouse-1": { details: { family_name: "Spouse family name" } },
    },
  };
  const sections = buildTemporaryWorkReviewSections({ draft, visaContext: "482", appId: "app-1", slug: "482", questionnaireDefinition: blankDefinition() });
  const titles = sections.map((section) => section.title);
  assert.ok(titles.indexOf("Section beta - Main Applicant") >= 0 && titles.indexOf("Section beta - Main Applicant") < titles.indexOf("Section alpha - Main Applicant"));
  assert.equal(JSON.stringify(sections).includes("Spouse family name"), false);
  const beta = sections.find((section) => section.title.startsWith("Section beta"));
  assert.ok(beta.editHref.includes("/main-applicant/beta"), beta.editHref);
});

test("partner / protection pages, progress and review follow the definition too", () => {
  const definition = blankDefinition({
    visaType: "partner",
    visaContexts: [],
    pages: [{ ...customPage("alpha", 10), route: "/intake/partner/main-applicant/alpha", completionKey: "partner/main-applicant/alpha" }],
  });
  const draft = { profiles: [MAIN, SPOUSE, CHILD], profiles_data: { "main-1": { custom_alpha: { alpha_q1: "Hello" } } } };
  const pages = getTargetVisaPages("partner", draft, definition);
  assert.deepEqual(pages.map((page) => page.key), ["partner/start", "partner/profile", "partner/main-applicant/alpha__main-1"]);
  const completion = { "partner/start": true, "partner/main-applicant/alpha__main-1": true };
  assert.deepEqual(getTargetVisaProgress("partner", draft, completion, definition), { completed: 2, total: 3, percentage: 67 });
  // Without a definition the original page list (spouse, child, sponsor, ...) still applies.
  assert.ok(getTargetVisaPages("partner", draft).length > 10);
  const sections = buildTargetVisaReviewSections({ visaType: "partner", draft, appId: "app-1", questionnaireDefinition: definition });
  assert.deepEqual(sections.map((section) => section.title), ["Included Applicants", "Section alpha"]);
  const roster = JSON.stringify(sections[0].items);
  assert.ok(roster.includes("Alex") && !roster.includes("Sam") && !roster.includes("Casey"), "excluded people are not listed");
});
