# Questionnaire Page Save Pattern - Implementation Guide

## Overview
This document outlines the standard pattern for implementing the "Save Draft" functionality across all questionnaire pages in the visa portal application. This pattern ensures consistency, proper loading states, and reliable data persistence.

## Common Issues Fixed
1. **Button Text**: Save button should display "Save Draft" not just "Save"
2. **Loading Indicator**: Save button should show a circular progress spinner while saving
3. **Data Persistence**: Form data should properly save to Firebase and load when returning to the page

## Implementation Pattern

### 1. Required Imports

```javascript
import { useState, useEffect } from "react";
import { useSnapshot } from "valtio";
import { draftStore } from "@/stores/draftStore";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { StickyNav } from "@/components/StickyNav";
```

### 2. State Management

Add `isSaving` state to track save progress:

```javascript
const [isSaving, setIsSaving] = useState(false);
const draftSnap = useSnapshot(draftStore);
```

### 3. Form Initialization

Initialize form with default values:

```javascript
const form = useForm({
  resolver: zodResolver(formSchema),
  defaultValues: {
    // All form fields with default values
    field1: "",
    field2: "no",
    field3: [],
    // ... etc
  },
});
```

### 4. Data Loading Pattern

**CRITICAL**: Use `useEffect` with proper dependency on draft data to load saved values:

```javascript
useEffect(() => {
  const savedData = draftSnap.draft?.protection_section_name || {};
  if (Object.keys(savedData).length > 0) {
    // Merge saved data with default values to ensure all fields are set
    const formData = {
      field1: savedData.field1 || "",
      field2: savedData.field2 || "no",
      field3: savedData.field3 || [],
      // ... all fields with fallbacks
    };
    
    // Use reset to properly update all form fields (including Select components)
    form.reset(formData);
  }
}, [draftSnap.draft?.protection_section_name]); // Watch for draft changes
```

**Key Points:**
- Dependency array should watch `draftSnap.draft?.section_name` (not empty array `[]`)
- Use `form.reset()` instead of `form.setValue()` for each field
- Always provide fallback values for all fields
- This ensures Select components properly display saved values

### 5. Save Handler Pattern

Implement `handleSave` with proper error handling and loading state:

```javascript
const handleSave = async () => {
  setIsSaving(true);
  try {
    // Validate form before saving
    const isValid = await form.trigger();
    if (!isValid) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form before saving",
        variant: "destructive",
      });
      return;
    }
    
    const formData = form.getValues();
    console.log("Saving protection_section_name data:", formData); // Debug log
    const result = await draftStore.saveSectionData("protection_section_name", formData);
    
    if (result.success) {
      toast({
        title: "Draft saved",
        description: "Your changes have been saved successfully",
      });
    } else {
      console.error("Save failed:", result.error); // Debug log
      toast({
        title: "Error",
        description: result.error || "Failed to save changes",
        variant: "destructive",
      });
    }
  } catch (error) {
    console.error("Error in handleSave:", error); // Debug log
    toast({
      title: "Error",
      description: error.message || "An unexpected error occurred",
      variant: "destructive",
    });
  } finally {
    setIsSaving(false);
  }
};
```

**Key Points:**
- Always wrap in try/catch/finally
- Set `isSaving` to true at start, false in finally
- Validate form before saving
- Include debug console logs for troubleshooting
- Show appropriate toast messages

### 6. Desktop Save Button

```javascript
<Button
  type="button"
  variant="outline"
  onClick={handleSave}
  disabled={isSaving}
  className="min-h-9"
  data-testid="button-save"
>
  {isSaving ? (
    <>
      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
      Saving...
    </>
  ) : (
    "Save Draft"
  )}
</Button>
```

**Key Points:**
- Button text: "Save Draft" (not "Save")
- Show spinner and "Saving..." when `isSaving` is true
- Disable button during save operation

### 7. Mobile Navigation (StickyNav)

```javascript
<StickyNav
  onPrev={handlePrevious}
  onSave={handleSave}
  onNext={form.handleSubmit(onSubmit)}
  loading={isSaving}
  nextLabel="Continue"
  previousTestId="button-previous-mobile"
  nextTestId="button-continue-mobile"
  saveTestId="button-save-mobile"
/>
```

**Key Points:**
- Use `onPrev` (not `onPrevious`)
- Pass `loading={isSaving}` prop
- StickyNav component handles the spinner automatically

## Section Name Mapping

Different pages use different section names in `draftStore.saveSectionData()`:

| Page | Section Name |
|------|-------------|
| Main Applicant Details | `protection_details` |
| Main Applicant Other | `protection_other` |
| Main Applicant Identity | `protection_identity` |
| Main Applicant Education | `protection_education` |
| Main Applicant Skills | `protection_skills` |
| Main Applicant Language | `protection_language` |
| Spouse/Partner Details | `protection_spouse_details` |
| Spouse/Partner Other | `protection_spouse_other` |
| All Applicants Addresses | `protection_addresses` |
| All Applicants Contact Details | `protection_contact_details` |
| All Applicants Visas | `protection_visas` |
| All Applicants Travel History | `protection_travel_history` |
| All Applicants Future Travel | `protection_future_travel` |
| Employment | `protection_employment` |

## Common Pitfalls to Avoid

1. **Empty dependency array in useEffect**: 
   - ❌ `useEffect(() => {...}, [])` - Only runs once on mount
   - ✅ `useEffect(() => {...}, [draftSnap.draft?.section_name])` - Runs when draft changes

2. **Using form.setValue() for each field**:
   - ❌ `form.setValue("field1", value1); form.setValue("field2", value2);`
   - ✅ `form.reset({ field1: value1, field2: value2 })` - Updates all fields at once

3. **Wrong data source**:
   - ❌ `snapshot?.data?.section_name` or `draft.section_name`
   - ✅ `draftSnap.draft?.section_name` - Correct path to draft data

4. **Missing loading state**:
   - ❌ No `isSaving` state or spinner
   - ✅ Always include loading state and spinner

5. **Button text inconsistency**:
   - ❌ "Save" 
   - ✅ "Save Draft"

6. **StickyNav prop names**:
   - ❌ `onPrevious`
   - ✅ `onPrev`

## Testing Checklist

When implementing or fixing save functionality, verify:

- [ ] Button displays "Save Draft" text
- [ ] Button shows spinner and "Saving..." when clicked
- [ ] Button is disabled during save operation
- [ ] Success toast appears after successful save
- [ ] Error toast appears if save fails
- [ ] Data persists when navigating away and returning
- [ ] Select components display saved values correctly
- [ ] Form validation works before saving
- [ ] Mobile StickyNav shows loading state
- [ ] Console logs appear for debugging

## Example: Complete Implementation

See the following files for reference implementations:
- `app/intake/protection/main-applicant/details/page.js`
- `app/intake/protection/main-applicant/other/page.js`
- `app/intake/protection/main-applicant/identity/page.js`
- `app/intake/protection/main-applicant/education/page.js`

## Related Components

- `src/components/StickyNav.jsx` - Mobile navigation with save button
- `src/stores/draftStore.js` - Draft data management
- `src/lib/adapters/firebase.js` - Firebase persistence layer

## Notes

- The `form.reset()` method is crucial for Select components to display saved values
- Always use `draftSnap.draft?.section_name` pattern for accessing saved data
- The dependency array in useEffect must watch the draft data, not be empty
- Loading state prevents multiple simultaneous save operations
- Debug console logs help troubleshoot save issues in development


