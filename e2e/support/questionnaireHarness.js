import { expect } from "@playwright/test";

export const DEMO_USER = {
  id: "demo-user-1",
  email: "user@example.com",
  name: "Demo User",
};

const TEST_DATE = "2026-05-31T00:00:00.000Z";

export function appScopedKey(appId, kind) {
  return `ply:app:${appId}:${kind}`;
}

function getTemporaryWorkApplicationType(visaContext) {
  if (visaContext === "186") {
    return "Employer Nomination (subclass 186)";
  }
  return "Skills in Demand (subclass 482)";
}

export async function seedTemporaryWorkApplication(page, { appId, reference, visaContext = "482" }) {
  const app = {
    id: appId,
    reference,
    type: getTemporaryWorkApplicationType(visaContext),
    visaTypeCode: "temporary-work",
    status: "Draft",
    userId: DEMO_USER.id,
    createdAt: TEST_DATE,
    updatedAt: TEST_DATE,
  };

  await page.goto("/login");
  await page.evaluate(
    ({ user, application, appId: seededAppId, visaContext: seededVisaContext }) => {
      localStorage.clear();
      localStorage.setItem("ply_session", "true");
      localStorage.setItem("ply_session_expires_at", String(Date.now() + 15 * 24 * 60 * 60 * 1000));
      localStorage.setItem("ply_user", JSON.stringify(user));
      localStorage.setItem(
        "ply_user_profile",
        JSON.stringify({
          userId: user.id,
          email: user.email,
          profileCompleted: true,
          needsPasswordChange: false,
          portalAccess: true,
          role: "user",
          zohoContactId: null,
        })
      );
      localStorage.setItem("ply:applications", JSON.stringify([application]));
      localStorage.setItem(`ply:app:${seededAppId}:draft`, JSON.stringify({ visaContext: seededVisaContext }));
      localStorage.setItem(`ply:app:${seededAppId}:completion`, JSON.stringify({}));
    },
    { user: DEMO_USER, application: app, appId, visaContext }
  );
}

export async function seed482Application(page, { appId, reference }) {
  await seedTemporaryWorkApplication(page, { appId, reference, visaContext: "482" });
}

export async function seed186Application(page, { appId, reference }) {
  await seedTemporaryWorkApplication(page, { appId, reference, visaContext: "186" });
}

export async function stubExternalQuestionnaireApis(page) {
  await page.route("**/api/intake/dependents**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, dependents: [], contact: null, reason: "e2e_stub" }),
    });
  });

  await page.route("**/api/intake/sync-dependent", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, skipped: true, reason: "e2e_stub" }),
    });
  });

  await page.route("**/api/profile/sync-zoho", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ success: true, skipped: true, reason: "e2e_stub" }),
    });
  });
}

export function watchForClientCrashes(page) {
  const errors = [];

  page.on("pageerror", (error) => {
    errors.push(error.message);
  });

  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (/Failed to load resource/i.test(text)) return;
    errors.push(text);
  });

  return {
    assertClean() {
      expect(errors, `Unexpected client errors:\n${errors.join("\n")}`).toEqual([]);
    },
  };
}

export async function startQuestionnaire(page, appId, slug = "482") {
  const intakeSlug = slug === "186" ? "186" : "482";
  await page.goto(`/applications/${intakeSlug}/${appId}/questionnaire`);
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: /Questionnaire/i })).toBeVisible();

  await page.getByRole("button", { name: /Start questionnaire|Continue/i }).click();
  await expect(page).toHaveURL(new RegExp(`/applications/${escapeRegExp(intakeSlug)}/[^/]+/intake/start`));
  await page.getByTestId("checkbox-started").click();
  await page.getByTestId("button-begin").click();
  await expect(page).toHaveURL(new RegExp(`/applications/${escapeRegExp(intakeSlug)}/[^/]+/intake/profile`));
}

export async function addApplicantProfile(page, profile) {
  await page.getByTestId("button-add-profile").click();
  await expect(page.getByRole("dialog")).toBeVisible();

  await selectRadixByTestId(page, "select-relationship", profile.relationshipLabel);
  await page.getByTestId("input-given-names").fill(profile.givenNames);
  await page.getByTestId("input-family-name").fill(profile.familyName);

  const genderOption = page.getByRole("radio", { name: profile.gender || "Male" }).first();
  if (await genderOption.count()) {
    await genderOption.click();
  }

  await page.getByTestId("button-save-profile").click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("main").getByText(`${profile.givenNames} ${profile.familyName}`).first()).toBeVisible();
}

