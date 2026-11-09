# Temporary Work (482 / 186) Questionnaire Parity — Client Portal Exclusions

The authoritative exclusions file for this work lives at
`F:\Work Projects\ply-legal-admin-portal\EXCLUSIONS.md`.

## Implemented here

- `src/components/RepeaterTable.jsx` consumes field-path chrome copy (add, empty,
  add/edit dialog titles, columns, actions, cancel, confirm).
- `src/lib/questionnaires/legacyCopy.js` collects presentation columns, popup sections,
  and action copy, and resolves `.actions` field paths back to the repeater path.
- `app/intake/temporary-work/main-applicant/skills/page.js` passes
  `fieldName="registrations"` / `fieldName="assessments"`, translates nested dialog
  labels and popup section headings, and consumes editable cancel/confirm copy.
- `app/intake/temporary-work/main-applicant/employment/page.js` passes
  `fieldName="employment_history"` and consumes editable history labels, placeholders,
  dialog chrome, and the 186 visa-held copy.
- `app/intake/temporary-work/spouse-partner/education/page.js` passes
  `fieldName="education_history"` and consumes editable labels and Institution Details.
- `app/intake/temporary-work/spouse-partner/language/page.js` passes
  `fieldName="languages"` / `fieldName="english_tests"` and consumes editable labels,
  sub-score heading, table chrome, and dialog buttons.
- `src/lib/routes.js` static 186 spouse subpages now include Other Names.
- Partner Employment history passes `fieldName="employment_history"` and consumes
  editable dialog labels, table chrome, and buttons.
- Tests cover repeater chrome, popup-section translation, per-path 186 fixtures, and
  Partner Employment copy.

## Remaining client exclusions

- Only the Skills, 186 Employment, 186 Spouse Education, and 186 Spouse Language
  dialogs consume editable nested labels. Other legacy dialogs still hard-code those
  strings.
- Current-employment labels outside the history dialog are only partially translated.
- The Visas page keeps the stored `history` compatibility array but does not render an
  active history dialog (Path B decision) for either context.
- Dynamic rendering was not promoted for any 482/186 page; 25/27 content templates
  remain on the legacy renderer and one Character page remains dynamic.
- Health has not yet been reconciled to ten distinct popup contracts.
- Character still reads the separately maintained
  `src/lib/questionnaires/temporaryWork482.definition.js`; there is no shared fixture
  with the admin starter template yet.
- Residence coverage validation and 186 `visa_held` completion behavior in
  `submitCompletion.js` were not changed.
- The Spouse Language studied-in-English placeholder still contains pre-existing
  encoding corruption in `page.js`; the admin catalog keeps the correct en-dash copy.
- Partner Employment is the only Partner dialog consuming nested editable copy.
  Sponsor Character, Relationships, All Applicants Character, Health, and the other
  Partner dialogs still hard-code those strings.
- The Partner audience boundary (820/801/309/100) and the stale
  `/intake/partner/children/start` route remain unresolved.
- No Partner page was promoted to the dynamic renderer.
