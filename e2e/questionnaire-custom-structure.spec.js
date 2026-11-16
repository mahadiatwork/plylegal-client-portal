// Flexible questionnaire structure, end to end (localStorage mode only, see AGENTS.md §4).
//
// The fixture is produced by the admin portal's own functions
// (ply-legal-admin-portal/scripts/export-blank-structured-questionnaire.mjs):
//   a blank questionnaire with two newly named Main Applicant sections, no spouse / dependent
//   groups (a hidden Spouse/Partner section exists but is excluded), sidebar sections reordered
//   (Work authorisation first) and questions reordered (Start year, Employer name, Job title).
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import {
  appScopedKey,
  readScopedDraft,
  seedIntakeApplication,
  startQuestionnaire,
  stubExternalQuestionnaireApis,
  watchForClientCrashes,
} from "./support/questionnaireHarness";

const definition = JSON.parse(fs.readFileSync(path.resolve("e2e/fixtures/blank-structured-482.json"), "utf8"));
const APP_ID = "e2e-custom-structure";
const OVERRIDE_KEY = "ply:questionnaireDefinitionOverride";
const SHOTS = path.resolve("test-results/custom-structure");

const MAIN = { id: "main-1", relationship: "main_applicant", given_names: "Alex", family_name: "Main", gender: "Male" };
// Saved before the questionnaire was restructured: these groups are now excluded but their answers must survive.
const SPOUSE = { id: "spouse-1", relationship: "spouse", given_names: "Sam", family_name: "Main", gender: "Female" };
const CHILD = { id: "child-1", relationship: "child", given_names: "Casey", family_name: "Main", gender: "Other" };

const base = `/applications/482/${APP_ID}/intake`;
const WORK_AUTH = `${base}/main-applicant/work-authorisation?profileId=main-1`;
const EMPLOYER = `${base}/main-applicant/employer-background?profileId=main-1`;

async function seed(page, { completion = {} } = {}) {
  await stubExternalQuestionnaireApis(page);
  await seedIntakeApplication(page, {
    appId: APP_ID,
    reference: "E2E-STRUCTURE",
    draft: {
      visaContext: "482",
      profiles: [MAIN, SPOUSE, CHILD],
      profiles_data: { "spouse-1": { details: { family_name: "Spouse answer that must be kept" } } },
    },
  });
  await page.evaluate(
    ({ key, json, completionKey, completionValue }) => {
      localStorage.setItem(key, json);
      localStorage.setItem(completionKey, JSON.stringify(completionValue));
    },
    { key: OVERRIDE_KEY, json: JSON.stringify(definition), completionKey: appScopedKey(APP_ID, "completion"), completionValue: completion },
  );
}

const sidebar = (page) => page.getByTestId("definition-navigation");
const stepLabels = (page) => sidebar(page).getByTestId("definition-nav-step").allInnerTexts().then((labels) => labels.map((label) => label.replace(/^\s*(?:\d+|✓)?\s*/, "").trim()));
const progressText = (page) => page.getByRole("complementary").getByText(/\d+ of \d+ sections complete/).first().innerText();

