# 866 and 820 questionnaire alignment — implementation

**Date:** 8 September 2026  
**Reference:** the current repository implementation of the client-approved 482 and 186 questionnaires.  
**Scope:** equivalent wording, answer choices, shared personal/identity fields, conditional forms, navigation, answer review and completion behaviour for 866 Protection and 820 Partner.

This implements the [question-by-question audit](visa-866-820-questionnaire-consistency-audit.md). The audit records the original state at revision `6d2aa87`; its old screenshots, source-line references and “change” classifications describe that snapshot. This document records the resulting implementation.

Equivalent questions now use the approved wording and options where their meaning matches. Sponsor questions keep the sponsor as their subject. Questions that collect a different time period, immigration history or visa-specific fact retain that scope. Existing answers are preserved when introducing common fields or changing available options.

## Implemented changes

| Area | Result |
|---|---|
| Already shared pages | Main applicant Details and the passport/national-ID/other-ID core continue to reuse the approved implementation. Other Family/non-migrating pages, child Other Names/Identity/Custody and the shared entry/profile screens continue using their existing common structure. |
| Navigation | Equivalent target form actions use **Continue**. Both static and per-person 866 navigation labels now say **Other Names**. **Submit** remains the final action. |
| Main applicant Other Names | Aligned corresponding dialog labels/actions and common date presentation. Kept additional Chinese-code, Russian-descent and previous-date-of-birth questions. Corrected per-person saving and previous-DOB editing so edited answers remain attached to the selected applicant. |
| Spouse and child Details | Added the common personal, gender, date-of-birth, marital-status, birthplace and citizenship blocks. Existing Included Applicants names, gender and DOB prefill the form. Added **Other** gender and the approved country choices. Retained child relationship, spouse migration/sponsorship/current-residence and other target-specific fields. Child pages wait for saved applicants to load before redirecting; the child relationship question remains required when a spouse is included. |
| Spouse Identity | Reused the approved passport/travel-document section and aligned national-ID/other-ID fields, instructions and optional dates. 866 now has this common document structure while retaining its citizenship, statelessness, previous-citizenship and residence-rights questions. Unrecognised imported documents remain available for review. |
| Citizenship dialogs | Aligned common acquisition/date/country labels and controls. Retained existing acquisition options and historical-citizenship facts that are not interchangeable with the approved “other country” question. |
| Employment | Aligned matching employer/business, occupation/position, duties, status, address and contact labels. Kept target employment histories since birth. Added the missing 866 occupation input to the relevant employment form. |
| Education | 820 uses **Completed / Current/Ongoing / Deferred / Withdrawn** and the approved course-language choices. Saved **Ongoing** values display as **Current/Ongoing**. An old **Chinese** answer remains available instead of being assigned an invented dialect. 866 supports ongoing studies without requiring an end date, while retaining its primary-school and other education-specific coverage. |
| Date controls | Target forms use aligned date captions and month names while accepting existing numeric months, named months and padded days. Target-only date controls retain the existing historical/future ranges. Approved 482/186 date-control behaviour is unchanged. |
| All Applicants Character | Both target visas use one common 27-question definition. Equivalent declarations and instructions follow the local approved wording. The original answer keys/order and all target-only questions remain. Split removal, exclusion and entry-permit declarations retain their separate meanings. |
| Character follow-ups | Common labels use **Give details** and the appropriate applicant selector. 866 military training/service dialogs now expose the fields needed to save an answer, retain older row metadata and record completion on Continue. |
| 820 Health | Corrected the malformed classroom question, matching question wording, healthcare-role typo/duplicate, common condition labels and conditional form captions. Added missing common categories while retaining broader respiratory/liver/cardiac categories and other target choices. Legacy selected conditions/roles remain editable. |
| Addresses and contacts | Aligned corresponding personal, gender, phone, address and country labels/options. Added applicant attribution to new 820 address rows. Added optional structured 866 postal fields without breaking its old full-address field. Choosing not to share contact details hides their fields while retaining prior entries for later editing. |
| Travel and future travel | Matching travel reasons use the approved common choices. Old selected reasons remain available. **Other** has a details field that survives Continue. Target travel periods, future plans and full histories are retained. |
| Visa histories and languages | Aligned common labels, options and navigation. Retained the target full visa-history questions; the approved grant-number-only screen asks for different information. 866 applicant language/interpreter questions retain their separate scope. |
| 820 sponsor and relationships | Aligned corresponding personal, contact, address, identity, occupation, date and reason wording/options. Kept sponsor, sponsorship, family and relationship-specific facts. Added missing equivalent gender/unemployment choices. |
| Sponsor Character | Replaced the inconsistent follow-up renderer with a working renderer for all 14 existing sponsor questions. Every Yes branch can open and save its applicable details. Common questions retain **your Sponsor** attribution. Old national-security storage aliases are merged without dropping distinct historical events. |
| Review screen | Both target visas now use the approved answer-review layout, grouped by the actual applicants and target sections, with Edit links. Applicant references display names; dates use the common grouping; sponsor questions retain their subject. The review honours active contact/health/character gates and suppresses duplicate legacy sponsor aliases. |
| Completion and submission | Progress follows the actual main applicant, spouses, children and non-migrating members. Absent-spouse and obsolete child-index pages no longer affect the total. Incomplete page steps, main-applicant identity checks, newly shared spouse/child Details requirements and required uploads block submission. Removed **Submit Anyway**. |

