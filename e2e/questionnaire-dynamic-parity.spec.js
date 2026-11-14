// Legacy ↔ dynamic renderer parity for a questionnaire exported from the admin catalog.
//
// For every content page:
//   1. legacy fill  — fill the hand-written React page and save           → draft L
//   2. round trip   — load L, render the page from the definition, save   → must equal L
//   3. dynamic fill — fill the definition-rendered page and save          → draft D (key diff vs L)
//
// Step 2 is the data-safety gate (existing client answers survive promotion).
// Step 3 reports keys the dynamic page cannot edit or writes differently.
//
// Setup:
//   (admin)  node scripts/export-built-in-questionnaire.mjs temporary-work 482
//   (client) NEXT_PUBLIC_DATABASE_TYPE=localStorage NEXT_DIST_DIR=.next-e2e next dev --webpack -p 5015
//            npx playwright test -c playwright.parity.config.mjs e2e/questionnaire-dynamic-parity.spec.js
// Filter pages with PARITY_ROUTES=skills,details (substring match). Reports: test-results/parity-report/.
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import {
  appScopedKey,
  completeVisibleQuestionnairePage,
  seedIntakeApplication,
  stubExternalQuestionnaireApis,
} from "./support/questionnaireHarness";

const FIXTURE = process.env.PARITY_FIXTURE || "e2e/fixtures/built-in-temporary-work-482.json";
const definition = JSON.parse(fs.readFileSync(path.resolve(FIXTURE), "utf8"));
const REPORT_DIR = path.resolve("test-results/parity-report");
const APP_ID = "e2e-parity";
const SLUG = definition.visaType === "temporary-work" ? (definition.visaContexts?.[0] || "482") : definition.visaType;

const PROFILES = [
  { id: "main-1", relationship: "main_applicant", given_names: "Alex", family_name: "Main", gender: "Male" },
  { id: "spouse-1", relationship: "spouse", given_names: "Harper", family_name: "Main", gender: "Female" },
  { id: "child-1", relationship: "child", given_names: "Casey", family_name: "Main", gender: "Other" },
];
const MEMBERS = [{ id: "nm-1", given_names: "Robin", family_name: "Main", relationship: "Parent" }];
const BASE_DRAFT = { visaContext: SLUG, profiles: PROFILES, non_migrating_members: MEMBERS, profiles_data: {} };

const WORKFLOW_ROUTE = /\/(start|profile|non-migrating|submit)$/;
const filters = (process.env.PARITY_ROUTES || "").split(",").map((value) => value.trim()).filter(Boolean);
const pages = definition.pages
  .filter((page) => !WORKFLOW_ROUTE.test(page.route))
  // Only pages that have a hand-written legacy renderer to compare against.
  .filter((page) => page.metadata?.renderer === "legacy" || page.metadata?.dynamicParity === "certified")
  .filter((page) => !filters.length || filters.some((filter) => page.route.includes(filter)));

const dynamicDefinition = {
  ...definition,
  pages: definition.pages.map((page) => {
    if (page.metadata?.renderer !== "legacy") return page;
    const { renderer, ...metadata } = page.metadata;
    return { ...page, metadata };
  }),
};

function urlFor(route) {
  const sub = route.replace(/^\/intake\/[^/]+\//, "")
    .replace("children/child-profile/", "children/child-1/")
    .replace("non-migrating/member-profile/", "non-migrating/nm-1/");
  const profileId = sub.startsWith("main-applicant/") ? "main-1"
    : sub.startsWith("spouse-partner/") ? "spouse-1"
      : sub.startsWith("children/") ? "child-1" : null;
  return `/applications/${SLUG}/${APP_ID}/intake/${sub}${profileId ? `?profileId=${profileId}` : ""}`;
}

const VOLATILE_KEY = /(updatedAt|createdAt|lastSaved|savedAt|timestamp|crm|zoho)/i;

function stripVolatile(value) {
  if (Array.isArray(value)) return value.map(stripVolatile);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !VOLATILE_KEY.test(key))
    .map(([key, child]) => [key, stripVolatile(child)]));
}

/** Treat absent, "" and empty containers as equivalent "no answer". */
function isEmptyAnswer(value) {
  return value === undefined || value === null || value === ""
    || (Array.isArray(value) && value.length === 0)
    || (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0);
}

function diff(left, right, at = "", out = []) {
  if (isEmptyAnswer(left) && isEmptyAnswer(right)) return out;
  const bothObjects = left && right && typeof left === "object" && typeof right === "object"
    && Array.isArray(left) === Array.isArray(right);
  if (!bothObjects) {
    if (JSON.stringify(left) !== JSON.stringify(right)) out.push({ path: at || "(root)", legacy: left, dynamic: right });
    return out;
  }
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) diff(left[key], right[key], at ? `${at}.${key}` : key, out);
  return out;
}

async function readDraft(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "{}"), appScopedKey(APP_ID, "draft"));
}

