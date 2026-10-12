# Client Questionnaire to Zoho CRM Sync — Implementation Plan

## Objective

Ensure that client-portal questionnaire data is written to the correct Zoho CRM record and field for:

- the primary applicant;
- spouses, children, and other dependants;
- non-migrating family members where a CRM record exists;
- both built-in and administrator-created questionnaire questions.

Firestore remains the questionnaire source of truth. Zoho CRM is a synchronized projection of explicitly mapped answers. A client save must never be reported as CRM-synchronized unless Zoho confirms the write.

## Current behaviour to preserve or replace

The current system has several separate paths:

- Questionnaire answers are saved under `applications/{applicationId}/data/questionnaire`.
- Creating or editing the main applicant profile sends only name, gender, and date of birth to `Contacts`.
- Creating or editing a dependant profile sends only basic identity fields to `Partner_Dependents`.
- Saving questionnaire pages does not invoke CRM synchronization.
- Final submission updates only `Deals.Questionnaires_Status`.
- CRM errors are generally logged but do not create a durable retry or visible failed-sync state.

The implementation must consolidate these paths behind one server-side synchronization service.

## Required decisions before coding

The implementing agent must not guess Zoho API field names or picklist values.

1. Retrieve Zoho field metadata for `Deals`, `Contacts`, and `Partner_Dependents` in the Australian data centre.
2. Produce a reviewed mapping sheet containing:
   - portal question ID and `answerKey`;
   - questionnaire page and profile role;
   - target CRM module;
   - target Zoho field API name;
   - Zoho field type and allowed picklist values;
   - transformation rule;
   - whether an empty portal answer may clear the CRM field.
3. Confirm whether the Primary Applicant panel shown on a Matter is stored directly on `Deals` or populated by a Zoho lookup/workflow from `Contacts`.
4. Confirm the intended destination for answers that have no dedicated CRM field. Do not serialize them into an arbitrary text field. Mark them explicitly as `portal_only`, or create an approved questionnaire-answer related module.

The first mapping set should include at least the Matter fields visible in the supplied CRM screenshot: family name, given name, preferred name, gender, date of birth, country of birth, citizenship, passport number, and passport expiry date.

## Target design

### 1. Mapping stored with each questionnaire question

Extend question metadata with a versioned CRM contract. Use stable IDs and `answerKey`; never use labels as storage or mapping keys.

```json
{
  "metadata": {
    "crm": {
      "mode": "field",
      "target": "matter",
      "module": "Deals",
      "fieldApiName": "CONFIRMED_API_NAME",
      "transform": "text",
      "clearPolicy": "preserve_when_empty",
      "optionMap": {}
    }
  }
}
```

Supported target values:

- `matter`: the application’s `zohoId` in `Deals`;
- `main_contact`: the primary applicant’s `zohoContactId` in `Contacts`;
- `profile_record`: the current spouse/child/other profile’s `zohoDependentId` in `Partner_Dependents`;
- `portal_only`: deliberately not copied to a typed CRM field.

Supported initial transforms:

- `text`;
- `boolean`;
- `picklist` with an explicit option map;
- `date_parts_to_iso`;
- `number`;
- `multiline_text`.

Repeaters and object collections must not be silently flattened. Add a later `related_records` mode only after the child-module field contract and matching key are defined.

### 2. Server-owned synchronization

The browser must not send arbitrary Zoho module names, record IDs, or field API names. The server must load the published questionnaire definition and persisted draft, then resolve all mappings itself.

Create a protected endpoint such as:

`POST /api/intake/crm-sync`

Request shape:

```json
{
  "applicationId": "...",
  "mode": "page",
  "pageId": "...",
  "profileId": "..."
}
```

Also support `mode: "full"` for submission reconciliation and backfill.

The endpoint must:

1. verify the Firebase bearer token using `src/lib/serverAuth.js`;
2. verify that the authenticated client owns or may access the application;
3. load the application, saved questionnaire draft, and exact published definition/revision;
4. resolve the target record from trusted stored IDs;
5. transform and validate mapped values against the approved CRM-field catalog;
6. group updates by module and record ID;
7. perform partial Zoho updates without overwriting unrelated fields;
8. persist a durable result and return a structured per-field summary.

### 3. Durable sync state

Store synchronization state separately from questionnaire answers, for example:

`applications/{applicationId}/crmSync/{jobId}`

Each record should contain:

- application ID, definition ID, and definition revision;
- page ID and profile ID when applicable;
- idempotency key;
- target module and record ID;
- field API names, but not raw sensitive values in logs;
- state: `pending`, `processing`, `succeeded`, or `failed`;
- attempt count, timestamps, and sanitized error details.

Use an idempotency key derived from application, definition revision, page, profile, and a hash of the mapped payload. Retrying the same saved answers must not create duplicate dependant records.

## Step-by-step implementation

### Phase 0 — Repository and framework preflight

1. Work in both repositories:
   - `F:\Work Projects\plylegal-client-portal`
   - `F:\Work Projects\ply-legal-admin-portal`
