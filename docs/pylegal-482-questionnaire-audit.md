# PyLegal Portal — 482 (Skills in Demand) Questionnaire Requirements Audit

Audit of the codebase against the PyLegal **482 Skills in Demand** questionnaire specification. This document reflects **what is implemented**, **what is partial**, and **what remains missing** relative to the full requirements list.

**Status legend**

| Status | Meaning |
|--------|---------|
| **IMPLEMENTED** | Matches the requirement in substance (and verbatim where wording was specified). |
| **PARTIAL** | Implemented in part, close variant, or correct feature but not exact spec / not complete. |
| **MISSING** | Not found, not wired, or materially different from the requirement. |
| **N/A** | Out of scope for this codebase (e.g. 186 visa). |

---

## Checklist

| # | Requirement | Status | File(s) | Notes |
|---|-------------|--------|---------|--------|
| **GLOBAL / STRUCTURAL** |
| 1 | Visa name **"Skills in Demand Visa (subclass 482)"** (incl. CRM title) | **PARTIAL** | `app/intake/temporary-work/profile/page.js`; `app/api/profile/fetch-zoho/route.js` | **UI**: Profile bullet uses **Skills in Demand Visa (subclass 482)**. **CRM**: `mapDealToVisaType` matches deal names containing `482`, `tss`, `skills in demand`, etc. — it does **not** rename or display Zoho **Deal_Name** as the full official title; that remains a **CRM / product** concern unless a Zoho update API is used. |
| 2 | First page button: **"Continue"** (was "Continue Questionnaire" / "Start Questionnaire") | **IMPLEMENTED** | `app/intake/temporary-work/start/page.js` | Primary CTA label is **Continue** (when application not already submitted). |
| 3 | **Application Profile** inside questionnaire (not outside) | **IMPLEMENTED** | `src/lib/routes.js` (`TEMPORARY_WORK_VISA_ROUTES`); `app/intake/temporary-work/profile/page.js` | Flow: Getting Started → Application Profile → … |
| **LEFT-HAND MENU** |
| 4 | Order: Getting Started → Application Profile → Applicant 1 (Main) → Applicant 2 (Spouse) if any → Applicant 3+ (children) if any → All Applicants | **PARTIAL** | `app/intake/layout.js`; `src/lib/routes.js` | With **`draft.profiles`**, sidebar injects per-profile sections with **Applicant *n* (Main Applicant / Spouse/Partner / Child)** after sorting. **Child** label is not the spec phrase **"Applicant 3 (Given Family)"**. When **no profiles**, static routes still show separate Main Applicant / Spouse / Children / All Applicants blocks from `TEMPORARY_WORK_VISA_ROUTES`. |
| **APPLICATION PROFILE** |
| 5 | **Main Applicant Profile** + **Family Unit Profile** (+ relationship) | **PARTIAL** | `app/intake/temporary-work/profile/page.js` | Section headings **Main Applicant Profile** and **Family Unit Profile** are present. **Relationship** is chosen per person via the add/edit dialog (`RELATIONSHIPS`), not a separate “relationship between main applicant and family member” control. |
| 6 | Instruction: *"Add name as it appears in passport. If one name, add it as family name."* | **PARTIAL** | `app/intake/temporary-work/profile/page.js` | Equivalent text exists in the dialog: *"Add each name as it appears in passport. If only one name is shown in the passport, enter it as the family name."* — not word-for-word identical. |
| **MAIN APPLICANT — DETAILS / IDENTITY / CONTACT** |
| 7 | **Details** = merged old Details + Other; subheadings: Personal; Birthplace; Other names; Citizenships | **PARTIAL** | `app/intake/temporary-work/main-applicant/details/page.js`; `src/lib/routes.js` | **Citizenships** block is on **Details** with migration from legacy identity data. **Subheading order in UI** is **Personal Information** → **Other names/spellings** → **Citizenships** → **Birthplace Information** (spec lists Birthplace before Other names). Route **`/main-applicant/other`** and **`PROFILE_SUBPAGES` "Other Names"** remain — merge is **not** a single Details route only. |
| 8 | Marital status under **Date of Birth** within Personal Information | **IMPLEMENTED** | `app/intake/temporary-work/main-applicant/details/page.js` | DOB fields then marital status in the same Personal Information block. |
| 9 | Citizenship moved from **Identity** → **Details** | **IMPLEMENTED** | `app/intake/temporary-work/main-applicant/details/page.js`; `main-applicant/identity/page.js` | Citizenship UI and schema on Details; identity page has no citizenship blocks. |
| 10 | **Identity** only: Passports; National ID; Other ID (no custody for main applicant) | **IMPLEMENTED** | `app/intake/temporary-work/main-applicant/identity/page.js`; `src/components/intake/temporary-work/SimplifiedOtherIdentityDialog.jsx` | Passports repeater → National ID card → Other identity documents (simplified). Profile-aware save when `profileId` in query. |
| 11 | **Contact Details**: **Residential Address**; **Address History** hidden | **IMPLEMENTED** | `app/intake/temporary-work/main-applicant/contact-details/page.js` | Residential fields stored under `temporary_work_contact_details.residential_address`; legacy **`temporary_work_addresses.address_history`** read once for migration when residential is empty. |
| 12 | Employment, Education, Skills, Language unchanged | **IMPLEMENTED** | `app/intake/temporary-work/main-applicant/{employment,education,skills,language}/page.js` | No structural change required by this audit; assumed stable. |
| **SPOUSE** |
| 13 | Spouse **Details** same structure as main applicant **Details** | **MISSING** | `app/intake/temporary-work/spouse-partner/details/page.js` | Spouse Details remains a **narrower** form (e.g. `intending_to_migrate`, limited fields) — **not** parity with main applicant Details (citizenships, full personal/marital structure, etc.). |
| 14 | Spouse **Identity** same structure as main applicant **Identity** | **IMPLEMENTED** | `app/intake/temporary-work/spouse-partner/identity/page.js`; `src/lib/routes.js` | **`spouse-partner/identity`** exists in `TEMPORARY_WORK_VISA_ROUTES`. Page mirrors main identity sections; legacy key **`temporary_work_spouse_identity`** when not in profile mode. |
| **CHILDREN** |
| 15 | Child **Details** | **IMPLEMENTED** | `app/intake/temporary-work/children/[childId]/details/page.js` | Dynamic route; saves `profiles_data[childId].details`; citizenship section omitted vs main. |
| 16 | Child **Identity** | **IMPLEMENTED** | `app/intake/temporary-work/children/[childId]/identity/page.js` | Same passport / national ID / other ID pattern; completion keys under `temporary-work/children/{id}/identity`. |
| 17 | Child **Custody** section | **PARTIAL** | `app/intake/temporary-work/children/[childId]/custody/page.js` | **Custody** page exists and persists `profiles_data[childId].custody`. |
| **CHILD CUSTODY (EXACT QUESTIONS)** |
| 18 | Four specified Yes/No + conditional detail questions (under 18; primary applicant custody; other person rights; legal impediments to travel) | **MISSING** | `app/intake/temporary-work/children/[childId]/custody/page.js` | Implemented form uses **different** questions (e.g. living arrangements, court orders, other-parent consent, disputes) — **not** the four exact PyLegal prompts in the spec. |
| **IDENTITY — FIELD-LEVEL** |
| 19 | Passports / Travel Documents — no substantive change | **IMPLEMENTED** | `app/intake/temporary-work/main-applicant/identity/page.js` | Passport/travel repeater retained. |
| 20 | National ID: **"Do you have a National ID card?"** + listed fields | **IMPLEMENTED** | `app/intake/temporary-work/main-applicant/identity/page.js` | Conditional block and fields align with spec intent; issue/expiry optional. |
| 21 | Other identity: family/given names, type dropdown (specified list), ID number, country | **IMPLEMENTED** | `src/components/intake/temporary-work/SimplifiedOtherIdentityDialog.jsx` | Dropdown includes Birth certificate, Drivers licence, Marriage certificate, etc. |
| **ALL APPLICANTS** |
| 22 | **Every** subsection: dropdown of **all** applicant names | **MISSING** | `app/intake/temporary-work/all-applicants/visas/page.js`; others | **Visas** is global **Yes/No + Australian visa grant number** — **no** per-applicant name dropdown. Health / character / countries / travel use applicants in **dialogs or repeaters** in varying ways — **not** a uniform “dropdown on every subsection” as written. |
| 23 | **Travel History** only: select **two or more** applicants (checkboxes) | **IMPLEMENTED** | `app/intake/temporary-work/all-applicants/travel-history/page.js` | Rows use **`applicant_ids`** with **checkbox** multi-select; migration from legacy **`applicant_name`**. |
| **VISAS (SIMPLIFIED)** |
| 24 | Question on Australian visa grant number (family) Yes/No | **IMPLEMENTED** | `app/intake/temporary-work/all-applicants/visas/page.js` | Wording aligns (family members included in application). |
| 25 | If Yes: **Australian visa grant number (if known)** | **IMPLEMENTED** | `app/intake/temporary-work/all-applicants/visas/page.js` | Grant number input when Yes. (Large legacy `VisaDialog` may still exist in file but main path is simplified.) |
| **TRAVEL HISTORY** |
| 26 | Exact lead question (10 years since 16, usual country of residence, work/study/holiday/military/own country, etc.) | **PARTIAL** | `app/intake/temporary-work/all-applicants/travel-history/page.js` | **CardHeader** and Yes/No lead copy updated toward the spec; may still differ **verbatim** from a single approved sentence. |
| 27 | Reason dropdown: Work/study/training; Business; Visit Family; Holiday; Military; Other (+ text) | **IMPLEMENTED** | `app/intake/temporary-work/all-applicants/travel-history/page.js` | `REASONS` array + Other handling in dialog. |
| **COUNTRIES OF RESIDENCE** |
| 28 | Question: 12 months+ in past 10 years since 16 | **PARTIAL** | `app/intake/temporary-work/all-applicants/countries-of-residence/page.js` | Copy is **aligned** in spirit; line-by-line exact match not asserted here. |
| 29 | Fields: applicant, dates, residential address including **State/Territory** | **IMPLEMENTED** | `app/intake/temporary-work/all-applicants/countries-of-residence/page.js` | Applicant in dialog; address fields; label **State / Territory** (updated from State/Province). |
| 30 | **"Total time spent in this country"** removed | **IMPLEMENTED** | `app/intake/temporary-work/all-applicants/countries-of-residence/page.js` | Field not present. |
| **HEALTH** |
| 31 | Title **"Health"** (not "All Applicants' Health") | **IMPLEMENTED** | `app/intake/temporary-work/all-applicants/health/page.js` | `CardTitle` is **Health**. |
| 32 | Subtitle: **"Provide health information for all applicants"** | **IMPLEMENTED** | `app/intake/temporary-work/all-applicants/health/page.js` | Matches. |
| 33 | Questions **(a)–(j)** in **exact order** and wording | **MISSING** | `app/intake/temporary-work/all-applicants/health/page.js` | Content covers many of the same themes, but **block order** does **not** follow spec **a→j** (e.g. health exam is first, but **(b)** *5 years / 3 months outside country of passport* appears **later** in the file, after several other blocks). Full verbatim alignment not done. |
| **CHARACTER** |
| 34 | Instruction: Yes → details; criminal matters — date/nature, sentence, imprisonment | **PARTIAL** | `app/intake/temporary-work/all-applicants/character/page.js` | Additional instruction text in **CardHeader**; may not match the **exact** spec paragraph. |
| 35 | **18** deduplicated questions in specified order | **MISSING** | `app/intake/temporary-work/all-applicants/character/page.js` | `CHARACTER_QUESTIONS` still contains **many more** entries and keys than 18; **not** replaced with the slim 18-question list + slug migration described in the product spec. |
| **FINAL SUBMIT** |
| 36 | Title **"Review & Submit"** | **IMPLEMENTED** | `app/intake/temporary-work/submit/page.js` | |
| 37 | Subtitle **"Take a moment to review your answers before submitting."** | **IMPLEMENTED** | `app/intake/temporary-work/submit/page.js` | |
| 38 | Completion message + four **Before You Submit** bullets (exact copy) | **PARTIAL** | `app/intake/temporary-work/submit/page.js` | Completion messaging and bullets are **updated** but **not** guaranteed word-for-word vs the latest spec (e.g. *"Questionnaire Complete – All …"* and bullets for locked questionnaire, confirmation email, upload tab). |
| **186 VISA** |
| 39–42 | 186 questionnaire, 482 import, education/employment/English for 186 | **N/A** | — | No `employer-sponsored/186` (or equivalent) intake found; no 482→186 import in repo. |