## Differences deliberately retained

These are differences in information requested, so they were not replaced just to make the forms look identical:

- **Applicant roles:** target main applicants are not labelled “Nominated Worker.” The existing 866 relationship-category scope remains.
- **Time periods:** target since-birth employment histories and 866 history periods remain distinct from the 482 five-year and 186 ten-year periods.
- **Protection facts:** current and past citizenship, statelessness, permanent residence rights, country histories and protection-specific declarations remain.
- **Partner facts:** sponsor eligibility, previous sponsorships, relationship circumstances, witnesses and other partner-specific questions remain.
- **Character scope:** all 27 target questions remain; matching the approved 18-question implementation does not justify deleting target questions or collapsing split declarations.
- **Health scope:** broader existing medical-condition choices remain alongside matching common categories. Their meaning is not narrowed by replacing them with a more specific condition.
- **Visa/travel scope:** full visa applications and outcomes, residence history, temporary travel and future plans remain distinct questions.
- **Dormant pages:** 866 All Applicants Health and other auxiliary pages remain outside the normal generated flow. No additional questionnaire section was activated solely because a source file exists.

## Saved-answer compatibility

The changes do not require a bulk database migration. Compatibility is handled when a target form reads, edits and saves its existing answers.

| Existing data | Handling |
|---|---|
| Child Details containing only relationship information | Prefill common identity values from Included Applicants and preserve the relationship and unknown fields when saving. |
| Previously completed spouse/child Details | Newly introduced birthplace/citizenship requirements must be completed before submission. Partial drafts remain saveable. |
| Legacy identity documents | Convert recognisable records to the common structure where safe; preserve unrecognised imports and target-specific identity facts. |
| Old select values | Keep the current saved value visible/editable if it is outside the new blank-form choices. |
| Old sponsor national-security arrays | Merge the two known arrays, removing matching copies across aliases while retaining distinct or repeated events within one history. |
| Contact values hidden by No | Keep stored values, omit them from current-answer review and show them again when the user selects Yes. |
| Applicant-specific answers | Preserve profile IDs through navigation and save to the corresponding person’s section. Review uses each active form’s actual storage convention. |
| Old unsuffixed completion flags | Recognise them for a single applicable person, but do not let one shared flag complete multiple spouses or override an explicitly incomplete per-person flag. |

The 820 education and employment/family URL handling also preserves an existing `profileId` when adding the application ID. This prevents an edit from silently switching to a legacy shared section.

## Implementation reference