2. Preserve unrelated working-tree changes.
3. Before modifying Next.js code, read the relevant Next 16 guides under each repository’s `node_modules/next/dist/docs/`, as required by the admin repository instructions.
4. Create a feature branch using the `codex/` prefix.
5. Capture the current behaviour with tests before changing it.

Exit criterion: both repositories build or their pre-existing failures are documented, and the exact Zoho field contract has been recorded.

### Phase 1 — Add a shared mapping contract

Admin portal:

1. Extend `src/lib/questionnaireDefinitions.js` to normalize and validate `question.metadata.crm`.
2. Reject unknown targets, transforms, and unsafe/free-form CRM field names.
3. Validate type compatibility, for example date questions to date fields and Yes/No questions to boolean or mapped picklists.
4. Prevent two questions in the same applicant scope from writing conflicting values to the same CRM destination unless an explicit aggregation rule exists.
5. Preserve mappings through draft save, publish, copy-as-test, page promotion, nested follow-ups, and repeater-field editing.

Client portal:

6. Mirror the mapping validation in `src/lib/questionnaires/validation.js`.
7. Reject an active definition containing an invalid enabled CRM mapping.
8. Add unit fixtures demonstrating mappings for main applicants and dependants.

Tests:

- extend `src/lib/questionnaireDefinitions.test.mjs`;
- extend `test/adminQuestionnaireBuilder.test.mjs`;
- extend `src/lib/questionnaires/__tests__/validation.node.test.js`.

Exit criterion: a published definition can carry a validated CRM mapping without losing it in either portal.

### Phase 2 — Add CRM mapping controls to the admin builder

1. In `src/components/admin/AdminQuestionnaireBuilder.jsx`, add a “CRM synchronization” panel to the selected-question editor.
2. Provide these choices:
   - sync to a CRM field;
   - portal only;
   - not configured.
3. For synchronized questions, require:
   - target record type;
   - Zoho field selected from an approved catalog;
   - transform;
   - empty-value policy;
   - option mapping for picklists.
4. Display the Zoho field label, API name, module, and type.
5. Do not allow an administrator to type arbitrary module or field names.
6. Add a definition-level coverage summary: mapped, portal-only, and unconfigured question counts.
7. Block publishing when a question marked CRM-required is unconfigured or incompatible.

Add an authenticated admin API for the approved catalog. It may read checked-in configuration initially; direct Zoho metadata refresh must remain server-side and admin-only.

Exit criterion: an administrator can safely associate a questionnaire answer with a verified Zoho destination.

### Phase 3 — Build the client-side CRM projection library

Create focused server-side modules, for example:

- `src/lib/crm/questionnaireMapping.js`;
- `src/lib/crm/questionnaireTransforms.js`;
- `src/lib/crm/questionnaireSync.js`.

Implement:

1. Answer resolution by reusing the existing questionnaire storage helpers from `src/lib/questionnaires/answers.js`; do not duplicate profile/shared storage-path rules.
2. Target resolution:
   - `matter` → application `zohoId`;
   - `main_contact` → stored main contact ID;
   - `profile_record` → selected profile’s `zohoDependentId`.
3. If a dependant has no CRM ID, create or deterministically match the `Partner_Dependents` record first, save the returned ID to the profile, then update questionnaire fields.
4. Payload transformation and Zoho-type validation.
5. Explicit clearing rules. The default must preserve an existing CRM value when the portal answer is empty.
6. Batched partial updates grouped by module and record ID.
7. Structured results containing succeeded, skipped, and failed mappings.

Do not log names, passport numbers, dates of birth, or answer values. Log IDs, field API names, state, and correlation IDs only.

Exit criterion: a pure mapping test can turn a saved questionnaire page into the exact expected Zoho update payload without calling Zoho.

### Phase 4 — Implement the authenticated sync endpoint

1. Add `app/api/intake/crm-sync/route.js`.
2. Require Firebase authentication and application ownership.
3. Load all data server-side; ignore any client-supplied module, record ID, field name, or answer value.
4. Implement `page` and `full` modes.
5. Write the durable sync job before calling Zoho and update it after completion.
6. Return non-2xx for authentication, ownership, configuration, or Zoho failures.
7. Replace silent success behaviour in the synchronization path. A missing token, missing CRM record ID, rejected picklist value, or Zoho API error must be visible in the result.
8. Keep the existing profile endpoints temporarily for compatibility, but route their mapping logic through the new service or remove them after all callers migrate.

Exit criterion: API tests prove that one client cannot sync another client’s application and that the browser cannot choose arbitrary Zoho fields.

### Phase 5 — Trigger synchronization after questionnaire saves

1. In `src/components/questionnaire/DynamicQuestionnairePage.jsx`, call page-mode synchronization only after the Firestore save succeeds.
2. Apply the same behaviour to legacy React questionnaire pages that call `saveProfileSectionData` or `saveSectionData` directly. Prefer adding one centralized post-save hook in `draftStore` rather than editing every page independently.
3. Debounce background “Save Draft” syncing, but synchronize immediately on Continue.
4. Show these user states without losing questionnaire data:
   - saved and synchronized;
   - saved, CRM synchronization pending;
   - saved, CRM synchronization failed and will be retried.
