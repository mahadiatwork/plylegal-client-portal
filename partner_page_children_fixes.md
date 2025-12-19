Please refactor the ChildrenStartPage component to fix a critical data location mismatch and race conditions.

1. Fix Data Retrieval (Primary Issue)
The current code only looks for data in draftStore.getSectionData('children.details'), which is returning an empty array.

The Problem: According to the database JSON, the actual existing children data is stored in mainApplicant.family.children.

The Fix: Update the data loading logic to implement a fallback strategy.

Load children.details first.

If that is empty, fetch draftStore.getSectionData('mainApplicant.family').

Initialize the form's defaultValues using mainApplicant.family.children if children.details is empty. Do the same for has_children_joint.

2. Fix the "Reset Loop" Bug
Modify the useEffect that handles form resets (around line 252).

Current Behavior: It resets the form every time the store updates, which wipes out user input while they are typing if an auto-save triggers.

Required Change: Add a check for !form.formState.isDirty. Only call reset() if the form is clean (not dirty) or if it is the initial load. This ensures we don't overwrite unsaved user changes with stale server data.

3. Fix Save Race Conditions
In handleAddChild, handleEditChild, and handleDeleteChild:

The Problem: These functions trigger a manual save and update the form state. The form state update triggers the useWatch auto-save hook, causing a second save to fire 2 seconds later, often overwriting the first one.

The Fix: Explicitly call clearTimeout(saveTimeoutRef.current) at the very beginning of all three functions to cancel any pending auto-saves before processing the manual action.

4. Safety Checks
Ensure the auto-save useEffect logs a warning instead of silently failing if currentApplicationId is missing.

Ensure handleSave logs form.formState.errors to the console if validation fails.