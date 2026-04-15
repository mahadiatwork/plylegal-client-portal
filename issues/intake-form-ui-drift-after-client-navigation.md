# Intake questionnaire: reliable client state, save-then-update semantics, and navigation hydration

## Type

Epic / Bug — **Questionnaire state model** + **client-side navigation / form hydration**

## Priority

High — Users see empty or inconsistent fields despite data in the database; the experience must feel **authoritative** and **trustworthy** end-to-end.

---

## Product & architecture goals

### Context when starting a questionnaire

When a user **starts** (or resumes) a questionnaire for an application, the app should:

1. **Load** the latest persisted application draft from the database (or empty shape for a new flow).
2. **Hold** that data in a single, well-defined **client state** that represents “what the server last confirmed” for this application.
3. Keep that state **consistent** with what we show in the UI: **no phantom values** in the UI that were never saved, and **no missing values** in the UI when the database has them.

The goal is **one coherent mental model**: the questionnaire’s “truth” is whatever has been successfully persisted; the UI is a faithful projection of that truth, plus **optimistic local editing** only where we explicitly allow it—and even then, failed saves must not silently diverge.

### How changes should work (save-first, then state)

For any change that should survive navigation or refresh:

1. **Persist first** — Write to the database (via the existing draft adapter) and **wait for success**.
2. **Update state second** — Only after a successful save, update the global questionnaire state (`draftStore`) so it matches what was written.
3. **On failure** — If the database save fails:
   - **Do not** update the global state for that mutation.
   - **Do not** leave the UI showing a value that was not saved (revert the field / form to the last known-good values from state, or keep the previous control values).
   - **Show a clear error** to the user, e.g. that **the field or section could not be saved** (and optionally retry).

This closes the gap where the UI “looks” updated but the backing store did not change—or the opposite, where the DB has data but the UI did not re-hydrate.

### Relation to the current bug (Previous / Continue)

The observed behaviour (empty **Date of Birth** / **Marital Status** after **Previous** then return, while other fields still show, refresh fixes it) is a **symptom** of state/UI getting out of sync with persisted data during **client-side navigation**. Fixing hydration alone is not enough if we do not also enforce **clear boundaries** between:

- **Server-confirmed draft** (after successful save / load),
- **Local form editing** (React Hook Form),
- **When** each layer is allowed to overwrite the other.

The direction above should guide refactors so the whole intake—not only one page—behaves predictably.

---

## Summary (concrete bug)

After saving intake data and using **Previous** to leave a section, then **Continue** (or equivalent) to return, some fields render empty or show placeholders (e.g. Date of Birth dropdowns, Marital Status) while other fields on the same screen remain populated (e.g. names, Country of Birth, city/state). A **full browser refresh** often restores the correct values, indicating persisted data is present but **client-side re-hydration** is unreliable.

## Affected area (observed)

- **Route:** `/intake/temporary-work/spouse-partner/details`
- **Query params:** `profileId`, `applicationId` (per-profile questionnaire)
- **Symptoms:** Personal Information block (DOB selects, marital status) empty; Birthplace / other fields may still show values—inconsistent within one form.

The same class of issue may affect other per-profile pages that combine **React Hook Form**, **Radix Select**, and **Valtio**-driven hydration from `draftStore`.

## Steps to reproduce

1. Open an application with a spouse profile (e.g. Skills in Demand / `temporary-work` flow).
2. Navigate to **Applicant 2 (Spouse/Partner) → Details**.
3. Fill or confirm fields including **Date of Birth**, **Marital Status**, and **Birthplace**; **Save Draft** if applicable.
4. Click **Previous** to navigate away.
5. Click **Continue** (or navigate back via sidebar) to the same Details page.
6. Observe: some fields appear empty or at placeholder state despite data existing after **hard refresh**.

## Expected behaviour

- All fields on the page reflect the **same** persisted draft after every visit, including client-side navigation **without** a full reload.
- Values align with **Application Profile** roster rules where applicable and with **`profiles_data`** for section-specific answers.
- **Future / target:** Any persisted edit follows **save success → state update → UI reflects state**; failed saves **do not** update state or the visible field, and the user sees an **error that the data was not saved**.

## Actual behaviour

UI shows **partial** hydration: text inputs and some selects may show data; other **Radix Select**-backed fields (DOB day/month/year, marital status) may not display saved values until refresh.

## Environment

