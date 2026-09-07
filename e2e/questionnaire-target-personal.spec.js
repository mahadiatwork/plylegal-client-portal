import { test, expect } from "@playwright/test";
import { appScopedKey, readScopedDraft, seedIntakeApplication, selectRadixByTestId, stubExternalQuestionnaireApis, watchForClientCrashes } from "./support/questionnaireHarness.js";

const main = { id: "personal-main", relationship: "main_applicant", given_names: "Alex", family_name: "Applicant", gender: "Male", birth_day: "1", birth_month: "January", birth_year: "1990" };
const spouse = { id: "personal-spouse", relationship: "spouse", given_names: "Sam", family_name: "Partner", gender: "Other", birth_day: "04", birth_month: "September", birth_year: "1992" };
const child = { id: "personal-child", relationship: "child", given_names: "Casey", family_name: "Child", gender: "Other", birth_day: "08", birth_month: "March", birth_year: "2015" };
const draftFor = () => ({ profiles: [main, spouse, child], profiles_data: {
  [spouse.id]: { details: { intending_to_migrate: "Other - they are my Sponsor", country_of_residence: "France", suburb_of_birth: "Historic suburb", custom_note: "Keep spouse note" } },
  [child.id]: { details: { relationship_to_spouse: "Step Child", custom_note: "Keep child note" } },
} });

