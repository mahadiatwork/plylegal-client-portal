The reason your data is disappearing on reload, even after clicking "Save Draft," is due to a **synchronization gap** between your Valtio store and the React Hook Form state.

Here is the technical breakdown of why the save is failing and the exact code fixes required.

### 1. The "Default Values" Race Condition

In your `MainApplicantIdentityPage`, you initialize the form with `sectionData` from the store. However, `useForm` only reads `defaultValues` **once** when the component first mounts.

If your application is still fetching the draft from the database when the page loads, `sectionData` is empty at mount time. When the data finally arrives in the store, the form has already "settled" with empty values and doesn't know it needs to update.

### 2. Missing `useEffect` to Sync Data

You destructured `reset` from the form (line 467), but you never called it. You must tell the form to "reset" its internal state whenever the data in your `draftStore` changes or finishes loading.

---

### The Fixes (Add these exactly at these lines)

#### Fix A: Sync Store to Form (Crucial)

**Insert after line 485** (after the `watchedValues` declaration):
This code detects when the background data is finished loading and forces the form to populate.

```javascript
// Sync form with store data once it's loaded from the database
useEffect(() => {
  if (!draftSnap.isLoading && sectionData && Object.keys(sectionData).length > 0) {
    reset({
      citizen_of_country: sectionData.citizen_of_country || "No",
      stateless_explanation: sectionData.stateless_explanation || "",
      ever_been_citizen: sectionData.ever_been_citizen || "",
      citizenships: sectionData.citizenships || [],
      has_passport: sectionData.has_passport || "No",
      passports: sectionData.passports || [],
      has_identity_doc: sectionData.has_identity_doc || "No",
      identity_docs: sectionData.identity_docs || [],
      permanent_residency_rights: sectionData.permanent_residency_rights || "No",
      pr_countries: sectionData.pr_countries || [],
    });
  }
}, [draftSnap.isLoading, sectionData, reset]);

```

#### Fix B: Refine the Auto-Save Logic

**Modify line 508:**
Currently, you are merging `existingData` with `watchedValues`. `watchedValues` (from `useWatch`) can sometimes be "stale" or partially undefined during rapid typing.

**Change lines 507-509 to this:**

```javascript
saveTimeoutRef.current = setTimeout(() => {
  // Use form.getValues() to get the actual current state of all fields
  const currentFormValues = form.getValues();
  const existingData = draftStore.getSectionData('mainApplicant.identity') || {};
  const mergedData = { ...existingData, ...currentFormValues };
  
  draftStore.saveSectionData('mainApplicant.identity', mergedData);
}, 2000);

```

#### Fix C: Validation Blocking the Save

If your `identitySchema` (Zod) has any **required fields** that are currently empty, `form.trigger()` (inside `handleSave`) will return `false`, and the save logic will stop before reaching the store.

Check your `lib/validation.js` for `identitySchema`. If fields like `passport_country` or `citizenships` are required but empty, the "Save Draft" button will do nothing.

* **Recommendation:** Ensure your Zod schema allows `.optional()` or `.nullable()` for draft states so users can save partial progress.

### Summary of Component Refactoring

You asked for other reusable components to clean this up further. To shrink this 800-line file, you should:

1. **Extract Dialog Components:** Move `CitizenshipDialog`, `PassportDialog`, etc., into a folder: `@/components/forms/identity/`.
2. **Reusable Wrapper for Selects:** You have dozens of lines handling `Label`, `Select`, and `Error message`. Create a `ControlledSelect` component to handle this pattern once.
3. **Radio Field Component:** Your Radio Groups repeat the same `RadioGroupItem` + `Label` pattern.

------

The reason your data is failing to save and triggering that red "Validation error" toast is that your **main page form** is likely failing its Zod validation check, even if you think the fields look correct.

Here are the three specific reasons this is happening and the lines you need to change to fix it:

### 1. The "Hidden Fields" Validation Trap

In your `identitySchema` (Zod), fields like `stateless_explanation` are likely marked as required. However, when `citizen_of_country` is "Yes", those fields are hidden from the UI. **Zod still sees them as empty strings/nulls and blocks the save.**

**The Fix:** You must ensure your Zod schema uses `.optional()` or `.nullable()` for conditional fields. Also, you need to trigger validation manually for the specific sub-sections.

### 2. Auto-Save "Stale Data" Issue

**Locate lines 518-522:**

```javascript
saveTimeoutRef.current = setTimeout(() => {
  const currentFormValues = form.getValues();
  const existingData = draftStore.getSectionData('mainApplicant.identity') || {};
  const mergedData = { ...existingData, ...currentFormValues };
  draftStore.saveSectionData('mainApplicant.identity', mergedData);
}, 2000);

```

**The Problem:** `form.getValues()` ignores whether the data is actually valid according to your schema. If you reload, and the store has invalid data, the `useEffect` on line 487 won't be able to "reset" the form correctly.

### 3. Missing `shouldValidate` on Repeater Tables

When you add a Passport or Citizenship via the Dialog, you are calling `form.setValue` (e.g., Line 591). However, you aren't always telling React Hook Form that the *entire array* needs to be re-validated.

---

### Step-by-Step Code Fixes

#### Fix A: Update the `handleSave` Function

**Locate line 560.** Replace the existing `handleSave` with this version which logs the errors to your console so you can see exactly which field is failing:

```javascript
const handleSave = async () => {
  if (!draftSnap.currentApplicationId) return;

  setIsSaving(true);
  try {
    // Trigger validation and check for errors
    const isValid = await form.trigger();
    
    if (!isValid) {
      // DEBUG: This will show you exactly what is stopping the save in the browser console
      console.log("Validation Errors:", form.formState.errors);
      
      toast({
        title: "Validation error",
        description: "Please check the console for specific field errors.",
        variant: "destructive",
      });
      setIsSaving(false);
      return;
    }

    const currentData = form.getValues();
    const result = await draftStore.saveSectionData('mainApplicant.identity', currentData);

    if (result.success) {
      toast({ title: "Draft saved", description: "Progress saved successfully." });
    }
  } catch (error) {
    console.error("Save Error:", error);
  } finally {
    setIsSaving(false);
  }
};

```

#### Fix B: Clean up the Auto-Save Sync

**Locate line 487.** Ensure your `reset` logic isn't accidentally clearing valid data on reload:

```javascript
useEffect(() => {
  // Only reset if we have an ID and aren't loading
  if (!draftSnap.isLoading && sectionData && Object.keys(sectionData).length > 0) {
    // Use 'keepDefaultValues: true' to prevent flickering
    reset(sectionData, { keepDefaultValues: true });
  }
}, [draftSnap.isLoading, sectionData, reset]);

```

#### Fix C: Validation for the "Next" Button

**Locate line 763.** You have `disabledNext={!form.formState.isValid}`.
If your schema is too strict (e.g., requiring 10 digits for a passport but you only typed 5), the "Next" button will stay disabled or trigger the error toast.

**Next Step for Debugging:**
Please open your browser's **Developer Console (F12)**, click "Save Draft" again, and tell me if you see the "Validation Errors" log. It will likely point to a field like `citizenships` or `stateless_explanation` that Zod thinks is missing.