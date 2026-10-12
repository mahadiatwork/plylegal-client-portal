# Ply Legal - Client Portal

## Overview
Ply Legal is a multi-step intake wizard application for legal immigration case management. Its primary purpose is to provide a comprehensive client portal that guides applicants through detailed immigration forms using a mobile-first interface. The system efficiently collects extensive personal, family, and historical data required for immigration cases. The project aims to streamline the immigration application process, improve data accuracy, and integrate with CRM systems like Zoho for enhanced case management.

## Recent Changes (November 2025)

**Authentication System (November 3, 2025)**
- ✅ **Firebase Authentication**: Simple, secure authentication using Firebase Auth
- ✅ **Auto-account creation**: New users automatically get accounts on first login
- ✅ **User profiles**: Stored in Firestore with contact details and address
- ✅ **Profile page**: Users can view and edit their profile information
  - Split name into First Name and Last Name fields
  - Dependencies section with repeatable entries (firstName, lastName, relationship, dateOfBirth, citizenship)
  - Add/remove dependencies with full validation

**Zoho CRM Integration (November 3, 2025)**
- ✅ **Zoho CRM Client** (`src/lib/zohoClient.js`):
  - Centralized client for Zoho API v7 access
  - Token caching (50 min) to reduce API calls and improve performance
  - Auto-retry on 401 with fresh token for resilience
  - Methods: searchRecords, getRecord, createRecord, updateRecord, findContactByEmail, coqlQuery
  - Supports multiple token response formats
  - Exported as both class and singleton instance

**Bidirectional Sync System (November 3, 2025)** ✅ PRODUCTION-READY
- ✅ **Architecture**: Complete bidirectional sync between Firebase and Zoho CRM with timestamp-based conflict resolution
- ✅ **User Creation Flow** (Zoho → Firebase):
  - Zoho CRM workflow calls `/api/admin/create-user` endpoint
  - Creates Firebase Auth user with temporary password
  - Stores user profile in Firestore with `needsPasswordChange: true` flag
  - Zoho sends temporary password email to user
  - On first login, user is forced to change password via `/change-password` page
- ✅ **Profile Sync** (Firebase → Zoho):
  - Endpoint: `/api/profile/sync-zoho`
  - Creates or updates Zoho CRM Contact when profile is saved
  - Syncs: First Name, Last Name, Email, Phone, Mailing Address
  - Dependencies saved in Contact Description field as formatted text
  - Timestamp tracking: `Last_Firebase_Sync` field for conflict resolution
  - Loop prevention: `syncSource` flag prevents infinite sync loops
- ✅ **Contact Sync** (Zoho → Firebase):
  - Endpoint: `/api/webhooks/zoho-contact-update`
  - Zoho webhook updates Firebase profile when contact changes
  - Updates: All contact fields including dependencies
  - Sets `syncSource: 'zoho'` to prevent sync back to Zoho
- ✅ **Password Change Flow**:
  - Page: `/change-password`
  - AuthGuard redirects users with `needsPasswordChange: true`
  - Updates Firebase Auth password
  - Clears `needsPasswordChange` flag
  - Redirects to applications page
- ✅ **Conflict Resolution** (Architect Approved):
  - Last-write-wins strategy using proper timestamp comparison
  - Zoho → Firebase: Compares `lastFirebaseSync` (Zoho's knowledge) vs `updatedAt` (Firebase's actual state)
  - Firebase → Zoho: Uses `syncSource` flag to prevent infinite loops
  - `Last_Firebase_Sync` in Zoho CRM tracks when Firebase last synced to Zoho
  - `zohoSyncedAt` in Firestore tracks when Zoho last synced to Firebase
- ✅ **Security** (Architect Approved):
  - Shared secret authentication on all webhook endpoints
  - `ZOHO_WEBHOOK_SECRET` validates incoming requests
  - Returns 401 Unauthorized for invalid requests
  - Firebase Admin SDK used correctly throughout
  
**Zoho CRM Webhook Configuration**
To enable bidirectional sync, configure Zoho CRM as follows:

1. **Create User Workflow** (triggered when Contact is created):
   - URL: `https://your-replit-app.replit.app/api/admin/create-user`
   - Method: POST
   - Headers: `Authorization: Bearer YOUR_ZOHO_WEBHOOK_SECRET`
   - Body: 
     ```json
     {
       "email": "${Contact.Email}",
       "tempPassword": "GeneratedPassword123!",
       "firstName": "${Contact.First_Name}",
       "lastName": "${Contact.Last_Name}",
       "phone": "${Contact.Phone}",
       "mobile": "${Contact.Mobile}",
       "mailingStreet": "${Contact.Mailing_Street}",
       "mailingCity": "${Contact.Mailing_City}",
       "mailingState": "${Contact.Mailing_State}",
       "mailingZip": "${Contact.Mailing_Zip}",
       "mailingCountry": "${Contact.Mailing_Country}",
       "zohoContactId": "${Contact.id}"
     }
     ```
   - Follow-up Action: Send email to contact with temp password

2. **Contact Update Webhook** (triggered when Contact is updated):
   - URL: `https://your-replit-app.replit.app/api/webhooks/zoho-contact-update`
   - Method: POST
   - Headers: `Authorization: Bearer YOUR_ZOHO_WEBHOOK_SECRET`
   - Trigger: Contact field updates (First_Name, Last_Name, Phone, Address, Description)
   - Body:
     ```json
     {
       "contactId": "${Contact.id}",
       "email": "${Contact.Email}",
       "firstName": "${Contact.First_Name}",
       "lastName": "${Contact.Last_Name}",
       "phone": "${Contact.Phone}",
       "mobile": "${Contact.Mobile}",
       "mailingStreet": "${Contact.Mailing_Street}",
       "mailingCity": "${Contact.Mailing_City}",
       "mailingState": "${Contact.Mailing_State}",
       "mailingZip": "${Contact.Mailing_Zip}",
       "mailingCountry": "${Contact.Mailing_Country}",
       "dependencies": "${Contact.Description}",
       "lastFirebaseSync": "${Contact.Last_Firebase_Sync}"
     }
     ```

