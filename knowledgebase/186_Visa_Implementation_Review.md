# 186 Visa (Employer Nomination Scheme) — Implementation Review

**Scope:** Subclass 186 behaviour implemented under the `temporary-work` intake path, distinguished by `draftStore.visaContext === '186'` and `EMPLOYER_NOMINATION_*` route definitions.  
**Compared to:** Subclass 482 (`visaContext === '482'` or default) using `TEMPORARY_WORK_VISA_ROUTES` and the same page files unless noted.

---

### Summary

**Overall status: Partial — critical gaps**

The codebase contains meaningful 186-specific UI and routing definitions (10-year employment copy, Australia visa-held field, spouse Education + Language in the sidebar, `visaContext` persisted on the draft). However:

1. **There is no implemented 482 → 186 questionnaire import / pre-fill** (requirement 1).
2. **Navigation, progress, and completion math for the 186 flow are not wired to `visaContext`**, so Next/Previous, header progress, and `getCompletionPercentage()` can follow the **482** route list (see Detailed Findings). That undermines the spouse Education/Language steps added for 186.
3. A **likely wrong completion key** is emitted when saving **profile-scoped** spouse identity (see Additional Observations).

Until routing/completion use `visaContext` consistently and 482→186 import exists, the 186 implementation **does not fully satisfy** the stated requirements.

---

### Detailed Findings

#### 1. 482 → 186 Data Import

**Status: ❌ Missing**

**What exists**

- `draftStore` persists `visaContext` (`'482' | '186'`) and restores it from `draft.visaContext` when loading a draft (`src/stores/draftStore.js`).
- Entering the intake from the applications questionnaire sets `visaContext` from the application type and calls `saveDraft({ visaContext }, appId)` (`app/applications/[id]/questionnaire/page.js`).
- Generic user “prefill” preference toggles exist (`shouldPrefill`, `getPrefill` / `setPrefill` on the adapter) — these are **not** a cross-application copy from 482 to 186.

**What is missing**

- No API, store action, or UI flow that:
  - locates a **prior 482 application** (or its draft document in Firebase),
  - **maps** section keys into the 186 application draft,
  - runs on a clear **trigger** (e.g. first open of 186, or explicit “Import from 482”),
  - handles **edge cases** (no 482 app, partial data, conflicting IDs).

**Conclusion:** Requirement **1** is **not implemented**. A new import pipeline and UX are required.

---

#### 2. Education (Main Applicant + Spouse)

**Status: ⚠️ Partial (pages present; 186-specific navigation/completion broken — see §3 routing)**

**Main applicant**

- Route list for 186 includes **Education** under Main Applicant (`EMPLOYER_NOMINATION_ROUTES` in `src/lib/routes.js`).
- Implementation: `app/intake/temporary-work/main-applicant/education/page.js`.
- Persists to `temporary_work_education` via `draftStore.saveSectionData("temporary_work_education", …)` — same storage keys as 482, which is appropriate **per application** (482 and 186 are different `applicationId`s).

**482 baseline**

- `TEMPORARY_WORK_VISA_ROUTES` also lists Main Applicant → Education (`src/lib/routes.js`), so 482 already has a main applicant education section with the same page.

**Spouse / partner**

- For **186 only**, `EMPLOYER_NOMINATION_ROUTES` and `EMPLOYER_NOMINATION_SPOUSE_PROFILE_SUBPAGES` add **Education** (and Language) under Spouse/Partner (`src/lib/routes.js`; sidebar logic in `app/intake/layout.js` when `draftSnap.visaContext === '186'`).
- Implementation: `app/intake/temporary-work/spouse-partner/education/page.js` — rich repeater (institution, qualification, course, dates, etc.), aligned with the main applicant education patterns.

**Field parity**

- Main and spouse education UIs use the same structural approach (repeater + dialog fields) as the rest of the temporary-work stream; **482 main applicant education** is the reference; **482 spouse** does not include education in the **482** route table, but **186** adds spouse education — matching the requirement that **both** are required for 186.

**Gap**

- Because **global route helpers ignore `visaContext`** (see below), users may not reliably reach or complete these pages via **Continue** in order, and completion % may ignore the extra spouse pages.

---

#### 3. Employment (10 years + conditional visa details for Australia)

**Status: ⚠️ Partial**

**Implemented**

- **Copy / UI:** Heading and helper text use **10 years** when `draftSnap.visaContext === '186'`, and **5 years** otherwise (`app/intake/temporary-work/main-applicant/employment/page.js`).
- **Conditional field:** When `visaContext === '186'` and employment row `country === 'Australia'`, a **textarea** is shown for `visa_held` (“What visa(s) were held during this period?”), registered and saved with the employment row (`visa_held` in the dialog schema and defaults).

**Gaps**

- **Validation:** There is no schema or business rule that **enforces** a 10-year window (e.g. by rejecting rows or warning if date ranges do not cover the period). The requirement is communicated in copy only; users can still submit fewer entries.
- **Storage:** Employment history remains a generic array on the draft section; `visa_held` is stored per row when provided — appropriate for the current model.

