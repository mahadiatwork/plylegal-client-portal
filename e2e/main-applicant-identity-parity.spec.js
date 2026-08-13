import { test, expect } from "@playwright/test";
import {
  appScopedKey,
  readScopedDraft,
  seedIntakeApplication,
  stubExternalQuestionnaireApis,
  watchForClientCrashes,
} from "./support/questionnaireHarness";

const MAIN_PROFILE = {
  id: "profile-main",
  relationship: "main_applicant",
  given_names: "Alex",
  family_name: "Minimal",
  gender: "Male",
  birth_day: "1",
  birth_month: "January",
  birth_year: "1990",
};

function draftFor(slug) {
  const base = {
    visaContext: slug === "186" ? "186" : slug === "482" ? "482" : null,
    profiles: [MAIN_PROFILE],
    profiles_data: {},
  };
  if (slug === "820") {
    base.mainApplicant = {
      identity: {
        has_passport: "No",
        identity_docs: [{ doc_type: "Village ID", id_number: "LEG-820", country_of_issue: "Bangladesh", name: "Unknown" }],
      },
    };
  }
  if (slug === "866") {
    base.protection_identity = {
      has_passport: "No",
      identity_documents: [{ document_type: "Village ID", identification_number: "LEG-866", country_of_issue: "Bangladesh", name: "Unknown" }],
    };
  }
  return base;
}

test.describe("main applicant identity parity", () => {
  test.beforeEach(async ({ page }) => {
    await stubExternalQuestionnaireApis(page);
  });

  for (const slug of ["482", "186", "820", "866"]) {
    test(`${slug} uses approved identity structure`, async ({ page }) => {
      const appId = `e2e-identity-${slug}`;
      const crashWatcher = watchForClientCrashes(page);
      await seedIntakeApplication(page, { appId, reference: `E2E-ID-${slug}`, slug, draft: draftFor(slug) });

      await page.goto(`/applications/${slug}/${appId}/intake/main-applicant/identity?profileId=${MAIN_PROFILE.id}`);
      await expect(page.getByText("Main Applicant's Identity", { exact: true })).toBeVisible();

      const ordered = await page.evaluate(() => {
        const labels = [
          "Do you currently hold or have you ever held a Passport or Travel Document?",
          "National Identity Document",
          "Other Identity Documents",
          "Additional Citizenship and Residence Information",
        ];
        return labels.map((label) => {
          const nodes = Array.from(document.querySelectorAll("body *"));
          const node = nodes.find((item) => item.textContent?.trim() === label);
          return node ? nodes.indexOf(node) : -1;
        });
      });

      expect(ordered[0]).toBeGreaterThanOrEqual(0);
      expect(ordered[1]).toBeGreaterThan(ordered[0]);
      expect(ordered[2]).toBeGreaterThan(ordered[1]);

      if (slug === "820" || slug === "866") {
        expect(ordered[3]).toBeGreaterThan(ordered[2]);
        await expect(page.getByText("Are you currently a Citizen of any Country?")).toBeVisible();
        await expect(page.getByText("Imported identity documents need review")).toBeVisible();
      } else {
        await expect(page.getByText("Additional Citizenship and Residence Information")).toHaveCount(0);
        await expect(page.getByText("Are you currently a Citizen of any Country?")).toHaveCount(0);
      }

      await page.getByTestId("button-save").click();
      await expect.poll(async () => {
        const draft = await readScopedDraft(page, appId);
        return draft.profiles_data?.[MAIN_PROFILE.id]?.identity?.has_passport || null;
      }).toBe("no");

      if (slug === "820" || slug === "866") {
        const beforeUrl = page.url();
        await page.getByTestId("button-next").click();
        await expect(page).toHaveURL(beforeUrl);
      }

      const rawDraft = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "{}"), appScopedKey(appId, "draft"));
      if (slug === "820") expect(rawDraft.mainApplicant.identity.identity_docs[0].id_number).toBe("LEG-820");
      if (slug === "866") expect(rawDraft.protection_identity.identity_documents[0].identification_number).toBe("LEG-866");

      crashWatcher.assertClean();
    });
  }
});
