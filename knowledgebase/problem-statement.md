# Intake Form UI Drift — Problem Statement & Solution Report

## Related Issue
[intake-form-ui-drift-after-client-navigation.md](../intake-form-ui-drift-after-client-navigation.md)

---

## Problem Summary

After saving intake data and using **Previous** to navigate away, then **Continue** to return, some fields appear empty or show placeholders (Date of Birth dropdowns, Marital Status) while other fields on the same page remain populated. A full browser refresh restores the correct values, proving the data is persisted but **client-side re-hydration** is unreliable.

### Scope (initially fixed for `temporary-work`)

| Route | Status |
|-------|--------|
| `spouse-partner/details` | ✅ Fixed — reference implementation |
| `draftStore.saveProfileSectionData` | ✅ Fixed — save-first semantics |
| `draftStore.saveSectionData` | ✅ Fixed — save-first semantics |

---

## Root Causes Identified

### 1. Radix Select does not re-sync after `reset()` (PRIMARY CAUSE)

**What happens:** Radix UI `<Select>` caches its display value internally on mount. When React Hook Form's `reset()` changes the underlying `value` prop, Radix does **not** re-render to reflect the new value. The trigger continues showing the placeholder or old value even though `getValues()` returns the correct data.

**Why text inputs work:** Native `<input>` elements respond to value prop changes immediately. Radix Select uses internal state and requires a fresh mount.

**Evidence:** `country_of_birth` (wrapped in `Controller` with a `key` prop) always worked. `birth_day`, `birth_month`, `birth_year`, and `marital_status` (using bare `watch()` + `setValue()`) failed.

### 2. Optimistic state update before save confirmation

**What happens:** `saveProfileSectionData` and `saveSectionData` updated `this.draft` (the global state) **before** `db.saveDraft()` resolved. If the save failed, the UI showed values that were never persisted. On next navigation, `loadDraft()` returns the old data but `this.draft` already has the new (unsaved) values — or vice versa.

**Pattern violation:** The issue doc specifies "save success → update state → UI reflects state". The code was doing "update state → attempt save → maybe fail silently".

### 3. Missing `isLoading` gate on hydration effects

**What happens:** Some pages (education, language, employment) run their hydration `useEffect` before `loadDraft()` completes. The effect sees `draftSnap.draft` as empty `{}` and calls `form.reset({})`, wiping any previously valid values. When `loadDraft()` resolves, the effect may or may not re-run depending on dependency tracking.

### 4. Inconsistent `profileId` extraction

**What happens:** Some pages use `searchParams.get('profileId')` directly while others use the normalized `getProfileIdFromSearchParams(searchParams)`. URLs with `profileid` (lowercase) would fail on the direct `.get()` pages, leading to fallback to legacy data paths or `null` profile context.

### 5. Hydration effect dependencies too broad or too narrow

**What happens:** Some pages depend on `draftSnap.draft?.profiles_data` (the entire profiles_data object) which triggers on **any** profile or section change across the whole application. Others depend on specific keys like `draftSnap.draft?.temporary_work_education` which may not trigger when profile-scoped data changes.

---

## Solution Applied

### Fix 1: Save-First Semantics in `draftStore.js`

Both `saveProfileSectionData` and `saveSectionData` now:
1. Build a **candidate draft** via deep clone
2. Call `db.saveDraft(candidateDraft, appId)` 
3. **Only if successful**: set `this.draft = candidateDraft`
4. **On failure**: leave `this.draft` unchanged (last-known-good state)

```diff
// BEFORE (saveProfileSectionData)
- const newDraft = JSON.parse(JSON.stringify(this.draft));
- newDraft.profiles_data[profileId][section] = data;
- this.draft = newDraft;                    // ← STATE UPDATED BEFORE SAVE
- const result = await db.saveDraft(this.draft, appId);

// AFTER
+ const candidateDraft = JSON.parse(JSON.stringify(this.draft));
+ candidateDraft.profiles_data[profileId][section] = data;
+ const result = await db.saveDraft(candidateDraft, appId); // ← PERSIST FIRST
+ if (result.success) {
+   this.draft = candidateDraft;            // ← STATE UPDATED ONLY ON SUCCESS
+ }
```

### Fix 2: Controller + Remount Key for all Radix Selects

Every `<Select>` backed by Radix is now wrapped in a `<Controller>` and given a `key` prop that includes a `hydrationEpoch` counter:

```jsx
const [hydrationEpoch, setHydrationEpoch] = useState(0);

// In hydration effect, after reset:
setHydrationEpoch((e) => e + 1);

// In JSX:
<Controller
  control={control}
  name="birth_day"
  render={({ field }) => (
    <Select
      key={`bd-${hydrationEpoch}-${field.value}`}
      value={field.value || ""}
      onValueChange={field.onChange}
    >
      ...
    </Select>
  )}
/>
```

**Why this works:**
- `Controller` ensures RHF's `reset()` propagates to the render function
- The `key` change forces React to unmount/remount the Radix Select, clearing its stale internal state
- `field.value` in the key ensures React creates a fresh instance when the value changes externally

