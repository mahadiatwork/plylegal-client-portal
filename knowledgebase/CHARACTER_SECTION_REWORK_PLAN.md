# Character Section Rework Plan

## Overview
This document outlines the plan to rework the Character section for the Protection Visa All Applicants section. The current implementation needs to be expanded to include all questions with conditional tables and dialogs for entering detailed information.

## Current State
The current Character page (`app/intake/protection/all-applicants/character/page.js`) only has 4 basic Yes/No questions without any conditional tables or detailed entry forms.

## Target State
The Character section should include **28 questions**, each with:
- Yes/No radio buttons
- Conditional table display when "Yes" is selected
- "Add" button to open a modal dialog for entering details
- Table columns vary by question type
- Proper validation and data persistence

## Questions and Table Structures

### 1. Police Clearance Certificate
**Question:** "Has anyone who is to be included in this application applied for a Police Clearance Certificate in the last 12 months?"

**Table Columns:**
- Name
- Date of Birth
- Date of Application
- Country

**Dialog Fields:**
- Name (text, required)
- Date of Birth (Day/Month/Year, required)
- Date of Application (Day/Month/Year, required)
- Country (dropdown, required)

---

### 2. Immigration Detention/Refugee Camp
**Question:** "Has anyone who is to be included in this application previously been in Immigration Detention, a Refugee Camp or Centre for Refugees?"

**Table Columns:**
- Name
- Name of Centre / Camp
- Country
- Date From
- Date To

**Dialog Fields:**
- Name (text, required)
- Name of Centre / Camp (text, required)
- Country (dropdown, required)
- Date From (Day/Month/Year, required)
- Date To (Day/Month/Year, optional - leave blank if ongoing)

---

### 3. Criminal Conviction
**Question:** "Has any applicant ever been convicted of an offence in any country (including any conviction which is now removed from official records)? If in doubt, click Yes."

**Table Columns:**
- Name
- Date
- Country
- Offence Type

**Dialog Fields:**
- Name (text, required)
- Date (Day/Month/Year, required)
- Country (dropdown, required)
- Offence Type (text, required)

---

### 4. Charges Awaiting Legal Action
**Question:** "Has any applicant ever been charged with any offence in any country that is currently awaiting legal action? If in doubt, click Yes."

**Table Columns:**
- Name
- Date
- Country
- Offence Type

**Dialog Fields:**
- Name (text, required)
- Date (Day/Month/Year, required)
- Country (dropdown, required)
- Offence Type (text, required)

---

### 5. Domestic/Family Violence Order
**Question:** "Has any applicant who is included in this application ever been the subject of a domestic violence or family violence order, or any other order, of a tribunal or court or other similar authority, for the personal protection of another person?"

**Table Columns:**
- Name
- Date
- Country

**Dialog Fields:**
- Name (text, required)
- Date (Day/Month/Year, required)
- Country (dropdown, required)

---

### 6. Arrest Warrant/Interpol Notice
**Question:** "Has any applicant who is to be included in this application been the subject of an arrest warrant or Interpol Notice?"

**Table Columns:**
- Name
- Date
- Country

**Dialog Fields:**
- Name (text, required)
- Date (Day/Month/Year, required)
- Country (dropdown, required)

---

### 7. Sexually Based Offence Involving a Child
**Question:** "Has any applicant been found guilty of a sexually based offence involving a child (including where no conviction was recorded)?"

**Table Columns:**
- Name
- Date
- Country

**Dialog Fields:**
- Name (text, required)
- Date (Day/Month/Year, required)
- Country (dropdown, required)

---

### 8. Sex Offender Register
**Question:** "Has any applicant who is to be included in this application ever been named on a sex offender register?"

**Table Columns:**
- Name
- Date
- Country

**Dialog Fields:**
- Name (text, required)
- Date (Day/Month/Year, required)
- Country (dropdown, required)

---

### 9. Confined in Prison/Psychiatric Institution
**Question:** "Has any applicant been confined in a prison or psychiatric institution by order of a court in relation to criminal proceedings?"

