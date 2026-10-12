# Review & PDF App

This is a standalone Review & PDF application that provides public access to application review and PDF generation functionality.

## Features

- **Public Access**: No authentication required - access via Matter ID (Zoho Deal ID)
- **Application Review**: View complete questionnaire responses organized by sections
- **Search Functionality**: Search through questions and answers
- **PDF Generation**: Print and download PDF versions of the review
- **Collapsible Sections**: Expand/collapse sections for better readability

## Usage

### Access Review Page

Navigate to: `/review-pdf/[matterId]`

Example: `/review-pdf/1000000231009`

Where `matterId` is the Zoho Deal ID (stored as `zohoId` in Firebase applications).

### API Endpoints

#### Get Application by Matter ID
```
GET /api/review-pdf/application/[matterId]
```

Returns the application document that matches the given Zoho Deal ID.

#### Get Draft/Questionnaire Data
```
GET /api/review-pdf/application/[matterId]/draft
```

Returns the questionnaire/draft data for the application.

## Data Flow

1. User visits `/review-pdf/[matterId]`
2. Page fetches application data via `/api/review-pdf/application/[matterId]`
3. Page fetches draft data via `/api/review-pdf/application/[matterId]/draft`
4. Data is transformed and displayed in review sections
5. User can print or download PDF

## Environment Variables

The app uses the same Firebase configuration as the main app:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## Structure

- `src/lib/review-pdf/firebase.js` - Firebase initialization (no Auth)
- `app/api/review-pdf/application/[matterId]/route.js` - API to fetch application
- `app/api/review-pdf/application/[matterId]/draft/route.js` - API to fetch draft data
- `app/review-pdf/[matterId]/page.js` - Review page component

## PDF Generation

Currently uses browser's print functionality (`window.print()`). Print styles are defined in `app/globals.css` under `@media print`.

Future enhancements:
- Client-side PDF generation with jsPDF
- Server-side PDF generation with Puppeteer

## Error Handling

- Missing Matter ID: Shows error message
- Application not found: Shows "Application not found" error
- Draft data not available: Shows "No questionnaire data available" message
- Firebase errors: Logged to console, user sees generic error message

