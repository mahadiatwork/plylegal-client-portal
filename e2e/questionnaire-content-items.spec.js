// Headings and explanatory text render once, in definition order, and store nothing.
// localStorage mode only (see AGENTS.md §4): uses the admin-exported 482 definition.
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { appScopedKey, seedIntakeApplication, stubExternalQuestionnaireApis } from "./support/questionnaireHarness";

const definition = JSON.parse(fs.readFileSync(path.resolve("e2e/fixtures/built-in-temporary-work-482.json"), "utf8"));
const APP_ID = "e2e-content-items";

test("482 Details shows Personal Information once above its questions", async ({ page }) => {
  const managed = structuredClone(definition);
  const details = managed.pages.find((candidate) => candidate.route.endsWith("/main-applicant/details"));
  const headingIndex = details.questions.findIndex((item) => item.type === "heading" && item.label === "Personal Information");
  expect(headingIndex).toBeGreaterThanOrEqual(0);
  // An administrator-added explanatory text right under the heading.
  details.questions.splice(headingIndex + 1, 0, { id: "details-intro-note", type: "paragraph", label: "Enter names exactly as they appear in your passport." });

  await stubExternalQuestionnaireApis(page);
  await seedIntakeApplication(page, {
    appId: APP_ID,
    reference: "E2E-CONTENT",
    draft: { visaContext: "482", profiles: [{ id: "main-1", relationship: "main_applicant", given_names: "Alex", family_name: "Main", gender: "Male" }], profiles_data: {} },
  });
  await page.evaluate((json) => localStorage.setItem("ply:questionnaireDefinitionOverride", json), JSON.stringify(managed));
  await page.goto(`/applications/482/${APP_ID}/intake/main-applicant/details?profileId=main-1`);
  const card = page.getByTestId("dynamic-questionnaire-page");
  await expect(card).toBeVisible({ timeout: 60_000 });

  await expect(card.getByRole("heading", { name: "Personal Information", exact: true })).toHaveCount(1);
  const order = await card.evaluate((root) => {
    const wanted = ["Personal Information", "Enter names exactly as they appear in your passport.", "Family Name", "Given Names", "Gender"];
    const text = root.innerText;
    return wanted.map((label) => text.indexOf(label));
  });
  expect(order.every((position) => position >= 0)).toBe(true);
  expect([...order].sort((a, b) => a - b)).toEqual(order);

  fs.mkdirSync(path.resolve("test-results/content-items"), { recursive: true });
  await card.screenshot({ path: path.resolve("test-results/content-items/details-personal-information.png") });

  await page.getByTestId("button-save").first().click();
  await expect.poll(async () => page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "{}")?.profiles_data?.["main-1"]?.details || null, appScopedKey(APP_ID, "draft"))).not.toBeNull();
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).profiles_data["main-1"].details, appScopedKey(APP_ID, "draft"));
  expect(stored.family_name).toBe("Main");
  for (const item of details.questions.filter((entry) => ["heading", "paragraph"].includes(entry.type))) {
    expect(Object.keys(stored)).not.toContain(item.id);
  }
  expect(Object.keys(stored).some((key) => key === "undefined")).toBe(false);
});