**Table Columns:**
- Name
- Date From
- Date To
- Country

**Dialog Fields:**
- Name (text, required)
- Date From (Day/Month/Year, required)
- Date To (Day/Month/Year, optional)
- Country (dropdown, required)

---

### 10. Acquitted on Grounds of Unsoundness of Mind
**Question:** "Has any applicant ever been acquitted of any offence on the grounds of unsoundness of mind or insanity? If in doubt, click yes."

**Table Columns:**
- Name
- Date
- Country

**Dialog Fields:**
- Name (text, required)
- Date (Day/Month/Year, required)
- Country (dropdown, required)

---

### 11. Found Not Fit to Plead
**Question:** "Has any applicant who is to be included in this application ever been found by a court not fit to plead?"

**Table Columns:**
- Name
- Date
- Country

**Dialog Fields:**
- Name (text, required)
- Date (Day/Month/Year, required)
- Country (dropdown, required)

---

### 12. Incorrect Info to Australian Immigration
**Question:** "Has any applicant ever provided any information or a document to the Australian Immigration or Customs Authorities which was wrong, incorrect, false or misleading?"

**Table Columns:**
- Name
- Date
- Country

**Dialog Fields:**
- Name (text, required)
- Date (Day/Month/Year, required)
- Country (dropdown, required)

---

### 13. Visa or Entry Permit Refused
**Question:** "Has any applicant ever had a visa or entry permit for any country (including Australia) refused?"

**Table Columns:**
- Name
- Date
- Country

**Dialog Fields:**
- Name (text, required)
- Date (Day/Month/Year, required)
- Country (dropdown, required)

---

### 14. Overstayed Visa or Entry Permit
**Question:** "Has any applicant overstayed a visa or entry permit in any country (including Australia)?"

**Table Columns:**
- Name
- Date
- Country

**Dialog Fields:**
- Name (text, required)
- Date (Day/Month/Year, required)
- Country (dropdown, required)

---

### 15. Removed or Deported
**Question:** "Has any applicant been removed or deported from any country (including Australia)?"

**Table Columns:**
- Name
- Date
- Country

**Dialog Fields:**
- Name (text, required)
- Date (Day/Month/Year, required)
- Country (dropdown, required)

---

### 16. Left Country to Avoid Removal/Deportation
**Question:** "Has any applicant left any country to avoid being removed or deported from that Country (including Australia)?"

**Table Columns:**
- Name
- Date
- Country

**Dialog Fields:**
- Name (text, required)
- Date (Day/Month/Year, required)
- Country (dropdown, required)

---

### 17. Excluded from or Asked to Leave Country
**Question:** "Has any applicant been excluded from or asked to leave any country (including Australia)?"

**Table Columns:**
- Name
- Date
- Country

**Dialog Fields:**
- Name (text, required)
- Date (Day/Month/Year, required)
- Country (dropdown, required)

---

### 18. Refused/Renounced/Rescinded Citizenship
**Question:** "Has any applicant ever been refused, renounced or rescinded citizenship of any country?"

**Table Columns:**
- Name
- Date
- Country

**Dialog Fields:**
- Name (text, required)
- Date (Day/Month/Year, required)
- Country (dropdown, required)

---

### 19. International Crimes
**Question:** "Has any applicant been charged with, or indicted for: genocide, war crimes, crimes against humanity, torture, slavery, or any other crime that is otherwise of a serious international concern?"

**Table Columns:**
- Name
- Date
- Country

**Dialog Fields:**
- Name (text, required)
- Date (Day/Month/Year, required)
- Country (dropdown, required)

---

### 20. National Security Risk
**Question:** "Has any applicant been directly or indirectly involved in, or associated with, any activities that would represent a risk to Australian national security or any other country?"

**Table Columns:**
- Name
- Country

**Note:** No Date column for this question

**Dialog Fields:**
- Name (text, required)
- Country (dropdown, required)

---

### 21. Outstanding Debts to Australian Government
**Question:** "Has any applicant ever had any outstanding debts to the Australian Government or any public authority in Australia?"