**Comparison to 482**

- 482 uses the same page; 5-year labelling and no `visa_held` field unless `visaContext === '186'` and Australia — **matches** the intended difference.

---

#### 4. English (Main Applicant + Spouse)

**Status: ✅ Fully implemented at page level / ⚠️ flow still affected by routing bug**

**Main applicant**

- `app/intake/temporary-work/main-applicant/language/page.js`: languages repeater + **EnglishTestDialog** (test type, date, location, reference number, overall score, optional sub-scores).

**Spouse**

- `app/intake/temporary-work/spouse-partner/language/page.js`: same **LanguageDialog** / **EnglishTestDialog** patterns and same zod fields for tests (verified by parallel structure and identical `EnglishTestDialog` schema blocks).
- Supports **Application Profile** flows via `profileId` / `isSpouseProfile` and saves to `temporary_work_spouse_language` or `profiles_data[profileId]` as appropriate.

**186 routing**

- `EMPLOYER_NOMINATION_ROUTES` includes spouse **Language** after Education (see `src/lib/routes.js`).

**Requirement “exactly the same as 482”**

- Main applicant English is the 482 reference; spouse uses the **same dialog field set** for English tests. Any difference is in **titles, save keys, and profile routing**, not in the test field model.

**Remaining issue**

- Same as Education: **next/previous route order** for 186 is not applied if `getNextRoute` / `getPreviousRoute` do not receive `visaContext` (see below).

---

### Additional Observations

**Routing helpers ignore `visaContext`**

- `getAllRoutes(visaType)` calls `getIntakeRoutes(visaType)` **without** a second argument (`src/lib/routes.js`). For `temporary-work`, that always resolves to **482** (`TEMPORARY_WORK_VISA_ROUTES`), not `EMPLOYER_NOMINATION_ROUTES`.
- `getNextRoute`, `getPreviousRoute`, and `calculateProgress` all use `getAllRoutes(visaType)` — so **Continue / Back / header progress bar** follow the **482** sequence, **not** the 186 sequence (which inserts spouse Education + Language before Children).
- **Impact:** From e.g. `spouse-partner/identity`, **Next** goes to the **482** successor (e.g. **Children**), not **spouse-partner/education** as defined in `EMPLOYER_NOMINATION_ROUTES`. The 186 sidebar (`getIntakeRoutes(visaType, draftSnap.visaContext)`) and form buttons disagree.

**Completion percentage ignores `visaContext`**

- `draftStore.getCompletionPercentage()` uses `getIntakeRoutes(visaType)` with **one** argument (`src/stores/draftStore.js`), so totals for `temporary-work` use **482** pages only — **omitting** spouse Education/Language for 186 and skewing **% complete** vs the sidebar.

**Possible completion key bug (spouse identity, profile mode)**

- In `app/intake/temporary-work/spouse-partner/identity/page.js`, when `profileId` is set, `markProfilePageComplete` is called with `` `${visaType}/main-applicant/identity` `` — likely should be **spouse-partner/identity** (and profile suffix). That would break completion tracking for profile-based spouse identity.

**Internal documentation**

- `docs/pylegal-482-questionnaire-audit.md` already notes missing 482→186 import and employer-sponsored 186 intake — consistent with this audit.

---

### Recommended Fixes

1. **482 → 186 import (requirement 1)**  
   - Add a dedicated flow: e.g. `draftStore.importFromApplication(sourceApplicationId, targetApplicationId, options)` or an API route that reads source draft, maps section keys, writes target draft, and sets `visaContext: '186'`.  
   - Expose UI: “Import answers from my Subclass 482 application” with optional field selection and confirmation.

2. **Thread `visaContext` through routing utilities**  
   - Change `getAllRoutes(visaType, visaContext)` (and optionally default `visaContext` for non–temporary-work).  
   - Update `getNextRoute`, `getPreviousRoute`, `calculateProgress` to accept and pass `visaContext`.  
   - Update **all** temporary-work pages that call these functions to pass `draftStore.visaContext` (or `draftSnap.visaContext`).  
   - Update `app/intake/layout.js` progress: `calculateProgress(pathname, visaType, draftSnap.visaContext)`.

3. **Fix `getCompletionPercentage`**  
   - Use `getIntakeRoutes(visaType, this.visaContext)` when `visaType === 'temporary-work'`, and fall back if `visaContext` is null (e.g. infer from `draft.visaContext`).

4. **Employment (optional hardening)**  
   - Add client-side warnings or validation if employment rows do not span the required window (10 vs 5 years), if product owners require enforcement beyond copy.

5. **Fix spouse identity completion key**  
   - Correct `markProfilePageComplete` for spouse identity when `profileId` is present to use the spouse-partner path (and align with `getTemporaryWorkChildProfileCompletionKey`-style patterns if used elsewhere).

6. **Regression tests**  
   - Snapshot or e2e: for `visaContext === '186'`, assert route order includes spouse education → language before children; assert completion % includes those two steps.

---

*Report generated from static analysis of the repository (routing, draft store, intake pages, questionnaire entry). Runtime behaviour should be verified after fixes.*
