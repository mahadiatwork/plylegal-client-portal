# PlyLegal Client Portal - UI Upgrade Implementation Plan

**Target Design Reference:** Client Specification PDF (Pages 1–7)  
**Primary Objective:** Upgrade the client portal interface to match the modern, elegant PlyLegal design specifications while preserving **100% of all existing business logic, Valtio state stores, Firebase authentication, Zoho CRM API synchronization, and dynamic questionnaire validation**.

---

## 1. Visual & Architectural Overview

The target design transitions the portal from a legacy sidebar layout to an open, high-trust client portal featuring:
- **Consistent Brand Identity:** PlyLegal dark forest green (`#244D42` / `#1E3E36`), sage highlight tints (`#EEF7F2` / `#DCECE5`), deep slate typography (`#0F172A`), and calm neutral canvases (`#F4F7FB` / `#F8FAFC`).
- **Clean App Header:** Light background, crisp black PlyLegal logo, user profile badge (`Avatar Initial + Name v`), and direct `Sign out` action.
- **Unified Matter Workspace:** Replaces the heavy left-sidebar wrapper with a top matter banner (`← All matters`, matter title, status badge) and **4 horizontal tabs**:
  1. `Questionnaire` (Document icon)
  2. `Upload Documents` (Upload / folder icon)
  3. `Resources` (Book icon)
  4. `Shared Files` (Folder icon)
- **High-Clarity Content Containers:** Rounded white cards (`rounded-2xl border border-slate-200/80 bg-white shadow-sm`), structured data tables, and intuitive action footers.

---

## 2. Page-by-Page Specification Breakdown

### Page 1: Applications Dashboard (`/applications`)
- **Header:** Light header with PlyLegal logo on the left; user avatar circle (`M`), user name (`Mahmudul v`), and `Sign out` on the right.
- **Hero Area:**
  - Section kicker: `CLIENT PORTAL` (uppercase, tracking-wider, text-slate-500).
  - Main Heading: `Welcome, Mahmudul` (large, elegant serif/sans heading).
  - Subtext: `You can access your visa matters below.`
- **Applications List:**
  - Subheading: `Your visa applications` + `View and manage your current and past visa applications.`
  - Stack of Visa Application Cards:
    - **Left badge:** Circular sage badge (`bg-[#EEF7F2] text-[#255E4A]`) with a `FileText` icon.
    - **Title:** e.g., `Skills in Demand (Subclass 482)`, `Protection Visa (Subclass 866)`, `Employer Nomination Visa (Subclass 186)`, `Partner Visa (Subclass 820)`.
    - **Status Pill:** Colored dot indicator + label (`• Preparing application` [blue], `• Finalised` [green], `• Draft` [grey], `• Not started` [grey]).
    - **Applicant Metadata:** `Primary applicant: Mahmudul Hassan`. For finalised matters, also display `Finalised date: 12 March 2024`.
    - **Actions:**
      - Active / In-progress: Solid dark green rounded button `Open matter →`.
      - Other statuses: Clean outline button `View →`.

---

### Pages 2 & 3: Questionnaire Workspace
- **Top Matter Banner:**
  - Back link: `← All matters` (navigates back to `/applications`).
  - Matter title: `Skills in Demand (Subclass 482)` + status pill `• Preparing application`.
  - Horizontal tab bar with `Questionnaire` active (green underline indicator).