**Table Columns:**
- Name
- Country

**Note:** No Date column for this question

**Dialog Fields:**
- Name (text, required)
- Country (dropdown, required)

---

### 22. People Smuggling/Trafficking
**Question:** "Has any applicant ever been involved in people smuggling or people trafficking offences? If in doubt, click Yes."

**Table Columns:**
- Name
- Date
- Country

**Dialog Fields:**
- Name (text, required)
- Date (Day/Month/Year, required)
- Country (dropdown, required)

---

### 23. Associated with Criminal Conduct
**Question:** "Has any applicant been associated with a person, group or organisation that has been/is involved in criminal conduct?"

**Table Columns:**
- Name
- Country

**Note:** No Date column for this question

**Dialog Fields:**
- Name (text, required)
- Country (dropdown, required)

---

### 24. Associated with Violent Organizations
**Question:** "Has any applicant ever been associated with an organisation engaged in violence or engaged in acts of violence (including war, insurgency, freedom fighting, terrorism, protest) either overseas or in Australia?"

**Table Columns:**
- Name
- Country

**Note:** No Date column for this question

**Dialog Fields:**
- Name (text, required)
- Country (dropdown, required)

---

### 25. Military/Paramilitary Training
**Question:** "Has any applicant undergone any military/paramilitary training, been trained in weapons/explosives or in the manufacture of chemical/biological products?"

**Table Columns:**
- Name
- Date of Birth
- Date From
- Date To
- Country

**Dialog Fields:**
- Name (text, required)
- Date of Birth (Day/Month/Year, required)
- Date From (Day/Month/Year, required)
- Date To (Day/Month/Year, optional)
- Country (dropdown, required)

---

### 26. Served in Military/Police/Intelligence
**Question:** "Has any applicant ever served in a military force, police force, state sponsored militia, private militia, secret police or intelligence agency?"

**Table Columns:**
- Name
- Date of Birth
- Date From
- Date To
- Country of Service
- Country of Deployment
- Position

**Dialog Fields:**
- Name (text, required)
- Date of Birth (Day/Month/Year, required)
- Date From (Day/Month/Year, required)
- Date To (Day/Month/Year, optional)
- Country of Service (dropdown, required)
- Country of Deployment (dropdown, required)
- Position (text, required)

---

### 27. Payment/Benefit for Visa Support
**Question:** "Has any person included in this application made or offered to make a payment or provide another benefit of any kind to another person or entity in return for the sponsorship, nomination or support for an Australian visa?"

**Table Columns:**
- Name
- Date of Birth
- Details

**Dialog Fields:**
- Name (text, required)
- Date of Birth (Day/Month/Year, required)
- Details (textarea, required)

---

## Implementation Plan

### Phase 1: Setup and Structure
1. **Update Form Schema**
   - Create comprehensive Zod schema with all 28 questions
   - Each question should have:
     - `has_[question_key]`: enum(["yes", "no"])
     - `[question_key]_entries`: array of objects (conditional)

2. **Create Reusable Dialog Components**
   - Create dialog components for each table type:
     - `BasicEntryDialog` (Name, Date, Country)
     - `BasicEntryWithOffenceDialog` (Name, Date, Country, Offence Type)
     - `DateRangeEntryDialog` (Name, Date From, Date To, Country)
     - `PoliceClearanceDialog` (Name, Date of Birth, Date of Application, Country)
     - `ImmigrationDetentionDialog` (Name, Centre/Camp, Country, Date From, Date To)
     - `PrisonPsychiatricDialog` (Name, Date From, Date To, Country)
     - `MilitaryTrainingDialog` (Name, Date of Birth, Date From, Date To, Country)
     - `MilitaryServiceDialog` (Name, Date of Birth, Date From, Date To, Country of Service, Country of Deployment, Position)
     - `PaymentBenefitDialog` (Name, Date of Birth, Details)
     - `NameCountryOnlyDialog` (Name, Country) - for questions without Date

