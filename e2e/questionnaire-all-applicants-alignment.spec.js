import { test, expect } from "@playwright/test";
import {
  seedIntakeApplication,
  stubExternalQuestionnaireApis,
  selectRadixByTestId,
  readScopedDraft,
} from "./support/questionnaireHarness.js";
import { TARGET_CHARACTER_QUESTIONS } from "../src/lib/allApplicantsParity.js";

const profile = { id: "main-parity", relationship: "main_applicant", given_names: "Alex", family_name: "Parity", gender: "Other" };

async function openSection(page, { slug, appId, section, draft = {} }) {
  await stubExternalQuestionnaireApis(page);
  await seedIntakeApplication(page, {
    slug, appId, reference: appId,
    draft: { profiles: [profile], ...draft },
  });
  await page.goto(`/applications/${slug}/${appId}/intake/all-applicants/${section}?applicationId=${appId}`);
  await expect(page.getByTestId("button-next")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Opening application", { exact: true })).toHaveCount(0);
}

async function choose(page, trigger, option) {
  await trigger.click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

for (const kind of ["training", "service"]) {
  test(`866 military ${kind} records save with visible fields and retain new details on reload`, async ({ page }) => {
    const appId = `parity-military-${kind}`;
    await openSection(page, {
      slug: "866", appId, section: "character",
      draft: { protection_character: Object.fromEntries(TARGET_CHARACTER_QUESTIONS.map(({ key }) => [key, "no"])) },
    });
    await page.locator(`#military_${kind}-yes`).click();
    await page.getByRole("button", { name: "Add", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await choose(page, dialog.getByRole("combobox").nth(0), "Parity Alex");
    await choose(page, dialog.getByRole("combobox").nth(1), "Australia");
    await dialog.locator('textarea[name="details"]').fill(`Details of ${kind} for this applicant`);
    if (kind === "service") await dialog.locator('input[name="position"]').fill("Officer");
    await dialog.getByRole("button", { name: "Ok", exact: true }).click();
    await expect(dialog).toBeHidden();
    await page.getByTestId("button-next").click();
    await expect.poll(async () => (await readScopedDraft(page, appId)).protection_character?.[`military_${kind}_details`]?.[0]?.details)
      .toBe(`Details of ${kind} for this applicant`);
    await expect.poll(() => page.evaluate((id) => JSON.parse(localStorage.getItem(`ply:app:${id}:completion`) || "{}")['protection/all-applicants/character'], appId)).toBe(true);
    await page.goto(`/applications/866/${appId}/intake/all-applicants/character?applicationId=${appId}`);
    await expect(page.locator(`#military_${kind}-yes`)).toHaveAttribute("aria-checked", "true");
    await page.getByTestId("button-edit-0").click();
    await expect(dialog.locator('textarea[name="details"]')).toHaveValue(`Details of ${kind} for this applicant`);
    await expect(dialog.getByRole("combobox").nth(1)).toContainText("Australia");
  });
}

test("820 Other travel details survive Continue and reopening the saved entry", async ({ page }) => {
  const appId = "parity-travel-other";
  await openSection(page, { slug: "820", appId, section: "travel-history" });
  await page.getByTestId("radio-travel-history-yes").click();
  await page.getByTestId("button-add-travel").click();
  const dialog = page.getByRole("dialog");
  await selectRadixByTestId(page, "select-country", "Australia");
  await dialog.getByRole("button", { name: "No", exact: true }).click();
  await selectRadixByTestId(page, "select-reason", "Other");
  await dialog.locator('textarea[name="other_reason_details"]').fill("Attended a family ceremony");
  await selectRadixByTestId(page, "select-status", "Visitor/Tourist");
  await selectRadixByTestId(page, "select-arrived-day", "01");
  await selectRadixByTestId(page, "select-arrived-month", "January");
  await selectRadixByTestId(page, "select-arrived-year", "2025");
  await dialog.getByTestId("button-ok").click();
  await expect(dialog).toBeHidden();
  await page.getByTestId("button-next").click();
  await expect.poll(async () => (await readScopedDraft(page, appId)).partner_travel?.travel_history?.[0]?.other_reason_details)
    .toBe("Attended a family ceremony");
  await page.goto(`/applications/820/${appId}/intake/all-applicants/travel-history?applicationId=${appId}`);
  await page.getByTestId("button-edit-0").click();
  await expect(dialog.getByTestId("select-reason")).toContainText("Other");
  await expect(dialog.locator('textarea[name="other_reason_details"]')).toHaveValue("Attended a family ceremony");
});

test("a saved legacy travel reason remains selected and editable alongside the standard reasons", async ({ page }) => {
  const appId = "parity-travel-legacy";
  await openSection(page, {
    slug: "820", appId, section: "travel-history",
    draft: { partner_travel: { has_travel_history: "yes", travel_history: [{
      country: "Australia", reason_for_visit: "Working Holiday", legal_status: "Visitor/Tourist",
      date_arrived_day: "01", date_arrived_month: "January", date_arrived_year: "2025",
    }] } },
  });
  await page.getByTestId("button-edit-0").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByTestId("select-reason")).toContainText("Working Holiday");
  await dialog.getByTestId("select-reason").click();
  await expect(page.getByRole("option", { name: "Work, study or training", exact: true })).toBeVisible();
  await page.getByRole("option", { name: "Working Holiday", exact: true }).click();
  await dialog.getByTestId("button-ok").click();
  await page.getByTestId("button-next").click();
  await expect.poll(async () => (await readScopedDraft(page, appId)).partner_travel?.travel_history?.[0]?.reason_for_visit)
    .toBe("Working Holiday");
});

test("866 shared contacts can be disabled, saved, and enabled again without losing stored answers", async ({ page }) => {
  const appId = "parity-shared-contact";
  await openSection(page, {
    slug: "866", appId, section: "contact-details",
    draft: { protection_contact_details: {
      share_same_contact_phones: "yes", mobile_phone_country_code: "+61", mobile_phone_number: "0400000000",
      share_same_email: "yes", shared_email: "parity@example.com",
      share_same_postal_address: "yes", postal_address: "12 Saved Street", postal_address_line2: "Unit 2",
      postal_suburb: "Melbourne", postal_state: "Victoria", postal_postcode: "3000", postal_country: "Australia",
    } },
  });
  for (const testId of ["radio-share-phones", "radio-share-email", "radio-share-postal"]) {
    await page.getByTestId(testId).getByRole("radio", { name: "No", exact: true }).click();
  }
  await expect(page.getByTestId("input-shared-email")).toBeHidden();
  await page.getByTestId("button-save").click();
  await expect.poll(async () => (await readScopedDraft(page, appId)).protection_contact_details?.share_same_email).toBe("no");
  expect((await readScopedDraft(page, appId)).protection_contact_details).toMatchObject({
    mobile_phone_number: "0400000000", shared_email: "parity@example.com", postal_address_line2: "Unit 2",
  });
  await page.reload();
  for (const testId of ["radio-share-phones", "radio-share-email", "radio-share-postal"]) {
    await page.getByTestId(testId).getByRole("radio", { name: "Yes", exact: true }).click();
  }
  await expect(page.getByTestId("input-mobile-number")).toHaveValue("0400000000");
  await expect(page.getByTestId("input-shared-email")).toHaveValue("parity@example.com");
  await expect(page.getByTestId("input-postal-address")).toHaveValue("12 Saved Street");
  await expect(page.locator('input[name="postal_address_line2"]')).toHaveValue("Unit 2");
});

test("866 Continue ignores an unfinished email while sharing is disabled and retains its draft value", async ({ page }) => {
  const appId = "parity-hidden-email";
  await openSection(page, {
    slug: "866", appId, section: "contact-details",
    draft: { protection_contact_details: {
      share_same_contact_phones: "no", share_same_email: "yes", share_same_postal_address: "no",
      shared_email: "unfinished-address",
    } },
  });
  await page.getByTestId("radio-share-email").getByRole("radio", { name: "No", exact: true }).click();
  await page.getByTestId("button-next").click();
  await expect(page).not.toHaveURL(/all-applicants\/contact-details/);
  expect((await readScopedDraft(page, appId)).protection_contact_details).toMatchObject({
    share_same_email: "no", shared_email: "unfinished-address",
  });
});