**Required Secrets**:
- `FIREBASE_SERVICE_ACCOUNT_KEY`: Firebase Admin SDK credentials (JSON string)
- `ZOHO_ACCESS_TOKEN_URL`: Zoho Function URL that returns access token
- `ZOHO_WEBHOOK_SECRET`: Shared secret for webhook authentication (generate a random string)
- All existing Firebase secrets (NEXT_PUBLIC_FIREBASE_*)

**Getting Firebase Service Account Key**:
1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Download the JSON file
4. In Replit Secrets, add `FIREBASE_SERVICE_ACCOUNT_KEY` with the entire JSON as a string
5. Example format: `{"type":"service_account","project_id":"...","private_key":"...",...}`

**Protection Visa Questionnaire Complete (November 2, 2025)**
- ✅ **Complete Protection Visa implementation** with 18 pages mirroring the Temporary Work visa structure
- **Start Page**: Replaced placeholder with functional start page
- **Main Applicant Section** (7 pages):
  - Details: Personal information, name, gender, DOB, birth country, marital status
  - Other: Name variations repeater table
  - Identity: Passport, citizenship, nationality details
  - Employment: Current job + employment history repeater
  - Education: Highest qualification + education history repeater
  - Skills: Professional skills repeater table
  - Language: English proficiency + additional languages repeater
- **Spouse/Partner Section** (2 pages):
  - Details: Personal information, residency & migration info, birth details
  - Other Details: Name variations repeater
- **Children Page**: Children repeater with full details (names, gender, DOB, relationship, country of birth)
- **Relationships Page**: Marriage details with living-together conditionals
- **All Applicants Section** (6 pages):
  - Addresses: Same residential address question
  - Contact Details: Phone, mobile, email, emergency contact
  - Visas: Previous visa refusals and current visas held
  - Travel History: Travel to Australia and international travel
  - Health: Medical conditions, assistance needs, insurance coverage
  - Character: Criminal record, deportations, war crimes questions
- **Submit Page**: Review and submit functionality
- ✅ **Routes Updated**: Added complete PROTECTION_VISA_ROUTES to `src/lib/routes.js`
  - Start → Main Applicant (7) → Spouse/Partner (2) → Children → Relationships → All Applicants (6) → Submit
- ✅ **Data Persistence**: All pages save to `protection_*` keys in Firebase
- ✅ **Architect Approved**: Implementation verified to match existing patterns without breaking any existing behavior
- **Implementation Method**: Copied all pages from Temporary Work visa and replaced data keys (`temporary_work_*` → `protection_*`)
- **No Breaking Changes**: Zero modifications to existing endpoints, validators, component APIs, or other visa types

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The application is a single-page application built with React 18, TypeScript, and Next.js 15 (App Router). It uses `shadcn/ui` components based on Radix UI and Tailwind CSS for styling, adhering to a custom theme with "Ply Green" (#285646) and "Ply Blue" (#DEE3FF). State management is handled by Valtio for global states and React Hook Form with Zod for form validation. Key features include a multi-step intake wizard with RepeaterTables for dynamic data entry, a comprehensive review page, and an 8-tab application workspace, all designed with a mobile-first approach.

### Backend Architecture
The backend is built with Express.js and TypeScript, designed to handle API requests for saving and submitting intake data. It is architected for future integration with a PostgreSQL database.

### Data Storage Solutions
Currently, Firebase Firestore is used for all persistent data, including user profiles, application data, and drafts. Drafts are linked to specific application IDs. User profiles are automatically created upon login, and application data is structured for Zoho integration. The planned production architecture includes Drizzle ORM for PostgreSQL and Neon serverless database, with Drizzle Kit for migrations.

### Design System
The UI/UX maintains a consistent design language with a primary green (#285646) and secondary green (#00A67E) color palette, complemented by a light indigo background (#E0E7FF). Typography prioritizes readability with sans-serif fonts. The application features a dark slate gray sidebar navigation, a clear status badge system (draft, pending, under_review, approved, rejected), and consistent use of cards, spacing, and button styles.

### Validation Architecture
Zod schemas are used for type-safe validation, integrated with React Hook Form. Validation logic includes `date-fns` for date checks and custom validators for business rules, with schema reuse for common data structures.

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: `react`, `react-dom`, `@tanstack/react-query`
- **Routing**: `next` (Next.js 15 App Router)
- **State Management**: `valtio`
- **TypeScript**: Full TypeScript implementation

### UI Component Libraries
- **Shadcn/ui**: Components built on Radix UI primitives
- **Tailwind CSS**: Utility-first CSS framework
- **Icons**: `lucide-react`

### Form & Validation
- **react-hook-form**: Form state management
- **zod**: Schema validation
- **@hookform/resolvers**: React Hook Form + Zod integration

### Database & ORM
- **Firebase**: `firebase` (authentication, firestore)
- **Drizzle ORM**: `drizzle-orm`, `drizzle-kit` (planned)
- **Neon Database**: `@neondatabase/serverless` (planned)

### Utilities
- **date-fns**: Date manipulation and formatting
- **nanoid**: Unique ID generation