# 482 Questionnaire Parity — Client Portal Exclusions

The authoritative exclusions file for this work lives at
`F:\Work Projects\ply-legal-admin-portal\EXCLUSIONS.md`.

## Implemented here

- `src/components/RepeaterTable.jsx` consumes field-path chrome copy (add, empty,
  add/edit dialog titles, columns, actions, cancel, confirm).
- `src/lib/questionnaires/legacyCopy.js` collects presentation columns, popup sections,
  and action copy, and resolves `.actions` field paths back to the repeater path.
- `app/intake/temporary-work/main-applicant/skills/page.js` now passes
  `fieldName="registrations"` / `fieldName="assessments"`, translates nested dialog
  labels and popup section headings, and consumes editable cancel/confirm copy.
- Tests cover repeater chrome and popup-section translation.

## Remaining client exclusions

- Only the Skills dialogs consume editable nested labels/help/placeholders. Other
  legacy 482 dialogs still hard-code those strings.
- The Visas page keeps the stored `history` compatibility array but does not render an
  active history dialog (Path B decision).
- Dynamic rendering was not promoted for any 482 page; all 25 content templates remain
  on the legacy renderer and one Character page remains dynamic.
- Health has not yet been reconciled to ten distinct popup contracts.
- Character still reads the separately maintained
  `src/lib/questionnaires/temporaryWork482.definition.js`; there is no shared fixture
  with the admin starter template yet.
- Residence coverage validation and 482/186 context tests in `submitCompletion.js` were
  not changed.
