import { test, expect } from "@playwright/test";
import {
  addApplicantProfile,
  completeVisibleQuestionnairePage,
  continueFromProfile,
  goNext,
  goPrevious,
  readScopedDraft,
  saveDraftOnceAndAssert,
  seed186Application,
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

    expect(coverage.sawSpouseEducation).toBe(true);
    expect(coverage.sawSpouseLanguage).toBe(true);
    expect(coverage.sawAllApplicants).toBe(true);
    expect(coverage.contactBeforeOtherFamily).toBe(true);

    await submitQuestionnaire(page, appId);
    crashWatcher.assertClean();
  });
});

async function completeLinearFlowToSubmit186(page, branch, expectations) {
  const coverage = {
    sawSpouse: false,
    sawChild: false,
    sawOtherFamilyIndex: false,
    sawSpouseEducation: false,
    sawSpouseLanguage: false,
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

    if (/\/spouse-partner\//.test(currentPath)) coverage.sawSpouse = true;
    if (/\/children\/[^/]+\//.test(currentPath)) coverage.sawChild = true;
    if (/\/all-applicants\//.test(currentPath)) coverage.sawAllApplicants = true;
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

    if (/\/main-applicant\/employment/.test(currentPath)) {
      coverage.sawEmployment = true;
      await expect(page.getByText(/last 10 years/i)).toBeVisible();
    }

    if (/\/submit(?:\?|$)/.test(currentUrl)) {
      expect(coverage.sawOtherFamilyIndex).toBe(true);
      expect(coverage.sawEmployment).toBe(true);
      coverage.contactBeforeOtherFamily =
        firstSeen.contactDetails !== null &&
        firstSeen.otherFamily !== null &&
        firstSeen.contactDetails < firstSeen.otherFamily;
      expect(coverage.contactBeforeOtherFamily).toBe(true);

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
  }

  throw new Error(`186 questionnaire did not reach submit page. Last URL: ${page.url()}`);
}
