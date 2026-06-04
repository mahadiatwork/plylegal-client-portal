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
  seed482Application,
  seedTemporaryWorkIncompleteRequiredDraft,
  startQuestionnaire,
  stubExternalQuestionnaireApis,
  submitQuestionnaire,
  watchForClientCrashes,
} from "./support/questionnaireHarness";

const MAIN_APPLICANT = {
  relationshipLabel: "Main Applicant (Nominated Worker)",
  givenNames: "Alex",
  familyName: "Minimal",
  gender: "Male",
};

const SPOUSE = {
  relationshipLabel: "Spouse or De Facto Partner",
  givenNames: "Harper",
  familyName: "Branch",
  gender: "Female",
};

const CHILD = {
  relationshipLabel: "Dependent Child",
  givenNames: "Casey",
  familyName: "Branch",
  gender: "Other",
};

test.describe("482 questionnaire @questionnaire-482", () => {
  test.beforeEach(async ({ page }) => {
    await stubExternalQuestionnaireApis(page);
  });

  test("482 minimal branch saves, goes back, continues linearly, and submits", async ({ page }) => {
    const appId = "e2e-482-minimal";
    const crashWatcher = watchForClientCrashes(page);

    await seed482Application(page, { appId, reference: "E2E-482-MIN" });
    await startQuestionnaire(page, appId);
    await addApplicantProfile(page, MAIN_APPLICANT);
    await continueFromProfile(page);

    await completeVisibleQuestionnairePage(page, "low");
    await saveDraftOnceAndAssert(page, appId);

    const savedDraft = await readScopedDraft(page, appId);
    expect(savedDraft.profiles_data).toBeTruthy();

    await goNext(page);
    await expect(page).toHaveURL(/\/main-applicant\/other/);
    await expectMainOtherNameDialogWithoutApplicationName(page);
    await goPrevious(page);
    await expect(page).toHaveURL(/\/main-applicant\/details/);
    await expect(page.getByTestId("input-family-name")).toHaveValue(MAIN_APPLICANT.familyName);

    await completeLinearFlowToSubmit(page, "low", { expectSpouse: false, expectChild: false });
    await expectCompletionSummary(page, { completed: 15, total: 15, percentage: 100 });
    await submitQuestionnaire(page, appId);

    crashWatcher.assertClean();
  });

  test("482 expanded branch covers spouse and child dynamic pages before submit", async ({ page }) => {
    const appId = "e2e-482-expanded";
    const crashWatcher = watchForClientCrashes(page);

    await seed482Application(page, { appId, reference: "E2E-482-EXP" });
    await startQuestionnaire(page, appId);
    await addApplicantProfile(page, MAIN_APPLICANT);
    await addApplicantProfile(page, SPOUSE);
    await addApplicantProfile(page, CHILD);
    await continueFromProfile(page);

    await completeVisibleQuestionnairePage(page, "high");
    await saveDraftOnceAndAssert(page, appId);

    const routeCoverage = await completeLinearFlowToSubmit(page, "high", {
      expectSpouse: true,
      expectChild: true,
    });
    expect(routeCoverage.sawSpouse).toBe(true);
    expect(routeCoverage.sawChild).toBe(true);
    expect(routeCoverage.sawSpouseCitizenship).toBe(true);
    expect(routeCoverage.sawSpouseOtherDirectCopy).toBe(true);
    expect(routeCoverage.sawChildCitizenship).toBe(true);

    await expectCompletionSummary(page, { completed: 22, total: 22, percentage: 100 });
    await submitQuestionnaire(page, appId);

    crashWatcher.assertClean();
  });

  test("482 submit blocks incomplete required answers even when pages are marked complete", async ({ page }) => {
    const appId = "e2e-482-submit-blocked";

    await seed482Application(page, { appId, reference: "E2E-482-BLOCK" });
    await seedTemporaryWorkIncompleteRequiredDraft(page, { appId, visaContext: "482" });

    await page.goto(`/applications/482/${appId}/intake/submit`);
    await expect(page.getByText("Review & Submit")).toBeVisible();

    await page.getByTestId("button-next").click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Complete Required Items Before Submitting")).toBeVisible();
    await expect(dialog.getByText(/Other names details/)).toBeVisible();
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

async function completeLinearFlowToSubmit(page, branch, { expectSpouse, expectChild }) {
  const coverage = {
    sawSpouse: false,
    sawChild: false,
    sawSpouseCitizenship: false,
    sawSpouseOtherDirectCopy: false,
    sawChildCitizenship: false,
    sawResidenceCoverageBlock: false,
    sawResidenceCoverageSuccess: false,
  };
  const seenRepeaters = new Set();

  for (let step = 0; step < 60; step += 1) {
    const url = page.url();
    coverage.sawSpouse = coverage.sawSpouse || /\/spouse-partner\//.test(url);
    coverage.sawChild = coverage.sawChild || /\/children\/[^/]+\//.test(url);

    if (/\/spouse-partner\/details/.test(url)) {
      await expect(page.getByText("Do you hold citizenship in any country other than your country of birth?")).toBeVisible();
      coverage.sawSpouseCitizenship = true;
    }
    if (/\/spouse-partner\/other-details/.test(url)) {
      await expect(page.getByText("Have you ever had or been known by any other Name or Alias, or had a different name spelling?")).toBeVisible();
      await expect(page.getByText("Do you use a Chinese Commercial Code for your name?")).toBeVisible();
      await expect(page.getByText(/Has your Spouse\/Partner|Does your Spouse\/Partner/)).toHaveCount(0);
      coverage.sawSpouseOtherDirectCopy = true;
    }
    if (/\/children\/[^/]+\/details/.test(url)) {
      await expect(page.getByText("Does this child hold citizenship in any country other than their country of birth?")).toBeVisible();
      coverage.sawChildCitizenship = true;
    }
    const isCountriesOfResidence = /\/all-applicants\/countries-of-residence/.test(url);
    if (isCountriesOfResidence && !coverage.sawResidenceCoverageBlock) {
      await expectResidenceCoverageBlocksIncomplete(page);
      coverage.sawResidenceCoverageBlock = true;
    }

    if (/\/submit(?:\?|$)/.test(url)) {
      if (expectSpouse) expect(coverage.sawSpouse).toBe(true);
      if (expectChild) expect(coverage.sawChild).toBe(true);
      expect(coverage.sawResidenceCoverageBlock).toBe(true);
      expect(coverage.sawResidenceCoverageSuccess).toBe(true);
      return coverage;
    }

    await completeVisibleQuestionnairePage(page, branch, seenRepeaters);
    await goNext(page);
    if (isCountriesOfResidence) coverage.sawResidenceCoverageSuccess = true;
  }

  throw new Error(`Questionnaire did not reach submit page. Last URL: ${page.url()}`);
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
