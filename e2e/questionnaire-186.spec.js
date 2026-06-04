import { test, expect } from "@playwright/test";
import {
  addApplicantProfile,
  completeVisibleQuestionnairePage,
  continueFromProfile,
  expectCompletionSummary,
  expectResidenceCoverageBlocksIncomplete,
  goNext,
  goPrevious,
  readScopedDraft,
  saveDraftOnceAndAssert,
  seed186Application,
  seedTemporaryWorkIncompleteRequiredDraft,
  startQuestionnaire,
  stubExternalQuestionnaireApis,
  submitQuestionnaire,
  watchForClientCrashes,
} from "./support/questionnaireHarness";

const MAIN_APPLICANT = {
  relationshipLabel: "Main Applicant (Nominated Worker)",
  givenNames: "Jordan",
  familyName: "Nominee",
  gender: "Male",
};

const SPOUSE = {
  relationshipLabel: "Spouse or De Facto Partner",
  givenNames: "Riley",
  familyName: "Nominee",
  gender: "Female",
};

const CHILD = {
  relationshipLabel: "Dependent Child",
  givenNames: "Taylor",
  familyName: "Nominee",
  gender: "Other",
};

test.describe("186 questionnaire @questionnaire-186", () => {
  test.beforeEach(async ({ page }) => {
    await stubExternalQuestionnaireApis(page);
  });

  test("186 minimal branch saves, goes back, keeps 186 context, and submits", async ({ page }) => {
    const appId = "e2e-186-minimal";
    const crashWatcher = watchForClientCrashes(page);

    await seed186Application(page, { appId, reference: "E2E-186-MIN" });
    await startQuestionnaire(page, appId, "186");
    await addApplicantProfile(page, MAIN_APPLICANT);
    await continueFromProfile(page);

    await completeVisibleQuestionnairePage(page, "low");
    await saveDraftOnceAndAssert(page, appId);

    const savedDraft = await readScopedDraft(page, appId);
    expect(savedDraft.visaContext).toBe("186");
    expect(savedDraft.profiles_data).toBeTruthy();

    await goNext(page);
    await expect(page).toHaveURL(/\/main-applicant\/other/);
    await expectMainOtherNameDialogWithoutApplicationName(page);
    await goPrevious(page);
    await expect(page).toHaveURL(/\/main-applicant\/details/);
    await expect(page.getByTestId("input-family-name")).toHaveValue(MAIN_APPLICANT.familyName);

    const coverage = await completeLinearFlowToSubmit186(page, "low", {
      expectSpouse: false,
      expectChild: false,
      expectNonMigratingSubpages: false,
    });

    expect(coverage.sawSpouse).toBe(false);
    expect(coverage.sawChild).toBe(false);
    expect(coverage.nonMigratingSubpages.size).toBe(0);

    await expectCompletionSummary(page, { completed: 16, total: 16, percentage: 100 });
    await submitQuestionnaire(page, appId);
    crashWatcher.assertClean();
  });

  test("186 expanded branch covers spouse, child, and non-migrating flows before submit", async ({ page }) => {
    const appId = "e2e-186-expanded";
    const crashWatcher = watchForClientCrashes(page);

    await seed186Application(page, { appId, reference: "E2E-186-EXP" });
    await startQuestionnaire(page, appId, "186");
    await addApplicantProfile(page, MAIN_APPLICANT);
    await addApplicantProfile(page, SPOUSE);
    await addApplicantProfile(page, CHILD);
    await continueFromProfile(page);

    await completeVisibleQuestionnairePage(page, "high");
    await saveDraftOnceAndAssert(page, appId);

    const savedDraft = await readScopedDraft(page, appId);
    expect(savedDraft.visaContext).toBe("186");

    const coverage = await completeLinearFlowToSubmit186(page, "high", {
      expectSpouse: true,
      expectChild: true,
      expectNonMigratingSubpages: true,
    });

    expect(coverage.sawSpouseEducation).toBe(false);
    expect(coverage.sawSpouseLanguage).toBe(true);
    expect(coverage.sawAllApplicants).toBe(true);
    expect(coverage.contactBeforeOtherFamily).toBe(true);
    expect(coverage.sawSpouseCitizenship).toBe(true);
    expect(coverage.sawSpouseOtherDirectCopy).toBe(true);
    expect(coverage.sawChildCitizenship).toBe(true);

    await expectCompletionSummary(page, { completed: 30, total: 30, percentage: 100 });
    await submitQuestionnaire(page, appId);
    crashWatcher.assertClean();
  });

  test("186 submit blocks incomplete required answers even when pages are marked complete", async ({ page }) => {
    const appId = "e2e-186-submit-blocked";

    await seed186Application(page, { appId, reference: "E2E-186-BLOCK" });
    await seedTemporaryWorkIncompleteRequiredDraft(page, { appId, visaContext: "186" });

    await page.goto(`/applications/186/${appId}/intake/submit`);
    await expect(page.getByText("Review & Submit")).toBeVisible();

    await page.getByTestId("button-next").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Complete Required Items Before Submitting")).toBeVisible();
    await expect(dialog.getByText(/Birthplace information/)).toBeVisible();
    await expect(dialog.getByText(/Contact phone number/)).toBeVisible();
    await expect(dialog.getByText(/Current employment details/)).toBeVisible();
    await expect(dialog.getByText(/Education history details/)).toBeVisible();
    await expect(dialog.getByText(/Skills assessment details/)).toBeVisible();
    await expect(dialog.getByText(/Non-English main language details/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Submit Anyway/i })).toHaveCount(0);

    const status = await page.evaluate((seededAppId) => {
      const applications = JSON.parse(localStorage.getItem("ply:applications") || "[]");
      return applications.find((app) => app.id === seededAppId)?.status || null;
    }, appId);
    expect(status).not.toBe("submitted");
  });
});

