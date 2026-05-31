# Questionnaire / Matter 186 Testing Plan

## Identifier
- Questionnaire: Employer Nomination subclass 186
- Matter number: 186
- Test tag: `@questionnaire-186`
- E2E entry route: `/applications/186/:appId/questionnaire`
- Intake engine: temporary-work questionnaire with `visaContext: "186"`
- Current scope: second repeatable questionnaire flow using the shared questionnaire runner

## Summary
Build a repeatable Playwright E2E plan for the Employer Nomination subclass 186 questionnaire.

The 186 flow reuses the temporary-work questionnaire pages, but it must run with `visaContext: "186"` so routing, sidebar completion, and submission checks follow the Employer Nomination path instead of the Skills in Demand 482 path.

The harness should run two deterministic passes:
- Minimal branch: main applicant only, low-branch answers, no import, no spouse, no child, no non-migrating family members.
- Expanded branch: main applicant, spouse, child, and one non-migrating family member, high-branch answers, one row in required repeater-style sections.

Together these prove the important 186 behaviours:
- Start questionnaire from `/applications/186/:appId/questionnaire`.
- Preserve the `186` slug and `visaContext: "186"` throughout the flow.
- Complete profile setup.
- Select both sides of binary and conditional options across the two passes.
- Save draft once.
- Continue linearly through the 186 route order.
- Navigate back with Previous.
- Confirm saved values persist after back navigation.
- Reach Review & Submit.
- Submit the application.

## Folder And Naming Convention
Store this plan in:

```text
knowledgebase/Testing plan/questionnaire-186-matter-testing-plan.md
```

Use the same naming pattern for future questionnaire plans:

```text
questionnaire-<matter-number-or-slug>-matter-testing-plan.md
```

## Key Changes
- Add a 186 questionnaire manifest that reuses the existing temporary-work questionnaire runner.
- Seed one draft application with:
  - Slug/subclass: `186`.
  - Visa type: temporary-work.
  - `visaContext: "186"`.
  - Status: `draft`.
- Keep `NEXT_PUBLIC_DATABASE_TYPE=localStorage` for deterministic local runs.
- Reuse the localStorage auth and application fixtures from the 482 harness.
- Ensure the runner can distinguish:
  - `/applications/186/:appId/questionnaire` as the public questionnaire entry route.
  - `/applications/186/:appId/intake/...` as the app-scoped intake route.
  - `/intake/temporary-work/...` as the internal route family.
- Extend route assertions for 186-specific pages:
  - Main applicant Other Family insertion after Contact Details.
  - Spouse Education.
  - Spouse Language.
  - Non-migrating family member subpages.
  - 10-year employment history copy.

## Questionnaire Runner Responsibilities
The shared runner should provide 186-aware helpers for:
- Starting `/applications/186/:appId/questionnaire`.
- Creating the main applicant.
- Creating spouse and child profiles in the expanded branch.
- Adding one non-migrating family member in the expanded branch.
- Filling visible inputs, selects, radios, and checkboxes using existing `data-testid` attributes.
- Filling one row in repeater-style sections where a high-branch answer requires details.
- Clicking `Save Draft` once.
- Navigating forward.
- Clicking Previous.
- Asserting saved values persist.
- Continuing linearly to Review & Submit.
- Submitting the application.
- Clicking `Submit Anyway` only when the application surfaces an unfinished-item confirmation.

## 186 Test Scenarios
### 186 Minimal Branch
Purpose: verify the shortest valid Employer Nomination route path.

Coverage:
- Main applicant only.
- No spouse.
- No child.
- No non-migrating family member.
- No questionnaire import.
- Mostly No or low-branch answers.
- Save Draft once.
- Continue forward.
- Go back with Previous.
- Assert persistence after returning.
- Continue to Review & Submit.
- Submit successfully.

