import { test, expect } from "@playwright/test";
import { SPONSOR_CHARACTER_KEYS } from "../src/lib/partnerQuestionnaireAlignment.js";
import { appScopedKey, readScopedDraft, seedIntakeApplication, stubExternalQuestionnaireApis, watchForClientCrashes } from "./support/questionnaireHarness.js";

const MAIN_PROFILE = {
  id: "sponsor-alignment-main", relationship: "main_applicant",
  given_names: "Alex", family_name: "Applicant", gender: "Other",
  birth_day: "01", birth_month: "January", birth_year: "1990",
};
const SPONSOR = { given_names: "Sam", family_name: "Sponsor", gender: "Other" };
const baseDraft = () => ({ profiles: [MAIN_PROFILE], profiles_data: {}, familySponsor: { details: { ...SPONSOR } } });

test.beforeEach(async ({ page }) => {
  await stubExternalQuestionnaireApis(page);
  // These regressions use only the localStorage adapter and never contact a
  // production data service, even if an unrelated page adds a remote request.
  await page.route(/^https:\/\//, (route) => route.abort());
});

test("all fourteen sponsor Yes declarations can save details attributed to the sponsor", async ({ page }) => {
  const appId = "e2e-sponsor-all-declarations";
  const crashes = watchForClientCrashes(page);
  await seedIntakeApplication(page, { appId, reference: "E2E-SPONSOR-ALL", slug: "820", draft: baseDraft() });
  await page.goto(`/applications/820/${appId}/intake/family-sponsor/character`);
  await expect(page.getByText("Provide character information for your Sponsor.", { exact: true })).toBeVisible();
  expect(SPONSOR_CHARACTER_KEYS).toHaveLength(14);

  for (const key of SPONSOR_CHARACTER_KEYS) {
    await page.getByTestId(`radio-${key}-yes`).click();
    await page.getByTestId(`button-add-sponsor-${key}`).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Sponsor: Sam Sponsor", { exact: true })).toBeVisible();
    await dialog.getByLabel("Give details", { exact: true }).fill(`Stored details for ${key}`);
    if (key === "military_service") {
      await dialog.getByLabel("Description of Duties", { exact: true }).fill("Historic service duties");
    }
    await dialog.getByRole("button", { name: "OK", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId(`sponsor-declaration-${key}`).getByRole("cell", { name: `Stored details for ${key}`, exact: true })).toBeVisible();
  }
  await page.getByTestId("button-save").click();
  await expect.poll(async () => {
    const saved = (await readScopedDraft(page, appId)).familySponsor?.details;
    return SPONSOR_CHARACTER_KEYS.every((key) => saved?.[key] === "yes" && saved?.[`${key}_details`]?.[0]?.applicant_name === "Sam Sponsor");
  }).toBe(true);
  const saved = (await readScopedDraft(page, appId)).familySponsor.details;
  expect(saved.military_service_details[0].duties_description).toBe("Historic service duties");
  expect(saved.given_names).toBe("Sam");
  await page.reload();
  for (const key of SPONSOR_CHARACTER_KEYS) {
    await expect(page.getByTestId(`radio-${key}-yes`)).toHaveAttribute("aria-checked", "true");
  }
  await page.getByTestId("button-next").click();
  await expect.poll(async () => page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "{}")["partner/family-sponsor/character"], appScopedKey(appId, "completion"))).toBe(true);
  crashes.assertClean();
});