- **App:** PlyLegal Client Portal (this repo)
- **Dev:** `localhost:5000` (Next.js `next dev -p 5000`)
- **Persistence:** Draft stored through **`getAdapter()`** (e.g. Firebase or localStorage) — see `src/lib/adapters` and `src/stores/draftStore.js`; per-profile sections under `draft.profiles_data[profileId][section]`.

---

## Technologies used for context / state (current stack)

These are the main pieces involved in questionnaire data and UI today:

| Technology | Role in this app |
|------------|------------------|
| **Next.js** (App Router) | Routing, `app/intake/**` pages, client components for forms |
| **React** (`useState`, `useEffect`, `useMemo`) | Local component lifecycle, effects for hydration from store |
| **Valtio** (`proxy`, `useSnapshot`) | Global **`draftStore`** — reactive proxy holding `draft`, `completionStatus`, `currentApplicationId`, loading/saving flags, etc. |
| **React Hook Form** | Per-page form state, `register`, `control`, `reset`, `getValues` |
| **Zod** (+ `@hookform/resolvers`) | Schema validation for form payloads where used |
| **Radix UI** (`@radix-ui/react-select`, etc.) | Accessible **Select** and other controls; controlled values must stay in sync with `reset` / DB |
| **Database adapter** (`getAdapter()` in `src/lib/adapters`) | **`loadDraft` / `saveDraft`** (and completion status) — actual persistence backing the store |

**Note:** “Context” in the React sense (e.g. `React.createContext`) is **not** the primary pattern for draft data here; **Valtio’s `draftStore`** plus **RHF local form state** are the two layers that must be kept aligned with the database according to the rules above.

---

## Technical context (project structure)

| Area | Location / notes |
|------|------------------|
| Spouse Details page | `app/intake/temporary-work/spouse-partner/details/page.js` — RHF, `reset`, `Controller` for country `Select`, `detailsHydrationKey` + `buildSpouseDetailsFormValues` |
| Intake layout / nav | `app/intake/layout.js` — `profileId` / `applicationId` in URLs |
| Query param normalization | `src/lib/intakeQueryParams.js` — `profileId` vs `profileid`, `applicationId` vs `applicationid` |
| Draft store | `src/stores/draftStore.js` — `profiles`, `profiles_data[profileId][section]`, `loadDraft` / `saveProfileSectionData` |
| Reference pattern (hydration) | `app/intake/temporary-work/main-applicant/contact-details/page.js` — stable hydration key, `reset(..., { keepDefaultValues: false, keepDirtyValues: false })`, `Controller` + remount `key` on problematic `Select` components |

### Suspected contributing factors (current bug)

1. **Dual sources:** `draft.profiles` (roster) vs `draft.profiles_data[profileId].details` (section answers); merge and hydration must be deterministic on every mount.
2. **Radix Select + RHF:** Controlled `Select` components may not re-sync after `reset` without a remount `key` or equivalent; DOB uses multiple `Select`s with string conventions (day `1`–`31`, month `1`–`12`).
3. **Loading gate:** Hydration while `draftStore.isLoading` is true may leave empty defaults visible.
4. **Valtio + effect deps:** Nested `profiles_data` updates must reliably trigger re-hydration where intended.

---

## Acceptance criteria

### Hydration / navigation (current bug)

- [ ] After **Previous → back** to Spouse Details, **all** saved fields (including DOB and marital status) display without requiring refresh.
- [ ] Values remain consistent with **Application Profile** for roster-backed identity fields and with persisted `profiles_data` for section-specific answers.
- [ ] No regression on **Save Draft** / **Continue** persistence.

### State model (target direction)

- [ ] Questionnaire state after load matches **last successful** `loadDraft` / save response for that application.
- [ ] User-visible mutations that must persist follow **save success → update `draftStore` → UI reflects store** (or explicit optimistic UI with documented rollback).
- [ ] On save failure: **state unchanged**, **UI reverted or unchanged** relative to last good data, and **user sees an error** that the field/section was not saved.
- [ ] Optional: E2E or manual QA script covering navigation loop + simulated save failure.

## Related work (already in codebase)

- Spouse Details hydration refactor (`reset`-based, `detailsHydrationKey`, country `Select` `key`).
- Roster identity overlay so names/gender/DOB align with `draft.profiles` where implemented.

## Labels (suggested)

`bug`, `intake`, `architecture`, `state-management`, `valtio`, `react-hook-form`, `hydration`, `temporary-work`

---

*Update this file when the issue is resolved, narrowed to a single PR, or superseded by a formal epic.*