5. Never claim “saved successfully” means “CRM synchronized” unless both statuses are known.
6. Keep a retry action available to the client or admin without requiring answers to be re-entered.

Exit criterion: changing a mapped answer updates its CRM field and leaves a durable failure state when Zoho is unavailable.

### Phase 6 — Reconcile all data before final submission

1. In `src/components/intake/TargetVisaSubmitPage.jsx` and `app/intake/temporary-work/submit/page.js`, run `mode: "full"` before marking the application submitted.
2. Full mode must recalculate the CRM projection from the persisted draft rather than trusting prior page-sync status.
3. Block submission when any required mapping fails.
4. Allow explicitly `portal_only` questions to pass without a CRM write.
5. Only after successful reconciliation:
   - mark the application submitted;
   - update `Deals.Questionnaires_Status` to `Submitted`.

Exit criterion: a submitted questionnaire has a successful reconciliation record for the submitted definition revision.

### Phase 7 — Seed mappings for existing questionnaires

1. Build an idempotent migration script that adds approved CRM mappings to existing active and draft questionnaire definitions.
2. Dry-run first and output only definition/page/question IDs and destination field names.
3. Back up affected definitions before writing.
4. Do not modify question IDs, answer keys, routes, or existing answers.
5. Increment definition revisions according to the existing publishing rules.
6. Cover all active questionnaire types, not only subclass 866.

Exit criterion: every active question is classified as mapped, portal-only, or intentionally unsupported; none is silently unclassified.

### Phase 8 — Backfill and reconciliation tooling

1. Add an admin-only “Preview CRM changes” operation for a Matter.
2. Display field names and whether each value would be created, changed, preserved, or skipped; mask sensitive values.
3. Add “Synchronize now” for one Matter.
4. Add a batch script for existing applications with:
   - dry-run by default;
   - application/visa filters;
   - rate limiting;
   - retry with exponential backoff;
   - resumable checkpoints;
   - no overwriting of non-empty CRM values unless the mapping’s conflict policy permits it.

Exit criterion: existing drafts can be reconciled safely without asking clients to reopen every page.

### Phase 9 — Testing matrix

Unit tests:

- each supported transform;
- empty and clear behaviour;
- picklist option mapping;
- shared, main-applicant, spouse, child, and non-migrating scopes;
- incorrect field types and missing target IDs;
- idempotency and duplicate dependant prevention.

API tests:

- unauthenticated request rejected;
- wrong application owner rejected;
- payload cannot override CRM module, field, record ID, or value;
- main applicant writes only to the intended Deal/Contact;
- each dependant writes only to its own `Partner_Dependents` record;
- partial Zoho failure produces durable failed state;
- retry transitions failed to succeeded.

Integration tests with a mocked Zoho client:

- page save → expected payload;
- full reconciliation → grouped payloads;
- submission blocked on failed required mapping;
- submission proceeds after successful retry.

Staging acceptance test using designated Zoho test records:

1. Create one main applicant, spouse, and child.
2. Fill name, DOB, birth country, citizenship, passport details, and one mapped custom admin question for each applicable person.
3. Save each page and verify the exact Zoho record and field.
4. Change a value and verify an update rather than a duplicate record.
5. Clear a value and verify the configured clearing policy.
6. Simulate a Zoho outage, confirm the questionnaire remains saved, and verify retry recovery.
7. Submit and verify the final full reconciliation and status.

Repository checks:

- client: `npm test`, `npm run check`, and `npm run build`;
- admin: targeted `node --test` suites, `npm run lint`, and `npm run build`.

## Rollout

1. Protect the feature with `CRM_QUESTIONNAIRE_SYNC_ENABLED` and a separate dry-run flag.
2. Deploy in dry-run mode and compare generated payloads with the approved mapping sheet.
3. Enable writes only for designated test Matters.
4. Enable subclass 866 after sign-off, then expand visa type by visa type.
5. Monitor sync success rate, failures by field/module, retry age, and unresolved target IDs.
6. Keep a kill switch that stops CRM writes without stopping questionnaire saves.

## Acceptance criteria

The work is complete only when all of the following are true:

- Every active questionnaire question has an explicit CRM handling classification.
- Saving a mapped primary-applicant answer updates the approved Matter or Contact field.
- Saving a mapped dependant answer updates that dependant’s own CRM record.
- Admin-created mapped questions work without client code changes.
- No client request can select arbitrary Zoho targets or fields.
- CRM failures are durable, visible, and retryable.
- Final submission performs a full reconciliation and cannot silently succeed with failed required CRM writes.
- Repeating a sync is idempotent and does not create duplicate dependants.
- Existing questionnaire answers and unrelated CRM fields are preserved.
- Automated tests and a Zoho staging test demonstrate the complete flow.

## Recommended implementation order for an AI agent

Complete one phase at a time and stop for review after Phases 1, 4, 6, and 7. Do not combine schema, admin UI, sync engine, and production backfill in one unreviewed change. Each phase should leave both portals buildable and should include its own tests before proceeding.
