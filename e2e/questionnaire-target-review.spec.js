import { test, expect } from "@playwright/test";
import { getTargetVisaPages } from "../src/lib/targetVisaPages.js";
import { seedIntakeApplication, stubExternalQuestionnaireApis, watchForClientCrashes } from "./support/questionnaireHarness";

const main = { id: "main", relationship: "main_applicant", given_names: "Alex", family_name: "Applicant", gender: "Male", birth_day: "1", birth_month: "January", birth_year: "1990" };
const child = { id: "child", relationship: "child", given_names: "Casey", family_name: "Child", gender: "Other", birth_day: "4", birth_month: "September", birth_year: "2015" };
const identity = { has_passport: "no", has_national_id: "no", citizen_of_country: "yes", citizenships: [{ country: "Australia", how_obtained: "Birth", still_citizen: "yes" }], permanent_residency_rights: "no" };

for (const [slug, visaType] of [["820", "partner"], ["866", "protection"]]) {
  test(`${slug} shows its actual page total before the first completion flag`, async ({ page }) => {
    await stubExternalQuestionnaireApis(page);
    const appId = `e2e-target-initial-progress-${slug}`;
    const draft = { profiles: [main] };
    await seedIntakeApplication(page, { appId, reference: `E2E-PROGRESS-${slug}`, slug, draft });
    await page.goto(`/applications/${slug}/${appId}/intake/submit`);
    await expect(page.locator("body")).toContainText(`0 of ${getTargetVisaPages(visaType, draft).length} sections complete`);
  });

  test(`${slug} review keeps people separate and blocks incomplete answers and documents before submission`, async ({ page }) => {
    await stubExternalQuestionnaireApis(page);
    const crashes = watchForClientCrashes(page);
    const appId = `e2e-target-review-${slug}`;
    const draft = {
      profiles: [main, child],
      profiles_data: { main: { identity, details: { city_of_birth: "Main-only birthplace" } }, child: { details: { relationship_to_spouse: "Child" } } },
      familySponsor: { details: { outstanding_debts: "yes", outstanding_debts_details: [{ details: "Sponsor-only debt" }] } },
      [`${visaType}_travel`]: { history: [{ applicant_ids: ["main", "child"], country: "Australia", other_reason_details: "Family gathering" }] },
    };
    await seedIntakeApplication(page, { appId, reference: `E2E-REVIEW-${slug}`, slug, draft });
    const completion = Object.fromEntries(getTargetVisaPages(visaType, draft).map((section) => [section.key, true]));
    await page.evaluate(({ appId, completion }) => {
      localStorage.setItem(`ply:app:${appId}:completion`, JSON.stringify(completion));
      localStorage.setItem(`ply:app:${appId}:uploads`, JSON.stringify([{ id: "required", name: "Identity evidence", required: true, status: "pending" }]));
    }, { appId, completion });
    await page.goto(`/applications/${slug}/${appId}/intake/submit`);
    await expect(page.getByText("Review & Submit", { exact: true })).toBeVisible();
    const childReview = page.locator("article").filter({ has: page.getByRole("heading", { name: "Child (Casey Child): Details", exact: true }) });
    await expect(childReview).toContainText("Casey");
    await expect(childReview).not.toContainText("Main-only birthplace");
    await expect(childReview.getByRole("link", { name: "Edit" })).toHaveAttribute("href", new RegExp(`/applications/${slug}/${appId}/intake/children/child/details`));
    if (slug === "820") {
      const sponsorReview = page.locator("article").filter({ has: page.getByRole("heading", { name: "Family Sponsor", exact: true }) });
      await expect(sponsorReview).toContainText("Has your Sponsor ever had any outstanding debts");
      await expect(sponsorReview).toContainText("Sponsor-only debt");
    }
    await page.getByTestId("button-next").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Complete Required Items Before Submitting")).toBeVisible();
    await expect(dialog).toContainText("Casey Child");
    await expect(dialog).toContainText("Country of birth is required");
    await expect(dialog).toContainText("Upload Documents: Identity evidence");
    await expect(dialog).not.toContainText("Spouse/Partner");
    await expect(page.getByRole("button", { name: /Submit Anyway/i })).toHaveCount(0);
    await expect.poll(() => page.evaluate((id) => JSON.parse(localStorage.getItem("ply:applications")).find((app) => app.id === id).status, appId)).toBe("Draft");

    await page.evaluate((id) => {
      const saved = JSON.parse(localStorage.getItem(`ply:app:${id}:draft`));
      saved.profiles_data.child.details = { ...saved.profiles_data.child.details, country_of_birth: "Australia", city_of_birth: "Sydney", state_of_birth: "NSW" };
      localStorage.setItem(`ply:app:${id}:draft`, JSON.stringify(saved));
      localStorage.setItem(`ply:app:${id}:uploads`, JSON.stringify([{ id: "required", name: "Identity evidence", required: true, status: "uploaded" }]));
    }, appId);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Questionnaire Complete", exact: true })).toBeVisible();
    await page.getByTestId("button-next").click();
    await expect.poll(() => page.evaluate((id) => JSON.parse(localStorage.getItem("ply:applications")).find((app) => app.id === id).status, appId)).toBe("submitted");
    crashes.assertClean();
  });
}
