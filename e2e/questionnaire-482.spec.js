import { test, expect } from "@playwright/test";
import {
  addApplicantProfile,
  completeVisibleQuestionnairePage,
  continueFromProfile,
  goNext,
  goPrevious,
  readScopedDraft,
  saveDraftOnceAndAssert,
  seed482Application,
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
    await goPrevious(page);
    await expect(page).toHaveURL(/\/main-applicant\/details/);
    await expect(page.getByTestId("input-family-name")).toHaveValue(MAIN_APPLICANT.familyName);

    await completeLinearFlowToSubmit(page, "low", { expectSpouse: false, expectChild: false });
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

    await submitQuestionnaire(page, appId);

    crashWatcher.assertClean();
  });
});

async function completeLinearFlowToSubmit(page, branch, { expectSpouse, expectChild }) {
  const coverage = { sawSpouse: false, sawChild: false };
  const seenRepeaters = new Set();

  for (let step = 0; step < 60; step += 1) {
    const url = page.url();
    coverage.sawSpouse = coverage.sawSpouse || /\/spouse-partner\//.test(url);
    coverage.sawChild = coverage.sawChild || /\/children\/[^/]+\//.test(url);

    if (/\/submit(?:\?|$)/.test(url)) {
      if (expectSpouse) expect(coverage.sawSpouse).toBe(true);
      if (expectChild) expect(coverage.sawChild).toBe(true);
      return coverage;
    }

    await completeVisibleQuestionnairePage(page, branch, seenRepeaters);
    await goNext(page);
  }

  throw new Error(`Questionnaire did not reach submit page. Last URL: ${page.url()}`);
}