### Fix 3: Stable Hydration Key + isLoading Gate

```js
const detailsHydrationKey = useMemo(() => {
  const slice = isSpouseProfile && profileId
    ? draftSnap.draft?.profiles_data?.[profileId]?.details ?? {}
    : draftSnap.draft?.temporary_work_spouse_details ?? {};
  return `${profileId ?? ""}|${String(isSpouseProfile)}|${JSON.stringify(slice)}|${spouseProfileDobSig}|${rosterIdentitySig}`;
}, [profileId, isSpouseProfile, draftSnap.draft, spouseProfileDobSig, rosterIdentitySig]);

useEffect(() => {
  if (draftSnap.isLoading) return;  // ← LOADING GATE
  const values = buildSpouseDetailsFormValues(...);
  if (values) {
    reset(values, { keepDefaultValues: false, keepDirtyValues: false });
    setHydrationEpoch((e) => e + 1);  // ← REMOUNT TRIGGER
  }
}, [detailsHydrationKey, draftSnap.isLoading, reset]);
```

---

## Replication Guide for Other Visa Types

To apply the same fix pattern to any other intake page:

### Checklist per page

- [ ] **Use `getProfileIdFromSearchParams`** (from `@/lib/intakeQueryParams`) — not `searchParams.get('profileId')`
- [ ] **Add `isLoading` gate** as the first line of the hydration `useEffect`
- [ ] **Wrap every `<Select>` in `<Controller>`** with a `key` that includes `hydrationEpoch` and `field.value`
- [ ] **Bump `hydrationEpoch`** after `reset()` in the hydration effect
- [ ] **Use `reset(values, { keepDefaultValues: false, keepDirtyValues: false })`** — never `keepDirtyValues: true`
- [ ] **Compute a stable `hydrationKey`** using `useMemo` that serializes only the relevant data slice + identity signals
- [ ] **Dependencies for hydration effect**: use `[hydrationKey, draftSnap.isLoading, reset]` — NOT `draftSnap.draft` directly

### Template for a hydration effect

```js
const [hydrationEpoch, setHydrationEpoch] = useState(0);

const hydrationKey = useMemo(() => {
  const slice = profileId
    ? draftSnap.draft?.profiles_data?.[profileId]?.YOUR_SECTION ?? {}
    : draftSnap.draft?.temporary_work_YOUR_SECTION ?? {};
  return `${profileId ?? ""}|${JSON.stringify(slice)}`;
}, [profileId, draftSnap.draft]);

useEffect(() => {
  if (draftSnap.isLoading) return;
  const savedData = profileId
    ? draftSnap.draft?.profiles_data?.[profileId]?.YOUR_SECTION || {}
    : draftSnap.draft?.temporary_work_YOUR_SECTION || {};
  if (Object.keys(savedData).length > 0) {
    form.reset(savedData, { keepDefaultValues: false, keepDirtyValues: false });
    setHydrationEpoch((e) => e + 1);
  }
}, [hydrationKey, draftSnap.isLoading, form.reset]);
```

### Pages requiring this treatment (temporary-work)

| Page | Has `isLoading` gate | Uses `Controller` for Selects | Uses normalized `profileId` |
|------|---------------------|-------------------------------|----------------------------|
| `main-applicant/details` | ❌ (uses `isSavingRef`) | ❌ bare `watch+setValue` | ✅ |
| `main-applicant/contact-details` | ✅ | ✅ (for country only) | ❌ (direct `.get()`) |
| `main-applicant/education` | ❌ | N/A (dialog Selects) | ❌ |
| `main-applicant/employment` | ❌ | N/A (dialog Selects) | ❌ |
| `main-applicant/language` | ❌ | N/A (dialog Selects) | ❌ |
| `main-applicant/identity` | ❌ | Partial | ❌ |
| `main-applicant/other` | ❌ | Partial | ❌ |
| `main-applicant/skills` | TBD | TBD | TBD |
| `spouse-partner/details` | ✅ **FIXED** | ✅ **FIXED** | ✅ **FIXED** |
| `spouse-partner/identity` | ❌ | Partial | ❌ |
| `spouse-partner/education` | TBD | TBD | TBD |
| `spouse-partner/language` | TBD | TBD | TBD |
| `spouse-partner/other-details` | TBD | TBD | TBD |

---

## Files Changed

| File | Change |
|------|--------|
| `src/stores/draftStore.js` | `saveProfileSectionData` + `saveSectionData` → save-first semantics |
| `app/intake/temporary-work/spouse-partner/details/page.js` | Full hydration fix — reference implementation |

---

## Validation

After applying the fix, the following should hold true:

1. Navigate to Spouse Details, fill DOB + Marital Status, click Save Draft
2. Click **Previous**
3. Click **Continue** to return
4. **All fields** (including DOB selects and Marital Status) display their saved values without requiring a browser refresh
5. Repeat for multiple back/forward navigations — values stay consistent
6. Close and reopen the application — values match what was saved

---

*Created: 2026-04-15 | Related to: intake-form-ui-drift-after-client-navigation*
