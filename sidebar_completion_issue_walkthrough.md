# Sidebar Completion Status Issue

## Problem Overview

The sidebar in the intake questionnaire incorrectly displays checkmarks for sections that have not been completed. Users see sections marked as "done" even though no data has been entered, leading to confusion.

## Investigation Summary

- The completion status is stored in Firebase under `applications/{appId}/data/completion`.
- The `markPageComplete` function marks a page as complete without validating that any form data was actually saved.
- Stale completion data from previous sessions can persist, causing false checkmarks.
- The `saveCompletionStatus` call uses `{ merge: true }`, which never removes old keys.

## Proposed Fixes

1. **Add Validation** to `markPageComplete` to ensure a section contains meaningful data before marking it complete.
2. **Provide a Clear Method** (`clearCompletionStatus`) to reset completion data for debugging and testing.
3. **Update Form Submissions** to rely on the new validation logic.
4. **Add Debug Logging** in the layout component to monitor completion status.
5. **Optional Reset Button** for users to clear their progress manually.

## Verification Plan

- Manual testing: clear Firebase data, submit a form with valid data, ensure only that section shows a checkmark.
- Automated tests: verify validation prevents empty submissions from being marked complete and that the clear method removes all checkmarks.

## Next Steps

- Implement the validation changes in `draftStore.js`.
- Update the `details/page.js` submission handler.
- Add the reset button UI if desired.
- Run the verification plan.

---

*This walkthrough documents the analysis, proposed changes, and verification steps for fixing the sidebar completion status issue.*