- **Two-Column Questionnaire Layout:**
  - **Left Sidebar Card (`w-[280px]` - `w-[320px]`):**
    - Section header: `QUESTIONNAIRE` (uppercase, tracking-wider).
    - Progress text: `6 of 23 sections complete` (dynamic calculation).
    - Progress bar: Thin green bar (`bg-[#244D42]`) on a grey track.
    - Vertical Numbered Stepper:
      1. `Getting started` (checkmark icon if completed, number if active/pending)
      2. `Applicant details`
      3. `Employment`
      4. `Education`
      5. `English language`
      6. `Health and character`
      7. `Sponsorship`
      8. `Review and submit`
      - Completed step: Green-tinted circle with checkmark `✓`.
      - Current step: Solid green circle with white step number.
      - Pending step: Neutral circle with step number and muted text.
  - **Right Form Container:**
    - Top meta row: `SECTION 1 OF 23` (or `SECTION 3 OF 23`) on left, `? Need help?` button on right.
    - Section Title: e.g., `Getting started` or `Employment`.
    - Descriptive instruction paragraphs.
    - Information callout card with `ℹ` icon:
      - Page 2: `Accuracy matters. Incomplete or incorrect information can lead to delays, refusal, or visa cancellation. If you are unsure about anything, let us know.`
      - Page 3: `What to include` bulleted list of guidance.
    - Interactive Content:
      - Page 2: Confirmation card with checkbox: `[✓] I confirm that the information I provide will be accurate to the best of my knowledge.`
      - Page 3: `Employment history` subheader + `+ Add employment` solid green button + table of previous employers with `Edit` and `Delete` actions.
    - Sticky Action Footer:
      - Page 2: `🔒 You can save your progress and return anytime.` + `Continue →` button.
      - Page 3: `← Previous section` (outline button) + `Save and continue →` (solid green button).

---

### Page 4: Upload Documents Tab (`/applications/[slug]/[id]/uploads`)
- **Header:**
  - Title: `Upload your documents`.
  - Subtitle: `Please upload the documents listed below. We will review them and let you know if anything else is required.`
  - Accepted formats label: `Accepted formats: PDF, JPG, PNG, DOC, TXT (max 5MB per file).`
- **Categorized Accordion Panels:**
  - Accordion categories:
    1. `Identity documents`
    2. `Employment evidence`
    3. `Qualifications and skills`
    4. `English language`
    5. `Other documents (if applicable)`
  - Header: Category icon + title + expand/collapse chevron.
  - Document Table inside each panel:
    - Columns: `Document | Status | Comments | Action`
    - Document Name with document icon.
    - Status Badge with colored dot:
      - `• Approved` (green)
      - `• Awaiting Approval` (orange)
      - `• Not Submitted Yet` (purple/neutral)
    - Comments: Displays review feedback (e.g., `Please provide a clearer copy.`, `Please provide payslips for April and May 2024.`) or `-`.
    - Action: Outline button `⭡ Upload` opening the file upload dialog.

---

### Pages 5 & 6: Resources Center (`/applications/[slug]/[id]/resources`)
- **Page 5: Overview View:**
  - Header: Title `Resources` + subtitle.
  - Search & Filter bar: Search input `🔍 Search resources...` and filter dropdown `All types ∨`.
  - Category Cards Grid/List:
    - `Visa process and government information`
    - `Documents and evidence`
    - `Key requirements`
    - `Our policies and important information`
    - `Templates and forms`
  - Inside each category card:
    - Left column: Category icon + name + description.
    - Middle column: List of items with colored type badges (`Guide`, `Link`, `Checklist`, `File`, `Note`) and chevron `>`.
    - Right column: `View all →` button to navigate to the category detail view.
- **Page 6: Category Detail View:**
  - Breadcrumbs: `← Back to Resources` and `← Back to all categories`.
  - Category Title & Description with category icon.
  - List of Resource Detail Cards:
    - Resource title + type badge.
    - Full resource description.
    - Action button: `View →` (for guides, notes, files) or `Open link ↗` (for external government links).
  - Bottom Notice: `ℹ Need more information? If you can't find what you're looking for, please contact us or refer to the Department of Home Affairs website.`

---