| File or group | Responsibility |
|---|---|
| `src/components/intake/target-visas/` | Shared target personal fields, citizenship and identity dialogs/pages. |
| `src/lib/targetVisaPersonalDetails.js` and `targetVisaIdentity.js` | Compatibility and validation for the new common fields. |
| `src/lib/allApplicantsParity.js` and `CharacterInstructions.jsx` | Common target character wording, travel choices and other shared options/instructions. |
| `src/lib/partnerQuestionnaireAlignment.js` | Sponsor declaration labels and legacy education/sponsor value compatibility. |
| `src/components/intake/AlignedDateSelector.jsx` | Target date presentation compatible with existing values. |
| `src/lib/targetVisaPages.js` and `targetVisaCompletion.js` | Actual-person page inventory, completion keys, progress and added Details checks. |
| `src/lib/targetVisaReview.js` and `TargetVisaSubmitPage.jsx` | Target storage-to-review mapping and required-item submission blocking. |
| `src/components/intake/TemporaryWorkReviewSummary.jsx` | Reused review layout with an optional label formatter; its default preserves the approved 482/186 behaviour. |

## Validation

| Check | Result |
|---|---|
| Unit/compatibility suite — `pnpm test` | **48 passed.** Includes existing tests and new migration, conditional validation, completion and review tests. |
| Production build — `pnpm build` with the localStorage test backend | **Passed**, including TypeScript checking and generation of all 137 static pages. |
| 820/866 personal Details, Identity and Other Names | **6 production browser cases passed.** Covers spouse/child edits, incomplete draft saves, legacy fallback, previous DOBs, optional national-ID dates and 866 citizenship/residence data. |
| All Applicants | **6 production browser cases passed.** Covers 866 military follow-ups/completion, Other travel details, old travel options, shared contact restoration and conditional email validation. |
| Shared main Identity | **4 production browser cases passed**, one each for 482, 186, 820 and 866. |
| Target progress, answer review and submission | **4 production browser cases passed.** Covers initial totals, correct people/subjects, incomplete new fields, required uploads, and successful isolated submission after correction. |
| Sponsor/education regressions | **3 production browser cases passed.** Exercises all 14 sponsor Yes branches, sponsor completion, national-security alias editing/deletion and legacy education edit → Continue. |
| Approved 186 full regression suite | **4 production browser cases passed.** Includes minimal and expanded family journeys, answer review, submission, required-answer blocking and reset. |
| Approved 482 full regression suite | **4 production browser cases passed.** Includes both full journeys through review/submission, required-answer blocking and reset. Two stale expected page counts were corrected against the pre-change route generator. |
| Visual review | Inspected final desktop and mobile review screens. No horizontal overflow at 1440px or 390px. |
| Source hygiene | `git diff --check` passed. Generated TypeScript configuration changes were reverted. |

**Total: 31 production browser scenarios passed.** The browser checks use isolated localStorage test applications and stub external questionnaire APIs. They do not submit real client applications or update external client records. Browser suites ran against separately compiled local production servers, avoiding development-server refreshes during form entry.

The original 482 tests expected 15 completed pages for the main-only journey and 22 for the expanded journey. The pre-change route generator already produces **16** and **29** for those fixtures: the expanded fixture includes one Other Family member and its six subpages. Only these two strict expected counts were corrected; the approved questionnaire's routes and behaviour were not changed to satisfy the tests.

### Scope of verification

The implementation and original audit use the repository’s current approved Character definition. The earlier read-only attempt to verify a live Firestore override failed with `UNAUTHENTICATED`; no live definition was changed.

Submission verification covers target page completion, existing main-applicant identity checks, added spouse/child Details requirements and required uploads. Existing target form validation remains responsible for its other conditional questions; this change does not introduce a new exhaustive target answer-validation engine.

No deployment or commit was performed as part of this work.

Tool policy rejected removal of the temporary `.next-parity` build cache. It and the temporary verification configuration files remain local and are excluded from Git through the repository's local exclude file.