test("legacy sponsor national-security details remain editable and deleted aliases do not return", async ({ page }) => {
  const appId = "e2e-sponsor-security-migration";
  const crashes = watchForClientCrashes(page);
  const draft = baseDraft();
  const canonical = { country: "Australia", details: "First historical event", legacy_code: "keep-first", applicant_name: "Alex Applicant" };
  const legacy = { country: "Canada", details: "Second historical event", legacy_code: "keep-second", applicant_name: "Alex Applicant" };
  Object.assign(draft.familySponsor.details, {
    national_security_risk: "yes",
    national_security_risk_details: [canonical],
    national_security_details: [canonical, legacy],
  });
  await seedIntakeApplication(page, { appId, reference: "E2E-SPONSOR-LEGACY", slug: "820", draft });
  await page.goto(`/applications/820/${appId}/intake/family-sponsor/character`);
  const section = page.getByTestId("sponsor-declaration-national_security_risk");
  await expect(section.getByRole("cell", { name: "First historical event", exact: true })).toBeVisible();
  await expect(section.getByRole("cell", { name: "Second historical event", exact: true })).toBeVisible();
  await section.getByTestId("button-edit-0").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Give details", { exact: true })).toHaveValue("First historical event");
  await dialog.getByLabel("Give details", { exact: true }).fill("Edited historical event");
  await dialog.getByRole("button", { name: "OK", exact: true }).click();
  await expect(dialog).toBeHidden();
  await section.getByTestId("button-delete-1").click();
  await page.getByTestId("button-save").click();
  await expect.poll(async () => (await readScopedDraft(page, appId)).familySponsor.details.national_security_details?.length).toBe(1);
  await page.reload();
  await expect(section.getByRole("cell", { name: "Edited historical event", exact: true })).toBeVisible();
  await expect(section.getByRole("cell", { name: "Second historical event", exact: true })).toHaveCount(0);
  const saved = (await readScopedDraft(page, appId)).familySponsor.details;
  expect(saved.national_security_risk_details).toEqual(saved.national_security_details);
  expect(saved.national_security_risk_details[0]).toMatchObject({ legacy_code: "keep-first", applicant_name: "Sam Sponsor" });
  crashes.assertClean();
});

test("820 education retains generic Chinese and legacy fields after editing and continuing", async ({ page }) => {
  const appId = "e2e-education-legacy-options";
  const crashes = watchForClientCrashes(page);
  const draft = baseDraft();
  draft.mainApplicant = { education: { untouched_legacy_section: "retain" } };
  draft.profiles_data[MAIN_PROFILE.id] = { education: {
    has_secondary_education: "yes",
    education_history: [{
      date_from_day: "1", date_from_month: "1", date_from_year: "2020",
      date_to_day: "", date_to_month: "", date_to_year: "",
      qualification_type: "Master's", is_highest_qualification: "yes",
      course_name: "Language studies", course_language: "Chinese", course_status: "Ongoing",
      institution_name: "Example University", country: "Australia", legacy_reference: "KEEP-COURSE",
    }],
  } };
  await seedIntakeApplication(page, { appId, reference: "E2E-EDUCATION-LEGACY", slug: "820", draft });
  await page.goto(`/applications/820/${appId}/intake/main-applicant/education?profileId=${MAIN_PROFILE.id}`);
  await page.getByTestId("button-edit-0").click();
  const dialog = page.getByRole("dialog");
  const language = dialog.getByRole("combobox").filter({ hasText: /^Chinese$/ });
  await expect(language).toBeVisible();
  await expect(dialog.getByRole("combobox").filter({ hasText: /^Current\/Ongoing$/ })).toBeVisible();
  await expect(dialog.getByTestId("select-date-from-day")).toHaveText("01");
  await language.click();
  await expect(page.getByRole("option", { name: "Chinese", exact: true })).toBeVisible();
  await expect(page.getByRole("option", { name: "Chinese (Mandarin)", exact: true })).toBeVisible();
  await expect(page.getByRole("option", { name: "Chinese (Cantonese)", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await dialog.getByLabel("Course Name or Research Description", { exact: true }).fill("Updated language studies");
  await dialog.getByTestId("button-ok").click();
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId("button-next")).toBeEnabled();
  await page.getByTestId("button-next").click();
  await expect(page).not.toHaveURL(/\/education\?/);
  const saved = await readScopedDraft(page, appId);
  expect(saved.profiles_data[MAIN_PROFILE.id].education.has_secondary_education).toBe("yes");
  expect(saved.profiles_data[MAIN_PROFILE.id].education.education_history[0]).toMatchObject({
    course_name: "Updated language studies", course_language: "Chinese", course_status: "Current/Ongoing", legacy_reference: "KEEP-COURSE",
    date_from_day: "1", date_from_month: "1", date_to_day: "", date_to_month: "", date_to_year: "",
  });
  expect(saved.mainApplicant.education).toEqual({ untouched_legacy_section: "retain" });
  crashes.assertClean();
});