### Page 7: Shared Files Tab (`/applications/[slug]/[id]/shared-files`)
- Replaces/upgrades the legacy deliverables view into the 4th workspace tab.
- **Section 1: Government Correspondence:**
  - Subtitle: `Letters and correspondence from government bodies about your application.`
  - Search input: `🔍 Search files...`
  - Table: `Name ↕ | Date added ↕ | File type ↕ | Size ↕ | Actions`
  - File rows with colored type icons (Red PDF badge, Blue Word badge), file name, date, file type, file size, `View ↗` button, and context menu `⋮`.
- **Section 2: Lodged Documents:**
  - Subtitle: `A copy of the documents included in your application.`
  - Search input: `🔍 Search files...`
  - Table: `Name ↕ | Date added ↕ | File type ↕ | Size ↕ | Actions`
  - File rows with type icons, dates, sizes, `View ↗` button, and context menu `⋮`.

---

## 3. Preserving All Existing Logic & Architecture

To guarantee **zero regression**, all data management layers remain strictly intact:

| Architectural Layer | Existing Components & Files | Preservation Guarantee |
| :--- | :--- | :--- |
| **Authentication & Profile** | `authStore.js`, `useSnapshot(authStore)`, `AuthGuard.jsx`, Firebase Auth | Session checks, Firebase token generation, user profiles, and sign-out logic remain unchanged. |
| **Applications & Sync** | `applicationsStore.js`, `/api/applications/fetch-zoho-deals` | Background Zoho deals fetch, matter ID resolution, and status mappings remain identical. |
| **Questionnaire Engine** | `draftStore.js`, `DynamicQuestionnairePage.jsx`, `RepeaterTable.jsx`, `QuestionRenderer.jsx`, `validation.js` | Form validation, auto-saving drafts to Firestore/Zoho, route step navigation, and data schemas remain 100% intact. |
| **Uploads & Documents** | `appDataStore.js`, Zoho Matter Documents matching logic, upload API | File type validation, size limit checks (max 5MB), Zoho document status updates, and upload modals remain intact. |
| **Resources System** | `loadResourcePageData.js`, `/api/matters/[matterId]/resources`, note viewer | Resource ordering, Firestore template fetching, notes preview modals, and secure link resolution remain untouched. |

---

## 4. Step-by-Step Implementation Roadmap

### Phase 1: Shared Layout Shell & Header Upgrade
1. **Update `src/components/AppHeader.jsx`:**
   - Implement clean light variant: White/transparent background, black PlyLegal logo on the left.
   - User profile section on the right: Greenish/neutral circular initial badge (`M`), user display name (`Mahmudul`), dropdown chevron `v`, and `Sign out` action.
2. **Create `src/components/MatterWorkspaceHeader.jsx`:**
   - Top banner containing:
     - `← All matters` back navigation link.
     - Application title (e.g. `Skills in Demand (Subclass 482)`).
     - Status dot badge (`• Preparing application`).
   - 4-Tab horizontal navigation bar:
     - `Questionnaire` (`/applications/[slug]/[id]/questionnaire`)
     - `Upload Documents` (`/applications/[slug]/[id]/uploads`)
     - `Resources` (`/applications/[slug]/[id]/resources`)
     - `Shared Files` (`/applications/[slug]/[id]/shared-files`)
   - Forest green active indicator underline with smooth tab switching.

### Phase 2: Applications Dashboard (Page 1)
1. **Update `app/applications/page.js`:**
   - Set background to soft neutral `#F4F7FB`.
   - Add the `CLIENT PORTAL` kicker, `Welcome, {name}` heading, and subtitle.
   - Replace the legacy table with the card stack:
     - Sage circular badge with `FileText` icon.
     - Application title + colored status dot badge.
     - Metadata grid: Primary applicant name; Finalised date (if applicable).
     - Action buttons: Solid dark forest green `Open matter →` for active matters; Outline `View →` for finalised/draft matters.
   - Retain full Zoho CRM deals fetch, loading ripples, and empty state handlers.

