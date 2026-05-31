# Questionnaire / Matter 482 Testing Plan

## Identifier
- Questionnaire: Skills in Demand subclass 482
- Matter number: 482
- Test tag: `@questionnaire-482`
- E2E entry route: `/applications/482/:appId/questionnaire`
- Current scope: first repeatable questionnaire flow

## Summary
Build and maintain a repeatable Playwright E2E harness for the first questionnaire flow: Skills in Demand subclass 482.

The harness runs two deterministic passes:
- Minimal branch: main applicant only, mostly low-branch answers.
- Expanded branch: main applicant, spouse, and child, mostly high-branch answers.

Together these prove the important questionnaire behaviours:
- Start questionnaire from the application route.
- Complete profile setup.
- Select one side of binary and conditional options in each pass.
- Save draft once.
- Continue linearly through the flow.
- Navigate back with Previous.
- Confirm saved values persist after back navigation.
- Reach Review & Submit.
- Submit the application.

## Folder And Naming Convention
Store questionnaire E2E plans in:

```text
knowledgebase/Testing plan/
```

Use this file naming pattern so plans can be differentiated by questionnaire and matter number:

```text
questionnaire-<matter-number>-matter-testing-plan.md
```

Examples:
- `questionnaire-482-matter-testing-plan.md`
- `questionnaire-186-matter-testing-plan.md`
- `questionnaire-partner-matter-testing-plan.md`
- `questionnaire-protection-matter-testing-plan.md`

Each plan should include the questionnaire name, matter number or slug, test tag, and route pattern at the top.

## Key Changes
- Add Playwright E2E setup with `pnpm test:e2e`.
- Configure Playwright to start `pnpm dev` on port `5000`.
- Force `NEXT_PUBLIC_DATABASE_TYPE=localStorage` for deterministic local runs.
- Bring the localStorage adapter to test parity with app-scoped draft and completion storage.
- Support `saveCompletionStatus` and `loadCompletionStatus` in localStorage mode.
- Add fixtures that seed:
  - Auth state.
  - One 482 draft application.
  - Isolated browser storage.
- Avoid Firebase and Zoho during local E2E runs.

## Questionnaire Runner Responsibilities
The reusable runner should provide helpers for:
- Starting `/applications/482/:appId/questionnaire`.
- Adding the main applicant.
- Adding spouse and child in expanded branch runs.
- Filling visible inputs, selects, radios, and checkboxes using existing `data-testid` attributes.
- Clicking `Save Draft` once.
- Navigating forward.
- Clicking Previous.
- Asserting saved values persist.
- Continuing linearly to Review & Submit.
- Submitting the application.
- Clicking `Submit Anyway` only when the application surfaces an unfinished-item confirmation.

## 482 Test Scenarios
### 482 Minimal Branch
Purpose: verify the shortest dynamic route path.

Coverage:
- Main applicant only.
- Mostly No or low-branch answers.
- Save Draft once.
- Continue forward.
- Go back with Previous.
- Assert persistence after returning.
- Continue to Review & Submit.
- Submit successfully.

Assertions:
- No unexpected redirect to login.
- No console crash or page crash.
- Draft data is written.
- Completion status is updated.
- Previous returns to the expected page.
- Application status becomes `submitted`.

### 482 Expanded Branch
Purpose: verify high-branch conditional pages and dependent routing.

Coverage:
- Main applicant.
- Spouse.
- Child.
- Mostly Yes or high-branch answers.
- Add one row in repeater-style sections where required.
- Save Draft once.
- Continue forward.
- Go back with Previous.
- Assert persistence after returning.
- Continue to Review & Submit.
- Submit successfully.

Assertions:
- No unexpected redirect to login.
- No console crash or page crash.
- Spouse dynamic pages are reached.
- Child dynamic pages are reached.
- Draft data is written.
- Completion status is updated.
- Previous returns to the expected page.
- Application status becomes `submitted`.

## Test Command
Run the focused 482 questionnaire tests with:

```bash
pnpm test:e2e -- --grep @questionnaire-482
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

## Assumptions
- "All options" in version 1 means both sides of binary and conditional branches are covered across two deterministic passes.
- Version 1 does not attempt every possible option combination.
- Tests should run locally and deterministically first.
- Firebase and Zoho are out of scope for the local questionnaire E2E harness.
- 482 is the first questionnaire flow.
- 186, partner, and protection can reuse the same runner by adding new manifests and plan files.

## Follow-Up Expansion
Future questionnaire plans should reuse the same structure and runner:
- 186 questionnaire plan.
- Partner questionnaire plan.
- Protection questionnaire plan.

For each expansion, add:
- Questionnaire or matter number.
- Route pattern.
- Test tag.
- Minimal branch path.
- Expanded branch path.
- Required seeded application shape.
- Unique conditional branches.
- Submission status assertion.