async function completeLinearFlowToSubmit186(page, branch, expectations) {
  const coverage = {
    sawSpouse: false,
    sawChild: false,
    sawOtherFamilyIndex: false,
    sawSpouseEducation: false,
    sawSpouseLanguage: false,
    sawSpouseCitizenship: false,
    sawSpouseOtherDirectCopy: false,
    sawChildCitizenship: false,
    sawResidenceCoverageBlock: false,
    sawResidenceCoverageSuccess: false,
    sawAllApplicants: false,
    sawEmployment: false,
    nonMigratingSubpages: new Set(),
    contactBeforeOtherFamily: false,
  };
  const seenRepeaters = new Set();
  const firstSeen = {
    contactDetails: null,
    otherFamily: null,
  };

  for (let step = 0; step < 90; step += 1) {
    const currentUrl = page.url();
    const currentPath = new URL(currentUrl).pathname;

    const isAppScoped186Route = /^\/applications\/186\//.test(currentPath);
    const isInternalTemporaryWorkRoute = /^\/intake\/temporary-work\//.test(currentPath);

    expect(
      isAppScoped186Route || isInternalTemporaryWorkRoute,
      `Expected app-scoped 186 or internal temporary-work route but got ${currentPath}`
    ).toBe(true);
    expect(currentPath, `Unexpected fallback to 482 route: ${currentPath}`).not.toMatch(/^\/applications\/482\//);

    if (/\/spouse-partner\//.test(currentPath)) {
      coverage.sawSpouse = true;
      await expect(page.locator('a[href*="/spouse-partner/education"]')).toHaveCount(0);
    }
    if (/\/children\/[^/]+\//.test(currentPath)) coverage.sawChild = true;
    if (/\/all-applicants\//.test(currentPath)) coverage.sawAllApplicants = true;
    if (/\/spouse-partner\/details/.test(currentPath)) {
      await expect(page.getByText("Do you hold citizenship in any country other than your country of birth?")).toBeVisible();
      coverage.sawSpouseCitizenship = true;
    }
    if (/\/spouse-partner\/other-details/.test(currentPath)) {
      await expect(page.getByText("Have you ever had or been known by any other Name or Alias, or had a different name spelling?")).toBeVisible();
      await expect(page.getByText("Do you use a Chinese Commercial Code for your name?")).toBeVisible();
      await expect(page.getByText(/Has your Spouse\/Partner|Does your Spouse\/Partner/)).toHaveCount(0);
      coverage.sawSpouseOtherDirectCopy = true;
    }
    if (/\/children\/[^/]+\/details/.test(currentPath)) {
      await expect(page.getByText("Does this child hold citizenship in any country other than their country of birth?")).toBeVisible();
      coverage.sawChildCitizenship = true;
    }
    if (/\/main-applicant\/contact-details/.test(currentPath) && firstSeen.contactDetails === null) {
      firstSeen.contactDetails = step;
    }
    if (/\/non-migrating$/.test(currentPath)) {
      coverage.sawOtherFamilyIndex = true;
      if (firstSeen.otherFamily === null) firstSeen.otherFamily = step;
    }

    const nonMigratingMatch = currentPath.match(/\/non-migrating\/[^/]+\/(details|passport|identity|other-names|citizenship|health)$/);
    if (nonMigratingMatch) {
      coverage.nonMigratingSubpages.add(nonMigratingMatch[1]);
      if (firstSeen.otherFamily === null) firstSeen.otherFamily = step;
    }

    if (/\/spouse-partner\/education/.test(currentPath)) coverage.sawSpouseEducation = true;
    if (/\/spouse-partner\/language/.test(currentPath)) coverage.sawSpouseLanguage = true;
    const isCountriesOfResidence = /\/all-applicants\/countries-of-residence/.test(currentPath);
    if (isCountriesOfResidence && !coverage.sawResidenceCoverageBlock) {
      await expectResidenceCoverageBlocksIncomplete(page);
      coverage.sawResidenceCoverageBlock = true;
    }

    if (/\/main-applicant\/employment/.test(currentPath)) {
      coverage.sawEmployment = true;
      await expect(page.getByText(/last 10 years/i)).toBeVisible();
    }

    if (/\/submit(?:\?|$)/.test(currentUrl)) {
      expect(coverage.sawEmployment).toBe(true);
      expect(coverage.sawResidenceCoverageBlock).toBe(true);
      expect(coverage.sawResidenceCoverageSuccess).toBe(true);
      if (expectations.expectNonMigratingSubpages) {
        expect(coverage.sawOtherFamilyIndex).toBe(true);
        coverage.contactBeforeOtherFamily =
          firstSeen.contactDetails !== null &&
          firstSeen.otherFamily !== null &&
          firstSeen.contactDetails < firstSeen.otherFamily;
        expect(coverage.contactBeforeOtherFamily).toBe(true);
      }

      if (expectations.expectSpouse) expect(coverage.sawSpouse).toBe(true);
      if (!expectations.expectSpouse) expect(coverage.sawSpouse).toBe(false);

      if (expectations.expectChild) expect(coverage.sawChild).toBe(true);
      if (!expectations.expectChild) expect(coverage.sawChild).toBe(false);

      if (expectations.expectNonMigratingSubpages) {
        expect(coverage.nonMigratingSubpages).toEqual(
          new Set(["details", "passport", "identity", "other-names", "citizenship", "health"])
        );
      } else {
        expect(coverage.nonMigratingSubpages.size).toBe(0);
      }

      return coverage;
    }

    await completeVisibleQuestionnairePage(page, branch, seenRepeaters);
    await goNext(page);
    if (isCountriesOfResidence) coverage.sawResidenceCoverageSuccess = true;
  }

  throw new Error(`186 questionnaire did not reach submit page. Last URL: ${page.url()}`);
}

async function expectMainOtherNameDialogWithoutApplicationName(page) {
  await page.getByTestId("radio-other-names-yes").click();
  await page.getByTestId("button-add-other-name").click();
  const dialog = page.getByRole("dialog").last();
  await expect(dialog).toBeVisible();
  await expect(page.getByText("Use this name in the application")).toHaveCount(0);
  await dialog.getByTestId("button-cancel").click();
  await expect(dialog).toBeHidden();
  await page.getByTestId("radio-other-names-no").click();
}
