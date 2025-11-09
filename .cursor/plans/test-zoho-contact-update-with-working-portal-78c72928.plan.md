<!-- 78c72928-b1c6-4ca5-8f9b-5078ae55caf1 ed866d7c-c412-4570-b201-2ccba965f9aa -->
# Separate Review & PDF Next.js Application

## Overview

Create a standalone Next.js application that provides Review & PDF functionality. The app will accept a Zoho Deal ID (matter ID) from the URL, query Firebase to find the corresponding application and questionnaire data, then display a review page with PDF generation.

## Project Structure

### 1. Initialize New Next.js Project

**Location**: New directory (separate from main app)

- Create new Next.js 14+ project with App Router
- Install dependencies: `firebase`, `valtio` (optional, for state), `react-pdf` or `jsPDF` for PDF generation
- Set up TypeScript (optional but recommended)
- Configure Tailwind CSS (to match existing UI)

### 2. Firebase Configuration

**File**: `src/lib/firebase.js`

- Copy Firebase initialization from main app
- Use same environment variables:
  - `NEXT_PUBLIC_FIREBASE_API_KEY`
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  - `NEXT_PUBLIC_FIREBASE_APP_ID`
- Initialize Firestore (no Auth needed since app is public)

### 3. API Route: Find Application by Zoho Deal ID

**File**: `app/api/application/[matterId]/route.js`

- Accept `matterId` (Zoho Deal ID) as route parameter
- Query Firestore: `applications` collection where `zohoId == matterId`
- Return application data: `{ success: true, application: {...} }` or `{ success: false, error: '...' }`
- Handle case where no application found

### 4. API Route: Fetch Draft/Questionnaire Data

**File**: `app/api/application/[matterId]/draft/route.js`

- Accept `matterId` as route parameter
- First find application by `zohoId == matterId` to get `appId`
- Load draft from Firestore path: `applications/{appId}/data/questionnaire`
- Return draft data: `{ success: true, draft: {...} }`
- Handle missing draft data gracefully (return empty object)

### 5. Zoho CRM Client (Optional - for future enhancements)

**File**: `src/lib/zohoClient.js`

- Copy ZohoCRMClient from main app
- Configure with same environment variables:
  - `ACCESSTOKEN_URL` or `ZOHO_ACCESS_TOKEN_URL`
  - `ZOHO_DATACENTER` (default: 'com.au')
- Use for fetching additional Deal data if needed

### 6. Review Page Component

**File**: `app/review/[matterId]/page.js`

- Accept `matterId` from URL params
- Fetch application data via API: `/api/application/[matterId]`
- Fetch draft data via API: `/api/application/[matterId]/draft`
- Display loading state while fetching
- Show error state if application not found
- Reuse review page structure from main app:
  - Collapsible sections
  - Search functionality
  - Question/Answer display
  - Print button (uses `window.print()`)
  - Download PDF button (implement PDF generation)

### 7. PDF Generation Implementation

**File**: `app/review/[matterId]/page.js` or separate utility

**Option A: Client-side PDF (jsPDF)**

- Install `jspdf` and `html2canvas`
- Capture page content as image/canvas
- Generate PDF from canvas
- Download PDF file

**Option B: Server-side PDF (Puppeteer)**

- Create API route: `app/api/application/[matterId]/pdf/route.js`
- Use Puppeteer to render HTML and generate PDF
- Return PDF as blob/stream
- Client downloads PDF

**Option C: Print CSS (Simplest)**

- Use `window.print()` with print-optimized CSS
- User can save as PDF from browser print dialog

**Recommendation**: Start with Option C (print CSS), add Option A (jsPDF) for better control.

### 8. UI Components

**Files**: `src/components/ui/*`

- Copy essential UI components from main app:
  - `button.jsx`
  - `card.jsx`
  - `input.jsx`
  - `collapsible.jsx`
- Or use shadcn/ui directly
- Ensure styling matches main app (same Tailwind config)

### 9. Review Page Data Transformation

**File**: `app/review/[matterId]/page.js`

- Transform draft data structure to match review page format
- Map sections similar to main app:
  - Main Applicant Details
  - Other Names
  - Identity Documents
  - Employment History
  - Education
  - Language Proficiency
  - Family Information
  - Contact Details
  - Addresses
  - Travel History
  - Previous Visas
  - Health Information
  - Character Information
- Handle different visa types (partner, protection, temporary-work) if needed

### 10. Error Handling

- Handle missing `matterId` in URL
- Handle application not found (show friendly error page)
- Handle draft data not found (show message: "No questionnaire data available")
- Handle Firebase connection errors
- Handle Zoho API errors (if using Zoho client)

### 11. Environment Variables

**File**: `.env.local`

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Optional - for Zoho CRM access
ACCESSTOKEN_URL=...
ZOHO_DATACENTER=com.au
```

### 12. Print Stylesheet

**File**: `app/globals.css` or separate `print.css`

- Add print-specific CSS for PDF generation
- Hide navigation, buttons, search bar in print view
- Optimize layout for PDF (page breaks, margins)
- Ensure all sections are visible when printing

## Implementation Steps

1. **Initialize Project**: Create new Next.js app, install dependencies
2. **Firebase Setup**: Configure Firebase client (no Auth)
3. **API Routes**: Create routes to fetch application and draft data
4. **Review Page**: Build review page component with data fetching
5. **PDF Generation**: Implement PDF download functionality
6. **UI Components**: Copy/create necessary UI components
7. **Styling**: Match main app styling
8. **Error Handling**: Add comprehensive error states
9. **Testing**: Test with various matter IDs and data scenarios
10. **Deployment**: Deploy as separate application

## Data Flow

1. User visits: `/review/[matterId]` (e.g., `/review/1000000231009`)
2. Page fetches: `GET /api/application/[matterId]` → Returns application with `appId`
3. Page fetches: `GET /api/application/[matterId]/draft` → Returns questionnaire data
4. Page transforms data and displays review sections
5. User clicks "Download PDF" → Generates and downloads PDF
6. User clicks "Print" → Opens browser print dialog

## Key Differences from Main App

- **No Authentication**: Public access via matter ID
- **No User Context**: No user profile, no user-specific data
- **Simplified State**: No Valtio stores (or minimal state management)
- **Standalone**: Completely separate codebase and deployment
- **Read-Only**: Only displays data, no editing capabilities

## Future Enhancements (Optional)

- Add Zoho CRM integration to fetch Deal metadata
- Add document list from Zoho Matter_Documents
- Add export options (JSON, CSV)
- Add shareable link generation
- Add PDF customization (templates, branding)

### To-dos

- [ ] Add uploadAttachment method to ZohoCRMClient for uploading files to Deals
- [ ] Create API route for handling file uploads to Zoho CRM
- [ ] Update uploads page to call API route and set status to 'Uploaded' after successful upload