test.beforeEach(async ({ page }) => {
  await stubExternalQuestionnaireApis(page);
  await page.route(/^https:\/\//, (route) => route.abort());
});

for (const slug of ["820", "866"]) {
  const visaType = slug === "820" ? "partner" : "protection";
  test(`${slug} spouse and child details prefill, save incomplete drafts, and retain extra answers on Continue`, async ({ page }) => {
    const appId = `e2e-target-personal-${slug}`;
    const crashes = watchForClientCrashes(page);
    const draft = draftFor();
    if (slug === "866") draft.profiles_data[spouse.id].details.intending_to_migrate = "Yes";
    await seedIntakeApplication(page, { appId, reference: `E2E-PERSONAL-${slug}`, slug, draft });
    await page.goto(`/applications/${slug}/${appId}/intake/spouse-partner/details?profileId=${spouse.id}`);
    await expect(page.getByTestId("input-given-names")).toHaveValue("Sam");
    await expect(page.getByRole("radio", { name: "Other", exact: true })).toBeChecked();
    await expect(page.getByTestId("select-birth-day")).toHaveText("4");
    await expect(page.getByTestId("select-birth-month")).toHaveText("September");
    await expect(page.getByText("Is this applicant a citizen of their country of passport?", { exact: true })).toBeVisible();
    await page.getByTestId("button-save").click();
    await expect.poll(async () => (await readScopedDraft(page, appId)).profiles_data[spouse.id].details.given_names).toBe("Sam");
    const completionKey = `${visaType}/spouse-partner/details__${spouse.id}`;
    await expect.poll(async () => page.evaluate(({ key, field }) => JSON.parse(localStorage.getItem(key) || "{}")[field], { key: appScopedKey(appId, "completion"), field: completionKey })).toBe(false);
    await page.getByTestId("select-country-of-birth").click();
    await expect(page.getByRole("option")).toHaveCount(193);
    await page.getByRole("option", { name: "Laos", exact: true }).click();
    await page.getByTestId("input-city-of-birth").fill("Vientiane");
    await page.getByTestId("input-state-of-birth").fill("Vientiane Prefecture");
    await page.getByTestId("select-marital-status").click();
    await page.getByRole("option", { name: "Married", exact: true }).click();
    await expect(page.getByText("Date of Marriage", { exact: false })).toBeVisible();
    await page.getByTestId("input-preferred-names").fill("Sammy");
    await expect(page.getByTestId("button-next")).toBeEnabled();
    await page.getByTestId("button-next").click();
    await expect(page).not.toHaveURL(/spouse-partner\/details\?/);
    const spouseSaved = (await readScopedDraft(page, appId)).profiles_data[spouse.id].details;
    expect(spouseSaved).toMatchObject({ given_names: "Sam", gender: "Other", country_of_birth: "Laos", marital_status: "Married", preferred_names: "Sammy", country_of_residence: "France", suburb_of_birth: "Historic suburb", custom_note: "Keep spouse note", intending_to_migrate: draft.profiles_data[spouse.id].details.intending_to_migrate });

    await page.goto(`/applications/${slug}/${appId}/intake/children/${child.id}/details`);
    await expect(page.getByTestId("input-given-names")).toHaveValue("Casey");
    await expect(page.getByRole("radio", { name: "Other", exact: true })).toBeChecked();
    await expect(page.getByTestId("select-birth-day")).toHaveText("8");
    await expect(page.getByTestId("select-relationship-to-spouse")).toHaveText("Step Child");
    await page.getByTestId("button-save").click();
    await expect.poll(async () => (await readScopedDraft(page, appId)).profiles_data[child.id].details.given_names).toBe("Casey");
    await page.getByTestId("input-country-of-birth").fill("France");
    await page.getByTestId("input-city-of-birth").fill("Paris");
    await page.getByTestId("input-state-of-birth").fill("Ile-de-France");
    await page.getByTestId("button-next").click();
    await expect(page).not.toHaveURL(new RegExp(`children/${child.id}/details`));
    expect((await readScopedDraft(page, appId)).profiles_data[child.id].details).toMatchObject({ given_names: "Casey", birth_day: "8", birth_month: "3", gender: "Other", country_of_birth: "France", relationship_to_spouse: "Step Child", custom_note: "Keep child note" });
    crashes.assertClean();
  });

  test(`${slug} spouse identity keeps imported metadata and adds optional national-ID dates`, async ({ page }) => {
    const appId = `e2e-target-identity-${slug}`;
    const crashes = watchForClientCrashes(page);
    const draft = draftFor();
    draft.profiles_data[spouse.id].identity = {
      has_passport: "no", passports: [], has_national_id: "yes",
      national_id_card: { family_name: "Partner", given_names: "Sam", identification_number: "OLD-NID", country_of_issue: "France", evidence_id: "Keep original" },
      other_identity_documents: [], custom_identity_note: "Keep identity note",
      is_current_citizen: "no", stateless_reason: "Historic stateless explanation", has_ever_been_citizen: "yes",
      previous_citizenships: [{ country: "France", how_obtained: "Grant", still_citizen: "no", date_ceased_day: "04", date_ceased_month: "09", date_ceased_year: "2000", ceased_reason: "Relinquished", custom_evidence: "Keep citizenship evidence" }],
      has_permanent_residency_rights: "yes", permanent_residencies: [{ country: "Canada", custom_evidence: "Keep residence evidence" }],
    };
    await seedIntakeApplication(page, { appId, reference: `E2E-TARGET-ID-${slug}`, slug, draft });
    await page.goto(`/applications/${slug}/${appId}/intake/spouse-partner/identity?profileId=${spouse.id}`);
    await expect(page.getByText("Do you currently hold or have you ever held a Passport or Travel Document?", { exact: true })).toBeVisible();
    await expect(page.getByText("National Identity Document", { exact: true })).toBeVisible();
    await expect(page.getByText("Other Identity Documents", { exact: true })).toBeVisible();
    await expect(page.getByTestId("input-national-id-identification_number")).toHaveValue("OLD-NID");
    await page.getByTestId("input-national-id-identification_number").fill("NEW-NID");
    await selectRadixByTestId(page, "select-national-id-date_issued_day", "4");
    await selectRadixByTestId(page, "select-national-id-date_issued_month", "September");
    await selectRadixByTestId(page, "select-national-id-date_issued_year", "2020");
    if (slug === "866") {
      await expect(page.locator('textarea[name="stateless_reason"]')).toHaveValue("Historic stateless explanation");
      await page.getByRole("row").filter({ hasText: "Grant" }).getByTestId("button-edit-0").click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByTestId("select-how-obtained")).toHaveText("Grant");
      await expect(dialog.getByPlaceholder("Enter reason citizenship ceased")).toHaveValue("Relinquished");
      await dialog.getByPlaceholder("Enter reason citizenship ceased").fill("Updated historical reason");
      await dialog.getByTestId("button-ok").click();
      await expect(dialog).toBeHidden();
    }
    await page.getByTestId("button-save").click();
    await expect.poll(async () => (await readScopedDraft(page, appId)).profiles_data[spouse.id].identity.national_id_card.identification_number).toBe("NEW-NID");
    await page.reload();
    await expect(page.getByTestId("select-national-id-date_issued_month")).toHaveText("September");
    await page.getByTestId("button-next").click();
    await expect(page).not.toHaveURL(/spouse-partner\/identity\?/);
    const saved = (await readScopedDraft(page, appId)).profiles_data[spouse.id].identity;
    expect(saved.national_id_card).toMatchObject({ identification_number: "NEW-NID", date_issued_day: "4", date_issued_month: "September", date_issued_year: "2020", evidence_id: "Keep original" });
    expect(saved.custom_identity_note).toBe("Keep identity note");
    expect(saved.stateless_reason).toBe("Historic stateless explanation");
    expect(saved.permanent_residencies[0].custom_evidence).toBe("Keep residence evidence");
    expect(saved.previous_citizenships[0].custom_evidence).toBe("Keep citizenship evidence");
    if (slug === "866") expect(saved.previous_citizenships[0]).toMatchObject({ how_obtained: "Grant", ceased_reason: "Updated historical reason", reason_ceased: "Updated historical reason" });
    crashes.assertClean();
  });

  test(`${slug} main applicant previous dates of birth keep their metadata after editing`, async ({ page }) => {
    const appId = `e2e-target-prev-dob-${slug}`;
    const crashes = watchForClientCrashes(page);
    const draft = draftFor();
    const other = {
      has_other_names: "no", other_names: [], use_chinese_code: "yes", chinese_code: "1234",
      russian_descent: "no", has_prev_dob: "yes", custom_note: "Keep other history",
      prev_dobs: [{ date_of_birth: "1989-09-04", date_of_birth_day: "4", date_of_birth_month: "9", date_of_birth_year: "1989", legacy_evidence: "Keep DOB evidence" }],
    };
    if (slug === "866") draft.protection_other = other;
    else draft.mainApplicant = { otherNames: other };
    await seedIntakeApplication(page, { appId, reference: `E2E-PREV-DOB-${slug}`, slug, draft });
    await page.goto(`/applications/${slug}/${appId}/intake/main-applicant/other?profileId=${main.id}`);
    await expect(page.getByTestId("input-chinese-code")).toHaveValue("1234");
    await page.getByTestId("button-edit-0").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByTestId("select-dob-day")).toHaveText("4");
    await selectRadixByTestId(page, "select-dob-day", "5");
    await dialog.getByTestId("button-save-dob").click();
    await expect(dialog).toBeHidden();
    await page.getByTestId("button-save").click();
    await expect.poll(async () => (await readScopedDraft(page, appId)).profiles_data[main.id]?.other?.prev_dobs?.[0]?.date_of_birth).toBe("1989-09-05");
    await page.reload();
    await page.getByTestId("button-edit-0").click();
    await expect(page.getByRole("dialog").getByTestId("select-dob-day")).toHaveText("5");
    await page.getByRole("dialog").getByTestId("button-cancel-dob").click();
    const saved = (await readScopedDraft(page, appId)).profiles_data[main.id].other;
    expect(saved).toMatchObject({ chinese_code: "1234", custom_note: "Keep other history" });
    expect(saved.prev_dobs[0]).toMatchObject({ date_of_birth: "1989-09-05", date_of_birth_day: "5", legacy_evidence: "Keep DOB evidence" });
    if (slug === "866") expect((await readScopedDraft(page, appId)).protection_other.prev_dobs[0].date_of_birth).toBe("1989-09-04");
    else expect((await readScopedDraft(page, appId)).mainApplicant.otherNames.prev_dobs[0].date_of_birth).toBe("1989-09-04");
    crashes.assertClean();
  });
}
