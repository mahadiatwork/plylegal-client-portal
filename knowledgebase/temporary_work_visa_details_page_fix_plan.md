Here is a structured Markdown document summarizing the issue and the solution. You can use this for your project documentation, pull request description, or team knowledge base.

-----

# Bug Report: Form Data Not Populating in Select Components

## 1. Issue Description

**Symptom:**
When navigating to the "Main Applicant Details" page using internal navigation buttons (Previous/Next), specific form fields (`Select` components for dates and marital status) remained empty, even though the data was clearly present in the server response/JSON viewer.

However, the form **would** populate correctly if the page was manually refreshed (F5).

**Affected Fields:**

  * Date of Birth (Day, Month)
  * Marital Status Date (Day, Month)
  * Marital Status

## 2. Root Cause Analysis

This was a two-part issue involving **Data Normalization** and **React Lifecycle Timing**.

### A. Data Type Mismatch (The "Invisible" Data)

The Backend and the Frontend were speaking slightly different languages regarding data formats.

  * **Database format:** Returned days with leading zeros (e.g., `"07"`) and months as full names (e.g., `"June"`).
  * **Frontend Component:** The ShadCN/Radix `Select` component was built with lists of values that were simple numbers-as-strings (e.g., `"7"`) or indices (e.g., `"6"` for June).
  * **Result:** Because `"07" !== "7"` and `"June" !== "6"`, the Select component considered the value invalid and displayed the placeholder instead.

### B. Race Condition (The Navigation Bug)

When navigating via client-side routing, the component mounted *before* the data fetch was complete.

1.  The `useEffect` ran immediately on mount.
2.  `draftSnap.isLoading` was `true`, causing an early `return`.
3.  When data finished loading, the `useEffect` did **not** run again because `isLoading` was missing from the dependency array.
4.  (On a hard refresh, the data was often hydrated faster or processed differently, masking the issue).

## 3. The Solution

### Step 1: Data Normalization

We implemented helper functions inside the `useEffect` to transform database values into the exact format expected by the `Select` options.

  * **`normalizeNumber`**: Converts `"07"` → `"7"`.
  * **`normalizeMonth`**: Converts `"June"` → `"6"` (and handles numeric strings like `"06"`).

### Step 2: Fixing the Dependency Array

We updated the `useEffect` dependency array to ensure the form population logic runs:

1.  When the loading state changes (`draftSnap.isLoading`).
2.  When the actual data content changes (using `JSON.stringify` to detect deep changes).

## 4. Code Implementation

```javascript
// Inside useEffect
const savedData = draftSnap.draft?.temporary_work_details;

if (savedData && Object.keys(savedData).length > 0) {
  
  // --- NORMALIZATION HELPERS ---
  const monthsList = ["January", "February", "March", "April", "May", "June",
                      "July", "August", "September", "October", "November", "December"];

  // Fixes "07" vs "7" mismatch
  const normalizeNumber = (val) => {
    if (!val) return "";
    const num = Number(val);
    return isNaN(num) ? val : String(num); 
  };

  // Fixes "June" vs "6" mismatch
  const normalizeMonth = (val) => {
    if (!val) return "";
    if (!isNaN(Number(val))) return String(Number(val));
    
    const monthIndex = monthsList.findIndex(m => m.toLowerCase() === String(val).toLowerCase());
    return monthIndex !== -1 ? String(monthIndex + 1) : val;
  };

  const safeStr = (val) => (val === null || val === undefined) ? "" : String(val);

  // Apply normalization when resetting form
  const formData = {
    // ... other fields
    birth_day: normalizeNumber(savedData.birth_day),     // "07" -> "7"
    birth_month: normalizeMonth(savedData.birth_month),  // "June" -> "6"
    // ...
  };

  form.reset(formData);
}

// --- DEPENDENCY FIX ---
// Runs when loading finishes OR when data content changes
}, [draftSnap.isLoading, JSON.stringify(draftSnap.draft?.temporary_work_details)]);
```

## 5. Summary

To prevent this in the future:

1.  **Check Value Equality:** Ensure `Select` value props strictly match the `value` in the `<SelectItem />`. `"01"` is not the same as `"1"`.
2.  **Watch Async Data:** If a `useEffect` depends on external data loading, ensure the `isLoading` flag is a dependency.