export async function continueFromProfile(page) {
  await page.getByTestId("button-continue").click();
  await expect(page).toHaveURL(/\/main-applicant\/details\?profileId=/);
}

export async function selectRadixByTestId(page, testId, optionName) {
  const trigger = page.getByTestId(testId).first();
  await expect(trigger).toBeVisible();
  await trigger.click();
  await page.getByRole("option", { name: optionName }).first().click();
}

function valueForTextControl(identifier, branch) {
  const id = identifier.toLowerCase();
  if (id.includes("email")) return "e2e.applicant@example.com";
  if (id.includes("phone") || id.includes("mobile") || id.includes("number")) return "0400000000";
  if (id.includes("postcode") || id.includes("zip")) return "3000";
  if (id.includes("year")) return "2020";
  if (id.includes("country") || id.includes("nationality")) return "Australia";
  if (id.includes("city") || id.includes("suburb") || id.includes("town")) return "Melbourne";
  if (id.includes("state") || id.includes("province")) return "Victoria";
  if (id.includes("date")) return "2020-01-01";
  if (id.includes("family")) return branch === "high" ? "Branch" : "Minimal";
  if (id.includes("given")) return branch === "high" ? "Harper" : "Alex";
  if (id.includes("score")) return "8";
  if (id.includes("address")) return "1 E2E Test Street";
  if (id.includes("reference") || id.includes("trn")) return "E2E-REF-001";
  if (id.includes("passport")) return "P1234567";
  if (id.includes("role")) return "Applicant";
  if (id.includes("condition")) return "E2E condition";
  if (id.includes("course")) return "E2E course";
  if (id.includes("institution")) return "E2E institution";
  if (id.includes("employer")) return "E2E employer";
  return branch === "high" ? "E2E high branch detail" : "E2E minimal detail";
}

async function fillVisibleTextControls(scope, branch) {
  const controls = scope.locator(
    'input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]):not([type="file"]), textarea'
  );
  const count = await controls.count();

  for (let index = 0; index < count; index += 1) {
    const control = controls.nth(index);
    if (!(await control.isVisible().catch(() => false))) continue;
    if (!(await control.isEnabled().catch(() => false))) continue;

    const tagName = await control.evaluate((node) => node.tagName.toLowerCase()).catch(() => "");
    const type = (await control.getAttribute("type")) || "";
    const currentValue = tagName === "textarea"
      ? await control.inputValue().catch(() => "")
      : await control.inputValue().catch(() => "");

    if (currentValue && type !== "date") continue;

    const identifier = [
      await control.getAttribute("data-testid"),
      await control.getAttribute("name"),
      await control.getAttribute("id"),
      await control.getAttribute("placeholder"),
    ].filter(Boolean).join(" ");
    const nextValue = type === "date" ? "2020-01-01" : valueForTextControl(identifier, branch);

    await control.fill(nextValue).catch(() => {});
  }
}

function preferredSelectOptions(identifier) {
  const id = identifier.toLowerCase();
  if (id.includes("day")) return ["01", "1"];
  if (id.includes("month")) return ["January", "01", "1"];
  if (id.includes("birth-year")) return ["1990"];
  if (id.includes("expiry-year")) return ["2030", "2029", "2028"];
  if (id.includes("year")) return ["2020", "2021", "2019"];
  if (id.includes("country") || id.includes("nationality")) return ["Australia"];
  if (id.includes("gender") || id.includes("sex")) return ["Male"];
  if (id.includes("marital")) return ["Never Married"];
  if (id.includes("status")) return ["Current", "Completed", "Granted", "Employed"];
  if (id.includes("outcome")) return ["Granted"];
  if (id.includes("qualification")) return ["Bachelor", "Bachelor Degree", "Degree"];
  if (id.includes("language")) return ["English"];
  if (id.includes("proficiency")) return ["Good", "Fluent", "Proficient"];
  if (id.includes("test-type")) return ["IELTS"];
  if (id.includes("reason")) return ["Tourism", "Holiday", "Business", "Other"];
  if (id.includes("passport-type")) return ["Ordinary", "Regular"];
  if (id.includes("passport-name")) return ["Same as passport", "Yes"];
  if (id.includes("applicant")) return [];
  return [];
}