async function openPage(page, route, { draft, dynamic }) {
  await seedIntakeApplication(page, { appId: APP_ID, reference: "E2E-PARITY", slug: SLUG, draft });
  if (dynamic) {
    await page.evaluate((json) => localStorage.setItem("ply:questionnaireDefinitionOverride", json), JSON.stringify(dynamicDefinition));
  }
  const target = urlFor(route);
  if (/\/children\//.test(route)) {
    // Legacy child pages redirect when opened cold before the draft loads; real users
    // arrive by in-app navigation, so warm the intake layout first and navigate client-side.
    await page.goto(urlFor("/intake/x/profile"));
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(1_000);
    const pushed = await page.evaluate((href) => {
      if (!window.next?.router?.push) return false;
      window.next.router.push(href);
      return true;
    }, target);
    if (!pushed) await page.goto(target);
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 30_000 }).toBe(target.split("?")[0]);
  } else {
    await page.goto(target);
  }
  await page.waitForLoadState("networkidle").catch(() => {});
  if (dynamic) await expect(page.getByTestId("dynamic-questionnaire-page")).toBeVisible({ timeout: 30_000 });
  else await expect(page.getByTestId("dynamic-questionnaire-page")).toHaveCount(0);
  await page.waitForTimeout(1_000);
}

async function saveDraft(page) {
  const before = JSON.stringify(await readDraft(page));
  await page.getByTestId("button-save").first().click();
  await expect.poll(async () => JSON.stringify(await readDraft(page)), { timeout: 15_000 }).not.toBe(before);
  return stripVolatile(await readDraft(page));
}

for (const definitionPage of pages) {
  test(`parity ${definitionPage.route}`, async ({ page }) => {
    test.setTimeout(300_000);
    await stubExternalQuestionnaireApis(page);
    const errors = [];
    let phase = "legacy";
    page.on("pageerror", (error) => errors.push(`[${phase}] ${error.message}`));

    // 0. defaults — save each renderer untouched; differences are missing defaults/prefills
    await openPage(page, definitionPage.route, { draft: BASE_DRAFT, dynamic: false });
    const legacyDefaults = await saveDraft(page).catch(() => stripVolatile(BASE_DRAFT));
    phase = "dynamic-defaults";
    await openPage(page, definitionPage.route, { draft: BASE_DRAFT, dynamic: true });
    const dynamicDefaults = await saveDraft(page).catch(() => stripVolatile(BASE_DRAFT));
    const defaultDiffs = diff(legacyDefaults, dynamicDefaults).filter((entry) => !/completionPercentage/.test(entry.path));
    phase = "legacy";

    // 1. legacy fill
    await openPage(page, definitionPage.route, { draft: BASE_DRAFT, dynamic: false });
    await completeVisibleQuestionnairePage(page, "high");
    const legacy = await saveDraft(page);
    fs.mkdirSync(REPORT_DIR, { recursive: true });
    await page.locator("main").screenshot({
      path: path.join(REPORT_DIR, `${definitionPage.route.replace(/^\/intake\//, "").replace(/\//g, "__")}.legacy.png`),
    }).catch(() => {});

    // 2. round trip through the dynamic renderer
    phase = "round-trip";
    await openPage(page, definitionPage.route, { draft: legacy, dynamic: true });
    await page.getByTestId("button-save").first().click();
    await page.waitForTimeout(1_500);
    const roundTrip = stripVolatile(await readDraft(page));
    const roundTripDiff = diff(legacy, roundTrip);

    // 3. dynamic fill
    phase = "dynamic";
    await openPage(page, definitionPage.route, { draft: BASE_DRAFT, dynamic: true });
    await completeVisibleQuestionnairePage(page, "high");
    const dynamic = await saveDraft(page);
    const shotName = definitionPage.route.replace(/^\/intake\//, "").replace(/\//g, "__");
    await page.locator("main").screenshot({ path: path.join(REPORT_DIR, `${shotName}.dynamic.png`) }).catch(() => {});
    const fillDiff = diff(stripVolatile(legacy), dynamic);
    const onlyLegacy = fillDiff.filter((entry) => !isEmptyAnswer(entry.legacy) && isEmptyAnswer(entry.dynamic)).map((entry) => entry.path);
    const onlyDynamic = fillDiff.filter((entry) => isEmptyAnswer(entry.legacy) && !isEmptyAnswer(entry.dynamic)).map((entry) => entry.path);

    fs.mkdirSync(REPORT_DIR, { recursive: true });
    const name = definitionPage.route.replace(/^\/intake\//, "").replace(/\//g, "__");
    fs.writeFileSync(path.join(REPORT_DIR, `${name}.json`), JSON.stringify({
      route: definitionPage.route,
      defaultDiffs,
      roundTripDiff,
      onlyLegacy,
      onlyDynamic,
      valueDiffs: fillDiff.filter((entry) => !isEmptyAnswer(entry.legacy) && !isEmptyAnswer(entry.dynamic)),
      errors,
    }, null, 2));

    expect(errors, "client errors").toEqual([]);
    expect(roundTripDiff, "saving a legacy-saved page through the dynamic renderer changed stored answers").toEqual([]);
  });
}