test.describe("custom questionnaire structure @custom-structure", () => {
  test.beforeAll(() => fs.mkdirSync(SHOTS, { recursive: true }));

  test("sidebar: only the included group, new sections in the saved order", async ({ page }) => {
    await seed(page);
    await page.goto(WORK_AUTH);
    await expect(page.getByTestId("dynamic-questionnaire-page")).toBeVisible({ timeout: 60_000 });

    await expect(sidebar(page)).toBeVisible();
    // Fixed steps, then the Main Applicant group, then Review and Submit — nothing for spouse, children,
    // Other Family or All Applicants even though the draft has a spouse and a child.
    await expect(sidebar(page).getByTestId("definition-nav-group")).toHaveCount(1);
    await expect(sidebar(page).getByTestId("definition-nav-group")).toContainText("Main Applicant");
    expect(await stepLabels(page)).toEqual([
      "Getting Started",
      "Included Applicants",
      "Work authorisation",
      "Employer background",
      "Review and Submit",
    ]);
    const navText = await sidebar(page).innerText();
    for (const absent of [/Spouse/i, /Child/i, /Other Family/i, /All Applicants/i, /Partner information/i, /Sam/, /Casey/]) {
      expect(navText).not.toMatch(absent);
    }
    expect(await progressText(page)).toBe("0 of 4 sections complete");
    await page.screenshot({ path: path.join(SHOTS, "sidebar.png") });
  });

  test("direct URLs and refresh render new sections with questions in the saved order", async ({ page }) => {
    await seed(page);
    // Direct visit (no in-app navigation first).
    await page.goto(EMPLOYER);
    const card = page.getByTestId("dynamic-questionnaire-page");
    await expect(card).toBeVisible({ timeout: 60_000 });
    await expect(card.getByText("Employer background", { exact: true })).toBeVisible();

    const questionOrder = async () => card.evaluate((root) => {
      const text = root.innerText;
      return ["Start year", "Employer name", "Job title"].map((label) => text.indexOf(label));
    });
    let positions = await questionOrder();
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions); // Start year, Employer name, Job title

    // Refresh keeps working: the route is resolved from the definition, not from in-app state.
    await page.reload();
    await expect(page.getByTestId("dynamic-questionnaire-page")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("dynamic-questionnaire-page").getByText("Employer background", { exact: true })).toBeVisible();
    positions = await questionOrder();
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    await expect(sidebar(page).getByTestId("definition-nav-step").filter({ hasText: "Employer background" })).toHaveAttribute("data-active", "true");
    await page.screenshot({ path: path.join(SHOTS, "employer-background-refreshed.png") });

    // The other new section also works as a cold direct visit.
    await page.goto(WORK_AUTH);
    await expect(page.getByTestId("dynamic-questionnaire-page").getByText("Work authorisation", { exact: true })).toBeVisible({ timeout: 60_000 });
  });

  test("excluded groups and sections outside the definition are not reachable", async ({ page }) => {
    await seed(page);
    const unreachable = [
      `${base}/spouse-partner/details?profileId=spouse-1`,          // excluded group, built-in page
      `${base}/spouse-partner/partner-info?profileId=spouse-1`,     // excluded group, hidden custom section
      `${base}/children/child-1/details?profileId=child-1`,         // excluded group
      `${base}/non-migrating`,                                      // Other Family
      `${base}/all-applicants/health`,                              // group not included
      `${base}/main-applicant/details?profileId=main-1`,            // included group, built-in page not in the definition
      `${base}/main-applicant/never-created?profileId=main-1`,      // unknown section
    ];
    for (const url of unreachable) {
      await page.goto(url);
      await expect(page.getByTestId("section-not-in-questionnaire").or(page.getByTestId("custom-section-not-found")).first(), url).toBeVisible({ timeout: 60_000 });
      await expect(page.getByTestId("dynamic-questionnaire-page")).toHaveCount(0);
    }
    await page.screenshot({ path: path.join(SHOTS, "excluded-group.png") });
  });

  test("Included Applicants only offers people the included groups cover", async ({ page }) => {
    await seed(page);
    await startQuestionnaire(page, APP_ID);
    await page.getByTestId("button-add-profile").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByTestId("select-relationship").click();
    const options = await page.getByRole("option").allInnerTexts();
    expect(options.join(" | ")).toMatch(/Main Applicant/);
    expect(options.join(" | ")).not.toMatch(/Spouse|Child|Dependent/i);
    await page.keyboard.press("Escape");
  });

  test("full journey: navigation, validation, progress and submission follow the definition", async ({ page }) => {
    const crashWatcher = watchForClientCrashes(page);
    await seed(page);
    await startQuestionnaire(page, APP_ID);

    // Continue leaves "Included Applicants" for the first included section (Work authorisation, per the saved order).
    await page.getByTestId("button-continue").click();
    await expect(page).toHaveURL(/\/main-applicant\/work-authorisation\?.*profileId=main-1/, { timeout: 60_000 });
    const card = page.getByTestId("dynamic-questionnaire-page");
    await expect(card).toBeVisible({ timeout: 60_000 });
    expect(await progressText(page)).toBe("2 of 4 sections complete");

    // Required questions block Next.
    await page.getByTestId("button-next").click();
    await expect(page).toHaveURL(/\/work-authorisation/);
    await expect(card.getByText(/required/i).first()).toBeVisible();

    await card.getByRole("radio", { name: "Yes" }).check({ force: true });
    await card.getByLabel(/Anything we should know/).fill("Held since 2024");
    await page.getByTestId("button-next").click();
    await expect(page).toHaveURL(/\/main-applicant\/employer-background/, { timeout: 60_000 });
    await expect(sidebar(page).getByTestId("definition-nav-step").filter({ hasText: "Work authorisation" })).toHaveAttribute("data-complete", "true");
    expect(await progressText(page)).toBe("3 of 4 sections complete");

    // Submission is blocked while the last included section is incomplete — and only that is listed.
    await page.getByTestId("button-previous").click();
    await expect(page).toHaveURL(/\/work-authorisation/);
    await page.goto(`${base}/submit`);
    await page.getByTestId("button-next").click();
    const blocking = page.getByRole("dialog");
    await expect(blocking).toBeVisible({ timeout: 30_000 });
    const blockedText = await blocking.innerText();
    expect(blockedText).toContain("Employer background");
    expect(blockedText).not.toMatch(/Sam|Casey|Spouse|Child|Other Family|All Applicants|Partner information/);
    expect(blockedText).not.toContain("Work authorisation");
    await page.screenshot({ path: path.join(SHOTS, "submission-blocked.png") });
    await page.keyboard.press("Escape");

    // Finish the last section.
    await page.goto(EMPLOYER);
    const employerCard = page.getByTestId("dynamic-questionnaire-page");
    await expect(employerCard).toBeVisible({ timeout: 60_000 });
    await employerCard.getByLabel(/Employer name/).fill("Acme Pty Ltd");
    await employerCard.getByLabel(/Job title/).fill("Engineer");
    await employerCard.getByLabel(/Start year/).fill("2024");
    await page.getByTestId("button-next").click();
    await expect(page).toHaveURL(/\/submit/, { timeout: 60_000 });
    expect(await progressText(page)).toBe("4 of 4 sections complete");

    // Everything included is complete: submission goes through, regardless of the excluded spouse / child.
    await page.getByTestId("button-next").click();
    const submitAnyway = page.getByRole("button", { name: /Submit Anyway/i });
    if (await submitAnyway.isVisible({ timeout: 2_000 }).catch(() => false)) throw new Error("Submission should not need 'Submit Anyway'");
    await expect.poll(
      async () => page.evaluate((id) => (JSON.parse(localStorage.getItem("ply:applications") || "[]").find((app) => app.id === id) || {}).status || null, APP_ID),
      { timeout: 15_000 },
    ).toBe("submitted");

    // Saved answers: stored under the new sections' own keys; the excluded spouse's answers are untouched.
    const draft = await readScopedDraft(page, APP_ID);
    expect(draft.profiles_data["main-1"].custom_employer_background).toMatchObject({ employer_name: "Acme Pty Ltd", job_title: "Engineer", start_year: "2024" });
    expect(draft.profiles_data["main-1"].custom_work_authorisation).toMatchObject({ holds_visa: "yes", visa_notes: "Held since 2024" });
    expect(draft.profiles_data["spouse-1"].details.family_name).toBe("Spouse answer that must be kept");
    crashWatcher.assertClean();
  });

  test("a questionnaire that does not opt in keeps the original code-owned sidebar", async ({ page }) => {
    const legacy = structuredClone(definition);
    delete legacy.navigation;
    await seed(page);
    await page.evaluate(({ key, json }) => localStorage.setItem(key, json), { key: OVERRIDE_KEY, json: JSON.stringify(legacy) });
    await page.goto(`${base}/start`);
    await expect(page.getByRole("navigation", { name: /Questionnaire Sections/i })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("definition-navigation")).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: /Questionnaire Sections/i })).toContainText("Review and Submit");
  });
});