186-specific assertions:
- Entry route is `/applications/186/:appId/questionnaire`.
- The flow does not fall back to 482.
- Draft data stores `visaContext: "186"`.
- Main applicant pages use the temporary-work page family.
- Employment page presents the 186 lookback expectation: last 10 years.
- Spouse-only pages are not reached when no spouse exists.
- Child pages are not reached when no child exists.
- Non-migrating family member subpages are not reached when no member is added.

General assertions:
- No unexpected redirect to login.
- No console crash or page crash.
- Draft data is written.
- Completion status is updated.
- Previous returns to the expected page.
- Application status becomes `submitted`.

### 186 Expanded Branch
Purpose: verify high-branch 186 routing, spouse-specific additions, child routing, and other-family routing.

Coverage:
- Main applicant.
- Spouse.
- Child.
- One non-migrating family member.
- Mostly Yes or high-branch answers.
- Add one row in repeater-style sections where required.
- Save Draft once.
- Continue forward.
- Go back with Previous.
- Assert persistence after returning.
- Continue to Review & Submit.
- Submit successfully.

186-specific assertions:
- Main applicant route order reaches Contact Details before Other Family.
- Other Family index page is reached after main applicant Contact Details.
- Non-migrating family member pages are reached:
  - Details.
  - Passport.
  - Identity Documents.
  - Other Names.
  - Citizenship.
  - Health.
- After Other Family, the flow returns to main applicant Employment, Education, Skills, and Language.
- Employment page uses the 186 10-year history expectation.
- Spouse pages are reached:
  - Details.
  - Other Names.
  - Identity.
  - Education.
  - Language.
- Child pages are reached:
  - Details.
  - Other Names.
  - Identity.
  - Custody.
- All Applicants sections are reached after applicant profile pages.

General assertions:
- No unexpected redirect to login.
- No console crash or page crash.
- Draft data is written.
- Completion status is updated.
- Previous returns to the expected page.
- Application status becomes `submitted`.

## Optional Import Regression
The 186 profile page supports importing from a previous 482 or 186 matter. This should be a separate targeted regression after the base 186 routes are stable.

Coverage:
- Seed a previous submitted 482 or 186 source application.
- Start a new 186 draft application.
- Add the main applicant.
- Select the previous matter as the import source.
- Run the import.
- Verify imported profile/questionnaire data is present.
- Continue and submit the 186 application.

Assertions:
- Import is only available when the target `visaContext` is `186`.
- The imported draft is converted to `visaContext: "186"`.
- Completion and submission checks still use the 186 route list.

## Test Command
Run the focused 186 questionnaire tests with:

```bash
pnpm test:e2e -- --grep @questionnaire-186
```

Run both temporary-work questionnaire suites with:

```bash
pnpm test:e2e -- --grep "@questionnaire-(482|186)"
```

Keep this separate from the broader static verification command:

```bash
pnpm check
```

## Verification Outputs
The E2E setup should provide:
- Playwright HTML report.
- Screenshots on failure.
- Traces on failure.
- Final localStorage application status verification.
- Final localStorage draft verification that `visaContext` remains `186`.

## Assumptions
- "All options" in version 1 means both sides of binary and conditional branches are covered across two deterministic passes.
- Version 1 does not attempt every possible option combination.
- 186 uses the temporary-work questionnaire route family with `visaContext: "186"`.
- 186-specific route coverage must prove it did not silently fall back to the 482 route list.
- Firebase and Zoho are out of scope for the local questionnaire E2E harness.
- Import testing is valuable, but should be separate from the two base deterministic route passes.

## Follow-Up Implementation Notes
- Add a `questionnaire-186` manifest beside the 482 manifest.
- Reuse the 482 runner wherever possible.
- Add only the 186 differences as manifest data:
  - Entry slug.
  - Expected `visaContext`.
  - Required profiles per scenario.
  - Other-family member fixture.
  - Expected route checkpoints.
  - Expected submit/completion keys.
- Keep the fixtures deterministic and isolated per Playwright test.
- Avoid hitting Firebase, Zoho, or real CRM endpoints.
