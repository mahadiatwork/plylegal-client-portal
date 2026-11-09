import { expect, test } from "@playwright/test";
import { seedIntakeApplication, stubExternalQuestionnaireApis } from "./support/questionnaireHarness";

const PROFILES = [
  { id: "sidebar-main", relationship: "main_applicant", given_names: "Jack", family_name: "Smith" },
  { id: "sidebar-spouse", relationship: "spouse", given_names: "Jill", family_name: "Smith" },
  { id: "sidebar-child", relationship: "child", given_names: "Nubaid", family_name: "Hassan" },
];

test("expanded questionnaire sections remain scrollable", async ({ page }) => {
  await stubExternalQuestionnaireApis(page);
  await page.setViewportSize({ width: 1440, height: 900 });

  const appId = "e2e-sidebar-overflow";
  await seedIntakeApplication(page, {
    appId,
    reference: "E2E-SIDEBAR",
    slug: "482",
    draft: { visaContext: "482", profiles: PROFILES },
  });

  await page.goto(`/applications/482/${appId}/intake/profile`);

  const navigation = page.getByRole("navigation", { name: "Questionnaire Sections" });
  await expect(navigation).toBeVisible({ timeout: 30_000 });

  for (let index = 0; index < 20; index += 1) {
    const collapsedTrigger = navigation.locator('button[aria-expanded="false"]').first();
    if ((await collapsedTrigger.count()) === 0) break;
    await collapsedTrigger.click();
  }

  await expect(navigation.locator('button[aria-expanded="false"]')).toHaveCount(0);

  const metrics = await navigation.evaluate(async (node) => {
    const viewport = node.closest("[data-radix-scroll-area-viewport]");
    const root = viewport?.parentElement;
    const controls = node.querySelectorAll("button");
    const lastControl = controls.item(controls.length - 1);

    if (!viewport || !root || !lastControl) {
      throw new Error("Questionnaire scroll area was not rendered");
    }

    viewport.scrollTop = viewport.scrollHeight;
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const viewportRect = viewport.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    const lastControlRect = lastControl.getBoundingClientRect();
    const visibleBottom = Math.min(viewportRect.bottom, rootRect.bottom);

    return {
      clientHeight: viewport.clientHeight,
      scrollHeight: viewport.scrollHeight,
      scrollTop: viewport.scrollTop,
      lastControlBottom: lastControlRect.bottom,
      visibleBottom,
    };
  });

  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);
  expect(metrics.scrollTop).toBeGreaterThan(0);
  expect(metrics.lastControlBottom).toBeLessThanOrEqual(metrics.visibleBottom + 1);
});
