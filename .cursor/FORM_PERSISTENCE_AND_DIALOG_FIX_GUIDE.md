# Form Persistence and Dialog Fix Guide

This guide documents the solutions applied to `IdentityPage` and `EmploymentPage` to fix data loss (persistence) and auto-redirect issues. Apply these patterns to other application form pages.

## 1. Fix Data Persistence (Rehydration)

**Problem:** Data entered in the form is lost when navigating away and coming back.
**Cause:** The form is not reloading (rehydrating) the saved data from the store when the component mounts or when the store updates.

**Solution:**
Add a `useEffect` hook to your page component that listens for changes in the specific store section.

```javascript
// Example for Employment Page
const draftSnap = useSnapshot(draftStore);
const draft = draftSnap.draft;

// ... form definition ...

// ADD THIS EFFECT
useEffect(() => {
  // 1. Get the specific section data from the draft
  const savedData = draft.temporary_work_employment || {};
  
  // 2. Check if data exists
  if (Object.keys(savedData).length > 0) {
    // 3. Reset the form with saved data
    form.reset(savedData);
  }
}, [draft.temporary_work_employment, form]); // <--- CRITICAL: Add dependencies!
```

**Key Points:**
*   Ensure you access `draftSnap.draft.section_name` (not `snap.data`).
*   **Crucial:** Include the store data slice (e.g., `draft.temporary_work_employment`) and `form` in the dependency array. If you leave it as `[]`, it will only run once and might miss the data if it loads asynchronously.

---

## 2. Fix Array/Repeater Persistence

**Problem:** Items added to a list (RepeaterTable) are not saved or disappear.
**Cause:** `react-hook-form` does not automatically detect changes made via `setValue` for arrays unless explicitly told to dirty/touch the field.

**Solution:**
Update the `onAdd`, `onEdit`, and `onDelete` handlers in your `RepeaterTable` to include the validation options.

```javascript
<RepeaterTable
  // ...
  onAdd={(newRow) => {
    const updated = [...list, newRow];
    // ADD OPTIONS OBJECT AS 3RD ARGUMENT
    form.setValue("fieldName", updated, { 
      shouldValidate: true, 
      shouldDirty: true, 
      shouldTouch: true 
    });
  }}
  onEdit={(index, updatedRow) => {
    const updated = [...list];
    updated[index] = updatedRow;
    // ADD OPTIONS OBJECT
    form.setValue("fieldName", updated, { 
      shouldValidate: true, 
      shouldDirty: true, 
      shouldTouch: true 
    });
  }}
  onDelete={(index) => {
    const updated = list.filter((_, i) => i !== index);
    // ADD OPTIONS OBJECT
    form.setValue("fieldName", updated, { 
      shouldValidate: true, 
      shouldDirty: true, 
      shouldTouch: true 
    });
  }}
  // ...
/>
```

---

## 3. Fix Dialog Auto-Redirect (Loop)

**Problem:** Clicking "Ok" or "Add" in a dialog submits the *main page form* and redirects the user to the next page.
**Cause:** Buttons inside a form default to `type="submit"`. If your Dialog is rendered inside the main `<form>`, the Dialog's submit button triggers the parent form's submission.

**Solution:**
1.  **Remove any `<form>` tags** from inside your Dialog component. Use `<div>` instead.
2.  Change the "Ok" / "Save" button to `type="button"`.
3.  Manually trigger the handle submit logic using `onClick`.

**Before (Broken):**
```jsx
function MyDialog({ onSave }) {
  // ...
  return (
    <form onSubmit={dialogForm.handleSubmit(onSave)}> {/* NESTED FORM BAD */}
      {/* ... */}
      <Button type="submit">Ok</Button> {/* TRIGGERS PARENT FORM */}
    </form>
  )
}
```

**After (Fixed):**
```jsx
function MyDialog({ onSave }) {
  // ...
  const handleSubmit = (data) => {
    onSave(data);
    dialogForm.reset();
  };

  return (
    <div className="space-y-4"> {/* USE DIV INSTEAD OF FORM */}
      {/* ... inputs ... */}
      
      <DialogFooter>
        <Button onClick={onCancel}>Cancel</Button>
        
        {/* TYPE="BUTTON" + ONCLICK HANDLER */}
        <Button 
          type="button" 
          onClick={dialogForm.handleSubmit(handleSubmit)}
        >
          Ok
        </Button>
      </DialogFooter>
    </div>
  )
}
```