async function chooseOption(page, candidates) {
  const options = page.locator('[role="option"]:not([aria-disabled="true"])');
  await expect(options.first()).toBeVisible({ timeout: 3_000 });

  for (const candidate of candidates) {
    const matching = options.filter({ hasText: new RegExp(`^\\s*${escapeRegExp(candidate)}\\s*$`, "i") });
    if ((await matching.count()) > 0) {
      await matching.first().click();
      return;
    }
  }

  await options.first().click();
}

async function fillVisibleSelects(page, scope) {
  const triggers = scope.locator('button[role="combobox"]');
  const count = await triggers.count();

  for (let index = 0; index < count; index += 1) {
    const trigger = triggers.nth(index);
    if (!(await trigger.isVisible().catch(() => false))) continue;
    if (!(await trigger.isEnabled().catch(() => false))) continue;

    const identifier = [
      await trigger.getAttribute("data-testid").catch(() => ""),
      await trigger.getAttribute("id").catch(() => ""),
      await trigger.textContent().catch(() => ""),
    ].filter(Boolean).join(" ");

    await trigger.scrollIntoViewIfNeeded().catch(() => {});
    await trigger.click().catch(() => {});
    await chooseOption(page, preferredSelectOptions(identifier)).catch(async () => {
      await page.keyboard.press("Escape").catch(() => {});
    });
  }
}

async function selectVisibleRadios(scope, branch) {
  const groups = scope.locator('[role="radiogroup"]');
  const count = await groups.count();

  for (let groupIndex = 0; groupIndex < count; groupIndex += 1) {
    const group = groups.nth(groupIndex);
    if (!(await group.isVisible().catch(() => false))) continue;

    const radios = group.locator('[role="radio"]');
    const radioCount = await radios.count();
    if (radioCount === 0) continue;

    const values = [];
    for (let radioIndex = 0; radioIndex < radioCount; radioIndex += 1) {
      const radio = radios.nth(radioIndex);
      if (!(await radio.isVisible().catch(() => false))) continue;
      if (!(await radio.isEnabled().catch(() => false))) continue;
      values.push(await radio.evaluate((node, index) => {
        const id = node.getAttribute("id") || "";
        const htmlLabel = id
          ? Array.from(document.querySelectorAll("label")).find((label) => label.htmlFor === id)?.textContent || ""
          : "";
        return {
          index,
          value: (node.getAttribute("value") || "").toLowerCase(),
          label: [
            node.getAttribute("aria-label") || "",
            node.textContent || "",
            htmlLabel,
            id,
          ].join(" ").toLowerCase(),
          checked: node.getAttribute("aria-checked") === "true" || node.checked === true,
        };
      }, radioIndex));
    }

    if (values.length === 0) continue;

    const hasYesNo = values.some((item) => item.value === "yes") && values.some((item) => item.value === "no");
    const labelsHaveYesNo = values.some((item) => item.label.includes("yes")) && values.some((item) => item.label.includes("no"));
    const preferredValue = hasYesNo || labelsHaveYesNo ? (branch === "high" ? "yes" : "no") : null;
    const target =
      values.find((item) => preferredValue && item.value === preferredValue) ||
      values.find((item) => preferredValue && item.label.includes(preferredValue)) ||
      values.find((item) => item.value === "male" || item.label.includes("male")) ||
      values.find((item) => !item.checked) ||
      values[0];

    if (target && !target.checked) {
      await radios.nth(target.index).click().catch(() => {});
    }
  }
}

async function checkVisibleCheckboxes(scope, branch) {
  if (branch !== "high") return;
  const checkboxes = scope.locator('[role="checkbox"]');
  const count = await checkboxes.count();

  for (let index = 0; index < count; index += 1) {
    const checkbox = checkboxes.nth(index);
    if (!(await checkbox.isVisible().catch(() => false))) continue;
    if (!(await checkbox.isEnabled().catch(() => false))) continue;
    if ((await checkbox.getAttribute("aria-checked")) === "true") continue;
    await checkbox.click().catch(() => {});
  }
}

