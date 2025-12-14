# Temporary Work Sidebar Completion Not Ticking

## Issue
- On Temporary Work intake, clicking Continue/Save Draft did not tick the sidebar for many pages.
- Root cause: `markPageComplete` was called without the section key, so the completion check looked for data under a derived key (e.g., `temporary_work_main_applicant_skills`) while the page saved under a shorter key (e.g., `temporary_work_skills`). The “has data” check failed, so the page was never marked complete.

## Fix
- After saving each Temporary Work page, call `markPageComplete(pageKey, null, <exact_saved_section_key>)` to align the completion check with the saved data.
- Updated pages:
  - Main Applicant: details (`temporary_work_details` already aligned), other (`temporary_work_other`), identity (`temporary_work_identity`), employment (`temporary_work_employment`), education (`temporary_work_education`), skills (`temporary_work_skills`), language (`temporary_work_language`).
  - Spouse/Partner: details (`temporary_work_spouse_details`), other-details (`temporary_work_spouse_other`).
  - Children: (`temporary_work_children`).
  - Relationships: (`temporary_work_relationships`).
  - All Applicants: addresses (`temporary_work_addresses`), contact-details (`temporary_work_contact_details`), visas (`temporary_work_visas`), travel-history (`temporary_work_travel`), health (`temporary_work_health`), character (`temporary_work_character`).

## Verification
- After these changes, saving or continuing on each page now sets the sidebar tick because the completion check reads the correct section data.
- No lint issues after updates.



