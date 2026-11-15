# Zoho Contacts synchronization — mapping inventory

Source of truth in code: `src/lib/crm/contactCrmProjection.js` (`CONTACT_FIELD_INVENTORY`),
catalog in `src/lib/crm/crmFieldCatalog.js` (mirrored in the admin portal's `src/lib/crmFieldCatalog.js`).
Field names/labels come from the Zoho Contacts screenshots; **types, writability and picklist values were not
verifiable offline** (no Zoho credentials in the workspace) and are checked live at sync time
(`src/lib/crm/crmFieldGate.js`, `GET /settings/fields`). Audit them with
`node scripts/verify-crm-field-metadata.mjs` (read-only) using owner credentials.

## How it works

- Only the **main applicant** writes to Contacts, to `users/{uid}.zohoContactId` (server-side, from the verified
  token). Before writing, Zoho is asked for that Contact's `Email`/`Secondary_Email`; the write proceeds only if it
  matches the signed-in user's email (`contact_link_mismatch` / `contact_link_unverified` otherwise).
  Spouse, child and non-migrating data go to `Partner_Dependents` only. Builder mappings with target `main_contact`
  are rejected (admin validation, client validation and projection) on any page that is not a main-applicant page.
- Runs after every successful page save and on full reconciliation, from the stored answers (stable answer keys and
  storage paths untouched; dynamic and legacy data read the same way).
- Empty/cleared answers never clear CRM (`preserve_when_empty`). Unsupported/ambiguous values are not sent and are
  listed in `summary.attention` of the `crmSync` job with a reason code.
- Success = Zoho returns `status: "success"` for that record id. Anything else is a failure and the job stays
  `failed` and retryable (same job id, `attemptCount` increments). Errors are scrubbed of emails/numbers/quoted values.

Rules used for repeatable data
- **Current passport**: the single passport row with `document_status = "Current"` (legacy `is_current`); a lone row with
  no status is accepted; several Current rows → `ambiguous_current_passport`, nothing written.
- **Primary citizenship** (`Nationality`): the single non-ceased citizenship; if several, the one matching the current
  passport's nationality/country; otherwise `ambiguous_primary_citizenship`. No rows + "citizen of passport country" = yes → passport country.

## Contacts mapping inventory

| Portal source (main applicant) | Zoho module | Label | API name | Data type | Transformation | Status |
|---|---|---|---|---|---|---|
| Details `given_names` (all visas) | Contacts | First Name | `First_Name` | text | trim | **Synced** |
| Details `family_name` | Contacts | Last Name | `Last_Name` | text | trim | **Synced** |
| Details `preferred_names` (where collected) | Contacts | Preferred Name | `Preferred_Name` | text | trim | **Synced** (live-checked) |
| Details `gender` | Contacts | Gender | `Gender` | picklist Male/Female | other values reported | **Synced** |
| Details `birth` day/month/year | Contacts | Date of Birth | `Date_of_Birth` | date | → `YYYY-MM-DD`, invalid reported | **Synced** |
| Details `country_of_birth` | Contacts | Country of Birth | `Country_of_Birth` | text/picklist (live) | trim, live picklist check | **Synced** (live-checked) |
| Details `city_of_birth` | Contacts | City/Town of Birth | `City_Town_of_Birth` | text | trim | **Synced** (live-checked) |
| Details `state_of_birth` | Contacts | State or Province of Birth | `State_or_Province_of_Birth` | text | trim | **Synced** (live-checked) |
| Details `marital_status` | Contacts | Relationship Status | `Relationship_Status` | picklist (live) | portal status → canonical status; live picklist check | **Synced** (live-checked) — same meaning as the existing `Partner_Dependents.Relationship_Status`; Contacts picklist values unconfirmed |
| Details/Identity citizenships (+ passport) | Contacts | Citizenship | `Nationality` | text/picklist (live) | primary-citizenship rule | **Synced** (live-checked); a country name may not match a nationality-style picklist ("British") → reported |
| Identity current passport country | Contacts | Country of Passport | `Country_of_Passport` | text/picklist (live) | current-passport rule | **Synced** (live-checked) |
| Identity current passport number | Contacts | Passport Number | `Passport_No` | text | current-passport rule | **Synced** (live-checked) |
| Identity current passport expiry | Contacts | Passport Expiry Date | `Passport_Expiry_Date` | date | → `YYYY-MM-DD` | **Synced** (live-checked) |
| Temporary Work contact details `usual_country_of_residence` | Contacts | Country of Residence | `Country_of_Residence` | text/picklist (live) | trim | **Synced** (live-checked); no Partner/Protection source |
| Temporary Work `phone` | Contacts | Phone | `Phone` | text | trim | **Synced** (live-checked) |
| Temporary Work `mobile`; Partner/Protection mobile country code + number (when shared) | Contacts | Mobile | `Mobile` | text | → `+E.164`; unreadable code reported | **Synced** (live-checked) |
| Partner/Protection shared `postal_address` (+line 2) | Contacts | Street | `Mailing_Street` | text | join with ", ", only if postal address shared with all applicants | **Synced** (live-checked) |
| `postal_suburb` | Contacts | Suburb | `Mailing_Suburb` | text | trim | **Synced** (live-checked) |
| `postal_state` | Contacts | Mailing Province | `Mailing_State` | text | trim | **Synced** (live-checked) |
| `postal_postcode` | Contacts | Post Code | `Mailing_Zip` | text | trim | **Synced** (live-checked) |
| `postal_country` | Contacts | Mailing Country | `Mailing_Country` | text/picklist (live) | trim | **Synced** (live-checked) |
| Contact details `email` | Contacts | Email | `Email` | text | – | **Held**: login/link key; overwriting could break access |
| Contact details `email` (if different) | Contacts | Secondary Email | `Secondary_Email` | text | – | **Needs confirmation**: no secondary-email question |
| Partner/Protection after-hours phone | Contacts | Home Phone | `Home_Phone` | text | – | **Needs confirmation** (after-hours = Home? office = Phone?) |
| – | Contacts | Mailing City | `Mailing_City` | text | – | **Needs confirmation**: portal asks suburb only |
| Visa history | Contacts | Current Visa | `Current_Visa` | unknown | – | **Needs confirmation**: no "current" flag; allowed values unknown. Proposed rule: granted, not cancelled, Australia, expiry in future |
| Visa history expiry | Contacts | Current Visa Expiry Date | `Visa_Expiry_Date` | date | – | **Needs confirmation** (same rule) |
| Temporary Work `residential_address[]` | Contacts | Address - Street / City / State / Zip / Country | `Address_1_*` (5 fields) | text | – | **Needs confirmation**: meaning of the Address_1 block unknown; residential must not go to Mailing_* |

Not mapped (no Contacts field): emergency contacts, national ID, other names, address history, travel, employment, etc.

## Deals audit (existing mappings, unchanged)

| Deal field | Currently receives | Catalog label recorded | Finding |
|---|---|---|---|
| `City_Town_of_Birth` | main-applicant citizenship (first row) | "Citizenship" | **Unverified.** The Contacts screenshots show a *birthplace* field of this name; the Deal field's meaning is not established by them. Label and name disagree, so either the Deal label was customised or the mapping is wrong. Also uses an arbitrary first citizenship row. |
| `State_or_Province_of_Birth` | current passport number | "Passport Number" | **Unverified**, same reasoning. |
| `Marital_Status` | marital status picklist | "Passport Expiry Date" | **Label contradicts the stored value** — high-priority check. |
| `Family_Name`, `Given_Name`, `Preferred_Name`, `Gender`, `Date_of_Birth`, `Country_of_Birth`, `Questionnaires_Status` | as named | – | Plausible, unverified live. |

Preserved because nothing here *proves* them wrong. Run the verification script on `Deals` to settle it.

## Findings outside the requested change (not modified)

1. Existing canonical Deal/dependent sync matched pages on `sectionKey === "details"`, but real pages use
   `temporary_work_details`, `partner_main_applicant_identity`, etc.; so it only ran on **full** reconciliation, not on
   page saves. Contacts now use correct section resolution; Deals/dependents keep the old behaviour until the Deal audit
   is settled (changing it would also fire the questionable Deal mappings on every save).
2. `POST /api/profile/sync-zoho` accepts a `contactId`/`email` from the request body with no authentication — anyone can
   update any Contact. It now confirms writes and no longer logs values, but needs auth added.
3. Client and admin catalogs had drifted (admin lacks the Deals module; `Partner_Dependents` fields/picklists differ,
   e.g. `Relationship_to_Applicant`: admin `Spouse/Children/Other` vs client `Partner/Children/Spouse`). Only the Contacts
   block is now identical (tests assert the field list).
4. Only the sync paths touched here were reviewed for sensitive logging; other Zoho routes were not audited.

## Owner actions before enabling for production

1. Run `node scripts/verify-crm-field-metadata.mjs` (Contacts, Deals) and share the output.
2. Decide the "Needs confirmation" rows and the Deal fields above.
3. No backfill, deployment or questionnaire activation was performed.