async function fillOpenDialog(page, branch) {
  const dialog = page.getByRole("dialog").last();
  await expect(dialog).toBeVisible();

  if (/\/all-applicants\/travel-history/.test(new URL(page.url()).pathname)) {
    await expect(dialog.getByText("Is this the main applicant's current location?")).toHaveCount(0);
    await expect(dialog.getByText("Departure Date")).toBeVisible();
  }

  await fillVisibleTextControls(dialog, branch);
  await fillVisibleSelects(page, dialog);
  await selectVisibleRadios(dialog, branch);
  await checkVisibleCheckboxes(dialog, branch);
  await fillVisibleTextControls(dialog, branch);

  const okButton = dialog.locator(
    '[data-testid="button-ok"], button:has-text("Ok"), button:has-text("Save"), button:has-text("Add")'
  ).last();
  await okButton.click();
  await expect(dialog).toBeHidden({ timeout: 8_000 });
}

async function fillVisibleRepeaters(page, branch, seenRepeaters) {
  const buttons = page.locator('[data-testid^="button-add-"]');
  const count = await buttons.count();

  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    const testId = await button.getAttribute("data-testid");
    const currentUrl = new URL(page.url());
    const repeaterKey = `${currentUrl.pathname}${currentUrl.search}:${testId}`;
    if (!testId || testId === "button-add-profile" || seenRepeaters.has(repeaterKey)) continue;
    if (!(await button.isVisible().catch(() => false))) continue;
    if (!(await button.isEnabled().catch(() => false))) continue;

    seenRepeaters.add(repeaterKey);
    await button.scrollIntoViewIfNeeded().catch(() => {});
    await button.click();
    await fillOpenDialog(page, branch).catch(async () => {
      await page.keyboard.press("Escape").catch(() => {});
    });
  }
}

async function waitForNavigationOverlayToClear(page) {
  await page.waitForTimeout(350);
  await expect(page.getByText("Opening application")).toHaveCount(0, { timeout: 10_000 });
}