---

## What was implemented (summary)

- **Branding & Zoho read path**: Skills in Demand wording in profile UI; deal-name matching includes **skills in demand** / **482** / **tss** in `fetch-zoho`.
- **Main applicant Details**: Citizenships on Details; migration from legacy identity; marital status under DOB.
- **Main applicant Identity**: Passports only + National ID + simplified Other ID; profile-aware saves.
- **Spouse Identity** route and page; **child** dynamic routes **Details / Identity / Custody**; **layout** child nav and **completion** counting for child pages in `draftStore`.
- **Contact**: Residential-only + migration from old address history data.
- **Travel**: `applicant_ids` multi-select, migration from `applicant_name`, updated intro copy.
- **Visas**: Simplified grant-number flow (req 24–25).
- **Countries of residence**: State/Territory label; total-time field absent.
- **Health / Submit / Start**: Title **Health**, subtitle line; **Review & Submit** title/subtitle; **Continue** on start.
- **Sidebar**: **Applicant *n* (**relationship**)** labels with sort order main → spouse → children.

---

## Gaps remaining (by priority)

### High

| Topic | Detail |
|-------|--------|
| **Spouse Details parity** | Main applicant Details is rich; spouse Details is still a shorter form (**#13**). |
| **Child custody copy** | Custody page exists but **not** the four **exact** spec questions (**#18**). |
| **All Applicants — applicant dropdown everywhere** | **Visas** has no per-applicant selector (**#22**). |
| **Health a–j** | **Order** (and strict wording) vs spec **#33**. |
| **Character 18 questions** | Still a **long** `CHARACTER_QUESTIONS` list; not collapsed/migrated to **18** slugs (**#35**). |
| **Details vs Other route** | **`/main-applicant/other`** still registered; Details subheading **order** vs spec **#7**. |

### Medium

| Topic | Detail |
|-------|--------|
| **CRM display title** | Full **Skills in Demand Visa (subclass 482)** as Zoho deal **title** is not set by this app (**#1**). |
| **Menu labels** | **"Applicant 3 (Given Family)"** vs **Child** (**#4**). |
| **Passport instruction** | Verbatim match (**#6**). |
| **Travel lead sentence** | Single approved verbatim paragraph (**#26**). |
| **Submit** | Exact completion paragraph + four bullets (**#38**). |
| **Character instruction** | Verbatim legal/criminal detail instruction (**#34**). |
| **Countries lead question** | Word-perfect vs spec (**#28**). |

### Low

| Topic | Detail |
|-------|--------|
| **186** | No implementation in this repo (**#39–42**). |

---

*Last updated to reflect implementation through the 482 Skills in Demand questionnaire workstream (routing, profiles, intake pages, `draftStore` completion, and shared components). Re-run this audit after further product copy or schema changes.*
