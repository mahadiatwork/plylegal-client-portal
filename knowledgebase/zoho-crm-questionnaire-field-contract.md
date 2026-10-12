# Zoho CRM questionnaire field contract

Retrieved live AU CRM metadata was not available in this environment (no `ACCESSTOKEN_URL` / `.env`). Field API names below are **only** those already written by production portal code. Unconfirmed Matter screenshot fields are not guessed.

## Decision: Primary Applicant panel

Until Zoho module metadata is refreshed, primary-applicant identity answers map to **Contacts**, matching `app/api/profile/sync-zoho`. They are **not** mapped to guessed `Deals` custom fields. `Deals.Questionnaires_Status` remains the only confirmed Deal questionnaire field.

## Confirmed catalog

### Contacts

| API name | Type | Picklist | Production source |
|---|---|---|---|
| First_Name | text | | `sync-zoho` |
| Last_Name | text | | `sync-zoho` |
| Gender | picklist | Male, Female | `sync-zoho` (Other is not sent) |
| Date_of_Birth | date | | `sync-zoho` |
| Email | text | | `sync-zoho` |

### Partner_Dependents

| API name | Type | Picklist | Production source |
|---|---|---|---|
| First_Name | text | | `mapIntakeProfileToPartnerDependentFields` |
| Name | text | | family name in intake mapping |
| Last_Name | text | | related-list / reverse map |
| Gender | picklist | Male, Female | intake mapping |
| Date_of_Birth | date | | intake mapping |
| Citizenship | text | | related-list fields |
| Email | text | | reverse map |
| Relationship_to_Applicant | picklist | Spouse, Children, Other | intake mapping |
| Is_Applicant | boolean | | intake mapping |
| Non_Migrating | boolean | | intake mapping |

### Deals

| API name | Type | Picklist | Production source |
|---|---|---|---|
| Questionnaires_Status | picklist | Not Started, In Progress, Submitted | `app/api/deals/[dealId]` |

## Explicitly portal-only until metadata refresh

- Preferred name
- Country of birth
- Passport number and expiry (repeater row fields; `related_records` is out of scope)
- Any other question without a confirmed typed CRM field

Do not serialize unmapped answers into an arbitrary text field.

## Feature flags

- `CRM_QUESTIONNAIRE_SYNC_ENABLED` — kill switch for CRM writes. Questionnaire saves continue.
- `CRM_QUESTIONNAIRE_SYNC_DRY_RUN` — generate and persist jobs without Zoho writes.