async function getQuestionnaireProfiles(page) {
  return page.evaluate(() => {
    const match = window.location.pathname.match(/^\/applications\/[^/]+\/([^/]+)\//);
    const appId = match ? decodeURIComponent(match[1]) : null;
    if (!appId) return [];
    const draft = JSON.parse(localStorage.getItem(`ply:app:${appId}:draft`) || "{}");
    return (draft.profiles || []).map((profile) => ({
      label: [profile.given_names, profile.family_name].filter(Boolean).join(" ").trim() || "Unnamed",
    }));
  });
}

async function completeCountriesOfResidenceCoverage(page, seenRepeaters) {
  const currentUrl = new URL(page.url());
  const repeaterKey = `${currentUrl.pathname}${currentUrl.search}:residence-full-coverage`;
  if (seenRepeaters.has(repeaterKey)) return;
  seenRepeaters.add(repeaterKey);

  const profiles = await getQuestionnaireProfiles(page);
  const coverageStartYear = String(new Date().getFullYear() - 10);

  for (const profile of profiles) {
    await page.getByTestId("button-add-residence").click();
    const dialog = page.getByRole("dialog").last();
    await expect(dialog).toBeVisible();

    await selectRadixByTestId(page, "select-applicant-name", profile.label);
    await selectRadixByTestId(page, "select-from-day", "01");
    await selectRadixByTestId(page, "select-from-month", "January");
    await selectRadixByTestId(page, "select-from-year", coverageStartYear);
    await selectRadixByTestId(page, "select-country", "Australia");
    await dialog.getByTestId("input-address1").fill("1 E2E Test Street");
    await dialog.getByTestId("input-suburb").fill("Melbourne");
    await dialog.getByTestId("input-state").fill("Victoria");
    await dialog.getByTestId("input-postcode").fill("3000");
    await dialog.getByTestId("button-ok").click();
    await expect(dialog).toBeHidden({ timeout: 8_000 });
  }
}

async function assertTemporaryWorkCorrectionExpectations(page) {
  const currentPath = new URL(page.url()).pathname;

  if (/\/main-applicant\/contact-details/.test(currentPath)) {
    await expect(page.getByTestId("select-usual-country-of-residence")).toBeVisible();
    const usualBeforeResidential = await page.evaluate(() => {
      const usual = document.querySelector('[data-testid="select-usual-country-of-residence"]');
      const residential = document.querySelector('[data-testid="select-residential-country"]');
      if (!usual || !residential) return false;
      return Boolean(usual.compareDocumentPosition(residential) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(usualBeforeResidential).toBe(true);
  }

  if (/\/all-applicants\/visas/.test(currentPath)) {
    await expect(page.getByText("Visa History")).toHaveCount(0);
    await expect(page.getByTestId("input-visa-grant-number-0")).toBeVisible();
    await expect(page.getByText("Person the visa relates to")).toBeVisible();
  }
}

export async function expectResidenceCoverageBlocksIncomplete(page) {
  const currentUrl = page.url();
  await page.getByTestId("button-next").click();
  await expect(page.getByTestId("residence-coverage-error")).toBeVisible({ timeout: 10_000 });
  await expect(page).toHaveURL(currentUrl);
}

export async function completeVisibleQuestionnairePage(page, branch, seenRepeaters = new Set()) {
  await expect(page).not.toHaveURL(/\/login/);
  await page.waitForLoadState("domcontentloaded");
  await waitForNavigationOverlayToClear(page);
  await assertTemporaryWorkCorrectionExpectations(page);

  if (/\/all-applicants\/countries-of-residence/.test(new URL(page.url()).pathname)) {
    await completeCountriesOfResidenceCoverage(page, seenRepeaters);
    return;
  }

  await fillVisibleTextControls(page, branch);
  await fillVisibleSelects(page, page);
  await selectVisibleRadios(page, branch);
  await checkVisibleCheckboxes(page, branch);
  await fillVisibleTextControls(page, branch);
  await fillVisibleRepeaters(page, branch, seenRepeaters);
  await fillVisibleTextControls(page, branch);
  await fillVisibleSelects(page, page);
  await selectVisibleRadios(page, branch);
  await fillVisibleTextControls(page, branch);
}

export async function saveDraftOnceAndAssert(page, appId) {
  await page.getByTestId("button-save").click();
  await expect.poll(
    async () => page.evaluate((key) => localStorage.getItem(key), appScopedKey(appId, "draft")),
    { timeout: 10_000 }
  ).toContain("profiles_data");
}

export async function goNext(page) {
  const currentUrl = page.url();
  const currentMainText = await page.locator("main").innerText().catch(() => "");
  const nextButton = page.locator('[data-testid="button-next"], [data-testid="button-continue"]').first();
  await expect(nextButton).toBeVisible();
  await expect(nextButton).toBeEnabled();
  await nextButton.click();

  const navigated = await expect.poll(
    async () => {
      if (page.url() !== currentUrl) return true;
      const nextMainText = await page.locator("main").innerText().catch(() => "");
      return Boolean(currentMainText && nextMainText && nextMainText !== currentMainText);
    },
    { timeout: 90_000 }
  ).toBe(true).then(
    () => true,
    () => false
  );

  if (!navigated) {
    const errors = await page.locator('[role="alert"], .text-red-600').allTextContents().catch(() => []);
    throw new Error(`Questionnaire did not navigate from ${currentUrl}. Final URL: ${page.url()}. Visible errors: ${errors.join(" | ")}`);
  }
  await waitForNavigationOverlayToClear(page);
  await expect(page).not.toHaveURL(/\/login/);
}

export async function goPrevious(page) {
  const currentUrl = page.url();
  const previousButton = page.locator('[data-testid="button-previous"]').first();
  await expect(previousButton).toBeVisible();
  await previousButton.click();
  await expect.poll(() => page.url(), { timeout: 30_000 }).not.toBe(currentUrl);
  await waitForNavigationOverlayToClear(page);
  await expect(page).not.toHaveURL(/\/login/);
}

export async function submitQuestionnaire(page, appId) {
  await expect(page).toHaveURL(/\/submit/);
  await page.getByTestId("button-next").click();

  const submitAnyway = page.getByRole("button", { name: /Submit Anyway/i });
  if (await submitAnyway.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await submitAnyway.click();
  }

  await expect.poll(
    async () => page.evaluate(
      (seededAppId) => {
        const applications = JSON.parse(localStorage.getItem("ply:applications") || "[]");
        return applications.find((app) => app.id === seededAppId)?.status || null;
      },
      appId
    ),
    { timeout: 10_000 }
  ).toBe("submitted");
}

export async function expectCompletionSummary(page, { completed, total, percentage }) {
  const sidebar = page.getByRole("complementary");
  await expect(sidebar.getByText(`${percentage}%`, { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(sidebar.getByText(`${completed} of ${total} sections complete`)).toBeVisible({ timeout: 10_000 });
}

export async function seedTemporaryWorkIncompleteRequiredDraft(page, { appId, visaContext = "482" }) {
  const profileId = `main-${visaContext}-incomplete`;

  await page.evaluate(
    ({ seededAppId, seededVisaContext, seededProfileId }) => {
      const mainProfile = {
        id: seededProfileId,
        relationship: "main_applicant",
        given_names: "Alex",
        family_name: "Incomplete",
        gender: "Male",
        birth_day: "1",
        birth_month: "January",
        birth_year: "1990",
      };

      const draft = {
        visaContext: seededVisaContext,
        profiles: [mainProfile],
        profiles_data: {
          [seededProfileId]: {
            details: {
              family_name: "Incomplete",
              given_names: "Alex",
              gender: "Male",
              birth_day: "1",
              birth_month: "1",
              birth_year: "1990",
              country_of_birth: "",
              city_of_birth: "",
              marital_status: "Never Married",
              citizenship_other_than_birth: "no",
              citizenships: [],
            },
            other: {
              has_other_names: "yes",
              other_names: [],
            },
            contact_details: {
              email: "",
              phone: "",
              mobile: "",
              emergency_contact_name: "",
              emergency_contact_phone: "",
              usual_country_of_residence: "",
              residential_address: {},
            },
            employment: {
              is_currently_employed: "yes",
              current_employer: "",
              current_position: "",
              current_country: "",
              current_start_date_day: "",
              current_start_date_month: "",
              current_start_date_year: "",
              current_employment_type: "",
              current_address: "",
              employment_history: [],
            },
            education: {
              has_secondary_education: "yes",
              education_history: [],
            },
            skills: {
              has_occupational_registration: "no",
              registrations: [],
              has_skills_assessment: "yes",
              assessments: [],
            },
            language: {
              is_english_main_language: "no",
              languages: [],
              has_english_test: "no",
              english_tests: [],
              studied_in_english: "no",
              studied_in_english_details: "",
            },
          },
        },
      };

      const completion = {
        "temporary-work/start": true,
        "temporary-work/profile": true,
        [`temporary-work/main-applicant/details__${seededProfileId}`]: true,
        [`temporary-work/main-applicant/other__${seededProfileId}`]: true,
        [`temporary-work/main-applicant/identity__${seededProfileId}`]: true,
        [`temporary-work/main-applicant/contact-details__${seededProfileId}`]: true,
        [`temporary-work/main-applicant/employment__${seededProfileId}`]: true,
        [`temporary-work/main-applicant/education__${seededProfileId}`]: true,
        [`temporary-work/main-applicant/skills__${seededProfileId}`]: true,
        [`temporary-work/main-applicant/language__${seededProfileId}`]: true,
        "temporary-work/all-applicants/visas": true,
        "temporary-work/all-applicants/travel-history": true,
        "temporary-work/all-applicants/countries-of-residence": true,
        "temporary-work/all-applicants/health": true,
        "temporary-work/all-applicants/character": true,
      };

      if (seededVisaContext === "186") {
        completion["temporary-work/non-migrating"] = true;
      }

      localStorage.setItem(`ply:app:${seededAppId}:draft`, JSON.stringify(draft));
      localStorage.setItem(`ply:app:${seededAppId}:completion`, JSON.stringify(completion));
    },
    { seededAppId: appId, seededVisaContext: visaContext, seededProfileId: profileId }
  );

  return { profileId };
}

export async function readScopedDraft(page, appId) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "{}"), appScopedKey(appId, "draft"));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