### Phase 3: Modern 2-Column Questionnaire Workspace (Pages 2 & 3)
1. **Refactor Questionnaire Shell (`app/applications/[slug]/[id]/questionnaire/page.js` & `app/intake/layout.js`):**
   - Adopt the two-column card structure:
     - **Left Column:** Questionnaire summary card with section completion counter (`X of Y sections complete`), green progress bar, and vertical numbered/checked stepper.
     - **Right Column:** Section card with `SECTION X OF Y`, `? Need help?` button, section title, description, and info callout banner (`Accuracy matters...` / `What to include`).
2. **Connect Interactive Form Components:**
   - Connect `IntakeStartPageContent` for the "Getting Started" confirmation card and continue button.
   - Update `RepeaterTable.jsx` styling to match Page 3 (Employer, Position, Start Date, End Date, Type, Edit/Delete).
   - Standardize footer navigation: Lock indicator + `Continue →` on start; `← Previous section` + `Save and continue →` on subsequent pages.

### Phase 4: Document Uploads Accordion & Table (Page 4)
1. **Update `app/applications/[slug]/[id]/uploads/page.js`:**
   - Add the instructions banner with accepted file formats (`PDF, JPG, PNG, DOC, TXT max 5MB`).
   - Wrap categorized document groups into clean accordion cards (`Identity documents`, `Employment evidence`, `Qualifications and skills`, `English language`, `Other documents`).
   - Style the document table:
     - Column 1: Document name with file icon.
     - Column 2: Status pill (`• Approved` green, `• Awaiting Approval` orange, `• Not Submitted Yet` purple/neutral).
     - Column 3: Feedback/Comments column with clean text.
     - Column 4: Outline `⭡ Upload` button.
   - Maintain the existing upload modal, file upload pipeline, and Zoho sync.

### Phase 5: Resources Center (Pages 5 & 6)
1. **Update `app/applications/[slug]/[id]/resources/page.js`:**
   - **Overview State (Page 5):**
     - Add search input and `All types v` filter dropdown.
     - Render category cards (`Visa process and government information`, `Documents and evidence`, etc.) displaying resource previews with colored type pills (`Guide`, `Link`, `Checklist`, `File`, `Note`) and `View all →`.
   - **Category Detail State (Page 6):**
     - Add `← Back to Resources` and `← Back to all categories` navigation.
     - Render resource detail cards with title, type pill, description, and direct action (`View →` or `Open link ↗`).
     - Add bottom info note for Home Affairs / contact support.
   - Maintain all existing Firestore template loading, notes viewer dialog, and preview links.

### Phase 6: Shared Files Tab (Page 7)
1. **Create/Update `app/applications/[slug]/[id]/shared-files/page.js` (and route alias from `deliverables`):**
   - Render the two dedicated sections:
     1. **Government Correspondence** (with search bar and table).
     2. **Lodged Documents** (with search bar and table).
   - Implement sortable headers: `Name`, `Date added`, `File type`, `Size`.
   - Render file format icons (Red PDF, Blue Word), `View ↗` button, and `⋮` actions menu.
   - Wire file preview links to existing WorkDrive preview/download tokens.

### Phase 7: Verification & Quality Assurance
1. **Visual Consistency Check:** Verify alignment, typography, spacing, and colors across all 7 screens against the PDF.
2. **State & Logic Verification:**
   - Verify that logging in/out and session checking function smoothly.
   - Confirm Zoho deals load and correctly link to matter workspaces.
   - Verify questionnaire data persistence, repeater rows (add/edit/delete), and step completion tracking.
   - Test document upload dialog and file format/size validation.
   - Verify resource category drill-down, search filtering, and link/note opening.
   - Confirm shared files listing, searching, and previewing.
3. **Responsive Testing:** Ensure smooth collapse and mobile touch targets across phone, tablet, and desktop viewports.

---

## 5. Execution Readiness

This implementation plan preserves every line of your underlying business logic while upgrading the UI to match the client's specifications. 

Upon your approval, we will proceed immediately with **Phase 1 (Layout Shell & Header Upgrade)**.