### Phase 2: Question Implementation
3. **Implement Each Question**
   - For each of the 28 questions:
     - Add Yes/No radio group
     - Add conditional rendering for table when "Yes"
     - Add RepeaterTable component with appropriate columns
     - Connect to appropriate dialog component
     - Add instruction text below question

4. **Table Column Definitions**
   - Define column arrays for each question type
   - Include proper formatting functions for dates
   - Handle optional fields (Date To, etc.)

### Phase 3: Data Management
5. **Data Loading**
   - Update `useEffect` to load saved data using `form.reset()`
   - Watch `draftSnap.draft?.protection_character`
   - Merge saved data with default values

6. **Data Saving**
   - Implement `handleSave` following `QUESTIONNAIRE_PAGE_SAVE_PATTERN.md`
   - Save to `protection_character` section
   - Include validation before saving

### Phase 4: Validation
7. **Form Validation**
   - Add `superRefine` to form schema
   - Validate that if "Yes" is selected, at least one entry exists in the table
   - Validate date ranges (Date To not earlier than Date From)
   - Validate required fields in dialogs

### Phase 5: UI/UX
8. **Navigation Buttons**
   - Add desktop navigation (Previous, Save Draft, Next)
   - Update StickyNav for mobile
   - Add loading states with Loader2 spinner

9. **Styling and Layout**
   - Ensure consistent spacing between questions
   - Add proper section dividers
   - Match existing design patterns

## Technical Considerations

### Data Structure
```javascript
{
  has_police_clearance: "yes" | "no",
  police_clearance_entries: [
    {
      name: string,
      date_of_birth_day: string,
      date_of_birth_month: string,
      date_of_birth_year: string,
      date_of_application_day: string,
      date_of_application_month: string,
      date_of_application_year: string,
      country: string
    }
  ],
  // ... repeat for all 28 questions
}
```

### Reusable Components
- Create shared dialog components to reduce code duplication
- Use consistent naming conventions
- Ensure all dialogs prevent event propagation

### Performance
- Consider lazy loading dialogs if needed
- Optimize re-renders with proper React patterns
- Use `useMemo` for computed values where appropriate

## Testing Checklist

- [ ] All 28 questions render correctly
- [ ] Yes/No selection shows/hides tables appropriately
- [ ] All dialog forms validate correctly
- [ ] Data saves to Firebase correctly
- [ ] Data loads from Firebase correctly
- [ ] Date validations work (Date To not earlier than Date From)
- [ ] Required field validations work
- [ ] Navigation buttons work (Previous, Save Draft, Next)
- [ ] Loading states display correctly
- [ ] Mobile navigation works
- [ ] All table columns display correctly
- [ ] Add/Edit/Delete functionality works for all tables

## File Structure

```
app/intake/protection/all-applicants/character/
├── page.js (main page component)
└── components/ (optional - if dialogs become too large)
    ├── BasicEntryDialog.jsx
    ├── BasicEntryWithOffenceDialog.jsx
    ├── DateRangeEntryDialog.jsx
    ├── PoliceClearanceDialog.jsx
    ├── ImmigrationDetentionDialog.jsx
    ├── PrisonPsychiatricDialog.jsx
    ├── MilitaryTrainingDialog.jsx
    ├── MilitaryServiceDialog.jsx
    ├── PaymentBenefitDialog.jsx
    └── NameCountryOnlyDialog.jsx
```

## Dependencies

- Follow `QUESTIONNAIRE_PAGE_SAVE_PATTERN.md` for save functionality
- Use existing components: `RepeaterTable`, `StickyNav`, `Button`, `Input`, `Select`, `RadioGroup`
- Use existing utilities: `COUNTRY_OPTIONS`, date arrays (days, months, years)
- Use existing stores: `draftStore` for data persistence

## Notes

- Some questions have "If in doubt, click Yes" instructions - ensure these are displayed
- Date To fields should be optional for ongoing situations
- Some questions don't have Date columns - ensure dialogs match table structure
- All dialogs should prevent event propagation to avoid unintended form submissions
- Consider grouping related questions visually for better UX

